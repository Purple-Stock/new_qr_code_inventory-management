import {
  createItem,
  createItemsBulk,
  deleteItem,
  getItemById,
  getItemByIdWithLocation,
  getTeamItemsByBarcode,
  getTeamItems,
  itemHasTransactions,
  updateItem,
} from "@/lib/db/items";
import { getTeamLocations } from "@/lib/db/locations";
import { deleteItemStockTransactions } from "@/lib/db/stock-transactions";
import { ERROR_CODES } from "@/lib/errors";
import { isUniqueConstraintError } from "@/lib/error-utils";
import { authorizeTeamAccess, authorizeTeamPermission } from "@/lib/permissions";
import { parseItemPayload } from "@/lib/contracts/schemas";
import { uploadItemImageToS3 } from "@/lib/services/item-images";
import type { ItemDto, ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { toItemDto } from "@/lib/services/mappers";
import type { ItemCustomFields, TeamItemCustomFieldSchemaEntry } from "@/db/schema";

export type ItemLookupCandidateDto = Pick<
  ItemDto,
  | "id"
  | "name"
  | "sku"
  | "barcode"
  | "currentStock"
  | "locationName"
  | "photoData"
  | "customFields"
>;

type CsvImportRowStatus = "valid" | "invalid";

type ItemCsvImportRow = {
  line: number;
  status: CsvImportRowStatus;
  item: ItemWritePayload | null;
  errors: string[];
};

type ItemCsvImportPreview = {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  rows: ItemCsvImportRow[];
};

type ItemCsvImportResult = {
  summary: {
    totalRows: number;
    importedRows: number;
    rejectedRows: number;
  };
};

type ItemWritePayload = {
  name?: string;
  sku?: string | null;
  barcode?: string;
  cost?: number | null;
  price?: number | null;
  itemType?: string | null;
  brand?: string | null;
  photoData?: string | null;
  locationId?: number | null;
  initialQuantity?: number;
  currentStock?: number;
  minimumStock?: number;
  customFields?: ItemCustomFields | null;
};

const CSV_HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "nome", "nom"],
  sku: ["sku"],
  barcode: ["barcode", "codigo de barras", "código de barras", "code-barres", "code barres"],
  type: ["type", "tipo"],
  stock: ["stock", "estoque"],
  price: ["price", "preco", "preço", "prix"],
  location: ["location", "localizacao", "localização", "emplacement"],
};

function normalizeCsvHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char !== "\r") {
      currentField += char;
    }
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  return rows.filter((row) => row.length > 1 || row[0]?.trim() !== "");
}

function parseCsvImportPayload(payload: unknown): { ok: true; csvContent: string } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object" || !("csvContent" in payload)) {
    return { ok: false, error: "CSV content is required" };
  }

  const csvContent = payload.csvContent;
  if (typeof csvContent !== "string" || !csvContent.trim()) {
    return { ok: false, error: "CSV content is required" };
  }

  return { ok: true, csvContent };
}

function mapHeaderIndexes(headers: string[]): Map<string, number> {
  const normalizedHeaders = headers.map(normalizeCsvHeader);
  const headerIndexes = new Map<string, number>();

  for (const [canonicalKey, aliases] of Object.entries(CSV_HEADER_ALIASES)) {
    const headerIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (headerIndex >= 0) {
      headerIndexes.set(canonicalKey, headerIndex);
    }
  }

  return headerIndexes;
}

function getCsvCell(row: string[], headerIndexes: Map<string, number>, key: string): string {
  const index = headerIndexes.get(key);
  if (index === undefined) {
    return "";
  }

  return row[index]?.trim() ?? "";
}

function isBlank(value: string | undefined): boolean {
  return !value || !value.trim();
}

