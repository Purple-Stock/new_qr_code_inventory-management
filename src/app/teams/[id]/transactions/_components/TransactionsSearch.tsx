"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TransactionWithDetails } from "../_types";

interface TransactionsSearchProps {
  transactions: TransactionWithDetails[];
  onFilteredTransactionsChange: (filtered: TransactionWithDetails[]) => void;
  onSearchChange: (query: string) => void;
  placeholder: string;
}

export function TransactionsSearch({
  transactions,
  onFilteredTransactionsChange,
  onSearchChange,
  placeholder,
}: TransactionsSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearchChange]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 sm:pl-10 h-11 sm:h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
      />
    </div>
  );
}
