"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Layers,
  Info,
  Maximize2,
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Box
} from "lucide-react";

interface CsaProjectionProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  csaOrdinates?: number[];
}

export const CsaToBodyPlanProjection: React.FC<CsaProjectionProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.5,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98,
  csaOrdinates
}) => {
  const [selectedStation, setSelectedStation] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<"projection" | "theory" | "pmb">("projection");

  // Midship Area Am = B x T x Cm
  const Am = useMemo(() => breadth_m * draft_m * cm, [breadth_m, draft_m, cm]);

  // Default NSP distribution percentages for 21 stations (0 AP to 20 FP) based on Cb
  const defaultPercentAm = useMemo(() => {
    // Standard Wageningen-like distribution based on Cb
    const pmbStart = 7;
    const pmbEnd = 13;
    return Array.from({ length: 21 }).map((_, i) => {
      if (i >= pmbStart && i <= pmbEnd) return 100.0;
      if (i < pmbStart) {
        // Aft curve
        const ratio = i / pmbStart;
        return Math.max(0, Number((Math.pow(ratio, 1.45) * 100).toFixed(1)));
      } else {
        // Fore curve
        const ratio = (20 - i) / (20 - pmbEnd);
        return Math.max(0, Number((Math.pow(ratio, 1.6) * 100).toFixed(1)));
      }
    });
  }, []);

  // 21 Station Area Array (m2)
  const stationAreas = useMemo(() => {
    if (csaOrdinates && csaOrdinates.length === 21) {
      return csaOrdinates;
    }
    return defaultPercentAm.map(pct => Number(((pct / 100) * Am).toFixed(2)));
  }, [csaOrdinates, defaultPercentAm, Am]);

  // Station specific details
  const currPct = defaultPercentAm[selectedStation];
  const currArea = stationAreas[selectedStation];
  const isAft = selectedStation < 10;
  const isMid = selectedStation === 10;
  const isFore = selectedStation > 10;
  const isPmb = currPct >= 99.5;

  // Station half-breadth estimation (b_i = (B/2) * sqrt(Ai / Am))
  const halfBreadth = useMemo(() => {
    const ratio = Math.max(0, Math.min(1, currArea / (Am || 1)));
    return (breadth_m / 2) * Math.sqrt(ratio);
  }, [currArea, Am, breadth_m]);

  // Station section curve control points for SVG Body Plan preview
  const sectionCurve = useMemo(() => {
    const bHalf = halfBreadth;
    const t = draft_m;
    const h = depth_m;
    const isPmb = currPct >= 99.5;

    // Flare / Deadweight factor
    const flare = isFore ? (selectedStation - 10) / 10 : 0;
    const deadrise = isAft ? (10 - selectedStation) / 10 : 0;

    // Keel point
    const p0 = { x: 0, y: 0 };
    // Bilge bottom
    const p1 = { x: bHalf * (isPmb ? 0.85 : 0.6 - deadrise * 0.2), y: isPmb ? 0.0 : deadrise * 0.3 * t };
    // Bilge turn
    const p2 = { x: bHalf * (isPmb ? 1.0 : 0.95), y: t * (isPmb ? 0.25 : 0.4) };
    // Waterline (DWL)
    const p3 = { x: bHalf, y: t };
    // Deck
    const p4 = { x: bHalf * (1 + flare * 0.25), y: h };

    return { p0, p1, p2, p3, p4 };
  }, [halfBreadth, draft_m, depth_m, currPct, isFore, isAft, selectedStation]);

  // Simpson 1/3 Volume Integration on CSA
  const simpsonMultiplier = [1, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 1];
  const stationDistanceH = lbp_m / 20;
  const simpsonSum = stationAreas.reduce((sum, a, idx) => sum + a * simpsonMultiplier[idx], 0);
  const totalVolumeM3 = (stationDistanceH / 3) * simpsonSum;
  const seaDensity = 1.025;
  const calculatedDisplacementTon = totalVolumeM3 * seaDensity;

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Proyeksi CSA (Curve of Sectional Area) ke Body Plan
              </h2>
              <p className="text-xs text-slate-400">
                Transformasi distribusi luasan penampang melintang gading 0 s.d 20 menjadi bentuk kurva luar lambung kapal.
              </p>
            </div>
          </div>
        </div>

        {/* Action / View tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("projection")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "projection"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Visualizer Interaktif
          </button>
          <button
            onClick={() => setActiveTab("theory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "theory"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Alur Teori Proyeksi
          </button>
          <button
            onClick={() => setActiveTab("pmb")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pmb"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Analisis PMB
          </button>
        </div>
      </div>

      {activeTab === "projection" && (
        <div className="space-y-6">
          {/* Station Slider Selector */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 space-y-3 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center space-x-2">
                <Sliders size={15} className="text-cyan-400" />
                <span className="font-bold text-white uppercase tracking-wider">
                  Pilih Stasiun / Gading:
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                  Station {selectedStation} {selectedStation === 0 ? "(AP - Buritan)" : selectedStation === 20 ? "(FP - Haluan)" : selectedStation === 10 ? "(Midship ⨂)" : ""}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                <span>Posisi X: <strong className="text-white">{(selectedStation * stationDistanceH).toFixed(2)} m</strong> dari AP</span>
                <span>•</span>
                <span>Luas Penampang (<span className="text-cyan-400">A{selectedStation}</span>): <strong className="text-cyan-300">{currArea} m²</strong> ({currPct}% Am)</span>
              </div>
            </div>

            {/* Range Slider */}
            <div className="relative pt-2">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={selectedStation}
                onChange={(e) => setSelectedStation(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1.5 px-0.5">
                <span>0 (AP)</span>
                <span>2</span>
                <span>4</span>
                <span>6</span>
                <span>8</span>
                <span className="text-cyan-400 font-bold">10 (Midship)</span>
                <span>12</span>
                <span>14</span>
                <span>16</span>
                <span>18</span>
                <span>20 (FP)</span>
              </div>
            </div>
          </div>

          {/* 2-Column Projection Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Col: CSA Curve Visualizer (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    1. Kurva CSA Longitudinal (Station 0 s.d 20)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Am = {Am.toFixed(2)} m²
                </span>
              </div>

              {/* CSA SVG Plot */}
              <div className="w-full h-56 bg-slate-950/90 rounded-xl border border-slate-800 relative p-3 overflow-hidden shadow-inner">
                <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {Array.from({ length: 21 }).map((_, i) => {
                    const x = 50 + (i / 20) * 900;
                    const isTarget = i === selectedStation;
                    return (
                      <g key={i}>
                        <line
                          x1={x}
                          y1="20"
                          x2={x}
                          y2="210"
                          stroke={isTarget ? "#06b6d4" : "#1e293b"}
                          strokeWidth={isTarget ? "2" : "1"}
                          strokeDasharray={isTarget ? "none" : "2,2"}
                        />
                        <text
                          x={x}
                          y="228"
                          fill={isTarget ? "#06b6d4" : "#64748b"}
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight={isTarget ? "bold" : "normal"}
                        >
                          {i}
                        </text>
                      </g>
                    );
                  })}

                  {/* Horizontal Area Levels */}
                  <line x1="50" y1="210" x2="950" y2="210" stroke="#475569" strokeWidth="1.5" />
                  <line x1="50" y1="40" x2="950" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="45" y="44" fill="#94a3b8" fontSize="10" textAnchor="end">100% Am</text>
                  <text x="45" y="125" fill="#94a3b8" fontSize="10" textAnchor="end">50%</text>
                  <text x="45" y="213" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

                  {/* PMB Zone Shading */}
                  <rect x={50 + (7 / 20) * 900} y="40" width={(6 / 20) * 900} height="170" fill="rgba(6, 182, 212, 0.08)" />
                  <text x={50 + (10 / 20) * 900} y="32" fill="#06b6d4" fontSize="10" textAnchor="middle" fontWeight="bold">
                    ZONA PARALLEL MIDDLE BODY (PMB)
                  </text>

                  {/* CSA Curve Fill & Path */}
                  <path
                    d={`M 50,210 ${stationAreas.map((area, idx) => {
                      const x = 50 + (idx / 20) * 900;
                      const y = 210 - (area / (Am || 1)) * 170;
                      return `L ${x},${y}`;
                    }).join(" ")} L 950,210 Z`}
                    fill="url(#csaGradient)"
                    stroke="#0ea5e9"
                    strokeWidth="2.5"
                  />

                  <defs>
                    <linearGradient id="csaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Highlight Selected Station Point */}
                  {(() => {
                    const x = 50 + (selectedStation / 20) * 900;
                    const y = 210 - (currArea / (Am || 1)) * 170;
                    return (
                      <g>
                        <circle cx={x} cy={y} r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                        {/* Laser projection line to the right */}
                        <line x1={x} y1={y} x2="980" y2={y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />
                        <rect x={x - 40} y={y - 25} width="80" height="18" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
                        <text x={x} y={y - 13} fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
                          {currArea} m²
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Explanatory Banner below CSA */}
              <div className="flex items-center justify-between text-[11px] bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400">
                  Total Volume Terbenam (Simpson): <strong className="text-emerald-400">{totalVolumeM3.toFixed(2)} m³</strong>
                </span>
                <span className="text-slate-400">
                  Displacement ($\Delta$): <strong className="text-cyan-300">{calculatedDisplacementTon.toFixed(2)} Ton</strong>
                </span>
              </div>
            </div>

            {/* Right Col: Body Plan Section Curve Projection (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    2. Proyeksi Penampang Gading (Body Plan)
                  </h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  isFore ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                  isAft ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" :
                  "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {isFore ? "Forebody (Haluan)" : isAft ? "Afterbody (Buritan)" : "Midship Section"}
                </span>
              </div>

              {/* Body Plan Single Station Frame SVG */}
              <div className="w-full h-56 bg-slate-950/90 rounded-xl border border-slate-800 relative p-3 flex items-center justify-center shadow-inner">
                <svg className="w-full h-full" viewBox="-20 -20 240 240">
                  {/* Centerline & Baseline Grid */}
                  <line x1="20" y1="0" x2="20" y2="200" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,2" />
                  <text x="18" y="10" fill="#f43f5e" fontSize="9" textAnchor="end" fontWeight="bold">Centerline (CL)</text>

                  {/* Baseline (BL) */}
                  <line x1="10" y1="180" x2="210" y2="180" stroke="#64748b" strokeWidth="1.5" />
                  <text x="212" y="183" fill="#94a3b8" fontSize="8">Baseline (BL)</text>

                  {/* Design Waterline (DWL) */}
                  {(() => {
                    const dwlY = 180 - (draft_m / depth_m) * 150;
                    return (
                      <g>
                        <line x1="10" y1={dwlY} x2="210" y2={dwlY} stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3,3" />
                        <text x="212" y={dwlY + 3} fill="#06b6d4" fontSize="8" fontWeight="bold">DWL (T={draft_m}m)</text>
                      </g>
                    );
                  })()}

                  {/* Main Deck (H) */}
                  <line x1="10" y1="30" x2="210" y2="30" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                  <text x="212" y="33" fill="#e2e8f0" fontSize="8">Geladak (H={depth_m}m)</text>

                  {/* Midship Outer Boundary Ghost */}
                  <rect
                    x="20"
                    y="30"
                    width={(breadth_m / 2 / (breadth_m / 2)) * 160}
                    height="150"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />

                  {/* Section Frame Area & Contour */}
                  {(() => {
                    const scaleX = 160 / (breadth_m / 2 || 1);
                    const scaleY = 150 / (depth_m || 1);

                    const x0 = 20 + sectionCurve.p0.x * scaleX;
                    const y0 = 180 - sectionCurve.p0.y * scaleY;

                    const x1 = 20 + sectionCurve.p1.x * scaleX;
                    const y1 = 180 - sectionCurve.p1.y * scaleY;

                    const x2 = 20 + sectionCurve.p2.x * scaleX;
                    const y2 = 180 - sectionCurve.p2.y * scaleY;

                    const x3 = 20 + sectionCurve.p3.x * scaleX;
                    const y3 = 180 - sectionCurve.p3.y * scaleY;

                    const x4 = 20 + sectionCurve.p4.x * scaleX;
                    const y4 = 180 - sectionCurve.p4.y * scaleY;

                    const pathD = `M ${x0},${y0} Q ${x1},${y1} ${x2},${y2} T ${x3},${y3} L ${x4},${y4} L 20,${y4} Z`;

                    return (
                      <g>
                        <path
                          d={pathD}
                          fill={isFore ? "rgba(16, 185, 129, 0.2)" : isAft ? "rgba(99, 102, 241, 0.2)" : "rgba(245, 158, 11, 0.25)"}
                          stroke={isFore ? "#10b981" : isAft ? "#818cf8" : "#f59e0b"}
                          strokeWidth="2"
                        />
                        {/* Half breadth marker */}
                        <line x1="20" y1={y3} x2={x3} y2={y3} stroke="#f59e0b" strokeWidth="1.5" />
                        <text x={(20 + x3) / 2} y={y3 - 4} fill="#f59e0b" fontSize="8" textAnchor="middle" fontWeight="bold">
                          b/2 = {halfBreadth.toFixed(2)}m
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Station Section Specs */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setengah Lebar ($b_i/2$):</span>
                  <strong className="text-amber-400">{halfBreadth.toFixed(2)} m</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Luasan Penampang ($A_i$):</span>
                  <strong className="text-cyan-300">{currArea} m² ({currPct}%)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Karakteristik Bentuk:</span>
                  <span className="text-white font-bold">{isPmb ? "Kotak / PMB Penuh" : isFore ? "U-Shape Haluan Ramping" : "V-Shape Buritan & Skeg"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "theory" && (
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-5">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
            <Info size={16} />
            <span>Prosedur Teknik: Proyeksi Luasan CSA ke Penampang Body Plan</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-cyan-400 font-bold block text-sm">Langkah 1: Ordinat CSA</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Dari diagram nomogram NSP Wageningen atau perhitungan hidrostatik, diperoleh 21 ordinat persentase luasan (<span className="text-cyan-300">%Am</span>) untuk Gading 0 s.d 20.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-amber-400 font-bold block text-sm">Langkah 2: Luas Nyata ($A_i$)</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Luasan melintang tiap stasiun dihitung dengan rumus:
                <br />
                <code className="text-amber-300 block my-1 font-bold">Ai = (%Am / 100) * Am</code>
                dengan <code className="text-white">Am = B * T * Cm</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-emerald-400 font-bold block text-sm">Langkah 3: Half-Breadth ($b_i$)</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Lebar setengah garis air stasiun diestimasi melalui rasio kepenuhan penampang:
                <br />
                <code className="text-emerald-300 block my-1 font-bold">b_i = (B / 2) * Akar(Ai / Am)</code>
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-purple-400 font-bold block text-sm">Langkah 4: Kurva Body Plan</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Titik batas $(b_i, T)$ dan luasan $A_i$ diproyeksikan ke bidang Body Plan. Bentuk kurva U/V disesuaikan agar luasan integral kurva sama persis dengan $A_i$.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pmb" && (
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
            <Box size={16} />
            <span>Karakteristik Parallel Middle Body (PMB) & Pembagian Badan Kapal</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-2">
              <div className="font-bold text-indigo-400 flex items-center justify-between">
                <span>1. Afterbody (Badan Belakang)</span>
                <span className="text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded">St. 0 s.d 7</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bagian buritan yang menyempit dari ujung PMB menuju AP. Memiliki bentuk V-shape di lunas untuk mengakomodasi poros propeller, kemudi, dan aliran air mulus (*wake flow*).
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="font-bold text-cyan-400 flex items-center justify-between">
                <span>2. Parallel Middle Body (PMB)</span>
                <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded">St. 7 s.d 13</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Daerah tengah kapal dengan penampang melintang konstan sebesar Luas Midship ($A_m = 100\%$). Memberikan kapasitas muang kargo maksimum dan kemudahan fabrikasi pelat baja lurus.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center justify-between">
                <span>3. Forebody (Badan Depan)</span>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">St. 13 s.d 20</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bagian haluan yang meruncing dari ujung PMB menuju FP. Berbentuk U-shape ramping atau dilengkapi *bulbous bow* untuk meminimalkan hambatan gelombang air laut (*wave resistance*).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
