"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Info,
  FileText,
  QrCode,
  DollarSign,
  Tag,
  Square,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function NewItemPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [itemType, setItemType] = useState("");
  const [brand, setBrand] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateSKU = () => {
    // Generate a simple SKU based on name
    if (name.trim()) {
      const skuValue = name
        .toUpperCase()
        .replace(/\s+/g, "-")
        .substring(0, 20);
      setSku(skuValue);
    }
  };

  const generateBarcode = () => {
    // Generate a random 13-digit barcode (EAN-13 format)
    const randomBarcode = Math.floor(
      1000000000000 + Math.random() * 9000000000000
    ).toString();
    setBarcode(randomBarcode);
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, "");
    return numericValue;
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setCost(formatted);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setPrice(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Item name is required");
      return;
    }

    if (!barcode.trim()) {
      setError("Barcode is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim(),
          cost: cost ? parseFloat(cost) : null,
          price: price ? parseFloat(price) : null,
          itemType: itemType.trim() || null,
          brand: brand.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred while creating the item");
        setIsLoading(false);
        return;
      }

      setSuccess("Item created successfully! Redirecting...");

      // Redirect to items list and refresh so the new item appears
      setTimeout(async () => {
        await router.push(`/teams/${teamId}/items`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

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
            <button className="px-2 py-1 text-sm text-[#6B21A8] font-semibold">
              EN
            </button>
            <button className="px-2 py-1 text-sm text-gray-600">PT</button>
            <button className="px-2 py-1 text-sm text-gray-600">FR</button>
          </div>
          <button className="flex items-center gap-2 text-gray-700 hover:text-[#6B21A8] transition-colors">
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Simplified for this page */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6">
          <div className="mb-6 pb-6 border-b border-gray-200">
            <Link href={`/teams/${teamId}/items`}>
              <button className="text-xs text-[#6B21A8] hover:underline flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Items
              </button>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-3xl">
            {/* Page Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/teams/${teamId}/items`}>
                  <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">New Item.</h1>
              </div>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Info className="h-4 w-4 mr-2" />
                Tutorial
              </Button>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="mb-6 border-l-4 border-l-green-500 bg-green-50/50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600 text-sm">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert
                variant="destructive"
                className="mb-6 border-l-4 border-l-red-500 bg-red-50/50"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Item Information Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Item Information
                </h2>

                <div className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-900">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter item name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* SKU */}
                  <div className="space-y-2">
                    <Label htmlFor="sku" className="text-gray-900">
                      SKU
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="sku"
                          type="text"
                          placeholder="Enter SKU"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="text-sm text-[#6B21A8] hover:underline whitespace-nowrap"
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="space-y-2">
                    <Label htmlFor="barcode" className="text-gray-900">
                      Barcode <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="barcode"
                          type="text"
                          placeholder="Enter or generate barcode"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          className="w-full"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateBarcode}
                        className="text-sm text-[#6B21A8] hover:underline whitespace-nowrap"
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Cost and Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-gray-900">
                        Cost
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="cost"
                          type="text"
                          placeholder="0.00"
                          value={cost}
                          onChange={handleCostChange}
                          className="w-full pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-gray-900">
                        Price
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="price"
                          type="text"
                          placeholder="0.00"
                          value={price}
                          onChange={handlePriceChange}
                          className="w-full pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Attributes Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Item Attributes
                </h2>

                <div className="space-y-6">
                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="itemType" className="text-gray-900">
                      Type
                    </Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="itemType"
                        type="text"
                        placeholder="Enter item type"
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value)}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>

                  {/* Brand */}
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-gray-900">
                      Brand
                    </Label>
                    <div className="relative">
                      <Square className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="brand"
                        type="text"
                        placeholder="Enter brand name"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white font-semibold px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Create Item"}
                </Button>
                <Link href={`/teams/${teamId}/items`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
