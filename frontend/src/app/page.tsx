"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  FileDown,
  RefreshCw,
  Folder,
  ChevronRight
} from "lucide-react";
import { api } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

interface ProjectSummary {
  project_id: string;
  project_name: string;
  latest_revision: number;
  last_updated: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="atelier-page space-y-8">
      {/* Page Header */}
      <div className="atelier-page-header">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="atelier-page-title">
                {t("app.title", "SHIP DESIGN AI")}
              </h1>
              <span className="text-xs font-medium text-text-tertiary">
                OPART Lab
              </span>
            </div>
            <p className="text-text-secondary text-sm mt-2 max-w-[70ch] leading-relaxed">
              {t("app.subtitle", "Offshore and Subsea Production Research Laboratory - opart")} — {t("app.platform_title", "Platform Rancang Bangun Kapal Terintegrasi AI")}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="atelier-button atelier-button-secondary disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-accent-primary" : "text-text-secondary"} />
          <span>{t("dashboard.refresh", "Refresh Data")}</span>
        </button>
      </div>

      {/* Total Projects Summary Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-border-default">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-xs font-semibold text-text-secondary tracking-normal block">
              {t("dashboard.total_projects", "Total Projects")}
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-2xl font-medium font-mono tabular-nums text-text-primary">
                {loading ? "-" : projects.length}
              </span>
              <span className="text-xs text-text-secondary">
                {language === "en" ? "Active" : "Aktif"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/projects/import")}
            className="atelier-button atelier-button-secondary"
          >
            <FileDown size={14} className="text-text-secondary" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="atelier-button atelier-button-primary"
          >
            <PlusCircle size={14} />
            <span>{language === "en" ? "Create New Project" : "Buat Proyek Baru"}</span>
          </button>
        </div>
      </div>

      {/* Full-Width Recent Projects Panel */}
      {error && <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-subtle px-4 py-3 text-status-danger">{error}</p>}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("dashboard.recent_projects", "Recent Project Requirements")}
          </h2>
          <Link href="/projects" className="text-sm text-accent-primary hover:text-accent-primary font-semibold flex items-center space-x-1 transition-colors">
            <span>{t("dashboard.view_all", "View all projects")}</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="h-48 border border-dashed border-border-default rounded-lg flex flex-col items-center justify-center text-text-secondary space-y-3">
            <Folder size={32} className="text-text-secondary" />
            <p className="text-sm text-text-secondary">
              {language === "en" ? "No registered ship requirement projects found." : "Belum ada proyek kebutuhan kapal terdaftar."}
            </p>
            <button
              onClick={() => router.push("/projects/new")}
              className="bg-accent-primary hover:bg-accent-hover text-on-accent text-sm px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              {language === "en" ? "Initialize First Project" : "Inisialisasi Proyek Pertama"}
            </button>
          </div>
        ) : (
          <div tabIndex={0} role="region" aria-label="Scrollable project data" className="overflow-x-auto bg-surface-primary border border-border-default rounded-lg">
            <table className="w-full min-w-[780px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-inset text-text-secondary font-semibold border-b border-border-default text-xs tracking-normal">
                  <th className="px-4 py-4">Project ID</th>
                  <th className="px-4 py-4">{language === "en" ? "Project Name" : "Nama Proyek"}</th>
                  <th className="px-4 py-4">Active Rev</th>
                  <th className="px-4 py-4">Last Updated</th>
                  <th className="px-4 py-4 text-right">{language === "en" ? "Action" : "Aksi"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {projects.slice(0, 5).map((p) => (
                  <tr key={p.project_id} className="hover:bg-surface-secondary transition-colors">
                    <td className="px-4 py-4 font-mono font-semibold text-accent-primary">{p.project_id}</td>
                    <td className="px-4 py-4 font-medium text-text-primary">{p.project_name}</td>
                    <td className="px-4 py-4 font-mono text-text-secondary">Rev. {p.latest_revision}</td>
                    <td className="px-4 py-4 font-mono text-text-secondary text-xs">
                      {new Date(p.last_updated).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="atelier-button atelier-button-secondary"
                      >
                        {language === "en" ? "Manage" : "Kelola"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
