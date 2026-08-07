"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  Maximize2,
  FileDown,
  Download,
  Eye,
  Sliders,
  CheckCircle2,
  Table as TableIcon,
  Compass,
  ArrowRight
} from "lucide-react";

interface LinesPlanThreeViewProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
}

export const LinesPlanThreeView: React.FC<LinesPlanThreeViewProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.5,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98
}) => {
  const [activePlanView, setActivePlanView] = useState<"all" | "sheer" | "body" | "halfBreadth" | "offsets">("all");
  const [highlightStation, setHighlightStation] = useState<number | null>(null);

  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(1, draft_m);
  const H = Math.max(2, depth_m);
  const h = LBP / 20;

  // Waterlines definition (WL 0 to DWL + Deck)
  const waterlines = useMemo(() => [
    { id: "WL0", z: 0.0, label: "WL 0 (Baseline / Keel)" },
    { id: "WL1", z: T * 0.25, label: `WL 1 (${(T * 0.25).toFixed(2)}m)` },
    { id: "WL2", z: T * 0.50, label: `WL 2 (${(T * 0.50).toFixed(2)}m)` },
    { id: "WL3", z: T * 0.75, label: `WL 3 (${(T * 0.75).toFixed(2)}m)` },
    { id: "DWL", z: T, label: `DWL (${T.toFixed(2)}m)` },
    { id: "DECK", z: H, label: `Deck (${H.toFixed(2)}m)` }
  ], [T, H]);

  // Generate 21 Station Half-Breadths for each Waterline (Table of Offsets)
  const offsetTable = useMemo(() => {
    return Array.from({ length: 21 }).map((_, stIdx) => {
      // Longitudinal shape factor
      let longFactor = 1.0;
      if (stIdx < 8) {
        // Aft taper
        longFactor = Math.pow(stIdx / 8, 1.3);
      } else if (stIdx > 12) {
        // Fore taper
        longFactor = Math.pow((20 - stIdx) / 8, 1.4);
      }

      const values: Record<string, number> = {};
      waterlines.forEach((wl) => {
        const zRatio = Math.min(1.0, wl.z / (T || 1));
        const vertFactor = wl.z === 0 ? 0 : Math.pow(zRatio, 0.45);
        const deckFlare = wl.z > T ? (1.0 + (wl.z - T) / (H - T || 1) * 0.15) : 1.0;
        
        let y = (B / 2) * longFactor * vertFactor * deckFlare;
        // Midship bottom flat
        if (stIdx >= 8 && stIdx <= 12 && wl.z > T * 0.2) {
          y = B / 2;
        }
        values[wl.id] = Number(Math.max(0, y).toFixed(2));
      });

      return {
        station: stIdx,
        xPos: Number((stIdx * h).toFixed(2)),
        offsets: values
      };
    });
  }, [waterlines, B, T, H, h]);

  // Export Table of Offsets to CSV
  const handleExportCSV = () => {
    const headers = ["Station", "X Position (m)", ...waterlines.map(w => `${w.id} (m)`)];
    const rows = offsetTable.map(row => [
      row.station,
      row.xPos,
      ...waterlines.map(w => row.offsets[w.id])
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `table_of_offsets_LBP_${LBP}m.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6 font-sans text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Studio Rencana Garis 3 Pandangan (Lines Plan 3-View)
              </h2>
              <p className="text-xs text-slate-400">
                Integrasi 3 proyeksi ortogonal standar perkapalan: Sheer Plan (Samping), Body Plan (Gading), dan Half-Breadth Plan (Garis Air).
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "3-View Gabungan" },
            { id: "sheer", label: "Sheer Plan (Samping)" },
            { id: "body", label: "Body Plan (Gading)" },
            { id: "halfBreadth", label: "Half-Breadth (Garis Air)" },
            { id: "offsets", label: "Tabel Offset" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePlanView(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activePlanView === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: 3-VIEW COMBINED OR INDIVIDUAL VIEWS */}
      {(activePlanView === "all" || activePlanView === "sheer") && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                A. Tampak Samping (Sheer Plan / Profile View)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              LBP = {LBP}m | H = {H}m | T = {T}m
            </span>
          </div>

          {/* Sheer Plan SVG */}
          <div className="w-full h-44 bg-slate-950/90 rounded-xl border border-slate-800 relative overflow-hidden p-2 shadow-inner">
            <svg className="w-full h-full" viewBox="0 0 1000 180" preserveAspectRatio="none">
              {/* Baseline */}
              <line x1="50" y1="140" x2="950" y2="140" stroke="#64748b" strokeWidth="1.5" />
              {/* DWL */}
              <line x1="50" y1="90" x2="950" y2="90" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3,3" />
              <text x="45" y="93" fill="#06b6d4" fontSize="9" textAnchor="end">DWL</text>
              {/* Deck */}
              <line x1="50" y1="40" x2="950" y2="40" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2,2" />
              <text x="45" y="43" fill="#e2e8f0" fontSize="9" textAnchor="end">Geladak</text>

              {/* 21 Station Vertical Lines */}
              {Array.from({ length: 21 }).map((_, i) => {
                const x = 50 + (i / 20) * 900;
                const isHovered = highlightStation === i;
                return (
                  <g key={i} onMouseEnter={() => setHighlightStation(i)} onMouseLeave={() => setHighlightStation(null)} className="cursor-pointer">
                    <line
                      x1={x}
                      y1="30"
                      x2={x}
                      y2="145"
                      stroke={isHovered ? "#38bdf8" : i === 0 || i === 20 ? "#f43f5e" : "#1e293b"}
                      strokeWidth={isHovered || i === 0 || i === 20 ? "1.5" : "0.7"}
                    />
                    <text x={x} y="158" fill={isHovered ? "#38bdf8" : "#64748b"} fontSize="9" textAnchor="middle">
                      {i}
                    </text>
                  </g>
                );
              })}

              {/* Hull Sheer Profile Outline */}
              <path
                d="M 50,140 L 80,140 Q 900,140 930,135 Q 960,90 955,30 L 920,38 Q 500,45 80,38 L 40,35 Q 35,90 50,140 Z"
                fill="rgba(14, 165, 233, 0.12)"
                stroke="#0284c7"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* VIEW 2: BODY PLAN */}
      {(activePlanView === "all" || activePlanView === "body") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Body Plan Frame View (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  B. Rencana Bentuk Gading Melintang (Body Plan)
                </h3>
              </div>
              <div className="flex items-center space-x-4 text-[10px]">
                <span className="text-indigo-400 font-bold">← Kiri: Buritan (St 0 s.d 9)</span>
                <span className="text-emerald-400 font-bold">Kanan: Haluan (St 11 s.d 20) →</span>
              </div>
            </div>

            {/* Body Plan SVG */}
            <div className="w-full h-64 bg-slate-950/90 rounded-xl border border-slate-800 relative overflow-hidden p-3 flex items-center justify-center shadow-inner">
              <svg className="w-full h-full" viewBox="-240 -30 480 260">
                {/* Centerline (CL) */}
                <line x1="0" y1="-10" x2="0" y2="210" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,2" />
                <text x="0" y="-15" fill="#f43f5e" fontSize="9" textAnchor="middle" fontWeight="bold">Centerline (CL)</text>

                {/* Baseline (BL) */}
                <line x1="-220" y1="190" x2="220" y2="190" stroke="#64748b" strokeWidth="1.5" />
                <text x="225" y="193" fill="#94a3b8" fontSize="8">Baseline (BL)</text>

                {/* DWL */}
                <line x1="-220" y1="90" x2="220" y2="90" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3,3" />
                <text x="225" y="93" fill="#06b6d4" fontSize="8" fontWeight="bold">DWL (T={T}m)</text>

                {/* Main Deck */}
                <line x1="-220" y1="20" x2="220" y2="20" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="225" y="23" fill="#e2e8f0" fontSize="8">Deck (H={H}m)</text>

                {/* Draw 21 Station Section Lines */}
                {offsetTable.map((row) => {
                  const isFore = row.station > 10;
                  const isMid = row.station === 10;
                  const isAft = row.station < 10;
                  const sign = isFore ? 1 : isAft ? -1 : 1; // Fore to right, Aft to left

                  const yDWL = row.offsets["DWL"] * (200 / (B / 2 || 1));
                  const yDeck = row.offsets["DECK"] * (200 / (B / 2 || 1));
                  const yWL1 = row.offsets["WL1"] * (200 / (B / 2 || 1));

                  const isHovered = highlightStation === row.station;

                  return (
                    <g key={row.station} onMouseEnter={() => setHighlightStation(row.station)} onMouseLeave={() => setHighlightStation(null)}>
                      <path
                        d={`M 0,190 Q ${sign * yWL1 * 0.7},180 ${sign * yDWL},90 L ${sign * yDeck},20`}
                        fill="none"
                        stroke={
                          isHovered ? "#38bdf8" :
                          isMid ? "#f59e0b" :
                          isFore ? "#10b981" : "#818cf8"
                        }
                        strokeWidth={isHovered || isMid ? "2.5" : "1.2"}
                        strokeOpacity={isHovered ? 1 : 0.8}
                      />
                      <text
                        x={sign * yDeck + (sign * 6)}
                        y="18"
                        fill={isHovered ? "#38bdf8" : isFore ? "#10b981" : "#818cf8"}
                        fontSize="8"
                        fontWeight={isHovered ? "bold" : "normal"}
                      >
                        {row.station}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right Info Card: Station Details (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Rincian Station Terpilih
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Arahkan kursor (*hover*) pada kurva gading untuk meninjau dimensi setengah lebar (*half-breadth*) pada tiap elevasi garis air.
              </p>

              {highlightStation !== null ? (
                <div className="space-y-2 bg-slate-950/90 p-4 rounded-xl border border-cyan-500/30 text-xs">
                  <div className="flex justify-between font-bold text-cyan-300 pb-1 border-b border-slate-800">
                    <span>Station {highlightStation}</span>
                    <span>X = {(highlightStation * h).toFixed(2)} m</span>
                  </div>
                  <div className="space-y-1 text-[11px] pt-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Setengah Lebar Geladak:</span>
                      <strong className="text-white">{offsetTable[highlightStation].offsets["DECK"]} m</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Setengah Lebar DWL:</span>
                      <strong className="text-cyan-400">{offsetTable[highlightStation].offsets["DWL"]} m</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Setengah Lebar WL 2:</span>
                      <strong className="text-emerald-400">{offsetTable[highlightStation].offsets["WL2"]} m</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Setengah Lebar WL 1:</span>
                      <strong className="text-indigo-400">{offsetTable[highlightStation].offsets["WL1"]} m</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                  <Compass size={24} className="mx-auto text-slate-600 mb-1" />
                  <span>Sorot stasiun pada gambar untuk melihat koordinat offset gading</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <span className="font-bold text-white block">Catatan Body Plan:</span>
              <span>• Gading 10 (Kuning) adalah penampang terbesar (Midship).</span>
              <span>• Gading haluan melebar ke atas (*flare*) untuk menahan ombak.</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: HALF-BREADTH PLAN */}
      {(activePlanView === "all" || activePlanView === "halfBreadth") && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                C. Rencana Setengah Lebar / Garis Air (Half-Breadth Plan)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">
              Maksimum B/2 = {(B / 2).toFixed(2)}m
            </span>
          </div>

          {/* Half-Breadth Plan SVG */}
          <div className="w-full h-44 bg-slate-950/90 rounded-xl border border-slate-800 relative overflow-hidden p-2 shadow-inner">
            <svg className="w-full h-full" viewBox="0 0 1000 160" preserveAspectRatio="none">
              {/* Centerline (CL) */}
              <line x1="50" y1="20" x2="950" y2="20" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="45" y="23" fill="#f43f5e" fontSize="9" textAnchor="end">Centerline (CL)</text>

              {/* Maximum Breadth Line */}
              <line x1="50" y1="130" x2="950" y2="130" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
              <text x="45" y="133" fill="#94a3b8" fontSize="9" textAnchor="end">B/2 ({(B/2).toFixed(1)}m)</text>

              {/* 21 Station Transverse Lines */}
              {Array.from({ length: 21 }).map((_, i) => {
                const x = 50 + (i / 20) * 900;
                return (
                  <line key={i} x1={x} y1="20" x2={x} y2="135" stroke="#1e293b" strokeWidth="0.8" />
                );
              })}

              {/* Waterlines Contours */}
              {waterlines.map((wl, widx) => {
                const colors = ["#475569", "#818cf8", "#38bdf8", "#34d399", "#06b6d4", "#f59e0b"];
                const color = colors[widx % colors.length];

                const pathD = `M 50,20 ${offsetTable.map((row) => {
                  const x = 50 + (row.station / 20) * 900;
                  const y = 20 + (row.offsets[wl.id] / (B / 2 || 1)) * 110;
                  return `L ${x},${y}`;
                }).join(" ")} L 950,20`;

                return (
                  <g key={wl.id}>
                    <path
                      d={pathD}
                      fill={wl.id === "DWL" ? "rgba(6, 182, 212, 0.08)" : "none"}
                      stroke={color}
                      strokeWidth={wl.id === "DWL" ? "2" : "1.2"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* VIEW 4: TABLE OF OFFSETS */}
      {(activePlanView === "all" || activePlanView === "offsets") && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <TableIcon size={16} className="text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Tabel Offset Setengah Lebar Lambung (Table of Offsets)
              </h3>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-emerald-600/30 self-start sm:self-auto"
            >
              <Download size={13} />
              <span>Ekspor Offset (CSV)</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3 font-bold text-cyan-400">Station</th>
                  <th className="py-2.5 px-3 font-bold text-slate-300">Posisi X (m)</th>
                  {waterlines.map(wl => (
                    <th key={wl.id} className="py-2.5 px-3 font-bold text-white">
                      {wl.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {offsetTable.map((row) => {
                  const isMid = row.station === 10;
                  return (
                    <tr
                      key={row.station}
                      className={`hover:bg-cyan-500/10 transition-colors ${isMid ? "bg-amber-500/10 font-bold" : "even:bg-slate-950/40"}`}
                    >
                      <td className="py-2 px-3 text-cyan-300 font-bold">
                        St. {row.station} {isMid ? "(Midship)" : ""}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{row.xPos}</td>
                      {waterlines.map(wl => (
                        <td key={wl.id} className="py-2 px-3 text-slate-200">
                          {row.offsets[wl.id]}
                        </td>
                      ))}
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
};
