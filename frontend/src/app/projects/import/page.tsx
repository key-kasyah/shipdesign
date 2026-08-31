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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">{t("badge.import_project", "Import Project Data JSON")}</h2>
          <p className="text-slate-400 text-xs mt-1">
            {language === "en" ? "Load external vessel specification history data for processing in the Validation Engine." : "Muat data riwayat spesifikasi kapal eksternal untuk diproses di Validation Engine."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-4 py-3 rounded-lg flex items-center space-x-2">
            <CheckCircle size={16} />
            <span>{language === "en" ? "Project import successful! Redirecting to detail page..." : "Import proyek berhasil! Mengalihkan ke halaman detail..."}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center space-y-3 bg-slate-950/20">
            <FileDown size={32} className="mx-auto text-slate-500" />
            <div className="text-xs text-slate-400">
              <label className="text-blue-500 hover:underline cursor-pointer font-semibold">
                <span>{language === "en" ? "Select JSON file" : "Pilih file JSON"}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <span className="block mt-1 text-[10px] text-slate-500">{language === "en" ? "Platform exported .json file" : "Berkas .json hasil ekspor platform"}</span>
            </div>
          </div>

          {/* Preview Panel */}
          {preview && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Eye size={14} className="text-blue-400" />
                <span>{language === "en" ? "File Metadata Preview" : "Preview Metadata Berkas"}</span>
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-550 block font-semibold">Project ID:</span>
                  <span className="text-blue-400 font-bold font-mono">{preview.project_id}</span>
                </div>
                <div>
                  <span className="text-slate-550 block font-semibold">{language === "en" ? "Vessel / Project Name:" : "Nama Kapal / Proyek:"}</span>
                  <span className="text-white font-medium">{preview.project_name}</span>
                </div>
                <div>
                  <span className="text-slate-550 block font-semibold">{language === "en" ? "Owner / Shipowner:" : "Owner / Pemilik:"}</span>
                  <span className="text-slate-300">{preview.owner}</span>
                </div>
                <div>
                  <span className="text-slate-550 block font-semibold">{language === "en" ? "Schema / Revision Version:" : "Skema Versi / Revisi:"}</span>
                  <span className="text-slate-300">
                    {language === "en" ? `Version ${preview.schema_version} (${preview.total_revisions} revision(s))` : `Versi ${preview.schema_version} (${preview.total_revisions} revisi)`}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-3">
                <button
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
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
