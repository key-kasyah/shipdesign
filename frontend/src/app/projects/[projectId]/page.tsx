"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  History,
  Lock,
  Compass,
  Cpu,
  Save,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Send,
  Eye,
  FileDown,
  Info,
  MapPin,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Search,
  ChevronDown,
  Navigation
} from "lucide-react";
import { api } from "../../../services/api";
import {
  ProjectHistory,
  ProjectRevision,
  ValidationResult,
  ReadinessResult,
  VesselType,
  WaterType,
  DraftConstraintType,
  RevisionStatus
} from "../../../types";

function PortDropdown({
  ports,
  selectedPortId,
  onChange
}: {
  ports: any[];
  selectedPortId: number;
  onChange: (portId: number) => void;
}) {
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
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white hover:border-blue-500 transition-colors text-left"
      >
        <span className="truncate">
          {selectedPort ? `${selectedPort.port_name} (${selectedPort.province})` : "Pilih Pelabuhan..."}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col p-2 space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pelabuhan / provinsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredPorts.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500 text-center">Pelabuhan tidak ditemukan</div>
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
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between ${
                    p.port_id === selectedPortId
                      ? "bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/30"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>{p.port_name} <span className="text-[10px] text-slate-400">({p.province})</span></span>
                  {p.port_id === selectedPortId && <Check size={12} className="text-blue-400" />}
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
  const projectId = params.projectId as string;

  // Tabs
  const [activeTab, setActiveTab] = useState<"form" | "validation" | "revisions" | "baseline" | "readiness" | "ai">("form");

  // Core Data States
  const [history, setHistory] = useState<ProjectHistory | null>(null);
  const [activeRevision, setActiveRevision] = useState<ProjectRevision | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [editorActor, setEditorActor] = useState("designer@ship.com");
  const [editReason, setEditReason] = useState("Modifikasi parameter desain");

  // Ports Database & Route Calculation State
  const [portsList, setPortsList] = useState<any[]>([]);
  const [selectedPortIds, setSelectedPortIds] = useState<number[]>([1, 3, 4]); // Default: Jakarta, Makassar, Manokwari
  const [routeCalcResult, setRouteCalcResult] = useState<any>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    const nextPort = portsList.find((p) => p.port_id !== lastId) || portsList[0];
    if (nextPort) {
      setSelectedPortIds([...selectedPortIds, nextPort.port_id]);
      setUnsavedChanges(true);
    }
  };

  const handleRemovePortStop = (index: number) => {
    if (selectedPortIds.length <= 2) {
      alert("Minimal rute pelayaran memerlukan 2 pelabuhan.");
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

  // AI State
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMode, setAiMode] = useState("PARAMETER_EXPLAINER");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string; blocked?: boolean }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Revision Comparison State
  const [compareRev1, setCompareRev1] = useState("");
  const [compareRev2, setCompareRev2] = useState("");
  const [comparisonResult, setComparisonResult] = useState<any[] | null>(null);

  // Approval Form State
  const [reviewerName, setReviewerName] = useState("lead@ship.com");
  const [reviewNote, setReviewNote] = useState("Spesifikasi lengkap & sesuai profil operasi.");

  // Focus ref for inputs (Validation issues click)
  const formRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

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

      // Load validation
      const val = await api.validateProject(projectId);
      setValidationResult(val);

      // Load readiness
      const read = await api.getReadiness(projectId);
      setReadinessResult(read);
    } catch (e: any) {
      setError(e.message || "Gagal memuat detail proyek.");
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
  };

  // Save Working Draft
  const handleSaveDraft = async () => {
    if (!activeRevision) return;
    try {
      setLoading(true);
      const payload = {
        ...formData,
        actor: editorActor,
        reason: editReason
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

      // Unlock Stage 2 in navigation menu!
      localStorage.setItem(`stage1_validated_${projectId}`, "true");
      window.dispatchEvent(new Event("stage1-validated"));

      alert("Working revision berhasil diperbarui & divalidasi!");
    } catch (e: any) {
      alert(`Gagal menyimpan: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Workflow Handlers
  const handleSubmitReview = async () => {
    if (!activeRevision) return;
    if (unsavedChanges) {
      alert("Simpan perubahan draf terlebih dahulu sebelum mengajukan review.");
      return;
    }
    if (validationResult && !validationResult.is_complete) {
      alert("Dokumen draf belum lengkap. Harap isi seluruh field wajib.");
      return;
    }

    try {
      setLoading(true);
      const updated = await api.submitRevision(projectId, activeRevision.revision_id, editorActor);
      setHistory(updated);
      setActiveRevision(updated.revisions[updated.revisions.length - 1]);
      alert("Revisi berhasil diajukan untuk review!");
    } catch (e: any) {
      alert(`Gagal mengajukan review: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!activeRevision) return;
    try {
      setLoading(true);
      let updated;
      if (decision === "APPROVED") {
        updated = await api.approveRevision(projectId, activeRevision.revision_id, {
          reviewer: reviewerName,
          note: reviewNote
        });
      } else {
        updated = await api.rejectRevision(projectId, activeRevision.revision_id, {
          reviewer: reviewerName,
          note: reviewNote
        });
      }
      setHistory(updated);
      setActiveRevision(updated.revisions[updated.revisions.length - 1]);
      
      // Reload readiness
      const read = await api.getReadiness(projectId);
      setReadinessResult(read);
      alert(`Review diproses dengan keputusan: ${decision}`);
    } catch (e: any) {
      alert(`Gagal memproses keputusan review: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewRevisionBranch = async () => {
    if (!activeRevision) return;
    const confirm = window.confirm("Apakah Anda yakin ingin mencabangkan revisi baru (DRAFT) dari baseline ini?");
    if (!confirm) return;

    try {
      setLoading(true);
      const updated = await api.createRevision(projectId, {
        parent_revision_id: activeRevision.revision_id,
        creator: editorActor,
        reason: "Memulai modifikasi spesifikasi baru"
      });
      setHistory(updated);
      setActiveRevision(updated.revisions[updated.revisions.length - 1]);
      setFormData({ ...updated.revisions[updated.revisions.length - 1].data_snapshot });
      setUnsavedChanges(false);
      setActiveTab("form");
      alert("Revisi baru (DRAFT) berhasil dicabangkan.");
    } catch (e: any) {
      alert(`Gagal mencabangkan revisi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Compare Revisions
  const handleCompare = () => {
    if (!history || !compareRev1 || !compareRev2) return;
    const r1 = history.revisions.find((r) => r.revision_number === parseInt(compareRev1));
    const r2 = history.revisions.find((r) => r.revision_number === parseInt(compareRev2));
    if (!r1 || !r2) {
      alert("Nomor revisi tidak ditemukan.");
      return;
    }

    // Build comparison diff table
    const changes: any[] = [];
    const fields = Object.keys(r1.data_snapshot);
    fields.forEach((f) => {
      const v1 = (r1.data_snapshot as any)[f];
      const v2 = (r2.data_snapshot as any)[f];
      if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        changes.push({
          field: f,
          oldValue: v1 === null || v1 === undefined ? "-" : String(v1),
          newValue: v2 === null || v2 === undefined ? "-" : String(v2),
        });
      }
    });
    setComparisonResult(changes);
  };

  // Ask AI Assistant
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !activeRevision) return;

    const userText = aiQuestion.trim();
    setAiChat((prev) => [...prev, { sender: "user", text: userText }]);
    setAiQuestion("");
    setAiLoading(true);

    try {
      const res = await api.askAI(projectId, {
        question: userText,
        mode: aiMode,
        revision_id: activeRevision.revision_id
      });
      setAiChat((prev) => [...prev, { sender: "ai", text: res.answer, blocked: res.safety_blocked }]);
    } catch (err: any) {
      setAiChat((prev) => [...prev, { sender: "ai", text: `Gagal menghubungi AI Assistant: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFocusField = (field: string) => {
    setActiveTab("form");
    setTimeout(() => {
      const el = formRefs.current[field];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 100);
  };

  // Export Handoff Baseline payload
  const handleExportBaseline = async () => {
    try {
      const payload = await api.exportBaseline(projectId, `v1.${activeRevision?.revision_number || 0}`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `baseline_handoff_${projectId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e: any) {
      alert(`Gagal ekspor baseline: ${e.message}`);
    }
  };

  // Check locks
  const isApproved = activeRevision?.status === RevisionStatus.APPROVED;
  const isSuperseded = activeRevision?.status === RevisionStatus.SUPERSEDED;
  const isWaitingReview = activeRevision?.status === RevisionStatus.WAITING_FOR_REVIEW;
  const isReadOnly = isApproved || isSuperseded || isWaitingReview;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="cursor-pointer hover:text-white" onClick={() => router.push("/projects")}>Projects</span>
            <span>/</span>
            <span className="text-slate-300 font-medium font-mono">{projectId}</span>
          </div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white font-mono">{projectId}</h2>
            <span className="text-slate-500 font-semibold">|</span>
            <h3 className="text-sm font-semibold text-slate-300">{formData.project_name || "Kapal Tanpa Nama"}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800 overflow-x-auto select-none">
        {[
          { id: "form", label: "Parameter Form", icon: <FileText size={16} /> },
          { id: "ai", label: "AI Explainer", icon: <Cpu size={16} /> }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center space-x-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === t.id
                ? "border-blue-500 text-blue-400 bg-slate-900/10"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      {loading && activeTab !== "ai" ? (
        <div className="h-64 flex items-center justify-center space-x-2 text-slate-500">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-xs font-medium">Processing payload...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PARAMETER FORM */}
          {activeTab === "form" && (
            <div className="space-y-6">
              {/* Unsaved changes Alert banner */}
              {unsavedChanges && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex justify-between items-center">
                  <span>Terdapat perubahan lokal yang belum disimpan sebagai working revision.</span>
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded cursor-pointer"
                  >
                    <Save size={12} />
                    <span>Save Draft</span>
                  </button>
                </div>
              )}

              {isReadOnly && (
                <div className="bg-slate-900 border border-slate-800 text-slate-400 text-xs px-4 py-3 rounded-lg flex items-center space-x-2">
                  <Lock size={14} className="text-slate-500" />
                  <span>Revisi ini dikunci karena berstatus {activeRevision?.status}. Sila cabangkan revisi baru dari tab Baseline jika ingin mengedit.</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Form Column */}
                <div className="space-y-6">
                  {/* Sec 1: Identity */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                      Section 1 — Identitas Proyek
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Project ID</label>
                        <input
                          type="text"
                          disabled
                          value={formData.project_id || ""}
                          className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Nama Proyek *</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={formData.project_name || ""}
                          onChange={(e) => handleFormChange("project_name", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Owner *</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={formData.owner || ""}
                          onChange={(e) => handleFormChange("owner", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Organisasi</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={formData.organization || ""}
                          onChange={(e) => handleFormChange("organization", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Pembuat / Creator *</label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={formData.creator || editorActor || ""}
                        onChange={(e) => {
                          handleFormChange("creator", e.target.value);
                          setEditorActor(e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Sec 2: Vessel & Mission */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                      Section 2 — Misi & Tipe Kapal
                    </h4>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Tipe Kapal *</label>
                      <select
                        disabled={isReadOnly}
                        value={formData.vessel_type || ""}
                        onChange={(e) => handleFormChange("vessel_type", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
                      >
                        {Object.values(VesselType).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DYNAMIC MULTI-STOP ROUTE BUILDER */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                        <div className="flex items-center space-x-2">
                          <MapPin size={14} className="text-blue-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Pemilihan Pelabuhan Singgah & Hitung Jarak Terjauh (S)
                          </span>
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={handleAddPortStop}
                            className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Tambah Pelabuhan</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Pilih urutan pelabuhan singgah. Sistem akan menghitung jarak maritim (seamiles) antar segmen dan mengambil <span className="font-semibold text-slate-200">jarak leg terjauh (S)</span> secara otomatis dari database pelabuhan.
                      </p>

                      {/* Ports Selection List */}
                      <div className="space-y-2">
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
                            className={`flex items-center space-x-2 bg-slate-900 border p-2 rounded-lg transition-all ${
                              draggedIndex === idx ? "opacity-40 border-blue-500 border-dashed" : "border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center space-x-1 cursor-grab active:cursor-grabbing text-slate-500 select-none shrink-0">
                              <GripVertical size={14} />
                              <span className="w-5 h-5 bg-slate-800 text-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold font-mono">
                                {idx + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <PortDropdown
                                ports={portsList}
                                selectedPortId={portId}
                                onChange={(newId) => handlePortChange(idx, newId)}
                              />
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center space-x-1 shrink-0 select-none">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => movePortStop(idx, idx - 1)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 transition-colors cursor-pointer"
                                  title="Geser ke Atas"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === selectedPortIds.length - 1}
                                  onClick={() => movePortStop(idx, idx + 1)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 transition-colors cursor-pointer"
                                  title="Geser ke Bawah"
                                >
                                  <ArrowDown size={12} />
                                </button>
                                {selectedPortIds.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePortStop(idx)}
                                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                    title="Hapus Pelabuhan"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Calculation Summary Card */}
                      {routeCalcResult && (
                        <div className="bg-slate-900/80 border border-blue-500/20 rounded-lg p-3 space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="font-semibold text-slate-300 truncate">Rute: <span className="text-white">{routeCalcResult.route_name}</span></span>
                            <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">
                              {routeCalcResult.legs.length} Segmen
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            {routeCalcResult.legs.map((leg: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center space-x-1 truncate">
                                  <Navigation size={10} className="text-slate-500 shrink-0" />
                                  <span className="truncate">{leg.origin_name.split("(")[0].trim()} ➔ {leg.destination_name.split("(")[0].trim()}</span>
                                </span>
                                <span className="font-mono font-medium text-slate-200 shrink-0 ml-2">{leg.distance_nm} seamiles</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-1.5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg flex justify-between items-center">
                              <span className="text-blue-300 font-medium">Jarak Terjauh (S):</span>
                              <span className="text-xs font-bold text-blue-400 font-mono">
                                {routeCalcResult.max_leg_nm} seamiles
                              </span>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Total Rute:</span>
                              <span className="text-xs font-bold text-slate-200 font-mono">
                                {routeCalcResult.total_distance_nm} seamiles
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Form Column */}
                <div className="space-y-6">
                  {/* Sec 3: Capacities & Operations */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                      Section 3 — Kapasitas & Kinerja Utama
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Target DWT *</label>
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                          <input
                            type="number"
                            ref={(el) => { formRefs.current["target_dwt_ton"] = el; }}
                            disabled={isReadOnly}
                            value={formData.target_dwt_ton || 0}
                            onChange={(e) => handleFormChange("target_dwt_ton", parseFloat(e.target.value))}
                            className="w-full bg-transparent border-none px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <span className="bg-slate-850 px-2 py-1.5 text-[10px] font-semibold text-slate-400 border-l border-slate-800">
                            ton
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Kecepatan Dinas (V) *</label>
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                          <input
                            type="number"
                            ref={(el) => { formRefs.current["service_speed_knots"] = el; }}
                            disabled={isReadOnly}
                            value={formData.service_speed_knots || 0}
                            onChange={(e) => handleFormChange("service_speed_knots", parseFloat(e.target.value))}
                            className="w-full bg-transparent border-none px-2.5 py-1.5 text-xs text-white"
                          />
                          <span className="bg-slate-850 px-2 py-1.5 text-[10px] font-semibold text-slate-400 border-l border-slate-800">
                            knots
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Jarak Leg Terjauh (S)</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                        <input
                          type="number"
                          ref={(el) => { formRefs.current["route_distance_nm"] = el; }}
                          disabled={isReadOnly}
                          value={formData.route_distance_nm || 0}
                          onChange={(e) => handleFormChange("route_distance_nm", parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none px-2.5 py-1.5 text-xs text-white"
                        />
                        <span className="bg-slate-850 px-2 py-1.5 text-[10px] font-semibold text-slate-400 border-l border-slate-800">
                          nm
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Action Button */}
                  {!isReadOnly && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveDraft}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        <Save size={14} />
                        <span>Simpan & Validasi Draft</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VALIDATION ENGINE */}
          {activeTab === "validation" && (
            <div className="space-y-6">
              {validationResult && (
                <>
                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Validitas</span>
                      <span
                        className={`text-lg font-bold block mt-3 ${
                          validationResult.is_valid ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {validationResult.is_valid ? "✓ VALID" : "✗ INVALID"}
                      </span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kelengkapan</span>
                      <span
                        className={`text-lg font-bold block mt-3 ${
                          validationResult.is_complete ? "text-blue-400" : "text-amber-500"
                        }`}
                      >
                        {validationResult.is_complete ? "✓ LENGKAP" : "✗ DRAFT"}
                      </span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gate Baseline</span>
                      <span
                        className={`text-lg font-bold block mt-3 ${
                          validationResult.can_approve_baseline ? "text-green-500" : "text-slate-400"
                        }`}
                      >
                        {validationResult.can_approve_baseline ? "✓ SIAP" : "✗ BELUM LAYAK"}
                      </span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Temuan</span>
                      <span className="text-xl font-bold text-white block mt-2">
                        {validationResult.issues.length} isu
                      </span>
                    </div>
                  </div>

                  {/* Issues Detail Lists */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white">Daftar Temuan Masalah Validasi</h3>
                      <button
                        onClick={loadAllProjectData}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Revalidate</span>
                      </button>
                    </div>

                    {validationResult.issues.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 space-y-2">
                        <CheckCircle className="text-green-500 mx-auto" size={32} />
                        <p className="text-sm font-semibold text-white">Semua Parameter Valid & Aman</p>
                        <p className="text-xs">Tidak ditemukan issue validasi pada snapshot revisi aktif.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {validationResult.issues.map((issue, idx) => {
                          const isError = issue.severity === "ERROR" || issue.severity === "BLOCKING_ERROR";
                          return (
                            <div
                              key={idx}
                              onClick={() => handleFocusField(issue.field_path)}
                              className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-slate-850/50 ${
                                isError
                                  ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                                  : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                        isError ? "bg-red-500 text-white" : "bg-amber-500 text-slate-950"
                                      }`}
                                    >
                                      {issue.severity}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 font-bold">
                                      {issue.code}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-white mt-1.5">
                                    Field: '{issue.field_path}' - {issue.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Saran: {issue.suggestion}
                                  </p>
                                </div>
                                <span className="text-[10px] text-slate-500 underline font-medium hover:text-white">
                                  Klik untuk perbaiki
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: REVISIONS & AUDIT TRAIL */}
          {activeTab === "revisions" && (
            <div className="space-y-6">
              {history && (
                <>
                  {/* Revisions Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                      Riwayat Revisi Dokumen
                    </h3>
                    <div className="overflow-x-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/30 text-slate-400 border-b border-slate-800 font-medium">
                            <th className="p-3">Nomor Revisi</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Dibuat Oleh</th>
                            <th className="p-3">Tanggal Dibuat</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {history.revisions.map((rev) => (
                            <tr key={rev.revision_id} className="hover:bg-slate-850/30 transition-colors">
                              <td className="p-3 font-semibold text-slate-200">Rev. {rev.revision_number}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rev.status === "APPROVED"
                                      ? "bg-green-500/10 text-green-400"
                                      : rev.status === "WAITING_FOR_REVIEW"
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : "bg-blue-500/10 text-blue-400"
                                  }`}
                                >
                                  {rev.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400">{rev.created_by}</td>
                              <td className="p-3 text-slate-400">
                                {new Date(rev.created_at).toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setActiveRevision(rev);
                                    setFormData({ ...rev.data_snapshot });
                                    setUnsavedChanges(false);
                                    setActiveTab("form");
                                  }}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-[10px] font-medium"
                                >
                                  Muat Form
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Compare Revisions UI Panel */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                      Bandingkan Parameter Antar Revisi
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400">Revisi A (Nomor):</span>
                        <input
                          type="number"
                          value={compareRev1}
                          onChange={(e) => setCompareRev1(e.target.value)}
                          placeholder="0"
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400">Revisi B (Nomor):</span>
                        <input
                          type="number"
                          value={compareRev2}
                          onChange={(e) => setCompareRev2(e.target.value)}
                          placeholder="1"
                          className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                      <button
                        onClick={handleCompare}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded text-xs cursor-pointer"
                      >
                        Bandingkan
                      </button>
                    </div>

                    {comparisonResult && (
                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950/30 text-slate-400 border-b border-slate-800 font-medium">
                              <th className="p-3">Field Path</th>
                              <th className="p-3">Nilai Lama (Rev {compareRev1})</th>
                              <th className="p-3">Nilai Baru (Rev {compareRev2})</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {comparisonResult.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="p-4 text-center text-slate-500">
                                  Tidak ada perubahan parameter desain antara kedua revisi.
                                </td>
                              </tr>
                            ) : (
                              comparisonResult.map((c, idx) => (
                                <tr key={idx} className="hover:bg-slate-850/20">
                                  <td className="p-3 font-mono text-blue-400 font-semibold">{c.field}</td>
                                  <td className="p-3 text-red-400 line-through bg-red-500/5">{c.oldValue}</td>
                                  <td className="p-3 text-green-400 bg-green-500/5">{c.newValue}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* System Audit Trail Lists */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                      Audit Trail System Log
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {history.audit_trail.slice().reverse().map((audit) => (
                        <div key={audit.event_id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span>{new Date(audit.timestamp).toLocaleString()}</span>
                            <span>Aktor: {audit.actor}</span>
                          </div>
                          <p className="text-slate-200 font-medium">
                            Aksi: <span className="text-blue-400 font-semibold">{audit.action}</span>
                          </p>
                          {(audit.old_value || audit.new_value) && (
                            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900/60 rounded text-[10px] font-mono">
                              <div>Old: {audit.old_value || "-"}</div>
                              <div>New: {audit.new_value || "-"}</div>
                            </div>
                          )}
                          {audit.reason && (
                            <p className="text-slate-400 text-[10px]">Alasan: {audit.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: DESIGN BASELINE */}
          {activeTab === "baseline" && (
            <div className="space-y-6">
              {/* Baseline View Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-white">Active Design Baseline</h3>
                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      IMMUTABLE
                    </span>
                  </div>
                  {activeRevision?.status === "APPROVED" && (
                    <button
                      onClick={handleExportBaseline}
                      className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-lg border border-slate-700 font-semibold cursor-pointer"
                    >
                      <FileDown size={14} />
                      <span>Export Handoff Baseline</span>
                    </button>
                  )}
                </div>

                {history && history.baselines.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-3">
                    <Lock className="mx-auto text-slate-600" size={32} />
                    <p className="text-sm font-semibold text-white">Tidak Ada Baseline Aktif</p>
                    <p className="text-xs">
                      Revisi ini belum disetujui reviewer. Selesaikan review untuk mengunci baseline.
                    </p>
                  </div>
                ) : (
                  history && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-3">
                        <div>
                          <span className="text-slate-500 font-semibold block">Baseline Version:</span>
                          <span className="text-slate-200 font-semibold font-mono">
                            {history.baselines[history.baselines.length - 1].baseline_version}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block">Tanggal Penguncian:</span>
                          <span className="text-slate-200">
                            {new Date(history.baselines[history.baselines.length - 1].locked_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block">Reviewer Persetujuan:</span>
                          <span className="text-slate-200">
                            {history.approvals[history.approvals.length - 1]?.reviewer || "system"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block">Catatan Persetujuan:</span>
                          <span className="text-slate-200 block italic">
                            "{history.approvals[history.approvals.length - 1]?.approval_note || "Tidak ada catatan."}"
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-4">
                        <div>
                          <h4 className="font-semibold text-white">Ingin Mengubah Spesifikasi Kapal?</h4>
                          <p className="text-slate-500 text-[10px] mt-1">
                            Baseline bersifat immutable. Anda harus mencabangkan revisi DRAFT baru dari baseline aktif untuk melakukan modifikasi parameter.
                          </p>
                        </div>
                        <button
                          onClick={handleCreateNewRevisionBranch}
                          className="w-full flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-xs transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Cabangkan Revisi Baru</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Review Panel for WAITING_FOR_REVIEW state */}
              {isWaitingReview && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                    Review Approval Workflow Gate
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 block">Nama Reviewer *</label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 block">Catatan Keputusan *</label>
                      <input
                        type="text"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleReviewDecision("APPROVED")}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Setujui (APPROVE)
                    </button>
                    <button
                      onClick={() => handleReviewDecision("REJECTED")}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Tolak (REJECT)
                    </button>
                  </div>
                </div>
              )}

              {/* Submit for review for DRAFT / VALIDATION_FAILED state */}
              {!isReadOnly && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Ajukan Dokumen Draf untuk Review</h4>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      Pastikan validasi sudah bersih tanpa error sebelum mengajukan baseline approval.
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitReview}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <Send size={12} />
                    <span>Ajukan Review</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: READINESS CHECK */}
          {activeTab === "readiness" && (
            <div className="space-y-6">
              {readinessResult && (
                <>
                  {/* Score card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between items-center text-center space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Completeness Score</span>
                      <div className="relative w-24 h-24 flex items-center justify-center bg-slate-950 rounded-full border-4 border-blue-500">
                        <span className="text-2xl font-extrabold text-white">{readinessResult.completeness_score}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">Dihitung dari 8 parameter wajib primer</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Readiness Status</span>
                        <span className="text-lg font-bold text-yellow-400 block mt-2">
                          {readinessResult.readiness_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Handoff Readiness</span>
                        <span
                          className={`text-sm font-bold block mt-1 ${
                            readinessResult.handoff_ready ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {readinessResult.handoff_ready ? "✓ READY FOR HANDOFF" : "✗ NOT READY"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 text-xs">
                      <h4 className="font-semibold text-white">Status Checklist Kesiapan:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={readinessResult.completeness_score === 100 ? "text-green-500" : "text-slate-500"}>✓</span>
                          <span className="text-slate-300">Project Identity Complete</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={readinessResult.validation_summary.is_valid ? "text-green-500" : "text-red-500"}>
                            {readinessResult.validation_summary.is_valid ? "✓" : "✗"}
                          </span>
                          <span className="text-slate-300">Validation Passed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={readinessResult.readiness_status === "BASELINED" ? "text-green-500" : "text-slate-500"}>
                            {readinessResult.readiness_status === "BASELINED" ? "✓" : "!"}
                          </span>
                          <span className="text-slate-300">Baseline Approved</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risks & Assumptions lists */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                      Analisis Risiko & Asumsi Operasional Lambung
                    </h3>
                    {readinessResult.risks_and_assumptions.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">Tidak ditemukan deviasi risiko operasional ekstrim.</p>
                    ) : (
                      <div className="space-y-2">
                        {readinessResult.risks_and_assumptions.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs flex items-start space-x-3 ${
                              item.type === "RISK"
                                ? "bg-red-500/5 border-red-500/10 text-slate-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-300"
                            }`}
                          >
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                                item.type === "RISK" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                              }`}
                            >
                              {item.type}
                            </span>
                            <div>
                              <span className="font-semibold text-white block">Field: '{item.parameter}'</span>
                              <p className="mt-0.5 text-slate-400">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile Summaries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Operating Profile Summary */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <h4 className="font-bold text-white border-b border-slate-800 pb-2">
                        Operational Profile Summary
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tipe Kapal:</span>
                          <span className="text-slate-200">{readinessResult.operational_profile.vessel_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kecepatan Dinas:</span>
                          <span className="text-slate-200">{readinessResult.operational_profile.service_speed_knots} knots</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Route Trayek:</span>
                          <span className="text-slate-200">{readinessResult.operational_profile.route}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Jarak Pelayaran:</span>
                          <span className="text-slate-200">
                            {readinessResult.operational_profile.route_distance_nm ? `${readinessResult.operational_profile.route_distance_nm} nm` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dimensions & Constraints */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <h4 className="font-bold text-white border-b border-slate-800 pb-2">
                        Design Constraints Summary
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Batas Max Draft:</span>
                          <span className="text-slate-200">
                            {readinessResult.design_constraints.max_draft_m ? `${readinessResult.design_constraints.max_draft_m} m` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Batas Max LOA:</span>
                          <span className="text-slate-200">
                            {readinessResult.design_constraints.max_loa_m ? `${readinessResult.design_constraints.max_loa_m} m` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Batas Max Breadth:</span>
                          <span className="text-slate-200">
                            {readinessResult.design_constraints.max_breadth_m ? `${readinessResult.design_constraints.max_breadth_m} m` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tipe Constraint Draft:</span>
                          <span className="text-slate-200">{readinessResult.design_constraints.draft_constraint_type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 6: AI REQUIREMENTS ASSISTANT */}
          {activeTab === "ai" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Interface Column */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[500px]">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center flex-shrink-0">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Cpu size={16} className="text-blue-500" />
                    <span>AI Requirements Assistant</span>
                  </h3>
                  <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-semibold text-slate-300"
                  >
                    <option value="PARAMETER_EXPLAINER">Parameter Explainer</option>
                    <option value="VALIDATION_EXPLAINER">Validation Explainer</option>
                    <option value="COMPLETENESS_ASSISTANT">Completeness Checker</option>
                    <option value="CHANGE_IMPACT_EXPLAINER">Change Impact Explainer</option>
                    <option value="SUMMARY_ASSISTANT">Summary Assistant</option>
                  </select>
                </div>

                {/* Section Explanation Presets */}
                <div className="space-y-2 border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 block">
                    Pilih Section untuk Penjelasan Lengkap (Auto-Briefing):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "📌 Section 1 — Data Pokok Proyek", query: "Beri penjelasan lengkap mengenai Section 1 Data Pokok Proyek (Target DWT, Kecepatan Dinas V, Tipe Kapal, dan Kondisi Air)" },
                      { label: "🚢 Section 2 — Misi & Tipe Kapal (Rute & Jarak Leg S)", query: "Beri penjelasan lengkap mengenai Section 2 Misi & Tipe Kapal (Rute Pelabuhan Singgah, Jarak Leg Terjauh S, dan Total Rute)" },
                      { label: "🌊 Section 3 — Pembatasan & Kondisi Perairan", query: "Beri penjelasan lengkap mengenai Section 3 Pembatasan Perairan (Draft Limit dan Densitas Air)" },
                      { label: "⚙️ Section 4 — Operasional & Daya Jelajah", query: "Beri penjelasan lengkap mengenai Section 4 Operasional (Endurance Days dan Kebutuhan Bahan Bakar)" },
                      { label: "⚠️ Section 5 — Analisis Validasi & Baseline", query: "Beri penjelasan lengkap mengenai Section 5 Analisis Validasi & Kelengkapan Baseline" }
                    ].map((preset, pidx) => (
                      <button
                        key={pidx}
                        onClick={async () => {
                          if (!activeRevision || aiLoading) return;
                          setAiChat((prev) => [...prev, { sender: "user", text: preset.label }]);
                          setAiLoading(true);
                          try {
                            const res = await api.askAI(projectId, {
                              question: preset.query,
                              mode: "SECTION_EXPLAINER",
                              revision_id: activeRevision.revision_id
                            });
                            setAiChat((prev) => [...prev, { sender: "ai", text: res.answer, blocked: res.safety_blocked }]);
                          } catch (err: any) {
                            setAiChat((prev) => [...prev, { sender: "ai", text: `Gagal memuat penjelasan section: ${err.message}` }]);
                          } finally {
                            setAiLoading(false);
                          }
                        }}
                        disabled={aiLoading}
                        className="py-1.5 px-3 bg-slate-950/80 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-cyan-300 rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-left"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dialog Chat Window */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                  {aiChat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 p-6">
                      <HelpCircle size={32} className="text-blue-500/60 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-white">Asisten Penjelas Section & Parameter AI</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                          Klik salah satu tombol <span className="text-cyan-400 font-semibold font-mono">Pilih Section</span> di atas untuk mendapatkan rincian parameter (Target DWT, Speed V, Jarak Leg S, dll). Setelah itu Anda dapat mengajukan pertanyaan lanjutan!
                        </p>
                      </div>
                    </div>
                  ) : (
                    aiChat.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col space-y-1 max-w-[90%] ${
                          msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">
                          {msg.sender === "user" ? "Perancang" : "AI Assistant"}
                        </span>
                        <div
                          className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : msg.blocked
                              ? "bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-none"
                              : "bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none space-y-2"
                          }`}
                        >
                          {msg.text.split("\n").filter(l => l.trim() !== "").map((line, lidx) => {
                            const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            if (line.startsWith("# ")) return <h1 key={lidx} className="text-sm font-bold text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("# ", "") }} />;
                            if (line.startsWith("## ")) return <h2 key={lidx} className="text-xs font-bold text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("## ", "") }} />;
                            if (line.startsWith("### ")) return <h3 key={lidx} className="text-xs font-semibold text-slate-100 mt-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("### ", "") }} />;
                            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                              return (
                                <div key={lidx} className="flex items-start space-x-2 pl-2 my-0.5">
                                  <span className="text-cyan-400 font-bold">•</span>
                                  <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, "") }} />
                                </div>
                              );
                            }
                            return <p key={lidx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                          })}
                        </div>
                      </div>
                    ))
                  )}
                  {aiLoading && (
                    <div className="flex items-center space-x-2 text-slate-500 text-xs">
                      <RefreshCw size={12} className="animate-spin" />
                      <span>AI sedang berpikir...</span>
                    </div>
                  )}
                </div>

                {/* Question Input Form */}
                <form onSubmit={handleAskAI} className="border-t border-slate-800 pt-3 flex gap-2 flex-shrink-0">
                  <input
                    type="text"
                    required
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ketik pertanyaan Anda di sini..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Send size={14} />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </div>

              {/* Safety Disclaimers Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Info size={14} className="text-blue-400" />
                    <span>AI Safety Disclaimers</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    AI membantu menjelaskan data dan temuan validasi. AI tidak melakukan approval dan tidak menggantikan perhitungan teknik atau verifikasi engineer.
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-green-400 uppercase block mb-1.5">Allowed Actions</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                      <li>Menjelaskan arti parameter kargo</li>
                      <li>Menjelaskan warning validasi</li>
                      <li>Menganalisis kelengkapan draf</li>
                      <li>Mendeskripsikan rute pelayaran</li>
                    </ul>
                  </div>

                  <div className="border-t border-slate-850 pt-3">
                    <span className="text-[10px] font-bold text-red-400 uppercase block mb-1.5">Forbidden Actions</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                      <li>Menghitung LOA/Breadth/Draft lambung</li>
                      <li>Menghasilkan estimasi Cb/Displacement</li>
                      <li>Menghitung kW daya mesin utama</li>
                      <li>Melakukan approval baseline otomatis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
