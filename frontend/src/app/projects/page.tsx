"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  FileDown,
  FolderOpen,
  ArrowUpDown,
  Compass,
  Ship,
  FileText,
  AlertCircle,
  Trash2
} from "lucide-react";
import { api } from "../../services/api";
import { VesselType } from "../../types";

interface ProjectItem {
  project_id: string;
  project_name: string;
  latest_revision: number;
  file_path: string;
  last_updated: string;
  vessel_type?: string;
  owner?: string;
  target_dwt_ton?: number;
  status?: string;
}

export default function ProjectsList() {
  const router = useRouter();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("last_updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProjects();
      
      // Fetch details to fill in DWT, Owner, Vessel Type, Status
      const detailedList: ProjectItem[] = [];
      for (const p of list) {
        try {
          const hist = await api.getProject(p.project_id);
          const latestRev = hist.revisions[hist.revisions.length - 1];
          const snap = latestRev.data_snapshot;
          
          detailedList.push({
            ...p,
            vessel_type: snap.vessel_type,
            owner: snap.owner,
            target_dwt_ton: snap.target_dwt_ton,
            status: latestRev.status
          });
        } catch (e) {
          detailedList.push(p);
        }
      }
      setItems(detailedList);
    } catch (e: any) {
      setError(e.message || "Gagal memuat daftar proyek.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus proyek "${projectName}" (${projectId})?\n\nTindakan ini akan menghapus berkas proyek secara permanen dan tidak dapat dibatalkan.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await api.deleteProject(projectId);
      localStorage.removeItem(`stage1_validated_${projectId}`);
      await loadProjects();
    } catch (err: any) {
      alert(`Gagal menghapus proyek: ${err.message || err}`);
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Filter & Search logic
  const filteredItems = items
    .filter((item) => {
      const matchSearch =
        item.project_id.toLowerCase().includes(search.toLowerCase()) ||
        item.project_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.owner && item.owner.toLowerCase().includes(search.toLowerCase()));

      const matchVessel = vesselFilter ? item.vessel_type === vesselFilter : true;
      const matchStatus = statusFilter ? item.status === statusFilter : true;

      return matchSearch && matchVessel && matchStatus;
    })
    .sort((a, b) => {
      let valA: any = a[sortBy as keyof ProjectItem] || "";
      let valB: any = b[sortBy as keyof ProjectItem] || "";

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">Project Requirements Database</h2>
            <span className="text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Tahap 1
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Daftar seluruh rancangan kebutuhan dan spesifikasi operasional kapal.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/projects/import")}
            className="flex items-center space-x-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md active:scale-[0.98]"
          >
            <FileDown size={15} className="text-slate-400" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-blue-600/20 border border-blue-400/30 active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Buat Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between backdrop-blur-md">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Projects</span>
          <span className="text-lg font-bold font-mono text-white">{items.length}</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between backdrop-blur-md">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Draft Revisions</span>
          <span className="text-lg font-bold font-mono text-blue-400">
            {items.filter((i) => i.status === "DRAFT" || !i.status).length}
          </span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between backdrop-blur-md">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Ready / Waiting Review</span>
          <span className="text-lg font-bold font-mono text-amber-400">
            {items.filter((i) => i.status === "READY_FOR_REVIEW" || i.status === "WAITING_FOR_REVIEW").length}
          </span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between backdrop-blur-md">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Approved Baselines</span>
          <span className="text-lg font-bold font-mono text-emerald-400">
            {items.filter((i) => i.status === "APPROVED").length}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Cari Project ID, nama kapal, pemilik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 transition-all font-sans"
          />
        </div>

        <div>
          <select
            value={vesselFilter}
            onChange={(e) => setVesselFilter(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/80 cursor-pointer font-sans"
          >
            <option value="">Semua Tipe Kapal</option>
            {Object.values(VesselType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/80 cursor-pointer font-sans"
          >
            <option value="">Semua Status Revisi</option>
            <option value="DRAFT">DRAFT</option>
            <option value="VALIDATION_FAILED">VALIDATION FAILED</option>
            <option value="READY_FOR_REVIEW">READY FOR REVIEW</option>
            <option value="WAITING_FOR_REVIEW">WAITING FOR REVIEW</option>
            <option value="APPROVED">APPROVED (Baseline)</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse backdrop-blur-md" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 backdrop-blur-md">
          <AlertCircle size={32} className="text-rose-500" />
          <p className="text-sm font-semibold text-white">Gagal Memuat Proyek</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={loadProjects}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3 backdrop-blur-md">
          <FolderOpen size={40} className="text-slate-600" />
          <p className="text-sm font-semibold text-white">Tidak Ada Proyek Ditemukan</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Gunakan kriteria pencarian lain atau buat proyek rancangan baru.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800/80 select-none tracking-wider uppercase text-[10px]">
                  <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("project_id")}>
                    <div className="flex items-center space-x-1.5">
                      <span>Project ID</span>
                      <ArrowUpDown size={12} className="text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("project_name")}>
                    <div className="flex items-center space-x-1.5">
                      <span>Project Name</span>
                      <ArrowUpDown size={12} className="text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Tipe Kapal</th>
                  <th className="p-4 cursor-pointer text-right hover:text-white transition-colors" onClick={() => handleSort("target_dwt_ton")}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <span>Target DWT</span>
                      <ArrowUpDown size={12} className="text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4">Status Revisi</th>
                  <th className="p-4 cursor-pointer text-right hover:text-white transition-colors" onClick={() => handleSort("last_updated")}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <span>Last Updated</span>
                      <ArrowUpDown size={12} className="text-slate-500" />
                    </div>
                  </th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  let statusBadge = "bg-slate-800/60 text-slate-400 border border-slate-700/50";
                  if (item.status === "APPROVED") statusBadge = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
                  else if (item.status === "WAITING_FOR_REVIEW" || item.status === "READY_FOR_REVIEW") statusBadge = "bg-amber-500/10 text-amber-400 border border-amber-500/30";
                  else if (item.status === "DRAFT") statusBadge = "bg-blue-500/10 text-blue-400 border border-blue-500/30";
                  else if (item.status === "VALIDATION_FAILED") statusBadge = "bg-rose-500/10 text-rose-400 border border-rose-500/30";

                  return (
                    <tr key={item.project_id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-cyan-400">{item.project_id}</td>
                      <td className="p-4 font-medium text-slate-100">{item.project_name}</td>
                      <td className="p-4 text-slate-400">{item.owner || "-"}</td>
                      <td className="p-4 text-slate-300 font-medium">{item.vessel_type || "-"}</td>
                      <td className="p-4 text-right font-mono font-medium text-slate-200">
                        {item.target_dwt_ton ? `${item.target_dwt_ton.toLocaleString()} ton` : "-"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold ${statusBadge}`}>
                          {item.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(item.last_updated).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/projects/${item.project_id}`}
                            className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98]"
                          >
                            Buka
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(item.project_id, item.project_name)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 p-2 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
