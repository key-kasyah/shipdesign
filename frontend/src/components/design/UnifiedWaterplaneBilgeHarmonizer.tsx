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
  Check,
  Wand2,
  Eye,
  EyeOff,
  Download,
  Copy,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Ship
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

// ══════════════════════════════════════════════════════════════════════════
// 1. ADVANCED MATHEMATICAL SPLINE ENGINES (ZERO-LOOP / PARAMETRIC FAIRING)
// ══════════════════════════════════════════════════════════════════════════

interface Point2D {
  x: number;
  y: number;
}

/**
 * Centripetal Catmull-Rom Spline for parametric curves (Station Body Sections & Bilge).
 * Parameterized along arc length to prevent self-intersections, loops, and overshoot.
 */
function getParametricCatmullRomPath(points: Point2D[], alpha = 0.5, tension = 0.0): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)},${points[1].y.toFixed(2)}`;
  }

  // Remove duplicate adjacent points
  const filtered: Point2D[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (dist > 0.01) {
      filtered.push(curr);
    }
  }

  if (filtered.length < 2) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  let d = `M ${filtered[0].x.toFixed(2)},${filtered[0].y.toFixed(2)}`;
  const n = filtered.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? filtered[0] : filtered[i - 1];
    const p1 = filtered[i];
    const p2 = filtered[i + 1];
    const p3 = i + 2 < n ? filtered[i + 2] : p2;

    const d1 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha) || 1e-4;
    const d2 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha) || 1e-4;
    const d3 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha) || 1e-4;

    const t1x = ((1 - tension) * (p2.x - p0.x)) / (d1 + d2) * d2;
    const t1y = ((1 - tension) * (p2.y - p0.y)) / (d1 + d2) * d2;
    const t2x = ((1 - tension) * (p3.x - p1.x)) / (d2 + d3) * d2;
    const t2y = ((1 - tension) * (p3.y - p1.y)) / (d2 + d3) * d2;

    const cp1x = p1.x + t1x / 3;
    const cp1y = p1.y + t1y / 3;
    const cp2x = p2.x - t2x / 3;
    const cp2y = p2.y - t2y / 3;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Smooth Monotone Cubic Spline along longitudinal axis X for Waterplane Curve.
 * Guaranteed no oscillation, no spikes, and smooth boundary at AP & FP.
 */
function getMonotoneWaterplanePath(points: Point2D[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  // Sort ascending by X
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const n = sorted.length;
  const delta = new Float64Array(n - 1);
  const m = new Float64Array(n);

  for (let i = 0; i < n - 1; i++) {
    const dx = sorted[i + 1].x - sorted[i].x;
    delta[i] = dx === 0 ? 0 : (sorted[i + 1].y - sorted[i].y) / dx;
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

  let d = `M ${sorted[0].x.toFixed(2)},${sorted[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];
    const dx = (p1.x - p0.x) / 3;

    const cp1x = p0.x + dx;
    const cp1y = p0.y + m[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - m[i + 1] * dx;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  return d;
}

// ══════════════════════════════════════════════════════════════════════════
// 2. STANDARD 21 STATIONS DEFINITION
// ══════════════════════════════════════════════════════════════════════════
const STATIONS = [
  { id: 0, name: "St. 0 (AP)", xFrac: 0.0, isMain: true, isAP: true },
  { id: 0.5, name: "St. 0.5", xFrac: 0.5 / 20, isMain: false },
  { id: 1, name: "St. 1", xFrac: 1.0 / 20, isMain: true },
  { id: 1.5, name: "St. 1.5", xFrac: 1.5 / 20, isMain: false },
  { id: 2, name: "St. 2", xFrac: 2.0 / 20, isMain: true },
  { id: 3, name: "St. 3", xFrac: 3.0 / 20, isMain: true },
  { id: 4, name: "St. 4", xFrac: 4.0 / 20, isMain: true },
  { id: 5, name: "St. 5", xFrac: 5.0 / 20, isMain: true },
  { id: 6, name: "St. 6", xFrac: 6.0 / 20, isMain: true },
  { id: 7, name: "St. 7", xFrac: 7.0 / 20, isMain: true },
  { id: 8, name: "St. 8", xFrac: 8.0 / 20, isMain: true },
  { id: 9, name: "St. 9", xFrac: 9.0 / 20, isMain: true },
  { id: 10, name: "St. 10 (⊗ Mid)", xFrac: 10.0 / 20, isMain: true, isMid: true },
  { id: 11, name: "St. 11", xFrac: 11.0 / 20, isMain: true },
  { id: 12, name: "St. 12", xFrac: 12.0 / 20, isMain: true },
  { id: 13, name: "St. 13", xFrac: 13.0 / 20, isMain: true },
  { id: 14, name: "St. 14", xFrac: 14.0 / 20, isMain: true },
  { id: 15, name: "St. 15", xFrac: 15.0 / 20, isMain: true },
  { id: 16, name: "St. 16", xFrac: 16.0 / 20, isMain: true },
  { id: 17, name: "St. 17", xFrac: 17.0 / 20, isMain: true },
  { id: 18, name: "St. 18", xFrac: 18.0 / 20, isMain: true },
  { id: 18.5, name: "St. 18.5", xFrac: 18.5 / 20, isMain: false },
  { id: 19, name: "St. 19", xFrac: 19.0 / 20, isMain: true },
  { id: 19.5, name: "St. 19.5", xFrac: 19.5 / 20, isMain: false },
  { id: 20, name: "St. 20 (FP)", xFrac: 1.0, isMain: true, isFP: true }
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
  const Cb = cb || 0.76;
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

  // Target Hydrostatic Areas
  const targetAm = Number((B * T * Cm).toFixed(2));
  const LWL = Number((LBP * 1.025).toFixed(2));
  const targetDWLAWL = Number((LWL * B * targetCw).toFixed(2));

  // Selection & UI Mode States
  const [selectedStation, setSelectedStation] = useState<number>(10); // Default Gading 10 (Midship)
  const [selectedWlId, setSelectedWlId] = useState<string>(
    effectiveLevels[0]?.id || "WL3"
  );
  const [showMirrorSymmetry, setShowMirrorSymmetry] = useState<boolean>(false);
  const [showGhostWaterlines, setShowGhostWaterlines] = useState<boolean>(true);
  const [showGhostStations, setShowGhostStations] = useState<boolean>(false);
  const [showCurvatureCombs, setShowCurvatureCombs] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Helper: Generate clean realistic initial hull offsets
  const generateCleanBaselineOffsets = useCallback(
    (customPreset?: "tanker" | "cargo" | "passenger" | "barge"): Record<string, Record<number, number>> => {
      const preset = customPreset || (vesselType.toLowerCase().includes("tank") ? "tanker" : "cargo");
      const init: Record<string, Record<number, number>> = {};

      // PMB boundaries based on ship type
      const pmbStart = preset === "barge" ? 0.15 : preset === "tanker" ? 0.30 : preset === "cargo" ? 0.35 : 0.40;
      const pmbEnd = preset === "barge" ? 0.85 : preset === "tanker" ? 0.70 : preset === "cargo" ? 0.65 : 0.60;

      effectiveLevels.forEach((wl) => {
        const z = wl.draftFraction * T;
        init[wl.id] = {};

        STATIONS.forEach((st) => {
          const xFrac = Math.max(0, Math.min(1.0, st.xFrac));
          let xFactor = 1.0;

          if (xFrac < pmbStart) {
            // Aft run smoothly curving from AP (0 to flat)
            const u = xFrac / pmbStart;
            // Smooth sinusoidal hermite taper
            xFactor = Math.sin(u * (Math.PI / 2));
            if (preset === "passenger") xFactor = Math.pow(xFactor, 1.2);
          } else if (xFrac > pmbEnd) {
            // Fore run smoothly tapering to FP (0 at FP)
            const u = (xFrac - pmbEnd) / (1.0 - pmbEnd);
            xFactor = Math.cos(u * (Math.PI / 2));
            if (preset === "passenger") xFactor = Math.pow(xFactor, 1.15);
          }

          // Transverse Bilge Radius calculation at elevation z
          let yBilge = halfB;
          if (z <= 0) {
            yBilge = flatOfBottom;
          } else if (z < R && R > 0) {
            const dz = R - z;
            yBilge = halfB - R + Math.sqrt(Math.max(0, R * R - dz * dz));
          } else {
            yBilge = halfB;
          }

          // Flare factor at higher waterlines near bow
          if (xFrac > 0.8 && z > T * 0.7) {
            yBilge *= 1.0 + (xFrac - 0.8) * 0.15 * (z / T);
          }

          // Strict boundary at FP for standard waterline
          if (st.id === 20) {
            xFactor = 0.0;
          }

          const yVal = Number(Math.max(0, Math.min(halfB, yBilge * xFactor * wl.maxBreadthFactor)).toFixed(3));
          init[wl.id][st.id] = yVal;
        });
      });

      return init;
    },
    [B, T, Cm, R, flatOfBottom, halfB, effectiveLevels, vesselType]
  );

  // Local Offsets State (Two-Way synchronized)
  const [localOffsets, setLocalOffsets] = useState<Record<string, Record<number, number>>>(() => {
    if (waterlinesData && Object.keys(waterlinesData).length > 0) {
      return waterlinesData;
    }
    return generateCleanBaselineOffsets();
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

  // Synchronized update handler
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
  // WINDOW-LEVEL POINTER DRAG LISTENERS
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Left Canvas (Bilge Section) Dragging
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

  // 2. Right Canvas (Waterplane Curve) Dragging
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
  // HYDROSTATIC CALCULATIONS & ACCURACY CRITERIA
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Simpson 1/3 Rule AWL of Active Waterline
  const awlSimpsonCalc = useMemo(() => {
    const wlData = localOffsets[activeWl.id] || {};
    const mainStations = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const simpsonMultipliers = [1, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 1];

    let sum = 0;
    let momentMidSum = 0;
    let itSum = 0; // Transverse moment of inertia

    mainStations.forEach((stNum, idx) => {
      const yVal = wlData[stNum] ?? 0;
      const factor = simpsonMultipliers[idx];
      sum += factor * yVal;
      momentMidSum += factor * yVal * (stNum - 10);
      itSum += factor * Math.pow(yVal, 3);
    });

    const awlActual = Number(((2 / 3) * l_spacing * sum).toFixed(2));
    const targetAWLForLevel = Number((targetDWLAWL * activeWl.awlFactor).toFixed(2));
    const deviationPct = targetAWLForLevel > 0
      ? Number((((awlActual - targetAWLForLevel) / targetAWLForLevel) * 100).toFixed(3))
      : 0;

    const isValid = Math.abs(deviationPct) <= 0.05;
    const lcfFromMid = sum > 0 ? Number(((momentMidSum * l_spacing) / sum).toFixed(3)) : 0;
    const actualCw = (LWL * B) > 0 ? Number((awlActual / (LWL * B)).toFixed(3)) : 0;
    const transverseInertiaIT = Number(((2 / 9) * l_spacing * itSum).toFixed(2));

    return {
      awlActual,
      targetAWL: targetAWLForLevel,
      deviationPct,
      isValid,
      lcfFromMid,
      actualCw,
      transverseInertiaIT
    };
  }, [localOffsets, activeWl, l_spacing, targetDWLAWL, LWL, B]);

  // 2. Trapezoidal Midship Section Area (Am) of Selected Station
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
    const actualCm = (B * T) > 0 ? Number((amActual / (B * T)).toFixed(3)) : 0;

    return {
      amActual,
      targetAm: targetStationAm,
      deviationPct,
      isValid,
      actualCm,
      points
    };
  }, [selectedStation, effectiveLevels, T, localOffsets, targetAm, csaOrdinates, B]);

  // ══════════════════════════════════════════════════════════════════════════
  // SMART FAIRING & HULL PRESET TOOLS
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Auto-Fair active Waterplane using 3-point smoothing
  const handleAutoFairWaterplane = () => {
    const currentWlData = { ...(localOffsets[activeWl.id] || {}) };
    const mainStations = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const smoothed: Record<number, number> = {};

    mainStations.forEach((st) => {
      if (st === 0 || st === 20) {
        smoothed[st] = currentWlData[st] ?? 0;
      } else if (st >= 7 && st <= 13) {
        // Parallel middle body stays at max breadth
        smoothed[st] = Number(Math.min(halfB, currentWlData[10] || halfB).toFixed(3));
      } else {
        const prev = currentWlData[st - 1] ?? 0;
        const curr = currentWlData[st] ?? 0;
        const next = currentWlData[st + 1] ?? 0;
        smoothed[st] = Number(((prev + 2 * curr + next) / 4).toFixed(3));
      }
    });

    setLocalOffsets((prev) => {
      const updated = {
        ...prev,
        [activeWl.id]: {
          ...(prev[activeWl.id] || {}),
          ...smoothed
        }
      };
      if (onUpdateWaterlinesData) onUpdateWaterlinesData(updated);
      return updated;
    });
  };

  // 2. Auto-Harmonize Bilge for Active Station
  const handleAutoHarmonizeStation = () => {
    setLocalOffsets((prev) => {
      const updated = { ...prev };
      const st = selectedStation;
      const xFrac = st / 20;
      let xFactor = 1.0;
      if (xFrac < 0.3) {
        xFactor = Math.sin((xFrac / 0.3) * (Math.PI / 2));
      } else if (xFrac > 0.7) {
        xFactor = Math.cos(((xFrac - 0.7) / 0.3) * (Math.PI / 2));
      }

      effectiveLevels.forEach((wl) => {
        const z = wl.draftFraction * T;
        let yBilge = halfB;
        if (z <= 0) {
          yBilge = flatOfBottom;
        } else if (z < R && R > 0) {
          const dz = R - z;
          yBilge = halfB - R + Math.sqrt(Math.max(0, R * R - dz * dz));
        }
        updated[wl.id] = {
          ...(updated[wl.id] || {}),
          [st]: Number((yBilge * xFactor * wl.maxBreadthFactor).toFixed(3))
        };
      });

      if (onUpdateWaterlinesData) onUpdateWaterlinesData(updated);
      return updated;
    });
  };

  // 3. Global Harmonization Across All Stations & Waterlines
  const handleAutoHarmonizeAll = (preset?: "tanker" | "cargo" | "passenger" | "barge") => {
    const newOffsets = generateCleanBaselineOffsets(preset);
    setLocalOffsets(newOffsets);
    if (onUpdateWaterlinesData) {
      onUpdateWaterlinesData(newOffsets);
    }
  };

  // 4. Export CAD Script (.scr)
  const handleExportCadScript = () => {
    let scr = ";; LINES PLAN CAD GENERATION SCRIPT (AUTOCAD / BRICSCAD)\n";
    scr += `;; Generated by Ship Design AI Platform\n`;
    scr += `;; LBP=${LBP}m, B=${B}m, T=${T}m, Depth=${H}m\n\n`;
    scr += "_LAYER _M LINES_PLAN _C 3 LINES_PLAN \n\n";

    // Waterlines 3D Polylines
    effectiveLevels.forEach((wl) => {
      const zVal = (wl.draftFraction * T).toFixed(3);
      scr += `;; --- Waterline: ${wl.name} (Z=${zVal}m) ---\n_3DPOLY\n`;
      STATIONS.forEach((st) => {
        const xVal = (st.xFrac * LBP).toFixed(3);
        const yVal = (localOffsets[wl.id]?.[st.id] ?? 0).toFixed(3);
        scr += `${xVal},${yVal},${zVal}\n`;
      });
      scr += "\n";
    });

    const blob = new Blob([scr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lines_plan_${LBP.toFixed(0)}m_${activeWl.shortName}.scr`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy Matrix to Clipboard
  const handleCopyMatrix = () => {
    let text = `LEVEL\tZ (m)\t${STATIONS.filter((s) => s.isMain).map((s) => s.name).join("\t")}\n`;
    effectiveLevels.forEach((wl) => {
      const z = (wl.draftFraction * T).toFixed(2);
      const row = STATIONS.filter((s) => s.isMain).map((s) => (localOffsets[wl.id]?.[s.id] ?? 0).toFixed(3)).join("\t");
      text += `${wl.shortName}\t${z}\t${row}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
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
                  Real-Time 2-Way CAD Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === "en"
                  ? "Interactive link between frame cross-sections (Bilge) and waterplane curves (WL) with zero-loop parametric splines."
                  : "Editor grafis parametrik dua arah antara penampang gading (Body Plan) dan kurva garis air (Waterplane Plan) dengan interpolasi centripetal mulus."}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5 self-start lg:self-auto font-mono text-xs">
            {/* Presets dropdown */}
            <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-1">
              <Ship size={13} className="text-cyan-400" />
              <select
                onChange={(e) => handleAutoHarmonizeAll(e.target.value as any)}
                defaultValue={vesselType.toLowerCase().includes("tank") ? "tanker" : "cargo"}
                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer pr-1"
                title="Pilih preset profil lambung standar"
              >
                <option value="tanker" className="bg-slate-900 text-white">Preset: Tanker / Bulk (Cb 0.78)</option>
                <option value="cargo" className="bg-slate-900 text-white">Preset: General Cargo (Cb 0.70)</option>
                <option value="passenger" className="bg-slate-900 text-white">Preset: Fast Ferry / Tug (Cb 0.58)</option>
                <option value="barge" className="bg-slate-900 text-white">Preset: Ponton / Tongkang</option>
              </select>
            </div>

            <button
              onClick={() => handleAutoHarmonizeAll()}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-900/30 cursor-pointer active:scale-[0.98]"
              title="Harmonisasi otomatis seluruh gading dan garis air ke kurva bilga mulus"
            >
              <Sparkles size={13} />
              <span>Harmonisasi Penuh (Auto-Fair)</span>
            </button>

            <button
              onClick={handleExportCadScript}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all flex items-center space-x-1.5 border border-slate-700 cursor-pointer active:scale-[0.98]"
              title="Unduh file AutoCAD Script (.scr) untuk Lines Plan"
            >
              <Download size={13} className="text-cyan-400" />
              <span>Ekspor SCR</span>
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
              <span className="text-slate-400 uppercase font-semibold">1. Luas Garis Air (AWL {activeWl.shortName})</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${awlSimpsonCalc.isValid ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
                {awlSimpsonCalc.isValid ? "✓ Sesuai Target (±0.05%)" : "⚠️ Deviasi > ±0.05%"}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-white">{awlSimpsonCalc.awlActual.toFixed(2)}</span>
              <span className="text-xs text-slate-400">/ Target {awlSimpsonCalc.targetAWL.toFixed(2)} m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
              <span>Deviasi: <strong className={awlSimpsonCalc.isValid ? "text-emerald-400" : "text-rose-400"}>{awlSimpsonCalc.deviationPct > 0 ? `+${awlSimpsonCalc.deviationPct}%` : `${awlSimpsonCalc.deviationPct}%`}</strong></span>
              <span className="text-cyan-300">Cw: {awlSimpsonCalc.actualCw.toFixed(3)} (Target {targetCw.toFixed(2)})</span>
            </div>
          </div>

          {/* Card 2: Midship Frame Area Correction */}
          <div className={`p-4 rounded-xl border ${amMidshipCalc.isValid ? "bg-emerald-950/30 border-emerald-500/40" : "bg-rose-950/30 border-rose-500/40"} space-y-1.5`}>
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-400 uppercase font-semibold">2. Luas Penampang ({selectedStation === 10 ? "Midship Am" : `Station ${selectedStation}`})</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${amMidshipCalc.isValid ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}>
                {amMidshipCalc.isValid ? "✓ Sesuai Target" : "⚠️ Deviasi"}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-white">{amMidshipCalc.amActual.toFixed(2)}</span>
              <span className="text-xs text-slate-400">/ Target {amMidshipCalc.targetAm.toFixed(2)} m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
              <span>Cm: <strong className="text-white">{amMidshipCalc.actualCm.toFixed(3)}</strong> (Target {Cm.toFixed(2)})</span>
              <span className="text-amber-300">Radius Bilga R: {R.toFixed(2)} m</span>
            </div>
          </div>

          {/* Card 3: Two-Way Synchronization Intercept */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="text-slate-400 uppercase font-semibold">3. Titik Temu (St {selectedStation} ∩ {activeWl.shortName})</span>
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

      {/* 2. STATION & WATERLINE SELECTOR BARS & DISPLAY TOGGLES */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xl shadow-xl space-y-3 font-mono">
        {/* Row 1: Station Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase font-semibold text-[11px] flex items-center space-x-1.5">
              <span>📍 Pilih Gading / Station Aktif (Penampang Melintang):</span>
              <strong className="text-cyan-400">Station {selectedStation} {selectedStation === 10 ? "(Midship)" : ""}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAutoHarmonizeStation}
                className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center space-x-1 cursor-pointer transition-all"
                title="Harmonisasi otomatis kurva gading ini ke radius bilga"
              >
                <Wand2 size={11} />
                <span>Haluskan Gading {selectedStation}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
            {STATIONS.filter((s) => s.isMain).map((st) => {
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
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAutoFairWaterplane}
                className="text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/40 px-2 py-0.5 rounded-lg flex items-center space-x-1 cursor-pointer transition-all"
                title="Fairing otomatis garis air aktif untuk menghilangkan ketidakmulusan"
              >
                <Wand2 size={11} />
                <span>Haluskan WL {activeWl.shortName}</span>
              </button>
            </div>
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

        {/* Row 3: Visual Overlay Display Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center space-x-3 text-slate-400">
            <span className="font-semibold text-slate-300">Opsi Tampilan:</span>
            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white transition-all">
              <input
                type="checkbox"
                checked={showMirrorSymmetry}
                onChange={(e) => setShowMirrorSymmetry(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Simetri Penuh (Port & Stbd)</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white transition-all">
              <input
                type="checkbox"
                checked={showGhostWaterlines}
                onChange={(e) => setShowGhostWaterlines(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Tampilkan Semua Waterline (Ghost)</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white transition-all">
              <input
                type="checkbox"
                checked={showCurvatureCombs}
                onChange={(e) => setShowCurvatureCombs(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Indikator Kelengkungan (Fairness Comb)</span>
            </label>
          </div>

          <div className="text-[10px] text-slate-500">
            💡 Tips: Seret titik kontrol pada kanvas untuk menyesuaikan bentuk lambung secara presisi.
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
                📐 Kanvas 1: Penampang Gading {selectedStation} (Bilga & Body Plan)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Tarik titik secara horizontal (0.5 B)
            </span>
          </div>

          {/* SVG Frame Canvas */}
          <div className="flex-1 flex items-center justify-center p-2 bg-[#02050e] rounded-xl border border-slate-900 overflow-hidden relative select-none min-h-[300px]">
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
                <linearGradient id="sectionFillGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                </linearGradient>
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

              {/* Ghost Curves of other stations if enabled */}
              {showGhostStations && [0, 5, 10, 15, 20].map((stId) => {
                if (stId === selectedStation) return null;
                const pts = effectiveLevels.map((wl) => {
                  const zVal = wl.draftFraction * T;
                  const yVal = localOffsets[wl.id]?.[stId] ?? 0;
                  const px = 60 + (yVal / (halfB * 1.15)) * 360;
                  const py = 300 - (zVal / Math.max(H, T * 1.25)) * 260;
                  return { x: px, y: py };
                }).sort((a, b) => b.y - a.y);
                const pathD = getParametricCatmullRomPath(pts);
                return (
                  <path
                    key={`ghost-st-${stId}`}
                    d={pathD}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    strokeOpacity="0.4"
                  />
                );
              })}

              {/* Station Section Curve (Parametric Catmull-Rom from Keel to Deck) */}
              {(() => {
                // Collect points sorted strictly ascending by Z elevation (bottom to top)
                const sortedLevels = [...effectiveLevels].sort((a, b) => a.draftFraction - b.draftFraction);
                const sectionPoints: Point2D[] = [];

                // 1. Keel baseline point at Z=0
                const wl0Val = localOffsets[sortedLevels[0]?.id]?.[selectedStation] ?? (selectedStation === 10 ? flatOfBottom : 0);
                const px0 = 60 + (wl0Val / (halfB * 1.15)) * 360;
                sectionPoints.push({ x: px0, y: 300 });

                // 2. Intermediate waterline intersections
                sortedLevels.forEach((wl) => {
                  const zVal = wl.draftFraction * T;
                  const yVal = localOffsets[wl.id]?.[selectedStation] ?? 0;
                  const px = 60 + (yVal / (halfB * 1.15)) * 360;
                  const py = 300 - (zVal / Math.max(H, T * 1.25)) * 260;
                  sectionPoints.push({ x: px, y: py });
                });

                const pathD = getParametricCatmullRomPath(sectionPoints);
                const topPoint = sectionPoints[sectionPoints.length - 1];

                // Mirrored points if Full Hull symmetry enabled
                let mirrorPathD = "";
                if (showMirrorSymmetry) {
                  const mirrorPoints = sectionPoints.map((p) => ({
                    x: 60 - (p.x - 60),
                    y: p.y
                  }));
                  mirrorPathD = getParametricCatmullRomPath(mirrorPoints);
                }

                return (
                  <g key="station-curve-group">
                    {/* Shaded Area Under Section */}
                    <path
                      d={`${pathD} L 60,${topPoint?.y || 300} L 60,300 Z`}
                      fill="url(#sectionFillGradient)"
                    />
                    {showMirrorSymmetry && (
                      <path
                        d={`${mirrorPathD} L 60,${topPoint?.y || 300} L 60,300 Z`}
                        fill="url(#sectionFillGradient)"
                      />
                    )}

                    {/* Bilge Radius Circle Indicator at Midship */}
                    {selectedStation === 10 && R > 0 && (
                      <circle
                        cx={60 + ((halfB - R) / (halfB * 1.15)) * 360}
                        cy={300 - (R / Math.max(H, T * 1.25)) * 260}
                        r={(R / (halfB * 1.15)) * 360}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        strokeOpacity="0.5"
                      />
                    )}

                    {/* Main Section Curve Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />

                    {showMirrorSymmetry && (
                      <path
                        d={mirrorPathD}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeOpacity="0.75"
                      />
                    )}
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
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.1, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.10 m"
              >
                -0.10m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.01, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.01 m"
              >
                -0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.01, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.01 m"
              >
                +0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.1, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.10 m"
              >
                +0.10m
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
          <div className="flex-1 flex items-center justify-center p-2 bg-[#02050e] rounded-xl border border-slate-900 overflow-hidden relative select-none min-h-[300px]">
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
                <linearGradient id="wlFillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <rect x="40" y="30" width="460" height="200" fill="url(#wlGrid)" />

              {/* Centerline CL (Bottom baseline) */}
              <line x1="30" y1="230" x2="510" y2="230" stroke="#0284c7" strokeWidth="1.8" />
              <text x="270" y="248" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Centerline (CL - Sumbu Panjang Kapal LBP)
              </text>

              {/* Maximum Breadth 0.5B Limit line */}
              <line x1="35" y1="40" x2="505" y2="40" stroke="#64748b" strokeWidth="0.8" strokeDasharray="4,2" />
              <text x="510" y="43" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                0.5B ({halfB.toFixed(2)}m)
              </text>

              {/* Ghost Waterlines of other draft levels if enabled */}
              {showGhostWaterlines && effectiveLevels.map((otherWl) => {
                if (otherWl.id === activeWl.id) return null;
                const pts = STATIONS.map((st) => {
                  const xPos = 40 + st.xFrac * 460;
                  const yVal = localOffsets[otherWl.id]?.[st.id] ?? 0;
                  const yPos = 230 - (yVal / (halfB * 1.15)) * 190;
                  return { x: xPos, y: yPos };
                });
                const pathD = getMonotoneWaterplanePath(pts);
                return (
                  <path
                    key={`ghost-wl-${otherWl.id}`}
                    d={pathD}
                    fill="none"
                    stroke={otherWl.color || "#475569"}
                    strokeWidth="0.9"
                    strokeDasharray="2,2"
                    strokeOpacity="0.35"
                  />
                );
              })}

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

              {/* Waterplane Curve & Shaded Half-Breadth Plan */}
              {(() => {
                const points = STATIONS.map((st) => {
                  const xPos = 40 + st.xFrac * 460;
                  const yVal = localOffsets[activeWl.id]?.[st.id] ?? 0;
                  const yPos = 230 - (yVal / (halfB * 1.15)) * 190;
                  return { x: xPos, y: yPos };
                });

                const pathD = getMonotoneWaterplanePath(points);

                // Mirror for Full Waterplane Hull if enabled
                let mirrorPathD = "";
                if (showMirrorSymmetry) {
                  const mirrorPoints = points.map((p) => ({
                    x: p.x,
                    y: 230 + (230 - p.y)
                  }));
                  mirrorPathD = getMonotoneWaterplanePath(mirrorPoints);
                }

                // Curvature combs if enabled
                const combLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
                if (showCurvatureCombs) {
                  for (let i = 1; i < points.length - 1; i++) {
                    const pPrev = points[i - 1];
                    const pCurr = points[i];
                    const pNext = points[i + 1];
                    const d2y = pNext.y - 2 * pCurr.y + pPrev.y;
                    const len = Math.max(-25, Math.min(25, d2y * 8));
                    combLines.push({
                      x1: pCurr.x,
                      y1: pCurr.y,
                      x2: pCurr.x,
                      y2: pCurr.y - len
                    });
                  }
                }

                return (
                  <g key="wl-curve-group">
                    {/* Shaded Half-Waterplane Area */}
                    <path
                      d={`${pathD} L 500,230 L 40,230 Z`}
                      fill="url(#wlFillGradient)"
                    />

                    {showMirrorSymmetry && (
                      <path
                        d={`${mirrorPathD} L 500,230 L 40,230 Z`}
                        fill="url(#wlFillGradient)"
                      />
                    )}

                    {/* Curvature Combs */}
                    {showCurvatureCombs && combLines.map((line, idx) => (
                      <line
                        key={`comb-${idx}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="#a855f7"
                        strokeWidth="1.2"
                        strokeOpacity="0.75"
                      />
                    ))}

                    {/* Main Waterplane Outline Curve */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={activeWl.color || "#38bdf8"}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />

                    {showMirrorSymmetry && (
                      <path
                        d={mirrorPathD}
                        fill="none"
                        stroke={activeWl.color || "#38bdf8"}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeOpacity="0.75"
                      />
                    )}
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
              <span className="text-slate-500 text-[10px]">LCF={awlSimpsonCalc.lcfFromMid.toFixed(2)}m</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.1, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.10 m"
              >
                -0.10m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY - 0.01, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Kurangi 0.01 m"
              >
                -0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.01, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.01 m"
              >
                +0.01m
              </button>
              <button
                type="button"
                onClick={() => handleUpdateOffset(activeWl.id, selectedStation, activeInterceptY + 0.1, true)}
                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                title="Tambah 0.10 m"
              >
                +0.10m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. HARMONIZED OFFSETS MATRIX TABLE */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <TableIcon size={16} className="text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Matriks Ordinat Separuh Lebar Terpadu (0.5 B dalam meter)
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyMatrix}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-1 border border-slate-700 cursor-pointer transition-all"
            >
              {copiedNotification ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedNotification ? "Tersalin!" : "Salin Tabel"}</span>
            </button>
          </div>
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
                            onChange={(e) => handleUpdateOffset(wl.id, st.id, parseFloat(e.target.value) || 0, true)}
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