function isValidNumericField(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

async function buildItemCsvImportPreview(params: {
  teamId: number;
  csvContent: string;
}): Promise<ServiceResult<ItemCsvImportPreview>> {
  const parsedRows = parseCsv(params.csvContent);
  if (parsedRows.length === 0) {
    return {
      ok: false,
      error: validationServiceError("CSV file is empty"),
    };
  }

  const [headers, ...dataRows] = parsedRows;
  const headerIndexes = mapHeaderIndexes(headers);
  const missingHeaders = ["name", "barcode"].filter((key) => !headerIndexes.has(key));
  if (missingHeaders.length > 0) {
    const displayLabels: Record<string, string> = {
      name: "Name",
      barcode: "Barcode",
    };
    return {
      ok: false,
      error: validationServiceError(
        `Missing required CSV headers: ${missingHeaders.map((key) => displayLabels[key] ?? key).join(", ")}`
      ),
    };
  }

  const teamLocations = await getTeamLocations(params.teamId);
  const locationsByName = new Map(
    teamLocations.map((location) => [normalizeCsvHeader(location.name), location.id] as const)
  );

  const rows: ItemCsvImportRow[] = dataRows.map((row, index) => {
    const line = index + 2;
    const rawName = getCsvCell(row, headerIndexes, "name");
    const rawBarcode = getCsvCell(row, headerIndexes, "barcode");
    const rawStock = getCsvCell(row, headerIndexes, "stock");
    const rawPrice = getCsvCell(row, headerIndexes, "price");
    const rawLocation = getCsvCell(row, headerIndexes, "location");
    const locationId = rawLocation ? locationsByName.get(normalizeCsvHeader(rawLocation)) ?? null : null;

    const candidatePayload = {
      name: rawName || undefined,
      sku: getCsvCell(row, headerIndexes, "sku") || undefined,
      barcode: rawBarcode || undefined,
      itemType: getCsvCell(row, headerIndexes, "type") || undefined,
      currentStock: rawStock || undefined,
      initialQuantity: rawStock || undefined,
      price: rawPrice || undefined,
      locationId,
    };

    const errors: string[] = [];
    if (isBlank(rawName)) {
      errors.push("Item name is required");
    }
    if (isBlank(rawBarcode)) {
      errors.push("Barcode is required");
    }
    if (rawStock && !isValidNumericField(rawStock)) {
      errors.push("Current stock must be a valid number");
    }
    if (rawPrice && !isValidNumericField(rawPrice)) {
      errors.push("Price must be a valid number");
    }
    if (rawLocation && locationId === null) {
      errors.push(`Location "${rawLocation}" was not found for this team`);
    }

    const validation = parseItemPayload(candidatePayload, "create");
    if (!validation.ok && !errors.includes(validation.error)) {
      errors.push(validation.error);
    }

    if (!validation.ok) {
      return {
        line,
        status: "invalid",
        item: null,
        errors: errors.length > 0 ? errors : [validation.error],
      };
    }

    if (errors.length > 0) {
      return {
        line,
        status: "invalid",
        item: null,
        errors,
      };
    }

    return {
      line,
      status: "valid",
      item: {
        ...validation.data,
        initialQuantity: validation.data.currentStock ?? validation.data.initialQuantity ?? 0,
        currentStock: validation.data.currentStock ?? validation.data.initialQuantity ?? 0,
      },
      errors: [],
    };
  });

  const validRows = rows.filter((row) => row.status === "valid").length;
  const invalidRows = rows.length - validRows;

  return {
    ok: true,
    data: {
      summary: {
        totalRows: rows.length,
        validRows,
        invalidRows,
      },
      rows,
    },
  };
}

function mapImageUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Image upload failed";
  if (/accessdenied|forbidden|not authorized/i.test(message)) {
    return "Image upload failed: S3 permission denied";
  }
  return message || "Image upload failed";
}

function validateCustomFieldsAgainstActiveSchema(params: {
  customFields: ItemCustomFields | null | undefined;
  schema: TeamItemCustomFieldSchemaEntry[] | null | undefined;
  allowedLegacyKeys?: string[];
}): string | null {
  if (params.customFields === undefined || params.customFields === null) {
    return null;
  }

  const schema = params.schema ?? null;
  if (!schema || schema.length === 0) {
    return null;
  }

  const activeKeys = new Set(schema.filter((entry) => entry.active).map((entry) => entry.key));
  const legacyKeys = new Set((params.allowedLegacyKeys ?? []).filter(Boolean));
  const invalidKeys = Object.keys(params.customFields).filter(
    (key) => !activeKeys.has(key) && !legacyKeys.has(key)
  );
  if (invalidKeys.length === 0) {
    return null;
  }

  return `Item custom fields contain keys that are not active in team schema: ${invalidKeys.join(", ")}`;
}

