"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  Ship,
  ArrowRight,
  MapPin,
  Plus,
  Trash2,
  Navigation,
  ChevronDown,
  Search,
  Check,
  GripVertical,
  ArrowUp,
  ArrowDown,
  AlertCircle
} from "lucide-react";
import { api } from "../../../services/api";
import { VesselType } from "../../../types";

import { useLanguage } from "../../../context/LanguageContext";

interface Port {
  port_id: number;
  port_code: string;
  port_name: string;
  province: string;
  latitude: number;
  longitude: number;
  operator: string;
  port_type: string;
}

/* Custom Port Dropdown component that ALWAYS opens DOWNWARDS */
function PortDropdown({
  ports,
  selectedPortId,
  onChange,
}: {
  ports: Port[];
  selectedPortId: number;
  onChange: (id: number) => void;
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white hover:border-blue-500 transition-colors text-left"
      >
        <span className="truncate">
          {selectedPort ? `${selectedPort.port_name} (${selectedPort.province})` : (language === "en" ? "Select Port..." : "Pilih Pelabuhan...")}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Downward Dropdown Menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col p-2 space-y-2">
          {/* Search Box inside dropdown */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={language === "en" ? "Search port / province name..." : "Cari nama pelabuhan / provinsi..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Scrollable list options opening downwards */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredPorts.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500 text-center">{language === "en" ? "Port not found" : "Pelabuhan tidak ditemukan"}</div>
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
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between ${p.port_id === selectedPortId
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

export default function NewProject() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [owner, setOwner] = useState("");
  const [org, setOrg] = useState("");
  const [creator, setCreator] = useState("designer@ship.com");

  useEffect(() => {
    const year = new Date().getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setProjectId(`PRJ-${year}-${randNum}`);
  }, []);

  const [vesselType, setVesselType] = useState<string>("GENERAL_CARGO");
  const [targetDwt, setTargetDwt] = useState<number | "">(3910);
  const [serviceSpeed, setServiceSpeed] = useState<number | "">(12);

  const [portsList, setPortsList] = useState<Port[]>([]);
  const [selectedPortIds, setSelectedPortIds] = useState<number[]>([1, 3, 4]);
  const [routeCalcResult, setRouteCalcResult] = useState<any>(null);
  const [isCalcLoading, setIsCalcLoading] = useState(false);

  const [routeName, setRouteName] = useState<string>("Jakarta - Makassar - Manokwari");
  const [routeDistance, setRouteDistance] = useState<number | "">(2156);
  const [manualOverride, setManualOverride] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState("");

  const topRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const projectIdInputRef = useRef<HTMLInputElement>(null);

  const scrollToTop = () => {
    const mainEl = topRef.current?.closest("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (error) {
      setTimeout(() => {
        scrollToTop();
        if (fieldErrors.projectId && projectIdInputRef.current) {
          projectIdInputRef.current.focus({ preventScroll: true });
          projectIdInputRef.current.select();
        }
      }, 50);
    }
  }, [error, fieldErrors.projectId]);

  useEffect(() => {
    async function loadPorts() {
      try {
        const ports = await api.getPorts();
        setPortsList(ports);
      } catch (err) {
        console.error("Gagal memuat database pelabuhan:", err);
      }
    }
    loadPorts();
  }, []);

  useEffect(() => {
    if (selectedPortIds.length < 2) return;
    async function updateRouteCalculation() {
      setIsCalcLoading(true);
      try {
        const res = await api.calculateRoute(selectedPortIds);
        setRouteCalcResult(res);
        if (!manualOverride) {
          setRouteName(res.route_name);
          setRouteDistance(res.max_leg_nm);
        }
      } catch (err) {
        console.error("Gagal kalkulasi rute pelabuhan:", err);
      } finally {
        setIsCalcLoading(false);
      }
    }
    updateRouteCalculation();
  }, [selectedPortIds, manualOverride]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const movePortStop = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedPortIds.length) return;
    const updated = [...selectedPortIds];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSelectedPortIds(updated);
  };

  const handleAddPortStop = () => {
    const lastId = selectedPortIds[selectedPortIds.length - 1];
    const nextPort = portsList.find((p) => p.port_id !== lastId) || portsList[0];
    if (nextPort) {
      setSelectedPortIds([...selectedPortIds, nextPort.port_id]);
    }
  };

  const handleRemovePortStop = (index: number) => {
    if (selectedPortIds.length <= 2) {
      alert(language === "en" ? "A voyage route requires at least 2 ports." : "Minimal rute pelayaran memerlukan 2 pelabuhan.");
      return;
    }
    const updated = selectedPortIds.filter((_, i) => i !== index);
    setSelectedPortIds(updated);
  };

  const handlePortChange = (index: number, newPortId: number) => {
    const updated = [...selectedPortIds];
    updated[index] = newPortId;
    setSelectedPortIds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newFieldErrors: { [key: string]: boolean } = {};
    if (!projectName.trim()) newFieldErrors.projectName = true;
    if (!owner.trim()) newFieldErrors.owner = true;
    if (!creator.trim()) newFieldErrors.creator = true;

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(language === "en" ? "All mandatory (*) identity fields highlighted in red must be filled." : "Seluruh field identitas wajib (*) yang ditandai merah harus diisi.");
      setTimeout(scrollToTop, 50);
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const year = new Date().getFullYear();
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const finalId = projectId.trim() || `PRJ-${year}-${randNum}`;
      await api.createProject({
        project_id: finalId,
        project_name: projectName.trim(),
        owner: owner.trim(),
        organization: org.trim() || undefined,
        creator: creator.trim(),
        vessel_type: vesselType,
        target_dwt_ton: typeof targetDwt === "number" ? targetDwt : undefined,
        service_speed_knots: typeof serviceSpeed === "number" ? serviceSpeed : undefined,
        route_name: routeName.trim() || undefined,
        route_distance_nm: typeof routeDistance === "number" ? routeDistance : undefined,
      });

      setCreatedProjectId(finalId);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || (language === "en" ? "Failed to create project." : "Gagal membuat proyek."));
      if (err.message && (err.message.toLowerCase().includes("sudah ada") || err.message.toLowerCase().includes("project_id"))) {
        setFieldErrors((prev) => ({ ...prev, projectId: true }));
      }
      setTimeout(scrollToTop, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={topRef} className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}</span>
        </button>
      </div>

      {isSuccess ? (
        /* Success Screen */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400">
              <CheckCircle2 size={32} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">{language === "en" ? "Project Initialization Successful!" : "Inisialisasi Proyek Berhasil!"}</h2>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              {language === "en" ? "New project" : "Proyek baru"} <span className="text-white font-mono font-semibold">{createdProjectId}</span> ({projectName}) {language === "en" ? "has been registered to the system database." : "telah berhasil didaftarkan ke sistem database."}
            </p>
          </div>

          {/* Project Summary Card */}
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 text-left text-xs space-y-3 max-w-lg mx-auto">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold border-b border-slate-800 pb-2">
              <Ship size={14} />
              <span>{language === "en" ? "Parameter Initialization Summary" : "Ringkasan Inisialisasi Parameter"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div><span className="text-slate-500">Project ID:</span> <span className="font-mono">{createdProjectId}</span></div>
              <div><span className="text-slate-500">{language === "en" ? "Project Name:" : "Nama Proyek:"}</span> {projectName}</div>
              <div><span className="text-slate-500">Owner:</span> {owner}</div>
              <div><span className="text-slate-500">{language === "en" ? "Vessel Type:" : "Tipe Kapal:"}</span> {vesselType}</div>
              <div><span className="text-slate-500">Target DWT:</span> {targetDwt} Ton</div>
              <div><span className="text-slate-500">V ({language === "en" ? "Service Speed" : "Kecepatan"}):</span> {serviceSpeed} knot</div>
              <div className="col-span-2">
                <span className="text-slate-500">{language === "en" ? "Voyage Route:" : "Trayek Pelayaran:"}</span> {routeName || "-"}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">{language === "en" ? "Max Leg Distance S:" : "Jarak Terjauh S (Leg Terjauh):"}</span> <span className="text-green-400 font-bold">{routeDistance} seamiles</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              onClick={() => router.push("/projects")}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}
            </button>
            <button
              onClick={() => router.push(`/projects/${createdProjectId}`)}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <span>{language === "en" ? "Open Stage 1 (Requirements)" : "Buka Tahap 1 (Requirements)"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Initiation Form */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">{t("badge.new_project", "Inisialisasi Proyek Baru")}</h2>
            <p className="text-slate-400 text-xs mt-1">
              {language === "en" ? "Fill in project metadata and select port voyage stops to calculate leg distance automatically." : "Isi data identitas dan pilih rute pelayaran pelabuhan untuk menghitung parameter jarak secara otomatis."}
            </p>
          </div>

          {error && (
            <div
              ref={errorRef}
              className="bg-red-500/15 border-2 border-red-500/50 text-red-300 text-xs px-4 py-3.5 rounded-xl flex items-center space-x-3 shadow-xl animate-pulse"
            >
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-red-200 text-xs">{language === "en" ? "Project Initialization Failed!" : "Gagal Menginisialisasi Proyek!"}</p>
                <p className="text-[11px] text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: IDENTITAS PROYEK */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {language === "en" ? "Section 1 — Project Identity & Owner" : "Section 1 — Identitas & Pemilik Proyek"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">Project ID</label>
                  <div className="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-400 font-mono font-bold shadow-inner">
                    {projectId || "PRJ-2026-..."}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">{language === "en" ? "Project Name *" : "Nama Proyek *"}</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (fieldErrors.projectName) setFieldErrors((prev) => ({ ...prev, projectName: false }));
                    }}
                    placeholder={language === "en" ? "e.g. KM Mandiri Utama" : "Contoh: KM Mandiri Utama"}
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                      fieldErrors.projectName
                        ? "border-red-500 ring-2 ring-red-500/30 bg-red-950/10"
                        : "border-slate-800 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">{language === "en" ? "Owner / Shipowner *" : "Owner / Pemilik *"}</label>
                  <input
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => {
                      setOwner(e.target.value);
                      if (fieldErrors.owner) setFieldErrors((prev) => ({ ...prev, owner: false }));
                    }}
                    placeholder={language === "en" ? "e.g. PT Pelayaran Nusantara" : "Contoh: PT Pelayaran Nusantara"}
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                      fieldErrors.owner
                        ? "border-red-500 ring-2 ring-red-500/30 bg-red-950/10"
                        : "border-slate-800 focus:border-blue-500"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">{language === "en" ? "Organization / Institution" : "Organisasi / Kampus"}</label>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder={language === "en" ? "e.g. ITS Surabaya" : "Contoh: ITS Surabaya"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 block">{language === "en" ? "Creator Email *" : "Aktor Pembuat *"}</label>
                <input
                  type="email"
                  required
                  value={creator}
                  onChange={(e) => {
                    setCreator(e.target.value);
                    if (fieldErrors.creator) setFieldErrors((prev) => ({ ...prev, creator: false }));
                  }}
                  placeholder="designer@ship.com"
                  className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                    fieldErrors.creator
                      ? "border-red-500 ring-2 ring-red-500/30 bg-red-950/10"
                      : "border-slate-800 focus:border-blue-500"
                  }`}
                />
              </div>
            </div>

            {/* SECTION 2: PARAMETER UTAMA KAPAL & RUTE PELABUHAN */}
            <div className="space-y-5 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <Ship size={16} className="text-blue-400" />
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  {language === "en" ? "Section 2 — Vessel Key Parameters & Port Route" : "Section 2 — Parameter Utama Kapal & Rute Pelabuhan"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipe Kapal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">{language === "en" ? "Vessel Type *" : "Tipe Kapal *"}</label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {Object.values(VesselType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DWT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-350 block">DWT (Deadweight Tonnage) *</label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500">
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={targetDwt}
                      onChange={(e) => setTargetDwt(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      placeholder="3910"
                      className="w-full bg-transparent border-none px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="bg-slate-850 text-slate-400 px-3 py-2 text-xs font-semibold border-l border-slate-800">
                      Ton
                    </span>
                  </div>
                </div>
              </div>

              {/* V (Kecepatan) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 block">V ({language === "en" ? "Service Speed" : "Kecepatan Dinas"}) *</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-blue-500 max-w-xs">
                  <input
                    type="number"
                    required
                    min={0.1}
                    step={0.1}
                    value={serviceSpeed}
                    onChange={(e) => setServiceSpeed(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="12"
                    className="w-full bg-transparent border-none px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <span className="bg-slate-850 text-slate-400 px-3 py-2 text-xs font-semibold border-l border-slate-800">
                    knot
                  </span>
                </div>
              </div>

              {/* DYNAMIC MULTI-STOP ROUTE BUILDER */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {language === "en" ? "Port Stops Selection & Max Leg Calculation (S)" : "Pemilihan Pelabuhan Singgah & Hitung Jarak Terjauh (S)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPortStop}
                    className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{language === "en" ? "Add Port Stop" : "Tambah Pelabuhan"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  {language === "en"
                    ? "Select port sequence. The system will automatically compute leg distances and take the longest leg distance (S) from the ports database."
                    : "Pilih urutan pelabuhan singgah. Sistem akan menghitung jarak maritim (seamiles) antar segmen dan mengambil jarak leg terjauh (S) secara otomatis dari database pelabuhan."}
                </p>

                {/* Ports Selection List */}
                <div className="space-y-3">
                  {selectedPortIds.map((portId, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => setDraggedIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedIndex !== null && draggedIndex !== idx) {
                          movePortStop(draggedIndex, idx);
                          setDraggedIndex(null);
                        }
                      }}
                      className={`flex items-center space-x-2.5 bg-slate-900 border p-2.5 rounded-lg transition-all ${draggedIndex === idx ? "opacity-40 border-blue-500 border-dashed" : "border-slate-800 hover:border-slate-700"
                        }`}
                    >
                      <div className="flex items-center space-x-1.5 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 select-none shrink-0" title="Drag to reorder">
                        <GripVertical size={16} />
                        <span className="w-6 h-6 bg-slate-800 text-slate-300 rounded-full flex items-center justify-center text-xs font-bold font-mono">
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

                      <div className="flex items-center space-x-1 shrink-0 select-none">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePortStop(idx, idx - 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title={language === "en" ? "Move Up" : "Geser ke Atas"}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedPortIds.length - 1}
                          onClick={() => movePortStop(idx, idx + 1)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title={language === "en" ? "Move Down" : "Geser ke Bawah"}
                        >
                          <ArrowDown size={14} />
                        </button>
                        {selectedPortIds.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePortStop(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title={language === "en" ? "Remove Port" : "Hapus Pelabuhan"}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Card */}
                {routeCalcResult && (
                  <div className="bg-slate-900/80 border border-blue-500/20 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                      <span className="font-semibold text-slate-300">{language === "en" ? "Route:" : "Rute:"} <span className="text-white font-medium">{routeCalcResult.route_name}</span></span>
                      <span className="text-slate-400 font-mono">
                        {routeCalcResult.legs.length} {language === "en" ? "Voyage Legs" : "Segmen Pelayaran"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {routeCalcResult.legs.map((leg: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-slate-300">
                          <span className="flex items-center space-x-1.5">
                            <Navigation size={12} className="text-slate-500" />
                            <span>{leg.origin_name.split("(")[0].trim()} ➔ {leg.destination_name.split("(")[0].trim()}</span>
                          </span>
                          <span className="font-mono font-medium text-slate-200">{leg.distance_nm} seamiles</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg flex justify-between items-center">
                        <span className="text-blue-300 font-medium">{language === "en" ? "Longest Leg (S):" : "Jarak Terjauh (S):"}</span>
                        <span className="text-sm font-bold text-blue-400 font-mono">
                          {routeCalcResult.max_leg_nm} seamiles
                        </span>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center">
                        <span className="text-slate-400 font-medium">{language === "en" ? "Total Voyage Distance:" : "Total Rute Jelajah:"}</span>
                        <span className="text-sm font-bold text-slate-200 font-mono">
                          {routeCalcResult.total_distance_nm} seamiles
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer text-center"
              >
                {t("action.cancel", "Batal")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <PlusCircle size={16} />
                <span>{loading ? (language === "en" ? "Saving Project..." : "Menyimpan Proyek...") : (language === "en" ? "Save & Initialize Project" : "Simpan & Inisialisasi Proyek")}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
