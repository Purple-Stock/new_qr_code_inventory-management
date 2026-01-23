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
import { useToast } from "@/components/ui/use-toast-simple";
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
  const { toast } = useToast();

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

  const handleDelete = async (id: number, locationName: string) => {
    try {
      const response = await fetch(
        `/api/teams/${teamId}/locations/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "An error occurred while deleting the location",
        });
        return;
      }

      // Show success toast
      toast({
        variant: "success",
        title: "Location deleted",
        description: `${locationName} has been deleted successfully.`,
      });

      // Refresh locations list
      fetchTeamAndLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-gray-700 hover:text-[#6B21A8] transition-colors font-medium">
            Subscribe
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "en"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "pt-BR"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "fr"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              FR
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all font-medium text-sm"
          >
            <span>Sign Out</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6 shadow-sm">
          {/* Team Selection */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {team?.name || "Loading..."}
                </h3>
              </div>
            </div>
            <Link href="/team_selection">
              <button className="text-xs text-[#6B21A8] hover:text-[#7C3AED] hover:underline font-medium transition-colors">
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                          : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                      : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Locations
              </h1>
              <p className="text-gray-600 text-lg">
                Manage where your inventory items are stored.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11"
            >
              <Info className="h-4 w-4 mr-2" />
              Tutorial
            </Button>
          </div>

          {/* Search and Add Location */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-1 relative min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search locations by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              />
            </div>
            <Link href={`/teams/${teamId}/locations/new`}>
              <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all h-11">
                <Plus className="h-4 w-4 mr-2" />
                New Location
              </Button>
            </Link>
          </div>

          {/* Locations Table */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6B21A8] border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-10 w-10 text-purple-600" />
              </div>
              <p className="text-gray-700 text-xl font-semibold mb-2">
                {searchQuery
                  ? "No locations found matching your search"
                  : "No locations found"}
              </p>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first location"}
              </p>
              <Link href={`/teams/${teamId}/locations/new`}>
                <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Location
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        NAME
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        DESCRIPTION
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredLocations.map((location) => (
                      <tr key={location.id} className="hover:bg-purple-50/50 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-md">
                              <MapPin className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {location.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm text-gray-600 max-w-md">
                            {location.description ? (
                              <span className="line-clamp-2">{location.description}</span>
                            ) : (
                              <span className="text-gray-400 italic">No description</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(location.id)}
                              className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                              aria-label="Edit location"
                              title="Edit location"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
                                  handleDelete(location.id, location.name);
                                }
                              }}
                              className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              aria-label="Delete location"
                              title="Delete location"
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
