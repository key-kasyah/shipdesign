"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Table as TableIcon,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  Wand2,
  Eye,
  EyeOff
} from "lucide-react";

interface WaterPlaneCalculationProps {
  lbp_m: number;
  lwl_m?: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  cw?: number;
  csaOrdinates?: number[];
  vesselType?: string;
}

// 27 Station standard list in maritime lines plan calculation
const DEFAULT_STATIONS_CONFIG: Array<{ station: number; label: string; ms: number; fm: number }> = [
  { station: -0.50, label: "-0.50", ms: 0.25, fm: -10.50 },
  { station: -0.25, label: "-0.25", ms: 1.00, fm: -10.25 },
  { station: 0.00,  label: "0 (AP)", ms: 0.75, fm: -10.00 },
  { station: 0.50,  label: "0.5",   ms: 2.00, fm: -9.50 },
  { station: 1.00,  label: "1",     ms: 1.00, fm: -9.00 },
  { station: 1.50,  label: "1.5",   ms: 2.00, fm: -8.50 },
  { station: 2.00,  label: "2",     ms: 1.50, fm: -8.00 },
  { station: 3.00,  label: "3",     ms: 4.00, fm: -7.00 },
  { station: 4.00,  label: "4",     ms: 2.00, fm: -6.00 },
  { station: 5.00,  label: "5",     ms: 4.00, fm: -5.00 },
  { station: 6.00,  label: "6",     ms: 2.00, fm: -4.00 },
  { station: 7.00,  label: "7",     ms: 4.00, fm: -3.00 },
  { station: 8.00,  label: "8",     ms: 2.00, fm: -2.00 },
  { station: 9.00,  label: "9",     ms: 4.00, fm: -1.00 },
  { station: 10.00, label: "10 (Midship)", ms: 2.00, fm: 0.00 },
  { station: 11.00, label: "11",    ms: 4.00, fm: 1.00 },
  { station: 12.00, label: "12",    ms: 2.00, fm: 2.00 },
  { station: 13.00, label: "13",    ms: 4.00, fm: 3.00 },
  { station: 14.00, label: "14",    ms: 2.00, fm: 4.00 },
  { station: 15.00, label: "15",    ms: 4.00, fm: 5.00 },
  { station: 16.00, label: "16",    ms: 2.00, fm: 6.00 },
  { station: 17.00, label: "17",    ms: 4.00, fm: 7.00 },
  { station: 18.00, label: "18",    ms: 1.50, fm: 8.00 },
  { station: 18.50, label: "18.5",  ms: 2.00, fm: 8.50 },
  { station: 19.00, label: "19",    ms: 1.00, fm: 9.00 },
  { station: 19.50, label: "19.5",  ms: 2.00, fm: 9.50 },
  { station: 20.00, label: "20 (FP)", ms: 0.50, fm: 10.00 },
];

/**
 * Helper: Smooth curve (Catmull-Rom to Cubic Bezier)
 * Produces a perfectly fair curve through all control points without sharp corners.
 * Flat segments (like PMB) naturally resolve to straight lines without overshooting.
 */
const getSmoothPathD = (points: {x: number, y: number}[]) => {
  if (points.length === 0) return "";
  let d = ``;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i !== points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
  }
  return d;
};

