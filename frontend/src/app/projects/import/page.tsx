"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileDown, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { api } from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";

export default function ImportProject() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      
      try {
        const parsed = JSON.parse(content);
        let project_id = parsed.project_id || "";
        let project_name = "";
        let owner = "";
        let total_revisions = 1;

        if (parsed.revisions && parsed.revisions.length > 0) {
          const latest = parsed.revisions[parsed.revisions.length - 1];
          project_name = latest.data_snapshot?.project_name || "";
          owner = latest.data_snapshot?.owner || "";
          total_revisions = parsed.revisions.length;
        } else {
          project_name = parsed.project_name || "";
          owner = parsed.owner || "";
        }

        setPreview({
          project_id,
          project_name,
          owner,
          schema_version: parsed.schema_version || "1.0",
          total_revisions
        });
      } catch (err: any) {
        setError(language === "en" ? "Invalid or corrupted JSON file format." : "Format file JSON tidak valid atau rusak.");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!fileContent) return;
    setLoading(true);
    setError(null);
    try {
      const data = JSON.parse(fileContent);
      const res = await api.importProject(data);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/projects/${res.project_id}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || (language === "en" ? "Failed to import project data." : "Gagal mengimport data proyek."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="atelier-page max-w-[800px] space-y-6">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center space-x-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}</span>
        </button>
      </div>

      <div className="bg-surface-primary border border-border-subtle rounded-lg p-5 sm:p-6 space-y-8">
        <div>
          <h1 className="atelier-page-title text-text-primary">{t("badge.import_project", "Import Project Data JSON")}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {language === "en" ? "Load external vessel specification history data for processing in the Validation Engine." : "Muat data riwayat spesifikasi kapal eksternal untuk diproses di Validation Engine."}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-status-danger-subtle border border-status-danger-border text-status-danger text-sm px-4 py-3 rounded-md flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" className="bg-status-success-subtle border border-status-success-border text-status-success text-sm px-4 py-3 rounded-md flex items-center space-x-2">
            <CheckCircle size={16} />
            <span>{language === "en" ? "Project import successful! Redirecting to detail page..." : "Import proyek berhasil! Mengalihkan ke halaman detail..."}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 border-y border-border-default py-6">
            <FileDown size={24} className="text-text-secondary shrink-0" aria-hidden="true" />
            <div className="text-sm text-text-secondary">
              <label className="atelier-button atelier-button-secondary relative focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring">
                <span>{language === "en" ? "Select JSON file" : "Pilih file JSON"}</span>
                <input
                  type="file"
                  accept=".json"
                  className="sr-only"
                  aria-label={language === "en" ? "Select JSON file" : "Pilih file JSON"}
                  onChange={handleFileChange}
                />
              </label>
              <span className="block mt-1 text-xs text-text-secondary">{language === "en" ? "Platform exported .json file" : "Berkas .json hasil ekspor platform"}</span>
            </div>
          </div>

          {/* Preview Panel */}
          {preview && (
            <div className="space-y-6">
              <h2 className="text-lg leading-[26px] font-semibold text-text-primary flex items-center gap-2">
                <Eye size={14} className="text-accent-primary" />
                <span>{language === "en" ? "File Metadata Preview" : "Preview Metadata Berkas"}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-sm break-words">
                <div>
                  <span className="text-text-secondary block font-semibold">Project ID:</span>
                  <span className="text-accent-primary font-semibold font-mono">{preview.project_id}</span>
                </div>
                <div>
                  <span className="text-text-secondary block font-semibold">{language === "en" ? "Vessel / Project Name:" : "Nama Kapal / Proyek:"}</span>
                  <span className="text-text-primary font-medium">{preview.project_name}</span>
                </div>
                <div>
                  <span className="text-text-secondary block font-semibold">{language === "en" ? "Owner / Shipowner:" : "Owner / Pemilik:"}</span>
                  <span className="text-text-primary">{preview.owner}</span>
                </div>
                <div>
                  <span className="text-text-secondary block font-semibold">{language === "en" ? "Schema / Revision Version:" : "Skema Versi / Revisi:"}</span>
                  <span className="text-text-primary">
                    {language === "en" ? `Version ${preview.schema_version} (${preview.total_revisions} revision(s))` : `Versi ${preview.schema_version} (${preview.total_revisions} revisi)`}
                  </span>
                </div>
              </div>

              <div className="border-t border-border-default pt-3">
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="atelier-button atelier-button-primary w-full sm:w-auto disabled:opacity-50"
                  aria-busy={loading}
                >
                  {loading ? (language === "en" ? "Processing Import..." : "Memproses Import...") : (language === "en" ? "Confirm Data Import" : "Konfirmasi Import Data")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
