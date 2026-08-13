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
  Sparkles
} from "lucide-react";
import { api } from "../../../../services/api";
import { SideProfileNurbsEditor } from "../../../../components/design/SideProfileNurbsEditor";
import { WaterPlaneCalculationSheet } from "../../../../components/design/WaterPlaneCalculationSheet";
import { MidshipBilgeCalculationSheet } from "../../../../components/design/MidshipBilgeCalculationSheet";
import { CsaToBodyPlanProjection } from "../../../../components/design/CsaToBodyPlanProjection";
import { LinesPlanThreeView } from "../../../../components/design/LinesPlanThreeView";
import { DesignConstraintsSummary } from "../../../../components/design/DesignConstraintsSummary";

export default function Stage3BasicDesignPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [activeTab, setActiveTab] = useState<
    "profile" | "waterplane" | "midshipBilge" | "csaProjection" | "linesplan3view" | "constraints" | "ai"
  >("profile");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>({});
  const [stage2Data, setStage2Data] = useState<any>({});

  // Dynamic calculated dimensions from Profile NURBS Editor
  const [exactLoa, setExactLoa] = useState<number | null>(null);
  const [foreOverhang, setForeOverhang] = useState<number | null>(null);
  const [aftOverhang, setAftOverhang] = useState<number | null>(null);

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
    { id: "profile", label: "1. Tampak Samping (Sheer & Profile)", icon: <Compass size={15} /> },
    { id: "waterplane", label: "2. Kalkulasi Garis Air (AWL & LCF)", icon: <Layers size={15} /> },
    { id: "midshipBilge", label: "3. Radius Bilga & Luas Midship (St 10)", icon: <Activity size={15} /> },
    { id: "csaProjection", label: "4. Proyeksi CSA ke Body Plan", icon: <Activity size={15} /> },
    { id: "linesplan3view", label: "5. Lines Plan 3-View", icon: <Layers size={15} /> },
    { id: "constraints", label: "6. Batasan Desain & PMB", icon: <Scale size={15} /> },
    { id: "ai", label: "7. AI Assistant", icon: <Cpu size={15} /> }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070B12] text-slate-100 font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shrink-0 py-3 px-5 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Navigation and Title */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => router.push(`/projects/${projectId}/stage2`)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold shrink-0"
              title="Kembali ke Tahap 2 Pra-Rancangan"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Tahap 2</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Compass size={17} />
                </div>
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-white">
                  Tahap 3 — Desain Awal (Basic Design & Lines Plan)
                </h1>
                <span className="text-[10px] font-mono font-semibold bg-cyan-950/70 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  {projectId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                Studio perancangan rencana garis (Lines Plan), kalkulasi garis air, radius bilga, proyeksi luasan CSA gading, dan batasan desain.
              </p>
            </div>
          </div>

          {/* Right: Key Metric Badges */}
          <div className="flex items-center flex-wrap gap-2 text-xs bg-slate-900/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80 self-start lg:self-auto font-mono">
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
          />
        </div>

        {/* TAB 4: PROYEKSI CSA KE BODY PLAN */}
        <div className={activeTab === "csaProjection" ? "block space-y-6" : "hidden"}>
          <CsaToBodyPlanProjection
            lbp_m={lbp}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
            csaOrdinates={csaOrdinates}
          />
        </div>

        {/* TAB 3: RENCANA GARIS 3-VIEW & TABLE OF OFFSETS */}
        <div className={activeTab === "linesplan3view" ? "block space-y-6" : "hidden"}>
          <LinesPlanThreeView
            lbp_m={lbp}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
          />
        </div>

        {/* TAB 4: BATASAN DESAIN & PMB */}
        <div className={activeTab === "constraints" ? "block space-y-6" : "hidden"}>
          <DesignConstraintsSummary
            lbp_m={lbp}
            breadth_m={breadth}
            draft_m={draft}
            depth_m={depth}
            cb={cb}
            cm={cm}
            calculatedLoa={currentLoa}
            foreOverhang={foreOverhang || undefined}
            aftOverhang={aftOverhang || undefined}
            vesselType={vesselType}
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
                  <p className="text-[11px] text-slate-400">Konsultasi kurva lambung, Body Plan, dan aturan klasifikasi</p>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-mono">
                Naval Architect AI
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Pertanyaan Cepat:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Kalkulasi Garis Air (AWL & LCF) dan Rumus Integrasi",
                  "Perhitungan Radius Bilga & Luas Midship Gading 10",
                  "Jelaskan bagaimana luasan CSA diproyeksikan ke Body Plan",
                  "Apa peran Parallel Middle Body (PMB) pada kapal ini?",
                  "Jelaskan perbedaan batasan konstan vs dimensi variabel (LOA)",
                  "Rekomendasi kelurusan kurva linggi haluan dan buritan"
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
                    <p className="text-xs font-bold text-white">AI Basic Design Assistant Siap</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                      Pilih salah satu tombol pertanyaan cepat di atas atau ajukan pertanyaan spesifik Anda seputar Lines Plan!
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
                        {msg.sender === "user" ? "Perancang" : "AI Asisten"}
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
                                  dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, "") }}
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
                placeholder="Tanyakan analisis lines plan, perataan kurva haluan/buritan, atau formula CSA..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/25"
              >
                {aiLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>Kirim</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
