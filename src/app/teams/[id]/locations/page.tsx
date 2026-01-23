"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Home,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  FileText,
  BarChart3,
  Tag,
  FileBarChart,
  Settings,
  LogOut,
  Search,
  Info,
  Plus,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Location {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date | number;
  updatedAt: Date | number;
}

interface Team {
  id: number;
  name: string;
  itemCount: number;
  transactionCount: number;
}

export default function LocationsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [locations, setLocations] = useState<Location[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [language, setLanguage] = useState("pt-BR");

  useEffect(() => {
    if (teamId) {
      fetchTeamAndLocations();
    }
  }, [teamId]);

  const fetchTeamAndLocations = async () => {
    try {
      // Fetch team info
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
      }

      // Fetch locations
      const locationsResponse = await fetch(`/api/teams/${teamId}/locations`);
      const locationsData = await locationsResponse.json();
      if (locationsResponse.ok) {
        setLocations(locationsData.locations || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    router.push("/");
  };

  const handleEdit = (id: number) => {
    router.push(`/teams/${teamId}/locations/${id}/edit`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this location?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/teams/${teamId}/locations/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "An error occurred while deleting the location");
        return;
      }

      // Refresh locations list
      fetchTeamAndLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const filteredLocations = locations.filter((location) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(query) ||
      location.description?.toLowerCase().includes(query)
    );
  });

  const menuItems = [
    { icon: Home, label: "Item List", href: `/teams/${teamId}/items` },
    { icon: MapPin, label: "Locations", href: `/teams/${teamId}/locations`, active: true },
    { icon: ArrowUp, label: "Stock In" },
    { icon: ArrowDown, label: "Stock Out" },
    { icon: RotateCcw, label: "Adjust" },
    { icon: Move, label: "Move" },
    { icon: FileText, label: "Transactions" },
    { icon: BarChart3, label: "Stock by Location" },
    { icon: Tag, label: "Labels" },
    { icon: FileBarChart, label: "Reports" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B21A8] rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-lg text-gray-900">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-gray-700 hover:text-[#6B21A8] transition-colors">
            Subscribe
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 text-sm ${
                language === "en"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-2 py-1 text-sm ${
                language === "pt-BR"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-2 py-1 text-sm ${
                language === "fr"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              FR
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-700 hover:text-[#6B21A8] transition-colors"
          >
            <span className="text-sm">Sign Out</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6">
          {/* Team Selection */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  {team?.name || "Loading..."}
                </h3>
              </div>
            </div>
            <Link href="/team_selection">
              <button className="text-xs text-[#6B21A8] hover:underline">
                Change Team
              </button>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active || false;
              const href = item.href || "#";

              if (href !== "#") {
                return (
                  <Link key={index} href={href}>
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-[#6B21A8] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              }

              return (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-[#6B21A8] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Page Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Locations
              </h1>
              <p className="text-gray-600">
                Manage where your inventory items are stored.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Info className="h-4 w-4 mr-2" />
              Tutorial
            </Button>
          </div>

          {/* Search and Add Location */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Link href={`/teams/${teamId}/locations/new`}>
              <Button className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Location
              </Button>
            </Link>
          </div>

          {/* Locations Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? "No locations found matching your search"
                  : "No locations found"}
              </p>
              <Link href={`/teams/${teamId}/locations/new`}>
                <Button className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Location
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NAME
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DESCRIPTION
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLocations.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {location.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {location.description || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(location.id)}
                              className="p-2 text-gray-600 hover:text-[#6B21A8] hover:bg-purple-50 rounded transition-colors"
                              aria-label="Edit location"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(location.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              aria-label="Delete location"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
