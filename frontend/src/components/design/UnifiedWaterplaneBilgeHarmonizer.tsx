"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  RotateCcw,
  Save,
  Info,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Table as TableIcon,
  Check
} from "lucide-react";
import { WaterlineConfig, DEFAULT_WATERLINE_LEVELS } from "./WaterPlaneCalculationSheet";

interface UnifiedHarmonizerProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  cw?: number;
  csaOrdinates?: number[];
  vesselType?: string;
  waterlineLevels?: WaterlineConfig[];
  waterlinesData?: Record<string, Record<number, number>>;
  onUpdateWaterlinesData?: (data: Record<string, Record<number, number>>) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

// Helper: Smooth Monotone Cubic Interpolation for fair curve path
const getSmoothPathD = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

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

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;

    const cp1x = p0.x + dx;
    const cp1y = p0.y + m[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - m[i + 1] * dx;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  return d;
};

// Standard 21 Station Definition (with half-stations near AP & FP)
const STATIONS = [
  { id: -2, name: "St. -2", xFrac: -2 / 20, isMain: false },
  { id: -1, name: "St. -1", xFrac: -1 / 20, isMain: false },
  { id: 0, name: "St. 0 (AP)", xFrac: 0, isMain: true, isAP: true },
  { id: 0.5, name: "St. 0.5", xFrac: 0.5 / 20, isMain: false },
  { id: 1, name: "St. 1", xFrac: 1 / 20, isMain: true },
  { id: 1.5, name: "St. 1.5", xFrac: 1.5 / 20, isMain: false },
  { id: 2, name: "St. 2", xFrac: 2 / 20, isMain: true },
  { id: 2.5, name: "St. 2.5", xFrac: 2.5 / 20, isMain: false },
  { id: 3, name: "St. 3", xFrac: 3 / 20, isMain: true },
  { id: 3.5, name: "St. 3.5", xFrac: 3.5 / 20, isMain: false },
  { id: 4, name: "St. 4", xFrac: 4 / 20, isMain: true },
  { id: 4.5, name: "St. 4.5", xFrac: 4.5 / 20, isMain: false },
  { id: 5, name: "St. 5", xFrac: 5 / 20, isMain: true },
  { id: 6, name: "St. 6", xFrac: 6 / 20, isMain: true },
  { id: 7, name: "St. 7", xFrac: 7 / 20, isMain: true },
  { id: 8, name: "St. 8", xFrac: 8 / 20, isMain: true },
  { id: 9, name: "St. 9", xFrac: 9 / 20, isMain: true },
  { id: 10, name: "St. 10 (⊗ Mid)", xFrac: 10 / 20, isMain: true, isMid: true },
  { id: 11, name: "St. 11", xFrac: 11 / 20, isMain: true },
  { id: 12, name: "St. 12", xFrac: 12 / 20, isMain: true },
  { id: 13, name: "St. 13", xFrac: 13 / 20, isMain: true },
  { id: 14, name: "St. 14", xFrac: 14 / 20, isMain: true },
  { id: 15, name: "St. 15", xFrac: 15 / 20, isMain: true },
  { id: 15.5, name: "St. 15.5", xFrac: 15.5 / 20, isMain: false },
  { id: 16, name: "St. 16", xFrac: 16 / 20, isMain: true },
  { id: 16.5, name: "St. 16.5", xFrac: 16.5 / 20, isMain: false },
  { id: 17, name: "St. 17", xFrac: 17 / 20, isMain: true },
  { id: 17.5, name: "St. 17.5", xFrac: 17.5 / 20, isMain: false },
  { id: 18, name: "St. 18", xFrac: 18 / 20, isMain: true },
  { id: 18.5, name: "St. 18.5", xFrac: 18.5 / 20, isMain: false },
  { id: 19, name: "St. 19", xFrac: 19 / 20, isMain: true },
  { id: 19.5, name: "St. 19.5", xFrac: 19.5 / 20, isMain: false },
  { id: 19.8, name: "St. 19.8", xFrac: 19.8 / 20, isMain: false },
  { id: 20, name: "St. 20 (FP)", xFrac: 1.0, isMain: true, isFP: true },
  { id: 20.5, name: "St. 20.5", xFrac: 20.5 / 20, isMain: false }
];

