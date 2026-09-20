"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  FileDown,
  RefreshCw,
  Folder,
  ChevronRight,
  Ship
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div className="flex items-center space-x-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Ship size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t("app.title", "SHIP DESIGN AI")}
              </h2>
              <span className="text-[10px] font-mono font-semibold bg-blue-50 dark:bg-indigo-500/10 text-blue-700 dark:text-indigo-400 border border-blue-200 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                OPART Lab
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t("app.subtitle", "Offshore and Subsea Production Research Laboratory - opart")} — {t("app.platform_title", "Platform Rancang Bangun Kapal Terintegrasi AI")}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center space-x-2 text-xs font-semibold bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-500 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"} />
          <span>{t("dashboard.refresh", "Refresh Data")}</span>
        </button>
      </div>

      {/* Total Projects Summary Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Folder size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              {t("dashboard.total_projects", "Total Projects")}
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-3xl font-bold font-mono text-white">
                {loading ? "-" : projects.length}
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/20 font-semibold">
                {language === "en" ? "Active" : "Aktif"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/projects/import")}
            className="flex items-center space-x-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm active:scale-[0.98]"
          >
            <FileDown size={14} className="text-slate-400" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-blue-600/20 border border-blue-400/30 active:scale-[0.98]"
          >
            <PlusCircle size={14} />
            <span>{language === "en" ? "Create New Project" : "Buat Proyek Baru"}</span>
          </button>
        </div>
      </div>

      {/* Full-Width Recent Projects Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            {t("dashboard.recent_projects", "Recent Project Requirements")}
          </h3>
          <Link href="/projects" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 transition-colors">
            <span>{t("dashboard.view_all", "View all projects")}</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="h-48 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-slate-500 space-y-3">
            <Folder size={32} className="text-slate-600" />
            <p className="text-xs text-slate-400">
              {language === "en" ? "No registered ship requirement projects found." : "Belum ada proyek kebutuhan kapal terdaftar."}
            </p>
            <button
              onClick={() => router.push("/projects/new")}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shadow-md"
            >
              {language === "en" ? "Initialize First Project" : "Inisialisasi Proyek Pertama"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800/80 uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Project ID</th>
                  <th className="p-3.5">{language === "en" ? "Project Name" : "Nama Proyek"}</th>
                  <th className="p-3.5">Active Rev</th>
                  <th className="p-3.5">Last Updated</th>
                  <th className="p-3.5 text-right">{language === "en" ? "Action" : "Aksi"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.slice(0, 5).map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-cyan-400">{p.project_id}</td>
                    <td className="p-3.5 font-medium text-slate-200">{p.project_name}</td>
                    <td className="p-3.5 font-mono text-slate-400">Rev. {p.latest_revision}</td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                      {new Date(p.last_updated).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition-colors inline-block"
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
