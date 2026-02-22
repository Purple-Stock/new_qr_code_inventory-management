const ITEMS_PER_PAGE = 10;

type PaginationResult<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
};

const parsePage = (pageParam?: string) => {
  const parsed = Number.parseInt(pageParam ?? "1", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
};

export const paginateTransactions = <T>(items: T[], pageParam?: string): PaginationResult<T> => {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const requestedPage = parsePage(pageParam);
  const currentPage = Math.min(requestedPage, totalPages);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  return {
    items: items.slice(startIndex, endIndex),
    currentPage,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
  };
};
