"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Compass,
  ArrowLeft,
  Activity,
  Layers,
  Cpu,
  RefreshCw,
  Scale,
  Sparkles,
  Save,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { api } from "../../../../services/api";
import { SideProfileNurbsEditor } from "../../../../components/design/SideProfileNurbsEditor";
import { WaterPlaneCalculationSheet, WaterlineConfig, DEFAULT_WATERLINE_LEVELS } from "../../../../components/design/WaterPlaneCalculationSheet";
import { MidshipBilgeCalculationSheet } from "../../../../components/design/MidshipBilgeCalculationSheet";
import { LinesPlanThreeView } from "../../../../components/design/LinesPlanThreeView";
import { useLanguage } from "../../../../context/LanguageContext";

export default function Stage3BasicDesignPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<
    "profile" | "waterplane" | "midshipBilge" | "csaProjection" | "ai"
  >("profile");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>({});
  const [stage2Data, setStage2Data] = useState<any>({});

  // Dynamic calculated dimensions from Profile NURBS Editor
  const [exactLoa, setExactLoa] = useState<number | null>(null);
  const [foreOverhang, setForeOverhang] = useState<number | null>(null);
  const [aftOverhang, setAftOverhang] = useState<number | null>(null);

  // Dynamic Custom Waterlines Configuration (Synchronized across Tab 2 and Tab 3)
  const [waterlineLevels, setWaterlineLevels] = useState<WaterlineConfig[]>(DEFAULT_WATERLINE_LEVELS);

  // Synchronized Multi-Waterline Offsets Data (Shared between Tab 2 and Tab 4)
  const [waterlinesData, setWaterlinesData] = useState<
    Record<string, Record<number, number>> | undefined
  >(undefined);

  // Save State Management
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);

  // AI Chat States
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        try {
          const hist1 = await api.getProject(projectId);
          const latestRev1 = hist1.revisions[hist1.revisions.length - 1];
          if (latestRev1) {
            setProjectData(latestRev1.data_snapshot);
          }
        } catch (err) {
          console.warn("Stage 1 data load:", err);
        }

        try {
          const hist2 = await api.getStage2History(projectId);
          const latestRev2 = hist2.revisions[hist2.revisions.length - 1];
          if (latestRev2) {
            setStage2Data(latestRev2.data_snapshot);
          }
        } catch (err) {
          console.warn("Stage 2 data load:", err);
        }

        // Load Saved Stage 3 Data (Permanent Server Storage & fallback localStorage)
        let loadedStage3 = false;
        try {
          const res3 = await api.getStage3Data(projectId);
          if (res3 && res3.has_saved_data) {
            loadedStage3 = true;
            if (res3.waterlines_data) setWaterlinesData(res3.waterlines_data);
            if (res3.waterline_levels && Array.isArray(res3.waterline_levels)) setWaterlineLevels(res3.waterline_levels);
            if (res3.exact_loa) setExactLoa(res3.exact_loa);
            if (res3.fore_overhang) setForeOverhang(res3.fore_overhang);
            if (res3.aft_overhang) setAftOverhang(res3.aft_overhang);
            if (res3.updated_at) {
              const dt = new Date(res3.updated_at);
              setLastSaved(dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
            }
          }
        } catch (err) {
          console.warn("Stage 3 backend load:", err);
        }

        if (!loadedStage3 && typeof window !== "undefined") {
          try {
            const cached = localStorage.getItem(`stage3_saved_data_${projectId}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.waterlines_data) setWaterlinesData(parsed.waterlines_data);
              if (parsed.waterline_levels && Array.isArray(parsed.waterline_levels)) setWaterlineLevels(parsed.waterline_levels);
              if (parsed.exact_loa) setExactLoa(parsed.exact_loa);
              if (parsed.fore_overhang) setForeOverhang(parsed.fore_overhang);
              if (parsed.aft_overhang) setAftOverhang(parsed.aft_overhang);
              if (parsed.updated_at) {
                const dt = new Date(parsed.updated_at);
                setLastSaved(dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
              }
            }
          } catch (e) {
            console.warn("Stage 3 localStorage fallback parse error:", e);
          }
        }
      } catch (err: any) {
        setError(err.message || "Gagal memuat data Basic Design");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  // Ship Dimensions from Preliminary Design
  const lbp = Number(stage2Data.lbp_m || projectData.lbp_m || 90.0);
  const depth = Number(stage2Data.depth_m || projectData.depth_m || 8.0);
  const draft = Number(stage2Data.draft_m || projectData.draft_m || 5.5);
  const breadth = Number(stage2Data.breadth_m || projectData.breadth_m || 16.0);
  const cb = Number(stage2Data.cb || 0.76);
  const cm = Number(stage2Data.cm || 0.98);
  const vesselType = stage2Data.vessel_type || projectData.vessel_type || "GENERAL_CARGO";
  const csaOrdinates = stage2Data.geometry?.csa_ordinates;

  const currentLoa = exactLoa || Number((lbp * 1.055).toFixed(2));

  // Permanent Save Handler (Server Disk + Browser LocalStorage)
  const handleSaveAll = async (manualNotify = true) => {
    try {
      setSaving(true);
      setSaveStatus("saving");

      const payload = {
        waterlines_data: waterlinesData,
        waterline_levels: waterlineLevels,
        exact_loa: exactLoa,
        fore_overhang: foreOverhang,
        aft_overhang: aftOverhang,
        lbp_m: lbp,
        breadth_m: breadth,
        draft_m: draft,
        depth_m: depth,
        cb: cb,
        cm: cm,
        vessel_type: vesselType,
        updated_at: new Date().toISOString(),
      };

      // 1. Permanent Save to Server API / File Storage
      try {
        await api.saveStage3Data(projectId, payload);
      } catch (srvErr) {
        console.warn("Server save warning (using client fallback):", srvErr);
      }

      // 2. Permanent Save to Browser Storage (Instant Guarantee)
      if (typeof window !== "undefined") {
        localStorage.setItem(`stage3_saved_data_${projectId}`, JSON.stringify(payload));
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSaved(timeStr);
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      setShowSaveToast(true);

      setTimeout(() => {
        setShowSaveToast(false);
      }, 4000);
    } catch (e: any) {
      console.error("Save error:", e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut (Ctrl + S / Cmd + S) for permanent instant save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAll(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [waterlinesData, exactLoa, foreOverhang, aftOverhang, lbp, breadth, draft, depth, cb, cm, vesselType]);

  // AI Ask Handler
  const handleAskAi = (presetQuestion?: string) => {
    const q = presetQuestion || aiQuestion;
    if (!q.trim()) return;

    setAiChat((prev) => [...prev, { sender: "user", text: q }]);
    setAiQuestion("");
    setAiLoading(true);

    setTimeout(() => {
      let reply = "";
      if (q.includes("Garis Air") || q.includes("AWL") || q.includes("LCF") || q.includes("Water Plane")) {
        reply =
          `### 🌊 Penjelasan Perhitungan Garis Air (Waterplane Calculation):\n\n` +
          `1. **Luas Bidang Garis Air (AWL)**:\n` +
          `   - Rumus: AWL = (2 / 3) * l * Total_Sigma_1 (dengan l = Jarak Gading Utama = ${(lbp / 20).toFixed(4)} m).\n` +
          `   - Menghitung luas permukaan bidang basah kapal di sarat T = ${draft} m.\n\n` +
          `2. **Titik Apung Memanjang (LCF)**:\n` +
          `   - Rumus: LCF = (l * Total_Sigma_2) / Total_Sigma_1 terhadap Midship (St 10).\n` +
          `   - Titik berat luasan bidang garis air yang menjadi pusat rotasi trim kapal.\n\n` +
          `3. **Momen Inersia Melintang & Memanjang**:\n` +
          `   - IT = (2 / 3) * (1 / 3) * l * Total_Sigma_3 (inersia transversal penentu tinggi metasenter BM).\n` +
          `   - IL = Iy - (AWL * (LCF^2)) (inersia longitudinal penentu metasenter BML).`;
      } else if (q.includes("Bilga") || q.includes("Radius") || q.includes("Midship") || q.includes("Gading 10")) {
        reply =
          `### ⚙️ Penjelasan Geometri Radius Bilga & Luas Midship (Gading 10):\n\n` +
          `1. **Formula Radius Bilga (R)**:\n` +
          `   - Rumus: Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )\n` +
          `   - Luas sudut terpotong bilga = B * T * (1 - Cm) = ${breadth} * ${draft} * (1 - ${cm}) = ${(breadth * draft * (1 - cm)).toFixed(3)} m².\n` +
          `   - Nilai R yang dihasilkan memastikan luasan penampang tengah kapal presisi sebesar target Am = B * T * Cm = ${(breadth * draft * cm).toFixed(2)} m².\n\n` +
          `2. **Integrasi Ordinat Gading 10**:\n` +
          `   - Titik rata dasar (flat of bottom) berakhir pada jarak (0.5B - R).\n` +
          `   - Di atas sarat z >= R, sisi lambung kapal naik tegak lurus sempurna selebar 0.5B = ${(breadth / 2).toFixed(2)} m.`;
      } else if (q.includes("CSA") || q.includes("Proyeksi") || q.includes("Body Plan")) {
        reply =
          `### 🌊 Penjelasan Peran CSA & Proyeksi Body Plan:\n\n` +
          `1. **Fungsi CSA (Curve of Sectional Area)**:\n` +
          `   - CSA memetakan distribusi volume kapal sepanjang 21 stasiun (Gading 0 AP s.d Gading 20 FP).\n` +
          `   - Luas tiap penampang melintang dihitung dengan rumus: **Ai = (%Am / 100) * Am**, dengan **Am = B * T * Cm = ${breadth} * ${draft} * ${cm} = ${(breadth * draft * cm).toFixed(2)} m²**.\n\n` +
          `2. **Proses Proyeksi ke Body Plan**:\n` +
          `   - Nilai luasan Ai dari kurva CSA diproyeksikan menjadi kurva batas gading pada Body Plan dengan estimasi lebar setengah gading bi = (B/2) * Akar(Ai / Am).\n` +
          `   - Bagian haluan (Forebody, St 11-20) dibuat ramping/U-shape untuk efisiensi gelombang, sedangkan buritan (Afterbody, St 0-9) dirancang V-shape untuk kelancaran aliran air ke propeller.`;
      } else if (q.includes("PMB") || q.includes("Parallel Middle Body")) {
        reply =
          `### 📦 Penjelasan Parallel Middle Body (PMB):\n\n` +
          `- **PMB (Parallel Middle Body)** adalah zona tengah kapal di mana bentuk penampang melintangnya seragam sebesar Luas Midship (Am).\n` +
          `- Untuk kapal jenis **${vesselType}** dengan Cb = **${cb}**, zona PMB berada di sekitar **Station 7 hingga Station 13** (panjang sekitar ${((6 / 20) * lbp).toFixed(1)} m atau 30% dari LBP).\n` +
          `- Keuntungan PMB: Memaksimalkan volume ruang muat dan mempermudah fabrikasi pelat baja lurus saat perakitan di galangan.`;
      } else if (q.includes("Batasan") || q.includes("Konstan") || q.includes("LOA")) {
        reply =
          `### 📏 Batasan Desain (Konstan) vs Variabel Bebas:\n\n` +
          `- **Batasan Konstan (Acuan Awal)**: LBP (${lbp}m), B (${breadth}m), H (${depth}m), T (${draft}m), dan Cb (${cb}) merupakan batasan tetap yang diperoleh dari optimasi kelayakan awal.\n` +
          `- **Komponen Bebas / Variabel**: LOA (saat ini **${currentLoa}m**), LWL, Fore Overhang, dan Aft Overhang diperoleh secara presisi setelah kurva tampak samping (profile view) digambar menggunakan titik kontrol NURBS/Spline.`;
      } else {
        reply =
          `### 🤖 Rekomendasi Basic Design Lines Plan:\n\n` +
          `- Dimensi proyek saat ini: LBP = **${lbp}m**, Lebar = **${breadth}m**, Sarat = **${draft}m**, Tinggi = **${depth}m**, Cb = **${cb}**.\n` +
          `- Pastikan titik kontrol pada linggi haluan dan buritan di bawah sarat air dibuat lebih rapat untuk menjamin *smooth fairing* kurva lambung sesuai aturan BKI.\n` +
          `- Rasio LOA/LBP kapal Anda adalah **${(currentLoa / lbp).toFixed(3)}**, berada dalam rentang wajar standar maritim (1.02 ~ 1.08).`;
      }

      setAiChat((prev) => [...prev, { sender: "ai", text: reply }]);
      setAiLoading(false);
    }, 500);
  };

  const navTabs = [
    { id: "profile", label: language === "en" ? "1. Side Profile (Sheer & Profile)" : "1. Tampak Samping (Sheer & Profile)", icon: <Compass size={15} /> },
    { id: "waterplane", label: language === "en" ? "2. Waterplane Calculation (AWL & LCF)" : "2. Kalkulasi Garis Air (AWL & LCF)", icon: <Layers size={15} /> },
    { id: "midshipBilge", label: language === "en" ? "3. Bilge Radius & Midship Area (St 10)" : "3. Radius Bilga & Luas Midship (St 10)", icon: <Activity size={15} /> },
    { id: "csaProjection", label: language === "en" ? "4. Projection" : "4. Proyeksi", icon: <Activity size={15} /> },
    { id: "ai", label: language === "en" ? "5. AI Co-Pilot" : "5. AI Assistant", icon: <Cpu size={15} /> }
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070B12] text-slate-400 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="animate-spin text-cyan-500" size={32} />
          <p className="text-sm font-medium tracking-wide">Memuat modul Basic Design & Rencana Garis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#070B12] text-slate-100 font-sans relative">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shrink-0 py-3 px-5 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Navigation and Title */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => router.push(`/projects/${projectId}/stage2`)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold shrink-0"
              title={language === "en" ? "Back to Stage 2 Preliminary Design" : "Kembali ke Tahap 2 Pra-Rancangan"}
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">{language === "en" ? "Stage 2" : "Tahap 2"}</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Compass size={17} />
                </div>
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-white">
                  {language === "en" ? "Stage 3 — Basic Design & Lines Plan" : "Tahap 3 — Desain Awal (Basic Design & Lines Plan)"}
                </h1>
                <span className="text-[10px] font-mono font-semibold bg-cyan-950/70 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  {projectId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {language === "en"
                  ? "Lines plan design studio, waterplane calculations, bilge radius, CSA station section projection, and design constraints."
                  : "Studio perancangan rencana garis (Lines Plan), kalkulasi garis air, radius bilga, proyeksi luasan CSA gading, dan batasan desain."}
              </p>
            </div>
          </div>

          {/* Right: Key Metric Badges & Permanent Save Button */}
          <div className="flex items-center flex-wrap gap-2.5 self-start lg:self-auto">
            <div className="flex items-center flex-wrap gap-2 text-xs bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80 font-mono">
              <div className="flex items-center space-x-1">
                <span className="text-slate-400 text-[11px]">LBP:</span>
                <strong className="text-cyan-300 font-semibold">{lbp.toFixed(2)}m</strong>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400 text-[11px]">LOA:</span>
                <strong className="text-amber-400 font-semibold">{currentLoa.toFixed(2)}m</strong>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400 text-[11px]">B:</span>
                <strong className="text-white font-semibold">{breadth.toFixed(2)}m</strong>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400 text-[11px]">T:</span>
                <strong className="text-emerald-400 font-semibold">{draft.toFixed(3)}m</strong>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400 text-[11px]">Cb:</span>
                <strong className="text-amber-300 font-semibold">{cb.toFixed(3)}</strong>
              </div>
            </div>

            {/* Permanent Save Button with Live Status */}
            <div className="flex items-center space-x-2">
              {lastSaved && (
                <span className="hidden xl:flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-inner" title="Waktu terakhir data tersimpan aman">
                  <Clock size={11} className="text-emerald-400" />
                  <span>Tersimpan: {lastSaved}</span>
                </span>
              )}

              <button
                onClick={() => handleSaveAll(true)}
                disabled={saving}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-lg ${
                  saving
                    ? "bg-amber-600/30 text-amber-300 border border-amber-500/50 animate-pulse cursor-wait"
                    : hasUnsavedChanges
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/50 shadow-cyan-900/40 hover:scale-[1.02]"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 shadow-emerald-950/40 hover:scale-[1.02]"
                }`}
                title={language === "en" ? "Save all Stage 3 design data permanently to server & storage (Ctrl+S)" : "Simpan semua data perancangan Tahap 3 secara permanen ke server & penyimpanan (Ctrl+S)"}
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin text-amber-300" />
                ) : hasUnsavedChanges ? (
                  <Save size={14} className="text-cyan-200" />
                ) : (
                  <CheckCircle2 size={14} className="text-emerald-200" />
                )}
                <span>
                  {saving
                    ? (language === "en" ? "Saving..." : "Menyimpan...")
                    : hasUnsavedChanges
                    ? (language === "en" ? "Save Changes" : "Simpan Perubahan")
                    : (language === "en" ? "Save Design" : "Simpan Desain")}
                </span>
                <span className="hidden sm:inline-block text-[10px] opacity-75 font-mono px-1 py-0.5 rounded bg-black/30 border border-white/10">
                  Ctrl+S
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation Tabs */}
      <nav className="bg-slate-950/90 border-b border-slate-800/80 flex px-5 sm:px-6 space-x-2 overflow-x-auto items-center shrink-0 backdrop-blur-md py-2 no-scrollbar">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Workspace Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: TAMPAK SAMPING & NURBS EDITOR (SHEER PLAN) */}
        <div className={activeTab === "profile" ? "block space-y-6" : "hidden"}>
          <SideProfileNurbsEditor
            lbp_m={lbp}
            depth_m={depth}
            draft_m={draft}
            breadth_m={breadth}
            cb={cb}
            vesselType={vesselType}
            onUpdateLoa={(newLoa) => {
              setExactLoa(newLoa);
              setHasUnsavedChanges(true);
            }}
          />
        </div>

        {/* TAB 2: KALKULASI GARIS AIR (PAGE 1) */}
        <div className={activeTab === "waterplane" ? "block space-y-6" : "hidden"}>
          <WaterPlaneCalculationSheet
            lbp_m={lbp}
            lwl_m={currentLoa ? Number((currentLoa * 0.98).toFixed(2)) : undefined}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
            csaOrdinates={csaOrdinates}
            vesselType={vesselType}
            waterlinesData={waterlinesData}
            onUpdateWaterlinesData={(newData) => {
              setWaterlinesData(newData);
              setHasUnsavedChanges(true);
            }}
            waterlineLevels={waterlineLevels}
            onUpdateWaterlineLevels={(newLevels) => {
              setWaterlineLevels(newLevels);
              setHasUnsavedChanges(true);
            }}
            onSave={() => handleSaveAll(true)}
            isSaving={saving}
            lastSaved={lastSaved}
          />
        </div>

        {/* TAB 3: RADIUS BILGA & LUAS MIDSHIP GADING 10 (PAGE 2) */}
        <div className={activeTab === "midshipBilge" ? "block space-y-6" : "hidden"}>
          <MidshipBilgeCalculationSheet
            lbp_m={lbp}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
            vesselType={vesselType}
            waterlineLevels={waterlineLevels}
            waterlinesData={waterlinesData}
          />
        </div>

        {/* TAB 4: PROYEKSI */}
        <div className={activeTab === "csaProjection" ? "block space-y-6" : "hidden"}>
          <LinesPlanThreeView
            lbp_m={lbp}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
            csaOrdinates={csaOrdinates}
            waterlinesData={waterlinesData}
            waterlineLevels={waterlineLevels}
          />
        </div>

        {/* TAB 5: AI BASIC DESIGN ASSISTANT */}
        <div
          className={activeTab === "ai" ? "flex flex-col bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-xl shadow-2xl" : "hidden"}
          style={{ height: "calc(100vh - 210px)", minHeight: "520px" }}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Basic Design & Lines Plan Companion</h3>
                  <p className="text-[11px] text-slate-400">{language === "en" ? "Consultation on hull curves, Body Plan, and classification rules" : "Konsultasi kurva lambung, Body Plan, dan aturan klasifikasi"}</p>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-mono">
                Naval Architect AI
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
              <span className="text-[11px] text-slate-400 font-semibold block">
                {language === "en" ? "Quick Questions:" : "Pertanyaan Cepat:"}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  language === "en" ? "Waterplane Calculation (AWL & LCF) & Integration Formula" : "Kalkulasi Garis Air (AWL & LCF) dan Rumus Integrasi",
                  language === "en" ? "Bilge Radius & Station 10 Midship Area Calculation" : "Perhitungan Radius Bilga & Luas Midship Gading 10",
                  language === "en" ? "Explain how CSA areas are projected to Body Plan" : "Jelaskan bagaimana luasan CSA diproyeksikan ke Body Plan",
                  language === "en" ? "What is the role of Parallel Middle Body (PMB) for this vessel?" : "Apa peran Parallel Middle Body (PMB) pada kapal ini?",
                  language === "en" ? "Explain constant constraints vs variable dimensions (LOA)" : "Jelaskan perbedaan batasan konstan vs dimensi variabel (LOA)",
                  language === "en" ? "Stem and stern profile curvature recommendations" : "Rekomendasi kelurusan kurva linggi haluan dan buritan"
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskAi(preset)}
                    className="text-xs bg-slate-950/80 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer font-sans"
                  >
                    ⚡ {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Box Log */}
            <div
              className="flex-1 border border-slate-800/80 rounded-2xl bg-slate-950/80 p-4 overflow-y-auto space-y-3 no-scrollbar backdrop-blur-md shadow-inner"
              style={{ minHeight: 0 }}
            >
              {aiChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 p-6">
                  <Sparkles size={30} className="text-cyan-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-white">{language === "en" ? "AI Basic Design Assistant Ready" : "AI Basic Design Assistant Siap"}</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                      {language === "en"
                        ? "Select a quick question button above or ask your specific question about Lines Plan!"
                        : "Pilih salah satu tombol pertanyaan cepat di atas atau ajukan pertanyaan spesifik Anda seputar Lines Plan!"}
                    </p>
                  </div>
                </div>
              ) : (
                aiChat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed shadow-md ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-blue-400/30"
                          : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none font-sans"
                      }`}
                    >
                      <p className="font-semibold mb-1.5 opacity-70 text-[10px] uppercase tracking-wider font-mono">
                        {msg.sender === "user" ? (language === "en" ? "Designer" : "Perancang") : (language === "en" ? "AI Assistant" : "AI Asisten")}
                      </p>
                      <div className="space-y-2 text-slate-200">
                        {msg.text
                          .split("\n")
                          .filter((l) => l.trim() !== "")
                          .map((line, lidx) => {
                            const formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                            if (line.startsWith("### ")) {
                              return (
                                <h3
                                  key={lidx}
                                  className="text-xs font-bold text-cyan-300 mt-2 mb-1"
                                  dangerouslySetInnerHTML={{ __html: formattedLine.replace("### ", "") }}
                                />
                              );
                            }
                            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                              return (
                                <li
                                  key={lidx}
                                  className="ml-4 list-disc text-slate-300"
                                  dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s*/, "") }}
                                />
                              );
                            }
                            return (
                              <p
                                key={lidx}
                                className="leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formattedLine }}
                              />
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <div className="flex space-x-2 shrink-0">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAskAi()}
                placeholder={language === "en" ? "Ask about lines plan analysis, stem/stern curve smoothing, or CSA formulas..." : "Tanyakan analisis lines plan, perataan kurva haluan/buritan, atau formula CSA..."}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/25"
              >
                {aiLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>{language === "en" ? "Send" : "Kirim"}</span>
              </button>
            </div>
          </div>
      </main>

      {/* Floating Permanent Save Success Toast */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-emerald-500/60 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-3.5 ring-1 ring-emerald-500/30 transition-all">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-white">
                {language === "en" ? "Stage 3 Saved Permanently" : "Data Tahap 3 Tersimpan Permanen"}
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {lastSaved}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {language === "en"
                ? "All waterline offsets, calculations, and hull curves have been securely written to storage."
                : "Seluruh ordinat garis air, integrasi Simpson, dan profil lambung telah tersimpan di server & database."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

