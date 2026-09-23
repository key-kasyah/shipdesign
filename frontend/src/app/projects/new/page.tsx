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
import { VesselType, formatVesselType } from "../../../types";

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
        aria-expanded={open}
        className="w-full flex items-center justify-between bg-surface-inset border border-border-default rounded px-3 py-2 text-sm text-text-primary hover:border-border-default transition-colors text-left"
      >
        <span className="min-w-0 whitespace-normal break-words">
          {selectedPort ? `${selectedPort.port_name} (${selectedPort.province})` : (language === "en" ? "Select Port..." : "Pilih Pelabuhan...")}
        </span>
        <ChevronDown size={14} className={`text-text-secondary transition-transform duration-150 ${open ? "rotate-180" : ""} `} />
      </button>

      {/* Downward Dropdown Menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface-elevated border border-border-default rounded-lg shadow-[var(--shadow-overlay)] overflow-hidden flex flex-col p-2 space-y-2">
          {/* Search Box inside dropdown */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              placeholder={language === "en" ? "Search port / province name..." : "Cari nama pelabuhan / provinsi..."}
              aria-label={language === "en" ? "Search port or province" : "Cari pelabuhan atau provinsi"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-inset border border-border-default rounded pl-8 pr-2.5 py-1.5 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default"
              autoFocus
            />
          </div>

          {/* Scrollable list options opening downwards */}
          <div tabIndex={0} role="region" aria-label="Scrollable project data" className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredPorts.length === 0 ? (
              <div className="p-3 text-xs text-text-secondary text-center">{language === "en" ? "Port not found" : "Pelabuhan tidak ditemukan"}</div>
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
                  className={`w-full text-left px-2.5 py-1.5 text-sm rounded transition-colors flex items-center justify-between ${p.port_id === selectedPortId
                    ? "bg-surface-selected text-accent-primary font-semibold border border-border-default"
                    : "text-text-primary hover:bg-surface-secondary hover:text-text-primary"
                    } `}
                >
                  <span>{p.port_name} <span className="text-xs text-text-secondary">({p.province})</span></span>
                  {p.port_id === selectedPortId && <Check size={12} className="text-accent-primary" />}
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
    <div ref={topRef} className="atelier-page max-w-[1120px] space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center space-x-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}</span>
        </button>
      </div>

      {isSuccess ? (
        /* Success Screen */
        <div role="status" className="bg-surface-primary border border-border-subtle rounded-lg p-6 md:p-8 space-y-6">
          <div className="flex">
            <div className="text-status-success">
              <CheckCircle2 size={32} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="atelier-page-title text-text-primary">{language === "en" ? "Project Initialization Successful!" : "Inisialisasi Proyek Berhasil!"}</h1>
            <p className="text-text-secondary text-sm max-w-[72ch]">
              {language === "en" ? "New project" : "Proyek baru"} <span className="text-text-primary font-mono font-semibold">{createdProjectId}</span> ({projectName}) {language === "en" ? "has been registered to the system database." : "telah berhasil didaftarkan ke sistem database."}
            </p>
          </div>

          {/* Project Summary Card */}
          <div className="border-y border-border-default py-6 text-sm space-y-4">
            <div className="flex items-center space-x-2 text-accent-primary font-semibold border-b border-border-default pb-2">
              <Ship size={14} />
              <span>{language === "en" ? "Parameter Initialization Summary" : "Ringkasan Inisialisasi Parameter"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-text-primary break-words">
              <div><span className="text-text-secondary">Project ID:</span> <span className="font-mono">{createdProjectId}</span></div>
              <div><span className="text-text-secondary">{language === "en" ? "Project Name:" : "Nama Proyek:"}</span> {projectName}</div>
              <div><span className="text-text-secondary">Owner:</span> {owner}</div>
              <div><span className="text-text-secondary">{language === "en" ? "Vessel Type:" : "Tipe Kapal:"}</span> {formatVesselType(vesselType)}</div>
              <div><span className="text-text-secondary">Target DWT:</span> {targetDwt} Ton</div>
              <div><span className="text-text-secondary">V ({language === "en" ? "Service Speed" : "Kecepatan"}):</span> {serviceSpeed} knot</div>
              <div className="sm:col-span-2">
                <span className="text-text-secondary">{language === "en" ? "Voyage Route:" : "Trayek Pelayaran:"}</span> {routeName || "-"}
              </div>
              <div className="sm:col-span-2">
                <span className="text-text-secondary">{language === "en" ? "Max Leg Distance S:" : "Jarak Terjauh S (Leg Terjauh):"}</span> <span className="text-status-success font-semibold">{routeDistance} seamiles</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => router.push("/projects")}
              className="px-5 py-2.5 bg-surface-secondary hover:bg-surface-secondary text-text-primary text-sm font-semibold rounded-md transition-colors cursor-pointer"
            >
              {language === "en" ? "Back to Projects List" : "Kembali ke Daftar Proyek"}
            </button>
            <button
              onClick={() => router.push(`/projects/${createdProjectId}`)}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-accent-primary hover:bg-accent-hover text-on-accent text-sm font-semibold rounded-md transition-colors cursor-pointer"
            >
              <span>{language === "en" ? "Open Stage 1 (Requirements)" : "Buka Tahap 1 (Requirements)"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Initiation Form */
        <div className="bg-surface-primary border border-border-subtle rounded-lg p-5 sm:p-6 space-y-8">
          <div className="border-b border-border-default pb-4">
            <h1 className="atelier-page-title text-text-primary">{t("badge.new_project", "Inisialisasi Proyek Baru")}</h1>
            <p className="text-text-secondary text-sm mt-1">
              {language === "en" ? "Fill in project metadata and select port voyage stops to calculate leg distance automatically." : "Isi data identitas dan pilih rute pelayaran pelabuhan untuk menghitung parameter jarak secara otomatis."}
            </p>
          </div>

          {error && (
            <div
              ref={errorRef}
              id="new-project-error"
              role="alert"
              className="bg-status-danger-subtle border border-status-danger-border text-status-danger text-sm px-4 py-3.5 rounded-md flex items-center space-x-3"
            >
              <AlertCircle size={20} className="text-status-danger shrink-0" />
              <div>
                <p className="font-semibold text-status-danger text-sm">{language === "en" ? "Project Initialization Failed!" : "Gagal Menginisialisasi Proyek!"}</p>
                <p className="text-xs text-status-danger">{error}</p>
              </div>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-8" aria-busy={loading}>
            {/* SECTION 1: IDENTITAS PROYEK */}
            <div className="space-y-4">
              <h3 className="text-lg leading-[26px] font-semibold text-text-primary">
                {language === "en" ? "Section 1 — Project Identity & Owner" : "Section 1 — Identitas & Pemilik Proyek"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">Project ID</label>
                  <div className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-sm text-accent-primary font-mono font-semibold">
                    {projectId || "PRJ-2026-..."}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">{language === "en" ? "Project Name *" : "Nama Proyek *"}</label>
                  <input aria-label={language === "en" ? "Project Name *" : "Nama Proyek *"}
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (fieldErrors.projectName) setFieldErrors((prev) => ({ ...prev, projectName: false }));
                    }}
                    placeholder={language === "en" ? "e.g. KM Mandiri Utama" : "Contoh: KM Mandiri Utama"}
                    className={`w-full bg-surface-inset border rounded-md px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                      fieldErrors.projectName
                        ? "border-status-danger-border ring-2 ring-status-danger bg-status-danger-subtle"
                        : "border-border-default focus:border-border-default"
                    } `}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">{language === "en" ? "Owner / Shipowner *" : "Owner / Pemilik *"}</label>
                  <input aria-label={language === "en" ? "Owner / Shipowner *" : "Owner / Pemilik *"}
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => {
                      setOwner(e.target.value);
                      if (fieldErrors.owner) setFieldErrors((prev) => ({ ...prev, owner: false }));
                    }}
                    placeholder={language === "en" ? "e.g. PT Pelayaran Nusantara" : "Contoh: PT Pelayaran Nusantara"}
                    className={`w-full bg-surface-inset border rounded-md px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                      fieldErrors.owner
                        ? "border-status-danger-border ring-2 ring-status-danger bg-status-danger-subtle"
                        : "border-border-default focus:border-border-default"
                    } `}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">{language === "en" ? "Organization / Institution" : "Organisasi / Kampus"}</label>
                  <input aria-label={language === "en" ? "Organization / Institution" : "Organisasi / Kampus"}
                    type="text"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder={language === "en" ? "e.g. ITS Surabaya" : "Contoh: ITS Surabaya"}
                    className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-secondary block">{language === "en" ? "Creator Email *" : "Aktor Pembuat *"}</label>
                <input aria-label={language === "en" ? "Creator Email *" : "Aktor Pembuat *"}
                  type="email"
                  required
                  value={creator}
                  onChange={(e) => {
                    setCreator(e.target.value);
                    if (fieldErrors.creator) setFieldErrors((prev) => ({ ...prev, creator: false }));
                  }}
                  placeholder="designer@ship.com"
                  className={`w-full bg-surface-inset border rounded-md px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                    fieldErrors.creator
                      ? "border-status-danger-border ring-2 ring-status-danger bg-status-danger-subtle"
                      : "border-border-default focus:border-border-default"
                  } `}
                />
              </div>
            </div>

            {/* SECTION 2: PARAMETER UTAMA KAPAL & RUTE PELABUHAN */}
            <div className="space-y-6 pt-8 border-t border-border-default">
              <div className="flex items-center space-x-2">
                <Ship size={16} className="text-accent-primary" />
                <h3 className="text-lg leading-[26px] font-semibold text-text-primary">
                  {language === "en" ? "Section 2 — Vessel Key Parameters & Port Route" : "Section 2 — Parameter Utama Kapal & Rute Pelabuhan"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipe Kapal */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">{language === "en" ? "Vessel Type *" : "Tipe Kapal *"}</label>
                  <select aria-label={language === "en" ? "Vessel Type *" : "Tipe Kapal *"}
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default cursor-pointer"
                  >
                    {Object.values(VesselType).map((t) => (
                      <option key={t} value={t}>
                        {formatVesselType(t)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DWT */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-text-secondary block">DWT (Deadweight Tonnage) *</label>
                  <div className="flex items-center bg-surface-inset border border-border-default rounded-md overflow-hidden focus-within:border-border-default">
                    <input aria-label={["DWT (Deadweight Tonnage) *"].join(" ")}
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={targetDwt}
                      onChange={(e) => setTargetDwt(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      placeholder="3910"
                      className="w-full bg-transparent border-none px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    />
                    <span className="bg-surface-secondary text-text-secondary px-3 py-2 text-sm font-semibold border-l border-border-default">
                      Ton
                    </span>
                  </div>
                </div>
              </div>

              {/* V (Kecepatan) */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-secondary block">V ({language === "en" ? "Service Speed" : "Kecepatan Dinas"}) *</label>
                <div className="flex items-center bg-surface-inset border border-border-default rounded-md overflow-hidden focus-within:border-border-default max-w-none sm:max-w-[calc(50%-8px)]">
                  <input aria-label={["V (",String(language === "en" ? "Service Speed" : "Kecepatan Dinas"),") *"].join(" ")}
                    type="number"
                    required
                    min={0.1}
                    step={0.1}
                    value={serviceSpeed}
                    onChange={(e) => setServiceSpeed(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="12"
                    className="w-full bg-transparent border-none px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  />
                  <span className="bg-surface-secondary text-text-secondary px-3 py-2 text-sm font-semibold border-l border-border-default">
                    knot
                  </span>
                </div>
              </div>

              {/* DYNAMIC MULTI-STOP ROUTE BUILDER */}
              <div className="border-t border-border-default pt-8 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border-default pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-accent-primary" />
                    <span className="text-lg leading-[26px] font-semibold text-text-primary">
                      {language === "en" ? "Port Stops Selection & Max Leg Calculation (S)" : "Pemilihan Pelabuhan Singgah & Hitung Jarak Terjauh (S)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPortStop}
                    className="flex items-center space-x-1 bg-surface-selected hover:bg-surface-selected text-accent-primary border border-border-default px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{language === "en" ? "Add Port Stop" : "Tambah Pelabuhan"}</span>
                  </button>
                </div>

                <p className="text-xs text-text-secondary">
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
                      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 bg-surface-primary border p-3 rounded-md transition-colors ${draggedIndex === idx ? "opacity-40 border-border-default border-dashed" : "border-border-default hover:border-border-default"
                        } `}
                    >
                      <div className="flex items-center space-x-1.5 cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary select-none shrink-0" title="Drag to reorder">
                        <GripVertical size={16} />
                        <span className="w-6 h-6 bg-surface-secondary text-text-primary rounded-sm flex items-center justify-center text-sm font-medium font-mono">
                          {idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <PortDropdown
                          ports={portsList}
                          selectedPortId={portId}
                          onChange={(newId) => handlePortChange(idx, newId)}
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 select-none ml-auto">
                        <button aria-label={language === "en" ? "Move Up" : "Geser ke Atas"}
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePortStop(idx, idx - 1)}
                          className="atelier-icon-button text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title={language === "en" ? "Move Up" : "Geser ke Atas"}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button aria-label={language === "en" ? "Move Down" : "Geser ke Bawah"}
                          type="button"
                          disabled={idx === selectedPortIds.length - 1}
                          onClick={() => movePortStop(idx, idx + 1)}
                          className="atelier-icon-button text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title={language === "en" ? "Move Down" : "Geser ke Bawah"}
                        >
                          <ArrowDown size={14} />
                        </button>
                        {selectedPortIds.length > 2 && (
                          <button aria-label={language === "en" ? "Remove Port" : "Hapus Pelabuhan"}
                            type="button"
                            onClick={() => handleRemovePortStop(idx)}
                            className="atelier-icon-button text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle rounded transition-colors cursor-pointer"
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
                  <div className="bg-surface-primary border border-border-default rounded-md p-4 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-3 text-sm border-b border-border-default pb-2">
                      <span className="font-semibold text-text-primary">{language === "en" ? "Route:" : "Rute:"} <span className="text-text-primary font-medium">{routeCalcResult.route_name}</span></span>
                      <span className="text-text-secondary font-mono">
                        {routeCalcResult.legs.length} {language === "en" ? "Voyage Legs" : "Segmen Pelayaran"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {routeCalcResult.legs.map((leg: any, i: number) => (
                        <div key={i} className="flex flex-wrap justify-between items-center gap-3 text-text-primary">
                          <span className="flex items-center space-x-1.5">
                            <Navigation size={12} className="text-text-secondary" />
                            <span>{leg.origin_name.split("(")[0].trim()} ➔ {leg.destination_name.split("(")[0].trim()}</span>
                          </span>
                          <span className="font-mono font-medium text-text-primary">{leg.distance_nm} seamiles</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-border-default grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-surface-selected border border-border-default p-2.5 rounded-md flex justify-between items-center">
                        <span className="text-accent-primary font-medium">{language === "en" ? "Longest Leg (S):" : "Jarak Terjauh (S):"}</span>
                        <span className="text-sm font-semibold text-accent-primary font-mono">
                          {routeCalcResult.max_leg_nm} seamiles
                        </span>
                      </div>
                      <div className="bg-surface-inset border border-border-default p-2.5 rounded-md flex justify-between items-center">
                        <span className="text-text-secondary font-medium">{language === "en" ? "Total Voyage Distance:" : "Total Rute Jelajah:"}</span>
                        <span className="text-sm font-semibold text-text-primary font-mono">
                          {routeCalcResult.total_distance_nm} seamiles
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-border-default flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/projects")}
                className="atelier-button atelier-button-secondary"
              >
                {t("action.cancel", "Batal")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="atelier-button atelier-button-primary disabled:opacity-50"
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
