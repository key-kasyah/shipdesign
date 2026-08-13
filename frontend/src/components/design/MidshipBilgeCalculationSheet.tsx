"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Activity,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Wand2,
  Compass,
  Info,
  Plus,
  Eye,
  EyeOff
} from "lucide-react";

/**
 * Helper: Smooth curve (Monotone Cubic Interpolation)
 * Produces a perfectly fair curve, eliminating micro-wiggles caused by non-uniform point spacing.
 */
const getSmoothPathD = (points: {x: number, y: number}[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return ``;

  const n = points.length;
  const delta = new Float64Array(n - 1);
  const m = new Float64Array(n);

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    delta[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
  }

  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (delta[i - 1] + delta[i]) / 2;
  }

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

interface MidshipBilgeCalculationProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  vesselType?: string;
}

export const MidshipBilgeCalculationSheet: React.FC<MidshipBilgeCalculationProps> = ({
  lbp_m = 81.19,
  breadth_m = 15.00,
  draft_m = 5.50,
  depth_m = 7.00,
  cb = 0.75,
  cm = 0.99,
  vesselType = "GENERAL_CARGO"
}) => {
  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(0.5, draft_m);
  const H = Math.max(1, depth_m);
  const Cb = cb || 0.75;
  const Cm = cm || 0.99;
  const halfB = Number((B / 2).toFixed(3)); // 7.50m

  // Theoretical Bilge Radius calculation:
  // R = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )
  const calculatedRadius = useMemo(() => {
    const areaDiff = B * T * (1.0 - Cm);
    const denom = 2.0 - Math.PI / 2.0; // ~ 0.429203673
    if (denom <= 0 || areaDiff <= 0) return 0;
    return Math.sqrt(areaDiff / denom);
  }, [B, T, Cm]);

  const R = Number(calculatedRadius.toFixed(4));
  const flatOfBottom = Math.max(0, halfB - R); // Jarak titik tangen lunas ke bilga (0.5B - R)
  const l_chord = Number((R * Math.tan((22.5 * Math.PI) / 180)).toFixed(4));
  const r_sub = Number((l_chord / 2).toFixed(4));

  // Dynamic state for draft steps (allows user to add points)
  const [draftSteps, setDraftSteps] = useState<number[]>([
    0.00, 0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00
  ]);
  
  // Dragging interaction state
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingDraft, setDraggingDraft] = useState<number | null>(null);
  const [hoverDraft, setHoverDraft] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Ensure draftSteps is always sorted
  const sortedDraftSteps = useMemo(() => [...draftSteps].sort((a, b) => a - b), [draftSteps]);

  // Function to compute ordinate on Station 10 at water level z along circular bilge arc
  const getTheoreticalOrdinateAtZ = (z: number, rVal: number): number => {
    if (z <= 0) {
      return Number(flatOfBottom.toFixed(3));
    }
    if (z < rVal) {
      // Circular bilge arc
      const diff = rVal - z;
      const yArc = (halfB - rVal) + Math.sqrt(Math.max(0, Math.pow(rVal, 2) - Math.pow(diff, 2)));
      return Number(Math.min(halfB, yArc).toFixed(3));
    }
    // Vertical flat of side shell
    return Number(halfB.toFixed(3));
  };

  // True Trapezoidal Rule for Area (returns total Am for both sides)
  const calculateTrapezoidalAm = (ordinates: Record<number, number>, steps: number[]): number => {
    let sum = 0;
    const n = steps.length;
    if (n < 2) return 0;
    
    for (let i = 0; i < n; i++) {
      let weight = 0;
      if (i === 0) {
        weight = (steps[1] - steps[0]) / 2;
      } else if (i === n - 1) {
        weight = (steps[n - 1] - steps[n - 2]) / 2;
      } else {
        weight = (steps[i + 1] - steps[i - 1]) / 2;
      }
      
      // Limit integration up to T (draft_m)
      const z = steps[i];
      if (z > T) {
        // If the point is above T, we must clip its weight contribution below T
        if (steps[i - 1] < T) {
           // We only add the trapezoid chunk up to T
           const partialWeight = (T - steps[i - 1]) / 2;
           sum += (ordinates[z] || 0) * partialWeight;
        }
        break; // Ignore any points entirely above T for Am calculation
      } else if (i < n - 1 && steps[i + 1] > T) {
        // Next point is above T, clip the forward weight
        const forwardWeight = (T - z) / 2;
        const backwardWeight = (z - (i > 0 ? steps[i - 1] : z)) / 2;
        weight = forwardWeight + backwardWeight;
      }
      
      sum += (ordinates[z] || 0) * weight;
    }
    
    // Multiply by 2 because ordinates are half-breadths
    return sum * 2.0;
  };

  // High-precision Bilge Curve Generator
  const generateOptimizedDraftOrdinates = (targetAm: number, steps: number[]): Record<number, number> => {
    const initial: Record<number, number> = {};
    steps.forEach((z) => {
      initial[z] = getTheoreticalOrdinateAtZ(z, calculatedRadius);
    });

    // Fine-tune lower bilge arc points iteratively to match target Am
    for (let iter = 0; iter < 20; iter++) {
      const currentAm = calculateTrapezoidalAm(initial, steps);
      const deviance = (currentAm - targetAm) / (currentAm || 1);

      if (Math.abs(deviance) < 0.0001) break;

      const scale = targetAm / (currentAm || 1);
      steps.forEach((z) => {
        // Only bend the curve inside the bilge radius to achieve the target volume!
        if (z <= calculatedRadius) {
          const adjusted = initial[z] * (1 + (scale - 1) * 0.85);
          initial[z] = Number(Math.max(0, Math.min(halfB, adjusted)).toFixed(3));
        }
      });
    }

    return initial;
  };

  const Am_rancangan = useMemo(() => B * T * Cm, [B, T, Cm]);

  const [draftOrdinates, setDraftOrdinates] = useState<Record<number, number>>(() =>
    generateOptimizedDraftOrdinates(Am_rancangan, [
      0.00, 0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00
    ])
  );

  useEffect(() => {
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, sortedDraftSteps));
  }, [Am_rancangan, B, T, Cm, sortedDraftSteps, calculatedRadius, halfB]);

  // Reset & Auto-Fit Handlers
  const handleReset = () => {
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, sortedDraftSteps));
  };

  const handleAutoFineTune = () => {
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, sortedDraftSteps));
  };

  // Update a single draft ordinate manually via table
  const handleCellChange = (draft_z: number, value: string) => {
    const num = parseFloat(value);
    setDraftOrdinates((prev) => ({
      ...prev,
      [draft_z]: isNaN(num) ? 0 : Number(num.toFixed(3))
    }));
  };

  // Add new dynamic draft step
  const handleAddDraftStep = () => {
    // Find the largest gap in the bilge region (between 0 and R)
    let maxGap = 0;
    let newZ = R / 2; // default if no points in region
    
    for (let i = 0; i < sortedDraftSteps.length - 1; i++) {
      const z1 = sortedDraftSteps[i];
      const z2 = sortedDraftSteps[i+1];
      if (z2 <= R + 0.1) {
        const gap = z2 - z1;
        if (gap > maxGap) {
          maxGap = gap;
          newZ = z1 + gap / 2;
        }
      }
    }
    
    // Round to 3 decimal places to avoid floating point issues
    newZ = Number(newZ.toFixed(3));
    
    if (!sortedDraftSteps.includes(newZ)) {
      setDraftSteps([...sortedDraftSteps, newZ]);
    }
  };

  // Compute calculated table rows
  const calculatedRows = useMemo(() => {
    const n = sortedDraftSteps.length;
    return sortedDraftSteps.map((draft_z, i) => {
      const ord = draftOrdinates[draft_z] ?? 0;
      
      // Calculate display weight (Trapezoidal)
      let weight = 0;
      if (n > 1) {
        if (i === 0) weight = (sortedDraftSteps[1] - sortedDraftSteps[0]) / 2;
        else if (i === n - 1) weight = (sortedDraftSteps[n - 1] - sortedDraftSteps[n - 2]) / 2;
        else weight = (sortedDraftSteps[i + 1] - sortedDraftSteps[i - 1]) / 2;
      }
      
      const product = ord * weight;
      return {
        draft_z,
        label: draft_z.toFixed(3),
        ordinate: ord,
        fs: Number(weight.toFixed(4)),
        product
      };
    });
  }, [draftOrdinates, sortedDraftSteps]);

  // Integrated Midship Area Am_calc
  const Am_calc = useMemo(() => {
    return calculateTrapezoidalAm(draftOrdinates, sortedDraftSteps);
  }, [draftOrdinates, sortedDraftSteps, T]);

  // Correction Percentage = ((Am_calc - Am_rancangan) / Am_calc) * 100%
  const correctionPercent = useMemo(() => {
    if (Am_calc === 0) return 0;
    return ((Am_calc - Am_rancangan) / Am_rancangan) * 100;
  }, [Am_calc, Am_rancangan]);

  // STRICT TOLERANCE CRITERIA: Minimal <= +/- 0.05%
  const isCorrectionValid = Math.abs(correctionPercent) <= 0.05;

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "GADING (I)",
      "SARAT z (II)",
      "ORDINAT 0.5B m (III)",
      "FS - Faktor Simpson (IV)",
      "HASIL KALI (V = III x IV)"
    ];

    const rows = calculatedRows.map((r) => [
      "10 (Midship)",
      r.label,
      r.ordinate.toFixed(3),
      r.fs.toFixed(2),
      r.product.toFixed(4)
    ]);

    const summaryData = [
      [],
      ["PERHITUNGAN RADIUS BILGA & LUAS MIDSHIP", ""],
      ["Lebar Kapal (B)", `${B.toFixed(2)} m`],
      ["Sarat Air (T)", `${T.toFixed(2)} m`],
      ["Koefisien Midship (Cm)", Cm.toFixed(3)],
      ["Radius Bilga (R)", `${R.toFixed(4)} m`],
      ["Jarak Titik Tangen Dasar (0.5B - R)", `${flatOfBottom.toFixed(4)} m`],
      ["Parameter Chord l", `${l_chord.toFixed(4)} m`],
      ["Total Luas (Satu Sisi)", (Am_calc / 2).toFixed(4)],
      ["Luas Midship Hasil Integrasi (Am_calc)", `${Am_calc.toFixed(3)} m2`],
      ["Luas Midship Target (Am_rancangan)", `${Am_rancangan.toFixed(3)} m2`],
      ["Persentase Koreksi Midship", `${correctionPercent.toFixed(3)} %`],
      ["Status Toleransi", isCorrectionValid ? "MEMENUHI SYARAT (<= +/- 0.05%)" : "TIDAK MEMENUHI"]
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...summaryData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Midship_Bilge_Calculation_${B}x${T}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent, z: number) => {
    // Only allow dragging points in the bilge region (z <= R)
    if (z > R + 0.1) return;
    
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingDraft(z);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingDraft === null || !svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform screen coordinates to SVG coordinates
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // Reverse the scale mapping to get the original halfBreadth value
    // x = ox + halfBreadth * scaleX => halfBreadth = (x - ox) / scaleX
    const ox = 25;
    const scaleX = 95 / (halfB || 7.5);
    
    // Clamp the value between 0 and halfB
    let newHalfB = (svgP.x - ox) / scaleX;
    newHalfB = Math.max(0, Math.min(halfB, newHalfB));
    
    setDraftOrdinates(prev => ({
      ...prev,
      [draggingDraft]: Number(newHalfB.toFixed(3))
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingDraft !== null) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDraggingDraft(null);
    }
  };

  const handlePointerLeave = () => {
    setDraggingDraft(null);
    setHoverDraft(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER: TITLE BLOCK & PARTICULARS */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
                <Activity size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                    Perhitungan Radius Bilga & Luas Midship (Gading 10)
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
                  Penentuan Radius Kelengkungan Bilga (R) dan Integrasi Vertikal Luas Penampang Midship Section 10 dengan Aturan Simpson.
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
              title="Reset ke kurva bilga teoritis"
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

        {/* PARAMETERS MATRIX */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Lebar (B)</span>
            <div className="font-bold text-white">{B.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">0.5 B (Half)</span>
            <div className="font-bold text-cyan-300">{halfB.toFixed(3)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Sarat Air (T)</span>
            <div className="font-bold text-emerald-400">{T.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Tinggi Geladak (H)</span>
            <div className="font-bold text-slate-300">{H.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Koefisien Midship (Cm)</span>
            <div className="font-bold text-amber-300">{Cm.toFixed(3)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Radius Bilga (R)</span>
            <div className="font-bold text-cyan-400">{R.toFixed(4)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Tangen Dasar (0.5B - R)</span>
            <div className="font-bold text-emerald-300">{flatOfBottom.toFixed(4)} m</div>
          </div>
        </div>

        {/* STATUS PILL */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              Luas Sudut Terpotong Bilga = <strong>{(B * T * (1 - Cm)).toFixed(3)} m&sup2;</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              Target Luas Midship (Am) = <strong>{Am_rancangan.toFixed(2)} m&sup2;</strong>
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
              Koreksi Luas Midship: {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`} (Maksimal &plusmn;0.05%)
            </span>
          </div>
        </div>
      </div>

      {/* BILGE GEOMETRY & MIDSHIP PROFILE CAD BLUEPRINT VISUALIZATION */}
      <div className="w-full">
        {/* Detailed CAD Naval Blueprint SVG for Station 10 & Bilge Arc */}
        <div className="w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4 flex flex-col">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-2 gap-3">
            <div className="flex items-center space-x-2">
              <TrendingUp size={15} className="text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Visual Blueprint Penampang Midship (Gading 10 & Konstruksi Busur Bilga)
              </h3>
            </div>
            <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-4">
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className="text-cyan-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  <span>Profil Gading 10 (Separuh B/2)</span>
                </span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Garis Sarat T = {T.toFixed(2)}m</span>
                </span>
                <span className="text-amber-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span>Busur Bilga R = {R.toFixed(3)}m</span>
                </span>
              </div>
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow ${
                  isPreviewMode 
                    ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border-cyan-500/50" 
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isPreviewMode ? "Matikan Preview" : "Preview Penuh"}</span>
              </button>
            </div>
          </div>

          {/* SVG Blueprint Canvas */}
          <div className="w-full flex-1 min-h-[280px] bg-slate-950/95 rounded-xl relative overflow-hidden border border-slate-800/90 flex items-center justify-center p-3">
              <svg 
                ref={svgRef}
                className="w-full h-full cursor-crosshair" 
                viewBox="0 0 160 90" 
                preserveAspectRatio="xMidYMid meet"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              >
                <defs>
                  {/* CAD Grid Pattern */}
                  <pattern id="cadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
                  </pattern>
                  {/* Water Hatch */}
                  <pattern id="waterHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="4" stroke="#0284c7" strokeWidth="0.4" strokeOpacity="0.25" />
                  </pattern>
                </defs>

                {/* Background Grid */}
                {!isPreviewMode && <rect x="0" y="0" width="160" height="90" fill="url(#cadGrid)" />}

                {/* COORDINATE MAPPING */}
                {(() => {
                  const ox = isPreviewMode ? 80 : 25;
                  const oy = 78;
                  const scaleX = isPreviewMode ? 70 / (halfB || 7.5) : 95 / (halfB || 7.5);
                  const scaleZ = 62 / (H || 7.0);

                  const deckY = oy - H * scaleZ;
                  const dwlY = oy - T * scaleZ;
                  const outerX = ox + halfB * scaleX;
                  
                  // Interactive Curve Points
                  const curvePts = sortedDraftSteps.map(z => ({
                    z,
                    x: ox + (draftOrdinates[z] || 0) * scaleX,
                    y: oy - z * scaleZ,
                    isBilge: z <= R + 0.1
                  }));
                  
                  const smoothCurve = getSmoothPathD(curvePts);
                  
                  // Top connection
                  const lastPt = curvePts[curvePts.length - 1];

                  const hullPath = `
                    M ${ox},${deckY}
                    L ${ox},${oy}
                    L ${curvePts[0].x},${curvePts[0].y}
                    ${smoothCurve}
                    L ${outerX},${lastPt.y}
                    L ${outerX},${deckY}
                    Z
                  `;

                  const subHullPath = `
                    M ${ox},${dwlY}
                    L ${ox},${oy}
                    L ${curvePts[0].x},${curvePts[0].y}
                    ${smoothCurve}
                    L ${outerX},${lastPt.y}
                    L ${outerX},${dwlY}
                    Z
                  `;

                  return (
                    <g>
                      {/* Submerged Area Fill */}
                      <path d={subHullPath} fill="url(#waterHatch)" />
                      <path d={hullPath} fill={isPreviewMode ? "rgba(6, 182, 212, 0.15)" : "rgba(6, 182, 212, 0.08)"} stroke="#06b6d4" strokeWidth="1.2" />

                      {/* Mirror Port Side for Preview Mode */}
                      {isPreviewMode && (
                        <g transform={`translate(${2 * ox}, 0) scale(-1, 1)`}>
                          <path d={subHullPath} fill="url(#waterHatch)" />
                          <path d={hullPath} fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.2" />
                        </g>
                      )}

                      {!isPreviewMode ? (
                        <>
                          {/* Baseline BL & Extension */}
                          <line x1="12" y1={oy} x2="145" y2={oy} stroke="#64748b" strokeWidth="0.8" />
                          <text x="146" y={oy + 2} fill="#64748b" fontSize="3.0" fontFamily="monospace" fontWeight="bold">
                            BL (Lunas)
                          </text>

                          {/* Centerline CL & Extension */}
                          <line x1={ox} y1="6" x2={ox} y2="85" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3,1.5" />
                          <text x={ox - 2} y="10" fill="#64748b" fontSize="3.0" textAnchor="end" fontFamily="monospace" fontWeight="bold">
                            CL (Centerline)
                          </text>

                          {/* Deck Line at H */}
                          <line x1={ox - 5} y1={deckY} x2={outerX + 15} y2={deckY} stroke="#94a3b8" strokeWidth="0.7" strokeDasharray="2,2" />
                          <text x={outerX + 17} y={deckY + 1.5} fill="#94a3b8" fontSize="2.8" fontFamily="monospace">
                            Geladak H = {H.toFixed(2)}m
                          </text>

                          {/* DWL Sarat Line at T */}
                          <line x1={ox - 8} y1={dwlY} x2={outerX + 18} y2={dwlY} stroke="#10b981" strokeWidth="0.9" strokeDasharray="4,2" />
                          <text x={outerX + 20} y={dwlY + 1.5} fill="#10b981" fontSize="3.0" fontFamily="monospace" fontWeight="bold">
                            DWL (T = {T.toFixed(2)}m)
                          </text>
                          
                          {/* Interactive Drag Points on Bilge Curve */}
                          {curvePts.filter(p => p.isBilge).map((p, idx) => (
                            <g key={`drag-${p.z}`}>
                              <line x1={p.x} y1={p.y} x2={outerX} y2={p.y} stroke="#f59e0b" strokeWidth="0.2" strokeDasharray="1,1" opacity="0.5" />
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={draggingDraft === p.z || hoverDraft === p.z ? "1.2" : "0.7"}
                                fill={draggingDraft === p.z ? "#fbbf24" : "#f59e0b"}
                                stroke="#ffffff"
                                strokeWidth="0.3"
                                className="cursor-pointer hover:fill-amber-300 transition-all"
                                onPointerDown={(e) => handlePointerDown(e, p.z)}
                                onPointerEnter={() => setHoverDraft(p.z)}
                                onPointerLeave={() => setHoverDraft(null)}
                              />
                              {(draggingDraft === p.z || hoverDraft === p.z) && (
                                <text x={p.x - 4} y={p.y - 3} fill="#fbbf24" fontSize="2.5" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                                  y = {(draftOrdinates[p.z] || 0).toFixed(3)}
                                </text>
                              )}
                            </g>
                          ))}

                          {/* Breadth Dimension (B/2) */}
                          <line x1={ox} y1="18" x2={outerX} y2="18" stroke="#38bdf8" strokeWidth="0.6" />
                          <polygon points={`${ox},18 ${ox + 2},16.8 ${ox + 2},19.2`} fill="#38bdf8" />
                          <polygon points={`${outerX},18 ${outerX - 2},16.8 ${outerX - 2},19.2`} fill="#38bdf8" />
                          <text x={ox + (outerX - ox) / 2} y="15.5" fill="#38bdf8" fontSize="2.8" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                            0.5 B = {halfB.toFixed(3)} m (Lebar Total B = {B.toFixed(2)} m)
                          </text>
                        </>
                      ) : (
                        <>
                          {/* Preview Mode Overlays (Minimal) */}
                          <line x1={ox - 75} y1={dwlY} x2={ox + 75} y2={dwlY} stroke="#10b981" strokeWidth="0.6" strokeDasharray="4,2" />
                          <text x={ox} y={dwlY - 2} fill="#10b981" fontSize="2.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">DWL (T = {T.toFixed(2)}m)</text>
                          <line x1={ox} y1="5" x2={ox} y2="85" stroke="#64748b" strokeWidth="0.5" strokeDasharray="3,1.5" />
                          <text x={ox} y="9" fill="#64748b" fontSize="2.5" textAnchor="middle" fontFamily="monospace">CL</text>
                        </>
                      )}
                    </g>
                  );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* TABLE: STATION 10 DRAFT-WISE SIMPSON INTEGRATION */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Tabel Integrasi Ordinat Midship Gading 10 Terhadap Sarat Air (z)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Integrasi ordinat separuh lebar gading 10 pada tiap level sarat air. Nilai <strong className="text-cyan-300">0.5 B (m)</strong> dapat diedit langsung atau ditarik pada grafik.
            </p>
          </div>
          <button
            onClick={handleAddDraftStep}
            className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg"
          >
            <Plus size={14} />
            <span>Tambah Titik (Z) di Bilga</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner no-scrollbar">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 text-[11px]">
                <th className="py-3 px-3.5 font-bold text-center border-r border-slate-800/60 w-24">
                  (I)<br />GADING
                </th>
                <th className="py-3 px-3.5 font-bold text-center text-amber-400 border-r border-slate-800/60 w-32">
                  (II)<br />SARAT z (m)
                </th>
                <th className="py-3 px-3.5 font-bold text-cyan-300 border-r border-slate-800/60 min-w-[140px]">
                  (III)<br />0.5 B (m)
                </th>
                <th className="py-3 px-3 font-semibold text-slate-400 text-center border-r border-slate-800/60 w-28">
                  (IV)<br />FAKTOR PENGALI
                </th>
                <th className="py-3 px-4 font-bold text-emerald-400 text-right min-w-[140px]">
                  (V) = (III)&times;(IV)<br />HASIL KALI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-950/40">
              {calculatedRows.map((r, idx) => {
                const isDraftT = Math.abs(r.draft_z - T) < 0.01;
                const isBase = r.draft_z === 0;

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isDraftT ? "bg-emerald-950/20 font-bold" : isBase ? "bg-slate-900/60" : ""
                    }`}
                  >
                    {/* (I) Gading */}
                    <td className="py-2 px-3 text-center border-r border-slate-800/60 text-slate-300">
                      {idx === 0 ? "10 (Midship)" : `"`}
                    </td>

                    {/* (II) Sarat z */}
                    <td className="py-2 px-3 text-center border-r border-slate-800/60 text-amber-300 font-bold">
                      {r.label}
                      {isDraftT && <span className="ml-1 text-[10px] text-emerald-400">(T)</span>}
                    </td>

                    {/* (III) 0.5 B (m) Editable */}
                    <td className="py-1 px-2 border-r border-slate-800/60">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={halfB * 1.5}
                        value={draftOrdinates[r.draft_z] ?? 0}
                        onChange={(e) => handleCellChange(r.draft_z, e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg py-1 px-2 text-cyan-300 font-bold font-mono text-xs focus:border-cyan-400 focus:bg-slate-950 focus:outline-none text-right transition-all"
                      />
                    </td>

                    {/* (IV) FS */}
                    <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-800/60">
                      {r.fs.toFixed(1)}
                    </td>

                    {/* (V) Hasil Kali */}
                    <td className="py-2 px-4 text-right text-emerald-400 font-medium">
                      {r.product.toFixed(4)}
                    </td>
                  </tr>
                );
              })}

              {/* SUMMARY ROW */}
              <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-xs text-white">
                <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider text-slate-300 border-r border-slate-800">
                  Total Sigma Hasil Kali (&Sigma;):
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">Luas (1 Sisi) =</div>
                  <div>{(Am_calc / 2).toFixed(4)}</div>
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
              Hasil Integrasi & Koreksi Luas Penampang Midship (Section 10 Verification)
            </h3>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-400">Target Deviasi Maksimal: </span>
            <strong className="text-emerald-400">&le; &plusmn;0.05%</strong>
          </div>
        </div>

        {/* Result Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Luas Midship Hasil Integrasi */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Luas Midship Integrasi (Am_calc)</span>
              <span className="text-[10px] font-mono text-cyan-400">2 &middot; Luas (Satu Sisi)</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {Am_calc.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              = 2 &times; Luas Satu Sisi ({(Am_calc / 2).toFixed(3)})
            </div>
          </div>

          {/* Card 2: Luas Midship Target */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Luas Midship Target (Am)</span>
              <span className="text-[10px] font-mono text-cyan-400">Am = B &middot; T &middot; Cm</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-300">
              {Am_rancangan.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              = {B.toFixed(2)} &times; {T.toFixed(2)} &times; {Cm.toFixed(3)}
            </div>
          </div>

          {/* Card 3: Selisih Luas */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Selisih Luasan (&Delta;Am)</span>
              <span className="text-[10px] font-mono text-cyan-400">Am_calc - Am</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-300">
              {(Am_calc - Am_rancangan).toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Deviasi absolut integrasi
            </div>
          </div>

          {/* Card 4: Koreksi Midship */}
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
                <span>Koreksi Midship</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                Syarat: &le; &plusmn;0.05%
              </span>
            </div>
            <div className="text-2xl font-black font-mono">
              {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
            </div>
            <div className="text-[11px] opacity-90 font-mono flex items-center justify-between">
              <span>Target: &le; &plusmn;0.05%</span>
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
            <span>Rumus Midship & Radius Bilga (Plain-Text Reference):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">1. Radius Kelengkungan Bilga (R):</p>
              <p className="text-slate-400">Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )</p>
              <p className="text-slate-400">R = Akar( ({B} * {T} * (1 - {Cm})) / 0.4292 ) = <strong className="text-cyan-300">{R.toFixed(4)} m</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">2. Luas Midship Hasil Integrasi (Am_calc):</p>
              <p className="text-slate-400">Am_calc = 2 &times; Total Luas (Satu Sisi)</p>
              <p className="text-slate-400">Am_calc = 2 &times; {(Am_calc / 2).toFixed(4)} = <strong className="text-emerald-400">{Am_calc.toFixed(3)} m&sup2;</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">3. Luas Midship Target Rancangan:</p>
              <p className="text-slate-400">Am_rancangan = B * T * Cm</p>
              <p className="text-slate-400">Am_rancangan = {B} * {T} * {Cm} = <strong className="text-cyan-300">{Am_rancangan.toFixed(3)} m&sup2;</strong></p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">4. Persentase Koreksi Midship (Wajib &le; &plusmn;0.05%):</p>
              <p className="text-slate-400">Koreksi = ((Am_calc - Am_rancangan) / Am_calc) * 100%</p>
              <p className="text-slate-400">Koreksi = (({Am_calc.toFixed(2)} - {Am_rancangan.toFixed(2)}) / {Am_calc.toFixed(2)}) * 100% = <strong className={isCorrectionValid ? "text-emerald-300" : "text-rose-300"}>{correctionPercent.toFixed(3)}%</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
