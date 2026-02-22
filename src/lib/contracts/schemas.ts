import type { StockTransactionType } from "@/db/schema";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseString(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }

  return { ok: true, data: value };
}

function parseRequiredTrimmedString(
  value: unknown,
  field: string
): ValidationResult<string> {
  const parsed = parseString(value, field);
  if (!parsed.ok) {
    return parsed;
  }

  const trimmed = parsed.data.trim();
  if (!trimmed) {
    return { ok: false, error: `${field} is required` };
  }

  return { ok: true, data: trimmed };
}

function parseOptionalTrimmedString(
  value: unknown
): ValidationResult<string | null | undefined> {
  if (value === undefined) {
    return { ok: true, data: undefined };
  }
  if (value === null) {
    return { ok: true, data: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Field must be a string" };
  }
  return { ok: true, data: value.trim() || null };
}

function parseNumber(value: unknown, field: string): ValidationResult<number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { ok: true, data: value };
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return { ok: true, data: parsed };
    }
  }
  return { ok: false, error: `${field} must be a valid number` };
}

function parseOptionalNumber(value: unknown): ValidationResult<number | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: undefined };
  }
  const parsed = parseNumber(value, "Field");
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, data: parsed.data };
}

function parseNullableNumber(value: unknown): ValidationResult<number | null | undefined> {
  if (value === undefined) {
    return { ok: true, data: undefined };
  }
  if (value === null || value === "") {
    return { ok: true, data: null };
  }
  const parsed = parseNumber(value, "Field");
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, data: parsed.data };
}

function parseOptionalInteger(
  value: unknown
): ValidationResult<number | null | undefined> {
  if (value === undefined) {
    return { ok: true, data: undefined };
  }
  if (value === null || value === "") {
    return { ok: true, data: null };
  }
  const parsed = parseNumber(value, "Field");
  if (!parsed.ok) {
    return parsed;
  }
  if (!Number.isInteger(parsed.data)) {
    return { ok: false, error: "Field must be an integer" };
  }
  return { ok: true, data: parsed.data };
}

export function parseLoginPayload(body: unknown): ValidationResult<{
  email: string;
  password: string;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const emailParsed = parseRequiredTrimmedString(body.email, "Email");
  if (!emailParsed.ok) {
    return { ok: false, error: "Email and password are required" };
  }

  const passwordParsed = parseRequiredTrimmedString(body.password, "Password");
  if (!passwordParsed.ok) {
    return { ok: false, error: "Email and password are required" };
  }

  return {
    ok: true,
    data: {
      email: normalizeEmail(emailParsed.data),
      password: passwordParsed.data,
    },
  };
}

export function parseSignupPayload(body: unknown): ValidationResult<{
  email: string;
  password: string;
  companyName: string;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const emailParsed = parseRequiredTrimmedString(body.email, "Email");
  const passwordParsed = parseRequiredTrimmedString(body.password, "Password");
  const companyNameParsed = parseRequiredTrimmedString(body.companyName, "Company name");

  if (!emailParsed.ok || !passwordParsed.ok || !companyNameParsed.ok) {
    return { ok: false, error: "Email, password and company name are required" };
  }

  const normalizedEmail = normalizeEmail(emailParsed.data);
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, error: "Invalid email format" };
  }

  if (passwordParsed.data.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }

  return {
    ok: true,
    data: {
      email: normalizedEmail,
      password: passwordParsed.data,
      companyName: companyNameParsed.data,
    },
  };
}

export function parseTeamCreatePayload(body: unknown): ValidationResult<{
  name: string;
  notes: string | null;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const nameParsed = parseRequiredTrimmedString(body.name, "Team name");
  if (!nameParsed.ok) {
    return { ok: false, error: "Team name is required" };
  }

  const notesParsed = parseOptionalTrimmedString(body.notes);
  if (!notesParsed.ok) {
    return { ok: false, error: "Notes must be a string" };
  }

  return {
    ok: true,
    data: { name: nameParsed.data, notes: notesParsed.data ?? null },
  };
}

