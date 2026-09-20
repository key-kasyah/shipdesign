"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ship,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  MapPin,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Search,
  ChevronDown,
  Navigation,
  Lock,
  Gauge,
  CheckCircle2,
  FolderOpen
} from "lucide-react";
import { api } from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";
import {
  ProjectHistory,
  ProjectRevision,
  ValidationResult,
  ReadinessResult,
  VesselType,
  formatVesselType,
  RevisionStatus
} from "../../../types";

function PortDropdown({
  ports,
  selectedPortId,
  onChange,
  disabled = false
}: {
  ports: any[];
  selectedPortId: number;
  onChange: (portId: number) => void;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPort = ports.find((p) => p.port_id === selectedPortId);

  const filteredPorts = ports.filter(
    (p) =>
      p.port_name.toLowerCase().includes(search.toLowerCase()) ||
      p.province.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="truncate">
          {selectedPort ? (
            <span>
              <strong className="font-semibold">{selectedPort.port_name}</strong>{" "}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">({selectedPort.province})</span>
            </span>
          ) : (
            language === "en" ? "Select Port..." : "Pilih Pelabuhan..."
          )}
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={language === "en" ? "Search port or province..." : "Cari nama pelabuhan / provinsi..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredPorts.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500 text-center">
                {language === "en" ? "Port not found" : "Pelabuhan tidak ditemukan"}
              </div>
            ) : (
              filteredPorts.map((p) => (
                <button
                  key={p.port_id}
                  type="button"
                  onClick={() => {
                    onChange(p.port_id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                    p.port_id === selectedPortId
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700/50"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate mr-2">
                    {p.port_name} <span className="text-[10px] text-slate-500 dark:text-slate-400">({p.province})</span>
                  </span>
                  {p.port_id === selectedPortId && <Check size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const projectId = params.projectId as string;

  // Core Data States
  const [, setHistory] = useState<ProjectHistory | null>(null);
  const [activeRevision, setActiveRevision] = useState<ProjectRevision | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [, setReadinessResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [editorActor, setEditorActor] = useState("designer@ship.com");

  // Ports Database & Route Calculation State
  const [portsList, setPortsList] = useState<any[]>([]);
  const [selectedPortIds, setSelectedPortIds] = useState<number[]>([1, 3, 4]); // Default: Jakarta, Makassar, Manokwari
  const [routeCalcResult, setRouteCalcResult] = useState<any>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Validation Status flag in local storage
  const [isStage1Validated, setIsStage1Validated] = useState<boolean>(false);

  useEffect(() => {
    if (projectId) {
      const isVal = localStorage.getItem(`stage1_validated_${projectId}`) === "true";
      setIsStage1Validated(isVal);
    }
  }, [projectId]);

  const movePortStop = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedPortIds.length) return;
    const updated = [...selectedPortIds];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSelectedPortIds(updated);
    setUnsavedChanges(true);
  };

  const handleAddPortStop = () => {
    const lastId = selectedPortIds[selectedPortIds.length - 1];
    const nextPort = portsList.find((p) => !selectedPortIds.includes(p.port_id)) || portsList[0];
    if (nextPort) {
      setSelectedPortIds([...selectedPortIds, nextPort.port_id]);
      setUnsavedChanges(true);
    }
  };

  const handleRemovePortStop = (index: number) => {
    if (selectedPortIds.length <= 2) {
      alert(language === "en" ? "A voyage route requires at least 2 ports." : "Minimal rute pelayaran memerlukan 2 pelabuhan.");
      return;
    }
    const updated = selectedPortIds.filter((_, i) => i !== index);
    setSelectedPortIds(updated);
    setUnsavedChanges(true);
  };

  const handlePortChange = (index: number, newPortId: number) => {
    const updated = [...selectedPortIds];
    updated[index] = newPortId;
    setSelectedPortIds(updated);
    setUnsavedChanges(true);
  };

  // Load Ports Database
  useEffect(() => {
    async function loadPorts() {
      try {
        const list = await api.getPorts();
        setPortsList(list);
      } catch (err) {
        console.error("Gagal memuat database pelabuhan:", err);
      }
    }
    loadPorts();
  }, []);

  // Calculate Route whenever selected ports change
  useEffect(() => {
    if (selectedPortIds.length < 2) return;
    async function updateRouteCalculation() {
      try {
        const res = await api.calculateRoute(selectedPortIds);
        setRouteCalcResult(res);
        setFormData((prev: any) => ({
          ...prev,
          route_name: res.route_name,
          route_distance_nm: res.max_leg_nm
        }));
      } catch (err) {
        console.error("Gagal kalkulasi rute pelabuhan:", err);
      }
    }
    updateRouteCalculation();
  }, [selectedPortIds]);

  const loadAllProjectData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hist = await api.getProject(projectId);
      setHistory(hist);

      const latestRev = hist.revisions[hist.revisions.length - 1];
      setActiveRevision(latestRev);
      setFormData({ ...latestRev.data_snapshot });
      setUnsavedChanges(false);

      if (latestRev.created_by) {
        setEditorActor(latestRev.created_by);
      }

      // Load validation
      const val = await api.validateProject(projectId);
      setValidationResult(val);

      // Load readiness
      const read = await api.getReadiness(projectId);
      setReadinessResult(read);
    } catch (e: any) {
      setError(e.message || (language === "en" ? "Failed to load project." : "Gagal memuat detail proyek."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadAllProjectData();
    }
  }, [projectId]);

  // Track Form Changes
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
    setSaveFeedback(null);
  };

  // Save Working Draft
  const handleSaveDraft = async () => {
    if (!activeRevision) return;
    try {
      setSaving(true);
      setSaveFeedback(null);
      const payload = {
        ...formData,
        actor: editorActor,
        reason: "Pembaruan spesifikasi Stage 1"
      };
      const updatedHist = await api.updateProject(projectId, payload);
      setHistory(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      setUnsavedChanges(false);

      // Recalculate validation & readiness
      const val = await api.validateProject(projectId);
      setValidationResult(val);
      const read = await api.getReadiness(projectId);
      setReadinessResult(read);

      // Unlock Stage 2 in navigation menu & state
      localStorage.setItem(`stage1_validated_${projectId}`, "true");
      window.dispatchEvent(new Event("stage1-validated"));
      setIsStage1Validated(true);

      setSaveFeedback(
        language === "en"
          ? "Draft successfully saved & validated. Stage 2 is unlocked!"
          : "Draft berhasil disimpan & divalidasi. Tahap 2 (Pra-Rancangan) telah dibuka!"
      );
    } catch (e: any) {
      alert(e.message || (language === "en" ? "Failed to save draft." : "Gagal menyimpan draft."));
    } finally {
      setSaving(false);
    }
  };

  // Check locks
  const isApproved = activeRevision?.status === RevisionStatus.APPROVED;
  const isSuperseded = activeRevision?.status === RevisionStatus.SUPERSEDED;
  const isWaitingReview = activeRevision?.status === RevisionStatus.WAITING_FOR_REVIEW;
  const isReadOnly = isApproved || isSuperseded || isWaitingReview;

  // Form field completion check
  const isComplete =
    Boolean(formData.project_name?.trim()) &&
    Boolean(formData.owner?.trim()) &&
    Number(formData.target_dwt_ton) > 0 &&
    Number(formData.service_speed_knots) > 0 &&
    selectedPortIds.length >= 2;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <Link
              href="/projects"
              className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <FolderOpen size={13} />
              <span>Projects</span>
            </Link>
            <span>/</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
              {projectId}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === "en" ? "Stage 1: Owner's Requirements & Mission Profile" : "Tahap 1: Kebutuhan Pemilik & Profil Operasi"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-2">
            <Ship size={13} className="text-blue-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{formData.project_name || "Kapal Tanpa Nama"}</span>
            <span>•</span>
            <span>{formData.vessel_type ? formatVesselType(formData.vessel_type) : "Tipe Belum Ditentukan"}</span>
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Primary Save Button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 h-[36px]"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? (language === "en" ? "Saving..." : "Menyimpan...") : (language === "en" ? "Save & Validate Draft" : "Simpan & Validasi Draft")}</span>
            </button>
          )}

          {/* Direct Proceed to Stage 2 Button */}
          {isStage1Validated && (
            <Link
              href={`/projects/${projectId}/stage2`}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 whitespace-nowrap shrink-0 h-[36px]"
            >
              <span>{language === "en" ? "Stage 2" : "Ke Tahap 2"}</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveFeedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <Link
            href={`/projects/${projectId}/stage2`}
            className="font-bold underline hover:no-underline flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 ml-3"
          >
            <span>{language === "en" ? "Go to Stage 2 (Preliminary Design)" : "Buka Tahap 2 (Pra-Rancangan)"}</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {unsavedChanges && !saveFeedback && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {language === "en"
                ? "You have unsaved changes. Click 'Save & Validate Draft' to persist updates and unlock Stage 2."
                : "Terdapat perubahan yang belum disimpan. Klik 'Simpan & Validasi Draft' untuk memperbarui data dan membuka Tahap 2."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 ml-3"
          >
            {language === "en" ? "Save Now" : "Simpan Sekarang"}
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
          <Lock size={15} className="text-slate-500 shrink-0" />
          <span>
            {language === "en"
              ? `This revision is locked because status is ${activeRevision?.status}.`
              : `Revisi ini dikunci karena berstatus ${activeRevision?.status}.`}
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Form */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <span className="text-xs font-medium">{language === "en" ? "Loading project specifications..." : "Memuat data spesifikasi proyek..."}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Identity & Key Performance */}
          <div className="lg:col-span-6 space-y-6">
            {/* Card 1: Project Identity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === "en" ? "Project & Owner Identity" : "Identitas & Kepemilikan Proyek"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === "en" ? "Basic project registration and stakeholders" : "Informasi dasar registrasi dan pemilik kapal"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.project_id || projectId || ""}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Project Name *" : "Nama Proyek / Kapal *"}
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.project_name || ""}
                    onChange={(e) => handleFormChange("project_name", e.target.value)}
                    placeholder="Contoh: KM Samudera Nusantara"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Owner / Client *" : "Pemilik Kapal (Owner) *"}
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.owner || ""}
                    onChange={(e) => handleFormChange("owner", e.target.value)}
                    placeholder="Contoh: PT Pelayaran Nasional"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Organization / Shipyard" : "Organisasi / Galangan"}
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.organization || ""}
                    onChange={(e) => handleFormChange("organization", e.target.value)}
                    placeholder="Contoh: Biro Klasifikasi / Galangan"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === "en" ? "Lead Designer / Creator Email *" : "Email Desainer / Creator *"}
                </label>
                <input
                  type="email"
                  disabled={isReadOnly}
                  value={formData.creator || editorActor || ""}
                  onChange={(e) => {
                    handleFormChange("creator", e.target.value);
                    setEditorActor(e.target.value);
                  }}
                  placeholder="designer@ship.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Card 2: Mission & Key Performance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Gauge size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === "en" ? "Mission & Operational Performance" : "Spesifikasi Misi & Kinerja Utama"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === "en" ? "Operational targets used for Stage 2 dimensional estimation" : "Parameter pokok untuk estimasi dimensi utama pada Tahap 2"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === "en" ? "Vessel Type *" : "Tipe Kapal *"}
                </label>
                <select
                  disabled={isReadOnly}
                  value={formData.vessel_type || VesselType.GENERAL_CARGO}
                  onChange={(e) => handleFormChange("vessel_type", e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {Object.values(VesselType).map((t) => (
                    <option key={t} value={t}>
                      {formatVesselType(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target DWT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Target DWT *" : "Target DWT (Deadweight) *"}
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500">
                    <input
                      type="number"
                      step={50}
                      disabled={isReadOnly}
                      value={formData.target_dwt_ton ?? 0}
                      onChange={(e) => handleFormChange("target_dwt_ton", parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent border-none px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">
                      ton
                    </span>
                  </div>
                </div>

                {/* Service Speed */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Service Speed (Vs) *" : "Kecepatan Dinas (Vs) *"}
                  </label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500">
                    <input
                      type="number"
                      step={0.5}
                      disabled={isReadOnly}
                      value={formData.service_speed_knots ?? 0}
                      onChange={(e) => handleFormChange("service_speed_knots", parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent border-none px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">
                      knots
                    </span>
                  </div>
                </div>
              </div>

              {/* Max Leg Distance */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Max Leg Distance (S)" : "Jarak Jelajah / Leg Terjauh (S)"}
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    {language === "en" ? "Synced with route calculation" : "Tersinkronisasi dengan kalkulator rute"}
                  </span>
                </div>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500">
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={formData.route_distance_nm ?? 0}
                    onChange={(e) => handleFormChange("route_distance_nm", parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent border-none px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                  <span className="bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">
                    nm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Route Planner & Stage Progression */}
          <div className="lg:col-span-6 space-y-6">
            {/* Card 3: Voyage Route & Port Stops */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === "en" ? "Voyage Route & Port Stops" : "Perencanaan Rute & Pelabuhan Singgah"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === "en" ? "Voyage itinerary for nautical distance calculation" : "Urutan singgah pelayaran untuk kalkulasi jarak maritim"}
                    </p>
                  </div>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddPortStop}
                    className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{language === "en" ? "Add Port" : "Tambah Pelabuhan"}</span>
                  </button>
                )}
              </div>

              {/* Stops List */}
              <div className="space-y-2.5">
                {selectedPortIds.map((portId, idx) => (
                  <div
                    key={idx}
                    draggable={!isReadOnly}
                    onDragStart={() => setDraggedIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex !== null && draggedIndex !== idx) {
                        movePortStop(draggedIndex, idx);
                        setDraggedIndex(null);
                      }
                    }}
                    className={`flex items-center space-x-2.5 bg-slate-50 dark:bg-slate-950/60 border p-2.5 rounded-xl transition-all ${
                      draggedIndex === idx
                        ? "opacity-40 border-blue-500 border-dashed"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Reorder drag handle & badge */}
                    <div className="flex items-center space-x-1 cursor-grab active:cursor-grabbing text-slate-400 select-none shrink-0">
                      <GripVertical size={14} />
                      <span className="w-5 h-5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Port Selector */}
                    <div className="flex-1 min-w-0">
                      <PortDropdown
                        ports={portsList}
                        selectedPortId={portId}
                        onChange={(newId) => handlePortChange(idx, newId)}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Actions: Reorder & Remove */}
                    {!isReadOnly && (
                      <div className="flex items-center space-x-1 shrink-0 select-none">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePortStop(idx, idx - 1)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md disabled:opacity-20 transition-colors cursor-pointer"
                          title="Geser ke Atas"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedPortIds.length - 1}
                          onClick={() => movePortStop(idx, idx + 1)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md disabled:opacity-20 transition-colors cursor-pointer"
                          title="Geser ke Bawah"
                        >
                          <ArrowDown size={13} />
                        </button>
                        {selectedPortIds.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePortStop(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                            title="Hapus Pelabuhan"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Route Calculation Summary */}
              {routeCalcResult && (
                <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2">
                      <Navigation size={13} className="text-blue-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {routeCalcResult.route_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {routeCalcResult.legs.length} {language === "en" ? "Legs" : "Segmen"}
                    </span>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-3 rounded-xl">
                      <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium block mb-1">
                        {language === "en" ? "Max Leg Distance (S)" : "Jarak Leg Terjauh (S)"}
                      </span>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {routeCalcResult.max_leg_nm}{" "}
                        <span className="text-xs font-normal text-blue-500 dark:text-blue-400">seamiles</span>
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                        {language === "en" ? "Total Route" : "Total Jarak Rute"}
                      </span>
                      <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {routeCalcResult.total_distance_nm}{" "}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">seamiles</span>
                      </span>
                    </div>
                  </div>

                  {/* Legs breakdown */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5">
                    {routeCalcResult.legs.map((leg: { origin_name: string; destination_name: string; distance_nm: number }, i: number) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-300 py-0.5"
                      >
                        <span className="flex items-center space-x-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate">
                            {leg.origin_name.split("(")[0].trim()} ➔ {leg.destination_name.split("(")[0].trim()}
                          </span>
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 shrink-0 ml-2">
                          {leg.distance_nm} nm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
