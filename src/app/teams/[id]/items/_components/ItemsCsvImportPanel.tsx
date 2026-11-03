"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, Download, FileUp, RefreshCw, Upload, X } from "lucide-react";
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
    <div className="w-full sm:w-auto">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="h-10 w-full text-xs sm:h-11 sm:w-auto sm:text-sm"
      >
        <FileUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        {labels.openButton}
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-float"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="items-csv-import-modal-title"
          >
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
              <div>
                <h2 id="items-csv-import-modal-title" className="text-xl font-medium text-ink">
                  {labels.title}
                </h2>
                <p className="mt-1 text-sm text-ink-2">{labels.description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 p-0 text-ink-3 hover:bg-raised"
                aria-label={labels.closeButton}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="border-hairline"
                  >
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
                  >
                    {isPreviewing ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isPreviewing ? labels.previewing : labels.previewButton}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || !canImport}

                  >
                    {isImporting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    {isImporting ? labels.importing : labels.importButton}
                  </Button>
                  {fileName ? (
                    <span className="text-sm text-ink-2">
                      {labels.selectedFile}: {fileName}
                    </span>
                  ) : null}
                </div>

                {preview ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-hairline bg-raised p-4">
                        <p className="text-xs font-medium text-ink-3">
                          {labels.totalRows}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-ink">
                          {preview.summary.totalRows}
                        </p>
                      </div>
                      <div className="rounded-xl border border-hairline bg-white p-4">
                        <p className="text-xs font-medium text-positive">
                          {labels.validRows}
                        </p>
                        <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-positive">
                          {preview.summary.validRows}
                        </p>
                      </div>
                      <div className="rounded-xl border border-hairline bg-white p-4">
                        <p className="text-xs font-medium text-negative">
                          {labels.invalidRows}
                        </p>
                        <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-negative">
                          {preview.summary.invalidRows}
                        </p>
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
                          className="rounded-xl border border-hairline bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-ink">
                              {labels.line} {row.line}
                            </div>
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                row.status === "valid"
                                  ? "bg-raised text-positive"
                                  : "bg-raised text-negative"
                              }`}
                            >
                              {row.status === "valid" ? labels.validBadge : labels.invalidBadge}
                            </span>
                          </div>

                          {row.item ? (
                            <div className="mt-3 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
                              <div>
                                <strong>Name:</strong> {row.item.name ?? "-"}
                              </div>
                              <div>
                                <strong>Barcode:</strong> {row.item.barcode ?? "-"}
                              </div>
                              <div>
                                <strong>SKU:</strong> {row.item.sku ?? "-"}
                              </div>
                              <div>
                                <strong>Stock:</strong> {row.item.currentStock ?? 0}
                              </div>
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
                  <p className="text-sm text-ink-3">{labels.noPreviewYet}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