export function parseTeamUpdatePayload(body: unknown): ValidationResult<{
  name?: string;
  notes?: string | null;
  labelCompanyInfo?: string | null;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const payload: { name?: string; notes?: string | null; labelCompanyInfo?: string | null } = {};

  if (body.name !== undefined) {
    const nameParsed = parseRequiredTrimmedString(body.name, "Team name");
    if (!nameParsed.ok) {
      return { ok: false, error: "Team name is required" };
    }
    payload.name = nameParsed.data;
  }

  if (body.notes !== undefined) {
    const notesParsed = parseOptionalTrimmedString(body.notes);
    if (!notesParsed.ok) {
      return { ok: false, error: "Notes must be a string" };
    }
    payload.notes = notesParsed.data ?? null;
  }

  if (body.labelCompanyInfo !== undefined) {
    const labelCompanyInfoParsed = parseOptionalTrimmedString(body.labelCompanyInfo);
    if (!labelCompanyInfoParsed.ok) {
      return { ok: false, error: "Label company info must be a string" };
    }
    payload.labelCompanyInfo = labelCompanyInfoParsed.data ?? null;
  }

  return { ok: true, data: payload };
}

export function parseTeamManualTrialPayload(body: unknown): ValidationResult<{
  durationDays: number;
  reason: string | null;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const durationParsed = parseOptionalInteger(body.durationDays);
  if (!durationParsed.ok || durationParsed.data === null) {
    return { ok: false, error: "Duration must be an integer between 1 and 30 days" };
  }

  const durationDays = durationParsed.data ?? 14;
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
    return { ok: false, error: "Duration must be an integer between 1 and 30 days" };
  }

  const reasonParsed = parseOptionalTrimmedString(body.reason);
  if (!reasonParsed.ok) {
    return { ok: false, error: "Reason must be a string" };
  }

  if (reasonParsed.data && reasonParsed.data.length > 200) {
    return { ok: false, error: "Reason must have at most 200 characters" };
  }

  return {
    ok: true,
    data: {
      durationDays,
      reason: reasonParsed.data ?? null,
    },
  };
}

export function parseLocationPayload(
  body: unknown
): ValidationResult<{ name: string; description: string | null }> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const nameParsed = parseRequiredTrimmedString(body.name, "Location name");
  if (!nameParsed.ok) {
    return { ok: false, error: "Location name is required" };
  }

  const descriptionParsed = parseOptionalTrimmedString(body.description);
  if (!descriptionParsed.ok) {
    return { ok: false, error: "Description must be a string" };
  }

  return {
    ok: true,
    data: {
      name: nameParsed.data,
      description: descriptionParsed.data ?? null,
    },
  };
}

export type ItemWritePayload = {
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
};

export function parseItemPayload(
  body: unknown,
  mode: "create" | "update"
): ValidationResult<ItemWritePayload> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const payload: ItemWritePayload = {};

  if (mode === "create" || body.name !== undefined) {
    const nameParsed = parseRequiredTrimmedString(body.name, "Item name");
    if (!nameParsed.ok) {
      return { ok: false, error: "Item name is required" };
    }
    payload.name = nameParsed.data;
  }

  if (mode === "create" || body.barcode !== undefined) {
    const barcodeParsed = parseRequiredTrimmedString(body.barcode, "Barcode");
    if (!barcodeParsed.ok) {
      return { ok: false, error: "Barcode is required" };
    }
    payload.barcode = barcodeParsed.data;
  }

  const skuParsed = parseOptionalTrimmedString(body.sku);
  if (!skuParsed.ok) {
    return { ok: false, error: "SKU must be a string" };
  }
  if (body.sku !== undefined) payload.sku = skuParsed.data ?? null;

  const itemTypeParsed = parseOptionalTrimmedString(body.itemType);
  if (!itemTypeParsed.ok) {
    return { ok: false, error: "Item type must be a string" };
  }
  if (body.itemType !== undefined) payload.itemType = itemTypeParsed.data ?? null;

  const brandParsed = parseOptionalTrimmedString(body.brand);
  if (!brandParsed.ok) {
    return { ok: false, error: "Brand must be a string" };
  }
  if (body.brand !== undefined) payload.brand = brandParsed.data ?? null;

  const photoDataParsed = parseOptionalTrimmedString(body.photoData);
  if (!photoDataParsed.ok) {
    return { ok: false, error: "Photo data must be a string" };
  }
  if (body.photoData !== undefined) {
    const photoData = photoDataParsed.data ?? null;
    if (photoData && !photoData.startsWith("data:image/")) {
      return { ok: false, error: "Photo data must be a valid image data URL" };
    }
    payload.photoData = photoData;
  }

  const costParsed = parseNullableNumber(body.cost);
  if (!costParsed.ok) {
    return { ok: false, error: "Cost must be a valid number" };
  }
  if (body.cost !== undefined) payload.cost = costParsed.data ?? null;

  const priceParsed = parseNullableNumber(body.price);
  if (!priceParsed.ok) {
    return { ok: false, error: "Price must be a valid number" };
  }
  if (body.price !== undefined) payload.price = priceParsed.data ?? null;

  const locationIdParsed = parseOptionalInteger(body.locationId);
  if (!locationIdParsed.ok) {
    return { ok: false, error: "Location ID must be an integer" };
  }
  if (body.locationId !== undefined) payload.locationId = locationIdParsed.data ?? null;

  const initialQuantityParsed = parseOptionalNumber(body.initialQuantity);
  if (!initialQuantityParsed.ok) {
    return { ok: false, error: "Initial quantity must be a valid number" };
  }
  if (body.initialQuantity !== undefined) {
    payload.initialQuantity = initialQuantityParsed.data ?? 0;
  }

  const currentStockParsed = parseOptionalNumber(body.currentStock);
  if (!currentStockParsed.ok) {
    return { ok: false, error: "Current stock must be a valid number" };
  }
  if (body.currentStock !== undefined) payload.currentStock = currentStockParsed.data;

  const minimumStockParsed = parseOptionalNumber(body.minimumStock);
  if (!minimumStockParsed.ok) {
    return { ok: false, error: "Minimum stock must be a valid number" };
  }
  if (body.minimumStock !== undefined) {
    payload.minimumStock = minimumStockParsed.data ?? 0;
  }

  return { ok: true, data: payload };
}