export async function getTeamItemDetails(params: {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ item: ItemDto }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const item = await getItemByIdWithLocation(params.itemId);
  if (!item) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }

  if (item.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  return { ok: true, data: { item: toItemDto(item) } };
}

export async function listTeamItemsForUser(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ items: ItemDto[] }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const items = await getTeamItems(params.teamId);
    return { ok: true, data: { items: items.map((item) => toItemDto(item)) } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching items"),
    };
  }
}

export async function lookupTeamItemsByCodeForUser(params: {
  teamId: number;
  code: string;
  requestUserId: number | null;
}): Promise<ServiceResult<{ items: ItemLookupCandidateDto[] }>> {
  const normalizedCode = params.code.trim();
  if (!normalizedCode) {
    return {
      ok: false,
      error: validationServiceError("Code is required"),
    };
  }

  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const foundItems = await getTeamItemsByBarcode(params.teamId, normalizedCode);
    const items = foundItems.map((item) => {
      const dto = toItemDto(item);
      return {
        id: dto.id,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        currentStock: dto.currentStock,
        locationName: dto.locationName ?? null,
        photoData: dto.photoData ?? null,
        customFields: dto.customFields ?? null,
      };
    });

    return { ok: true, data: { items } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while looking up items by code"),
    };
  }
}

export async function previewTeamItemsCsvImport(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<ItemCsvImportPreview>> {
  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  const parsedPayload = parseCsvImportPayload(params.payload);
  if (!parsedPayload.ok) {
    return {
      ok: false,
      error: validationServiceError(parsedPayload.error),
    };
  }

  try {
    return await buildItemCsvImportPreview({
      teamId: params.teamId,
      csvContent: parsedPayload.csvContent,
    });
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while previewing CSV import"),
    };
  }
}

export async function importTeamItemsCsv(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<ItemCsvImportResult>> {
  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  const parsedPayload = parseCsvImportPayload(params.payload);
  if (!parsedPayload.ok) {
    return {
      ok: false,
      error: validationServiceError(parsedPayload.error),
    };
  }

  const preview = await buildItemCsvImportPreview({
    teamId: params.teamId,
    csvContent: parsedPayload.csvContent,
  });
  if (!preview.ok) {
    return preview;
  }

  if (preview.data.summary.invalidRows > 0) {
    const plural = preview.data.summary.invalidRows === 1 ? "row" : "rows";
    return {
      ok: false,
      error: validationServiceError(
        `CSV import contains ${preview.data.summary.invalidRows} invalid ${plural}. Fix the preview errors and try again.`
      ),
    };
  }

  const validRows = preview.data.rows
    .filter((row): row is ItemCsvImportRow & { item: ItemWritePayload } => row.status === "valid" && row.item !== null)
    .map((row) => row.item);

  try {
    await createItemsBulk(
      validRows.map((item) => ({
        name: item.name!,
        sku: item.sku ?? null,
        barcode: item.barcode!,
        cost: item.cost ?? null,
        price: item.price ?? null,
        itemType: item.itemType ?? null,
        brand: item.brand ?? null,
        photoData: item.photoData ?? null,
        teamId: params.teamId,
        locationId: item.locationId ?? null,
        initialQuantity: item.initialQuantity ?? 0,
        currentStock: item.currentStock ?? item.initialQuantity ?? 0,
        minimumStock: item.minimumStock ?? 0,
        customFields: item.customFields ?? null,
      }))
    );

    return {
      ok: true,
      data: {
        summary: {
          totalRows: preview.data.summary.totalRows,
          importedRows: validRows.length,
          rejectedRows: 0,
        },
      },
    };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while importing items"),
    };
  }
}

