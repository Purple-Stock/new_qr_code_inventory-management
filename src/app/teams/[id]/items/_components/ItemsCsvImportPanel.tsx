"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, Download, FileUp, RefreshCw, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApiJsonResult } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast-simple";
import { downloadCsv, getItemsCsvTemplate } from "../_utils/exportItemsCsv";

type ImportPreviewRow = {
  line: number;
  status: "valid" | "invalid";
  item: {
    name?: string;
    sku?: string | null;
    barcode?: string;
    itemType?: string | null;
    currentStock?: number;
    price?: number | null;
    locationId?: number | null;
  } | null;
  errors: string[];
};

type ImportPreviewResponse = {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  rows: ImportPreviewRow[];
};

type ImportResponse = {
  message: string;
  summary: {
    totalRows: number;
    importedRows: number;
    rejectedRows: number;
  };
};

interface ItemsCsvImportPanelProps {
  teamId: string;
  labels: {
    title: string;
    description: string;
    openButton: string;
    closeButton: string;
    downloadTemplate: string;
    selectFile: string;
    previewButton: string;
    importButton: string;
    importing: string;
    previewing: string;
    selectedFile: string;
    summary: string;
    validRows: string;
    invalidRows: string;
    totalRows: string;
    line: string;
    validBadge: string;
    invalidBadge: string;
    errorsTitle: string;
    previewHelp: string;
    importSuccess: string;
    templateSuccess: string;
    chooseFileError: string;
    importBlocked: string;
    noPreviewYet: string;
  };
}

export function ItemsCsvImportPanel({ teamId, labels }: ItemsCsvImportPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const canImport = useMemo(() => {
    return Boolean(preview && preview.summary.totalRows > 0 && preview.summary.invalidRows === 0);
  }, [preview]);

  const handleDownloadTemplate = () => {
    downloadCsv(getItemsCsvTemplate(), "items-import-template.csv");
    toast({ variant: "success", title: labels.templateSuccess, description: "" });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName("");
      setCsvContent("");
      setPreview(null);
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setCsvContent(text);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!csvContent.trim()) {
      toast({ variant: "destructive", title: labels.chooseFileError, description: "" });
      return;
    }

    setIsPreviewing(true);
    const result = await fetchApiJsonResult<ImportPreviewResponse>(`/api/teams/${teamId}/items/import`, {
      method: "POST",
      body: {
        mode: "preview",
        csvContent,
      },
      fallbackError: labels.previewHelp,
    });
    setIsPreviewing(false);

    if (!result.ok) {
      toast({ variant: "destructive", title: result.error.error, description: "" });
      return;
    }

    setPreview(result.data);
  };

  const handleImport = async () => {
    if (!canImport) {
      toast({ variant: "destructive", title: labels.importBlocked, description: "" });
      return;
    }

    setIsImporting(true);
    const result = await fetchApiJsonResult<ImportResponse>(`/api/teams/${teamId}/items/import`, {
      method: "POST",
      body: {
        mode: "import",
        csvContent,
      },
      fallbackError: labels.importBlocked,
    });
    setIsImporting(false);

    if (!result.ok) {
      toast({ variant: "destructive", title: result.error.error, description: "" });
      return;
    }

    toast({ variant: "success", title: labels.importSuccess, description: "" });
    window.location.reload();
  };

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen((current) => !current)}
        className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0"
      >
        <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        {isOpen ? labels.closeButton : labels.openButton}
      </Button>

      {isOpen ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{labels.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{labels.description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="border-slate-300">
                <Download className="mr-2 h-4 w-4" />
                {labels.downloadTemplate}
              </Button>
              <div className="flex-1">
                <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewing || !csvContent.trim()}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isPreviewing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isPreviewing ? labels.previewing : labels.previewButton}
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={isImporting || !canImport}
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700"
              >
                {isImporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {isImporting ? labels.importing : labels.importButton}
              </Button>
              {fileName ? <span className="text-sm text-slate-600">{labels.selectedFile}: {fileName}</span> : null}
            </div>

            {preview ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{labels.totalRows}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{preview.summary.totalRows}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{labels.validRows}</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-900">{preview.summary.validRows}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-rose-700">{labels.invalidRows}</p>
                    <p className="mt-2 text-2xl font-semibold text-rose-900">{preview.summary.invalidRows}</p>
                  </div>
                </div>

                {preview.summary.invalidRows > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{labels.errorsTitle}</AlertTitle>
                    <AlertDescription>{labels.importBlocked}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {preview.rows.map((row) => (
                    <div
                      key={`${row.line}-${row.status}`}
                      className={`rounded-xl border p-4 ${
                        row.status === "valid"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {labels.line} {row.line}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.status === "valid"
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {row.status === "valid" ? labels.validBadge : labels.invalidBadge}
                        </span>
                      </div>

                      {row.item ? (
                        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                          <div><strong>Name:</strong> {row.item.name ?? "-"}</div>
                          <div><strong>Barcode:</strong> {row.item.barcode ?? "-"}</div>
                          <div><strong>SKU:</strong> {row.item.sku ?? "-"}</div>
                          <div><strong>Stock:</strong> {row.item.currentStock ?? 0}</div>
                        </div>
                      ) : null}

                      {row.errors.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-sm text-rose-800">
                          {row.errors.map((error) => (
                            <li key={error}>• {error}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{labels.noPreviewYet}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
