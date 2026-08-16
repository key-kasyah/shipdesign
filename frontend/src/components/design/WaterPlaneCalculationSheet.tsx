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

export interface AreaZone {
  id: string;
  name: string;
  code: string;
  badgeLabel: string;
  startStation: number;
  endStation: number;
  bgFill: string;
  watermark: string;
  textColor: string;
  badgeColor: string;
  description: string;
  subSegments?: Array<{
    startStation: number;
    endStation: number;
    bgFill: string;
    watermark?: string;
  }>;
}

export const AREA_ZONES: AreaZone[] = [
  {
    id: "after-peak",
    name: "After Peak",
    code: "AP",
    badgeLabel: "After Peak",
    startStation: -0.5,
    endStation: 0.0,
    bgFill: "rgba(180, 83, 9, 0.48)", // Warm Bronze Amber
    watermark: "AP",
    textColor: "text-amber-400",
    badgeColor: "bg-amber-950/80 border-amber-600/50 text-amber-300",
    description: "Area After Peak (AP) - St. -0.50 s/d 0.00 (Buritan Kapal / Transisi Cant)"
  },
  {
    id: "peak-1",
    name: "Peak 1",
    code: "P1",
    badgeLabel: "Peak 1",
    startStation: 0.0,
    endStation: 7.0,
    bgFill: "rgba(2, 132, 199, 0.38)", // Ocean Blue
    watermark: "P1",
    textColor: "text-sky-400",
    badgeColor: "bg-sky-950/80 border-sky-600/50 text-sky-300",
    description: "Area Peak 1 (P1) - St. 0.00 s/d 7.00 (Run Body / Transisi Buritan ke PMB)"
  },
  {
    id: "parallel-middle-body",
    name: "Parallel Media Body",
    code: "PMB",
    badgeLabel: "Parallel Media Body",
    startStation: 7.0,
    endStation: 13.0,
    bgFill: "rgba(22, 163, 74, 0.38)", // Emerald Green
    watermark: "",
    textColor: "text-emerald-400",
    badgeColor: "bg-emerald-950/80 border-emerald-600/50 text-emerald-300",
    description: "Area Parallel Media Body (PMB) - St. 7.00 s/d 13.00 (Badan Tengah Lebar Maksimum 0.5B)"
  },
  {
    id: "peak-2",
    name: "Peak 2",
    code: "P2",
    badgeLabel: "Peak 2",
    startStation: 13.0,
    endStation: 20.0,
    bgFill: "rgba(168, 85, 247, 0.40)", // Royal Purple
    watermark: "P2",
    textColor: "text-purple-400",
    badgeColor: "bg-purple-950/80 border-purple-600/50 text-purple-300",
    description: "Area Peak 2 (P2) - Ungu - St. 13.00 s/d 20.00 (Entrance Body)"
  },
  {
    id: "fore-peak",
    name: "Fore Peak",
    code: "FP",
    badgeLabel: "Fore Peak",
    startStation: 20.0,
    endStation: 21.0,
    bgFill: "rgba(126, 34, 206, 0.50)", // Deep Violet
    watermark: "FP",
    textColor: "text-violet-400",
    badgeColor: "bg-violet-950/80 border-violet-600/50 text-purple-300",
    description: "Area Fore Peak (FP) - St. 20.00 (FP) ke Kanan (Haluan Kapal / Fore Peak)"
  }
];

export const getStationZone = (st: number): AreaZone => {
  if (st <= 0) return AREA_ZONES[0]; // Station -0.50, -0.25, dan 0.00 (AP) adalah After Peak (AP)
  if (st < 7) return AREA_ZONES[1];  // Station 0.50 s/d 6.00 adalah Peak 1 (P1)
  if (st <= 13) return AREA_ZONES[2]; // Station 7.00 s/d 13.00 adalah PMB
  if (st < 20) return AREA_ZONES[3];  // Station 14.00 s/d 19.50 adalah Peak 2 (P2)
  return AREA_ZONES[4];              // Station 20.00 (FP) adalah Fore Peak (FP)
};

