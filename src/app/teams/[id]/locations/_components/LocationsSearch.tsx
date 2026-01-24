"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Location } from "../_types";

interface LocationsSearchProps {
  locations: Location[];
  onFilteredLocationsChange: (filtered: Location[]) => void;
  placeholder: string;
}

export function LocationsSearch({
  locations,
  onFilteredLocationsChange,
  placeholder,
}: LocationsSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (!value) {
      onFilteredLocationsChange(locations);
      return;
    }

    const query = value.toLowerCase();
    const filtered = locations.filter((location) => {
      return (
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query)
      );
    });

    onFilteredLocationsChange(filtered);
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="pl-9 sm:pl-10 h-11 sm:h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
      />
    </div>
  );
}
