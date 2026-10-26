export const LIST_PAGE_SIZE = 10;

export type SortDirection = "asc" | "desc";
export type SortState<K extends string = string> = { key: K; direction: SortDirection } | null;
export type SortValue = string | number | Date | null | undefined;
export type SortGetter<T> = (item: T) => SortValue;

export type PaginationResult<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
};

const hasValue = (value: string | number | null): value is string | number =>
  value !== null && !(typeof value === "string" && value.trim() === "");

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });

const toComparable = (value: SortValue): string | number | null => {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }
  return trimmed;
};

const parsePage = (page: number | string | undefined) => {
  const parsed = typeof page === "number" ? page : Number.parseInt(page ?? "1", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
};

export const paginateList = <T>(
  items: T[],
  page: number | string | undefined = 1
): PaginationResult<T> => {
  const totalPages = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE));
  const requestedPage = parsePage(page);
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * LIST_PAGE_SIZE;

  return {
    items: items.slice(startIndex, startIndex + LIST_PAGE_SIZE),
    currentPage,
    totalPages,
    itemsPerPage: LIST_PAGE_SIZE,
  };
};

export const nextSort = <K extends string>(current: SortState<K>, key: K): SortState<K> => {
  if (current?.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: "asc" };
};

export const sortBy = <T, K extends string>(
  items: T[],
  sort: SortState<K>,
  getters: Record<K, SortGetter<T>>
): T[] => {
  if (!sort) {
    return items;
  }
  const getValue = getters[sort.key];
  if (!getValue) {
    return items;
  }

  return [...items].sort((left, right) => {
    const leftValue = toComparable(getValue(left));
    const rightValue = toComparable(getValue(right));
    if (!hasValue(leftValue) && !hasValue(rightValue)) {
      return 0;
    }
    if (!hasValue(leftValue)) {
      return 1;
    }
    if (!hasValue(rightValue)) {
      return -1;
    }
    const result =
      typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : compareText(String(leftValue), String(rightValue));
    return sort.direction === "asc" ? result : -result;
  });
};
