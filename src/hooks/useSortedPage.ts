"use client";

import { useMemo, useState } from "react";
import {
  nextSort,
  paginateList,
  sortBy,
  type PaginationResult,
  type SortGetter,
  type SortState,
} from "@/lib/list-table";

export function useSortedPage<T, K extends string>(
  items: T[],
  getters: Record<K, SortGetter<T>>
): {
  sort: SortState<K>;
  onSort: (key: K) => void;
  page: number;
  setPage: (page: number) => void;
  sorted: T[];
  paginated: PaginationResult<T>;
} {
  const [sort, setSort] = useState<SortState<K>>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => sortBy(items, sort, getters), [items, sort, getters]);
  const paginated = useMemo(() => paginateList(sorted, page), [sorted, page]);

  const onSort = (key: K) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };

  return { sort, onSort, page, setPage, sorted, paginated };
}