export async function createTeamItem(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
  requestHost?: string | null;
}): Promise<ServiceResult<{ item: ItemDto }>> {
  const parsed = parseItemPayload(params.payload, "create");
  if (!parsed.ok) {
    return {
      ok: false,
      error: validationServiceError(parsed.error),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  try {
    const payload = parsed.data;
    const customFieldsValidationError = validateCustomFieldsAgainstActiveSchema({
      customFields: payload.customFields,
      schema: auth.team?.itemCustomFieldSchema ?? null,
    });
    if (customFieldsValidationError) {
      return {
        ok: false,
        error: validationServiceError(customFieldsValidationError),
      };
    }

    let photoData = payload.photoData ?? null;
    if (payload.photoData && payload.photoData.startsWith("data:image/")) {
      try {
        photoData = await uploadItemImageToS3({
          teamId: params.teamId,
          dataUrl: payload.photoData,
          runtimeHost: params.requestHost,
        });
      } catch (error) {
        return {
          ok: false,
          error: validationServiceError(mapImageUploadError(error)),
        };
      }
    }

    const item = await createItem({
      name: payload.name!,
      sku: payload.sku ?? null,
      barcode: payload.barcode!,
      cost: payload.cost ?? null,
      price: payload.price ?? null,
      itemType: payload.itemType ?? null,
      brand: payload.brand ?? null,
      photoData,
      teamId: params.teamId,
      locationId: payload.locationId ?? null,
      initialQuantity: payload.initialQuantity ?? 0,
      currentStock: payload.currentStock ?? undefined,
      minimumStock: payload.minimumStock ?? 0,
      customFields: payload.customFields ?? null,
    });

    return { ok: true, data: { item: toItemDto(item) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: conflictValidationServiceError(
          "An item with this barcode already exists"
        ),
      };
    }

    return {
      ok: false,
      error: internalServiceError("An error occurred while creating the item"),
    };
  }
}

export interface UpdateTeamItemInput {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
  payload: unknown;
  requestHost?: string | null;
}

export async function updateTeamItem(
  params: UpdateTeamItemInput
): Promise<ServiceResult<{ item: ItemDto }>> {
  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const existingItem = await getItemById(params.itemId);
  if (!existingItem) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }
  if (existingItem.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  const parsed = parseItemPayload(params.payload, "update");
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }
  const payload = parsed.data;
  const customFieldsValidationError = validateCustomFieldsAgainstActiveSchema({
    customFields: payload.customFields,
    schema: auth.team?.itemCustomFieldSchema ?? null,
    allowedLegacyKeys: Object.keys(existingItem.customFields ?? {}),
  });
  if (customFieldsValidationError) {
    return {
      ok: false,
      error: validationServiceError(customFieldsValidationError),
    };
  }

  try {
    let photoData = payload.photoData;
    if (payload.photoData && payload.photoData.startsWith("data:image/")) {
      try {
        photoData = await uploadItemImageToS3({
          teamId: params.teamId,
          dataUrl: payload.photoData,
          runtimeHost: params.requestHost,
        });
      } catch (error) {
        return {
          ok: false,
          error: validationServiceError(mapImageUploadError(error)),
        };
      }
    }

    const item = await updateItem(params.itemId, {
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      cost: payload.cost,
      price: payload.price,
      itemType: payload.itemType,
      brand: payload.brand,
      photoData,
      locationId: payload.locationId,
      customFields: payload.customFields,
    });

    return { ok: true, data: { item: toItemDto(item) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: conflictValidationServiceError("An item with this barcode already exists"),
      };
    }
    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the item"),
    };
  }
}

export interface DeleteTeamItemInput {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
  forceDeleteWithTransactions?: boolean;
}

export async function deleteTeamItemById(
  params: DeleteTeamItemInput
): Promise<ServiceResult<null>> {
  const auth = await authorizeTeamPermission({
    permission: "item:delete",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const existingItem = await getItemById(params.itemId);
  if (!existingItem) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }
  if (existingItem.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  const hasTx = await itemHasTransactions(params.itemId);
  if (hasTx) {
    if (params.forceDeleteWithTransactions) {
      try {
        await deleteItemStockTransactions(params.teamId, params.itemId);
      } catch {
        return {
          ok: false,
          error: internalServiceError("An error occurred while deleting item transactions"),
        };
      }
    } else {
      return {
        ok: false,
        error: makeServiceError(
          409,
          ERROR_CODES.VALIDATION_ERROR,
          "Não é possível excluir o item: ele possui histórico de transações de estoque. Remova ou ajuste as transações primeiro."
        ),
      };
    }
  }

  try {
    await deleteItem(params.itemId);
    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while deleting the item"),
    };
  }
}
