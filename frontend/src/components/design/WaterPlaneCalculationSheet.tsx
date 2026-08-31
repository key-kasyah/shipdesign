"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Table as TableIcon,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Wand2,
  Eye,
  EyeOff,
  Compass,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Maximize,
  Maximize2,
  Minimize,
  Minimize2,
  X,
  Sliders,
  SlidersHorizontal,
  Hash,
  Layers,
  Save,
  Settings,
  Plus,
  Trash2,
  ListPlus,
  Info
} from "lucide-react";

export interface WaterPlaneCalculationProps {
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
  waterlinesData?: Record<string, Record<number, number>>;
  onUpdateWaterlinesData?: (data: Record<string, Record<number, number>>) => void;
  waterlineLevels?: WaterlineConfig[];
  onUpdateWaterlineLevels?: (levels: WaterlineConfig[]) => void;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: string | null;
}

export interface StationConfig {
  station: number;
  label: string;
  zoneId: string;
  ms: number; // Simpson Multiplier
  fm: number; // Lever arm from Midship
  isDraggable?: boolean;
}

export interface WaterlineZoneSetting {
  hasSternOverhang: boolean; // St. B & A
  hasBulbousBow: boolean;    // St. FP-A & FP-B
}

export const getWaterlineDefaultZoneSetting = (draftFraction: number): WaterlineZoneSetting => {
  return {
    hasSternOverhang: draftFraction >= 0.50, // Waterlines >= 50% T (e.g. WL 7 s.d. WL 12 in 13 WL) have stern overhang
    hasBulbousBow: draftFraction <= 0.35     // Lower waterlines (<= 35% T) have bulbous bow
  };
};

export const DEFAULT_ZONE_SETTINGS: Record<string, WaterlineZoneSetting> = {
  WL6: { hasSternOverhang: true,  hasBulbousBow: false },
  WL5: { hasSternOverhang: true,  hasBulbousBow: false },
  WL4: { hasSternOverhang: false, hasBulbousBow: false },
  WL3: { hasSternOverhang: false, hasBulbousBow: false },
  WL2: { hasSternOverhang: false, hasBulbousBow: true },
  WL1: { hasSternOverhang: false, hasBulbousBow: true },
  WL0: { hasSternOverhang: false, hasBulbousBow: true },
};

/**
 * 36 STATIONS CONFIGURATION (Lines Plan Water Plane Calculation)
 * - After Peak (3 Titik): B, A, 0 (AP)
 * - Peak 1 (10 Titik): St. 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5 (Jarak la' = l / 2)
 * - Parallel Middle Body (PMB) (10 Titik): St. 6, 7, 8, 9, 10 (MID), 11, 12, 13, 14, 15 (Jarak Standar l = LBP / 20, Step Seragam 1.0)
 * - Peak 2 (10 Titik): St. 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20 (Jarak lf = l / 2)
 * - Fore Peak (3 Titik): St. 20 (FP), FP-A, FP-B (Ordinat = 0 pada Waterline 6 / di baseline)
 */
export const DEFAULT_STATIONS_CONFIG: StationConfig[] = [
  // --- AFTER PEAK (3 TITIK: 1, 4, 1) ---
  { station: -2.0, label: "B", zoneId: "after-peak", ms: 1.00, fm: -12.0, isDraggable: true },
  { station: -1.0, label: "A", zoneId: "after-peak", ms: 4.00, fm: -11.0, isDraggable: true },
  { station: 0.0,  label: "0 (AP)", zoneId: "after-peak", ms: 1.00, fm: -10.0, isDraggable: true },

  // --- PEAK 1 (10 TITIK: Independent Simpson 1, 4, 2, 4, 2, 4, 2, 4, 2, 1) ---
  { station: 0.5, label: "1",  zoneId: "peak-1", ms: 1.00, fm: -9.5, isDraggable: true },
  { station: 1.0, label: "2",  zoneId: "peak-1", ms: 4.00, fm: -9.0, isDraggable: true },
  { station: 1.5, label: "3",  zoneId: "peak-1", ms: 2.00, fm: -8.5, isDraggable: true },
  { station: 2.0, label: "4",  zoneId: "peak-1", ms: 4.00, fm: -8.0, isDraggable: true },
  { station: 2.5, label: "5",  zoneId: "peak-1", ms: 2.00, fm: -7.5, isDraggable: true },
  { station: 3.0, label: "6",  zoneId: "peak-1", ms: 4.00, fm: -7.0, isDraggable: true },
  { station: 3.5, label: "7",  zoneId: "peak-1", ms: 2.00, fm: -6.5, isDraggable: true },
  { station: 4.0, label: "8",  zoneId: "peak-1", ms: 4.00, fm: -6.0, isDraggable: true },
  { station: 4.5, label: "9",  zoneId: "peak-1", ms: 2.00, fm: -5.5, isDraggable: true },
  { station: 5.0, label: "10", zoneId: "peak-1", ms: 1.00, fm: -5.0, isDraggable: true },

  // --- PARALLEL MIDDLE BODY (PMB) (10 TITIK: TITIK FIX / MAKSIMUM 0.5B, JARAK STANDAR l = LBP/20, STEP SERAGAM 1.0) ---
  { station: 6.0,  label: "11", zoneId: "parallel-middle-body", ms: 1.00, fm: -4.0, isDraggable: false },
  { station: 7.0,  label: "12", zoneId: "parallel-middle-body", ms: 4.00, fm: -3.0, isDraggable: false },
  { station: 8.0,  label: "13", zoneId: "parallel-middle-body", ms: 2.00, fm: -2.0, isDraggable: false },
  { station: 9.0,  label: "14", zoneId: "parallel-middle-body", ms: 4.00, fm: -1.0, isDraggable: false },
  { station: 10.0, label: "15 (MID)", zoneId: "parallel-middle-body", ms: 2.00, fm: 0.0, isDraggable: false },
  { station: 11.0, label: "16", zoneId: "parallel-middle-body", ms: 4.00, fm: 1.0, isDraggable: false },
  { station: 12.0, label: "17", zoneId: "parallel-middle-body", ms: 2.00, fm: 2.0, isDraggable: false },
  { station: 13.0, label: "18", zoneId: "parallel-middle-body", ms: 4.00, fm: 3.0, isDraggable: false },
  { station: 14.0, label: "19", zoneId: "parallel-middle-body", ms: 2.00, fm: 4.0, isDraggable: false },
  { station: 15.0, label: "20", zoneId: "parallel-middle-body", ms: 1.00, fm: 5.0, isDraggable: false },

  // --- PEAK 2 (10 TITIK: 21 s.d 30, Step Seragam 0.5) ---
  { station: 15.5, label: "21", zoneId: "peak-2", ms: 1.00, fm: 5.5, isDraggable: true },
  { station: 16.0, label: "22", zoneId: "peak-2", ms: 4.00, fm: 6.0, isDraggable: true },
  { station: 16.5, label: "23", zoneId: "peak-2", ms: 2.00, fm: 6.5, isDraggable: true },
  { station: 17.0, label: "24", zoneId: "peak-2", ms: 4.00, fm: 7.0, isDraggable: true },
  { station: 17.5, label: "25", zoneId: "peak-2", ms: 2.00, fm: 7.5, isDraggable: true },
  { station: 18.0, label: "26", zoneId: "peak-2", ms: 4.00, fm: 8.0, isDraggable: true },
  { station: 18.5, label: "27", zoneId: "peak-2", ms: 2.00, fm: 8.5, isDraggable: true },
  { station: 19.0, label: "28", zoneId: "peak-2", ms: 4.00, fm: 9.0, isDraggable: true },
  { station: 19.5, label: "29", zoneId: "peak-2", ms: 2.00, fm: 9.5, isDraggable: true },
  { station: 19.8, label: "30", zoneId: "peak-2", ms: 1.00, fm: 9.8, isDraggable: true },

  // --- FORE PEAK (3 TITIK: 1, 4, 1 di garis dasar / Y=0) ---
  { station: 20.0, label: "31 (FP)", zoneId: "fore-peak", ms: 1.00, fm: 10.0, isDraggable: false },
  { station: 20.5, label: "32 (FP-A)", zoneId: "fore-peak", ms: 4.00, fm: 10.5, isDraggable: false },
  { station: 21.0, label: "33 (FP-B)", zoneId: "fore-peak", ms: 1.00, fm: 11.0, isDraggable: false }
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
}

export const AREA_ZONES: AreaZone[] = [
  {
    id: "after-peak",
    name: "After Peak",
    code: "AP",
    badgeLabel: "After Peak",
    startStation: -2.0,
    endStation: 0.0,
    bgFill: "rgba(51, 65, 85, 0.40)", // Sleek Dark Slate
    watermark: "AP",
    textColor: "text-slate-300",
    badgeColor: "bg-slate-800/90 border-slate-700/80 text-slate-300",
    description: "Area After Peak (AP) - 3 Titik: St. B, St. A, St. 0 (Buritan Kapal / Transisi Cant)"
  },
  {
    id: "peak-1",
    name: "Peak 1",
    code: "P1",
    badgeLabel: "Peak 1",
    startStation: 0.0,
    endStation: 5.0,
    bgFill: "rgba(14, 165, 233, 0.18)", // Subtle Marine Sky
    watermark: "P1",
    textColor: "text-sky-300",
    badgeColor: "bg-sky-950/60 border-sky-800/50 text-sky-300",
    description: "Area Peak 1 (P1) - 10 Titik: St. 0.5 s/d 5.0 (Run Body / Transisi Buritan ke PMB, Spacing = la')"
  },
  {
    id: "parallel-middle-body",
    name: "Parallel Middle Body",
    code: "PMB",
    badgeLabel: "Parallel Middle Body",
    startStation: 6.0,
    endStation: 15.0,
    bgFill: "rgba(6, 182, 212, 0.24)", // Flagship Deep Cyan
    watermark: "PMB",
    textColor: "text-cyan-300",
    badgeColor: "bg-cyan-950/70 border-cyan-700/60 text-cyan-300",
    description: "Area Parallel Middle Body (PMB) - 10 Titik: St. 6.0 s/d 15.0 (Badan Tengah Maksimum 0.5B, Spacing = l)"
  },
  {
    id: "peak-2",
    name: "Peak 2",
    code: "P2",
    badgeLabel: "Peak 2",
    startStation: 15.0,
    endStation: 20.0,
    bgFill: "rgba(14, 165, 233, 0.18)", // Subtle Marine Sky
    watermark: "P2",
    textColor: "text-sky-300",
    badgeColor: "bg-sky-950/60 border-sky-800/50 text-sky-300",
    description: "Area Peak 2 (P2) - 10 Titik: St. 15.5 s/d 20.0 (Entrance Body Haluan, Spacing = lf)"
  },
  {
    id: "fore-peak",
    name: "Fore Peak",
    code: "FP",
    badgeLabel: "Fore Peak",
    startStation: 20.0,
    endStation: 21.0,
    bgFill: "rgba(51, 65, 85, 0.40)", // Sleek Dark Slate
    watermark: "FP",
    textColor: "text-slate-300",
    badgeColor: "bg-slate-800/90 border-slate-700/80 text-slate-300",
    description: "Area Fore Peak (FP) - 3 Titik: St. 20 (FP), FP-A, FP-B (Ordinat = 0 m pada WL 6)"
  }
];

export interface WaterlineConfig {
  id: string;
  name: string;
  shortName: string;
  draftFraction: number; // 1.0 (DWL), 5/6, 4/6, 3/6, 2/6, 1/6, 0.0
  awlFactor: number; // AWL ratio to DWL
  maxBreadthFactor: number; // max 0.5B ratio to DWL 0.5B
  color: string;
  badge: string;
}

export const WATERLINE_PALETTE = [
  "#38bdf8", // Sky blue (DWL)
  "#06b6d4", // Cyan
  "#0ea5e9", // Light blue
  "#0284c7", // Blue
  "#2563eb", // Deep blue
  "#4f46e5", // Indigo
  "#6366f1", // Purple-blue
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose (Baseline)
];

export const DEFAULT_WATERLINE_LEVELS: WaterlineConfig[] = [
  { id: "WL6", name: "Waterline 6 (DWL)", shortName: "WL 6 (DWL)", draftFraction: 1.0, awlFactor: 1.000, maxBreadthFactor: 1.000, color: "#38bdf8", badge: "Sarat Desain (100% T)" },
  { id: "WL5", name: "Waterline 5", shortName: "WL 5", draftFraction: 5 / 6, awlFactor: 0.962, maxBreadthFactor: 1.000, color: "#06b6d4", badge: "Sarat 83.3% T" },
  { id: "WL4", name: "Waterline 4", shortName: "WL 4", draftFraction: 4 / 6, awlFactor: 0.921, maxBreadthFactor: 1.000, color: "#0284c7", badge: "Sarat 66.7% T" },
  { id: "WL3", name: "Waterline 3", shortName: "WL 3", draftFraction: 3 / 6, awlFactor: 0.878, maxBreadthFactor: 1.000, color: "#6366f1", badge: "Sarat 50.0% T" },
  { id: "WL2", name: "Waterline 2", shortName: "WL 2", draftFraction: 2 / 6, awlFactor: 0.832, maxBreadthFactor: 1.000, color: "#8b5cf6", badge: "Sarat 33.3% T" },
  { id: "WL1", name: "Waterline 1", shortName: "WL 1", draftFraction: 1 / 6, awlFactor: 0.770, maxBreadthFactor: 0.989, color: "#a855f7", badge: "Sarat 16.7% T" },
  { id: "WL0", name: "Waterline 0 (Lunas)", shortName: "WL 0", draftFraction: 0.0, awlFactor: 0.571, maxBreadthFactor: 0.815, color: "#ec4899", badge: "Garis Lunas (0.00 m)" },
];

export const WATERLINE_LEVELS = DEFAULT_WATERLINE_LEVELS;

export const generateWaterlinePresets = (
  count: number,
  draft_m: number = 5.5,
  breadth_m: number = 15.0,
  cmVal: number = 0.99
): WaterlineConfig[] => {
  const configs: WaterlineConfig[] = [];
  const maxIdx = count - 1;
  const areaDiff = breadth_m * draft_m * (1.0 - (cmVal || 0.99));
  const denom = 2.0 - Math.PI / 2.0;
  const R = denom > 0 && areaDiff > 0 ? Math.sqrt(areaDiff / denom) : 0;
  const flatOfBottom = Math.max(0, (breadth_m / 2) - R);
  const halfB = breadth_m / 2;

  for (let i = maxIdx; i >= 0; i--) {
    const fraction = i / maxIdx;
    const z = fraction * draft_m;
    const id = `WL${i}`;
    const isDWL = i === maxIdx;
    const isBase = i === 0;
    const name = isDWL ? `Waterline ${i} (DWL)` : isBase ? `Waterline 0 (Lunas)` : `Waterline ${i}`;
    const shortName = isDWL ? `WL ${i} (DWL)` : `WL ${i}`;
    
    // Hydrodynamic awlFactor & maxBreadthFactor based on exact bilge geometry
    let maxBreadthFactor = 1.0;
    if (isDWL) {
      maxBreadthFactor = 1.0;
    } else if (isBase || z <= 0) {
      maxBreadthFactor = halfB > 0 ? flatOfBottom / halfB : 0.815;
    } else if (R > 0 && z < R) {
      const diff = R - z;
      const yArc = halfB - R + Math.sqrt(Math.max(0, R * R - diff * diff));
      maxBreadthFactor = halfB > 0 ? yArc / halfB : 1.0;
    } else {
      maxBreadthFactor = 1.0;
    }

    let awlFactor = 1.0;
    if (isDWL) {
      awlFactor = 1.0;
    } else if (isBase || fraction <= 0) {
      awlFactor = Number((maxBreadthFactor * 0.70).toFixed(3));
    } else {
      const fullness = 0.70 + 0.30 * Math.pow(fraction, 0.75);
      awlFactor = Number((maxBreadthFactor * fullness).toFixed(3));
    }
    
    const colorIdx = Math.floor(((maxIdx - i) / Math.max(1, maxIdx)) * (WATERLINE_PALETTE.length - 1));
    const color = WATERLINE_PALETTE[colorIdx] || "#38bdf8";
    const badge = isDWL ? "Sarat Desain (100% T)" : isBase ? "Garis Lunas (0.00 m)" : `Sarat ${(fraction * 100).toFixed(1)}% T`;

    configs.push({
      id,
      name,
      shortName,
      draftFraction: Number(fraction.toFixed(4)),
      awlFactor,
      maxBreadthFactor: Number(maxBreadthFactor.toFixed(3)),
      color,
      badge
    });
  }
  return configs;
};

export const getStationZone = (st: number): AreaZone => {
  if (st <= 0.0) return AREA_ZONES[0];  // After Peak (B, A, 0)
  if (st <= 5.0) return AREA_ZONES[1];  // Peak 1 (0.5 s/d 5.0)
  if (st <= 15.0) return AREA_ZONES[2]; // PMB (6.0 s/d 15.0)
  if (st <= 20.0) return AREA_ZONES[3]; // Peak 2 (15.5 s/d 20.0)
  return AREA_ZONES[4];                 // Fore Peak (20 (FP), FP-A, FP-B)
};

/**
 * Shape-Preserving Monotonic Cubic Hermite Spline (PCHIP)
 * Follows standard Matlab/Scipy PCHIP algorithm for strictly shape-preserving, overshoot-free fair hull lines.
 * Strictly interpolates every offset point with zero deviation (error = 0.000m <= 0.005m).
 */
