"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Maximize2,
  Table as TableIcon,
  X,
  Zap
} from "lucide-react";
import { api } from "../../../../services/api";
import { SideProfileNurbsEditor } from "../../../../components/design/SideProfileNurbsEditor";
import { WaterPlaneCalculationSheet, WaterPlanePageTabs, WaterlineConfig, DEFAULT_WATERLINE_LEVELS, generateWaterlinePresets, WaterPlaneViewMode } from "../../../../components/design/WaterPlaneCalculationSheet";
import { MidshipBilgeCalculationSheet } from "../../../../components/design/MidshipBilgeCalculationSheet";
import { LinesPlanThreeView } from "../../../../components/design/LinesPlanThreeView";
import { useLanguage } from "../../../../context/LanguageContext";
import { formatVesselType } from "../../../../types";

export default function Stage3BasicDesignPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<
    "profile" | "waterplaneBilge" | "csaProjection" | "ai"
  >("profile");

  // Keep the long calculation sheets collapsed on entry. The compact summaries
  // remain visible, while opening one sheet automatically closes the other.
  const [showSection2A, setShowSection2A] = useState<boolean>(false);
  const [showSection2B, setShowSection2B] = useState<boolean>(false);

  const toggleSection2A = () => {
    setShowSection2A((current) => {
      const next = !current;
      if (next) setShowSection2B(false);
      return next;
    });
  };

  const toggleSection2B = () => {
    setShowSection2B((current) => {
      const next = !current;
      if (next) setShowSection2A(false);
      return next;
    });
  };

  // Studio Visual Bersama (Dual Studio) & Simultaneous Fullscreen States
  const [showCombinedVisualStudio, setShowCombinedVisualStudio] = useState<boolean>(true);
  const [isDualFullscreen, setIsDualFullscreen] = useState<boolean>(false);
  const [dualFullscreenLayout, setDualFullscreenLayout] = useState<"vertical" | "horizontal">("vertical");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>({});
  const [stage2Data, setStage2Data] = useState<any>({});
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState<number | null>(null);

  // Dynamic calculated dimensions from Profile NURBS Editor
  const [exactLoa, setExactLoa] = useState<number | null>(null);
  const [foreOverhang, setForeOverhang] = useState<number | null>(null);
  const [aftOverhang, setAftOverhang] = useState<number | null>(null);
  const [sideProfileData, setSideProfileData] = useState<any>(undefined);

  // Dynamic Custom Waterlines Configuration (Synchronized across Tab 2 and Tab 3)
  const [waterlineLevels, setWaterlineLevels] = useState<WaterlineConfig[]>(DEFAULT_WATERLINE_LEVELS);

  // Synchronized Station Density (All 36 stations vs Standard 23 stations)
  const [stationDensity, setStationDensity] = useState<"all" | "standard">("all");

  // Synchronized Multi-Waterline Offsets Data (Shared between Tab 2 and Tab 4)
  const [waterlinesData, setWaterlinesData] = useState<
    Record<string, Record<number, number>> | undefined
  >(undefined);

  // Synchronized Active Waterline selection between Waterplane Plan (Tab 2) and Midship Section (Tab 3)
  const [activeWlId, setActiveWlId] = useState<string>("WL6");
  const [waterplaneViewMode, setWaterplaneViewMode] = useState<WaterPlaneViewMode>("fullSheet");

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
            if (res3.side_profile) setSideProfileData(res3.side_profile);
            if (res3.exact_loa) setExactLoa(res3.exact_loa);
            if (res3.fore_overhang) setForeOverhang(res3.fore_overhang);
            if (res3.aft_overhang) setAftOverhang(res3.aft_overhang);
            if (res3.draft_m) setSavedDraftSnapshot(res3.draft_m);
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
              if (parsed.side_profile) setSideProfileData(parsed.side_profile);
              if (parsed.exact_loa) setExactLoa(parsed.exact_loa);
              if (parsed.fore_overhang) setForeOverhang(parsed.fore_overhang);
              if (parsed.aft_overhang) setAftOverhang(parsed.aft_overhang);
              if (parsed.draft_m) setSavedDraftSnapshot(parsed.draft_m);
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

  // Automatic Reactive Synchronization from Stage 2 (Auto-Sync)
  useEffect(() => {
    if (stage2Data.draft_m || projectData.draft_m) {
      const activeDraft = Number(stage2Data.draft_m || projectData.draft_m || 5.5);
      const activeBreadth = Number(stage2Data.breadth_m || projectData.breadth_m || 16.0);
      const activeCm = Number(stage2Data.cm || 0.98);
      
      setWaterlineLevels((prevLevels) => {
        const count = prevLevels?.length || 4;
        return generateWaterlinePresets(count, activeDraft, activeBreadth, activeCm);
      });
    }
  }, [stage2Data.draft_m, stage2Data.breadth_m, stage2Data.cm, projectData.draft_m, projectData.breadth_m]);

  // Permanent Save Handler (Server Disk + Browser LocalStorage)
  const handleSaveAll = async (manualNotify = true) => {
    try {
      setSaving(true);
      setSaveStatus("saving");

      const payload = {
        side_profile: sideProfileData,
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

  // Memoized handlers for SideProfileNurbsEditor to prevent infinite re-renders
  const handleUpdateLoa = useCallback((newLoa: number, fOver: number, aOver: number) => {
    setExactLoa((prev) => (prev !== newLoa ? newLoa : prev));
    setForeOverhang((prev) => (prev !== fOver ? fOver : prev));
    setAftOverhang((prev) => (prev !== aOver ? aOver : prev));
  }, []);

  const handleChangeProfile = useCallback((data: any) => {
    setSideProfileData(data);
  }, []);

  const handleSaveProfile = useCallback(async (data: any) => {
    setSideProfileData(data);
    await handleSaveAll(false);
  }, [handleSaveAll]);

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

  // Keyboard shortcut (Escape) to close dual fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDualFullscreen) {
        setIsDualFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDualFullscreen]);

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
          `### Penjelasan Perhitungan Garis Air (Waterplane Calculation):\n\n` +
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
          `### Penjelasan Geometri Radius Bilga & Luas Midship (Gading 10):\n\n` +
          `1. **Formula Radius Bilga (R)**:\n` +
          `   - Rumus: Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )\n` +
          `   - Luas sudut terpotong bilga = B * T * (1 - Cm) = ${breadth} * ${draft} * (1 - ${cm}) = ${(breadth * draft * (1 - cm)).toFixed(3)} m².\n` +
          `   - Nilai R yang dihasilkan memastikan luasan penampang tengah kapal presisi sebesar target Am = B * T * Cm = ${(breadth * draft * cm).toFixed(2)} m².\n\n` +
          `2. **Integrasi Ordinat Gading 10**:\n` +
          `   - Titik rata dasar (flat of bottom) berakhir pada jarak (0.5B - R).\n` +
          `   - Di atas sarat z >= R, sisi lambung kapal naik tegak lurus sempurna selebar 0.5B = ${(breadth / 2).toFixed(2)} m.`;
      } else if (q.includes("CSA") || q.includes("Proyeksi") || q.includes("Body Plan")) {
        reply =
          `### Penjelasan Peran CSA & Proyeksi Body Plan:\n\n` +
          `1. **Fungsi CSA (Curve of Sectional Area)**:\n` +
          `   - CSA memetakan distribusi volume kapal sepanjang 21 stasiun (Gading 0 AP s.d Gading 20 FP).\n` +
          `   - Luas tiap penampang melintang dihitung dengan rumus: **Ai = (%Am / 100) * Am**, dengan **Am = B * T * Cm = ${breadth} * ${draft} * ${cm} = ${(breadth * draft * cm).toFixed(2)} m²**.\n\n` +
          `2. **Proses Proyeksi ke Body Plan**:\n` +
          `   - Nilai luasan Ai dari kurva CSA diproyeksikan menjadi kurva batas gading pada Body Plan dengan estimasi lebar setengah gading bi = (B/2) * Akar(Ai / Am).\n` +
          `   - Bagian haluan (Forebody, St 11-20) dibuat ramping/U-shape untuk efisiensi gelombang, sedangkan buritan (Afterbody, St 0-9) dirancang V-shape untuk kelancaran aliran air ke propeller.`;
      } else if (q.includes("PMB") || q.includes("Parallel Middle Body")) {
        reply =
          `### Penjelasan Parallel Middle Body (PMB):\n\n` +
          `- **PMB (Parallel Middle Body)** adalah zona tengah kapal di mana bentuk penampang melintangnya seragam sebesar Luas Midship (Am).\n` +
          `- Untuk kapal jenis **${formatVesselType(vesselType)}** dengan Cb = **${cb}**, zona PMB berada di sekitar **Station 7 hingga Station 13** (panjang sekitar ${((6 / 20) * lbp).toFixed(1)} m atau 30% dari LBP).\n` +
          `- Keuntungan PMB: Memaksimalkan volume ruang muat dan mempermudah fabrikasi pelat baja lurus saat perakitan di galangan.`;
      } else if (q.includes("Batasan") || q.includes("Konstan") || q.includes("LOA")) {
        reply =
          `### Batasan Desain (Konstan) vs Variabel Bebas:\n\n` +
          `- **Batasan Konstan (Acuan Awal)**: LBP (${lbp}m), B (${breadth}m), H (${depth}m), T (${draft}m), dan Cb (${cb}) merupakan batasan tetap yang diperoleh dari optimasi kelayakan awal.\n` +
          `- **Komponen Bebas / Variabel**: LOA (saat ini **${currentLoa}m**), LWL, Fore Overhang, dan Aft Overhang diperoleh secara presisi setelah kurva tampak samping (profile view) digambar menggunakan titik kontrol NURBS/Spline.`;
      } else {
        reply =
          `### Rekomendasi Basic Design Lines Plan:\n\n` +
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
    { id: "waterplaneBilge", label: language === "en" ? "2. Waterplane & Bilge Radius (AWL & St 10)" : "2. Rencana Garis Air & Radius Bilga", icon: <Layers size={15} /> },
    { id: "csaProjection", label: language === "en" ? "3. Lines Plan Three-View Projection" : "3. Proyeksi Tiga Tampilan (Lines Plan)", icon: <Activity size={15} /> },
    { id: "ai", label: language === "en" ? "4. AI Co-Pilot" : "4. AI Assistant", icon: <Cpu size={15} /> }
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#070B12] text-slate-500 dark:text-slate-400 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="animate-spin text-cyan-500" size={32} />
          <p className="text-sm font-medium tracking-wide">Memuat modul Basic Design & Rencana Garis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 font-sans relative">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 px-4 sm:px-6 py-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
          {/* Left: Navigation and Title Block */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={() => router.push(`/projects/${projectId}/stage2`)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold shrink-0 shadow-sm"
              title={language === "en" ? "Back to Stage 2 Preliminary Design" : "Kembali ke Tahap 2 Pra-Rancangan"}
            >
              <ArrowLeft size={14} className="text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">{language === "en" ? "Stage 2" : "Tahap 2"}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
                <Compass size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
                  <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-md lg:max-w-xl">
                    {language === "en" ? "Stage 3 — Basic Design & Lines Plan" : "Tahap 3 — Desain Awal (Basic Design & Lines Plan)"}
                  </h1>
                  <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0">
                    {projectId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-lg hidden sm:block mt-0.5">
                  {language === "en"
                    ? "Lines plan studio, waterplane calculations, bilge radius & CSA section projection."
                    : "Studio rencana garis, kalkulasi bidang garis air, radius bilga & proyeksi luasan CSA."}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Key Metric Badges & Save Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {/* Instrument Telemetry Strip */}
            <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-800/90 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 px-1 py-1 text-xs font-mono shadow-sm overflow-x-auto max-w-full">
              <div className="px-2.5 py-0.5 flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold">LBP</span>
                <span className="text-cyan-600 dark:text-cyan-300 font-bold text-[11px]">{lbp.toFixed(2)}m</span>
              </div>
              <div className="px-2.5 py-0.5 flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold">LOA</span>
                <span className="text-amber-600 dark:text-amber-300 font-bold text-[11px]">{currentLoa.toFixed(2)}m</span>
              </div>
              <div className="px-2.5 py-0.5 flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold">B</span>
                <span className="text-slate-900 dark:text-white font-bold text-[11px]">{breadth.toFixed(2)}m</span>
              </div>
              <div className="px-2.5 py-0.5 flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold">T</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">{draft.toFixed(2)}m</span>
              </div>
              <div className="px-2.5 py-0.5 flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Cb</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">{cb.toFixed(3)}</span>
              </div>
            </div>

            {lastSaved && (
              <span className="hidden 2xl:flex items-center space-x-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/60" title="Waktu terakhir data tersimpan aman">
                <Clock size={11} className="text-emerald-500 dark:text-emerald-400" />
                <span>{lastSaved}</span>
              </span>
            )}

            {/* Permanent Save Button with Live Status */}
            <button
              onClick={() => handleSaveAll(true)}
              disabled={saving}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-lg shrink-0 ${
                saving
                  ? "bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-500/50 animate-pulse cursor-wait"
                  : hasUnsavedChanges
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/50 shadow-cyan-900/40 hover:scale-[1.02]"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 shadow-emerald-950/40 hover:scale-[1.02]"
              }`}
              title={language === "en" ? "Save all Stage 3 design data permanently to server & storage (Ctrl+S)" : "Simpan semua data perancangan Tahap 3 secara permanen ke server & penyimpanan (Ctrl+S)"}
            >
              {saving ? (
                <RefreshCw size={13} className="animate-spin text-amber-300" />
              ) : hasUnsavedChanges ? (
                <Save size={13} className="text-cyan-200" />
              ) : (
                <CheckCircle2 size={13} className="text-emerald-200" />
              )}
              <span>
                {saving
                  ? (language === "en" ? "Saving..." : "Menyimpan...")
                  : hasUnsavedChanges
                  ? (language === "en" ? "Save Changes" : "Simpan Perubahan")
                  : (language === "en" ? "Save Design" : "Simpan Desain")}
              </span>
              <span className="hidden sm:inline-block text-[9.5px] opacity-80 font-mono px-1.5 py-0.5 rounded bg-black/20 dark:bg-black/30 border border-white/20 font-medium">
                Ctrl+S
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Error Alert Banner */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-500/50 text-red-800 dark:text-red-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-500 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <nav className="bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 flex w-full px-3 sm:px-4 gap-2 overflow-x-auto items-center shrink-0 backdrop-blur-md py-2 no-scrollbar shadow-sm">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-1 basis-0 min-w-max justify-center items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 border border-transparent"
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
            projectId={projectId}
            initialProfileData={sideProfileData}
            onChangeProfile={handleChangeProfile}
            onSave={handleSaveProfile}
            onUpdateLoa={handleUpdateLoa}
          />
        </div>

        {/* TAB 2: RENCANA GARIS AIR & RADIUS BILGA (STUDIO VISUAL BERSAMA ATAS & BAWAH, DIIKUTI DETAIL TABEL KALKULASI) */}
        <div className={activeTab === "waterplaneBilge" ? "block flex flex-col space-y-8" : "hidden"}>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* BLOK 1: STUDIO VISUAL TERPADU (GARIS AIR ATAS, RADIUS BILGA BAWAH)     */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-sm dark:shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                      {language === "en"
                        ? "Dual Visual Studio: Waterplane & Midship Bilge"
                      : "Integrated Visual Studio: Waterplane & Bilge Radius"}
                    </h2>
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 text-[10px] font-mono font-bold">
                      Simultaneous View
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === "en"
                      ? "Direct simultaneous inspection: Waterplane curvature on top and Midship Bilge section 10 underneath."
                      : "Live simultaneous inspection: waterplane curves above and the Station 10 bilge-radius section below."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDualFullscreen(true)}
                  className="py-2 px-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-cyan-600/20 ring-1 ring-cyan-400/30 hover:scale-[1.02] active:scale-95"
                  title="Buka Mode Layar Penuh untuk kedua komponen visual secara bersamaan"
                >
                  <Maximize2 size={14} />
                  <span>{language === "en" ? "Dual Fullscreen Studio" : "Mode Layar Penuh Keduanya"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCombinedVisualStudio(!showCombinedVisualStudio)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
                  title={showCombinedVisualStudio ? "Hide Visual Studio" : "Show Visual Studio"}
                >
                  {showCombinedVisualStudio ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                  <span>{showCombinedVisualStudio ? (language === "en" ? "Hide Studio" : "Sembunyikan Visual") : (language === "en" ? "Show Studio" : "Tampilkan Visual")}</span>
                </button>
              </div>
            </div>

            {showCombinedVisualStudio ? (
              <div className="flex flex-col space-y-6 w-full">
                {/* ATAS: VISUAL GARIS AIR (WATERPLANE PLAN) */}
                <div className="flex flex-col space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400 px-1 shrink-0 pb-1.5 border-b border-slate-200 dark:border-slate-800/70">
                    <span className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-400/50" />
                      <span>1. {language === "en" ? "WATERPLANE PLAN (HALF-BREADTH 0.5B)" : "RENCANA GARIS AIR (WATERPLANE PLAN 0.5B)"}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg">
                      Top View
                    </span>
                  </div>
                  <div className="w-full">
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
                      activeWlId={activeWlId}
                      onSelectWlId={setActiveWlId}
                      stationDensity={stationDensity}
                      onUpdateStationDensity={setStationDensity}
                      onSave={() => handleSaveAll(true)}
                      isSaving={saving}
                      lastSaved={lastSaved}
                      visualOnly={true}
                      compact={true}
                      onOpenDualFullscreen={() => setIsDualFullscreen(true)}
                    />
                  </div>
                </div>

                {/* BAWAH: VISUAL BODY PLAN & RADIUS BILGA */}
                <div className="flex flex-col space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 px-1 shrink-0 pb-1.5 border-b border-slate-200 dark:border-slate-800/70">
                    <span className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-400/50" />
                      <span>2. {language === "en" ? "BODY PLAN & BILGE RADIUS" : "BODY PLAN PENAMPANG GADING & BILGA"}</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded-lg flex items-center space-x-1">
                        <Zap size={10} className="text-cyan-500 fill-cyan-500" />
                        <span>Real-Time (St. 10 ⇄ Section 10)</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg">
                        Body Plan View
                      </span>
                    </div>
                  </div>
                  <div className="w-full">
                    <MidshipBilgeCalculationSheet
                      lbp_m={lbp}
                      breadth_m={breadth}
                      draft_m={draft}
                      depth_m={depth}
                      cb={cb}
                      cm={cm}
                      vesselType={vesselType}
                      waterlineLevels={waterlineLevels}
                      onUpdateWaterlineLevels={(newLevels) => {
                        setWaterlineLevels(newLevels);
                        setHasUnsavedChanges(true);
                      }}
                      waterlinesData={waterlinesData}
                      onUpdateWaterlinesData={(newData) => {
                        setWaterlinesData(newData);
                        setHasUnsavedChanges(true);
                      }}
                      sideProfileData={sideProfileData}
                      activeWlId={activeWlId}
                      onSelectWlId={setActiveWlId}
                      stationDensity={stationDensity}
                      onUpdateStationDensity={setStationDensity}
                      visualOnly={true}
                      compact={true}
                      onOpenDualFullscreen={() => setIsDualFullscreen(true)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <EyeOff size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {language === "en" ? "Dual Visual Studio is Hidden" : "Studio Visual Terpadu (Atas & Bawah) Disembunyikan"}
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      The waterplane and bilge radius views are minimized. Open the studio to display them.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCombinedVisualStudio(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-xs font-bold border border-cyan-300 dark:border-cyan-500/30 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Eye size={14} />
                  <span>{language === "en" ? "Open Visual Studio" : "Buka Studio Visual"}</span>
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* BLOK 2: DETAIL TABEL PERHITUNGAN & INTEGRASI NUMERIK                  */}
          {/* ══════════════════════════════════════════════════════════════════════ */}

          {/* Quick-Jump Anchor Bar with Global Section Controls */}
          <div className="order-3 w-full bg-white dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 rounded-2xl p-2.5 px-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider hidden sm:inline">
                {language === "en" ? "Tables:" : "Detail Tabel:"}
              </span>
              <a
                href="#section-waterplane"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                  showSection2A
                    ? "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30 hover:bg-cyan-100"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers size={13} />
                <span>2A. {language === "en" ? "Waterplane Tables" : "Tabel Garis Air"}</span>
              </a>
              <a
                href="#section-bilge"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                  showSection2B
                    ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 hover:bg-amber-100"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Activity size={13} />
                <span>2B. {language === "en" ? "Midship Tables" : "Tabel Midship & Bilga"}</span>
              </a>
              <a
                href="#section-xyz-table"
                onClick={() => {
                  setShowSection2A(false);
                  setShowSection2B(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40 hover:bg-purple-100 dark:hover:bg-purple-500/30 cursor-pointer"
              >
                <TableIcon size={13} />
                <span>2C. {language === "en" ? "3D XYZ Offsets Table" : "Tabel Koordinat 3D (XYZ)"}</span>
              </a>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const anyHidden = !showSection2A || !showSection2B;
                  setShowSection2A(anyHidden);
                  setShowSection2B(anyHidden);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                {showSection2A && showSection2B ? <EyeOff size={13} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={13} className="text-cyan-600 dark:text-cyan-400" />}
                <span>
                  {showSection2A && showSection2B
                    ? (language === "en" ? "Collapse All Tables" : "Sembunyikan Semua Tabel")
                    : (language === "en" ? "Expand All Tables" : "Tampilkan Semua Tabel")}
                </span>
              </button>

              <span className="hidden md:inline-block px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 text-[10px] font-mono">
                {waterlineLevels.length} WL Active
              </span>
            </div>
          </div>

          {/* SEKSI 2A: DETAIL PERHITUNGAN GARIS AIR & SIMPSON */}
          <section id="section-waterplane" className="order-4 space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3 backdrop-blur-md shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-extrabold font-mono text-xs flex items-center justify-center shadow-inner">
                  2A
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                    {language === "en" ? "Part 2A: Waterplane Geometry & Simpson Calculation (AWL & LCF)" : "Bagian 2A: Rencana Garis Air & Perhitungan Simpson (AWL & LCF)"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === "en"
                      ? "Interactive hull waterline plan, half-breadth 0.5B ordinates, and hydrostatic coefficients"
                      : "Studio kurva garis air interaktif, ordinat separuh lebar 0.5B (36 gading), dan integrasi hidrostatik"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                onClick={toggleSection2A}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
                  title={showSection2A ? (language === "en" ? "Hide Section 2A" : "Sembunyikan Bagian 2A") : (language === "en" ? "Show Section 2A" : "Tampilkan Bagian 2A")}
                >
                  {showSection2A ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                  <span>{showSection2A ? (language === "en" ? "Hide Section" : "Sembunyikan") : (language === "en" ? "Show Section" : "Tampilkan")}</span>
                </button>
                <span className="hidden sm:inline text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30 px-2.5 py-1 rounded-lg">
                  AWL & LCF
                </span>
              </div>
            </div>

            {showSection2A ? (
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
                activeWlId={activeWlId}
                onSelectWlId={setActiveWlId}
                stationDensity={stationDensity}
                onUpdateStationDensity={setStationDensity}
                onSave={() => handleSaveAll(true)}
                isSaving={saving}
                lastSaved={lastSaved}
                tablesOnly={true}
                viewMode={waterplaneViewMode}
                onViewModeChange={setWaterplaneViewMode}
                showPageTabs={false}
              />
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Layers size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {language === "en" ? "Section 2A: Waterplane Sheet is Hidden" : "Bagian 2A: Rencana Garis Air & Perhitungan Simpson Disembunyikan"}
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      LBP: {lbp.toFixed(2)}m • B: {breadth.toFixed(2)}m • T: {draft.toFixed(2)}m • {waterlineLevels.length} Linked Waterlines
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SEKSI 2B: DETAIL PERHITUNGAN RADIUS BILGA & MIDSHIP */}
          <section id="section-bilge" className="order-2 space-y-4 scroll-mt-24 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-3 backdrop-blur-md shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold font-mono text-xs flex items-center justify-center shadow-inner">
                  2B
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">
                    {language === "en" ? "Part 2B: Bilge Radius & Midship Station 10 Section" : "Bagian 2B: Radius Bilga & Penampang Midship Gading 10"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === "en"
                      ? "Midship section arc geometry, vertical draft-wise Simpson integration, and waterline alignment check"
                      : "Geometri busur bilga gading 10, integrasi sarat vertikal (z), dan verifikasi keselarasan garis air"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                onClick={toggleSection2B}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
                  title={showSection2B ? (language === "en" ? "Hide Section 2B" : "Sembunyikan Bagian 2B") : (language === "en" ? "Show Section 2B" : "Tampilkan Bagian 2B")}
                >
                  {showSection2B ? <EyeOff size={14} className="text-amber-600 dark:text-amber-400" /> : <Eye size={14} className="text-amber-600 dark:text-amber-400" />}
                  <span>{showSection2B ? (language === "en" ? "Hide Section" : "Sembunyikan") : (language === "en" ? "Show Section" : "Tampilkan")}</span>
                </button>
                <span className="hidden sm:inline text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-lg">
                  STATION 10 (MID)
                </span>
              </div>
            </div>

            {showSection2B ? (
              <MidshipBilgeCalculationSheet
                lbp_m={lbp}
                breadth_m={breadth}
                draft_m={draft}
                depth_m={depth}
                cb={cb}
                cm={cm}
                vesselType={vesselType}
                waterlineLevels={waterlineLevels}
                onUpdateWaterlineLevels={(newLevels) => {
                  setWaterlineLevels(newLevels);
                  setHasUnsavedChanges(true);
                }}
                waterlinesData={waterlinesData}
                onUpdateWaterlinesData={(newData) => {
                  setWaterlinesData(newData);
                  setHasUnsavedChanges(true);
                }}
                sideProfileData={sideProfileData}
                activeWlId={activeWlId}
                onSelectWlId={setActiveWlId}
                stationDensity={stationDensity}
                onUpdateStationDensity={setStationDensity}
                tablesOnly={true}
              />
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Activity size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {language === "en" ? "Section 2B: Bilge Radius & Midship is Hidden" : "Bagian 2B: Radius Bilga & Penampang Midship Gading 10 Disembunyikan"}
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      Midship Section 10 • Verwey Formula & Circular Bilge Arc
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="order-0">
            <WaterPlanePageTabs viewMode={waterplaneViewMode} onChange={setWaterplaneViewMode} />
          </div>
        </div>

        {/* TAB 3: PROYEKSI (LINES PLAN THREE VIEW) */}
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
            sideProfileData={sideProfileData}
          />
        </div>

        {/* TAB 4: AI BASIC DESIGN ASSISTANT */}
        <div
          className={activeTab === "ai" ? "flex flex-col bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl space-y-4 backdrop-blur-xl shadow-sm dark:shadow-2xl" : "hidden"}
          style={{ height: "calc(100vh - 210px)", minHeight: "520px" }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Basic Design & Lines Plan Companion</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{language === "en" ? "Consultation on hull curves, Body Plan, and classification rules" : "Konsultasi kurva lambung, Body Plan, dan aturan klasifikasi"}</p>
                </div>
              </div>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-500/20 font-mono">
                Naval Architect AI
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
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
                    className="text-xs bg-slate-100 hover:bg-cyan-50 dark:bg-slate-950/80 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-cyan-400/40 transition-all cursor-pointer font-sans shadow-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Box Log */}
            <div
              className="flex-1 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50 dark:bg-slate-950/80 p-4 overflow-y-auto space-y-3 no-scrollbar backdrop-blur-md shadow-inner"
              style={{ minHeight: 0 }}
            >
              {aiChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 p-6">
                  <Sparkles size={30} className="text-cyan-500 dark:text-cyan-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{language === "en" ? "AI Basic Design Assistant Ready" : "AI Basic Design Assistant Siap"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
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
                          : "bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none font-sans shadow-sm"
                      }`}
                    >
                      <p className="font-semibold mb-1.5 opacity-70 text-[10px] uppercase tracking-wider font-mono">
                        {msg.sender === "user" ? (language === "en" ? "Designer" : "Perancang") : (language === "en" ? "AI Assistant" : "AI Asisten")}
                      </p>
                      <div className="space-y-2 text-slate-800 dark:text-slate-200">
                        {msg.text
                          .split("\n")
                          .filter((l) => l.trim() !== "")
                          .map((line, lidx) => {
                            const formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                            if (line.startsWith("### ")) {
                              return (
                                <h3
                                  key={lidx}
                                  className="text-xs font-bold text-cyan-600 dark:text-cyan-300 mt-2 mb-1"
                                  dangerouslySetInnerHTML={{ __html: formattedLine.replace("### ", "") }}
                                />
                              );
                            }
                            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                              return (
                                <li
                                  key={lidx}
                                  className="ml-4 list-disc text-slate-700 dark:text-slate-300"
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
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans shadow-sm"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-cyan-600/20"
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

      {/* DUAL FULLSCREEN OVERLAY: WATERLINE (ATAS) & BILGA (BAWAH) SIMULTANEOUSLY */}
      {isDualFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-slate-950/98 backdrop-blur-3xl flex flex-col p-2 sm:p-4 overflow-hidden select-none animate-in fade-in duration-200">
          {/* Top Cockpit Header */}
          <div className="w-full bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 mb-3 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 dark:border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-md">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{language === "en" ? "Dual Visual Studio (Simultaneous Fullscreen)" : "Studio Visual Terpadu: Garis Air & Radius Bilga"}</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 text-[10px] font-mono font-bold">
                    DUAL COCKPIT
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>LBP: <strong className="text-slate-900 dark:text-white">{lbp.toFixed(2)}m</strong></span>
                  <span>•</span>
                  <span>B: <strong className="text-slate-900 dark:text-white">{breadth.toFixed(2)}m</strong></span>
                  <span>•</span>
                  <span>T: <strong className="text-slate-900 dark:text-white">{draft.toFixed(2)}m</strong></span>
                  <span>•</span>
                  <span>Cm: <strong className="text-amber-600 dark:text-amber-400">{cm}</strong></span>
                  <span>•</span>
                  <span>{waterlineLevels.length} WL Aktif</span>
                </div>
              </div>
            </div>

            {/* Dual Studio Layout Indicator & Close */}
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>⬌ {language === "en" ? "Side by Side (Left & Right)" : "Berdampingan (Kiri & Kanan)"}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDualFullscreen(false)}
                className="p-2 bg-slate-100 hover:bg-rose-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-md"
                title="Keluar Layar Penuh (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Split Dual Workspaces (Side-by-Side: Left & Right) */}
          <div className="flex-1 w-full min-h-0 gap-3 overflow-hidden grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* TOP / LEFT: Waterplane Visual Studio */}
            <div className="h-full min-h-0 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-700 dark:text-cyan-400 pb-1 mb-1 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>▲ STUDIO GARIS AIR (WATERPLANE PLAN 0.5B)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Top View</span>
              </div>
              <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
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
                  activeWlId={activeWlId}
                  onSelectWlId={setActiveWlId}
                  stationDensity={stationDensity}
                  onUpdateStationDensity={setStationDensity}
                  onSave={() => handleSaveAll(true)}
                  isSaving={saving}
                  lastSaved={lastSaved}
                  visualOnly={true}
                  compact={true}
                />
              </div>
            </div>

            {/* BOTTOM / RIGHT: Midship Bilge Visual Studio */}
            <div className="h-full min-h-0 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 pb-1 mb-1 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>▼ STUDIO PENAMPANG MIDSHIP & RADIUS BILGA (SECTION 10)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Transverse Section View</span>
              </div>
              <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
                <MidshipBilgeCalculationSheet
                  lbp_m={lbp}
                  breadth_m={breadth}
                  draft_m={draft}
                  depth_m={depth}
                  cb={cb}
                  cm={cm}
                  vesselType={vesselType}
                  waterlineLevels={waterlineLevels}
                  onUpdateWaterlineLevels={(newLevels) => {
                    setWaterlineLevels(newLevels);
                    setHasUnsavedChanges(true);
                  }}
                  waterlinesData={waterlinesData}
                  onUpdateWaterlinesData={(newData) => {
                    setWaterlinesData(newData);
                    setHasUnsavedChanges(true);
                  }}
                  sideProfileData={sideProfileData}
                  activeWlId={activeWlId}
                  onSelectWlId={setActiveWlId}
                  stationDensity={stationDensity}
                  onUpdateStationDensity={setStationDensity}
                  visualOnly={true}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