export const UnifiedWaterplaneBilgeHarmonizer: React.FC<UnifiedHarmonizerProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.2,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98,
  cw,
  csaOrdinates,
  vesselType = "TANKER",
  waterlineLevels,
  waterlinesData,
  onUpdateWaterlinesData,
  onSave,
  isSaving = false
}) => {
  const { language } = useLanguage();

  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(0.5, draft_m);
  const H = Math.max(1, depth_m);
  const Cb = cb || 0.75;
  const Cm = cm || 0.98;
  const halfB = Number((B / 2).toFixed(3));
  const targetCw = cw || Number((Cb + 0.09).toFixed(2));
  const l_spacing = LBP / 20;

  // Active Effective Waterline Levels
  const effectiveLevels = useMemo(() => {
    return waterlineLevels && waterlineLevels.length > 0
      ? waterlineLevels
      : DEFAULT_WATERLINE_LEVELS;
  }, [waterlineLevels]);

  // Bilge Radius Calculation
  const calculatedRadius = useMemo(() => {
    const areaDiff = B * T * (1.0 - Cm);
    const denom = 2.0 - Math.PI / 2.0;
    if (denom <= 0 || areaDiff <= 0) return 0;
    return Math.sqrt(areaDiff / denom);
  }, [B, T, Cm]);

  const R = Number(calculatedRadius.toFixed(4));
  const flatOfBottom = Math.max(0, halfB - R);

  // Target Areas
  const targetAm = Number((B * T * Cm).toFixed(2));
  const LWL = Number((LBP * 1.025).toFixed(2));
  const targetDWLAWL = Number((LWL * B * targetCw).toFixed(2));

  // Selection States
  const [selectedStation, setSelectedStation] = useState<number>(10); // Default Gading 10 (Midship)
  const [selectedWlId, setSelectedWlId] = useState<string>(
    effectiveLevels[0]?.id || "WL3"
  );

  // Local Offsets State (Two-Way synchronized with parent waterlinesData)
  const [localOffsets, setLocalOffsets] = useState<Record<string, Record<number, number>>>(() => {
    if (waterlinesData && Object.keys(waterlinesData).length > 0) {
      return waterlinesData;
    }
    // Initialize default offsets based on bilge radius & waterline form
    const init: Record<string, Record<number, number>> = {};
    effectiveLevels.forEach((wl) => {
      const z = wl.draftFraction * T;
      init[wl.id] = {};
      STATIONS.forEach((st) => {
        const xFrac = st.xFrac;
        // Longitudinal fullness factor
        let xFactor = 1.0;
        if (xFrac < 0.25) {
          xFactor = Math.max(0, Math.sin((xFrac / 0.25) * (Math.PI / 2)));
        } else if (xFrac > 0.75) {
          xFactor = Math.max(0, Math.cos(((xFrac - 0.75) / 0.25) * (Math.PI / 2)));
        }

        // Vertical Bilge factor
        let yBilge = halfB;
        if (z <= 0) {
          yBilge = flatOfBottom;
        } else if (z < R && R > 0) {
          const diff = R - z;
          yBilge = halfB - R + Math.sqrt(Math.max(0, R * R - diff * diff));
        }

        const yVal = Number((yBilge * xFactor).toFixed(3));
        init[wl.id][st.id] = yVal;
      });
    });
    return init;
  });

  // Keep local offsets updated if parent waterlinesData arrives
  useEffect(() => {
    if (waterlinesData && Object.keys(waterlinesData).length > 0) {
      setLocalOffsets(waterlinesData);
    }
  }, [waterlinesData]);

  const localOffsetsRef = useRef(localOffsets);
  useEffect(() => {
    localOffsetsRef.current = localOffsets;
  }, [localOffsets]);

  // Synchronized update handler (Fast local update with high FPS)
  const handleUpdateOffset = useCallback(
    (wlId: string, stationId: number, newHalfB: number, commitToParent = false) => {
      const clampedVal = Number(Math.max(0, Math.min(halfB, newHalfB)).toFixed(3));
      setLocalOffsets((prev) => {
        const updated = {
          ...prev,
          [wlId]: {
            ...(prev[wlId] || {}),
            [stationId]: clampedVal
          }
        };
        localOffsetsRef.current = updated;
        if (commitToParent && onUpdateWaterlinesData) {
          onUpdateWaterlinesData(updated);
        }
        return updated;
      });
    },
    [halfB, onUpdateWaterlinesData]
  );

  // Active Waterline Level Info
  const activeWl = useMemo(() => {
    return effectiveLevels.find((l) => l.id === selectedWlId) || effectiveLevels[0] || DEFAULT_WATERLINE_LEVELS[0];
  }, [effectiveLevels, selectedWlId]);

  const activeZ = activeWl.draftFraction * T;

  // Dragging States for Canvas 1 (Bilge Frame) and Canvas 2 (Waterplane)
  const [draggingBilgeZ, setDraggingBilgeZ] = useState<string | null>(null);
  const [draggingWlStation, setDraggingWlStation] = useState<number | null>(null);
  const bilgeSvgRef = useRef<SVGSVGElement>(null);
  const wlSvgRef = useRef<SVGSVGElement>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // WINDOW-LEVEL ROBUST POINTER DRAG LISTENERS (ZERO-BUG DRAGGING)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Left Canvas (Bilge Section) Global Dragging
  useEffect(() => {
    if (!draggingBilgeZ) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!bilgeSvgRef.current) return;
      const rect = bilgeSvgRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawSvgX = ((e.clientX - rect.left) / rect.width) * 460;
      // In Bilge canvas: px = 60 + (yVal / (halfB * 1.15)) * 360
      const rawY = ((rawSvgX - 60) / 360) * (halfB * 1.15);
      const clampedY = Number(Math.max(0, Math.min(halfB, rawY)).toFixed(3));
      handleUpdateOffset(draggingBilgeZ, selectedStation, clampedY, false);
    };

    const handlePointerUp = () => {
      setDraggingBilgeZ(null);
      if (onUpdateWaterlinesData) {
        onUpdateWaterlinesData(localOffsetsRef.current);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingBilgeZ, selectedStation, halfB, handleUpdateOffset, onUpdateWaterlinesData]);

  // 2. Right Canvas (Waterplane Curve) Global Dragging
  useEffect(() => {
    if (draggingWlStation === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!wlSvgRef.current) return;
      const rect = wlSvgRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;

      const rawSvgY = ((e.clientY - rect.top) / rect.height) * 280;
      // In Waterplane canvas: py = 230 - (yVal / (halfB * 1.15)) * 190
      const rawY = ((230 - rawSvgY) / 190) * (halfB * 1.15);
      const clampedY = Number(Math.max(0, Math.min(halfB, rawY)).toFixed(3));
      handleUpdateOffset(activeWl.id, draggingWlStation, clampedY, false);
    };

    const handlePointerUp = () => {
      setDraggingWlStation(null);
      if (onUpdateWaterlinesData) {
        onUpdateWaterlinesData(localOffsetsRef.current);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingWlStation, activeWl.id, halfB, handleUpdateOffset, onUpdateWaterlinesData]);

  // ══════════════════════════════════════════════════════════════════════════
  // CALCULATIONS & UNIFIED CORRECTION CRITERIA
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Calculate Actual AWL of Active Waterline via Simpson 1/3 Rule
  const awlSimpsonCalc = useMemo(() => {
    const wlData = localOffsets[activeWl.id] || {};
    const mainStations = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const simpsonMultipliers = [1, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 1];

    let sum = 0;
    let momentMidSum = 0;

    mainStations.forEach((stNum, idx) => {
      const yVal = wlData[stNum] ?? 0;
      const factor = simpsonMultipliers[idx];
      sum += factor * yVal;
      momentMidSum += factor * yVal * (stNum - 10);
    });

    const awlActual = Number(((2 / 3) * l_spacing * sum).toFixed(2));
    const targetAWLForLevel = Number((targetDWLAWL * activeWl.awlFactor).toFixed(2));
    const deviationPct = targetAWLForLevel > 0
      ? Number((((awlActual - targetAWLForLevel) / targetAWLForLevel) * 100).toFixed(3))
      : 0;

    const isValid = Math.abs(deviationPct) <= 0.05;
    const lcfFromMid = sum > 0 ? Number(((momentMidSum * l_spacing) / sum).toFixed(3)) : 0;

    return {
      awlActual,
      targetAWL: targetAWLForLevel,
      deviationPct,
      isValid,
      lcfFromMid
    };
  }, [localOffsets, activeWl, l_spacing, targetDWLAWL]);

  // 2. Calculate Actual Midship Section Area (Am) of Station 10 via Trapezoidal Rule
  const amMidshipCalc = useMemo(() => {
    const stationId = selectedStation;
    const points: { z: number; y: number }[] = effectiveLevels.map((wl) => ({
      z: wl.draftFraction * T,
      y: localOffsets[wl.id]?.[stationId] ?? 0
    })).sort((a, b) => a.z - b.z);

    let areaHalf = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dz = points[i + 1].z - points[i].z;
      const avgY = (points[i].y + points[i + 1].y) / 2;
      areaHalf += dz * avgY;
    }

    const amActual = Number((areaHalf * 2).toFixed(2));
    const targetStationAm = stationId === 10
      ? targetAm
      : Number((targetAm * (csaOrdinates?.[stationId] ? csaOrdinates[stationId] / (targetAm || 1) : 1)).toFixed(2));

    const deviationPct = targetStationAm > 0
      ? Number((((amActual - targetStationAm) / targetStationAm) * 100).toFixed(3))
      : 0;

    const isValid = Math.abs(deviationPct) <= 0.05;

    return {
      amActual,
      targetAm: targetStationAm,
      deviationPct,
      isValid,
      points
    };
  }, [selectedStation, effectiveLevels, T, localOffsets, targetAm, csaOrdinates]);

  // 3. Auto-Harmonize Bilge Radius to Waterlines across all stations
  const handleAutoHarmonizeAll = () => {
    const newOffsets: Record<string, Record<number, number>> = {};

    effectiveLevels.forEach((wl) => {
      const z = wl.draftFraction * T;
      newOffsets[wl.id] = {};

      STATIONS.forEach((st) => {
        const xFrac = st.xFrac;
        let xFactor = 1.0;
        if (xFrac < 0.25) {
          xFactor = Math.max(0, Math.sin((xFrac / 0.25) * (Math.PI / 2)));
        } else if (xFrac > 0.75) {
          xFactor = Math.max(0, Math.cos(((xFrac - 0.75) / 0.25) * (Math.PI / 2)));
        }

        let yBilge = halfB;
        if (z <= 0) {
          yBilge = flatOfBottom;
        } else if (z < R && R > 0) {
          const diff = R - z;
          yBilge = halfB - R + Math.sqrt(Math.max(0, R * R - diff * diff));
        }

        const yHarmonized = Number((yBilge * xFactor * wl.maxBreadthFactor).toFixed(3));
        newOffsets[wl.id][st.id] = yHarmonized;
      });
    });

    setLocalOffsets(newOffsets);
    if (onUpdateWaterlinesData) {
      onUpdateWaterlinesData(newOffsets);
    }
  };

  // Current Intercept Coordinates between selected station and selected waterline
  const activeInterceptY = localOffsets[activeWl.id]?.[selectedStation] ?? 0;

  return (
    <div className="bg-[#070B12] text-slate-100 space-y-6 font-sans">
      {/* 1. TOP HEADER & COMPLIANCE SUMMARY CARD */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-5 md:p-6 rounded-2xl backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-950/40">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  {language === "en"
                    ? "Harmonized Waterplane & Bilge Studio"
                    : "Studio Harmonisasi Sinkron Garis Air & Radius Bilga"}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  Real-Time 2-Way Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === "en"
                  ? "Side-by-side interactive link between frame cross-sections (Bilge) and waterplane offsets (WL). Dragging points in one view dynamically fair the other."
                  : "Integrasi visual dua arah antara penampang gading (Bilga) dan kurva garis air (WL). Perubahan titik di satu bidang langsung memperbarui bidang lainnya secara sinkron."}
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center flex-wrap gap-2.5 self-start lg:self-auto font-mono text-xs">
            <button
              onClick={handleAutoHarmonizeAll}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-900/30 cursor-pointer active:scale-[0.98]"
              title="Harmonisasi otomatis seluruh gading dan garis air ke kurva bilga mulus"
            >
              <Sparkles size={13} />
              <span>Harmonisasi Otomatis (Auto-Fair)</span>
            </button>

            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{isSaving ? "Menyimpan..." : "Simpan Desain"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified 3-Column Correction & Fairness Metrics Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">
          {/* Card 1: AWL Waterplane Correction */}
          <div className={`p-4 rounded-xl border ${awlSimpsonCalc.isValid ? "bg-emerald-950/30 border-emerald-500/40" : "bg-rose-950/30 border-rose-500/40"} space-y-1.5`}>
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-400 uppercase font-semibold">1. Koreksi Garis Air (AWL {activeWl.shortName})</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${awlSimpsonCalc.isValid ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
                {awlSimpsonCalc.isValid ? "✓ Memenuhi Syarat" : "⚠️ Deviasi > ±0.05%"}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-white">{awlSimpsonCalc.awlActual.toFixed(2)}</span>
              <span className="text-xs text-slate-400">/ Target {awlSimpsonCalc.targetAWL.toFixed(2)} m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
              <span>Deviasi: <strong className={awlSimpsonCalc.isValid ? "text-emerald-400" : "text-rose-400"}>{awlSimpsonCalc.deviationPct > 0 ? `+${awlSimpsonCalc.deviationPct}%` : `${awlSimpsonCalc.deviationPct}%`}</strong></span>
              <span className="text-slate-400">LCF: {awlSimpsonCalc.lcfFromMid.toFixed(2)} m</span>
            </div>
          </div>

          {/* Card 2: Midship Frame Area Correction */}
          <div className={`p-4 rounded-xl border ${amMidshipCalc.isValid ? "bg-emerald-950/30 border-emerald-500/40" : "bg-rose-950/30 border-rose-500/40"} space-y-1.5`}>
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-400 uppercase font-semibold">2. Koreksi Luas Gading ({selectedStation === 10 ? "Midship Am" : `Station ${selectedStation}`})</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${amMidshipCalc.isValid ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
                {amMidshipCalc.isValid ? "✓ Memenuhi Syarat" : "⚠️ Deviasi > ±0.05%"}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-white">{amMidshipCalc.amActual.toFixed(2)}</span>
              <span className="text-xs text-slate-400">/ Target {amMidshipCalc.targetAm.toFixed(2)} m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
              <span>Deviasi: <strong className={amMidshipCalc.isValid ? "text-emerald-400" : "text-rose-400"}>{amMidshipCalc.deviationPct > 0 ? `+${amMidshipCalc.deviationPct}%` : `${amMidshipCalc.deviationPct}%`}</strong></span>
              <span className="text-slate-400">Radius R: {R.toFixed(2)} m</span>
            </div>
          </div>

          {/* Card 3: Two-Way Synchronization Intercept */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-400 uppercase font-semibold">3. Titik Intersep (St {selectedStation} ∩ {activeWl.shortName})</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                ✓ 100% Sinkron (Δ = 0.000m)
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-cyan-300">{activeInterceptY.toFixed(3)} m</span>
              <span className="text-xs text-slate-400">pada Z = {activeZ.toFixed(2)} m</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
              <span>Lebar Penuh: <strong>{(activeInterceptY * 2).toFixed(3)} m</strong></span>
              <span className="text-slate-400">0.5B Maks: {halfB.toFixed(2)} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATION & WATERLINE SELECTOR BARS */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xl shadow-xl space-y-3 font-mono">
        {/* Row 1: Station Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[11px] flex items-center space-x-1.5">
              <span>📍 Pilih Gading / Station Aktif (Penampang Melintang):</span>
              <strong className="text-cyan-400">Station {selectedStation} {selectedStation === 10 ? "(Midship)" : ""}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
            {STATIONS.map((st) => {
              const isSelected = st.id === selectedStation;
              return (
                <button
                  key={`st-btn-${st.id}`}
                  onClick={() => setSelectedStation(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-900/40 scale-105"
                      : st.isMid
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      : st.isAP || st.isFP
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30"
                      : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Waterline Selector */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[11px] flex items-center space-x-1.5">
              <span>🌊 Pilih Garis Air / Waterline Aktif (Bidang Horizontal):</span>
              <strong className="text-cyan-400">{activeWl.name} (Z = {activeZ.toFixed(2)} m)</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {effectiveLevels.map((wl) => {
              const isSelected = wl.id === selectedWlId;
              const zVal = wl.draftFraction * T;
              return (
                <button
                  key={`wl-btn-${wl.id}`}
                  onClick={() => setSelectedWlId(wl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-900/40 scale-105"
                      : "bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: wl.color }} />
                  <span>{wl.shortName}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Z={zVal.toFixed(2)}m</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DUAL-PANEL SYNCHRONIZED VECTOR SVG CANVASES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ════════════════════════════════════════════════════════════════════
            LEFT CANVAS: PENAMPANG GADING & RADIUS BILGA (BODY SECTION)
            ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3 relative flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                📐 Kanvas 1: Penampang Gading {selectedStation} (Bilga & Body)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Tarik titik secara horizontal (0.5 B)
            </span>
          </div>

          {/* SVG Frame Canvas */}
          <div className="flex-1 flex items-center justify-center p-2 bg-[#02050e] rounded-xl border border-slate-900 overflow-hidden relative select-none">
            <svg
              ref={bilgeSvgRef}
              className="w-full h-auto max-h-[380px]"
              viewBox="0 0 460 360"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Coordinate Grid Background */}
              <defs>
                <pattern id="bilgeGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect x="60" y="30" width="360" height="270" fill="url(#bilgeGrid)" />

              {/* Centerline (CL) */}
              <line x1="60" y1="20" x2="60" y2="310" stroke="#0284c7" strokeWidth="1.8" />
              <text x="60" y="16" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                CL (Centerline)
              </text>

              {/* Baseline (BL) */}
              <line x1="50" y1="300" x2="430" y2="300" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="435" y="303" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                BL (0m)
              </text>

              {/* Deck Height line (H) */}
              {(() => {
                const yDeck = 300 - (H / Math.max(H, T * 1.25)) * 260;
                return (
                  <g key="deck-line">
                    <line x1="55" y1={yDeck} x2="425" y2={yDeck} stroke="#eab308" strokeWidth="1" strokeDasharray="4,2" />
                    <text x="430" y={yDeck + 3} fill="#eab308" fontSize="8.5" fontFamily="monospace">Geladak ({H.toFixed(2)}m)</text>
                  </g>
                );
              })()}

              {/* Waterlines horizontal guides */}
              {effectiveLevels.map((wl) => {
                const zVal = wl.draftFraction * T;
                const yPos = 300 - (zVal / Math.max(H, T * 1.25)) * 260;
                const isSelectedWl = wl.id === selectedWlId;
                return (
                  <g key={`bilge-wl-line-${wl.id}`}>
                    <line
                      x1="60"
                      y1={yPos}
                      x2="420"
                      y2={yPos}
                      stroke={isSelectedWl ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelectedWl ? 1.6 : 0.6}
                      strokeDasharray={isSelectedWl ? "none" : "3,2"}
                    />
                    <text
                      x="52"
                      y={yPos + 3}
                      fill={isSelectedWl ? "#38bdf8" : "#64748b"}
                      fontSize={isSelectedWl ? "9.5" : "8.5"}
                      fontWeight={isSelectedWl ? "bold" : "normal"}
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {wl.shortName}
                    </text>
                  </g>
                );
              })}

              {/* Station Section Curve */}
              {(() => {
                const sectionPoints = effectiveLevels.map((wl) => {
                  const zVal = wl.draftFraction * T;
                  const yVal = localOffsets[wl.id]?.[selectedStation] ?? 0;
                  const px = 60 + (yVal / (halfB * 1.15)) * 360;
                  const py = 300 - (zVal / Math.max(H, T * 1.25)) * 260;
                  return { x: px, y: py };
                }).sort((a, b) => b.y - a.y); // from bottom to top

                const pathD = getSmoothPathD(sectionPoints);

                return (
                  <g key="station-curve-group">
                    {/* Shaded Area Under Section */}
                    <path
                      d={`${pathD} L 60,${sectionPoints[sectionPoints.length - 1]?.y || 300} L 60,300 Z`}
                      fill="rgba(56, 189, 248, 0.08)"
                    />
                    {/* Outline Curve */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })()}

              {/* Station Control Nodes (Interactive Handles at each Waterline) */}
              {effectiveLevels.map((wl) => {
                const zVal = wl.draftFraction * T;
                const yVal = localOffsets[wl.id]?.[selectedStation] ?? 0;
                const px = 60 + (yVal / (halfB * 1.15)) * 360;
                const py = 300 - (zVal / Math.max(H, T * 1.25)) * 260;
                const isSelectedWl = wl.id === selectedWlId;
                const isDragging = draggingBilgeZ === wl.id;

                return (
                  <g key={`bilge-node-${wl.id}`}>
                    {/* Glowing Target Ring on Selected Intersect */}
                    {isSelectedWl && (
                      <circle cx={px} cy={py} r="10" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,2" className="animate-spin" />
                    )}
                    {/* Invisible Large Touch/Mouse Hitbox */}
                    <circle
                      cx={px}
                      cy={py}
                      r="16"
                      fill="transparent"
                      className="cursor-ew-resize"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggingBilgeZ(wl.id);
                        setSelectedWlId(wl.id);
                      }}
                    />
                    {/* Visible Handle Node */}
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelectedWl || isDragging ? "6.5" : "4.5"}
                      fill={isSelectedWl ? "#38bdf8" : "#0284c7"}
                      stroke="#ffffff"
                      strokeWidth={isSelectedWl ? 2.2 : 1}
                      className="cursor-ew-resize pointer-events-none"
                    />
                    {/* Tooltip Label on Hover / Drag */}
                    {(isSelectedWl || isDragging) && (
                      <g className="pointer-events-none">
                        <rect x={px + 8} y={py - 16} width="66" height="15" rx="3" fill="#090d16" stroke="#38bdf8" strokeWidth="0.8" />
                        <text x={px + 41} y={py - 6} fill="#7dd3fc" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {yVal.toFixed(3)}m
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Gading {selectedStation} @ {activeWl.shortName}:</span>
              <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                <span className="text-slate-400">0.5B =</span>
                <input
                  type="number"
                  step="0.01"
                  value={activeInterceptY}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleUpdateOffset(activeWl.id, selectedStation, val, true);
                  }}
                  className="w-16 bg-transparent text-cyan-300 font-bold outline-none text-center"
                />
                <span className="text-slate-400">m</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.05, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.05 m"
              >
                -0.05m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.01, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.01 m"
              >
                -0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.01, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.01 m"
              >
                +0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.05, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.05 m"
              >
                +0.05m
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT CANVAS: BIDANG GARIS AIR (WATERPLANE HALF-BREADTH PLAN)
            ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3 relative flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                🌊 Kanvas 2: Garis Air {activeWl.name} (Waterplane Plan)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Tarik titik secara vertikal (0.5 B)
            </span>
          </div>

          {/* SVG Waterplane Canvas */}
          <div className="flex-1 flex items-center justify-center p-2 bg-[#02050e] rounded-xl border border-slate-900 overflow-hidden relative select-none">
            <svg
              ref={wlSvgRef}
              className="w-full h-auto max-h-[380px]"
              viewBox="0 0 540 280"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background Grid */}
              <defs>
                <pattern id="wlGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect x="40" y="30" width="460" height="200" fill="url(#wlGrid)" />

              {/* Baseline / Centerline CL (Bottom line) */}
              <line x1="30" y1="230" x2="510" y2="230" stroke="#0284c7" strokeWidth="1.8" />
              <text x="270" y="248" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Centerline (CL - Sumbu Panjang Kapal)
              </text>

              {/* Maximum Breadth 0.5B Limit line */}
              <line x1="35" y1="40" x2="505" y2="40" stroke="#64748b" strokeWidth="0.8" strokeDasharray="4,2" />
              <text x="510" y="43" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                0.5B ({halfB.toFixed(2)}m)
              </text>

              {/* Station Vertical Grid Lines */}
              {STATIONS.filter((s) => s.isMain).map((st) => {
                const xPos = 40 + st.xFrac * 460;
                const isSelectedSt = st.id === selectedStation;
                return (
                  <g key={`wl-st-line-${st.id}`}>
                    <line
                      x1={xPos}
                      y1="35"
                      x2={xPos}
                      y2="230"
                      stroke={isSelectedSt ? "#f59e0b" : st.isMid ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelectedSt ? 1.6 : st.isMid ? 1.2 : 0.6}
                      strokeDasharray={isSelectedSt ? "none" : "3,2"}
                    />
                    <text
                      x={xPos}
                      y="244"
                      fill={isSelectedSt ? "#f59e0b" : st.isMid ? "#38bdf8" : "#64748b"}
                      fontSize={isSelectedSt ? "9.5" : "8"}
                      fontWeight={isSelectedSt || st.isMid ? "bold" : "normal"}
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {st.id === 0 ? "AP" : st.id === 20 ? "FP" : st.id === 10 ? "⊗10" : st.id}
                    </text>
                  </g>
                );
              })}

              {/* Waterplane Curve */}
              {(() => {
                const points = STATIONS.map((st) => {
                  const xPos = 40 + st.xFrac * 460;
                  const yVal = localOffsets[activeWl.id]?.[st.id] ?? 0;
                  const yPos = 230 - (yVal / (halfB * 1.15)) * 190;
                  return { x: xPos, y: yPos };
                });

                const pathD = getSmoothPathD(points);

                return (
                  <g key="wl-curve-group">
                    {/* Shaded Half-Waterplane Area */}
                    <path
                      d={`${pathD} L 500,230 L 40,230 Z`}
                      fill="rgba(56, 189, 248, 0.12)"
                    />
                    {/* Curve Outline */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={activeWl.color || "#38bdf8"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })()}

              {/* Station Control Nodes along Waterline Curve */}
              {STATIONS.filter((s) => s.isMain).map((st) => {
                const xPos = 40 + st.xFrac * 460;
                const yVal = localOffsets[activeWl.id]?.[st.id] ?? 0;
                const yPos = 230 - (yVal / (halfB * 1.15)) * 190;
                const isSelectedSt = st.id === selectedStation;
                const isDragging = draggingWlStation === st.id;

                return (
                  <g key={`wl-node-${st.id}`}>
                    {/* Glowing Target Ring on Selected Intersect */}
                    {isSelectedSt && (
                      <circle cx={xPos} cy={yPos} r="10" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" className="animate-spin" />
                    )}
                    {/* Invisible Large Touch/Mouse Hitbox */}
                    <circle
                      cx={xPos}
                      cy={yPos}
                      r="16"
                      fill="transparent"
                      className="cursor-ns-resize"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggingWlStation(st.id);
                        setSelectedStation(st.id);
                      }}
                    />
                    {/* Visible Node Handle */}
                    <circle
                      cx={xPos}
                      cy={yPos}
                      r={isSelectedSt || isDragging ? "6.5" : "4.5"}
                      fill={isSelectedSt ? "#f59e0b" : activeWl.color || "#38bdf8"}
                      stroke="#ffffff"
                      strokeWidth={isSelectedSt ? 2.2 : 1}
                      className="cursor-ns-resize pointer-events-none"
                    />
                    {/* Tooltip on active */}
                    {(isSelectedSt || isDragging) && (
                      <g className="pointer-events-none">
                        <rect x={xPos - 30} y={yPos - 20} width="60" height="15" rx="3" fill="#090d16" stroke="#f59e0b" strokeWidth="0.8" />
                        <text x={xPos} y={yPos - 10} fill="#fde047" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {yVal.toFixed(3)}m
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">{activeWl.shortName} (Z={activeZ.toFixed(2)}m):</span>
              <span className="text-emerald-400 font-bold">AWL = {awlSimpsonCalc.awlActual.toFixed(2)} m&sup2;</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.05, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.05 m"
              >
                -0.05m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.01, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.01 m"
              >
                -0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.01, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.01 m"
              >
                +0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.05, true)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.05 m"
              >
                +0.05m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. HARMONIZED OFFSETS MATRIX TABLE */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TableIcon size={16} className="text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Matriks Ordinat Separuh Lebar Terpadu (0.5 B dalam meter)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Koreksi deviasi otomatis disinkronkan real-time
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar border border-slate-800 rounded-xl">
          <table className="w-full text-xs font-mono text-center border-collapse">
            <thead className="bg-slate-950 text-slate-300 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-800 text-left">Level WL</th>
                <th className="py-2.5 px-3 border-r border-slate-800">Sarat Z (m)</th>
                {STATIONS.filter((s) => s.isMain).map((st) => (
                  <th
                    key={`th-st-${st.id}`}
                    className={`py-2.5 px-2 border-r border-slate-800 ${st.id === selectedStation ? "bg-cyan-950/60 text-cyan-300 font-bold" : ""}`}
                  >
                    {st.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300 text-[11px]">
              {effectiveLevels.map((wl) => {
                const zVal = wl.draftFraction * T;
                const isSelectedWl = wl.id === selectedWlId;
                return (
                  <tr key={`matrix-row-${wl.id}`} className={isSelectedWl ? "bg-blue-950/30" : "hover:bg-slate-800/40"}>
                    <td className="py-2 px-3 border-r border-slate-800 text-left font-bold text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wl.color }} />
                      <span>{wl.shortName}</span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-800 text-slate-400 font-semibold">{zVal.toFixed(2)}</td>
                    {STATIONS.filter((s) => s.isMain).map((st) => {
                      const val = localOffsets[wl.id]?.[st.id] ?? 0;
                      const isIntersect = isSelectedWl && st.id === selectedStation;
                      return (
                        <td
                          key={`matrix-cell-${wl.id}-${st.id}`}
                          className={`py-2 px-2 border-r border-slate-800 ${
                            isIntersect
                              ? "bg-amber-500/20 text-amber-300 font-bold ring-1 ring-amber-500/50"
                              : st.id === selectedStation
                              ? "bg-cyan-950/30 text-cyan-300"
                              : ""
                          }`}
                        >
                          <input
                            type="number"
                            step="0.001"
                            value={val}
                            onChange={(e) => handleUpdateOffset(wl.id, st.id, parseFloat(e.target.value) || 0)}
                            className="w-14 bg-transparent text-center focus:bg-slate-950 focus:border focus:border-cyan-400 rounded outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
