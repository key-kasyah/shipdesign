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
import { VesselType, formatVesselType } from "../../types";
import { useLanguage } from "../../context/LanguageContext";

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
  const { t, language } = useLanguage();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [sortBy, setSortBy] = useState("last_updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProjects();
      
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
      setError(e.message || (language === "en" ? "Failed to load projects list." : "Gagal memuat daftar proyek."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmDelete = window.confirm(
      language === "en"
        ? `Are you sure you want to delete project "${projectName}" (${projectId})?\n\nThis will permanently delete project files and cannot be undone.`
        : `Apakah Anda yakin ingin menghapus proyek "${projectName}" (${projectId})?\n\nTindakan ini akan menghapus berkas proyek secara permanen dan tidak dapat dibatalkan.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await api.deleteProject(projectId);
      localStorage.removeItem(`stage1_validated_${projectId}`);
      await loadProjects();
    } catch (err: any) {
      alert(language === "en" ? `Failed to delete project: ${err.message || err}` : `Gagal menghapus proyek: ${err.message || err}`);
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

  const filteredItems = items
    .filter((item) => {
      const matchSearch =
        item.project_id.toLowerCase().includes(search.toLowerCase()) ||
        item.project_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.owner && item.owner.toLowerCase().includes(search.toLowerCase()));

      const matchVessel = vesselFilter ? item.vessel_type === vesselFilter : true;

      return matchSearch && matchVessel;
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
    <div className="atelier-page space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="atelier-page-title">
              {t("nav.projects", "Project Requirements Database")}
            </h1>
            <span className="text-sm font-mono font-semibold bg-surface-selected text-accent-primary border border-border-default px-3 py-1 rounded-full">
              {items.length} {language === "en" ? "Total Projects" : "Total Proyek"}
            </span>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            {language === "en" ? "Database of all vessel requirement designs & operational specifications." : "Daftar seluruh rancangan kebutuhan dan spesifikasi operasional kapal."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/projects/import")}
            className="atelier-button atelier-button-secondary"
          >
            <FileDown size={15} className="text-text-secondary" />
            <span>Import JSON</span>
          </button>
          <button
            onClick={() => router.push("/projects/new")}
            className="atelier-button atelier-button-primary"
          >
            <Plus size={15} />
            <span>{t("projects.create_new_btn", "Buat Proyek Baru")}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-3 text-text-secondary" size={15} />
          <input
            type="text"
            aria-label={t("projects.search_placeholder", "Search projects")}
            placeholder={t("projects.search_placeholder", "Cari Project ID, nama kapal, pemilik...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-inset border border-border-default rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default focus:ring-1 focus:ring-focus-ring transition-colors font-sans"
          />
        </div>

        <div>
          <select aria-label="Vessel type filter"
            value={vesselFilter}
            onChange={(e) => setVesselFilter(e.target.value)}
            className="w-full bg-surface-inset border border-border-default rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default cursor-pointer font-sans"
          >
            <option value="">{t("projects.all_vessel_types", "Semua Tipe Kapal")}</option>
            {Object.values(VesselType).map((t) => (
              <option key={t} value={t}>
                {formatVesselType(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-primary border border-border-default rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-status-danger-subtle border border-status-danger-border rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle size={32} className="text-status-danger" />
          <p className="text-sm font-semibold text-text-primary">{language === "en" ? "Failed to Load Projects" : "Gagal Memuat Proyek"}</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            onClick={loadProjects}
            className="bg-surface-secondary hover:bg-surface-secondary text-text-primary text-sm px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            {language === "en" ? "Try Again" : "Coba Lagi"}
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface-primary border border-border-default rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-3">
          <FolderOpen size={40} className="text-text-secondary" />
          <p className="text-sm font-semibold text-text-primary">{language === "en" ? "No Projects Found" : "Tidak Ada Proyek Ditemukan"}</p>
          <p className="text-sm text-text-secondary max-w-sm">
            {language === "en" ? "Use different search criteria or create a new design project." : "Gunakan kriteria pencarian lain atau buat proyek rancangan baru."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden">
          <div tabIndex={0} role="region" aria-label="Scrollable project data" className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-inset text-text-secondary font-semibold border-b border-border-default select-none tracking-normal text-xs">
                  <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort("project_id")} aria-sort={sortBy === "project_id" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="flex items-center space-x-1.5 text-left">
                      <span>Project ID</span>
                      <ArrowUpDown size={12} className="text-text-secondary" />
                    </button>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort("project_name")} aria-sort={sortBy === "project_name" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="flex items-center space-x-1.5 text-left">
                      <span>{language === "en" ? "Project Name" : "Nama Proyek"}</span>
                      <ArrowUpDown size={12} className="text-text-secondary" />
                    </button>
                  </th>
                  <th className="p-4">{language === "en" ? "Owner" : "Pemilik"}</th>
                  <th className="p-4">{language === "en" ? "Vessel Type" : "Tipe Kapal"}</th>
                  <th className="p-4 cursor-pointer text-right hover:text-text-primary transition-colors" onClick={() => handleSort("target_dwt_ton")} aria-sort={sortBy === "target_dwt_ton" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="flex items-center justify-end space-x-1.5 text-left">
                      <span>Target DWT</span>
                      <ArrowUpDown size={12} className="text-text-secondary" />
                    </button>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort("latest_revision")} aria-sort={sortBy === "latest_revision" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="flex items-center space-x-1.5 text-left">
                      <span>{language === "en" ? "Revision" : "Revisi"}</span>
                      <ArrowUpDown size={12} className="text-text-secondary" />
                    </button>
                  </th>
                  <th className="p-4 cursor-pointer text-right hover:text-text-primary transition-colors" onClick={() => handleSort("last_updated")} aria-sort={sortBy === "last_updated" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="flex items-center justify-end space-x-1.5 text-left">
                      <span>Last Updated</span>
                      <ArrowUpDown size={12} className="text-text-secondary" />
                    </button>
                  </th>
                  <th className="p-4 text-right">{language === "en" ? "Action" : "Aksi"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredItems.map((item) => {
                  return (
                    <tr key={item.project_id} className="hover:bg-surface-secondary transition-colors">
                      <td className="p-4 font-mono font-semibold text-accent-primary">{item.project_id}</td>
                      <td className="p-4 font-medium text-text-primary">{item.project_name}</td>
                      <td className="p-4 text-text-secondary">{item.owner || "-"}</td>
                      <td className="p-4 text-text-primary font-medium">{formatVesselType(item.vessel_type)}</td>
                      <td className="p-4 text-right font-mono font-medium text-text-primary">
                        {item.target_dwt_ton ? `${item.target_dwt_ton.toLocaleString()} ton` : "-"}
                      </td>
                      <td className="p-4 font-mono text-text-secondary text-sm">
                        Rev. {item.latest_revision}
                      </td>
                      <td className="p-4 text-right text-text-secondary font-mono text-xs">
                        {new Date(item.last_updated).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/projects/${item.project_id}`}
                            className="bg-surface-selected hover:bg-accent-hover text-accent-primary hover:text-on-accent border border-border-default font-semibold px-3 py-1.5 rounded-lg transition-colors "
                          >
                            {t("projects.open", "Buka")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(item.project_id, item.project_name)}
                            className="bg-status-danger-subtle hover:bg-status-danger-subtle text-status-danger border border-status-danger-border p-2 rounded-lg transition-colors cursor-pointer"
                            aria-label={`${t("projects.delete", "Hapus Proyek")}: ${item.project_name}`}
                            title={t("projects.delete", "Hapus Proyek")}
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