export function parseStockTransactionPayload(body: unknown): ValidationResult<{
  itemId: number;
  transactionType: StockTransactionType;
  quantity: number;
  notes: string | null;
  locationId: number | null;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request payload" };
  }

  const itemIdParsed = parseNumber(body.itemId, "itemId");
  const quantityParsed = parseNumber(body.quantity, "quantity");
  if (!itemIdParsed.ok || !quantityParsed.ok) {
    return { ok: false, error: "Missing required fields" };
  }
  if (!Number.isInteger(itemIdParsed.data)) {
    return { ok: false, error: "Missing required fields" };
  }
  if (quantityParsed.data <= 0) {
    return { ok: false, error: "Quantity must be greater than 0" };
  }

  const transactionType = body.transactionType;
  const allowedTypes: StockTransactionType[] = [
    "stock_in",
    "stock_out",
    "adjust",
    "move",
    "count",
  ];
  if (
    typeof transactionType !== "string" ||
    !allowedTypes.includes(transactionType as StockTransactionType)
  ) {
    return { ok: false, error: "Missing required fields" };
  }

  const notesParsed = parseOptionalTrimmedString(body.notes);
  if (!notesParsed.ok) {
    return { ok: false, error: "Notes must be a string" };
  }

  const locationIdParsed = parseOptionalInteger(body.locationId);
  const sourceLocationIdParsed = parseOptionalInteger(body.sourceLocationId);
  const destinationLocationIdParsed = parseOptionalInteger(body.destinationLocationId);
  if (!locationIdParsed.ok || !sourceLocationIdParsed.ok || !destinationLocationIdParsed.ok) {
    return { ok: false, error: "Location IDs must be integers" };
  }

  return {
    ok: true,
    data: {
      itemId: itemIdParsed.data,
      transactionType: transactionType as StockTransactionType,
      quantity: quantityParsed.data,
      notes: notesParsed.data ?? null,
      locationId: locationIdParsed.data ?? null,
      sourceLocationId: sourceLocationIdParsed.data ?? null,
      destinationLocationId: destinationLocationIdParsed.data ?? null,
    },
  };
}

export function parsePasswordChangePayload(body: unknown): ValidationResult<{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}> {
  if (!isRecord(body)) {
    return { ok: false, error: "PASSWORD_FIELDS_REQUIRED" };
  }

  const currentParsed = parseRequiredTrimmedString(body.currentPassword, "currentPassword");
  const nextParsed = parseRequiredTrimmedString(body.newPassword, "newPassword");
  const confirmParsed = parseRequiredTrimmedString(body.confirmPassword, "confirmPassword");
  if (!currentParsed.ok || !nextParsed.ok || !confirmParsed.ok) {
    return { ok: false, error: "PASSWORD_FIELDS_REQUIRED" };
  }

  if (nextParsed.data.length < 6) {
    return { ok: false, error: "PASSWORD_TOO_SHORT" };
  }

  if (nextParsed.data !== confirmParsed.data) {
    return { ok: false, error: "PASSWORD_CONFIRMATION_MISMATCH" };
  }

  if (currentParsed.data === nextParsed.data) {
    return { ok: false, error: "PASSWORD_MUST_DIFFER" };
  }

  return {
    ok: true,
    data: {
      currentPassword: currentParsed.data,
      newPassword: nextParsed.data,
      confirmPassword: confirmParsed.data,
    },
  };
}
