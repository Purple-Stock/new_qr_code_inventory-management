"use client";

import { Button } from "@/components/ui/button";

interface TablePagerProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  backLabel: string;
  nextLabel: string;
  pageLabel: string;
  ofLabel: string;
}

export function TablePager({
  currentPage,
  totalPages,
  onPageChange,
  backLabel,
  nextLabel,
  pageLabel,
  ofLabel,
}: TablePagerProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 sm:mt-6 flex items-center justify-between gap-3">
      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="text-xs sm:text-sm"
      >
        {backLabel}
      </Button>
      <p className="text-xs sm:text-sm text-gray-600">
        {`${pageLabel} ${currentPage} ${ofLabel} ${totalPages}`}
      </p>
      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="text-xs sm:text-sm"
      >
        {nextLabel}
      </Button>
    </div>
  );
}