const getSmoothPathD = (points: { x: number; y: number }[]): string => {
  const n = points.length;
  if (n < 2) return "";
  if (n === 2) {
    return ` L ${points[1].x.toFixed(3)},${points[1].y.toFixed(3)}`;
  }

  const h = new Float64Array(n - 1);
  const delta = new Float64Array(n - 1);
  const d = new Float64Array(n);

  for (let i = 0; i < n - 1; i++) {
    h[i] = points[i + 1].x - points[i].x;
    delta[i] = h[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / h[i];
  }

  // Interior slopes: PCHIP harmonic mean weighted formula (strictly preserves monotonicity)
  for (let i = 1; i < n - 1; i++) {
    const d0 = delta[i - 1];
    const d1 = delta[i];
    if (d0 * d1 <= 0) {
      // Local extremum or flat area: derivative must be 0 to prevent overshoot
      d[i] = 0;
    } else {
      const h0 = h[i - 1];
      const h1 = h[i];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      d[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
    }
  }

  // Boundary slopes (endpoints) with slope-limiting (PCHIP standard)
  // Left endpoint (St. B)
  const d0_raw = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (d0_raw * delta[0] <= 0) {
    d[0] = 0;
  } else if (delta[0] * delta[1] <= 0 && Math.abs(d0_raw) > 3 * Math.abs(delta[0])) {
    d[0] = 3 * delta[0];
  } else {
    d[0] = d0_raw;
  }

  // Right endpoint (FP)
  const dn_raw = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);
  if (dn_raw * delta[n - 2] <= 0) {
    d[n - 1] = 0;
  } else if (delta[n - 2] * delta[n - 3] <= 0 && Math.abs(dn_raw) > 3 * Math.abs(delta[n - 2])) {
    d[n - 1] = 3 * delta[n - 2];
  } else {
    d[n - 1] = dn_raw;
  }

  // Construct Cubic Bezier path segments matching PCHIP derivatives
  let pathD = "";
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dxThird = h[i] / 3;

    const cp1x = p0.x + dxThird;
    const cp1y = p0.y + d[i] * dxThird;
    const cp2x = p1.x - dxThird;
    const cp2y = p1.y - d[i + 1] * dxThird;

    pathD += ` C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
  }

  return pathD;
};

/**
 * High-precision 1D PCHIP Spline Evaluator
 * Evaluates the exact smooth fair half-breadth y at any arbitrary longitudinal position targetX.
 */
export const evaluatePchip1D = (
  points: { x: number; y: number }[],
  targetX: number
): number => {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return points[0].y;
  if (targetX <= points[0].x) return points[0].y;
  if (targetX >= points[n - 1].x) return points[n - 1].y;

  let i = 0;
  for (let k = 0; k < n - 1; k++) {
    if (targetX >= points[k].x && targetX <= points[k + 1].x) {
      i = k;
      break;
    }
  }

  const h = new Float64Array(n - 1);
  const delta = new Float64Array(n - 1);
  const d = new Float64Array(n);

  for (let k = 0; k < n - 1; k++) {
    h[k] = points[k + 1].x - points[k].x;
    delta[k] = h[k] === 0 ? 0 : (points[k + 1].y - points[k].y) / h[k];
  }

  for (let k = 1; k < n - 1; k++) {
    const d0 = delta[k - 1];
    const d1 = delta[k];
    if (d0 * d1 <= 0) {
      d[k] = 0;
    } else {
      const h0 = h[k - 1];
      const h1 = h[k];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      d[k] = (w1 + w2) / (w1 / d0 + w2 / d1);
    }
  }

  const d0_raw = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  d[0] = d0_raw * delta[0] <= 0 ? 0 : d0_raw;

  const dn_raw = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);
  d[n - 1] = dn_raw * delta[n - 2] <= 0 ? 0 : dn_raw;

  const hi = h[i];
  const t = (targetX - points[i].x) / (hi || 1);
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const yVal = h00 * points[i].y + h10 * hi * d[i] + h01 * points[i + 1].y + h11 * hi * d[i + 1];
  return Math.max(0, yVal);
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
  vesselType = "GENERAL_CARGO",
  waterlinesData,
  onUpdateWaterlinesData,
  waterlineLevels: initialWaterlineLevels,
  onUpdateWaterlineLevels,
  onSave,
  isSaving = false,
  lastSaved
}) => {
  const { language } = useLanguage();
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
  const la_prime = Number((l / 2).toFixed(4));
  const lf = Number((l / 2).toFixed(4));

  // State: Full Plan View
  const [isFullPlanView, setIsFullPlanView] = useState<boolean>(false);

  // Effective Target Cw tailored to vessel profile
  const effectiveTargetCw = useMemo(() => {
    return targetCw;
  }, [targetCw]);

  // Target Waterline Area: AWL_target = LWL * BWL * effectiveTargetCw
  const AWL_rancangan = useMemo(() => LWL * BWL * effectiveTargetCw, [LWL, BWL, effectiveTargetCw]);

  // Hydrodynamic Hull Form Profile (Slender Knife Bow & Sharp Streamlined Stern)
  const HULL_PROFILE: Record<number, number> = {
    // After Peak (Transom / Rudder transition to AP)
    [-2.0]: 0.000, // St. B (0.00 m)
    [-1.0]: 0.140, // St. A (Buritan Runcing)
    [0.0]:  0.280, // St. 0 (AP: Ramping Runcing)

    // Peak 1 (10 Titik: Transisi Buritan Halus ke PMB, Step 0.5)
    [0.5]:  0.440, // St. 1
    [1.0]:  0.580, // St. 2
    [1.5]:  0.700, // St. 3
    [2.0]:  0.810, // St. 4
    [2.5]:  0.890, // St. 5
    [3.0]:  0.945, // St. 6
    [3.5]:  0.980, // St. 7
    [4.0]:  0.995, // St. 8
    [4.5]:  1.000, // St. 9
    [5.0]:  1.000, // St. 10 (Tangensial penuh ke PMB)

    // Parallel Middle Body (PMB) - 10 Titik Maksimum Tetap 1.000 (0.5 * BWL, Jarak Standar l = LBP/20, Step Seragam 1.0)
    [6.0]:  1.000, // St. 11
    [7.0]:  1.000, // St. 12
    [8.0]:  1.000, // St. 13
    [9.0]:  1.000, // St. 14
    [10.0]: 1.000, // Midship 15 (MID: Maksimum 0.5B)
    [11.0]: 1.000, // St. 16
    [12.0]: 1.000, // St. 17
    [13.0]: 1.000, // St. 18
    [14.0]: 1.000, // St. 19
    [15.0]: 1.000, // St. 20

    // Peak 2 - 10 Titik: Transisi Halus Kontinu dari PMB ke Haluan Ramping FP (Step Seragam 0.5)
    [15.5]: 0.950, // St. 21 (Awal Entrance Body)
    [16.0]: 0.880, // St. 22
    [16.5]: 0.780, // St. 23
    [17.0]: 0.650, // St. 24
    [17.5]: 0.500, // St. 25
    [18.0]: 0.350, // St. 26
    [18.5]: 0.210, // St. 27
    [19.0]: 0.100, // St. 28
    [19.5]: 0.035, // St. 29
    [19.8]: 0.008, // St. 30 (Haluan Ramping ke FP)

    // Fore Peak (3 Titik di Garis Dasar / Y=0)
    [20.0]: 0.000, // St. 31 (FP: 0.00 m)
    [20.5]: 0.000, // St. 32 (FP-A: 0.00 m)
    [21.0]: 0.000  // St. 33 (FP-B: 0.00 m)
  };

  // Fair Hydrodynamic Variational Smoother (Guarantees Natural Curvature + Error <= 0.01%)
  const generateOptimizedHalfBreadths = (
    targetArea: number, 
    maxHalfBreadth?: number,
    zoneSettings?: WaterlineZoneSetting
  ): Record<number, number> => {
    const halfB = maxHalfBreadth !== undefined ? maxHalfBreadth : BWL / 2;
    const baseRatios = HULL_PROFILE;
    const settings = zoneSettings || { hasSternOverhang: true, hasBulbousBow: false };
    const hasStern = settings.hasSternOverhang;
    const hasBulb = settings.hasBulbousBow;

    const calcAWL = (pts: Record<number, number>) => {
      let effSum = 0;
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        const step = cfg.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
        effSum += (pts[cfg.station] ?? 0) * cfg.ms * step;
      });
      return (2.0 / 3.0) * l * effSum;
    };

    // Helper: evaluate smooth parametric profile with curvature exponent alpha
    const getCandidate = (alpha: number): Record<number, number> => {
      const res: Record<number, number> = {};
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        let r = 0.0;
        if (cfg.station >= 6.0 && cfg.station <= 15.0) {
          r = 1.0;
        } else if (cfg.station < 0.0 && !hasStern) {
          r = 0.0;
        } else if (cfg.station === 0.0 && !hasStern) {
          r = 0.0;
        } else if (cfg.station > 20.0 && !hasBulb) {
          r = 0.0;
        } else if (cfg.station === 20.0 && !hasBulb) {
          r = 0.0;
        } else if (hasBulb && cfg.station >= 20.0) {
          if (cfg.station === 20.0) r = 0.35;
          else if (cfg.station === 20.5) r = 0.22;
          else r = 0.0;
        } else {
          const base = baseRatios[cfg.station] ?? 0.5;
          r = base > 0 ? Math.pow(base, alpha) : 0.0;
        }
        res[cfg.station] = halfB * r;
      });
      return res;
    };

    // 1. Binary Search for optimum curvature exponent alpha
    let lowAlpha = 0.05;
    let highAlpha = 6.0;
    let bestAlpha = 1.0;

    for (let iter = 0; iter < 70; iter++) {
      const mid = (lowAlpha + highAlpha) / 2.0;
      const pts = getCandidate(mid);
      const a = calcAWL(pts);
      if (Math.abs(a - targetArea) < 0.0001) {
        bestAlpha = mid;
        break;
      }
      if (a < targetArea) {
        highAlpha = mid; // smaller alpha yields fuller curve
      } else {
        lowAlpha = mid;
      }
      bestAlpha = mid;
    }

    const pts = getCandidate(bestAlpha);
    let curA = calcAWL(pts);
    let diff = targetArea - curA;

    // 2. Harmonic Variational Fairing Pass (Smooth sine wave kernel preserves zero boundaries & PMB)
    const result: Record<number, number> = {};
    DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
      result[cfg.station] = Number((pts[cfg.station] ?? 0).toFixed(3));
    });

    const startSt = hasStern ? -2.0 : 0.0;
    const endSt = hasBulb ? 21.0 : 20.0;

    let kernelEffSum = 0;
    DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
      const step = cfg.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
      if (cfg.station > startSt && cfg.station < endSt && !(cfg.station >= 6.0 && cfg.station <= 15.0)) {
        let u = 0;
        if (cfg.station < 6.0) {
          u = (cfg.station - startSt) / (6.0 - startSt);
        } else {
          u = (endSt - cfg.station) / (endSt - 15.0);
        }
        const weight = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI);
        kernelEffSum += weight * cfg.ms * step;
      }
    });

    if (kernelEffSum > 0 && Math.abs(diff) > 0.001) {
      const lambda = diff / ((2.0 / 3.0) * l * kernelEffSum);
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        if (cfg.station > startSt && cfg.station < endSt && !(cfg.station >= 6.0 && cfg.station <= 15.0)) {
          let u = 0;
          if (cfg.station < 6.0) {
            u = (cfg.station - startSt) / (6.0 - startSt);
          } else {
            u = (endSt - cfg.station) / (endSt - 15.0);
          }
          const weight = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI);
          const newY = result[cfg.station] + lambda * weight;
          result[cfg.station] = Number(Math.max(0, Math.min(halfB, newY)).toFixed(3));
        }
      });
    }

    // 3. High-Precision Micro-Trimmer Pass (guarantees error <= 0.005%)
    const adjustableStations: number[] = [];
    DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
      if (cfg.station > startSt && cfg.station < endSt && !(cfg.station >= 6.0 && cfg.station <= 15.0)) {
        adjustableStations.push(cfg.station);
      }
    });

    for (let pass = 0; pass < 250; pass++) {
      curA = calcAWL(result);
      diff = targetArea - curA;
      if (Math.abs(diff / (targetArea || 1)) <= 0.0001) break;

      let changed = false;
      for (const st of adjustableStations) {
        const cfg = DEFAULT_STATIONS_CONFIG.find((c) => c.station === st);
        if (!cfg) continue;
        const step = cfg.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
        const dEff = (2.0 / 3.0) * l * (0.001 * cfg.ms * step);

        if (diff > 0.0001 && result[st] + 0.001 <= halfB) {
          result[st] = Number((result[st] + 0.001).toFixed(3));
          diff -= dEff;
          changed = true;
        } else if (diff < -0.0001 && result[st] - 0.001 >= 0) {
          result[st] = Number((result[st] - 0.001).toFixed(3));
          diff += dEff;
          changed = true;
        }
        if (Math.abs(diff / (targetArea || 1)) <= 0.0001) break;
      }
      if (!changed) break;
    }

    return result;
  };

  // --- DYNAMIC WATERLINE CONFIGURATION (CUSTOM WL COUNT & LEVELS) ---
  const [waterlineLevels, setWaterlineLevels] = useState<WaterlineConfig[]>(() => {
    if (initialWaterlineLevels && initialWaterlineLevels.length > 0) {
      return initialWaterlineLevels;
    }
    return DEFAULT_WATERLINE_LEVELS;
  });

  // Modal State for Custom Waterline Studio
  const [isWlManagerOpen, setIsWlManagerOpen] = useState<boolean>(false);
  const [newWlZInput, setNewWlZInput] = useState<string>("");
  const [newWlNameInput, setNewWlNameInput] = useState<string>("");
  const [desiredWlCount, setDesiredWlCount] = useState<number>(() => waterlineLevels.length || 7);

  useEffect(() => {
    if (initialWaterlineLevels && initialWaterlineLevels.length > 0) {
      setWaterlineLevels(initialWaterlineLevels);
      setDesiredWlCount(initialWaterlineLevels.length);
    }
  }, [initialWaterlineLevels]);

  useEffect(() => {
    setDesiredWlCount(waterlineLevels.length);
  }, [waterlineLevels.length]);

  // Close WL Manager modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isWlManagerOpen) {
        setIsWlManagerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWlManagerOpen]);

  // --- MULTI-WATERLINE STATE (WL 6 s.d. WL 0) ---
  const [activeWlId, setActiveWlId] = useState<string>(() => {
    return waterlineLevels[0]?.id || "WL6";
  });
  const [showAllWlOverlay, setShowAllWlOverlay] = useState<boolean>(true);

  // Per-waterline zone settings for AP stern overhang & FP bulbous bow
  const [wlZoneSettings, setWlZoneSettings] = useState<Record<string, WaterlineZoneSetting>>(() => {
    const initial: Record<string, WaterlineZoneSetting> = {};
    waterlineLevels.forEach((wl) => {
      initial[wl.id] = getWaterlineDefaultZoneSetting(wl.draftFraction);
    });
    return initial;
  });

  const activeZoneSetting = useMemo<WaterlineZoneSetting>(() => {
    if (wlZoneSettings[activeWlId]) return wlZoneSettings[activeWlId];
    const currentWl = waterlineLevels.find((w) => w.id === activeWlId);
    return getWaterlineDefaultZoneSetting(currentWl ? currentWl.draftFraction : 1.0);
  }, [wlZoneSettings, activeWlId, waterlineLevels]);

  const [allWaterlinesData, setAllWaterlinesData] = useState<Record<string, Record<number, number>>>(() => {
    const initial: Record<string, Record<number, number>> = {};
    waterlineLevels.forEach((wl) => {
      const targetArea = AWL_rancangan * wl.awlFactor;
      const maxBreadth = (BWL / 2) * wl.maxBreadthFactor;
      const zSetting = getWaterlineDefaultZoneSetting(wl.draftFraction);
      const generated = generateOptimizedHalfBreadths(targetArea, maxBreadth, zSetting);

      if (waterlinesData && waterlinesData[wl.id] && Object.keys(waterlinesData[wl.id]).length > 0) {
        const merged: Record<number, number> = { ...generated };
        DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
          const val = waterlinesData[wl.id][cfg.station];
          if (cfg.station >= 6.0 && cfg.station <= 15.0) {
            merged[cfg.station] = maxBreadth;
          } else if (val !== undefined && val <= maxBreadth) {
            merged[cfg.station] = val;
          }
        });
        initial[wl.id] = merged;
      } else {
        initial[wl.id] = generated;
      }
    });
    return initial;
  });

  const lastPropDataJson = useRef<string>("");

  // Sync with incoming prop if project changes or reload (guarded against feedback loops)
  useEffect(() => {
    if (!waterlinesData || Object.keys(waterlinesData).length === 0) return;
    const currentJson = JSON.stringify(waterlinesData);
    if (currentJson === lastPropDataJson.current) return;
    lastPropDataJson.current = currentJson;

    setAllWaterlinesData((prevAll) => {
      const updatedAll: Record<string, Record<number, number>> = {};
      waterlineLevels.forEach((wl) => {
        const targetArea = AWL_rancangan * wl.awlFactor;
        const maxBreadth = (BWL / 2) * wl.maxBreadthFactor;
        const zSetting = wlZoneSettings[wl.id] || getWaterlineDefaultZoneSetting(wl.draftFraction);
        const generated = generateOptimizedHalfBreadths(targetArea, maxBreadth, zSetting);
        const incoming = waterlinesData[wl.id] || {};
        const prev = prevAll[wl.id] || {};
        const merged: Record<number, number> = { ...generated };

        DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
          if (cfg.station >= 6.0 && cfg.station <= 15.0) {
            merged[cfg.station] = maxBreadth;
          } else if (incoming[cfg.station] !== undefined && incoming[cfg.station] <= maxBreadth) {
            merged[cfg.station] = incoming[cfg.station];
          } else if (prev[cfg.station] !== undefined && prev[cfg.station] <= maxBreadth) {
            merged[cfg.station] = prev[cfg.station];
          }
        });
        updatedAll[wl.id] = merged;
      });
      return updatedAll;
    });
  }, [waterlinesData, BWL, AWL_rancangan, wlZoneSettings, waterlineLevels]);

  const setHalfBreadths = (
    updater: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)
  ) => {
    setAllWaterlinesData((prevAll) => {
      const current = prevAll[activeWlId] || {};
      const updated = typeof updater === "function" ? updater(current) : updater;
      const nextAll = {
        ...prevAll,
        [activeWlId]: updated
      };
      lastPropDataJson.current = JSON.stringify(nextAll);
      if (onUpdateWaterlinesData) {
        onUpdateWaterlinesData(nextAll);
      }
      return nextAll;
    });
  };

  // Active Waterline Half-Breadths (0.5 B in meters for each station)
  const halfBreadths = useMemo(() => {
    return allWaterlinesData[activeWlId] || {};
  }, [allWaterlinesData, activeWlId]);

  // Active Waterline Configuration Metadata
  const activeWlConfig = useMemo(() => {
    return waterlineLevels.find((w) => w.id === activeWlId) || waterlineLevels[0] || DEFAULT_WATERLINE_LEVELS[0];
  }, [waterlineLevels, activeWlId]);

  const activeDraftZ = useMemo(() => activeWlConfig.draftFraction * T, [activeWlConfig, T]);
  const activeTargetAWL = useMemo(() => AWL_rancangan * activeWlConfig.awlFactor, [AWL_rancangan, activeWlConfig]);
  const activeTargetCw = useMemo(
    () => targetCw * (activeWlConfig.awlFactor / (activeWlConfig.maxBreadthFactor || 1.0)),
    [targetCw, activeWlConfig]
  );
  const activeMaxHalfB = useMemo(() => (BWL / 2) * activeWlConfig.maxBreadthFactor, [BWL, activeWlConfig]);

  // --- VIEW MODE (PAGE 1: FULL SHEET, PAGE 2: SINGLE WATERLINE & CUSTOM STATIONS) ---
  const [viewMode, setViewMode] = useState<"fullSheet" | "cleanCustom">("fullSheet");

  // --- CUSTOM STATIONS STATE (PAGE 2) ---
  const [customStationCount, setCustomStationCount] = useState<number>(21);
  const [customOverrides, setCustomOverrides] = useState<Record<number, number>>({});
  const [copiedCustomTable, setCopiedCustomTable] = useState(false);

  // --- MINIMALIST WATERLINE HOVER TRACKER STATE ---
  const [cleanHover, setCleanHover] = useState<{
    x_m: number;
    halfB: number;
    stationVal: number;
    svgX: number;
    svgY: number;
  } | null>(null);
  const cleanSvgRef = useRef<SVGSVGElement>(null);

  // --- AREA ZONE INTERACTION STATE ---
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);

  // --- SVG INTERACTIVE DRAG STATE & HANDLERS ---
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingStation, setDraggingStation] = useState<number | null>(null);
  const dragStartRef = useRef<{ clientY: number; startHalfB: number } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreenPlot, setIsFullscreenPlot] = useState(false);

  // Keyboard Escape listener to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreenPlot) {
        setIsFullscreenPlot(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenPlot]);

  // Exact Station to SVG X coordinate mapper with clean, linear naval scaling (AP at 26.0, FP at 186.0)
  const getStationX = (st: number): number => {
    return 26.0 + st * 8.0;
  };

  // Half-breadth to SVG Y coordinate mapper
  const getSvgY = (halfB: number): number => {
    // 0m is at Y=48.0 (baseline), 8m is at Y=10.0
    return 48.0 - (halfB / 8.0) * 38.0;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, station: number) => {
    // Fore Peak points (stations 20, 20.5, 21) and PMB points (stations 6.0 to 15.0) are fixed / not draggable
    if (station >= 20.0 || (station >= 6.0 && station <= 15.0)) return;

    e.preventDefault();
    e.stopPropagation();
    setDraggingStation(station);

    const currentHalfB = halfBreadths[station] ?? ((HULL_PROFILE[station] ?? 0) * activeMaxHalfB);
    dragStartRef.current = {
      clientY: e.clientY,
      startHalfB: currentHalfB
    };

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      // Fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingStation === null || !dragStartRef.current) return;

    e.preventDefault();
    const maxHalfB = activeMaxHalfB;
    const deltaPixels = dragStartRef.current.clientY - e.clientY; // Upward cursor move increases breadth

    // Calibrated natural CAD sensitivity (65px = 1.0m change; Shift key gives 240px = 1.0m ultra-fine control)
    const pxPerMeter = e.shiftKey ? 240.0 : 65.0;
    const deltaMeters = deltaPixels / pxPerMeter;

    let newHalfB = dragStartRef.current.startHalfB + deltaMeters;
    newHalfB = Math.max(0, Math.min(maxHalfB, newHalfB));

    setAllWaterlinesData((prevAll) => {
      const current = prevAll[activeWlId] || {};
      return {
        ...prevAll,
        [activeWlId]: {
          ...current,
          [draggingStation]: Number(newHalfB.toFixed(3))
        }
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingStation !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Fallback
      }
      setDraggingStation(null);
      dragStartRef.current = null;

      // Commit update to parent on release
      setAllWaterlinesData((latestAll) => {
        lastPropDataJson.current = JSON.stringify(latestAll);
        if (onUpdateWaterlinesData) {
          onUpdateWaterlinesData(latestAll);
        }
        return latestAll;
      });
    }
  };



  // Toggle Stern Overhang (St. B & A) for active WL
  const toggleSternOverhang = () => {
    const nextSetting: WaterlineZoneSetting = {
      ...activeZoneSetting,
      hasSternOverhang: !activeZoneSetting.hasSternOverhang
    };
    setWlZoneSettings((prev) => ({
      ...prev,
      [activeWlId]: nextSetting
    }));
    const fresh = generateOptimizedHalfBreadths(activeTargetAWL, activeMaxHalfB, nextSetting);
    setHalfBreadths(fresh);
  };

  // Toggle Bulbous Bow (St. FP-A & FP-B) for active WL
  const toggleBulbousBow = () => {
    const nextSetting: WaterlineZoneSetting = {
      ...activeZoneSetting,
      hasBulbousBow: !activeZoneSetting.hasBulbousBow
    };
    setWlZoneSettings((prev) => ({
      ...prev,
      [activeWlId]: nextSetting
    }));
    const fresh = generateOptimizedHalfBreadths(activeTargetAWL, activeMaxHalfB, nextSetting);
    setHalfBreadths(fresh);
  };

  // Reset to auto-calculated shape for active WL
  const handleReset = () => {
    const fresh = generateOptimizedHalfBreadths(activeTargetAWL, activeMaxHalfB, activeZoneSetting);
    setHalfBreadths(fresh);
  };

  // Auto-Fine-Tune: Instant fair curve regeneration with guaranteed <= 0.005% tolerance for active WL
  const handleAutoFineTune = () => {
    const tuned = generateOptimizedHalfBreadths(activeTargetAWL, activeMaxHalfB, activeZoneSetting);
    setHalfBreadths(tuned);
  };

  // --- PRESET & CUSTOM WATERLINE HANDLERS ---
  const handleApplyPreset = (count: number) => {
    const validCount = Math.max(3, Math.min(25, Math.round(count)));
    const newLevels = generateWaterlinePresets(validCount, T, BWL, Cm);
    setWaterlineLevels(newLevels);
    setActiveWlId(newLevels[0].id);
    setDesiredWlCount(validCount);

    const newZoneSettings: Record<string, WaterlineZoneSetting> = {};
    newLevels.forEach((wl) => {
      newZoneSettings[wl.id] = getWaterlineDefaultZoneSetting(wl.draftFraction);
    });
    setWlZoneSettings(newZoneSettings);

    setAllWaterlinesData(() => {
      const updated: Record<string, Record<number, number>> = {};
      newLevels.forEach((wl) => {
        const targetArea = AWL_rancangan * wl.awlFactor;
        const maxBreadth = (BWL / 2) * wl.maxBreadthFactor;
        const zSetting = newZoneSettings[wl.id];
        
        updated[wl.id] = generateOptimizedHalfBreadths(targetArea, maxBreadth, zSetting);
      });
      lastPropDataJson.current = JSON.stringify(updated);
      if (onUpdateWaterlinesData) onUpdateWaterlinesData(updated);
      return updated;
    });

    if (onUpdateWaterlineLevels) onUpdateWaterlineLevels(newLevels);
  };

  const handleAddCustomWaterline = (customZ: number, customName?: string) => {
    if (isNaN(customZ) || customZ < 0) return;
    const fraction = Math.max(0, Math.min(1.0, customZ / T));
    const autoId = `WL_${(fraction * 10).toFixed(1).replace(".", "_")}`;
    const id = waterlineLevels.some((w) => w.id === autoId) ? `WL_${Date.now().toString(36)}` : autoId;
    const name = customName || `Waterline ${customZ.toFixed(2)}m`;
    const shortName = customName || `WL ${customZ.toFixed(2)}m`;

    const areaDiff = BWL * T * (1.0 - (Cm || 0.99));
    const denom = 2.0 - Math.PI / 2.0;
    const R = denom > 0 && areaDiff > 0 ? Math.sqrt(areaDiff / denom) : 0;
    const flatOfBottom = Math.max(0, (BWL / 2) - R);
    const halfB = BWL / 2;

    let maxBreadthFactor = 1.0;
    if (fraction >= 1.0) {
      maxBreadthFactor = 1.0;
    } else if (fraction <= 0 || customZ <= 0) {
      maxBreadthFactor = halfB > 0 ? flatOfBottom / halfB : 0.815;
    } else if (R > 0 && customZ < R) {
      const diff = R - customZ;
      const yArc = halfB - R + Math.sqrt(Math.max(0, R * R - diff * diff));
      maxBreadthFactor = halfB > 0 ? yArc / halfB : 1.0;
    } else {
      maxBreadthFactor = 1.0;
    }

    let awlFactor = 1.0;
    if (fraction >= 1.0) {
      awlFactor = 1.0;
    } else if (fraction <= 0) {
      awlFactor = Number((maxBreadthFactor * 0.70).toFixed(3));
    } else {
      const fullness = 0.70 + 0.30 * Math.pow(fraction, 0.75);
      awlFactor = Number((maxBreadthFactor * fullness).toFixed(3));
    }

    const color = WATERLINE_PALETTE[(waterlineLevels.length + 3) % WATERLINE_PALETTE.length] || "#06b6d4";
    const badge = `Sarat ${(fraction * 100).toFixed(1)}% T (${customZ.toFixed(2)}m)`;

    const newWl: WaterlineConfig = {
      id,
      name,
      shortName,
      draftFraction: Number(fraction.toFixed(4)),
      awlFactor,
      maxBreadthFactor: Number(maxBreadthFactor.toFixed(3)),
      color,
      badge
    };

    const nextLevels = [...waterlineLevels, newWl].sort((a, b) => b.draftFraction - a.draftFraction);
    setWaterlineLevels(nextLevels);
    setActiveWlId(id);

    const targetArea = AWL_rancangan * newWl.awlFactor;
    const maxBreadth = (BWL / 2) * newWl.maxBreadthFactor;
    const zSetting = { hasSternOverhang: fraction >= 0.7, hasBulbousBow: fraction <= 0.35 };
    const generated = generateOptimizedHalfBreadths(targetArea, maxBreadth, zSetting);

    setAllWaterlinesData((prev) => {
      const updated = { ...prev, [id]: generated };
      lastPropDataJson.current = JSON.stringify(updated);
      if (onUpdateWaterlinesData) onUpdateWaterlinesData(updated);
      return updated;
    });

    if (onUpdateWaterlineLevels) onUpdateWaterlineLevels(nextLevels);
    setNewWlZInput("");
    setNewWlNameInput("");
  };

  const handleDeleteWaterline = (idToDelete: string) => {
    if (waterlineLevels.length <= 3) {
      alert("Minimal diperlukan 3 Garis Air (DWL, Sarat Antara, dan Lunas) untuk menjamin kontinuitas perhitungan Lines Plan.");
      return;
    }
    const nextLevels = waterlineLevels.filter((w) => w.id !== idToDelete);
    setWaterlineLevels(nextLevels);
    if (activeWlId === idToDelete) {
      setActiveWlId(nextLevels[0].id);
    }
    if (onUpdateWaterlineLevels) onUpdateWaterlineLevels(nextLevels);
  };

  // Update a single station half-breadth
  const handleCellChange = (station: number, value: string) => {
    const num = parseFloat(value);
    setHalfBreadths((prev) => ({
      ...prev,
      [station]: isNaN(num) ? 0 : Number(num.toFixed(3))
    }));
  };

  // Compute calculated rows for all 36 stations
  const calculatedRows = useMemo(() => {
    return DEFAULT_STATIONS_CONFIG.map((cfg) => {
      let b2 = halfBreadths[cfg.station];
      if (cfg.station >= 6.0 && cfg.station <= 15.0) {
        b2 = activeMaxHalfB;
      } else if (b2 === undefined || isNaN(b2)) {
        b2 = (HULL_PROFILE[cfg.station] ?? 0) * activeMaxHalfB;
      }
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

  // Grand Sums (Raw & Effective Step-Weighted)
  const sum1 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col4, 0), [calculatedRows]);
  const sum2 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col6, 0), [calculatedRows]);
  const sum3 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col7, 0), [calculatedRows]);
  const sum4 = useMemo(() => calculatedRows.reduce((acc, r) => acc + r.col8, 0), [calculatedRows]);

  // Zone Step Weight: 1.0 for PMB, 0.5 for AP, P1, P2, FP
  const effectiveSum1 = useMemo(() => {
    return calculatedRows.reduce((acc, r) => {
      const step = r.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
      return acc + r.col4 * step;
    }, 0);
  }, [calculatedRows]);

  const effectiveSum2 = useMemo(() => {
    return calculatedRows.reduce((acc, r) => {
      const step = r.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
      return acc + r.col6 * step;
    }, 0);
  }, [calculatedRows]);

  const effectiveSum3 = useMemo(() => {
    return calculatedRows.reduce((acc, r) => {
      const step = r.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
      return acc + r.col7 * step;
    }, 0);
  }, [calculatedRows]);

  const effectiveSum4 = useMemo(() => {
    return calculatedRows.reduce((acc, r) => {
      const step = r.zoneId === 'parallel-middle-body' ? 1.0 : 0.5;
      return acc + r.col8 * step;
    }, 0);
  }, [calculatedRows]);

  // Zone-specific Subtotals (AP, P1, PMB, P2, FP)
  const zoneSubtotals = useMemo(() => {
    const result: Record<
      string,
      {
        zone: AreaZone;
        stations: typeof calculatedRows;
        sum1: number;
        sum2: number;
        sum3: number;
        sum4: number;
      }
    > = {};

    AREA_ZONES.forEach((z) => {
      result[z.id] = {
        zone: z,
        stations: [],
        sum1: 0,
        sum2: 0,
        sum3: 0,
        sum4: 0
      };
    });

    calculatedRows.forEach((r) => {
      const z = getStationZone(r.station);
      if (result[z.id]) {
        result[z.id].stations.push(r);
        result[z.id].sum1 += r.col4;
        result[z.id].sum2 += r.col6;
        result[z.id].sum3 += r.col7;
        result[z.id].sum4 += r.col8;
      }
    });

    return result;
  }, [calculatedRows]);

  // Derived Naval Architecture Outputs using Zone-Step Weighted Integration
  // AWL = (2 / 3) * l * effectiveSum1
  const AWL = useMemo(() => (2 / 3) * l * effectiveSum1, [l, effectiveSum1]);

  // LCF = (l * effectiveSum2) / effectiveSum1 (from Midship Station 10)
  const LCF = useMemo(() => (effectiveSum1 !== 0 ? (l * effectiveSum2) / effectiveSum1 : 0), [l, effectiveSum2, effectiveSum1]);

  // Transverse Moment of Inertia IT = (2 / 9) * l * effectiveSum3
  const IT = useMemo(() => (2 / 9) * l * effectiveSum3, [l, effectiveSum3]);

  // Longitudinal Inertia Iy = (2 / 3) * (l^3) * effectiveSum4
  const Iy = useMemo(() => (2 / 3) * Math.pow(l, 3) * effectiveSum4, [l, effectiveSum4]);

  // IL = Iy - (AWL * (LCF^2))
  const IL = useMemo(() => Iy - AWL * Math.pow(LCF, 2), [Iy, AWL, LCF]);

  // Calculated Cw
  const calculatedCw = useMemo(() => {
    const maxB = activeMaxHalfB * 2;
    return LWL * maxB > 0 ? AWL / (LWL * maxB) : 0;
  }, [AWL, LWL, activeMaxHalfB]);

  // Correction Percentage = ((AWL - activeTargetAWL) / AWL) * 100%
  const correctionPercent = useMemo(() => {
    if (AWL === 0) return 0;
    return ((AWL - activeTargetAWL) / AWL) * 100;
  }, [AWL, activeTargetAWL]);

  // STRICT TOLERANCE CRITERIA: Minimal <= +/- 0.05%
  const isCorrectionValid = Math.abs(correctionPercent) <= 0.05;

  // Master Hydrostatic Summary across all Waterlines
  const masterSummary = useMemo(() => {
    return waterlineLevels.map((wl) => {
      const data = allWaterlinesData[wl.id] || {};
      let eff1 = 0;
      let eff2 = 0;
      let eff3 = 0;
      let eff4 = 0;
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        const b = data[cfg.station] ?? 0;
        const step = cfg.zoneId === "parallel-middle-body" ? 1.0 : 0.5;
        const col4 = b * cfg.ms;
        const col6 = col4 * cfg.fm;
        const col7 = Math.pow(b, 3) * cfg.ms;
        const col8 = col4 * Math.pow(cfg.fm, 2);
        eff1 += col4 * step;
        eff2 += col6 * step;
        eff3 += col7 * step;
        eff4 += col8 * step;
      });
      const wlAWL = (2 / 3) * l * eff1;
      const wlLCF = eff1 !== 0 ? (l * eff2) / eff1 : 0;
      const wlIT = (2 / 9) * l * eff3;
      const wlIy = (2 / 3) * Math.pow(l, 3) * eff4;
      const wlIL = wlIy - wlAWL * Math.pow(wlLCF, 2);
      const targetArea = AWL_rancangan * wl.awlFactor;
      const targetCwVal = targetCw * (wl.awlFactor / (wl.maxBreadthFactor || 1.0));
      const maxB = (BWL / 2) * wl.maxBreadthFactor * 2;
      const wlCw = LWL * maxB > 0 ? wlAWL / (LWL * maxB) : 0;
      const corr = wlAWL > 0 ? ((wlAWL - targetArea) / wlAWL) * 100 : 0;
      const isValid = Math.abs(corr) <= 0.05;

      return {
        ...wl,
        draftZ: wl.draftFraction * T,
        awl: wlAWL,
        targetAwl: targetArea,
        lcf: wlLCF,
        it: wlIT,
        il: wlIL,
        cw: wlCw,
        targetCw: targetCwVal,
        correction: corr,
        isValid
      };
    });
  }, [allWaterlinesData, l, AWL_rancangan, targetCw, BWL, LWL, T, waterlineLevels]);

  // Export CSV Handler for Active Waterline
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
      [`SUMMARY INTEGRASI ${activeWlConfig.name.toUpperCase()} (Z = ${activeDraftZ.toFixed(2)} m)`, ""],
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
      ["AWL Target Rancangan", `${activeTargetAWL.toFixed(3)} m2`],
      ["Koreksi Water Line", `${correctionPercent.toFixed(3)} %`],
      ["Status Toleransi", isCorrectionValid ? "MEMENUHI SYARAT (<= +/- 0.05%)" : "TIDAK MEMENUHI"]
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...summaryData.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tabel_${activeWlConfig.shortName.replace(/[^a-zA-Z0-9]/g, "_")}_${LBP}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Master Compilation CSV for All Waterlines
  const handleExportAllCSV = () => {
    let csvString = "KOMPILASI DATA SEMUA GARIS AIR (WATERLINES)\n";
    csvString += `Kapal: LBP=${LBP}m, BWL=${BWL}m, T=${T}m, Cb=${cb}, Target Cw=${targetCw}\n\n`;

    csvString += "RANGKUMAN HIDROSTATIS SEMUA WATERLINE\n";
    csvString += "Garis Air,Sarat Z (m),AWL Target (m2),AWL Aktual (m2),LCF (m),Cw,Inersia IT (m4),Inersia IL (m4),Koreksi (%),Status\n";
    masterSummary.forEach((s) => {
      csvString += `${s.name},${s.draftZ.toFixed(3)},${s.targetAwl.toFixed(3)},${s.awl.toFixed(3)},${s.lcf.toFixed(3)},${s.cw.toFixed(4)},${s.it.toFixed(3)},${s.il.toFixed(3)},${s.correction.toFixed(3)}%,${s.isValid ? "MEMENUHI" : "DEVIASI"}\n`;
    });

    csvString += "\n\nTABEL DETAIL ORDINAT 0.5B (m) PER STASIUN GADING\n";
    csvString += "No. Station,Label," + waterlineLevels.map((w) => w.shortName).join(",") + "\n";
    DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
      const rowVals = waterlineLevels.map((w) => (allWaterlinesData[w.id]?.[cfg.station] ?? 0).toFixed(3));
      csvString += `${cfg.station},${cfg.label},${rowVals.join(",")}\n`;
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvString);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kompilasi_Waterlines_${LBP}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PAGE 2: CUSTOM WATERLINE & STATIONS DERIVED LOGIC (EXACTLY MATCHING MODE 1) ---
  // Active hull rows from St. B (-2.0) to FP (20.0) - EXACTLY IDENTICAL to Mode 1
  const activeHullRows = useMemo(() => {
    return calculatedRows.filter((r) => r.station <= 20.0);
  }, [calculatedRows]);

  const exactCurvePts = useMemo(() => {
    return activeHullRows.map((r) => ({
      x: getStationX(r.station),
      y: getSvgY(r.halfBreadth),
      station: r.station,
      halfBreadth: r.halfBreadth,
      label: r.label
    }));
  }, [activeHullRows, BWL]);

  const exactSmoothPath = useMemo(() => {
    return getSmoothPathD(exactCurvePts);
  }, [exactCurvePts]);

  // Inverse mapper: SVG X coordinate -> Station number
  const getStationFromSvgX = (x: number): number => {
    return Math.max(-2.0, Math.min(21.0, (x - 26.0) / 8.0));
  };

  // Interpolated custom stations based on user's input station count, derived from exact hull curve
  const customStationRows = useMemo(() => {
    const count = Math.max(2, Math.min(101, customStationCount || 21));

    // If 36 stations, directly return the authentic 36 calculatedRows
    if (count === 36) {
      return calculatedRows.map((r, idx) => {
        let halfB = customOverrides[idx];
        if (halfB === undefined) halfB = r.halfBreadth;
        const xPos_m = (Math.max(0, r.station) / 20.0) * LBP;
        return {
          index: idx,
          stationNumber: r.station,
          label: `St. ${r.label}`,
          xPos_m,
          halfBreadth: halfB
        };
      });
    }

    const rows = [];
    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const stVal = frac * 20.0;
      const xPos_m = frac * LBP;

      let halfB = customOverrides[i];
      if (halfB === undefined) {
        halfB = Number(
          evaluatePchip1D(
            activeHullRows.map((r) => ({ x: r.station, y: r.halfBreadth })),
            stVal
          ).toFixed(3)
        );
      }

      let label = `St. ${i}`;
      if (i === 0) label = `St. 0 (AP)`;
      else if (i === count - 1) label = `St. ${count - 1} (FP)`;
      else if (Math.abs(frac - 0.5) < 0.001) label = `St. ${i} (MID)`;

      rows.push({
        index: i,
        stationNumber: stVal,
        label,
        xPos_m,
        halfBreadth: halfB
      });
    }

    return rows;
  }, [customStationCount, customOverrides, activeHullRows, calculatedRows, LBP]);

  // Hover tracker handler for clean single waterline canvas
  const handleCleanPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = cleanSvgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());

    // Coordinate mapping: spans from St. B (x=10.0) to FP (x=188.0)
    const clampedSvgX = Math.max(10.0, Math.min(188.0, svgP.x));
    const st = getStationFromSvgX(clampedSvgX);
    const halfB = evaluatePchip1D(
      activeHullRows.map((r) => ({ x: r.station, y: r.halfBreadth })),
      st
    );
    const svgY = getSvgY(halfB);
    const x_m = (Math.max(0, st) / 20.0) * LBP;

    setCleanHover({
      x_m: Number(x_m.toFixed(2)),
      halfB: Number(halfB.toFixed(3)),
      stationVal: Number(st.toFixed(2)),
      svgX: clampedSvgX,
      svgY: Math.max(8.0, svgY)
    });
  };

  const handleCleanPointerLeave = () => {
    setCleanHover(null);
  };

  const handleCustomCellChange = (index: number, val: string) => {
    const num = parseFloat(val);
    setCustomOverrides((prev) => ({
      ...prev,
      [index]: isNaN(num) ? 0 : Number(Math.max(0, Math.min(BWL / 2, num)).toFixed(3))
    }));
  };

  const handleResetCustomOverrides = () => {
    setCustomOverrides({});
  };

  const handleCopyCustomTable = async () => {
    const header = "Gading\tPosisi X (m)\t0.5 B (m)";
    const rows = customStationRows
      .map((r) => `${r.label}\t${r.xPos_m.toFixed(3)}\t${r.halfBreadth.toFixed(3)}`)
      .join("\n");
    const text = `${header}\n${rows}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCustomTable(true);
      setTimeout(() => setCopiedCustomTable(false), 2000);
    } catch (err) {
      console.warn("Failed to copy table:", err);
    }
  };

  const handleExportCustomCSV = () => {
    const headers = ["NO. GADING", "POSISI X (m)", "0.5 B (m)"];
    const rows = customStationRows.map((r) => [r.label, r.xPos_m.toFixed(3), r.halfBreadth.toFixed(3)]);
    const summaryData = [
      [],
      ["TABEL ORDINAT GARIS AIR KUSTOM", ""],
      ["Panjang LBP", `${LBP.toFixed(2)} m`],
      ["Lebar Maksimum (BWL)", `${BWL.toFixed(2)} m`],
      ["Sarat Air (T)", `${T.toFixed(2)} m`],
      ["Jumlah Gading", `${customStationCount}`]
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...summaryData.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tabel_Garis_Air_${customStationCount}_Gading_${LBP}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderWaterlineSvgContent = () => {
    const zoneBarY = isFullPlanView ? 92.0 : 56.0;
    const zoneBarTextY = isFullPlanView ? 95.2 : 59.2;
    const dimArrowY = isFullPlanView ? 100.5 : 63.5;
    const dimTextY1 = isFullPlanView ? 103.5 : 66.5;
    const dimTextY2 = isFullPlanView ? 106.5 : 69.5;
    const guidelineY2 = isFullPlanView ? 97.0 : 61.0;

    return (
      <>
        <defs>
          <marker id="dim-arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto">
            <path d="M 9 1.5 L 1 5 L 9 8.5 z" fill="#64748b" />
          </marker>
          <marker id="dim-arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto">
            <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="#64748b" />
          </marker>
        </defs>

        <text 
          x="-6" 
          y="28" 
          fill="#94a3b8" 
          fontSize="2.6" 
          fontFamily="monospace" 
          transform="rotate(-90 -6 28)" 
          textAnchor="middle"
        >
          Half-Breadth (m)
        </text>

        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((tick) => {
          const yPos = 48.0 - (tick / 8.0) * 38.0;
          return (
            <g key={`ytick-${tick}`}>
              <text 
                x="-1.0" 
                y={yPos + 0.9} 
                fill="#94a3b8" 
                fontSize="2.4" 
                fontFamily="monospace" 
                textAnchor="end"
              >
                {tick}
              </text>
              <line 
                x1="2" 
                y1={yPos} 
                x2="204" 
                y2={yPos} 
                stroke="#1e293b" 
                strokeWidth="0.18" 
                strokeDasharray="1,1" 
              />
            </g>
          );
        })}

        <line x1="4" y1="48" x2="206" y2="48" stroke="#475569" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
        <text x="2" y="51.5" fill="#64748b" fontSize="2.4" fontFamily="monospace" textAnchor="end">
          CL
        </text>

        {/* Station Number Labels along Baseline */}
        {DEFAULT_STATIONS_CONFIG.map((cfg) => {
          const xPos = getStationX(cfg.station);
          const isMidship = cfg.station === 10.0;
          const isAp = cfg.station === 0.0;
          const isFp = cfg.station === 20.0;
          const isStationB = cfg.station === -2.0;
          const isStationA = cfg.station === -1.0;

          return (
            <g key={`station-${cfg.station}`}>
              {/* Subtle baseline tick mark for AP, Midship, and FP */}
              {(isMidship || isAp || isFp) && (
                <line 
                  x1={xPos} 
                  y1={isFullPlanView ? "88" : "48"} 
                  x2={xPos} 
                  y2={isFullPlanView ? "86" : "46"} 
                  stroke={isMidship ? "#06b6d4" : "rgba(245, 158, 11, 0.7)"} 
                  strokeWidth="0.4" 
                />
              )}
              <text 
                x={xPos} 
                y={isAp || isFp || isMidship ? "51.5" : Number.isInteger(cfg.station) ? "51.5" : "53.2"} 
                fill={isAp || isFp || isMidship ? "#e2e8f0" : isStationB || isStationA ? "#fde68a" : cfg.station > 20.0 ? "#c084fc" : Number.isInteger(cfg.station) ? "#cbd5e1" : "#64748b"} 
                fontSize={isAp || isFp || isMidship ? "2.3" : isStationB || isStationA ? "2.1" : Number.isInteger(cfg.station) ? "2.0" : "1.5"} 
                fontWeight={isAp || isFp || isMidship || isStationB || isStationA || Number.isInteger(cfg.station) ? "bold" : "normal"}
                fontFamily="monospace" 
                textAnchor="middle"
              >
                {cfg.station === 20.5 ? "FP-A" : cfg.station === 21.0 ? "FP-B" : cfg.label}
              </text>
              {isMidship && (
                <text 
                  x={xPos} 
                  y="55.0" 
                  fill="#06b6d4" 
                  fontSize="2.4" 
                  fontWeight="bold" 
                  fontFamily="monospace" 
                  textAnchor="middle"
                >
                  MID
                </text>
              )}
            </g>
          );
        })}

        {/* 5. MULTI-WATERLINE GHOST / OVERLAY CURVES */}
        {showAllWlOverlay &&
          waterlineLevels.map((wl) => {
            if (wl.id === activeWlId) return null;
            const wlData = allWaterlinesData[wl.id] || {};
            const wlSetting = wlZoneSettings[wl.id] || getWaterlineDefaultZoneSetting(wl.draftFraction);
            const startSt = wlSetting.hasSternOverhang ? -2.0 : 0.0;
            const endSt = wlSetting.hasBulbousBow ? 21.0 : 20.0;
            const activeHull = DEFAULT_STATIONS_CONFIG.filter((c) => c.station >= startSt && c.station <= endSt);
            const pts = activeHull.map((r) => ({
              x: getStationX(r.station),
              y: getSvgY(wlData[r.station] ?? 0)
            }));
            const pathD = getSmoothPathD(pts);
            const first = pts[0];
            const mirrored = pts.map((p) => ({ x: p.x, y: 48 + (48 - p.y) }));
            const mirroredD = getSmoothPathD(mirrored);

            return (
              <g key={`overlay-${wl.id}`} opacity="0.5" className="transition-all duration-300 pointer-events-none">
                <path
                  d={`M ${first.x},${first.y} ${pathD}`}
                  fill="none"
                  stroke={wl.color}
                  strokeWidth="0.35"
                />
                {isFullPlanView && (
                  <path
                    d={`M ${first.x},${48 + (48 - first.y)} ${mirroredD}`}
                    fill="none"
                    stroke={wl.color}
                    strokeWidth="0.35"
                  />
                )}
                {/* Waterline ID Tag at afterbody */}
                <text x={first.x - 1.5} y={first.y + 0.8} fill={wl.color} fontSize="1.8" fontFamily="monospace" textAnchor="end">
                  {wl.shortName}
                </text>
              </g>
            );
          })}

        {/* 6. ACTIVE WATERLINE CURVE */}
        {(() => {
          const startStation = activeZoneSetting.hasSternOverhang ? -2.0 : 0.0;
          const endStation = activeZoneSetting.hasBulbousBow ? 21.0 : 20.0;
          const activeHullRows = calculatedRows.filter((r) => r.station >= startStation && r.station <= endStation);
          const curvePts = activeHullRows.map((r) => ({
            x: getStationX(r.station),
            y: getSvgY(r.halfBreadth)
          }));
          const smoothPath = getSmoothPathD(curvePts);
          const firstPt = curvePts[0];
          const lastPt = curvePts[curvePts.length - 1];

          const mirroredPts = curvePts.map((p) => ({
            x: p.x,
            y: 48 + (48 - p.y)
          }));
          const mirroredSmoothPath = getSmoothPathD(mirroredPts);

          return (
            <g>
              <path
                d={`M ${firstPt.x},48 L ${firstPt.x},${firstPt.y} ${smoothPath} L ${lastPt.x},48 Z`}
                fill={`${activeWlConfig.color}1f`}
              />
              <path
                d={`M ${firstPt.x},${firstPt.y} ${smoothPath}`}
                fill="none"
                stroke={activeWlConfig.color}
                strokeWidth="0.55"
                strokeLinecap="round"
              />
              {isFullPlanView && (
                <g opacity="0.95">
                  <path
                    d={`M ${firstPt.x},48 L ${firstPt.x},${48 + (48 - firstPt.y)} ${mirroredSmoothPath} L ${lastPt.x},48 Z`}
                    fill={`${activeWlConfig.color}14`}
                  />
                  <path
                    d={`M ${firstPt.x},${48 + (48 - firstPt.y)} ${mirroredSmoothPath}`}
                    fill="none"
                    stroke={activeWlConfig.color}
                    strokeWidth="0.55"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
          );
        })()}

        {/* 6. CONTROL MARKER POINTS ALONG THE WATERLINE (CLEAN - NO VERTICAL STRIPES) */}
        {!isPreviewMode &&
          calculatedRows.map((r, idx) => {
            const x = getStationX(r.station);
            const y = getSvgY(r.halfBreadth);
            const isMidship = r.station === 10.0;
            const isAp = r.station === 0.0;
            const isFpZone = r.station >= 20.0; // St. 31 (FP), St. 32 (FP-A), St. 33 (FP-B)
            const isPmb = r.station >= 6.0 && r.station <= 15.0;
            const isFixed = isFpZone || isPmb;
            const isDragging = draggingStation === r.station;

            const fillColor = isDragging
              ? "#facc15"
              : isMidship
              ? "#06b6d4"
              : isAp
              ? "#f59e0b"
              : isFpZone
              ? "#a855f7"
              : "#38bdf8";

            return (
              <g key={`ordinate-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isDragging ? "1.15" : isFpZone ? "0.85" : isMidship ? "0.9" : "0.75"}
                  fill={fillColor}
                  stroke={isAp ? "#fef3c7" : isFpZone ? "#f3e8ff" : "#ffffff"}
                  strokeWidth={isDragging ? "0.25" : "0.18"}
                  className={
                    isFixed
                      ? "cursor-default"
                      : isDragging
                      ? "cursor-ns-resize"
                      : "cursor-ns-resize hover:opacity-100"
                  }
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => handlePointerDown(e, r.station)}
                >
                  <title>{`St. ${r.label}: 0.5B = ${r.halfBreadth.toFixed(3)} m ${
                    isFpZone
                      ? `(${r.label} - Fore Peak 0.00 m)`
                      : isPmb
                      ? '(PMB - Titik Maksimum 0.5B)'
                      : '(Bisa Digerakkan)'
                  }`}</title>
                </circle>
                {isFullPlanView && (
                  <circle
                    cx={x}
                    cy={48 + (48 - y)}
                    r={isFpZone ? "0.85" : isMidship ? "0.9" : "0.75"}
                    fill={fillColor}
                    stroke={isAp ? "#fef3c7" : isFpZone ? "#f3e8ff" : "#ffffff"}
                    strokeWidth="0.18"
                    opacity="0.85"
                  />
                )}
              </g>
            );
          })}

        {/* 7. LCF MARKER */}
        {(() => {
          const lcfX = getStationX(10.0) + (LCF / (l || 1)) * 8.0;
          return (
            <g>
              <line x1={lcfX} y1="6" x2={lcfX} y2="48" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.5,1.5" />
              <polygon
                points={`${lcfX},6 ${lcfX - 1.4},8.5 ${lcfX + 1.4},8.5`}
                fill="#f59e0b"
              />
              <text x={lcfX} y="4.5" fill="#f59e0b" fontSize="2.8" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                LCF
              </text>
            </g>
          );
        })()}

        {/* 8. 5-SEGMENT AREA ZONES BAR */}
        <g 
          onClick={() => setActiveZone(activeZone === 'after-peak' ? null : 'after-peak')}
          className="cursor-pointer transition-all"
        >
          <rect x="10" y={zoneBarY} width="16" height="4.5" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.3" />
          <text x="18" y={zoneBarTextY} fill="#cbd5e1" fontSize="1.9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            After Peak
          </text>
        </g>
        <g 
          onClick={() => setActiveZone(activeZone === 'peak-1' ? null : 'peak-1')}
          className="cursor-pointer transition-all"
        >
          <rect x="26" y={zoneBarY} width="48" height="4.5" rx="1" fill="#0f2b48" stroke="#0284c7" strokeWidth="0.3" />
          <text x="50" y={zoneBarTextY} fill="#bae6fd" fontSize="2.0" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            Peak 1 (1-10)
          </text>
        </g>
        <g 
          onClick={() => setActiveZone(activeZone === 'parallel-middle-body' ? null : 'parallel-middle-body')}
          className="cursor-pointer transition-all"
        >
          <rect x="74" y={zoneBarY} width="72" height="4.5" rx="1" fill="#083344" stroke="#06b6d4" strokeWidth="0.35" />
          <text x="110" y={zoneBarTextY} fill="#a5f3fc" fontSize="2.0" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            Parallel Middle Body (11-20)
          </text>
        </g>
        <g 
          onClick={() => setActiveZone(activeZone === 'peak-2' ? null : 'peak-2')}
          className="cursor-pointer transition-all"
        >
          <rect x="146" y={zoneBarY} width="40" height="4.5" rx="1" fill="#0f2b48" stroke="#0284c7" strokeWidth="0.3" />
          <text x="166" y={zoneBarTextY} fill="#bae6fd" fontSize="2.0" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            Peak 2 (21-30)
          </text>
        </g>
        <g 
          onClick={() => setActiveZone(activeZone === 'fore-peak' ? null : 'fore-peak')}
          className="cursor-pointer transition-all"
        >
          <rect x="186" y={zoneBarY} width="8" height="4.5" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.3" />
          <text x="190" y={zoneBarTextY} fill="#cbd5e1" fontSize="1.8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            FP (31-33)
          </text>
        </g>

        {/* 9. THREE DUAL-ENDED DIMENSION ARROWS */}
        <line 
          x1="26" 
          y1={dimArrowY} 
          x2="74" 
          y2={dimArrowY} 
          stroke="#64748b" 
          strokeWidth="0.3" 
          markerStart="url(#dim-arrow-start)" 
          markerEnd="url(#dim-arrow-end)" 
        />
        <text x="50" y={dimTextY1} fill="#94a3b8" fontSize="2.0" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {language === "en" ? `Aft la' = ${la_prime.toFixed(4)} m` : `Buritan la' = ${la_prime.toFixed(4)} m`}
        </text>

        <line 
          x1="74" 
          y1={dimArrowY} 
          x2="146" 
          y2={dimArrowY} 
          stroke="#06b6d4" 
          strokeWidth="0.35" 
          markerStart="url(#dim-arrow-start)" 
          markerEnd="url(#dim-arrow-end)" 
        />
        <text x="110" y={dimTextY1} fill="#38bdf8" fontSize="2.0" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {language === "en" ? `Midship PMB l = ${l.toFixed(4)} m` : `Bagian Tengah (PMB) l = ${l.toFixed(4)} m`}
        </text>
        <text x="110" y={dimTextY2} fill="#67e8f9" fontSize="1.8" fontFamily="monospace" textAnchor="middle">
          {language === "en" ? `Standard Frame Spacing l = ${l.toFixed(4)} m (10 PMB Stations)` : `Jarak Standar Antar Gading = ${l.toFixed(4)} m (10 Gading: 11 s.d 20)`}
        </text>

        <line 
          x1="146" 
          y1={dimArrowY} 
          x2="186" 
          y2={dimArrowY} 
          stroke="#64748b" 
          strokeWidth="0.3" 
          markerStart="url(#dim-arrow-start)" 
          markerEnd="url(#dim-arrow-end)" 
        />
        <text x="166" y={dimTextY1} fill="#94a3b8" fontSize="2.0" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {language === "en" ? `Fore lf = ${lf.toFixed(4)} m` : `Haluan lf = ${lf.toFixed(4)} m`}
        </text>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {isFullscreenPlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-3xl flex flex-col p-2 sm:p-3 overflow-hidden select-none animate-in fade-in duration-200">
          {/* COMPACT TOP COCKPIT HEADER */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 mb-2 shadow-2xl space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Studio Title & Active WL */}
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <TrendingUp size={16} />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
                    Waterplane Studio &mdash; <span className="text-cyan-400">{activeWlConfig.name}</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase whitespace-nowrap">
                    Z = {activeDraftZ.toFixed(2)} m
                  </span>
                </div>
              </div>

              {/* Middle: Live HUD Telemetry Strip */}
              <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1 font-mono text-xs shadow-inner">
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400 uppercase">Koreksi:</span>
                  <span className={`font-bold ${isCorrectionValid ? "text-emerald-400" : "text-rose-400"}`}>
                    {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isCorrectionValid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                    {isCorrectionValid ? "MEMENUHI" : "DEVIASI"}
                  </span>
                </div>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400">AWL:</span>
                  <span className="font-bold text-cyan-400">{AWL.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500">/ {activeTargetAWL.toFixed(2)}m²</span>
                </div>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400">LCF:</span>
                  <span className="font-bold text-amber-400">{LCF.toFixed(3)} m</span>
                </div>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400">Cw:</span>
                  <span className="font-bold text-cyan-400">{calculatedCw.toFixed(4)}</span>
                </div>
              </div>

              {/* Middle-Right: Zone Settings Toggles */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={toggleSternOverhang}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border flex items-center space-x-1 cursor-pointer ${
                    activeZoneSetting.hasSternOverhang
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40 shadow-sm"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Aktifkan / Nonaktifkan Buritan Overhang di St. B & A"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeZoneSetting.hasSternOverhang ? "bg-amber-400" : "bg-slate-600"}`} />
                  <span>Buritan: {activeZoneSetting.hasSternOverhang ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={toggleBulbousBow}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border flex items-center space-x-1 cursor-pointer ${
                    activeZoneSetting.hasBulbousBow
                      ? "bg-purple-500/20 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/40 shadow-sm"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Aktifkan / Nonaktifkan Tonjolan Haluan di St. FP-A & FP-B (Bulbous Bow)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeZoneSetting.hasBulbousBow ? "bg-purple-400" : "bg-slate-600"}`} />
                  <span>Bulbous FP: {activeZoneSetting.hasBulbousBow ? "ON" : "OFF"}</span>
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleAutoFineTune}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-mono text-xs font-bold transition-all shadow-md flex items-center space-x-1 cursor-pointer"
                  title="Otomatis ratakan dan seimbangkan kurva hingga memenuhi syarat <= ±0.05%"
                >
                  <Wand2 size={13} />
                  <span>Auto-Fit</span>
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                  title="Reset ke Posisi Desain Awal"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => setIsFullPlanView(!isFullPlanView)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    isFullPlanView
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                  }`}
                  title="Tampilkan Simetri Penuh Kiri & Kanan (Port & Starboard)"
                >
                  <Maximize2 size={13} />
                  <span>{isFullPlanView ? (language === "en" ? "Full Hull" : "Simetri Penuh") : (language === "en" ? "Half-Breadth" : "0.5 B")}</span>
                </button>
                <button
                  onClick={() => setShowAllWlOverlay(!showAllWlOverlay)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    showAllWlOverlay
                      ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Tampilkan / Sembunyikan Garis Air Lainnya (Multi-Waterline Overlay)"
                >
                  <Layers size={13} />
                  <span>{showAllWlOverlay ? "Multi-WL: ON" : "Multi-WL: OFF"}</span>
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isPreviewMode
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                  }`}
                  title={isPreviewMode ? "Tampilkan Titik & Garis Bantu (Edit Mode)" : "Sembunyikan Titik & Garis Bantu (Preview Mode)"}
                >
                  {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {onSave && (
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-2.5 py-1.5 bg-emerald-600/40 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 hover:text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm ml-1"
                    title={language === "en" ? "Save Waterline Offsets Permanently (Ctrl+S)" : "Simpan Data Garis Air Permanen (Ctrl+S)"}
                  >
                    <Save size={13} className={isSaving ? "animate-spin" : ""} />
                    <span>{isSaving ? (language === "en" ? "Saving..." : "Menyimpan...") : (language === "en" ? "Save" : "Simpan")}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsFullscreenPlot(false)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white rounded-lg transition-all cursor-pointer ml-1"
                  title="Tutup Mode Layar Penuh (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Slim Waterline Quick-Switch Bar */}
            <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-800/70">
              <button
                onClick={() => setIsWlManagerOpen(true)}
                className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0 mr-1 shadow-sm"
                title="Kelola & Kustomisasi Garis Air (Presets / Tambah / Hapus WL)"
              >
                <SlidersHorizontal size={12} />
                <span>Kelola WL ({waterlineLevels.length})</span>
              </button>
              {waterlineLevels.map((wl) => {
                const isActive = wl.id === activeWlId;
                const wlSummary = masterSummary.find((s) => s.id === wl.id);
                const isWlValid = wlSummary?.isValid ?? false;
                const wlDraftZ = wl.draftFraction * T;

                return (
                  <button
                    key={`fs-wl-${wl.id}`}
                    onClick={() => setActiveWlId(wl.id)}
                    className={`flex items-center justify-center space-x-1.5 py-1 px-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md border-cyan-400 ring-1 ring-cyan-400/40"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: wl.color }} />
                    <span>{wl.shortName}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isActive ? "bg-white/20 text-white" : "bg-slate-900/60 text-slate-400"}`}>
                      Z={wlDraftZ.toFixed(2)}m
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWlValid ? "bg-emerald-400" : "bg-rose-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 bg-slate-900/95 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-1 sm:p-2.5 shadow-2xl">
            {draggingStation !== null && (
              <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-amber-500/20 border border-amber-500/50 px-3 py-1 rounded-full font-mono text-xs text-amber-300 backdrop-blur-md shadow-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  Mengubah St. {calculatedRows.find(r => r.station === draggingStation)?.label ?? draggingStation}: <strong>0.5 B = {(halfBreadths[draggingStation] ?? 0).toFixed(3)} m</strong>
                </span>
              </div>
            )}

            <svg
              className="w-full h-full select-none cursor-crosshair"
              viewBox={isFullPlanView ? "-8 -2 216 118" : "-8 -2 216 78"}
              preserveAspectRatio="xMidYMid meet"
              style={{ touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {renderWaterlineSvgContent()}
            </svg>
          </div>

          <div className="w-full flex items-center justify-between pt-1 px-1 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Geser titik pada kurva untuk mengubah bentuk garis air. Tekan <strong>Esc</strong> atau tombol silang untuk kembali.</span>
            </span>
            <span className="text-slate-500">36 Stasiun Gading</span>
          </div>
        </div>
      )}

      {/* HEADER: LINES PLAN TITLE BLOCK & SHIP MAIN PARTICULARS */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <TableIcon size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {language === "en" ? "Water Plane Calculation Sheet" : "Tabel Perhitungan Garis Air (Water Plane Calculation Sheet)"}
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isCorrectionValid
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse"
                    }`}
                  >
                    {language === "en" ? "Tolerance: ≤ ±0.05%" : "Toleransi: ≤ ±0.05%"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "en"
                    ? "Calculation of Waterplane Area (AWL), Longitudinal Center of Flotation (LCF), Transverse (IT) & Longitudinal (IL) Moment of Inertia, and Cw coefficient."
                    : "Perhitungan Luas Garis Air (AWL), Titik Apung Memanjang (LCF), Momen Inersia Melintang (IT) & Memanjang (IL), serta Koefisien Cw."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end lg:self-auto">
            <button
              onClick={handleAutoFineTune}
              className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              title="Otomatis selaraskan ordinat agar koreksi <= +/- 0.05%"
            >
              <Wand2 size={14} />
              <span>Auto-Fit (&le; &plusmn;0.05%)</span>
            </button>
            <button
              onClick={handleReset}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Reset ordinat ke kurva standar"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="py-2 px-3.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              title="Unduh data tabel dalam format CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg ${
                  isSaving
                    ? "bg-amber-600/30 text-amber-300 border border-amber-500/50 animate-pulse"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border border-emerald-400/40 shadow-emerald-950/40 hover:scale-[1.02]"
                }`}
                title={language === "en" ? "Save all waterline calculations permanently (Ctrl+S)" : "Simpan semua kalkulasi garis air permanen (Ctrl+S)"}
              >
                <Save size={14} className={isSaving ? "animate-spin" : ""} />
                <span>{isSaving ? (language === "en" ? "Saving..." : "Menyimpan...") : (language === "en" ? "Save Permanently" : "Simpan Permanen")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">LBP</span>
            <div className="font-bold text-cyan-600 dark:text-cyan-300">{LBP.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">LWL</span>
            <div className="font-bold text-cyan-600 dark:text-cyan-300">{LWL.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">BWL (Lebar)</span>
            <div className="font-bold text-cyan-600 dark:text-cyan-300">{BWL.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Sarat Air (T)</span>
            <div className="font-bold text-cyan-600 dark:text-cyan-300">{T.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Koef. Balok (Cb)</span>
            <div className="font-bold text-cyan-600 dark:text-cyan-300">{cb.toFixed(3)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Target Cw</span>
            <div className="font-bold text-amber-600 dark:text-amber-300">{targetCw.toFixed(3)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">Jarak Gading (l)</span>
            <div className="font-bold text-slate-700 dark:text-slate-300">{l.toFixed(3)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">AWL Desain</span>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{AWL_rancangan.toFixed(2)} m&sup2;</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode("fullSheet")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "fullSheet"
                ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-md border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TableIcon size={15} />
            <span>{language === "en" ? "Page 1: Full Simpson Sheet & Visual Plot" : "Halaman 1: Tabel Integrasi Simpson & Plot Visual"}</span>
          </button>
          <button
            onClick={() => setViewMode("cleanCustom")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === "cleanCustom"
                ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-md border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers size={15} />
            <span>{language === "en" ? "Page 2: Custom Stations & Single Waterline Studio" : "Halaman 2: Studio Garis Air & Evaluasi Gading Kustom"}</span>
          </button>
        </div>
      </div>

      {viewMode === "fullSheet" && (
        <>
          {/* WATERLINE LEVEL SELECTOR NAVIGATOR TABS */}
          <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-3 select-none">
            {/* Top Bar: Title & Active Parameters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-3 shrink-0">
                <div className="p-2 rounded-xl bg-cyan-600/15 border border-cyan-500/30 text-cyan-400">
                  <Sliders size={17} />
                </div>
                <div className="flex items-center space-x-2.5">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider whitespace-nowrap">
                    {language === "en" ? "Waterline Navigator" : "Pilih Garis Air (Waterline)"}
                  </h4>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 whitespace-nowrap">
                    Aktif: {activeWlConfig.shortName}
                  </span>
                </div>
              </div>

              {/* Unified Telemetry Parameter Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-1.5 font-mono text-xs shadow-inner">
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Sarat</span>
                  <strong className="text-cyan-400 font-bold">Z = {activeDraftZ.toFixed(2)} m</strong>
                </div>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Target AWL:</span>
                  <strong className="text-cyan-400 font-bold">{activeTargetAWL.toFixed(2)} m&sup2;</strong>
                </div>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Target Cw:</span>
                  <strong className="text-amber-400 font-bold">{activeTargetCw.toFixed(3)}</strong>
                </div>
              </div>
            </div>

            {/* Waterlines Grid / Segmented Control Bar */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Pilih Garis Air Aktif ({waterlineLevels.length} Level Garis Air):
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Inline Quick WL Count Input & Auto-Generate */}
                  <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 py-1 shadow-sm">
                    <span className="text-[11px] font-mono text-slate-300 font-medium">Berapa WL:</span>
                    <button
                      type="button"
                      onClick={() => setDesiredWlCount((prev) => Math.max(3, prev - 1))}
                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer transition-all"
                      title="Kurangi 1 WL"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={3}
                      max={25}
                      value={desiredWlCount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setDesiredWlCount(Math.max(3, Math.min(25, v)));
                      }}
                      className="w-9 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono font-bold text-cyan-300 py-0.5 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setDesiredWlCount((prev) => Math.min(25, prev + 1))}
                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer transition-all"
                      title="Tambah 1 WL"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(desiredWlCount)}
                      className="px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer shadow-sm flex items-center space-x-1"
                      title={`Otomatis buat ${desiredWlCount} garis air berjarak seragam dari lunas hingga DWL`}
                    >
                      <Sparkles size={11} />
                      <span>Buat Otomatis</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsWlManagerOpen(true)}
                    className="px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                    title="Buka Studio Kustomisasi Jumlah & Level Garis Air"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Studio Kustomisasi</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {waterlineLevels.map((wl) => {
                  const isActive = wl.id === activeWlId;
                  const wlSummary = masterSummary.find((s) => s.id === wl.id);
                  const isWlValid = wlSummary?.isValid ?? false;
                  const wlDraftZ = wl.draftFraction * T;

                  return (
                    <button
                      key={wl.id}
                      onClick={() => setActiveWlId(wl.id)}
                      className={`flex items-center space-x-2 py-1.5 px-2.5 rounded-xl font-mono transition-all cursor-pointer border relative group shrink-0 ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border-cyan-400 ring-2 ring-cyan-400/40 scale-[1.02]"
                          : "bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border-slate-700/70"
                      }`}
                      title={`${wl.name} - Sarat Z = ${wlDraftZ.toFixed(2)} m (${wl.badge})`}
                    >
                      <span className="w-2 h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: wl.color }} />
                      <span className="text-xs font-bold whitespace-nowrap">{wl.shortName}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono font-medium text-[10px] whitespace-nowrap ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-900/90 text-slate-400"
                      }`}>
                        Z={wlDraftZ.toFixed(2)}m
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWlValid ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-rose-400 shadow-sm shadow-rose-400/50"}`}
                        title={isWlValid ? "Koreksi Memenuhi Syarat (≤ ±0.05%)" : "Deviasi Melebihi Toleransi"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <TrendingUp size={16} className="text-cyan-500 dark:text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {language === "en"
                    ? `Visual Waterplane Plot — ${activeWlConfig.name} (Z = ${activeDraftZ.toFixed(2)}m)`
                    : `Plot Visual Garis Air — ${activeWlConfig.name} (Sarat Z = ${activeDraftZ.toFixed(2)} m)`}
                </h3>
              </div>

              {/* Per-Waterline Zone Extension Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleSternOverhang}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                    activeZoneSetting.hasSternOverhang
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                  title="Klik untuk Mengaktifkan / Menonaktifkan perpanjangan buritan di St. B & A (Stern Overhang). Luas AWL otomatis dikalibrasi ulang."
                >
                  <span className={`w-2 h-2 rounded-full ${activeZoneSetting.hasSternOverhang ? "bg-amber-400 shadow-sm shadow-amber-400/50" : "bg-slate-600"}`} />
                  <span>Buritan (AP Overhang): {activeZoneSetting.hasSternOverhang ? "ON" : "OFF (0m)"}</span>
                </button>

                <button
                  onClick={toggleBulbousBow}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                    activeZoneSetting.hasBulbousBow
                      ? "bg-purple-500/20 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/40"
                      : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                  title="Klik untuk Mengaktifkan / Menonaktifkan tonjolan haluan di St. FP-A & FP-B (Bulbous Bow). Luas AWL otomatis dikalibrasi ulang."
                >
                  <span className={`w-2 h-2 rounded-full ${activeZoneSetting.hasBulbousBow ? "bg-purple-400 shadow-sm shadow-purple-400/50" : "bg-slate-600"}`} />
                  <span>Haluan (Bulbous FP): {activeZoneSetting.hasBulbousBow ? "ON" : "OFF (0m)"}</span>
                </button>
              </div>
            </div>

            <div className="w-full bg-slate-900/95 dark:bg-slate-950/95 rounded-xl relative overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-3 group select-none shadow-2xl">
              <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 bg-slate-800/90 border border-slate-600/80 rounded-lg p-1 shadow-lg backdrop-blur-sm">
                <button
                  onClick={() => setIsFullscreenPlot(true)}
                  className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 hover:text-white rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                  title="Buka Mode Layar Penuh (Interactive Studio dengan Live Koreksi)"
                >
                  <Maximize size={13} />
                  <span>{language === "en" ? "Fullscreen" : "Layar Penuh"}</span>
                </button>
                <button
                  onClick={() => setIsFullPlanView(!isFullPlanView)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    isFullPlanView
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-cyan-300"
                  }`}
                  title="Tampilkan Simetri Penuh Kiri & Kanan (Port & Starboard)"
                >
                  <Maximize2 size={13} />
                  <span>{isFullPlanView ? (language === "en" ? "Full Hull" : "Simetri Penuh") : (language === "en" ? "Half-Breadth" : "0.5 B")}</span>
                </button>
                <button
                  onClick={() => setShowAllWlOverlay(!showAllWlOverlay)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    showAllWlOverlay
                      ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 shadow-sm"
                      : "bg-slate-700/80 hover:bg-slate-600 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Tampilkan / Sembunyikan Garis Air Lainnya (Multi-Waterline Overlay)"
                >
                  <Layers size={13} />
                  <span>{showAllWlOverlay ? "Multi-WL: ON" : "Multi-WL: OFF"}</span>
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                  title={isPreviewMode ? "Tampilkan Titik & Garis Bantu (Edit Mode)" : "Sembunyikan Titik & Garis Bantu (Preview Mode)"}
                >
                  {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {onSave && (
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-2.5 py-1 bg-emerald-600/40 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 hover:text-white rounded text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 shadow-sm ml-1"
                    title={language === "en" ? "Save Waterline Offsets Permanently (Ctrl+S)" : "Simpan Data Garis Air Permanen (Ctrl+S)"}
                  >
                    <Save size={12} className={isSaving ? "animate-spin" : ""} />
                    <span>{isSaving ? (language === "en" ? "Saving..." : "Menyimpan...") : (language === "en" ? "Save" : "Simpan")}</span>
                  </button>
                )}
              </div>

              <div className={`w-full relative transition-all duration-300 ${isFullPlanView ? "h-72 sm:h-88 md:h-[420px]" : "h-56 sm:h-68 md:h-80"}`}>
                {draggingStation !== null && (
                  <div className="absolute top-2 left-2 z-30 flex items-center space-x-2 bg-slate-900/90 border border-amber-500/60 px-3 py-1 rounded-full font-mono text-[11px] text-amber-300 backdrop-blur-md shadow-lg pointer-events-none animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>
                      Mengubah St. {calculatedRows.find(r => r.station === draggingStation)?.label ?? draggingStation}: <strong>0.5 B = {(halfBreadths[draggingStation] ?? 0).toFixed(3)} m</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                      Tahan Shift: Mode Sangat Presisi
                    </span>
                  </div>
                )}
                <svg 
                  ref={svgRef}
                  className="w-full h-full select-none cursor-crosshair" 
                  viewBox={isFullPlanView ? "-8 -2 216 118" : "-8 -2 216 78"} 
                  preserveAspectRatio="xMidYMid meet"
                  style={{ touchAction: "none" }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  {renderWaterlineSvgContent()}
                </svg>
              </div>

          {/* Mode Preview CAD Indicator Pill */}
          <div className="w-full flex items-center justify-center pt-2 select-none">
            <span className="flex items-center space-x-2 bg-slate-900/90 px-4 py-1.5 rounded-full border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              <span>36 Station Waterplane Plan &mdash; After Peak (3), Peak 1 (10), PMB (10), Peak 2 (10), Fore Peak (3)</span>
            </span>
          </div>
        </div>
      </div>

      {/* TABLE: 36 STATIONS SIMPSON INTEGRATION & AREA SUBTOTALS */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{language === "en" ? "Simpson Integration Table Waterplane Ordinates (36 Stations)" : "Tabel Integrasi Simpson Ordinat Garis Air (Water Plane 36 Station)"}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "en"
                ? "You can edit 0.5 B (m) values in the table below. Subtotals per zone (AP, P1, PMB, P2, FP) and total sigma will recalculate instantly."
                : "Anda dapat mengedit nilai 0.5 B (m) pada tabel di bawah. Subtotal per area (AP, P1, PMB, P2, FP) dan total sigma akan terhitung otomatis seketika."}
            </p>
          </div>
        </div>

        {/* 5-Area Subtotal Summary Quick-Glance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {AREA_ZONES.map((zone) => {
            const data = zoneSubtotals[zone.id];
            if (!data) return null;
            return (
              <div
                key={zone.id}
                onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer shadow-md ${
                  activeZone === zone.id 
                    ? "bg-slate-100 dark:bg-slate-800/90 ring-2 ring-cyan-500 border-transparent" 
                    : `${zone.badgeColor} hover:brightness-110`
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.bgFill.replace(/0\.\d+/, '1') }} />
                    <span className="text-[11px] font-bold uppercase">{zone.code}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/20 dark:bg-black/40 font-mono">
                    {data.stations.length} St
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-cyan-600 dark:text-cyan-300">
                    <span className="opacity-75">&Sigma;1:</span>
                    <span className="font-bold">{data.sum1.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="opacity-75">&Sigma;2:</span>
                    <span className="font-semibold">{data.sum2.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="opacity-75">&Sigma;3:</span>
                    <span className="font-semibold">{data.sum3.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="opacity-75">&Sigma;4:</span>
                    <span className="font-semibold">{data.sum4.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsive Fixed Table Container with Sticky Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <table className="w-full text-left text-xs font-mono border-collapse table-fixed min-w-[780px]">
            <thead className="sticky top-0 z-20 shadow-md">
              <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <th className="py-3 px-2 font-bold text-center border-r border-slate-200 dark:border-slate-800/60 w-[12%] text-slate-600 dark:text-slate-400">
                  (1)<br />NO. SECT
                </th>
                <th className="py-3 px-2 font-bold text-cyan-600 dark:text-cyan-400 border-r border-slate-200 dark:border-slate-800/60 w-[14%]">
                  (2)<br />0.5 B (m)
                </th>
                <th className="py-3 px-2 font-semibold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-800/60 w-[8%]">
                  (3)<br />MS
                </th>
                <th className="py-3 px-2 font-bold text-slate-700 dark:text-slate-200 text-right border-r border-slate-200 dark:border-slate-800/60 w-[13%]">
                  (4) = (2)&times;(3)<br />0.5B &middot; MS
                </th>
                <th className="py-3 px-2 font-semibold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-800/60 w-[9%]">
                  (5)<br />FM
                </th>
                <th className="py-3 px-2 font-bold text-slate-700 dark:text-slate-200 text-right border-r border-slate-200 dark:border-slate-800/60 w-[14%]">
                  (6) = (4)&times;(5)<br />SMA
                </th>
                <th className="py-3 px-2 font-bold text-slate-700 dark:text-slate-200 text-right border-r border-slate-200 dark:border-slate-800/60 w-[15%]">
                  (7) = (2)&sup3;&times;(3)<br />(0.5B)&sup3; &middot; MS
                </th>
                <th className="py-3 px-2 font-bold text-slate-700 dark:text-slate-200 text-right w-[15%]">
                  (8) = (4)&times;(5)&sup2;<br />0.5B &middot; MS &middot; FM&sup2;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 bg-white dark:bg-slate-950/40">
              {calculatedRows.map((r, idx) => {
                const isMid = r.station === 10.0;
                const isAp = r.station === 0.0;
                const isFp = r.station === 20.0;
                const isHighlighted = isMid || isAp || isFp;
                const stationZone = getStationZone(r.station);
                const isZoneActive = (activeZone && activeZone === stationZone.id) || (hoveredZone && hoveredZone === stationZone.id);
                const isLastInZone = r.station === 0.0 || r.station === 5.0 || r.station === 15.0 || r.station === 20.0 || r.station === 21.0;
                const zoneData = zoneSubtotals[stationZone.id];

                return (
                  <React.Fragment key={idx}>
                    <tr
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isZoneActive 
                          ? "bg-slate-100 dark:bg-slate-800/60 ring-1 ring-cyan-500/30" 
                          : isHighlighted 
                          ? "bg-slate-50/80 dark:bg-slate-900/60 font-semibold" 
                          : ""
                      }`}
                    >
                      {/* (1) NO. SECT with Area Zone Badge */}
                      <td className="py-2 px-2.5 text-center border-r border-slate-200 dark:border-slate-800/60">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              stationZone.code === 'PMB'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            }`}
                            title={stationZone.description}
                          >
                            {stationZone.code}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              isMid
                                ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-500/30"
                                : isAp || isFp
                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {r.label}
                          </span>
                        </div>
                      </td>

                      {/* (2) 0.5 B (m) - Editable */}
                      <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800/60">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max={BWL}
                          value={halfBreadths[r.station] ?? 0}
                          onChange={(e) => handleCellChange(r.station, e.target.value)}
                          className="w-full bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-lg py-1 px-2 text-cyan-700 dark:text-cyan-300 font-bold font-mono text-xs focus:border-cyan-500 focus:outline-none text-right transition-all"
                        />
                      </td>

                      {/* (3) MS */}
                      <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                        {r.ms.toFixed(2)}
                      </td>

                      {/* (4) 0.5B . MS */}
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-medium border-r border-slate-200 dark:border-slate-800/60">
                        {r.col4.toFixed(3)}
                      </td>

                      {/* (5) FM */}
                      <td
                        className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800/60 ${
                          r.fm < 0 ? "text-amber-600 dark:text-amber-400/90" : r.fm > 0 ? "text-cyan-600 dark:text-cyan-400/90" : "text-slate-900 dark:text-white font-bold"
                        }`}
                      >
                        {r.fm > 0 ? `+${r.fm.toFixed(2)}` : r.fm.toFixed(2)}
                      </td>

                      {/* (6) SMA */}
                      <td
                        className={`py-2 px-3 text-right font-medium border-r border-slate-200 dark:border-slate-800/60 ${
                          r.col6 < 0 ? "text-amber-600 dark:text-amber-300" : r.col6 > 0 ? "text-cyan-600 dark:text-cyan-300" : "text-slate-400"
                        }`}
                      >
                        {r.col6.toFixed(3)}
                      </td>

                      {/* (7) (0.5B)^3 . MS */}
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-medium border-r border-slate-200 dark:border-slate-800/60">
                        {r.col7.toFixed(3)}
                      </td>

                      {/* (8) 0.5B . MS . FM^2 */}
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-medium">
                        {r.col8.toFixed(3)}
                      </td>
                    </tr>

                    {/* SUB-TOTAL ROW FOR THIS AREA ZONE */}
                    {isLastInZone && zoneData && (
                      <tr 
                        className="bg-slate-100 dark:bg-slate-900/90 border-y border-slate-300 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200"
                      >
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider border-r border-slate-200 dark:border-slate-800/80">
                          <div className="flex items-center justify-end space-x-2">
                            <span 
                              className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                stationZone.code === 'PMB'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-600/50'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {stationZone.code}
                            </span>
                            <span className="font-bold text-[11px]">
                              {`Subtotal Σ Area ${stationZone.name} (${zoneData.stations.length} St):`}
                            </span>
                          </div>
                        </td>
                        {/* Subtotal Sigma 1 */}
                        <td className="py-2 px-3 text-right text-cyan-700 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-800/80">
                          <div className="text-[9px] opacity-75 font-mono uppercase">&Sigma;1_{stationZone.code} =</div>
                          <div className="text-xs font-bold font-mono">{zoneData.sum1.toFixed(3)}</div>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800/80">-</td>
                        {/* Subtotal Sigma 2 */}
                        <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80">
                          <div className="text-[9px] opacity-75 font-mono uppercase">&Sigma;2_{stationZone.code} =</div>
                          <div className="text-xs font-bold font-mono">{zoneData.sum2.toFixed(3)}</div>
                        </td>
                        {/* Subtotal Sigma 3 */}
                        <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80">
                          <div className="text-[9px] opacity-75 font-mono uppercase">&Sigma;3_{stationZone.code} =</div>
                          <div className="text-xs font-bold font-mono">{zoneData.sum3.toFixed(3)}</div>
                        </td>
                        {/* Subtotal Sigma 4 */}
                        <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                          <div className="text-[9px] opacity-75 font-mono uppercase">&Sigma;4_{stationZone.code} =</div>
                          <div className="text-xs font-bold font-mono">{zoneData.sum4.toFixed(3)}</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* GRAND TOTAL SIGMA SUMMARY ROW */}
              <tr className="bg-slate-200/90 dark:bg-slate-950 border-t-2 border-cyan-500 font-bold text-xs text-slate-900 dark:text-white shadow-2xl">
                <td colSpan={3} className="py-3.5 px-4 text-right uppercase tracking-wider text-cyan-700 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-800 text-xs">
                  <div className="font-extrabold text-slate-900 dark:text-white">{language === "en" ? "TOTAL OVERALL SIGMA (Σ1 to Σ4):" : "TOTAL SIGMA KESELURUHAN (Σ1 s.d Σ4):"}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{language === "en" ? "Sum of Complete 36 Stations" : "Penjumlahan 36 Stasiun Lengkap"}</div>
                </td>
                {/* Sigma 1 */}
                <td className="py-3 px-3 text-right text-cyan-600 dark:text-cyan-400 border-r border-slate-200 dark:border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono">&Sigma;1 =</div>
                  <div className="text-base font-black font-mono">{sum1.toFixed(3)}</div>
                </td>
                <td className="py-3 px-3 text-center text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800">-</td>
                {/* Sigma 2 */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono">&Sigma;2 =</div>
                  <div className="text-base font-black font-mono">{sum2.toFixed(3)}</div>
                </td>
                {/* Sigma 3 */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-sm">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono">&Sigma;3 =</div>
                  <div className="text-base font-black font-mono">{sum3.toFixed(3)}</div>
                </td>
                {/* Sigma 4 */}
                <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100 text-sm">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-mono">&Sigma;4 =</div>
                  <div className="text-base font-black font-mono">{sum4.toFixed(3)}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY RESULT CARDS & VERIFICATION FORMULAS */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === "en" ? "Hydrostatic Integration Results & Waterline Verification" : "Hasil Integrasi Hidrostatik & Koreksi Garis Air (Waterline Verification)"}
            </h3>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400">{language === "en" ? "Max Deviation Target: " : "Target Deviasi Maksimal: "}</span>
            <strong className="text-emerald-600 dark:text-emerald-400">&le; &plusmn;0.05%</strong>
          </div>
        </div>

        {/* 6 Key Calculation Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: AWL */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{language === "en" ? "Waterplane Area (AWL)" : "Luas Garis Air (AWL)"}</span>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">AWL = (2/3) &middot; l &middot; &Sigma;1_efektif</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {AWL.toFixed(3)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              = (2/3) &times; {l.toFixed(3)} &times; {effectiveSum1.toFixed(3)}
            </div>
          </div>

          {/* Card 2: LCF */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{language === "en" ? "Longitudinal Center of Flotation (LCF)" : "Titik Apung Memanjang (LCF)"}</span>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">LCF = l &middot; &Sigma;2 / &Sigma;1</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {LCF.toFixed(3)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">m</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {LCF < 0
                ? (language === "en" ? `${Math.abs(LCF).toFixed(3)} m aft of Midship (10)` : `${Math.abs(LCF).toFixed(3)} m di belakang Midship (10)`)
                : (language === "en" ? `${LCF.toFixed(3)} m forward of Midship (10)` : `${LCF.toFixed(3)} m di depan Midship (10)`)}
            </div>
          </div>

          {/* Card 3: IT (Transverse Inertia) */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{language === "en" ? "Transverse Inertia (IT)" : "Inersia Melintang (IT)"}</span>
              <span className="text-[10px] font-mono text-slate-500">IT = (2/9)&middot;l&middot;&Sigma;3_efektif</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">
              {IT.toFixed(3)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">m&sup4;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {language === "en" ? "Moment of inertia about longitudinal axis" : "Momen inersia terhadap sumbu longitudinal"}
            </div>
          </div>

          {/* Card 4: Iy & IL */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{language === "en" ? "Longitudinal Inertia (IL)" : "Inersia Memanjang (IL)"}</span>
              <span className="text-[10px] font-mono text-slate-500">IL = Iy - (AWL &middot; LCF&sup2;)</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100">
              {IL.toFixed(3)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">m&sup4;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {language === "en" ? `Iy = ${Iy.toFixed(2)} m⁴ | LCF Correction = ${(AWL * Math.pow(LCF, 2)).toFixed(2)} m⁴` : `Iy = ${Iy.toFixed(2)} m⁴ | Koreksi LCF = ${(AWL * Math.pow(LCF, 2)).toFixed(2)} m⁴`}
            </div>
          </div>

          {/* Card 5: CW (Waterplane Coefficient) */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{language === "en" ? "Waterplane Coefficient (Cw)" : "Koefisien Garis Air (Cw)"}</span>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">CW = AWL / (LWL &middot; BWL)</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {calculatedCw.toFixed(4)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {language === "en" ? "Design Target = " : "Target Rancangan = "}{targetCw.toFixed(2)}
            </div>
          </div>

          {/* Card 6: Koreksi Garis Air dengan Batas Toleransi Minimal <= +/- 0.05% */}
          <div
            className={`p-4 rounded-xl border space-y-1.5 shadow-sm backdrop-blur-md transition-all ${
              isCorrectionValid
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-500/40 text-rose-800 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center space-x-1.5">
                {isCorrectionValid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{language === "en" ? "Water Line Correction" : "Koreksi Water Line"}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                {language === "en" ? "Requirement: ≤ ±0.05%" : "Syarat: ≤ ±0.05%"}
              </span>
            </div>
            <div className="text-2xl font-black font-mono">
              {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
            </div>
            <div className="text-[11px] opacity-90 font-mono flex items-center justify-between">
              <span>AWL Target = {activeTargetAWL.toFixed(2)} m&sup2;</span>
              <span className={`font-bold ${isCorrectionValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isCorrectionValid ? (language === "en" ? "MEETS REQUIREMENT" : "MEMENUHI SYARAT") : (language === "en" ? "DEVIATION EXCEEDS 0.05%" : "DEVIASI MELEBIHI 0.05%")}
              </span>
            </div>
          </div>
        </div>

        {/* DETAILED PLAIN-TEXT MATHEMATICAL EXPLANATION BOX */}
        <div className="bg-slate-50 dark:bg-slate-950/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
          <div className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center space-x-2">
            <HelpCircle size={14} className="text-cyan-500 dark:text-cyan-400" />
            <span>{language === "en" ? "Waterplane Hydrostatic Formulas (Plain-Text Reference):" : "Rumus Hidrostatik Garis Air (Plain-Text Reference):"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
            <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <p className="text-cyan-700 dark:text-cyan-300 font-bold">{language === "en" ? "1. Waterplane Area (AWL):" : "1. Luas Garis Air (AWL):"}</p>
              <p className="text-slate-600 dark:text-slate-400">AWL = (2 / 3) * l * Total_Sigma_1_efektif</p>
              <p className="text-slate-600 dark:text-slate-400">AWL = (2 / 3) * {l.toFixed(4)} * {effectiveSum1.toFixed(3)} = <strong className="text-emerald-600 dark:text-emerald-400">{AWL.toFixed(3)} m&sup2;</strong></p>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <p className="text-cyan-700 dark:text-cyan-300 font-bold">{language === "en" ? "2. Longitudinal Center of Flotation (LCF):" : "2. Titik Apung Memanjang (LCF):"}</p>
              <p className="text-slate-600 dark:text-slate-400">LCF = (l * Total_Sigma_2_efektif) / Total_Sigma_1_efektif</p>
              <p className="text-slate-600 dark:text-slate-400">LCF = ({l.toFixed(4)} * {effectiveSum2.toFixed(3)}) / {effectiveSum1.toFixed(3)} = <strong className="text-cyan-700 dark:text-cyan-300">{LCF.toFixed(3)} m</strong></p>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <p className="text-cyan-700 dark:text-cyan-300 font-bold">{language === "en" ? "3. Transverse Moment of Inertia (IT):" : "3. Momen Inersia Melintang (IT):"}</p>
              <p className="text-slate-600 dark:text-slate-400">IT = (2 / 9) * l * Total_Sigma_3_efektif</p>
              <p className="text-slate-600 dark:text-slate-400">IT = (2 / 9) * {l.toFixed(4)} * {effectiveSum3.toFixed(3)} = <strong className="text-purple-700 dark:text-purple-300">{IT.toFixed(3)} m&sup4;</strong></p>
            </div>
            <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-sm">
              <p className="text-cyan-700 dark:text-cyan-300 font-bold">{language === "en" ? "4. Water Line Correction Percentage (Required ≤ ±0.05%):" : "4. Persentase Koreksi Garis Air (Wajib ≤ ±0.05%):"}</p>
              <p className="text-slate-600 dark:text-slate-400">{language === "en" ? "Correction = ((AWL - AWL_design) / AWL) * 100%" : "Koreksi = ((AWL - AWL_rancangan) / AWL) * 100%"}</p>
              <p className="text-slate-600 dark:text-slate-400">{language === "en" ? "Correction" : "Koreksi"} = (({AWL.toFixed(2)} - {activeTargetAWL.toFixed(2)}) / {AWL.toFixed(2)}) * 100% = <strong className={isCorrectionValid ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{correctionPercent.toFixed(3)}%</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER HYDROSTATIC SUMMARY TABLE (ALL WATERLINES WL 0 TO WL 6) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {language === "en" ? "Master Waterlines Hydrostatic Summary (WL 0 to WL 6)" : "Tabel Rangkuman Hidrostatis Seluruh Garis Air (WL 0 s.d. WL 6)"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "en"
                  ? "Compilation of waterplane area (AWL), LCF position, transverse/longitudinal inertia (IT & IL), and Cw from keel to design draft."
                  : "Kompilasi luas garis air (AWL), posisi LCF, momen inersia (IT & IL), dan koefisien Cw dari lunas kapal hingga sarat penuh."}
              </p>
            </div>
          </div>

          <button
            onClick={handleExportAllCSV}
            className="py-2 px-3.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            title="Unduh kompilasi seluruh data Waterline 0 s.d 6 dalam format CSV"
          >
            <Download size={14} />
            <span>Export Semua WL (CSV)</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Garis Air</th>
                <th className="py-2.5 px-3">Sarat (Z)</th>
                <th className="py-2.5 px-3">AWL Desain</th>
                <th className="py-2.5 px-3">AWL Aktual</th>
                <th className="py-2.5 px-3">LCF (m)</th>
                <th className="py-2.5 px-3">Cw</th>
                <th className="py-2.5 px-3">Inersia IT (m⁴)</th>
                <th className="py-2.5 px-3">Inersia IL (m⁴)</th>
                <th className="py-2.5 px-3">Koreksi (%)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {masterSummary.map((s) => {
                const isCurrentActive = s.id === activeWlId;
                return (
                  <tr
                    key={`summary-${s.id}`}
                    className={`transition-colors ${
                      isCurrentActive
                        ? "bg-cyan-500/10 dark:bg-cyan-500/15 font-bold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <td className="py-2.5 px-3 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className={isCurrentActive ? "text-cyan-600 dark:text-cyan-300 font-extrabold" : "text-slate-800 dark:text-slate-200"}>
                        {s.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{s.draftZ.toFixed(2)} m</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{s.targetAwl.toFixed(2)} m²</td>
                    <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{s.awl.toFixed(2)} m²</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">{s.lcf.toFixed(3)} m</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{s.cw.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.it.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.il.toFixed(2)}</td>
                    <td className={`py-2.5 px-3 font-bold ${s.isValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {s.correction > 0 ? `+${s.correction.toFixed(3)}%` : `${s.correction.toFixed(3)}%`}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.isValid
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-500/40"
                      }`}>
                        {s.isValid ? "MEMENUHI" : "DEVIASI"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isCurrentActive ? (
                        <span className="text-[11px] text-cyan-500 font-bold px-2.5 py-1 bg-cyan-500/10 rounded-lg">
                          Aktif
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveWlId(s.id);
                            window.scrollTo({ top: 350, behavior: "smooth" });
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white dark:hover:bg-cyan-600 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-sm border border-slate-300 dark:border-slate-700"
                        >
                          Buka / Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEXT PAGE ACTION BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-600/15 via-blue-600/10 to-indigo-600/15 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sparkles size={17} className="text-cyan-500" />
            <span>{language === "en" ? "Next View: Single Waterline & Custom Station Table" : "Halaman Selanjutnya: Garis Air Tunggal & Tabel Kustom Gading"}</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "en"
              ? "Switch to a clean single-line view with interactive hover inspection and customizable frame station counts."
              : "Beralih ke tampilan garis tunggal minimalis dengan hover inspeksi (2) 0.5 B (m) dan pemilihan jumlah gading sesuai kebutuhan."}
          </p>
        </div>
        <button
          onClick={() => setViewMode("cleanCustom")}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-600/25 transition-all cursor-pointer shrink-0"
        >
          <span>{language === "en" ? "Open Custom Waterline Studio" : "Buka Studio Garis Air Kustom"}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </>
  )}

      {/* ========================================================= */}
      {/* MODE 2: SINGLE WATERLINE STUDIO & CUSTOM STATIONS TABLE  */}
      {/* ========================================================= */}
      {viewMode === "cleanCustom" && (
        <div className="space-y-6">
          {/* WATERLINE LEVEL SELECTOR NAVIGATOR TABS */}
          <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-3 select-none">
            {/* Top Bar: Title & Active Parameters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-3 shrink-0">
                <div className="p-2 rounded-xl bg-cyan-600/15 border border-cyan-500/30 text-cyan-400">
                  <Sliders size={17} />
                </div>
                <div className="flex items-center space-x-2.5">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider whitespace-nowrap">
                    {language === "en" ? "Waterline Navigator" : "Pilih Garis Air (Waterline)"}
                  </h4>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 whitespace-nowrap">
                    Aktif: {activeWlConfig.shortName}
                  </span>
                </div>
              </div>

              {/* Unified Telemetry Parameter Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-1.5 font-mono text-xs shadow-inner">
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Sarat</span>
                  <strong className="text-cyan-400 font-bold">Z = {activeDraftZ.toFixed(2)} m</strong>
                </div>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Target AWL:</span>
                  <strong className="text-cyan-400 font-bold">{activeTargetAWL.toFixed(2)} m&sup2;</strong>
                </div>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  <span className="text-slate-400">Target Cw:</span>
                  <strong className="text-amber-400 font-bold">{activeTargetCw.toFixed(3)}</strong>
                </div>
              </div>
            </div>

            {/* 7 Waterlines Grid / Segmented Control Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {WATERLINE_LEVELS.map((wl) => {
                const isActive = wl.id === activeWlId;
                const wlSummary = masterSummary.find((s) => s.id === wl.id);
                const isWlValid = wlSummary?.isValid ?? false;
                const wlDraftZ = wl.draftFraction * T;

                return (
                  <button
                    key={`page2-wl-${wl.id}`}
                    onClick={() => setActiveWlId(wl.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl font-mono transition-all cursor-pointer border relative group ${
                      isActive
                        ? "bg-gradient-to-b from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border-cyan-400 ring-2 ring-cyan-400/40 scale-[1.02]"
                        : "bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border-slate-700/70"
                    }`}
                    title={`${wl.name} - Sarat Z = ${wlDraftZ.toFixed(2)} m (${wl.badge})`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: wl.color }} />
                      <span className="text-xs font-bold">{wl.shortName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-900/90 text-slate-400"
                      }`}>
                        Z={wlDraftZ.toFixed(2)}m
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWlValid ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-rose-400 shadow-sm shadow-rose-400/50"}`}
                        title={isWlValid ? "Koreksi Memenuhi Syarat (≤ ±0.05%)" : "Deviasi Melebihi Toleransi"}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. SINGLE WATERLINE MINIMALIST CANVAS */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Compass size={18} className="text-cyan-500" />
                  <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    {language === "en"
                      ? `Single Waterline ${activeWlConfig.name} Curve (Interactive Hover)`
                      : `Tampak Garis Air Tunggal ${activeWlConfig.name} (Inspeksi Interaktif)`}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "en"
                    ? `Sarat Z = ${activeDraftZ.toFixed(2)}m. Hover cursor anywhere along the waterline to inspect exact (2) 0.5 B (m) value and position.`
                    : `Sarat Z = ${activeDraftZ.toFixed(2)} m. Arahkan kursor pada garis air untuk melihat nilai (2) 0.5 B (m) dan posisi longitudinal secara langsung.`}
                </p>
              </div>

              {/* Real-time Value Readout Pill (Permanent Gambar 1 Style) */}
              {(() => {
                const activeCleanDisplay = cleanHover || {
                  halfB: Number((BWL / 2).toFixed(3)),
                  x_m: Number((LBP / 2).toFixed(2)),
                  stationVal: 10.0,
                  svgX: getStationX(10.0),
                  svgY: getSvgY(BWL / 2)
                };

                return (
                  <div className="flex items-center space-x-3 bg-cyan-500/10 dark:bg-cyan-950/80 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                      (2) 0.5 B = <strong className="text-cyan-700 dark:text-cyan-200 text-sm">{activeCleanDisplay.halfB.toFixed(3)} m</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      Pos X: <strong>{activeCleanDisplay.x_m.toFixed(2)} m</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      St. {activeCleanDisplay.stationVal.toFixed(2)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* MINIMALIST SINGLE WATERLINE CANVAS (IDENTICAL NAVAL CURVE TO MODE 1) */}
            <div className={`w-full bg-slate-900/95 dark:bg-slate-950/95 rounded-2xl relative overflow-hidden border border-slate-200 dark:border-slate-800 p-3 shadow-2xl flex flex-col items-center justify-center select-none transition-all duration-300 ${isFullPlanView ? "h-72 sm:h-88 md:h-[420px]" : "h-56 sm:h-68 md:h-80"}`}>
              {/* Floating Control Buttons (Full Hull Mirror Toggle) */}
              <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 bg-slate-800/90 border border-slate-600/80 rounded-lg p-1 shadow-lg backdrop-blur-sm">
                <button
                  onClick={() => setIsFullPlanView(!isFullPlanView)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    isFullPlanView
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-cyan-300"
                  }`}
                  title="Tampilkan Simetri Penuh Kiri & Kanan (Port & Starboard)"
                >
                  <Maximize2 size={13} />
                  <span>{isFullPlanView ? (language === "en" ? "Full Hull" : "Simetri Penuh") : (language === "en" ? "Half-Breadth" : "0.5 B")}</span>
                </button>
              </div>

              <svg
                ref={cleanSvgRef}
                className="w-full h-full cursor-crosshair select-none"
                viewBox={isFullPlanView ? "-8 -2 216 114" : "-8 -2 216 76"}
                preserveAspectRatio="xMidYMid meet"
                onPointerMove={handleCleanPointerMove}
                onPointerLeave={handleCleanPointerLeave}
              >
                <defs>
                  <linearGradient id="cleanWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Y-AXIS TICKS (0 to 8m) */}
                <text 
                  x="-6" 
                  y="28" 
                  fill="#94a3b8" 
                  fontSize="2.8" 
                  fontFamily="monospace" 
                  transform="rotate(-90 -6 28)" 
                  textAnchor="middle"
                >
                  Half-Breadth (m)
                </text>
                {[0, 2, 4, 6, 8].map((tick) => {
                  const yPos = 48.0 - (tick / 8.0) * 38.0;
                  return (
                    <g key={`clean-ytick-${tick}`}>
                      <text x="-1.5" y={yPos + 0.9} fill="#94a3b8" fontSize="2.4" fontFamily="monospace" textAnchor="end">
                        {tick}
                      </text>
                      <line x1="2" y1={yPos} x2="204" y2={yPos} stroke="#1e293b" strokeWidth="0.18" strokeDasharray="1,1" />
                    </g>
                  );
                })}

                {/* Centerline / Baseline CL & Key Station Indicators */}
                <line x1="4" y1="48" x2="206" y2="48" stroke="#475569" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
                <text x="2" y="51.5" fill="#64748b" fontSize="2.2" fontFamily="monospace" textAnchor="end">
                  CL
                </text>
                <text x="10.0" y="51.5" fill="#fde68a" fontSize="2.3" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  B
                </text>
                <text x="26.0" y="51.5" fill="#fde68a" fontSize="2.3" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  0 (AP)
                </text>
                <text x="106.0" y="51.5" fill="#06b6d4" fontSize="2.4" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  16 (MID)
                </text>
                <text x="186.0" y="51.5" fill="#fde68a" fontSize="2.3" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  31 (FP)
                </text>

                {/* Single Waterline Area Fill - Exactly Identical to Mode 1 */}
                <path
                  d={`M ${exactCurvePts[0].x},48 L ${exactCurvePts[0].x},${exactCurvePts[0].y} ${exactSmoothPath} L ${exactCurvePts[exactCurvePts.length - 1].x},48 Z`}
                  fill="url(#cleanWaterGrad)"
                />

                {/* The Single Pure Waterline DWL Fair Stroke */}
                <path
                  d={`M ${exactCurvePts[0].x},${exactCurvePts[0].y} ${exactSmoothPath}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.55"
                  strokeLinecap="round"
                />

                {/* Starboard (Bottom Half) Mirrored Full Hull */}
                {isFullPlanView && (
                  <g opacity="0.95">
                    {(() => {
                      const mirroredExactPts = exactCurvePts.map((p) => ({
                        x: p.x,
                        y: 48 + (48 - p.y)
                      }));
                      const mirroredExactSmoothPath = getSmoothPathD(mirroredExactPts);
                      return (
                        <g>
                          <path
                            d={`M ${exactCurvePts[0].x},48 L ${exactCurvePts[0].x},${48 + (48 - exactCurvePts[0].y)} ${mirroredExactSmoothPath} L ${exactCurvePts[exactCurvePts.length - 1].x},48 Z`}
                            fill="rgba(6, 182, 212, 0.08)"
                          />
                          <path
                            d={`M ${exactCurvePts[0].x},${48 + (48 - exactCurvePts[0].y)} ${mirroredExactSmoothPath}`}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="0.55"
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Custom Station Vertical Ordinate Lines (From Baseline 48 to Curve) */}
                {customStationRows.map((stRow) => {
                  const svgX = getStationX(stRow.stationNumber);
                  const svgY = getSvgY(stRow.halfBreadth);
                  const isHovered = cleanHover && Math.abs(cleanHover.svgX - svgX) < 4;
                  const isMidship = Math.abs(stRow.stationNumber - 10.0) < 0.01;

                  return (
                    <g key={`clean-ord-${stRow.index}`}>
                      {/* Portside Vertical Ordinate Line from Baseline 48 to Curve */}
                      <line
                        x1={svgX}
                        y1="48"
                        x2={svgX}
                        y2={svgY}
                        stroke={isHovered ? "#facc15" : isMidship ? "#06b6d4" : "#38bdf8"}
                        strokeWidth={isHovered ? "0.6" : isMidship ? "0.5" : "0.36"}
                        strokeLinecap="round"
                        opacity={isHovered ? 1.0 : 0.85}
                        className="transition-all"
                      >
                        <title>{`${stRow.label}: 0.5 B = ${stRow.halfBreadth.toFixed(3)} m (X = ${stRow.xPos_m.toFixed(2)} m)`}</title>
                      </line>

                      {/* Starboard Mirrored Vertical Ordinate Line */}
                      {isFullPlanView && (
                        <line
                          x1={svgX}
                          y1="48"
                          x2={svgX}
                          y2={48 + (48 - svgY)}
                          stroke={isHovered ? "#facc15" : isMidship ? "#06b6d4" : "#38bdf8"}
                          strokeWidth={isHovered ? "0.6" : isMidship ? "0.5" : "0.36"}
                          strokeLinecap="round"
                          opacity={isHovered ? 0.95 : 0.75}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Dynamic Cursor Hover Crosshair Tracker & Floating Tooltip */}
                {cleanHover && (
                  <g>
                    {/* Vertical Tracker Line */}
                    <line
                      x1={cleanHover.svgX}
                      y1="6"
                      x2={cleanHover.svgX}
                      y2="48"
                      stroke="#06b6d4"
                      strokeWidth="0.3"
                      strokeDasharray="1.5,1"
                      opacity="0.9"
                    />

                    {/* Outer Glowing Accent Ring on Waterline Curve */}
                    <circle
                      cx={cleanHover.svgX}
                      cy={cleanHover.svgY}
                      r="2.0"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.25"
                      strokeDasharray="0.8,0.6"
                    />

                    {/* Crisp Center Hover Point */}
                    <circle
                      cx={cleanHover.svgX}
                      cy={cleanHover.svgY}
                      r="0.85"
                      fill="#facc15"
                      stroke="#ffffff"
                      strokeWidth="0.2"
                    />

                    {/* Compact Non-Obstructive Floating Leader Badge for (2) 0.5 B */}
                    {(() => {
                      const boxW = 24;
                      const boxH = 5.2;
                      const badgeX = Math.max(2, Math.min(214 - boxW, cleanHover.svgX - boxW / 2));
                      const isAbove = cleanHover.svgY > 16;
                      const badgeY = isAbove ? cleanHover.svgY - 7.5 : cleanHover.svgY + 3.5;

                      return (
                        <g pointerEvents="none">
                          {/* Fine leader connector line */}
                          <line
                            x1={cleanHover.svgX}
                            y1={isAbove ? cleanHover.svgY - 2.0 : cleanHover.svgY + 2.0}
                            x2={cleanHover.svgX}
                            y2={isAbove ? badgeY + boxH : badgeY}
                            stroke="#38bdf8"
                            strokeWidth="0.2"
                            strokeDasharray="0.5,0.5"
                          />

                          {/* Slim Badge Box */}
                          <rect
                            x={badgeX}
                            y={badgeY}
                            width={boxW}
                            height={boxH}
                            rx="1.0"
                            fill="#020617"
                            fillOpacity="0.92"
                            stroke="#06b6d4"
                            strokeWidth="0.25"
                          />

                          {/* Primary (2) 0.5 B Value */}
                          <text
                            x={badgeX + boxW / 2}
                            y={badgeY + 3.6}
                            fill="#22d3ee"
                            fontSize="2.3"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            (2) 0.5 B: {cleanHover.halfB.toFixed(3)}m
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* 2. CUSTOM STATIONS CONFIGURATION & CLEAN TABLE */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Sliders size={18} className="text-cyan-500" />
                  <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    {language === "en" ? "Custom Station Ordinates Table" : "Tabel Khusus Ordinat (2) 0.5 B (m) Gading Pilihan"}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "en"
                    ? "Input your desired number of frame stations. Values in column (2) 0.5 B (m) automatically compute and can be edited."
                    : "Tentukan jumlah pembagian gading yang diinginkan. Nilai kolom (2) 0.5 B (m) akan terhitung otomatis sesuai kurva dan dapat diedit."}
                </p>
              </div>

              {/* Station Count Selector & Inputs */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === "en" ? "Stations Count:" : "Jumlah Gading:"}
                  </span>
                  <input
                    type="number"
                    min="2"
                    max="101"
                    value={customStationCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setCustomStationCount(val);
                    }}
                    className="w-16 bg-white dark:bg-slate-900 border border-cyan-500 rounded-lg px-2 py-1 text-center font-bold text-sm text-cyan-600 dark:text-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setCustomStationCount(11)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      customStationCount === 11 ? "bg-cyan-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    11 St
                  </button>
                  <button
                    onClick={() => setCustomStationCount(21)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      customStationCount === 21 ? "bg-cyan-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    21 St (Std)
                  </button>
                  <button
                    onClick={() => setCustomStationCount(36)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      customStationCount === 36 ? "bg-cyan-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    36 St
                  </button>
                  <button
                    onClick={() => setCustomStationCount(41)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      customStationCount === 41 ? "bg-cyan-600 text-white font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    41 St
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Bar for Table */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <span>LBP: <strong className="text-slate-900 dark:text-white">{LBP.toFixed(2)} m</strong></span>
                <span>•</span>
                <span>BWL: <strong className="text-slate-900 dark:text-white">{BWL.toFixed(2)} m</strong></span>
                <span>•</span>
                <span>{language === "en" ? "Frame Spacing (dx):" : "Jarak Antar Gading (dx):"} <strong className="text-cyan-600 dark:text-cyan-400">{(LBP / (Math.max(1, customStationCount - 1))).toFixed(4)} m</strong></span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyCustomTable}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
                  title="Salin seluruh isi tabel ke clipboard"
                >
                  {copiedCustomTable ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedCustomTable ? (language === "en" ? "Copied!" : "Tersalin!") : (language === "en" ? "Copy Table" : "Salin Tabel")}</span>
                </button>
                <button
                  onClick={handleExportCustomCSV}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                {Object.keys(customOverrides).length > 0 && (
                  <button
                    onClick={handleResetCustomOverrides}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1.5 border border-amber-500/40 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>{language === "en" ? "Reset Edits" : "Reset Edit"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* ONLY 3-COLUMN TABLE (GADING, POSISI X, 0.5 B) */}
            <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <table className="w-full text-left text-xs font-mono border-collapse table-fixed min-w-[500px]">
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <th className="py-3 px-4 font-bold text-center border-r border-slate-200 dark:border-slate-800/60 w-[30%]">
                      (1) NO. GADING
                    </th>
                    <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/60 text-center w-[35%]">
                      POSISI X (m)
                    </th>
                    <th className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-300 text-right w-[35%]">
                      (2) 0.5 B (m)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 bg-white dark:bg-slate-950/40">
                  {customStationRows.map((row) => {
                    const isMid = row.label.includes("MID");
                    const isAp = row.label.includes("AP");
                    const isFp = row.label.includes("FP");
                    const isHighlighted = isMid || isAp || isFp;
                    const isModified = customOverrides[row.index] !== undefined;

                    return (
                      <tr
                        key={`cust-row-${row.index}`}
                        className={`hover:bg-cyan-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                          isHighlighted ? "bg-slate-50 dark:bg-slate-900/60 font-semibold" : ""
                        }`}
                      >
                        {/* (1) Gading */}
                        <td className="py-2.5 px-4 text-center border-r border-slate-200 dark:border-slate-800/60">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isMid
                                ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30"
                                : isAp || isFp
                                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {row.label}
                          </span>
                        </td>

                        {/* Posisi X (m) */}
                        <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60 font-mono">
                          {row.xPos_m.toFixed(3)} m
                        </td>

                        {/* (2) 0.5 B (m) - Editable */}
                        <td className="py-1 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {isModified && (
                              <span className="text-[10px] text-amber-500 font-bold" title="Telah diedit manual">
                                •
                              </span>
                            )}
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max={BWL / 2}
                              value={row.halfBreadth}
                              onChange={(e) => handleCustomCellChange(row.index, e.target.value)}
                              className="w-32 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-lg py-1 px-2.5 text-cyan-700 dark:text-cyan-300 font-bold font-mono text-xs focus:border-cyan-500 focus:outline-none text-right transition-all"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM WATERLINE STUDIO MODAL (PRESETS, CUSTOM Z LEVELS, ADD, REMOVE)     */}
      {/* ========================================================================= */}
      {isWlManagerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWlManagerOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* STICKY HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Kelola & Kustomisasi Garis Air (Waterlines)</h3>
                  <p className="text-xs text-slate-400">Tentukan jumlah garis air, pilih preset standar, atau tambahkan garis air khusus.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWlManagerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-all cursor-pointer flex items-center space-x-1"
                title="Tutup Modal (Esc)"
              >
                <X size={18} />
                <span className="text-xs font-mono font-bold hidden sm:inline">Tutup</span>
              </button>
            </div>

            {/* SCROLLABLE CONTENT BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pr-3 no-scrollbar">
              {/* 1. AUTO-GENERATE BY COUNT (BERAPA WL OTOMATIS DIBUATKAN) */}
              <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Generator Otomatis Jumlah Garis Air
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 font-semibold bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
                    Target: {desiredWlCount} Level WL
                  </span>
                </div>

                {/* Stepper + Slider + Action Button */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Stepper Input */}
                  <div className="sm:col-span-5 flex items-center space-x-2 bg-slate-950/80 border border-slate-700/80 rounded-xl p-1.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setDesiredWlCount((prev) => Math.max(3, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    >
                      -
                    </button>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <input
                        type="number"
                        min={3}
                        max={25}
                        value={desiredWlCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setDesiredWlCount(Math.max(3, Math.min(25, v)));
                        }}
                        className="w-16 text-center font-mono font-black text-base text-cyan-400 bg-transparent focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 -mt-1 font-mono uppercase">Garis Air</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDesiredWlCount((prev) => Math.min(25, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Range Slider */}
                  <div className="sm:col-span-4 flex flex-col justify-center px-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>3 WL</span>
                      <span className="text-cyan-400 font-bold">{desiredWlCount} WL</span>
                      <span>21 WL</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={21}
                      step={1}
                      value={desiredWlCount}
                      onChange={(e) => setDesiredWlCount(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(desiredWlCount)}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-md shadow-cyan-600/30 flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <Sparkles size={14} />
                      <span>Buat {desiredWlCount} WL</span>
                    </button>
                  </div>
                </div>

                {/* Informative Explanation Helper Box */}
                <div className="text-[11px] text-slate-400 font-mono bg-slate-950/50 p-2 rounded-xl border border-slate-800/80 flex items-start space-x-2">
                  <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    Membagi sarat penuh <strong>T = {T.toFixed(2)} m</strong> menjadi <strong>{desiredWlCount} level garis air</strong> berjarak seragam <strong>&Delta;Z = {(T / Math.max(1, desiredWlCount - 1)).toFixed(3)} m</strong> (dari WL 0 Lunas s.d. WL {desiredWlCount - 1} DWL). Kurva lambung dan luas AWL otomatis dihitung presisi.
                  </div>
                </div>

                {/* Quick Preset Shortcut Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Pilihan Cepat:</span>
                  {[
                    { count: 5, label: "5 WL" },
                    { count: 7, label: "7 WL (BKI Standar)" },
                    { count: 9, label: "9 WL" },
                    { count: 11, label: "11 WL (Detail)" },
                    { count: 13, label: "13 WL" },
                    { count: 17, label: "17 WL" },
                    { count: 21, label: "21 WL (Ultra)" },
                  ].map((chip) => (
                    <button
                      key={chip.count}
                      type="button"
                      onClick={() => {
                        setDesiredWlCount(chip.count);
                        handleApplyPreset(chip.count);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                        waterlineLevels.length === chip.count
                          ? "bg-cyan-600/30 border-cyan-400 text-cyan-300 font-bold shadow-sm ring-1 ring-cyan-400/40"
                          : "bg-slate-800/70 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Add Custom Waterline */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Plus size={14} className="text-cyan-400" />
                  <span>Tambah Garis Air Baru:</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={T}
                      placeholder={`Tinggi Sarat Z (0 - ${T.toFixed(2)} m)`}
                      value={newWlZInput}
                      onChange={(e) => setNewWlZInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      placeholder="Nama (opsional, misal: WL 0.5)"
                      value={newWlNameInput}
                      onChange={(e) => setNewWlNameInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const val = parseFloat(newWlZInput);
                      if (!isNaN(val) && val >= 0) {
                        handleAddCustomWaterline(val, newWlNameInput || undefined);
                      }
                    }}
                    disabled={!newWlZInput || isNaN(parseFloat(newWlZInput))}
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shadow"
                  >
                    <Plus size={13} />
                    <span>Tambah WL</span>
                  </button>
                </div>
              </div>

              {/* 3. List of Current Waterlines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Daftar Garis Air Aktif ({waterlineLevels.length} Level):
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Sarat Penuh T = {T.toFixed(2)} m</span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 no-scrollbar border border-slate-800 rounded-xl p-2 bg-slate-950/40">
                  {waterlineLevels.map((wl) => {
                    const zMeters = wl.draftFraction * T;
                    return (
                      <div
                        key={wl.id}
                        className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wl.color }} />
                          <span className="font-bold text-white">{wl.name}</span>
                          <span className="text-slate-400">({wl.badge})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-cyan-400 font-semibold">Z = {zMeters.toFixed(2)} m</span>
                          <span className="text-slate-400 text-[11px]">{(wl.draftFraction * 100).toFixed(1)}% T</span>
                          <button
                            onClick={() => handleDeleteWaterline(wl.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                            title="Hapus Garis Air Ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STICKY FOOTER */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
              <span className="text-xs text-slate-400 font-mono">
                Total: <strong className="text-cyan-400">{waterlineLevels.length} Level Garis Air</strong> (Sarat T = {T.toFixed(2)}m)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWlManagerOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold font-mono transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => setIsWlManagerOpen(false)}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-md shadow-cyan-600/30 flex items-center space-x-1.5 active:scale-95"
                >
                  <Check size={14} />
                  <span>Selesai &amp; Terapkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
