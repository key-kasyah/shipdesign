"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  FileDown,
  RefreshCw,
  Folder,
  AlertCircle,
  Clock,
  CheckCircle,
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

  // Summary Metrics State
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    drafts: 0,
    waitingReview: 0,
    approvedBaselines: 0,
    incomplete: 0,
    blockingErrors: 0,
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);

      let drafts = 0;
      let waitingReview = 0;
      let approvedBaselines = 0;
      let incomplete = 0;
      let blockingErrors = 0;

      for (const p of data) {
        try {
          const hist = await api.getProject(p.project_id);
          const latestRev = hist.revisions[hist.revisions.length - 1];
          const snap = latestRev.data_snapshot;

          if (latestRev.status === "DRAFT" || latestRev.status === "VALIDATION_FAILED") {
            drafts++;
          } else if (latestRev.status === "WAITING_FOR_REVIEW") {
            waitingReview++;
          } else if (latestRev.status === "APPROVED") {
            approvedBaselines++;
          }

          if (!snap.is_complete) {
            incomplete++;
          }

          const valRes = await api.validateProject(p.project_id);
          const hasBlocking = valRes.issues.some((i) => i.severity === "BLOCKING_ERROR");
          if (hasBlocking) {
            blockingErrors++;
          }
        } catch (e) {
          console.error("Error computing metrics for project:", p.project_id, e);
        }
      }

      setMetrics({
        total: data.length,
        active: data.length,
        drafts,
        waitingReview,
        approvedBaselines,
        incomplete,
        blockingErrors,
      });
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
    <div className="space-y-8 max-w-7xl mx-auto">
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

      {/* Metrics Row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse backdrop-blur-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-xl hover:border-slate-700/80 transition-all group">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              {t("dashboard.total_projects", "Total Projects")}
            </span>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-3xl font-bold font-mono text-white group-hover:text-blue-400 transition-colors">
                {metrics.total}
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/30 font-semibold">
                {language === "en" ? "Active" : "Aktif"}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-xl hover:border-slate-700/80 transition-all group">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              {t("dashboard.draft_revisions", "Draft Revisions")}
            </span>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-3xl font-bold font-mono text-slate-200 group-hover:text-amber-400 transition-colors">
                {metrics.drafts}
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30 font-semibold">
                {language === "en" ? "In progress" : "Dalam proses"}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-xl hover:border-slate-700/80 transition-all group">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              {t("dashboard.waiting_review", "Waiting for Review")}
            </span>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-3xl font-bold font-mono text-amber-300 group-hover:text-amber-400 transition-colors">
                {metrics.waitingReview}
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30 font-semibold">
                Review Gate
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-xl hover:border-slate-700/80 transition-all group">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              {t("dashboard.approved_baselines", "Approved Baselines")}
            </span>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-3xl font-bold font-mono text-emerald-400 group-hover:text-emerald-300 transition-colors">
                {metrics.approvedBaselines}
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/30 font-semibold">
                Immutable
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Warnings & Incomplete Alert Indicators */}
      {!loading && (metrics.incomplete > 0 || metrics.blockingErrors > 0) && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-5 flex items-start space-x-4 backdrop-blur-md shadow-lg">
          <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-white">{t("dashboard.integrity_warnings", "System Integrity Warnings")}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {language === "en" ? (
                <>There are <span className="font-semibold text-rose-400 font-mono">{metrics.blockingErrors} projects with BLOCKING ERROR</span> and <span className="font-semibold text-amber-400 font-mono">{metrics.incomplete} incomplete draft requirement(s)</span>. Please complete mandatory parameters before baseline review.</>
              ) : (
                <>Terdapat <span className="font-semibold text-rose-400 font-mono">{metrics.blockingErrors} proyek dengan BLOCKING ERROR</span> dan <span className="font-semibold text-amber-400 font-mono">{metrics.incomplete} draf kebutuhan belum lengkap</span>. Selesaikan parameter wajib sebelum melakukan review baseline.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Quick Actions & Recent Projects */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Projects Panel */}
        <div className="xl:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">{t("dashboard.recent_projects", "Recent Project Requirements")}</h3>
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

        {/* Quick Actions Panel */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-2xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white tracking-wide uppercase pb-2 border-b border-slate-800/60">
            {t("dashboard.quick_actions", "Quick Actions")}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => router.push("/projects/new")}
              className="flex items-center space-x-3.5 p-3.5 bg-slate-950/70 hover:bg-slate-800/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <PlusCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                  {t("dashboard.create_new", "Create New Project")}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === "en" ? "Initialize new route & cargo specifications" : "Inisialisasi spesifikasi rute & kargo baru"}
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push("/projects/import")}
              className="flex items-center space-x-3.5 p-3.5 bg-slate-950/70 hover:bg-slate-800/70 border border-slate-800/80 hover:border-slate-700/80 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <FileDown size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {t("dashboard.import_json", "Import JSON File")}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === "en" ? "Load external history or baseline JSON" : "Muat history atau baseline format JSON"}
                </p>
              </div>
            </button>
          </div>

          <div className="border-t border-slate-800/80 pt-5 space-y-3.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Stage 1 Flow Progression
            </h4>
            <div className="space-y-2.5">
              {[
                { step: language === "en" ? "1. Data Requirement Input" : "1. Data Requirement Input", status: "Active Form Input" },
                { step: language === "en" ? "2. Rule-Based Validation" : "2. Rule-Based Validation", status: "Active Engine Check" },
                { step: language === "en" ? "3. Revision Management" : "3. Revision Management", status: "Audit-Trail logging" },
                { step: language === "en" ? "4. Review & Baseline Approval" : "4. Review & Baseline Approval", status: "Review Gate Check" },
                { step: language === "en" ? "5. Handoff Readiness Report" : "5. Handoff Readiness Report", status: "Namespace payload exported" }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium text-[11px]">{item.step}</span>
                  <span className="text-[9px] font-mono bg-slate-950/80 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