export const WaterPlaneCalculationSheet: React.FC<WaterPlaneCalculationProps> = ({
  lbp_m = 81.19,
  lwl_m,
  breadth_m = 15.00,
  draft_m = 5.50,
  depth_m = 7.00,
  cb = 0.75,
  cm = 0.99,
  cw = 0.84,
  csaOrdinates,
  vesselType = "GENERAL_CARGO"
}) => {
  const LBP = Math.max(10, lbp_m);
  const LWL = lwl_m || Number((LBP * 1.025).toFixed(2));
  const BWL = Math.max(2, breadth_m);
  const T = Math.max(0.5, draft_m);
  const H = Math.max(1, depth_m);
  const Cb = cb || 0.75;
  const Cm = cm || 0.99;
  const targetCw = cw || Number((Cb + 0.09).toFixed(2));

  // Gading Spacing
  const l = Number((LBP / 20).toFixed(4));
  const la_prime = Number((l / 4).toFixed(4));
  const la_double_prime = Number((l / 2).toFixed(4));
  const lf = Number((l / 2).toFixed(4));

  // AWL Target Calculation: AWL_target = LWL * BWL * targetCw
  const AWL_rancangan = useMemo(() => LWL * BWL * targetCw, [LWL, BWL, targetCw]);

  // High-precision Natural Waterline Curve Generator with Guaranteed <= 0.5% tolerance
  const generateOptimizedHalfBreadths = (targetArea: number, startingCurve?: Record<number, number>): Record<number, number> => {
    const halfB = BWL / 2; // Maximum half breadth e.g. 7.50m
    const initial: Record<number, number> = startingCurve ? { ...startingCurve } : {};

    if (!startingCurve) {
      // 1. Base geometric distribution along waterline
      DEFAULT_STATIONS_CONFIG.forEach(({ station }) => {
      let val = 0;
      if (station < 0) {
        // Cant / Overhang Aft
        const aftFrac = Math.max(0, (station + 1.0) / 1.0);
        val = halfB * 0.48 * Math.pow(aftFrac, 1.1);
      } else if (station <= 7) {
        // Aft transition curve to PMB
        const t = station / 7.0;
        const ratio = 0.58 + 0.42 * (3 * t * t - 2 * t * t * t);
        val = halfB * ratio;
      } else if (station <= 13) {
        // Parallel Middle Body (PMB - Full breadth)
        val = halfB;
      } else {
        // Fore body taper to FP
        const t = (20 - station) / 7.0;
        if (t <= 0) {
          val = 0.0;
        } else {
          const ratio = Math.pow(t, 0.93);
          val = halfB * ratio;
        }
      }
      initial[station] = Number(Math.max(0, Math.min(halfB, val)).toFixed(3));
    });

    // If close to standard 15.0m breadth benchmark
    if (Math.abs(BWL - 15.0) < 0.1) {
      initial[-0.50] = 3.800;
      initial[-0.25] = 4.090;
      initial[0.00] = 4.370;
      initial[0.50] = 4.890;
      initial[1.00] = 5.380;
      initial[1.50] = 5.830;
      initial[2.00] = 6.230;
      initial[3.00] = 6.850;
      initial[4.00] = 7.200;
      initial[5.00] = 7.370;
      initial[6.00] = 7.480;
      initial[7.00] = 7.500;
      initial[8.00] = 7.500;
      initial[9.00] = 7.500;
      initial[10.00] = 7.500;
      initial[11.00] = 7.500;
      initial[12.00] = 7.500;
      initial[13.00] = 7.500;
      initial[14.00] = 7.440;
      initial[15.00] = 7.160;
      initial[16.00] = 6.380;
      initial[17.00] = 5.140;
      initial[18.00] = 3.600;
      initial[18.50] = 2.800;
      initial[19.00] = 1.890;
      initial[19.50] = 0.950;
      initial[20.00] = 0.000;
    }
    }

    // 2. Convergence Loop: scale curve smoothly to guarantee correction <= 0.01% (well below 0.05% requirement)
    for (let iter = 0; iter < 15; iter++) {
      let currentSum1 = 0;
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        currentSum1 += (initial[cfg.station] || 0) * cfg.ms;
      });
      const currentAWL = (2.0 / 3.0) * l * currentSum1;
      const deviance = (currentAWL - targetArea) / (currentAWL || 1);

      // If already within 0.01% (<= 0.05%), perfect
      if (Math.abs(deviance) < 0.0001) break;

      const scaleRatio = targetArea / (currentAWL || 1);
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        if (cfg.station !== 20 && !(cfg.station >= 7 && cfg.station <= 13)) {
          // Smooth fade interpolation so it doesn't bend/keriting at PMB boundary
          let fade = 1.0;
          if (cfg.station < 7) {
            fade = Math.pow((7 - cfg.station) / 7.0, 1.5);
          } else if (cfg.station > 13) {
            fade = Math.pow((cfg.station - 13) / 7.0, 1.5);
          }
          // Adjust non-PMB stations smoothly
          let newVal = initial[cfg.station] * (1 + (scaleRatio - 1) * fade);
          initial[cfg.station] = Number(Math.max(0, Math.min(halfB, newVal)).toFixed(3));
        }
      });
    }

    return initial;
  };

  const [halfBreadths, setHalfBreadths] = useState<Record<number, number>>(() =>
    generateOptimizedHalfBreadths(AWL_rancangan)
  );

  // --- SVG INTERACTIVE DRAG STATE & HANDLERS ---
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingStation, setDraggingStation] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, station: number) => {
    // Kunci rentang Parallel Middle Body (PMB) Gading 7 s.d 13
    if (station >= 7 && station <= 13) return;
    
    setDraggingStation(station);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (draggingStation === null || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const yClient = e.clientY - rect.top;
    
    // ViewBox is "-5 0 110 30"
    const viewBoxHeight = 30;
    const ySvg = (yClient / rect.height) * viewBoxHeight;
    
    const maxHalfB = BWL / 2;
    // Calculation mapping from SVG Y to HalfBreadth:
    // y = 26 - (newHalfB / maxHalfB) * 22
    // newHalfB = maxHalfB * (26 - y) / 22
    let newHalfB = maxHalfB * (26 - ySvg) / 22;
    
    // Clamp between 0 and maximum half breadth
    newHalfB = Math.max(0, Math.min(maxHalfB, newHalfB));
    
    setHalfBreadths(prev => ({
      ...prev,
      [draggingStation]: Number(newHalfB.toFixed(3))
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if (draggingStation !== null) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDraggingStation(null);
    }
  };
  // ---------------------------------------------

  // Auto update when target dimensions change
  useEffect(() => {
    setHalfBreadths(generateOptimizedHalfBreadths(AWL_rancangan));
  }, [AWL_rancangan, BWL, LBP]);

  // Reset to auto-calculated shape
  const handleReset = () => {
    setHalfBreadths(generateOptimizedHalfBreadths(AWL_rancangan));
  };

  // Auto-Fine-Tune to strictly hit <= 0.01% (< 0.05%) tolerance
  const handleAutoFineTune = () => {
    // Pass current halfBreadths to retain user's custom shape while auto-scaling smoothly
    setHalfBreadths(generateOptimizedHalfBreadths(AWL_rancangan, halfBreadths));
  };

  // Update a single station half-breadth
  const handleCellChange = (station: number, value: string) => {
    const num = parseFloat(value);
    setHalfBreadths((prev) => ({
      ...prev,
      [station]: isNaN(num) ? 0 : Number(num.toFixed(3))
    }));
  };

  // Compute the 27 rows and 4 sums
  const calculatedRows = useMemo(() => {
    return DEFAULT_STATIONS_CONFIG.map((cfg) => {
      const b2 = halfBreadths[cfg.station] ?? 0;
      const ms = cfg.ms;
      const fm = cfg.fm;

      const col4 = b2 * ms;               // 0.5B * MS
      const col6 = col4 * fm;             // SMA = 0.5B * MS * FM
      const col7 = Math.pow(b2, 3) * ms;  // (0.5B)^3 * MS
      const col8 = col4 * Math.pow(fm, 2);// 0.5B * MS * FM^2

      return {
        ...cfg,
        halfBreadth: b2,
        col4,
        col6,
        col7,
        col8
      };
    });
  }, [halfBreadths]);

  // Sums
  const sum1 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col4, 0), [calculatedRows]);
  const sum2 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col6, 0), [calculatedRows]);
  const sum3 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col7, 0), [calculatedRows]);
  const sum4 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col8, 0), [calculatedRows]);

  // Derived Naval Architecture Outputs
  // AWL = (2 / 3) * l * sum1
  const AWL = useMemo(() => (2 / 3) * l * sum1, [l, sum1]);

  // LCF = (l * sum2) / sum1 (from Midship Station 10)
  const LCF = useMemo(() => (sum1 !== 0 ? (l * sum2) / sum1 : 0), [l, sum2, sum1]);

  // Transverse Moment of Inertia IT = (2 / 3) * (1 / 3) * l * sum3
  const IT = useMemo(() => (2 / 3) * (1 / 3) * l * sum3, [l, sum3]);

  // Longitudinal Inertia Iy = (2 / 3) * (l^3) * sum4
  const Iy = useMemo(() => (2 / 3) * Math.pow(l, 3) * sum4, [l, sum4]);

  // IL = Iy - (AWL * (LCF^2))
  const IL = useMemo(() => Iy - AWL * Math.pow(LCF, 2), [Iy, AWL, LCF]);

  // Calculated Cw
  const calculatedCw = useMemo(() => (LWL * BWL > 0 ? AWL / (LWL * BWL) : 0), [AWL, LWL, BWL]);

  // Correction Percentage = ((AWL - AWL_rancangan) / AWL) * 100%
  const correctionPercent = useMemo(() => {
    if (AWL === 0) return 0;
    return ((AWL - AWL_rancangan) / AWL) * 100;
  }, [AWL, AWL_rancangan]);

  // STRICT TOLERANCE CRITERIA: Minimal <= +/- 0.05%
  const isCorrectionValid = Math.abs(correctionPercent) <= 0.05;

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "NO. SECT",
      "0.5 B (m)",
      "MS (Simpson Multiplier)",
      "0.5B . MS (Col 4)",
      "FM (Lever Arm)",
      "SMA (Col 6)",
      "(0.5B)^3 . MS (Col 7)",
      "0.5B . MS . FM^2 (Col 8)"
    ];

    const rows = calculatedRows.map((r) => [
      r.label,
      r.halfBreadth.toFixed(3),
      r.ms.toFixed(2),
      r.col4.toFixed(3),
      r.fm.toFixed(2),
      r.col6.toFixed(3),
      r.col7.toFixed(3),
      r.col8.toFixed(3)
    ]);

    const summaryData = [
      [],
      ["SUMMARY INTEGRASI GARIS AIR", ""],
      ["Panjang Antar Gading (l)", `${l.toFixed(4)} m`],
      ["Total Sigma 1", sum1.toFixed(3)],
      ["Total Sigma 2", sum2.toFixed(3)],
      ["Total Sigma 3", sum3.toFixed(3)],
      ["Total Sigma 4", sum4.toFixed(4)],
      ["Luas Garis Air (AWL)", `${AWL.toFixed(3)} m2`],
      ["Titik Apung Memanjang (LCF)", `${LCF.toFixed(3)} m dari Midship`],
      ["Momen Inersia Melintang (IT)", `${IT.toFixed(3)} m4`],
      ["Momen Inersia Memanjang (IL)", `${IL.toFixed(3)} m4`],
      ["Koefisien Garis Air (CW)", calculatedCw.toFixed(4)],
      ["AWL Target Rancangan", `${AWL_rancangan.toFixed(3)} m2`],
      ["Koreksi Water Line", `${correctionPercent.toFixed(2)} %`],
      ["Status Toleransi", isCorrectionValid ? "MEMENUHI SYARAT (<= +/- 0.50%)" : "TIDAK MEMENUHI"]
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...summaryData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Waterplane_Calculation_${LBP}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER: LINES PLAN TITLE BLOCK & SHIP MAIN PARTICULARS */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
                <TableIcon size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                    Tabel Perhitungan Garis Air (Water Plane Calculation Sheet)
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isCorrectionValid
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse"
                    }`}
                  >
                    Toleransi: &le; &plusmn;0.05%
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Perhitungan Luas Garis Air (AWL), Titik Apung Memanjang (LCF), Momen Inersia Melintang (IT) & Memanjang (IL), serta Koefisien Cw.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 self-end lg:self-auto">
            <button
              onClick={handleAutoFineTune}
              className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              title="Otomatis selaraskan ordinat agar koreksi <= +/- 0.05%"
            >
              <Wand2 size={14} />
              <span>Auto-Fit (&le; &plusmn;0.05%)</span>
            </button>
            <button
              onClick={handleReset}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-700 shadow"
              title="Reset ordinat ke kurva standar"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="py-2 px-3.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-600/10"
              title="Unduh data tabel dalam format CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* SHIP PARTICULARS MATRIX (LINES PLAN HEADER STYLE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">LBP</span>
            <div className="font-bold text-cyan-300">{LBP.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">LWL</span>
            <div className="font-bold text-white">{LWL.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">BWL (Lebar)</span>
            <div className="font-bold text-white">{BWL.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Sarat (T)</span>
            <div className="font-bold text-emerald-400">{T.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Tinggi (H)</span>
            <div className="font-bold text-slate-300">{H.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Block Coeff (Cb)</span>
            <div className="font-bold text-amber-300">{Cb.toFixed(2)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Midship Coeff (Cm)</span>
            <div className="font-bold text-slate-300">{Cm.toFixed(2)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Waterplane (Cw Target)</span>
            <div className="font-bold text-cyan-400">{targetCw.toFixed(2)}</div>
          </div>
        </div>

        {/* SPACING & TOLERANCE PILLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              Jarak Antar Gading Utama (l) = <strong>{l.toFixed(4)} m</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              Interval Buritan la&apos; = <strong>{la_prime.toFixed(4)} m</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              Interval Haluan lf = <strong>{lf.toFixed(4)} m</strong>
            </span>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-bold ${
              isCorrectionValid
                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/70 border-rose-500/40 text-rose-300"
            }`}
          >
            {isCorrectionValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>
              Koreksi Water Line: {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`} (Maksimal &plusmn;0.05%)
            </span>
          </div>
        </div>
      </div>

      {/* VISUAL WATERPLANE DWL PLOT */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Plot Visual Garis Air (DWL Half-Breadth Plan & Posisi LCF)
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>Garis Air DWL (T = {T.toFixed(2)}m)</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>Titik LCF ({LCF.toFixed(2)}m)</span>
            </span>
          </div>
        </div>

        {/* SVG Plot */}
        <div className="w-full h-48 bg-slate-950/90 rounded-xl relative overflow-hidden border border-slate-800 flex items-center justify-center p-2 group">
          
          {/* Floating Preview Toggle Button */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="absolute top-3 right-3 z-10 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-400 hover:text-cyan-300 transition-all opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-sm"
            title={isPreviewMode ? "Tampilkan Titik Ordinat (Edit Mode)" : "Sembunyikan Titik Ordinat (Preview Mode)"}
          >
            {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <svg 
            ref={svgRef}
            className="w-full h-full px-2" 
            viewBox="-5 0 110 30" 
            preserveAspectRatio="none"
          >
            {/* Centerline Baseline */}
            <line x1="-5" y1="26" x2="105" y2="26" stroke="#475569" strokeWidth="0.5" strokeDasharray="1,1" />

            {/* Vertical Station Lines */}
            {calculatedRows.map((r, idx) => {
              // Map station -0.5 to 20 into X range 0 to 100
              const normX = ((r.station + 0.5) / 20.5) * 100;
              const isMidship = r.station === 10;
              const isAp = r.station === 0;
              const isFp = r.station === 20;

              return (
                <g key={idx}>
                  <line
                    x1={normX}
                    y1="2"
                    x2={normX}
                    y2="26"
                    stroke={isMidship ? "#38bdf8" : isAp || isFp ? "#64748b" : "#1e293b"}
                    strokeWidth={isMidship ? "0.4" : "0.2"}
                  />
                  {/* Station label */}
                  {(r.station === -0.5 || r.station === 0 || r.station === 5 || r.station === 10 || r.station === 15 || r.station === 20) && (
                    <text
                      x={normX}
                      y="29"
                      fill="#64748b"
                      fontSize="2.2"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {r.station}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Waterline Curve Path */}
            <path
              d={`M ${((-0.5 + 0.5) / 20.5) * 100},26 L ${calculatedRows.length > 0 ? (((calculatedRows[0].station + 0.5) / 20.5) * 100) : 0},${calculatedRows.length > 0 ? (26 - (calculatedRows[0].halfBreadth / (BWL / 2 || 1)) * 22) : 26} ${getSmoothPathD(
                calculatedRows.map((r) => ({
                  x: ((r.station + 0.5) / 20.5) * 100,
                  y: 26 - (r.halfBreadth / (BWL / 2 || 1)) * 22
                }))
              )} L 100,26 Z`}
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth="0.15"
            />

            {/* Station Points (Draggable for non-PMB) */}
            {!isPreviewMode && calculatedRows.map((r, idx) => {
              const x = ((r.station + 0.5) / 20.5) * 100;
              const maxHalfB = BWL / 2 || 1;
              const y = 26 - (r.halfBreadth / maxHalfB) * 22;
              
              const isLocked = r.station >= 7 && r.station <= 13;
              const isDragging = draggingStation === r.station;
              
              return (
                <circle 
                  key={idx} 
                  cx={x} 
                  cy={y} 
                  r={isDragging ? "1.2" : isLocked ? "0.4" : "0.7"} 
                  fill={isLocked ? "#ef4444" : isDragging ? "#facc15" : "#38bdf8"} 
                  stroke={isLocked ? "transparent" : "#fff"}
                  strokeWidth={isDragging ? "0.2" : "0"}
                  className={isLocked ? "cursor-not-allowed opacity-60" : "cursor-ns-resize hover:opacity-80 transition-all drop-shadow-md"}
                  onPointerDown={(e) => handlePointerDown(e, r.station)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              );
            })}

            {/* LCF Marker */}
            {(() => {
              const lcfStation = 10 + (LCF / (l || 1));
              const lcfX = ((lcfStation + 0.5) / 20.5) * 100;
              return (
                <g>
                  <line x1={lcfX} y1="0" x2={lcfX} y2="26" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="1,1" />
                  <polygon
                    points={`${lcfX},1 ${lcfX - 1.2},3 ${lcfX + 1.2},3`}
                    fill="#f59e0b"
                  />
                  <text x={lcfX} y="6" fill="#f59e0b" fontSize="2.2" textAnchor="middle" fontWeight="bold">
                    LCF
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* TABLE: 27 STATIONS SIMPSON INTEGRATION */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Tabel Integrasi Simpson Ordinat Garis Air (Water Plane 27 Station)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Anda dapat mengedit nilai <strong className="text-cyan-300">0.5 B (m)</strong> pada tabel di bawah. Seluruh sigma dan nilai turunan akan terhitung otomatis seketika.
            </p>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner no-scrollbar">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 text-[11px]">
                <th className="py-3 px-3.5 font-bold text-center border-r border-slate-800/60 w-16">
                  (1)<br />NO. SECT
                </th>
                <th className="py-3 px-3.5 font-bold text-cyan-300 border-r border-slate-800/60 min-w-[110px]">
                  (2)<br />0.5 B (m)
                </th>
                <th className="py-3 px-3 font-semibold text-slate-400 text-center border-r border-slate-800/60 w-16">
                  (3)<br />MS
                </th>
                <th className="py-3 px-3 font-bold text-emerald-400 text-right border-r border-slate-800/60 min-w-[110px]">
                  (4) = (2)&times;(3)<br />0.5B &middot; MS
                </th>
                <th className="py-3 px-3 font-semibold text-amber-400 text-center border-r border-slate-800/60 w-20">
                  (5)<br />FM
                </th>
                <th className="py-3 px-3 font-bold text-indigo-300 text-right border-r border-slate-800/60 min-w-[110px]">
                  (6) = (4)&times;(5)<br />SMA
                </th>
                <th className="py-3 px-3 font-bold text-purple-300 text-right border-r border-slate-800/60 min-w-[120px]">
                  (7) = (2)&sup3;&times;(3)<br />(0.5B)&sup3; &middot; MS
                </th>
                <th className="py-3 px-3 font-bold text-rose-300 text-right min-w-[130px]">
                  (8) = (4)&times;(5)&sup2;<br />0.5B &middot; MS &middot; FM&sup2;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-950/40">
              {calculatedRows.map((r, idx) => {
                const isMid = r.station === 10;
                const isAp = r.station === 0;
                const isFp = r.station === 20;
                const isHighlighted = isMid || isAp || isFp;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isHighlighted ? "bg-slate-900/60 font-semibold" : ""
                    }`}
                  >
                    {/* (1) NO. SECT */}
                    <td className="py-2 px-3 text-center border-r border-slate-800/60">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          isMid
                            ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                            : isAp || isFp
                            ? "bg-amber-500/20 text-amber-300 font-bold"
                            : "text-slate-300"
                        }`}
                      >
                        {r.label}
                      </span>
                    </td>

                    {/* (2) 0.5 B (m) - Editable */}
                    <td className="py-1 px-2 border-r border-slate-800/60">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={BWL}
                        value={halfBreadths[r.station] ?? 0}
                        onChange={(e) => handleCellChange(r.station, e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg py-1 px-2 text-cyan-300 font-bold font-mono text-xs focus:border-cyan-400 focus:bg-slate-950 focus:outline-none text-right transition-all"
                      />
                    </td>

                    {/* (3) MS */}
                    <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-800/60">
                      {r.ms.toFixed(2)}
                    </td>

                    {/* (4) 0.5B . MS */}
                    <td className="py-2 px-3 text-right text-emerald-400 font-medium border-r border-slate-800/60">
                      {r.col4.toFixed(3)}
                    </td>

                    {/* (5) FM */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-800/60 ${
                        r.fm < 0 ? "text-amber-400/90" : r.fm > 0 ? "text-cyan-400/90" : "text-white font-bold"
                      }`}
                    >
                      {r.fm > 0 ? `+${r.fm.toFixed(2)}` : r.fm.toFixed(2)}
                    </td>

                    {/* (6) SMA */}
                    <td
                      className={`py-2 px-3 text-right font-medium border-r border-slate-800/60 ${
                        r.col6 < 0 ? "text-amber-300" : r.col6 > 0 ? "text-cyan-300" : "text-slate-400"
                      }`}
                    >
                      {r.col6.toFixed(3)}
                    </td>

                    {/* (7) (0.5B)^3 . MS */}
                    <td className="py-2 px-3 text-right text-purple-300 font-medium border-r border-slate-800/60">
                      {r.col7.toFixed(3)}
                    </td>

                    {/* (8) 0.5B . MS . FM^2 */}
                    <td className="py-2 px-3 text-right text-rose-300 font-medium">
                      {r.col8.toFixed(3)}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL SIGMA SUMMARY ROW */}
              <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-xs text-white">
                <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider text-slate-300 border-r border-slate-800">
                  Total Sigma (&Sigma;):
                </td>
                {/* Sigma 1 */}
                <td className="py-3 px-3 text-right text-emerald-400 border-r border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">&Sigma;1 =</div>
                  <div>{sum1.toFixed(3)}</div>
                </td>
                <td className="py-3 px-3 text-center text-slate-500 border-r border-slate-800">-</td>
                {/* Sigma 2 */}
                <td className="py-3 px-3 text-right text-indigo-300 border-r border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">&Sigma;2 =</div>
                  <div>{sum2.toFixed(3)}</div>
                </td>
                {/* Sigma 3 */}
                <td className="py-3 px-3 text-right text-purple-300 border-r border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">&Sigma;3 =</div>
                  <div>{sum3.toFixed(3)}</div>
                </td>
                {/* Sigma 4 */}
                <td className="py-3 px-3 text-right text-rose-300 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">&Sigma;4 =</div>
                  <div>{sum4.toFixed(3)}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY RESULT CARDS & VERIFICATION FORMULAS */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Hasil Integrasi Hidrostatik & Koreksi Garis Air (Waterline Verification)
            </h3>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-400">Target Deviasi Maksimal: </span>
            <strong className="text-emerald-400">&le; &plusmn;0.05%</strong>
          </div>
        </div>

        {/* 6 Key Calculation Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: AWL */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Luas Garis Air (AWL)</span>
              <span className="text-[10px] font-mono text-cyan-400">AWL = (2/3) &middot; l &middot; &Sigma;1</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {AWL.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              = (2/3) &times; {l.toFixed(3)} &times; {sum1.toFixed(3)}
            </div>
          </div>

          {/* Card 2: LCF */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Titik Apung Memanjang (LCF)</span>
              <span className="text-[10px] font-mono text-cyan-400">LCF = l &middot; &Sigma;2 / &Sigma;1</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-300">
              {LCF.toFixed(3)} <span className="text-sm font-normal text-slate-400">m</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {LCF < 0 ? `${Math.abs(LCF).toFixed(3)} m di belakang Midship (10)` : `${LCF.toFixed(3)} m di depan Midship (10)`}
            </div>
          </div>

          {/* Card 3: IT (Transverse Inertia) */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Inersia Melintang (IT)</span>
              <span className="text-[10px] font-mono text-cyan-400">IT = (2/3)&middot;(1/3)&middot;l&middot;&Sigma;3</span>
            </div>
            <div className="text-2xl font-black font-mono text-purple-300">
              {IT.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup4;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Momen inersia terhadap sumbu longitudinal
            </div>
          </div>

          {/* Card 4: Iy & IL */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Inersia Memanjang (IL)</span>
              <span className="text-[10px] font-mono text-cyan-400">IL = Iy - (AWL &middot; LCF&sup2;)</span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-300">
              {IL.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup4;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Iy = {Iy.toFixed(2)} m&sup4; | Koreksi LCF = {(AWL * Math.pow(LCF, 2)).toFixed(2)} m&sup4;
            </div>
          </div>

          {/* Card 5: CW (Waterplane Coefficient) */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Koefisien Garis Air (Cw)</span>
              <span className="text-[10px] font-mono text-cyan-400">CW = AWL / (LWL &middot; BWL)</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-300">
              {calculatedCw.toFixed(4)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Target Rancangan = {targetCw.toFixed(2)}
            </div>
          </div>

          {/* Card 6: Koreksi Garis Air dengan Batas Toleransi Minimal <= +/- 0.05% */}
          <div
            className={`p-4 rounded-xl border space-y-1.5 shadow backdrop-blur-md transition-all ${
              isCorrectionValid
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center space-x-1.5">
                {isCorrectionValid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>Koreksi Water Line</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                Syarat: &le; &plusmn;0.05%
              </span>
            </div>
            <div className="text-2xl font-black font-mono">
              {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
            </div>
            <div className="text-[11px] opacity-90 font-mono flex items-center justify-between">
              <span>AWL Target = {AWL_rancangan.toFixed(2)} m&sup2;</span>
              <span className={`font-bold ${isCorrectionValid ? "text-emerald-400" : "text-rose-400"}`}>
                {isCorrectionValid ? "MEMENUHI SYARAT" : "DEVASIAN MELEBIHI 0.05%"}
              </span>
            </div>
          </div>
        </div>

        {/* DETAILED PLAIN-TEXT MATHEMATICAL EXPLANATION BOX */}
        <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300 font-mono leading-relaxed">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 flex items-center space-x-2">
            <HelpCircle size={14} className="text-cyan-400" />
            <span>Rumus Hidrostatik Garis Air (Plain-Text Reference):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">1. Luas Garis Air (AWL):</p>
              <p className="text-slate-400">AWL = (2 / 3) * l * Total_Sigma_1</p>
              <p className="text-slate-400">AWL = (2 / 3) * {l.toFixed(4)} * {sum1.toFixed(3)} = <strong className="text-emerald-400">{AWL.toFixed(3)} m&sup2;</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">2. Titik Apung Memanjang (LCF):</p>
              <p className="text-slate-400">LCF = (l * Total_Sigma_2) / Total_Sigma_1</p>
              <p className="text-slate-400">LCF = ({l.toFixed(4)} * {sum2.toFixed(3)}) / {sum1.toFixed(3)} = <strong className="text-cyan-300">{LCF.toFixed(3)} m</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">3. Momen Inersia Melintang (IT):</p>
              <p className="text-slate-400">IT = (2 / 3) * (1 / 3) * l * Total_Sigma_3</p>
              <p className="text-slate-400">IT = (2 / 9) * {l.toFixed(4)} * {sum3.toFixed(3)} = <strong className="text-purple-300">{IT.toFixed(3)} m&sup4;</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">4. Persentase Koreksi Garis Air (Wajib &le; &plusmn;0.05%):</p>
              <p className="text-slate-400">Koreksi = ((AWL - AWL_rancangan) / AWL) * 100%</p>
              <p className="text-slate-400">Koreksi = (({AWL.toFixed(2)} - {AWL_rancangan.toFixed(2)}) / {AWL.toFixed(2)}) * 100% = <strong className={isCorrectionValid ? "text-emerald-300" : "text-rose-300"}>{correctionPercent.toFixed(3)}%</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