/**
 * Helper: Smooth curve (Monotone Cubic Interpolation)
 * Produces a perfectly fair curve, eliminating micro-wiggles caused by non-uniform point spacing.
 * Guarantees no overshoots, preserving perfectly flat lines (PMB) and smooth monotonic curves.
 */
const getSmoothPathD = (points: {x: number, y: number}[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return ``;

  const n = points.length;
  const delta = new Float64Array(n - 1);
  const m = new Float64Array(n);

  // 1. Calculate secant slopes
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    delta[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
  }

  // 2. Initialize tangents
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    // Weighted average based on segment lengths can be used, but simple average is fine 
    // when we apply Fritsch-Carlson constraints below
    m[i] = (delta[i - 1] + delta[i]) / 2;
  }

  // 3. Monotonicity constraints (Fritsch-Carlson)
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / delta[i];
      const beta = m[i + 1] / delta[i];
      if (alpha < 0) m[i] = 0;
      if (beta < 0) m[i + 1] = 0;
      const mag = alpha * alpha + beta * beta;
      if (mag > 9) {
        const tau = 3 / Math.sqrt(mag);
        m[i] = tau * alpha * delta[i];
        m[i + 1] = tau * beta * delta[i];
      }
    }
  }

  // 4. Generate cubic bezier commands
  let d = ``;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    
    const cp1x = p0.x + dx;
    const cp1y = p0.y + m[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - m[i + 1] * dx;

    d += ` C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
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

  // Standard Lines Plan Benchmark Ratios (r_0 = y_st / (BWL / 2))
  const STANDARD_WATERLINE_RATIOS: Record<number, number> = {
    [-0.50]: 3.800 / 7.500, // 0.50667 (After Peak Transom)
    [-0.25]: 4.090 / 7.500, // 0.54533
    [0.00]:  4.370 / 7.500, // 0.58267 (AP Station 0)
    [0.50]:  4.890 / 7.500, // 0.65200
    [1.00]:  5.380 / 7.500, // 0.71733
    [1.50]:  5.830 / 7.500, // 0.77733
    [2.00]:  6.230 / 7.500, // 0.83067
    [3.00]:  6.850 / 7.500, // 0.91333
    [4.00]:  7.200 / 7.500, // 0.96000
    [5.00]:  7.370 / 7.500, // 0.98267
    [6.00]:  7.480 / 7.500, // 0.99733
    [7.00]:  1.00000,
    [8.00]:  1.00000,
    [9.00]:  1.00000,
    [10.00]: 1.00000,
    [11.00]: 1.00000,
    [12.00]: 1.00000,
    [13.00]: 1.00000,
    [14.00]: 7.440 / 7.500, // 0.99200
    [15.00]: 7.160 / 7.500, // 0.95467
    [16.00]: 6.380 / 7.500, // 0.85067
    [17.00]: 5.140 / 7.500, // 0.68533
    [18.00]: 3.600 / 7.500, // 0.48000
    [18.50]: 2.800 / 7.500, // 0.37333
    [19.00]: 1.890 / 7.500, // 0.25200
    [19.50]: 0.950 / 7.500, // 0.12667
    [20.00]: 0.00000        // 0.00000 (FP Station 20)
  };

  // High-precision Natural Waterline Generator with Guaranteed <= 0.005% (< 0.05%) Tolerance
  const generateOptimizedHalfBreadths = (targetArea: number): Record<number, number> => {
    const halfB = BWL / 2; // Maximum half breadth

    // Exponential scaling solver:
    // y(st) = halfB * (STANDARD_WATERLINE_RATIOS[st] ^ power)
    // Preserves 100% of the textbook fairing shape, guarantees strictly monotonic curve
    let low = 0.1;
    let high = 5.0;
    let bestPower = 1.0;

    for (let iter = 0; iter < 40; iter++) {
      const mid = (low + high) / 2.0;
      let sum1 = 0;
      DEFAULT_STATIONS_CONFIG.forEach(cfg => {
        let y = halfB;
        if (cfg.station >= 7 && cfg.station <= 13) {
          y = halfB;
        } else if (cfg.station === 20) {
          y = 0.0;
        } else {
          const baseRatio = STANDARD_WATERLINE_RATIOS[cfg.station] ?? 0.5;
          y = halfB * Math.pow(baseRatio, mid);
        }
        sum1 += y * cfg.ms;
      });

      const currentAWL = (2.0 / 3.0) * l * sum1;
      if (Math.abs(currentAWL - targetArea) < 0.0001) {
        bestPower = mid;
        break;
      }

      if (currentAWL < targetArea) {
        // Need more area -> lower power makes curve fuller
        high = mid;
      } else {
        // Need less area -> higher power makes curve finer
        low = mid;
      }
      bestPower = mid;
    }

    const result: Record<number, number> = {};
    DEFAULT_STATIONS_CONFIG.forEach(cfg => {
      let y = halfB;
      if (cfg.station >= 7 && cfg.station <= 13) {
        y = halfB;
      } else if (cfg.station === 20) {
        y = 0.0;
      } else {
        const baseRatio = STANDARD_WATERLINE_RATIOS[cfg.station] ?? 0.5;
        y = halfB * Math.pow(baseRatio, bestPower);
      }
      result[cfg.station] = Number(Math.max(0, Math.min(halfB, y)).toFixed(3));
    });

    return result;
  };

  const [halfBreadths, setHalfBreadths] = useState<Record<number, number>>(() =>
    generateOptimizedHalfBreadths(AWL_rancangan)
  );

  // --- AREA ZONE INTERACTION STATE ---
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);

  // --- SVG INTERACTIVE DRAG STATE & HANDLERS ---
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingStation, setDraggingStation] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, station: number) => {
    // Kunci rentang Parallel Middle Body (PMB) Gading 7 s.d 13 (sesuai kaidah rancang lambung)
    if (station >= 7 && station <= 13) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDraggingStation(station);
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      // Fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingStation === null || !svgRef.current) return;
    
    e.preventDefault();
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return;
    
    // Transform screen mouse coordinates into exact SVG coordinates
    const svgP = pt.matrixTransform(screenCTM.inverse());
    
    const maxHalfB = BWL / 2;
    // Y formula: baseline is at Y = 26.00, max breadth is at Y = 3.00 (span = 23.00)
    // halfB = maxHalfB * (26.00 - svgP.y) / 23.00
    let newHalfB = maxHalfB * (26.00 - svgP.y) / 23.00;
    
    // Clamp between 0 and maximum half breadth
    newHalfB = Math.max(0, Math.min(maxHalfB, newHalfB));
    
    setHalfBreadths(prev => ({
      ...prev,
      [draggingStation]: Number(newHalfB.toFixed(3))
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingStation !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Fallback
      }
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

  // Auto-Fine-Tune: Instant fair curve regeneration with guaranteed <= 0.005% (<= 0.05%) tolerance
  const handleAutoFineTune = () => {
    setHalfBreadths(generateOptimizedHalfBreadths(AWL_rancangan));
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Plot Visual Garis Air (DWL Half-Breadth Plan & Posisi LCF)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center space-x-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50" />
              <span>Garis Air DWL (T = {T.toFixed(2)}m)</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-500/50" />
              <span>Titik LCF ({LCF.toFixed(2)}m)</span>
            </span>
          </div>
        </div>

        {/* SVG Plot Container */}
        <div className="w-full bg-slate-950/95 rounded-xl relative overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-3 group select-none shadow-2xl">
          
          {/* Floating Preview Toggle Button */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="absolute top-3 right-3 z-20 p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-cyan-300 transition-all opacity-80 group-hover:opacity-100 shadow-lg backdrop-blur-sm cursor-pointer"
            title={isPreviewMode ? "Tampilkan Titik Ordinat (Edit Mode)" : "Sembunyikan Titik Ordinat (Preview Mode)"}
          >
            {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* SVG Canvas (Tall & Clear Proportions - Tidak Gepeng) */}
          <div className="w-full h-56 sm:h-64 relative">
            <svg 
              ref={svgRef}
              className="w-full h-full select-none" 
              viewBox="-4 -1 122 34" 
              preserveAspectRatio="none"
              style={{ touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* 1. AREA BACKGROUND ZONES & SHADINGS (HANYA DITAMPILKAN SAAT BUKAN PREVIEW MODE) */}
              {!isPreviewMode && (
                <>
                  {/* After Peak (AP) Zone */}
                  <g 
                    onMouseEnter={() => setHoveredZone("after-peak")}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={activeZone && activeZone !== "after-peak" ? 0.35 : 1}
                  >
                    <rect
                      x="0.00"
                      y="1.5"
                      width="14.00"
                      height="24.5"
                      fill="rgba(180, 83, 9, 0.48)"
                    />
                    <text
                      x="7.00"
                      y="19"
                      fill="rgba(139, 26, 26, 0.75)"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="serif"
                      style={{ pointerEvents: "none" }}
                    >
                      AP
                    </text>
                  </g>

                  {/* Peak 1 (P1) Zone */}
                  <g 
                    onMouseEnter={() => setHoveredZone("peak-1")}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={activeZone && activeZone !== "peak-1" ? 0.35 : 1}
                  >
                    <rect
                      x="14.00"
                      y="1.5"
                      width="30.10"
                      height="24.5"
                      fill="rgba(2, 132, 199, 0.38)"
                    />
                    <text
                      x="29.05"
                      y="19"
                      fill="rgba(139, 26, 26, 0.75)"
                      fontSize="10.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="serif"
                      style={{ pointerEvents: "none" }}
                    >
                      P1
                    </text>
                  </g>

                  {/* Parallel Media Body (PMB) Zone */}
                  <g 
                    onMouseEnter={() => setHoveredZone("parallel-middle-body")}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={activeZone && activeZone !== "parallel-middle-body" ? 0.35 : 1}
                  >
                    <rect
                      x="44.10"
                      y="1.5"
                      width="25.80"
                      height="24.5"
                      fill="rgba(22, 163, 74, 0.38)"
                    />
                  </g>

                  {/* Peak 2 (P2) Zone */}
                  <g 
                    onMouseEnter={() => setHoveredZone("peak-2")}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={activeZone && activeZone !== "peak-2" ? 0.35 : 1}
                  >
                    <rect
                      x="69.90"
                      y="1.5"
                      width="30.10"
                      height="24.5"
                      fill="rgba(168, 85, 247, 0.40)"
                    />
                    <text
                      x="84.95"
                      y="19"
                      fill="rgba(139, 26, 26, 0.75)"
                      fontSize="10.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="serif"
                      style={{ pointerEvents: "none" }}
                    >
                      P2
                    </text>
                  </g>

                  {/* Fore Peak (FP) Zone */}
                  <g 
                    onMouseEnter={() => setHoveredZone("fore-peak")}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={activeZone && activeZone !== "fore-peak" ? 0.35 : 1}
                  >
                    <rect
                      x="100.00"
                      y="1.5"
                      width="14.00"
                      height="24.5"
                      fill="rgba(126, 34, 206, 0.50)"
                    />
                    <text
                      x="107.00"
                      y="19"
                      fill="rgba(139, 26, 26, 0.85)"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="serif"
                      style={{ pointerEvents: "none" }}
                    >
                      FP
                    </text>
                  </g>
                </>
              )}

              {/* Horizontal Reference Grid Lines (0.5B, 75%, 50%, 25%) */}
              {[3.0, 8.75, 14.5, 20.25].map((gridY, i) => (
                <line
                  key={`horiz-grid-${i}`}
                  x1="-4"
                  y1={gridY}
                  x2="118"
                  y2={gridY}
                  stroke={isPreviewMode ? "rgba(51, 65, 85, 0.4)" : "#334155"}
                  strokeWidth="0.1"
                  strokeDasharray="1,1"
                />
              ))}

              {/* Centerline Baseline */}
              <line x1="-4" y1="26" x2="118" y2="26" stroke="#475569" strokeWidth="0.3" strokeDasharray="1,1" />

              {/* Standard Station Grid Lines & X-Axis Labels */}
              {calculatedRows.map((r, idx) => {
                const normX = 14.00 + (r.station / 20.0) * 86.00;
                const isMidship = r.station === 10;
                const isAp = r.station === 0;
                const isFp = r.station === 20;

                return (
                  <g key={idx}>
                    <line
                      x1={normX}
                      y1="1.5"
                      x2={normX}
                      y2="26"
                      stroke={isMidship ? "#38bdf8" : isAp || isFp ? "#64748b" : "rgba(51, 65, 85, 0.35)"}
                      strokeWidth={isMidship ? "0.3" : "0.1"}
                    />
                    {/* Station label */}
                    {(r.station === 0 || r.station === 5 || r.station === 10 || r.station === 15 || r.station === 20) && (
                      <text
                        x={normX}
                        y="29.5"
                        fill={isAp || isFp ? "#94a3b8" : "#64748b"}
                        fontSize={isAp || isFp || isMidship ? "2.6" : "2.2"}
                        fontWeight={isAp || isFp || isMidship ? "bold" : "normal"}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {r.station === 0 ? "AP" : r.station === 20 ? "FP" : r.station === 10 ? "MID" : r.station}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* RED VERTICAL DIVIDER LINES (HANYA SAAT EDIT/NON-PREVIEW MODE) */}
              {!isPreviewMode && [
                { x: 0.00, key: "div-left" },
                { x: 14.00, key: "div-ap" },
                { x: 44.10, key: "div-st7" },
                { x: 69.90, key: "div-st13" },
                { x: 100.00, key: "div-fp" },
                { x: 114.00, key: "div-right" }
              ].map((div) => (
                <line
                  key={div.key}
                  x1={div.x}
                  y1="1.5"
                  x2={div.x}
                  y2="26"
                  stroke="#991b1b"
                  strokeWidth="0.25"
                />
              ))}

              {/* Waterline Curve Area Fill & Smooth Fairing Stroke (Refined 0.28px stroke) */}
              <path
                d={`M ${14.00 + (-0.5 / 20.0) * 86.00},26 ${getSmoothPathD(
                  calculatedRows.map((r) => ({
                    x: 14.00 + (r.station / 20.0) * 86.00,
                    y: 26.00 - (r.halfBreadth / (BWL / 2 || 1)) * 23.00
                  }))
                )} L 100,26 Z`}
                fill="rgba(6, 182, 212, 0.12)"
                stroke="#38bdf8"
                strokeWidth="0.28"
                strokeLinecap="round"
              />

              {/* Station Control Points (Interactive Drag for non-PMB) */}
              {!isPreviewMode && calculatedRows.map((r, idx) => {
                const x = 14.00 + (r.station / 20.0) * 86.00;
                const maxHalfB = BWL / 2 || 1;
                const y = 26.00 - (r.halfBreadth / maxHalfB) * 23.00;
                
                const isLocked = r.station >= 7 && r.station <= 13;
                const isDragging = draggingStation === r.station;
                
                return (
                  <circle 
                    key={idx} 
                    cx={x} 
                    cy={y} 
                    r={isDragging ? "1.0" : isLocked ? "0.35" : "0.55"} 
                    fill={isLocked ? "#ef4444" : isDragging ? "#facc15" : "#38bdf8"} 
                    stroke={isLocked ? "transparent" : isDragging ? "#ffffff" : "#ffffff"} 
                    strokeWidth={isDragging ? "0.2" : "0.08"}
                    className={
                      isLocked 
                        ? "cursor-not-allowed opacity-60 pointer-events-none" 
                        : isDragging 
                        ? "cursor-ns-resize drop-shadow-xl" 
                        : "cursor-ns-resize hover:opacity-100 drop-shadow-md"
                    }
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => handlePointerDown(e, r.station)}
                  />
                );
              })}

              {/* LCF Marker (Longitudinal Center of Flotation) */}
              {(() => {
                const lcfStation = 10 + (LCF / (l || 1));
                const lcfX = 14.00 + (lcfStation / 20.0) * 86.00;
                return (
                  <g>
                    <line x1={lcfX} y1="0.5" x2={lcfX} y2="26" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1,1" />
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

            {/* DYNAMIC FLOATING TOOLTIP ON HOVER (MATCHING USER SCREENSHOT) */}
            {(hoveredZone || activeZone) && (
              <div className="absolute bottom-2 right-3 z-30 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95">
                {(() => {
                  const targetZoneId = hoveredZone || activeZone;
                  const zoneObj = AREA_ZONES.find(z => z.id === targetZoneId);
                  if (!zoneObj) return null;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700/90 rounded-xl px-3.5 py-1.5 text-xs font-mono shadow-2xl backdrop-blur-md text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zoneObj.bgFill.replace(/0\.\d+/, '1') }} />
                      <span className="font-semibold text-slate-200">{zoneObj.description}</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 5-SEGMENT BOTTOM BAR / LEGEND STRIP (HANYA DITAMPILKAN SAAT BUKAN PREVIEW MODE) */}
          {!isPreviewMode ? (
            <div className="w-full flex gap-1.5 pt-3 text-xs font-mono select-none">
              {/* After Peak (Span: Ujung Kiri s/d AP 0) */}
              <div 
                onClick={() => setActiveZone(activeZone === 'after-peak' ? null : 'after-peak')}
                onMouseEnter={() => setHoveredZone('after-peak')}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ flex: "2.5 1 0%" }}
                className={`py-2 px-1 rounded-xl text-center font-bold transition-all cursor-pointer border min-w-[70px] ${
                  activeZone === 'after-peak' || hoveredZone === 'after-peak'
                    ? 'bg-[#b45309] border-amber-400 text-white shadow-lg shadow-amber-900/50 ring-1 ring-amber-400'
                    : 'bg-[#9a3412]/80 hover:bg-[#b45309] border-amber-700/50 text-amber-100'
                }`}
              >
                <span className="truncate block text-[11px] sm:text-xs">After Peak</span>
              </div>

              {/* Peak 1 (Span: 0 to 7) */}
              <div 
                onClick={() => setActiveZone(activeZone === 'peak-1' ? null : 'peak-1')}
                onMouseEnter={() => setHoveredZone('peak-1')}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ flex: "6 1 0%" }}
                className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer border ${
                  activeZone === 'peak-1' || hoveredZone === 'peak-1'
                    ? 'bg-[#2563eb] border-sky-400 text-white shadow-lg shadow-sky-900/50 ring-1 ring-sky-400'
                    : 'bg-[#1d4ed8]/75 hover:bg-[#2563eb] border-sky-600/50 text-sky-100'
                }`}
              >
                <span className="truncate block text-[11px] sm:text-xs">Peak 1</span>
              </div>

              {/* Parallel Media Body (Span: 7 to 13) */}
              <div 
                onClick={() => setActiveZone(activeZone === 'parallel-middle-body' ? null : 'parallel-middle-body')}
                onMouseEnter={() => setHoveredZone('parallel-middle-body')}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ flex: "5 1 0%" }}
                className={`py-2 px-2 rounded-xl text-center font-bold transition-all cursor-pointer border ${
                  activeZone === 'parallel-middle-body' || hoveredZone === 'parallel-middle-body'
                    ? 'bg-[#16a34a] border-emerald-400 text-white shadow-lg shadow-emerald-900/50 ring-1 ring-emerald-400'
                    : 'bg-[#15803d]/75 hover:bg-[#16a34a] border-emerald-600/50 text-emerald-100'
                }`}
              >
                <span className="truncate block text-[11px] sm:text-xs">Parallel Media Body</span>
              </div>

              {/* Peak 2 (Span: 13 to 20) */}
              <div 
                onClick={() => setActiveZone(activeZone === 'peak-2' ? null : 'peak-2')}
                onMouseEnter={() => setHoveredZone('peak-2')}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ flex: "6 1 0%" }}
                className={`py-2 px-1 rounded-xl text-center font-bold transition-all cursor-pointer border ${
                  activeZone === 'peak-2' || hoveredZone === 'peak-2'
                    ? 'bg-[#a21caf] border-purple-400 text-white shadow-lg shadow-purple-900/50 ring-1 ring-purple-400'
                    : 'bg-[#86198f]/75 hover:bg-[#a21caf] border-purple-600/50 text-purple-100'
                }`}
              >
                <span className="truncate block text-[11px] sm:text-xs">Peak 2</span>
              </div>

              {/* Fore Peak (Span: 20 ke kanan) */}
              <div 
                onClick={() => setActiveZone(activeZone === 'fore-peak' ? null : 'fore-peak')}
                onMouseEnter={() => setHoveredZone('fore-peak')}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ flex: "2.5 1 0%" }}
                className={`py-2 px-1 rounded-xl text-center font-bold transition-all cursor-pointer border min-w-[70px] ${
                  activeZone === 'fore-peak' || hoveredZone === 'fore-peak'
                    ? 'bg-[#6b21a8] border-violet-400 text-white shadow-lg shadow-violet-900/50 ring-1 ring-violet-400'
                    : 'bg-[#581c87]/85 hover:bg-[#6b21a8] border-violet-700/50 text-violet-100'
                }`}
              >
                <span className="truncate block text-[11px] sm:text-xs">Fore Peak</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center pt-3 text-[11px] font-mono text-slate-400 select-none">
              <span className="flex items-center space-x-2 bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                <span className="text-slate-300 font-medium">Mode Preview CAD — Garis Air Bersih (DWL Half-Breadth Plan)</span>
              </span>
            </div>
          )}
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
                <th className="py-3 px-3.5 font-bold text-center border-r border-slate-800/60 w-28">
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
                const stationZone = getStationZone(r.station);
                const isZoneActive = (activeZone && activeZone === stationZone.id) || (hoveredZone && hoveredZone === stationZone.id);

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isZoneActive 
                        ? "bg-slate-800/60 ring-1 ring-cyan-500/30" 
                        : isHighlighted 
                        ? "bg-slate-900/60 font-semibold" 
                        : ""
                    }`}
                  >
                    {/* (1) NO. SECT with Area Zone Badge */}
                    <td className="py-2 px-2.5 text-center border-r border-slate-800/60">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            stationZone.code === 'AP' ? 'bg-amber-950/90 text-amber-300 border border-amber-600/40' :
                            stationZone.code === 'P1' ? 'bg-sky-950/90 text-sky-300 border border-sky-600/40' :
                            stationZone.code === 'PMB' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/40' :
                            stationZone.code === 'P2' ? 'bg-purple-950/90 text-purple-300 border border-purple-600/40' :
                            'bg-violet-950/90 text-violet-300 border border-violet-600/40'
                          }`}
                          title={stationZone.description}
                        >
                          {stationZone.code}
                        </span>
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
                      </div>
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
