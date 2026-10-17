"use client";

import { engineeringColor } from "./EngineeringPalette";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
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
  Minus,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  X,
  Layers,
  Table as TableIcon,
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  Settings2,
  CheckSquare,
  Square,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { WaterlineConfig, DEFAULT_WATERLINE_LEVELS, DEFAULT_STATIONS_CONFIG, DEFAULT_HULL_PROFILE, generateWaterlinePresets, StationVisibility, DEFAULT_ACTIVE_STATION, isStationVisible } from "./WaterPlaneCalculationSheet";
import { FairingEngine, smoothPath } from "@/utils/fairingEngine";

/**
 * Helper: Smooth curve (Monotone Cubic Interpolation along X)
 * Used for horizontal waterlines.
 */
const getSmoothPathD = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) return "";

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

  let d = "";
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

/**
 * Helper: Smooth transverse curve (Monotone Cubic Interpolation along vertical Y/Z axis)
 * Specifically designed for ship transverse station frames (Body Plan) where points
 * progress vertically from Baseline (Z=0) up to Deck (Z=H).
 * Eliminates loops, kinks, and overshoots when lines are near-vertical.
 */
const getSmoothTransversePathD = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return ` L ${points[1].x.toFixed(3)},${points[1].y.toFixed(3)}`;
  }

  const n = points.length;
  const dy = new Float64Array(n - 1);
  const delta = new Float64Array(n - 1);
  const m = new Float64Array(n);

  for (let i = 0; i < n - 1; i++) {
    dy[i] = points[i + 1].y - points[i].y;
    delta[i] = Math.abs(dy[i]) < 1e-6 ? 0 : (points[i + 1].x - points[i].x) / dy[i];
  }

  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (delta[i - 1] + delta[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(delta[i]) < 1e-6) {
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

  let d = "";
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h = dy[i] / 3;

    const cp1y = p0.y + h;
    const cp1x = p0.x + m[i] * h;
    const cp2y = p1.y - h;
    const cp2x = p1.x - m[i + 1] * h;

    d += ` C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
  }

  return d;
};

/**
 * Helper to format clean station label matching Waterline Plan
 */
export const getStationDisplayLabel = (st: number): string => {
  if (st === -2.0) return "B";
  if (st === -1.0) return "A";
  if (st === 0.0) return "0 (AP)";
  if (st === 10.0) return "10 (MID)";
  if (st === 20.0) return "20 (FP)";
  if (st === 20.5) return "FP-A";
  if (st === 21.0) return "FP-B";
  return `${st}`;
};

/**
 * Standard Presets for Number of Stations / Frames (Gading) in Body Plan (Tanpa selisih 0.5)
 */
export const STATION_PRESETS: Record<"11" | "21", number[]> = {
  // 11 Main Frames (Interval 2: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20)
  "11": [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  // 21 Standard Frames (Standard 20 sections from AP to FP, Step seragam 1.0)
  "21": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
};

/**
 * Generates custom station distribution of specified target count (Hanya gading bulat, tanpa selisih 0.5)
 */
export const generateCustomStationDistribution = (targetCount: number): number[] => {
  const allSts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const count = Math.max(3, Math.min(allSts.length, Math.round(targetCount)));
  if (count >= allSts.length) return allSts;
  if (count === 11) return STATION_PRESETS["11"];
  if (count === 21) return STATION_PRESETS["21"];

  // Priority anchors: AP (0.0), Midship (10.0), FP (20.0)
  const chosen = new Set<number>([0.0, 10.0, 20.0]);
  if (count <= 3) {
    return allSts.filter((s) => chosen.has(s)).slice(0, count);
  }

  const candidates = allSts.filter((s) => !chosen.has(s));
  const needed = count - chosen.size;
  const step = candidates.length / needed;
  for (let i = 0; i < needed; i++) {
    const idx = Math.min(candidates.length - 1, Math.floor(i * step));
    chosen.add(candidates[idx]);
  }

  if (chosen.size < count) {
    for (const s of candidates) {
      if (chosen.size >= count) break;
      chosen.add(s);
    }
  }

  return allSts.filter((s) => chosen.has(s));
};

interface MidshipBilgeCalculationProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  vesselType?: string;
  waterlineLevels?: WaterlineConfig[];
  onUpdateWaterlineLevels?: (levels: WaterlineConfig[]) => void;
  waterlinesData?: Record<string, Record<number, number>>;
  onUpdateWaterlinesData?: (data: Record<string, Record<number, number>>) => void;
  sideProfileData?: any;
  activeWlId?: string;
  onSelectWlId?: (id: string) => void;
  stationDensity?: "all" | "standard";
  onUpdateStationDensity?: (density: "all" | "standard") => void;
  visualOnly?: boolean;
  tablesOnly?: boolean;
  compact?: boolean;
  onOpenDualFullscreen?: () => void;
  /** Shared active station (gading) synchronized with the Waterline editor. */
  activeStation?: number;
  onSelectStation?: (station: number) => void;
  /** Shared station visibility filter synchronized with the Waterline editor. */
  visibleStations?: StationVisibility;
  onUpdateVisibleStations?: (visibility: StationVisibility) => void;
}

export const MidshipBilgeCalculationSheet: React.FC<MidshipBilgeCalculationProps> = ({
  lbp_m = 81.19,
  breadth_m = 15.0,
  draft_m = 5.5,
  depth_m = 7.0,
  cb = 0.75,
  cm = 0.99,
  vesselType = "GENERAL_CARGO",
  waterlineLevels,
  onUpdateWaterlineLevels,
  waterlinesData,
  onUpdateWaterlinesData,
  sideProfileData,
  activeWlId = "WL6",
  onSelectWlId,
  stationDensity: propStationDensity,
  onUpdateStationDensity,
  visualOnly = false,
  tablesOnly = false,
  compact = false,
  onOpenDualFullscreen,
  activeStation: propActiveStation,
  onSelectStation,
  visibleStations: propVisibleStations,
  onUpdateVisibleStations
}) => {
  const { language } = useLanguage();

  // Shared station selection & visibility (controlled by Stage 3 page, with local fallback).
  // Phase 1: state wiring only — the Select Station UI & per-station editing come in later phases.
  const [localActiveStation, setLocalActiveStation] = useState<number>(DEFAULT_ACTIVE_STATION);
  const [localVisibleStations, setLocalVisibleStations] = useState<StationVisibility>("all");
  const activeStation = propActiveStation ?? localActiveStation;
  const visibleStations = propVisibleStations ?? localVisibleStations;
  const handleSelectStation = useCallback((station: number) => {
    setLocalActiveStation(station);
    if (onSelectStation) onSelectStation(station);
  }, [onSelectStation]);
  const handleUpdateVisibleStations = useCallback((visibility: StationVisibility) => {
    setLocalVisibleStations(visibility);
    if (onUpdateVisibleStations) onUpdateVisibleStations(visibility);
  }, [onUpdateVisibleStations]);
  

  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(0.5, draft_m);
  const H = Math.max(1, depth_m);
  const Cb = cb || 0.75;
  const Cm = cm || 0.99;
  const halfB = Number((B / 2).toFixed(3));

  // Dynamically receive and synchronize all waterlines configured from Waterline Plan
  const effectiveWaterlineLevels = useMemo(() => {
    return waterlineLevels && waterlineLevels.length > 0 ? waterlineLevels : DEFAULT_WATERLINE_LEVELS;
  }, [waterlineLevels]);

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

  // Unified FairingEngine for mathematically consistent hydrodynamic lines
  const engine = useMemo(() => {
    const targetVol = LBP * B * T * Cb;
    const stList = DEFAULT_STATIONS_CONFIG.map((cfg) => cfg.station);
    const eng = new FairingEngine(LBP, B, T, H, targetVol, Cm, effectiveWaterlineLevels, stList, sideProfileData);
    eng.generateOffsets(waterlinesData);
    return eng;
  }, [LBP, B, T, H, Cb, Cm, effectiveWaterlineLevels, waterlinesData, sideProfileData]);

  // Helper to generate discrete points on the circular bilge arc (0 to R) plus upper section steps
  const createDefaultDraftSteps = (rVal: number, draftT: number, depthH: number): number[] => {
    const safeR = Math.max(0.1, Math.min(rVal || 2.0, draftT));
    const bilgeSteps = Array.from({ length: 16 }).map((_, i) => {
      return Number(((i / 15) * safeR).toFixed(3));
    });

    const maxZ = Math.max(draftT, depthH, safeR + 0.5);
    const upperSteps: number[] = [];
    let currentZ = Math.ceil((safeR + 0.2) * 2) / 2;
    while (currentZ <= maxZ + 0.01) {
      upperSteps.push(Number(currentZ.toFixed(3)));
      currentZ += 0.5;
    }
    if (draftT > safeR && !upperSteps.some((z) => Math.abs(z - draftT) < 0.01)) {
      upperSteps.push(Number(draftT.toFixed(3)));
    }

    return Array.from(new Set([...bilgeSteps, ...upperSteps])).sort((a, b) => a - b);
  };

  // Dynamic state for draft steps
  const [draftSteps, setDraftSteps] = useState<number[]>(() =>
    createDefaultDraftSteps(calculatedRadius, T, H)
  );

  // View Mode: 'bodyPlan' (Default: Pure NS Savannah Style Body Plan), 'xyzTable' (3D XYZ Table of Offsets), 'midshipDetail' (Focus Gading 10 Table & Verification)
  const [studioMode, setStudioMode] = useState<"bodyPlan" | "xyzTable" | "midshipDetail">("bodyPlan");

  // 3D XYZ Table states
  const [xyzViewFormat, setXyzViewFormat] = useState<"matrix" | "pointCloud">("matrix");
  const [xyzFilterZone, setXyzFilterZone] = useState<"all" | "afterbody" | "forebody" | "pmb">("all");
  const [xyzFilterStation, setXyzFilterStation] = useState<string>("all");
  const [xyzSearchTerm, setXyzSearchTerm] = useState<string>("");
  const [showXyzTableSection, setShowXyzTableSection] = useState<boolean>(true);

  // Handle / Node Display Mode: 'active' (Only active waterline), 'all' (Show draggable nodes on all waterlines), or 'none' (Clean curves only)
  const [handlesDisplayMode, setHandlesDisplayMode] = useState<"all" | "active" | "none">("none");

  // PMB Lock Toggle: when true, modifying Station 10 also propagates to Stations 6-15 (PMB)
  const [lockPmb, setLockPmb] = useState<boolean>(true);

  // Station Configuration & Presets: '11' | '21' | 'custom' (Tanpa gading selisih 0.5)
  const [stationPreset, setStationPreset] = useState<"11" | "21" | "custom">("21");

  const [selectedStationList, setSelectedStationList] = useState<number[]>(() => STATION_PRESETS["21"]);

  // Modal state for Custom Station Count / Selection
  const [isStationCustomModalOpen, setIsStationCustomModalOpen] = useState<boolean>(false);
  const [customStationCountInput, setCustomStationCountInput] = useState<number>(21);
  const [tempModalSelectedStations, setTempModalSelectedStations] = useState<number[]>(() => STATION_PRESETS["21"]);

  const handleSelectStationPreset = useCallback((presetId: "11" | "21") => {
    setStationPreset(presetId);
    const list = STATION_PRESETS[presetId];
    setSelectedStationList(list);
    if (onUpdateStationDensity) {
      onUpdateStationDensity("standard");
    }
    // If active station is not in the new list, switch to Midship (10) or first available
    if (!list.some((s) => Math.abs(s - activeStation) < 1e-4)) {
      handleSelectStation(list.includes(10) ? 10 : list[0]);
    }
  }, [activeStation, handleSelectStation, onUpdateStationDensity]);

  const openCustomStationModal = () => {
    setTempModalSelectedStations([...selectedStationList]);
    setCustomStationCountInput(selectedStationList.length);
    setIsStationCustomModalOpen(true);
  };

  const handleApplyCustomStationCount = (count: number) => {
    const distributed = generateCustomStationDistribution(count);
    setTempModalSelectedStations(distributed);
    setCustomStationCountInput(distributed.length);
  };

  const handleToggleModalStation = (st: number) => {
    setTempModalSelectedStations((prev) => {
      const exists = prev.some((s) => Math.abs(s - st) < 1e-4);
      if (exists) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter((s) => Math.abs(s - st) >= 1e-4);
      } else {
        return [...prev, st].sort((a, b) => a - b);
      }
    });
  };

  const handleSaveCustomStationsModal = () => {
    if (tempModalSelectedStations.length === 0) return;
    const sorted = [...tempModalSelectedStations].filter((s) => Number.isInteger(s)).sort((a, b) => a - b);
    setSelectedStationList(sorted);

    // Identify if matches any preset exactly
    const match11 = sorted.length === 11 && sorted.every((s, i) => Math.abs(s - STATION_PRESETS["11"][i]) < 1e-4);
    const match21 = sorted.length === 21 && sorted.every((s, i) => Math.abs(s - STATION_PRESETS["21"][i]) < 1e-4);

    if (match21) setStationPreset("21");
    else if (match11) setStationPreset("11");
    else setStationPreset("custom");

    if (onUpdateStationDensity) {
      onUpdateStationDensity("standard");
    }

    if (!sorted.some((s) => Math.abs(s - activeStation) < 1e-4)) {
      handleSelectStation(sorted.includes(10) ? 10 : sorted[0]);
    }

    setIsStationCustomModalOpen(false);
  };

  // Custom Waterline Count state
  const [desiredWlCount, setDesiredWlCount] = useState<number>(() => effectiveWaterlineLevels.length || 7);
  useEffect(() => {
    setDesiredWlCount(effectiveWaterlineLevels.length);
  }, [effectiveWaterlineLevels.length]);

  // Function to compute ordinate on Station 10 at water level z along circular bilge arc
  const getTheoreticalOrdinateAtZ = (z: number, rVal: number): number => {
    if (z <= 0) {
      return Number(flatOfBottom.toFixed(3));
    }
    if (z < rVal) {
      const diff = rVal - z;
      const yArc = halfB - rVal + Math.sqrt(Math.max(0, Math.pow(rVal, 2) - Math.pow(diff, 2)));
      return Number(Math.min(halfB, yArc).toFixed(3));
    }
    return Number(halfB.toFixed(3));
  };

  // Helper to compute flat-of-bottom / baseline half-breadth for any station
  const getStationBaseHalfB = (st: number): number => {
    if (st >= 6.0 && st <= 15.0) {
      return flatOfBottom;
    }
    return 0.0;
  };

  // Helper to compute realistic 3D hull half-breadth for any station at vertical elevation z
  const computeStationTaperHalfB = (st: number, z: number): number => {
    const baseY = getStationBaseHalfB(st);
    const topRatio = DEFAULT_HULL_PROFILE[st] ?? (st >= 6 && st <= 15 ? 1.0 : 0.5);
    const topDWL = Number((halfB * topRatio).toFixed(3));

    if (z <= 0) return baseY;
    if (z >= T) return topDWL;

    if (st >= 6.0 && st <= 15.0) {
      // Parallel Middle Body: exact circular bilge arc below R, flat vertical side above R
      return getTheoreticalOrdinateAtZ(z, calculatedRadius);
    }

    const fz = Math.min(1.0, Math.max(0.0, z / T));
    
    // Smooth, monotonic vertical flare exponent (authentic U/V ship frame curvature)
    let exponent = 1.0;
    if (st > 15.0) {
      exponent = 1.0 + 0.18 * (st - 15.0);
    } else if (st < 6.0) {
      exponent = 1.0 + 0.12 * (6.0 - Math.max(0, st));
    }

    const yVal = baseY + (topDWL - baseY) * Math.pow(fz, exponent);
    return Number(Math.max(baseY, Math.min(topDWL, yVal)).toFixed(3));
  };

  // Waterline Presets Handler
  const handleApplyWaterlinePreset = (count: number) => {
    const validCount = Math.max(3, Math.min(25, Math.round(count)));
    const newLevels = generateWaterlinePresets(validCount, T, B, Cm);
    if (onUpdateWaterlineLevels) {
      onUpdateWaterlineLevels(newLevels);
    }
    if (newLevels.length > 0 && onSelectWlId) {
      onSelectWlId(newLevels[0].id);
    }
    if (onUpdateWaterlinesData) {
      const updated: Record<string, Record<number, number>> = {};
      newLevels.forEach((wl) => {
        const z = wl.draftFraction * T;
        const wlOrds: Record<number, number> = {};
        DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
          const st = cfg.station;
          wlOrds[st] = computeStationTaperHalfB(st, z);
        });
        updated[wl.id] = wlOrds;
      });
      onUpdateWaterlinesData(updated);
    }
  };

  // Interaction states
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingDraft, setDraggingDraft] = useState<number | null>(null);
  const [draggingWlId, setDraggingWlId] = useState<string | null>(null);
  const [draggingStation, setDraggingStation] = useState<number | null>(null);
  const [hoverDraft, setHoverDraft] = useState<number | null>(null);
  const [hoverWlId, setHoverWlId] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);
  // Keep the default drawing close to a traditional lines plan. Construction
  // layers remain available from the toolbar when detailed inspection is needed.
  const [showButtocks, setShowButtocks] = useState<boolean>(false);
  const [showDiagonals, setShowDiagonals] = useState<boolean>(false);
  const [showStationLabels, setShowStationLabels] = useState<boolean>(true);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isFullHullView, setIsFullHullView] = useState<boolean>(true);
  const [isFullscreenPlot, setIsFullscreenPlot] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Table & Section visibility toggle states
  const [showParticulars, setShowParticulars] = useState<boolean>(true);
  const [showVisualPlot, setShowVisualPlot] = useState<boolean>(true);
  const [showDraftIntegrationTable, setShowDraftIntegrationTable] = useState<boolean>(true);
  const [showAreaResults, setShowAreaResults] = useState<boolean>(true);
  const [showWlAlignmentTable, setShowWlAlignmentTable] = useState<boolean>(true);
  const [showFormulasBox, setShowFormulasBox] = useState<boolean>(true);

  const bodyPlanViewBox = useMemo(() => {
    const width = 200 / zoomLevel;
    const baseHeight = 158;
    const height = baseHeight / zoomLevel;
    const x = (200 - width) / 2;
    const y = 6 + (baseHeight - height) / 2;
    return `${x} ${y} ${width} ${height}`;
  }, [zoomLevel]);

  // Ensure draftSteps is always sorted
  const sortedDraftSteps = useMemo(() => [...draftSteps].sort((a, b) => a - b), [draftSteps]);

  // Every visible waterline marker must also be a real node on the shared
  // Station 10 curve. This prevents a marker from moving independently when
  // its waterline elevation falls between two integration draft steps.
  const station10CurveSteps = useMemo(() => {
    const waterlineSteps = effectiveWaterlineLevels.map((wl) => Number((wl.draftFraction * T).toFixed(3)));
    return Array.from(new Set([...sortedDraftSteps, ...waterlineSteps])).sort((a, b) => a - b);
  }, [sortedDraftSteps, effectiveWaterlineLevels, T]);



  // Helper to get half-breadth for a specific station & waterline from waterlinesData or theory
  const getStationHalfB = (st: number, wlId: string, z: number): number => {
    if (
      waterlinesData &&
      waterlinesData[wlId] &&
      waterlinesData[wlId][st] !== undefined &&
      !isNaN(waterlinesData[wlId][st])
    ) {
      return waterlinesData[wlId][st];
    }
    if (st === 10.0) {
      return getTheoreticalOrdinateAtZ(z, calculatedRadius);
    }
    if (engine && engine.offsetTable[st]) {
      const matchWl = effectiveWaterlineLevels.find((w) => w.id === wlId);
      const shortName = matchWl?.shortName || wlId;
      if (engine.offsetTable[st][shortName] !== undefined) {
        return engine.offsetTable[st][shortName];
      }
      if (engine.offsetTable[st][wlId] !== undefined) {
        return engine.offsetTable[st][wlId];
      }
    }
    return computeStationTaperHalfB(st, z);
  };

  // Helper to get half-breadth for Midship (Station 10)
  const getWlHalfB = (wlId: string, z: number): number => {
    return getStationHalfB(10.0, wlId, z);
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

      const z = steps[i];
      if (z > T) {
        if (steps[i - 1] < T) {
          const partialWeight = (T - steps[i - 1]) / 2;
          sum += (ordinates[z] || 0) * partialWeight;
        }
        break;
      } else if (i < n - 1 && steps[i + 1] > T) {
        const forwardWeight = (T - z) / 2;
        const backwardWeight = (z - (i > 0 ? steps[i - 1] : z)) / 2;
        weight = forwardWeight + backwardWeight;
      }

      sum += (ordinates[z] || 0) * weight;
    }

    return sum * 2.0;
  };

  // High-precision Bilge Curve Generator
  const generateOptimizedDraftOrdinates = (targetAm: number, steps: number[]): Record<number, number> => {
    const initial: Record<number, number> = {};
    steps.forEach((z) => {
      initial[z] = getTheoreticalOrdinateAtZ(z, calculatedRadius);
    });

    for (let iter = 0; iter < 20; iter++) {
      const currentAm = calculateTrapezoidalAm(initial, steps);
      const deviance = (currentAm - targetAm) / (currentAm || 1);

      if (Math.abs(deviance) < 0.0001) break;

      const scale = targetAm / (currentAm || 1);
      steps.forEach((z) => {
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
    generateOptimizedDraftOrdinates(Am_rancangan, createDefaultDraftSteps(calculatedRadius, T, H))
  );

  useEffect(() => {
    const defaultSteps = createDefaultDraftSteps(calculatedRadius, T, H);
    setDraftSteps(defaultSteps);
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, defaultSteps));
  }, [Am_rancangan, B, T, Cm, calculatedRadius, halfB, H]);

  // Sync draftOrdinates when incoming waterlinesData changes
  useEffect(() => {
    if (!waterlinesData || Object.keys(waterlinesData).length === 0) return;
    setDraftOrdinates((prev) => {
      const next = { ...prev };
      effectiveWaterlineLevels.forEach((wl) => {
        const z = Number((wl.draftFraction * T).toFixed(3));
        const b = waterlinesData[wl.id]?.[10];
        if (b !== undefined && !isNaN(b)) {
          next[z] = b;
        }
      });
      return next;
    });
  }, [waterlinesData, effectiveWaterlineLevels, T]);

  // Reset & Auto-Fit Handlers
  const handleReset = () => {
    const defaultSteps = createDefaultDraftSteps(calculatedRadius, T, H);
    setDraftSteps(defaultSteps);
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, defaultSteps));
  };

  const handleAutoFineTune = () => {
    setDraftOrdinates(generateOptimizedDraftOrdinates(Am_rancangan, sortedDraftSteps));
  };

  const handleCellChange = (draft_z: number, value: string) => {
    const num = parseFloat(value);
    const newOrd = isNaN(num) ? 0 : Number(num.toFixed(3));
    setDraftOrdinates((prev) => ({
      ...prev,
      [draft_z]: newOrd
    }));

    const matchingWl = effectiveWaterlineLevels.find((wl) => Math.abs(wl.draftFraction * T - draft_z) < 0.05);
    if (matchingWl && onUpdateWaterlinesData) {
      const prevWl = waterlinesData?.[matchingWl.id] || {};
      const oldMidB = prevWl[10.0] || halfB || 1.0;
      const ratio = oldMidB > 0.001 ? newOrd / oldMidB : (halfB > 0 ? newOrd / halfB : 1.0);

      const updatedWl: Record<number, number> = {};
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        if (cfg.station >= 6.0 && cfg.station <= 15.0) {
          updatedWl[cfg.station] = newOrd;
        } else if (cfg.station >= 20.0) {
          updatedWl[cfg.station] = 0;
        } else {
          const baseRatio = DEFAULT_HULL_PROFILE[cfg.station] ?? (prevWl[cfg.station] !== undefined ? prevWl[cfg.station] / (oldMidB || 1) : 0.5);
          const scaledVal = prevWl[cfg.station] !== undefined ? prevWl[cfg.station] * ratio : baseRatio * newOrd;
          updatedWl[cfg.station] = Number(Math.max(0, Math.min(newOrd, scaledVal)).toFixed(3));
        }
      });

      onUpdateWaterlinesData({
        ...(waterlinesData || {}),
        [matchingWl.id]: updatedWl
      });
    }
  };

  const handleAddDraftStep = () => {
    let maxGap = 0;
    let newZ = R / 2;

    for (let i = 0; i < sortedDraftSteps.length - 1; i++) {
      const z1 = sortedDraftSteps[i];
      const z2 = sortedDraftSteps[i + 1];
      if (z2 <= R + 0.1) {
        const gap = z2 - z1;
        if (gap > maxGap) {
          maxGap = gap;
          newZ = z1 + gap / 2;
        }
      }
    }

    newZ = Number(newZ.toFixed(3));

    if (!sortedDraftSteps.includes(newZ)) {
      const newOrd = getTheoreticalOrdinateAtZ(newZ, R);
      setDraftOrdinates((prev) => ({ ...prev, [newZ]: newOrd }));
      setDraftSteps([...sortedDraftSteps, newZ]);
    }
  };

  const handleRemoveDraftStep = () => {
    if (sortedDraftSteps.length <= 4) return;

    let minGap = Infinity;
    let removeIndex = -1;

    for (let i = 1; i < sortedDraftSteps.length - 1; i++) {
      const z = sortedDraftSteps[i];
      if (Math.abs(z - T) < 0.01) continue;

      const prevZ = sortedDraftSteps[i - 1];
      const nextZ = sortedDraftSteps[i + 1];
      const gap = nextZ - prevZ;
      if (gap < minGap) {
        minGap = gap;
        removeIndex = i;
      }
    }

    if (removeIndex > 0) {
      const targetZ = sortedDraftSteps[removeIndex];
      const nextSteps = sortedDraftSteps.filter((_, idx) => idx !== removeIndex);
      setDraftSteps(nextSteps);
      setDraftOrdinates((prev) => {
        const copy = { ...prev };
        delete copy[targetZ];
        return copy;
      });
    }
  };

  const handleDeleteSingleDraftStep = (targetZ: number) => {
    if (sortedDraftSteps.length <= 4) return;
    if (targetZ === 0 || Math.abs(targetZ - T) < 0.01) return;

    const nextSteps = sortedDraftSteps.filter((z) => Math.abs(z - targetZ) >= 0.001);
    setDraftSteps(nextSteps);
    setDraftOrdinates((prev) => {
      const copy = { ...prev };
      delete copy[targetZ];
      return copy;
    });
  };

  // Simpson Integration Table Rows
  const calculatedRows = useMemo(() => {
    return sortedDraftSteps.map((draft_z, idx) => {
      let weight = 0;
      if (idx === 0) {
        weight = (sortedDraftSteps[1] - sortedDraftSteps[0]) / 2;
      } else if (idx === sortedDraftSteps.length - 1) {
        weight = (sortedDraftSteps[idx] - sortedDraftSteps[idx - 1]) / 2;
      } else {
        weight = (sortedDraftSteps[idx + 1] - sortedDraftSteps[idx - 1]) / 2;
      }

      const val = draftOrdinates[draft_z] !== undefined ? draftOrdinates[draft_z] : getTheoreticalOrdinateAtZ(draft_z, calculatedRadius);
      const product = val * weight;

      return {
        draft_z,
        label: draft_z.toFixed(2),
        halfB: val,
        fs: weight,
        product
      };
    });
  }, [sortedDraftSteps, draftOrdinates, calculatedRadius]);

  const Am_calc = useMemo(() => {
    return calculateTrapezoidalAm(draftOrdinates, sortedDraftSteps);
  }, [draftOrdinates, sortedDraftSteps]);

  const correctionPercent = useMemo(() => {
    if (Am_calc <= 0) return 0;
    return Number((((Am_calc - Am_rancangan) / Am_calc) * 100).toFixed(4));
  }, [Am_calc, Am_rancangan]);

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
      r.halfB.toFixed(3),
      r.fs.toFixed(2),
      r.product.toFixed(4)
    ]);

    const summaryData = [
      [],
      ["PERHITUNGAN RADIUS BILGA & LUAS MIDSHIP", ""],
      ["Lebar Kapal (B)", `${B.toFixed(2)} m`],
      ["Draft (T)", `${T.toFixed(2)} m`],
      ["Koefisien Midship (Cm)", Cm.toFixed(3)],
      ["Radius Bilga (R)", `${R.toFixed(4)} m`],
      ["Flat-of-bottom Tangent Distance (0.5B - R)", `${flatOfBottom.toFixed(4)} m`],
      ["Parameter Chord l", `${l_chord.toFixed(4)} m`],
      ["Total Luas (Satu Sisi)", (Am_calc / 2).toFixed(4)],
      ["Luas Midship Hasil Integrasi (Am_calc)", `${Am_calc.toFixed(3)} m2`],
      ["Luas Midship Target (Am_rancangan)", `${Am_rancangan.toFixed(3)} m2`],
      ["Midship Correction Percentage", `${correctionPercent.toFixed(3)} %`],
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

  // DYNAMIC SYNCHRONIZED STATIONS CONFIGURATION (EXACT MATCH WITH WATERLINE PLAN)
  const fullStationsConfig = DEFAULT_STATIONS_CONFIG;
  const stationSpacing_l = Number((LBP / 20).toFixed(4));
  
  // Dynamic synchronized active stations configuration filtered by active presets or custom list (Tanpa selisih 0.5)
  const activeStationsConfig = useMemo(() => {
    const allowed = new Set(selectedStationList);
    return DEFAULT_STATIONS_CONFIG.filter((cfg) => allowed.has(cfg.station) && Number.isInteger(cfg.station));
  }, [selectedStationList]);

  // Sorted Waterline levels from baseline to DWL
  const sortedWaterlines = useMemo(() => {
    return [...effectiveWaterlineLevels].sort((a, b) => a.draftFraction - b.draftFraction);
  }, [effectiveWaterlineLevels]);

  // Comprehensive 3D XYZ Offset Coordinates Dataset
  const xyzPointsList = useMemo(() => {
    const list: Array<{
      pointId: string;
      station: number;
      stationLabel: string;
      zoneName: string;
      bodySide: "Port (Afterbody)" | "Starboard (Forebody)";
      waterlineId: string;
      waterlineName: string;
      x_ap: number;
      x_mid: number;
      y: number;
      z: number;
      isBase?: boolean;
      isDeck?: boolean;
    }> = [];

    activeStationsConfig.forEach((cfg) => {
      const st = cfg.station;
      const x_ap = Number((st * stationSpacing_l).toFixed(3));
      const x_mid = Number(((st - 10.0) * stationSpacing_l).toFixed(3));
      const label = getStationDisplayLabel(st);
      const isAfter = st <= 10.0;
      const bodySide = isAfter ? ("Port (Afterbody)" as const) : ("Starboard (Forebody)" as const);
      const zoneName =
        st < 0
          ? "After Peak (AP)"
          : st <= 5
          ? "Peak 1 (Run Body)"
          : st <= 15
          ? "Parallel Middle Body (PMB)"
          : st <= 20
          ? "Peak 2 (Entrance)"
          : "Fore Peak (FP)";

      // 1. Base Line point (Z = 0)
      const baseOrd = getStationBaseHalfB(st);

      list.push({
        pointId: `pt-${st}-base`,
        station: st,
        stationLabel: label,
        zoneName,
        bodySide,
        waterlineId: "BASE",
        waterlineName: "Base Line (0.00m)",
        x_ap,
        x_mid,
        y: baseOrd,
        z: 0.0,
        isBase: true
      });

      // 2. Waterlines (WL 0 s.d. DWL)
      sortedWaterlines.forEach((wl) => {
        const z = Number((wl.draftFraction * T).toFixed(3));
        const b = getStationHalfB(st, wl.id, z);

        list.push({
          pointId: `pt-${st}-${wl.id}`,
          station: st,
          stationLabel: label,
          zoneName,
          bodySide,
          waterlineId: wl.id,
          waterlineName: `${wl.shortName} (${z.toFixed(2)}m)`,
          x_ap,
          x_mid,
          y: b,
          z
        });
      });

      // 3. Deck Level Point (Z = H + sheer)
      const topWl = sortedWaterlines[sortedWaterlines.length - 1];
      let deckB = topWl ? getStationHalfB(st, topWl.id, T) : (DEFAULT_HULL_PROFILE[st] ?? 0.5) * halfB;
      let deckHeight = H;
      if (st >= 15.0) {
        const flareFactor = (st - 15.0) / 5.0;
        deckB = Math.min(halfB * 1.08, deckB + flareFactor * (halfB * 0.28));
        deckHeight = H + flareFactor * (H * 0.16);
      } else if (st <= 4.0) {
        const sternFactor = (4.0 - st) / 4.0;
        deckB = Math.max(deckB * 1.12, halfB * 0.50 * sternFactor);
        deckHeight = H + sternFactor * (H * 0.08);
      } else if (st >= 6.0 && st <= 15.0) {
        deckB = halfB;
        deckHeight = H;
      }
      deckB = Number(deckB.toFixed(3));
      deckHeight = Number(deckHeight.toFixed(3));

      list.push({
        pointId: `pt-${st}-deck`,
        station: st,
        stationLabel: label,
        zoneName,
        bodySide,
        waterlineId: "DECK",
        waterlineName: `DECK (${deckHeight.toFixed(2)}m)`,
        x_ap,
        x_mid,
        y: deckB,
        z: deckHeight,
        isDeck: true
      });
    });

    return list;
  }, [activeStationsConfig, sortedWaterlines, stationSpacing_l, flatOfBottom, T, halfB, H, waterlinesData, effectiveWaterlineLevels]);

  // Matrix format for classic Table of Offsets
  const xyzMatrixData = useMemo(() => {
    return activeStationsConfig.map((cfg) => {
      const st = cfg.station;
      const x_ap = Number((st * stationSpacing_l).toFixed(3));
      const x_mid = Number(((st - 10.0) * stationSpacing_l).toFixed(3));
      const label = getStationDisplayLabel(st);
      const isAfter = st <= 10.0;
      const bodySide = isAfter ? ("Port (Afterbody)" as const) : ("Starboard (Forebody)" as const);
      const zoneName =
        st < 0
          ? "After Peak"
          : st <= 5
          ? "Peak 1"
          : st <= 15
          ? "PMB"
          : st <= 20
          ? "Peak 2"
          : "Fore Peak";

      const stPts = xyzPointsList.filter((p) => p.station === st);
      const basePt = stPts.find((p) => p.isBase);
      const deckPt = stPts.find((p) => p.isDeck);

      const wl_offsets: Record<string, number> = {};
      sortedWaterlines.forEach((wl) => {
        const pt = stPts.find((p) => p.waterlineId === wl.id);
        wl_offsets[wl.id] = pt ? pt.y : 0;
      });

      return {
        station: st,
        stationLabel: label,
        zoneName,
        bodySide,
        x_ap,
        x_mid,
        base_y: basePt?.y ?? 0,
        wl_offsets,
        deck_y: deckPt?.y ?? halfB,
        deck_z: deckPt?.z ?? H
      };
    });
  }, [activeStationsConfig, xyzPointsList, sortedWaterlines, stationSpacing_l, halfB, H]);

  // Export XYZ Coordinate Table to CSV
  const handleExportXyzCSV = () => {
    const headers = [
      "NO",
      "GADING (STATION)",
      "LABEL GADING",
      "ZONA LAMBUNG",
      "SISI BODY PLAN",
      "GARIS AIR (LEVEL)",
      "X DARI AP (m)",
      "X DARI MIDSHIP (m)",
      "Y / 0.5 B (m)",
      "Z / ELEVASI (m)"
    ];

    const rows = xyzPointsList.map((pt, idx) => [
      (idx + 1).toString(),
      pt.station.toString(),
      pt.stationLabel,
      pt.zoneName,
      pt.bodySide,
      pt.waterlineName,
      pt.x_ap.toFixed(3),
      pt.x_mid.toFixed(3),
      pt.y.toFixed(3),
      pt.z.toFixed(3)
    ]);

    const summaryMeta = [
      [],
      ["DATA TABEL ORDINAT KOORDINAT 3D (XYZ OFFSETS)", ""],
      ["Panjang Antara Garis Tegak (LBP)", `${LBP.toFixed(2)} m`],
      ["Lebar Kapal (B)", `${B.toFixed(2)} m`],
      ["Draft (T)", `${T.toFixed(2)} m`],
      ["Tinggi Geladak (H)", `${H.toFixed(2)} m`],
      ["Radius Bilga (R)", `${R.toFixed(4)} m`],
      ["Jarak Tangen Dasar (0.5B - R)", `${flatOfBottom.toFixed(4)} m`],
      ["Active Frame Count", `${activeStationsConfig.length} Frames`],
      ["Active Waterline Count", `${effectiveWaterlineLevels.length} Waterlines`],
      ["Definisi Sumbu", "X = Memanjang (AP=0m, Midship=10), Y = Melintang (CL=0m, Separuh Lebar), Z = Vertikal (Base Line=0m)"]
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(",")), ...summaryMeta.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BodyPlan_XYZ_Offsets_${LBP}x${B}x${T}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export 3D Point Cloud (.xyz format for Maxsurf / Rhino)
  const handleExportXyzPointCloud = () => {
    let textContent = `# LINES PLAN 3D OFFSET COORDINATES (POINT CLOUD)\n`;
    textContent += `# Vessel: LBP=${LBP.toFixed(2)}m, B=${B.toFixed(2)}m, T=${T.toFixed(2)}m, H=${H.toFixed(2)}m\n`;
    textContent += `# Coordinates: X (Length from AP), Y (Transverse Half-Breadth), Z (Draft Height from Baseline)\n`;
    textContent += `# Units: Meters (m)\n\n`;

    xyzPointsList.forEach((pt) => {
      textContent += `${pt.x_ap.toFixed(4)}\t${pt.y.toFixed(4)}\t${pt.z.toFixed(4)}\t# St.${pt.stationLabel} [${pt.waterlineName}]\n`;
    });

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BodyPlan_3D_PointCloud_${LBP}m.xyz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export AutoCAD Script (.scr) to plot 3D Splines for every station frame
  const handleExportAutoCADScript = () => {
    let script = `; AutoCAD 3D Lines Plan Script for Transverse Station Frames\n`;
    script += `; Generated automatically from Basic Design Studio\n`;
    script += `_UCS _W\n`;
    script += `_COLOR 3\n`;

    activeStationsConfig.forEach((cfg) => {
      const stPts = xyzPointsList.filter((pt) => pt.station === cfg.station);
      if (stPts.length < 2) return;
      script += `_SPLINE\n`;
      stPts.forEach((p) => {
        script += `${p.x_ap.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}\n`;
      });
      script += `\n\n`;
    });

    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BodyPlan_Frames_3D_${LBP}m.scr`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Station Frame Arrays for Body Plan (Divided into Afterbody and Forebody)
  const AFTERBODY_STATIONS = useMemo(() => {
    return activeStationsConfig
      .filter((cfg) => cfg.station >= 0.0 && cfg.station <= 10.0)
      .map((cfg) => cfg.station);
  }, [activeStationsConfig]);

  const FOREBODY_STATIONS = useMemo(() => {
    return activeStationsConfig
      .filter((cfg) => cfg.station >= 10.0 && cfg.station <= 20.0)
      .map((cfg) => cfg.station);
  }, [activeStationsConfig]);

  // =========================================================================
  // STATION SELECTION & VISIBILITY MANAGEMENT (PHASE 2)
  // =========================================================================
  const isStVisible = useCallback((st: number): boolean => {
    return isStationVisible(st, visibleStations, activeStation);
  }, [visibleStations, activeStation]);

  const toggleStationVisibility = useCallback((st: number) => {
    if (!visibleStations || visibleStations === "all") {
      const allStations = activeStationsConfig.map((c) => c.station);
      const remaining = allStations.filter((s) => Math.abs(s - st) > 1e-6);
      handleUpdateVisibleStations(remaining.length === 0 ? "all" : remaining);
    } else if (Array.isArray(visibleStations)) {
      const exists = visibleStations.some((s) => Math.abs(s - st) < 1e-6);
      if (exists) {
        if (Math.abs(st - activeStation) < 1e-6) {
          const other = visibleStations.find((s) => Math.abs(s - st) > 1e-6);
          if (other !== undefined) handleSelectStation(other);
        }
        const updated = visibleStations.filter((s) => Math.abs(s - st) > 1e-6);
        handleUpdateVisibleStations(updated.length === 0 ? "all" : updated);
      } else {
        const updated = [...visibleStations, st];
        if (updated.length >= activeStationsConfig.length) {
          handleUpdateVisibleStations("all");
        } else {
          handleUpdateVisibleStations(updated);
        }
      }
    }
  }, [visibleStations, activeStation, activeStationsConfig, handleUpdateVisibleStations, handleSelectStation]);

  const handleStationChipClick = useCallback((st: number) => {
    handleSelectStation(st);
    if (Array.isArray(visibleStations) && !visibleStations.some((s) => Math.abs(s - st) < 1e-6)) {
      handleUpdateVisibleStations([...visibleStations, st]);
    }
  }, [handleSelectStation, visibleStations, handleUpdateVisibleStations]);

  const showAllStations = useCallback(() => {
    handleUpdateVisibleStations("all");
  }, [handleUpdateVisibleStations]);

  const showOnlyActiveStation = useCallback(() => {
    handleUpdateVisibleStations([activeStation]);
  }, [activeStation, handleUpdateVisibleStations]);

  const showAfterbodyStations = useCallback(() => {
    const after = AFTERBODY_STATIONS;
    handleUpdateVisibleStations(after);
    if (!after.some((s) => Math.abs(s - activeStation) < 1e-6) && after.length > 0) {
      handleSelectStation(after[Math.floor(after.length / 2)]);
    }
  }, [AFTERBODY_STATIONS, activeStation, handleUpdateVisibleStations, handleSelectStation]);

  const showForebodyStations = useCallback(() => {
    const fore = FOREBODY_STATIONS;
    handleUpdateVisibleStations(fore);
    if (!fore.some((s) => Math.abs(s - activeStation) < 1e-6) && fore.length > 0) {
      handleSelectStation(fore[Math.floor(fore.length / 2)]);
    }
  }, [FOREBODY_STATIONS, activeStation, handleUpdateVisibleStations, handleSelectStation]);

  const visibleStationCount = useMemo(() => {
    return activeStationsConfig.filter((cfg) => isStVisible(cfg.station)).length;
  }, [activeStationsConfig, isStVisible]);

  const activeStationIndex = useMemo(() => {
    return activeStationsConfig.findIndex((c) => Math.abs(c.station - activeStation) < 1e-4);
  }, [activeStationsConfig, activeStation]);

  const handleStepStation = useCallback((delta: number) => {
    if (activeStationsConfig.length === 0) return;
    const currentIndex = activeStationsConfig.findIndex((c) => Math.abs(c.station - activeStation) < 1e-4);
    const targetIndex = Math.max(0, Math.min(activeStationsConfig.length - 1, (currentIndex >= 0 ? currentIndex : 0) + delta));
    const targetStation = activeStationsConfig[targetIndex].station;
    handleStationChipClick(targetStation);
  }, [activeStationsConfig, activeStation, handleStationChipClick]);


  // Helper to construct smooth 2D curve points for any station frame in the Body Plan (NS Savannah style)
  const getStationFramePoints = (
    st: number,
    ox: number,
    oy: number,
    scaleX: number,
    scaleZ: number,
    isAfterbody: boolean
  ) => {
    // Station 10 is the shared source of truth for the editable midship
    // section and the Body Plan projection. Keep both views on the same
    // draft ordinates instead of falling back to a separately generated frame.
    if (st === 10.0 && station10CurveSteps.length > 1) {
      const sign = isAfterbody ? -1 : 1;
      return station10CurveSteps.map((z) => {
        const b = draftOrdinates[z] ?? getTheoreticalOrdinateAtZ(z, calculatedRadius);
        return {
          x: ox + sign * b * scaleX,
          y: oy - z * scaleZ,
          z,
          wlId: `DRAFT-${z}`
        };
      });
    }

    const sign = isAfterbody ? -1 : 1;
    const isMid = st === 10.0;
    const isPMB = st >= 6.0 && st <= 14.5;
    const localDeckZ = H;

    // Calculate flat of bottom tangent only when within PMB and strictly bounded by the lowest waterline breadth
    const sortedWls = [...effectiveWaterlineLevels].sort((a, b) => a.draftFraction - b.draftFraction);
    const lowestWl = sortedWls.find((w) => w.draftFraction * T > 0.001);
    const lowestHalfB = lowestWl ? getStationHalfB(st, lowestWl.id, lowestWl.draftFraction * T) : 0;
    const rawFlatB = isMid || isPMB ? Math.max(0, halfB - calculatedRadius) : 0;
    const effectiveFlatB = Math.min(rawFlatB, lowestHalfB);

    const pts: { x: number; y: number; z: number; wlId?: string }[] = [];
    // 1. Keel CL (0,0)
    pts.push({ x: ox, y: oy, z: 0, wlId: "WL0" });

    // 2. PMB flat of bottom tangent point on baseline (Z = 0)
    if (effectiveFlatB > 0.05) {
      pts.push({
        x: ox + sign * (effectiveFlatB * scaleX),
        y: oy,
        z: 0,
        wlId: "FLAT_BOTTOM"
      });
    }

    // 3. Waterline level points (WL0 s.d. DWL)
    sortedWls.forEach((wl) => {
      const z = wl.draftFraction * T;
      if (z <= 0.001) return;
      const b = getStationHalfB(st, wl.id, z);
      pts.push({
        x: ox + sign * (b * scaleX),
        y: oy - z * scaleZ,
        z,
        wlId: wl.id
      });
    });

    // 4. Deck sheer point
    const topWl = sortedWls[sortedWls.length - 1];
    const dwlB = topWl ? getStationHalfB(st, topWl.id, T) : halfB;
    pts.push({
      x: ox + sign * (dwlB * scaleX),
      y: oy - localDeckZ * scaleZ,
      z: localDeckZ,
      wlId: "DECK"
    });

    return pts;
  };

  // Preserve every entered waterline ordinate while keeping one continuous
  // tangent through the frame. Cubic Catmull-Rom conversion removes the
  // visible kinks that appear when each waterline segment is faired alone.
  const fairFramePath = (pts: { x: number; y: number; z: number; wlId?: string }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
    if (pts.length === 2) {
      return `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)} L ${pts[1].x.toFixed(3)},${pts[1].y.toFixed(3)}`;
    }

    let d = `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
    const tension = 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + ((p2.x - p0.x) * tension) / 6;
      const c1y = p1.y + ((p2.y - p0.y) * tension) / 6;
      const c2x = p2.x - ((p3.x - p1.x) * tension) / 6;
      const c2y = p2.y - ((p3.y - p1.y) * tension) / 6;
      d += ` C ${c1x.toFixed(3)},${c1y.toFixed(3)} ${c2x.toFixed(3)},${c2y.toFixed(3)} ${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
    }
    return d;
  };

  // Keyboard shortcut for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreenPlot) {
        setIsFullscreenPlot(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenPlot]);

  // SVG Interaction Handlers (Horizontal Dragging along Waterline / Station Node)
  const handleStationPointerDown = (e: React.PointerEvent, station: number, wlId: string, z?: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {}
    setDraggingStation(station);
    setDraggingWlId(wlId);
    if (z !== undefined) {
      setDraggingDraft(z);
    } else {
      const matchWl = effectiveWaterlineLevels.find((w) => w.id === wlId);
      if (matchWl) {
        setDraggingDraft(matchWl.draftFraction * T);
      }
    }
    if (onSelectWlId) {
      onSelectWlId(wlId);
    }
  };

  const handleWlPointerDown = (e: React.PointerEvent, wlId: string, z: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {}
    setDraggingWlId(wlId);
    setDraggingDraft(z);
    setDraggingStation(10.0);
    if (onSelectWlId) {
      onSelectWlId(wlId);
    }
  };

  // Phase 3: Interactive Handle Pointer Down for any selected station
  const handleStationHandlePointerDown = (
    e: React.PointerEvent,
    st: number,
    wlId: string,
    z: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {}
    setDraggingStation(st);
    setDraggingWlId(wlId);
    setDraggingDraft(z);
    handleSelectStation(st);
    if (onSelectWlId) {
      onSelectWlId(wlId);
    }
  };

  // Phase 3: Precision step nudging for active station & active waterline
  const handleNudgeStationHalfB = (delta: number) => {
    const activeZ = (effectiveWaterlineLevels.find((w) => w.id === activeWlId)?.draftFraction ?? 1.0) * T;
    const currentVal = getStationHalfB(activeStation, activeWlId, activeZ);
    let newVal = currentVal + delta;
    newVal = Number(Math.max(0, Math.min(halfB * 1.15, newVal)).toFixed(3));

    const prevWl = waterlinesData?.[activeWlId] || {};
    const updatedWl = { ...prevWl, [activeStation]: newVal };

    if (lockPmb && activeStation === 10.0) {
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        if (cfg.station >= 6.0 && cfg.station <= 15.0) {
          updatedWl[cfg.station] = newVal;
        }
      });
    }

    const updatedAll = {
      ...(waterlinesData || {}),
      [activeWlId]: updatedWl
    };

    if (onUpdateWaterlinesData) onUpdateWaterlinesData(updatedAll);

    if (activeStation === 10.0) {
      const roundedZ = Number(activeZ.toFixed(3));
      setDraftOrdinates((prev) => ({
        ...prev,
        [roundedZ]: newVal
      }));
    }
  };

  // Phase 3: Direct numerical input for active station & active waterline
  const handleDirectStationHalfBChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return;
    const clampedVal = Number(Math.max(0, Math.min(halfB * 1.15, val)).toFixed(3));
    const activeZ = (effectiveWaterlineLevels.find((w) => w.id === activeWlId)?.draftFraction ?? 1.0) * T;

    const prevWl = waterlinesData?.[activeWlId] || {};
    const updatedWl = { ...prevWl, [activeStation]: clampedVal };

    if (lockPmb && activeStation === 10.0) {
      DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
        if (cfg.station >= 6.0 && cfg.station <= 15.0) {
          updatedWl[cfg.station] = clampedVal;
        }
      });
    }

    const updatedAll = {
      ...(waterlinesData || {}),
      [activeWlId]: updatedWl
    };

    if (onUpdateWaterlinesData) onUpdateWaterlinesData(updatedAll);

    if (activeStation === 10.0) {
      const roundedZ = Number(activeZ.toFixed(3));
      setDraftOrdinates((prev) => ({
        ...prev,
        [roundedZ]: clampedVal
      }));
    }
  };

  // Phase 3: Reset active station back to theoretical FairingEngine curve
  const handleResetCurrentStation = () => {
    if (!waterlinesData) return;
    const updatedAll: Record<string, Record<number, number>> = {};
    Object.entries(waterlinesData).forEach(([wlKey, stationsMap]) => {
      const newMap = { ...stationsMap };
      delete newMap[activeStation];
      updatedAll[wlKey] = newMap;
    });
    if (onUpdateWaterlinesData) onUpdateWaterlinesData(updatedAll);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingWlId && draggingDraft === null && draggingStation === null) return;
    const svg = (e.currentTarget as SVGSVGElement) || svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    let ox = 100;
    let scaleX = 82 / (halfB || 7.5);

    if (studioMode === "midshipDetail") {
      ox = isFullHullView ? 82 : 35;
      scaleX = isFullHullView ? 56 / (halfB || 7.5) : 80 / (halfB || 7.5);
    } else {
      ox = 100;
      scaleX = 82 / (halfB || 7.5);
    }

    const distFromCL = Math.abs(svgP.x - ox);
    let newHalfB = distFromCL / scaleX;
    newHalfB = Number(Math.max(0, Math.min(halfB * 1.15, newHalfB)).toFixed(3));

    if (draggingStation !== null && draggingWlId) {
      const prevWl = waterlinesData?.[draggingWlId] || {};
      const updatedWl = { ...prevWl, [draggingStation]: newHalfB };

      // Phase 3: Only propagate to PMB stations if lockPmb is active and station is 10
      if (lockPmb && draggingStation === 10.0) {
        DEFAULT_STATIONS_CONFIG.forEach((cfg) => {
          if (cfg.station >= 6.0 && cfg.station <= 15.0) {
            updatedWl[cfg.station] = newHalfB;
          }
        });
      }

      const updatedAll = {
        ...(waterlinesData || {}),
        [draggingWlId]: updatedWl
      };

      if (onUpdateWaterlinesData) {
        onUpdateWaterlinesData(updatedAll);
      }

      if (draggingStation === 10.0 && draggingDraft !== null) {
        const roundedZ = Number(draggingDraft.toFixed(3));
        setDraftOrdinates((prev) => ({
          ...prev,
          [roundedZ]: newHalfB
        }));
      }
    } else if (draggingDraft !== null) {
      const roundedZ = Number(draggingDraft.toFixed(3));
      setDraftOrdinates((prev) => ({
        ...prev,
        [roundedZ]: newHalfB
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingWlId !== null || draggingDraft !== null || draggingStation !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggingWlId(null);
      setDraggingDraft(null);
      setDraggingStation(null);
    }
  };

  const handlePointerLeave = () => {
    setDraggingWlId(null);
    setDraggingDraft(null);
    setDraggingStation(null);
    setHoverDraft(null);
    setHoverWlId(null);
  };

  // Active Readout Info
  const activeHoverZ = hoverDraft ?? draggingDraft ?? R;
  const activeHoverHalfB = draftOrdinates[activeHoverZ] ?? halfB;

  // =========================================================================
  // 3D XYZ OFFSET COORDINATE TABLE RENDERER
  // =========================================================================
  const renderXyzTableContent = (embeddedInReport = false) => {
    // 1. Filter points & matrix based on state
    const filteredMatrix = xyzMatrixData.filter((row) => {
      // Zone filter
      if (xyzFilterZone === "afterbody" && row.station > 10.0) return false;
      if (xyzFilterZone === "forebody" && row.station < 10.0) return false;
      if (xyzFilterZone === "pmb" && (row.station < 6.0 || row.station > 15.0)) return false;

      // Station filter
      if (xyzFilterStation !== "all" && row.station.toString() !== xyzFilterStation) return false;

      // Search filter
      if (xyzSearchTerm.trim()) {
        const q = xyzSearchTerm.toLowerCase();
        const matchLabel = row.stationLabel.toLowerCase().includes(q);
        const matchZone = row.zoneName.toLowerCase().includes(q);
        const matchSide = row.bodySide.toLowerCase().includes(q);
        const matchSt = row.station.toString().includes(q);
        if (!matchLabel && !matchZone && !matchSide && !matchSt) return false;
      }

      return true;
    });

    const filteredPoints = xyzPointsList.filter((pt) => {
      // Zone filter
      if (xyzFilterZone === "afterbody" && pt.station > 10.0) return false;
      if (xyzFilterZone === "forebody" && pt.station < 10.0) return false;
      if (xyzFilterZone === "pmb" && (pt.station < 6.0 || pt.station > 15.0)) return false;

      // Station filter
      if (xyzFilterStation !== "all" && pt.station.toString() !== xyzFilterStation) return false;

      // Search filter
      if (xyzSearchTerm.trim()) {
        const q = xyzSearchTerm.toLowerCase();
        const matchLabel = pt.stationLabel.toLowerCase().includes(q);
        const matchZone = pt.zoneName.toLowerCase().includes(q);
        const matchWl = pt.waterlineName.toLowerCase().includes(q);
        const matchSide = pt.bodySide.toLowerCase().includes(q);
        const matchSt = pt.station.toString().includes(q);
        if (!matchLabel && !matchZone && !matchWl && !matchSide && !matchSt) return false;
      }

      return true;
    });

    return (
      <div className={`w-full flex flex-col space-y-3.5 select-text ${embeddedInReport ? "" : "h-full min-h-[460px] p-2 sm:p-4 bg-surface-primary rounded-lg border border-border-default"} `}>
        {/* Top Control Bar: Search, Zone Filters, Format Switcher & Exports */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-border-default">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input aria-label="Cari gading / WL / zona..."
                type="text"
                placeholder="Cari gading / WL / zona..."
                value={xyzSearchTerm}
                onChange={(e) => setXyzSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-surface-canvas border border-border-default rounded-md text-sm font-mono text-accent-primary placeholder-text-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default w-44 sm:w-56 transition-colors min-h-10"
              />
              {xyzSearchTerm && (
                <button
                  type="button"
                  onClick={() => setXyzSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer min-h-9"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Zone Filter Buttons */}
            <div className="flex items-center bg-surface-secondary p-0.5 rounded-lg border border-border-default text-xs font-mono">
              <button
                type="button"
                onClick={() => setXyzFilterZone("all")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  xyzFilterZone === "all" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
              >
                Semua Zona ({activeStationsConfig.length})
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("afterbody")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  xyzFilterZone === "afterbody" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
              >
                ◀ AFTERBODY ({AFTERBODY_STATIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("pmb")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  xyzFilterZone === "pmb" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
              >
                PMB (St.6-15)
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("forebody")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  xyzFilterZone === "forebody" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
              >
                FOREBODY ({FOREBODY_STATIONS.length}) ▶
              </button>
            </div>

            {/* Station Dropdown */}
            <select
              aria-label="Station filter" value={xyzFilterStation}
              onChange={(e) => setXyzFilterStation(e.target.value)}
              className="bg-surface-canvas border border-border-default rounded-md px-2.5 py-1.5 text-sm font-sans font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default cursor-pointer min-h-10"
            >
              <option value="all">All Frames (St. B - 21)</option>
              {activeStationsConfig.map((cfg) => (
                <option key={`xyz-opt-st-${cfg.station}`} value={cfg.station.toString()}>
                  Frame {getStationDisplayLabel(cfg.station)}
                </option>
              ))}
            </select>
          </div>

          {/* Right Action Controls: Format Switcher & 3 Export Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* View Format Switcher */}
            <div className="flex items-center bg-surface-secondary p-0.5 rounded-lg border border-border-default text-xs font-mono">
              <button
                type="button"
                onClick={() => setXyzViewFormat("matrix")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1 cursor-pointer ${
                  xyzViewFormat === "matrix" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
                title="Classic Table of Offsets matrix (waterlines by column, frames by row)"
               aria-label="Classic Table of Offsets matrix (waterlines by column, frames by row)">
                <TableIcon size={12} />
                <span>Matriks Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setXyzViewFormat("pointCloud")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center space-x-1 cursor-pointer ${
                  xyzViewFormat === "pointCloud" ? "bg-accent-primary text-on-accent min-h-9" : "text-text-secondary hover:text-text-primary min-h-9"
                } `}
                title="Tampilan Daftar Titik Koordinat 3D Point Cloud (X, Y, Z)"
               aria-label="Tampilan Daftar Titik Koordinat 3D Point Cloud (X, Y, Z)">
                <FileText size={12} />
                <span>3D List (XYZ)</span>
              </button>
            </div>

            {/* Export Actions */}
            <button
              type="button"
              onClick={handleExportXyzCSV}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface-secondary hover:bg-surface-secondary text-accent-primary rounded-md text-sm font-sans font-semibold transition-colors border border-border-default cursor-pointer min-h-9"
              title="Download 3D offset ordinates as CSV"
             aria-label="Download 3D offset ordinates as CSV">
              <Download size={12} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportXyzPointCloud}
              className="flex items-center space-x-1 px-2.5 py-1 bg-surface-secondary hover:bg-surface-secondary text-status-warning rounded-md text-sm font-sans font-semibold transition-colors border border-border-default cursor-pointer min-h-9"
              title="Unduh 3D Point Cloud (.xyz) untuk Maxsurf / Rhino / AutoCAD"
             aria-label="Unduh 3D Point Cloud (.xyz) untuk Maxsurf / Rhino / AutoCAD">
              <FileText size={12} />
              <span>.XYZ</span>
            </button>
            <button
              type="button"
              onClick={handleExportAutoCADScript}
              className="flex items-center space-x-1 px-2.5 py-1 text-on-accent rounded-md text-sm font-sans font-semibold transition-colors cursor-pointer bg-accent-primary min-h-9"
              title="Unduh AutoCAD Script (.scr) untuk generate otomatis kurva gading 3D Spline"
             aria-label="Unduh AutoCAD Script (.scr) untuk generate otomatis kurva gading 3D Spline">
              <Compass size={12} />
              <span>AutoCAD .SCR</span>
            </button>
          </div>
        </div>

        {/* Legend / Coordinate Definition Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface-primary rounded-lg border border-border-default text-xs font-mono text-text-secondary">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-surface-selected" />
              <span className="text-text-primary">
                <strong>Sumbu X (Memanjang):</strong> Posisi gading dari AP (X_AP = st &times; {stationSpacing_l} m)
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-status-success-subtle" />
              <span className="text-text-primary">
                <strong>Sumbu Y (Melintang):</strong> Ordinat 0.5 B (CL = 0.000 m)
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-status-warning-subtle" />
              <span className="text-text-primary">
                <strong>Sumbu Z (Vertikal):</strong> Sarat / Tinggi dari Base Line (BL = 0.00 m, DWL = {T.toFixed(2)} m)
              </span>
            </span>
          </div>
          <div className="text-text-secondary flex items-center space-x-2">
              <span>Total 3D Points: <strong className="text-accent-primary">{filteredPoints.length} Points</strong></span>
            <span>&bull;</span>
            <span>Total Frames: <strong className="text-text-primary">{filteredMatrix.length} Frames</strong></span>
          </div>
        </div>

        {/* TABLE CONTENT AREA */}
        {xyzViewFormat === "matrix" ? (
          /* MATRIX GRID VIEW (TABLE OF OFFSETS) */
          <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default max-h-[540px] overflow-y-auto">
            <table className="w-full text-left text-sm font-mono border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20 bg-surface-secondary">
                <tr className="bg-surface-secondary text-text-primary border-b border-border-default text-xs">
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-border-default sticky left-0 z-30 bg-surface-secondary w-16">
                    GADING
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold text-center border-r border-border-default sticky left-16 z-30 bg-surface-secondary w-20">
                    LABEL
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-accent-primary text-right border-r border-border-default w-24">
                    X_AP (m)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary text-right border-r border-border-default w-24">
                    X_MID (m)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary text-center border-r border-border-default w-24">
                    ZONA
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary text-center border-r border-border-default w-28">
                    BODY PLAN
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-text-primary text-right border-r border-border-default bg-surface-canvas">
                    BASE LINE<br /><span className="text-xs text-text-secondary">(Z=0.00m)</span>
                  </th>
                  {sortedWaterlines.map((wl) => {
                    const z = (wl.draftFraction * T).toFixed(2);
                    const isActive = wl.id === activeWlId;
                    return (
                      <th
                        key={`th-wl-${wl.id}`}
                        className={`py-2.5 px-3 font-semibold text-right border-r border-border-default transition-colors ${
                          isActive ? "bg-surface-selected text-accent-primary" : "text-text-primary"
                        } `}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: engineeringColor(wl.color) }} />
                          <span>{wl.shortName}</span>
                        </div>
                        <span className="text-xs text-text-secondary font-normal">Z={z}m</span>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-3 font-semibold text-status-warning text-right bg-status-warning-subtle">
                    DECK<br /><span className="text-xs text-status-warning">(Z={H.toFixed(2)}m)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-surface-primary">
                {filteredMatrix.map((row) => {
                  const isHovered = hoveredStation === row.station;
                  const isMid = row.station === 10.0;
                  const isAfter = row.station <= 10.0;
                  const isActiveSt = activeStation !== undefined && Math.abs(row.station - activeStation) < 1e-4;

                  return (
                    <tr
                      key={`mat-row-${row.station}`}
                      onClick={() => handleStationChipClick(row.station)}
                      onMouseEnter={() => setHoveredStation(row.station)}
                      onMouseLeave={() => setHoveredStation(null)}
                      className={`transition-colors duration-100 cursor-pointer ${
                        isActiveSt
                          ? "bg-surface-selected/80 text-text-primary border-l-4 border-accent-primary ring-1 ring-focus-ring font-semibold"
                          : isHovered
                          ? "bg-surface-selected text-text-primary"
                          : isMid
                          ? "bg-status-warning-subtle font-semibold"
                          : "hover:bg-surface-canvas"
                      } `}
                      title={`Klik untuk memilih Gading ${row.stationLabel} (${row.station})`}
                    >
                      <td
                        className={`py-2 px-3 text-center border-r border-border-default sticky left-0 z-10 font-semibold ${
                          isHovered ? "bg-surface-selected text-accent-primary" : isMid ? "bg-status-warning-subtle text-accent-primary" : "bg-surface-primary text-text-primary"
                        } `}
                      >
                        {row.station}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-center border-r border-border-default sticky left-16 z-10 font-semibold ${
                          isHovered ? "bg-status-warning-subtle text-status-warning" : isMid ? "bg-status-warning-subtle text-status-warning" : "bg-surface-primary text-text-primary"
                        } `}
                      >
                        {row.stationLabel}
                      </td>
                      <td className="py-2 px-3 text-right text-accent-primary font-semibold border-r border-border-default">
                        {row.x_ap.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right text-text-secondary border-r border-border-default">
                        {row.x_mid >= 0 ? `+${row.x_mid.toFixed(3)}` : row.x_mid.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-center text-text-secondary text-sm border-r border-border-default">
                        {row.zoneName}
                      </td>
                      <td className="py-2 px-3 text-center text-sm border-r border-border-default">
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            isAfter ? "bg-surface-selected text-accent-primary border border-border-default" : "bg-surface-selected text-accent-primary border border-border-default"
                          } `}
                        >
                          {isAfter ? "Port (Buritan)" : "Stbd (Haluan)"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-text-secondary border-r border-border-default bg-surface-canvas">
                        {row.base_y.toFixed(3)}
                      </td>
                      {sortedWaterlines.map((wl) => {
                        const yVal = row.wl_offsets[wl.id] ?? 0;
                        const isActive = wl.id === activeWlId;
                        const isZero = yVal <= 0.001;
                        return (
                          <td
                            key={`mat-cell-${row.station}-${wl.id}`}
                            className={`py-2 px-3 text-right border-r border-border-default ${
                              isActive
                                ? "bg-surface-selected font-semibold text-accent-primary"
                                : isZero
                                ? "text-text-secondary"
                                : isMid
                                ? "text-status-success font-semibold"
                                : "text-text-primary"
                            } `}
                          >
                            {yVal.toFixed(3)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-medium text-status-warning bg-status-warning-subtle">
                        {row.deck_y.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* 3D POINT CLOUD LIST VIEW */
          <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default max-h-[540px] overflow-y-auto">
            <table className="w-full text-left text-sm font-mono border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-20 bg-surface-secondary">
                <tr className="bg-surface-secondary text-text-primary border-b border-border-default text-xs">
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-border-default w-14">NO</th>
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-border-default w-20">GADING</th>
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-border-default w-24">LABEL</th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary border-r border-border-default w-32">ZONA</th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary border-r border-border-default w-36">SISI BODY PLAN</th>
                  <th className="py-2.5 px-3 font-semibold text-text-primary border-r border-border-default min-w-[140px]">LEVEL ELEVASI</th>
                  <th className="py-2.5 px-3 font-semibold text-accent-primary text-right border-r border-border-default w-28">X (AP) [m]</th>
                  <th className="py-2.5 px-3 font-semibold text-text-secondary text-right border-r border-border-default w-28">X (MID) [m]</th>
                  <th className="py-2.5 px-3 font-semibold text-status-success text-right border-r border-border-default w-28">Y (0.5B) [m]</th>
                  <th className="py-2.5 px-3 font-semibold text-status-warning text-right w-28">Z (Draft) [m]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-surface-primary">
                {filteredPoints.map((pt, idx) => {
                  const isHovered = hoveredStation === pt.station;
                  const isMid = pt.station === 10.0;
                  const isDWL = Math.abs(pt.z - T) < 0.01;
                  const isBase = pt.isBase;
                  const isDeck = pt.isDeck;

                  return (
                    <tr
                      key={pt.pointId}
                      onMouseEnter={() => setHoveredStation(pt.station)}
                      onMouseLeave={() => setHoveredStation(null)}
                      className={`transition-colors duration-100 ${
                        isHovered
                          ? "bg-surface-selected text-text-primary"
                          : isMid
                          ? "bg-status-warning-subtle"
                          : isDWL
                          ? "bg-status-success-subtle"
                          : isDeck
                          ? "bg-status-warning-subtle"
                          : "hover:bg-surface-canvas"
                      } `}
                    >
                      <td className="py-1.5 px-3 text-center text-text-secondary border-r border-border-default">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 text-center font-semibold text-text-primary border-r border-border-default">
                        {pt.station}
                      </td>
                      <td className="py-1.5 px-3 text-center font-semibold text-status-warning border-r border-border-default">
                        {pt.stationLabel}
                      </td>
                      <td className="py-1.5 px-3 text-text-secondary text-sm border-r border-border-default">
                        {pt.zoneName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-border-default">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            pt.station <= 10.0
                              ? "bg-surface-selected text-accent-primary border border-border-default"
                              : "bg-surface-selected text-accent-primary border border-border-default"
                          } `}
                        >
                          {pt.bodySide}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-text-primary border-r border-border-default">
                        {pt.waterlineName}
                      </td>
                      <td className="py-1.5 px-3 text-right text-accent-primary font-semibold border-r border-border-default">
                        {pt.x_ap.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-text-secondary border-r border-border-default">
                        {pt.x_mid >= 0 ? `+${pt.x_mid.toFixed(3)}` : pt.x_mid.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-status-success font-semibold border-r border-border-default">
                        {pt.y.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-status-warning font-semibold">
                        {pt.z.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // =========================================================================
  // CORE RENDERER: AUTHENTIC NAVAL ARCHITECTURE STATION VIEW (BODY PLAN)
  // Matching Standard Drawing Layout (Centerline, Sheer, Transom Knuckle, Buttocks, Waterlines)
  // =========================================================================
  const renderBodyPlanSvg = (ox = 100, oy = 130, scaleX = 86 / (halfB || 7.5), scaleZ = 96 / Math.max(H, 7.0)) => {
    return (
      <g className="body-plan-group">
        {/* AFTERBODY TRANSVERSE STATION CURVES (Port / Buritan - Left of CL) - St <= 10 */}
        {AFTERBODY_STATIONS.filter((st) => st <= 10.0).map((st) => {
          if (!isStVisible(st)) return null;

          const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, true);
          const isInteger = st % 1 === 0;
          const isSelected = Math.abs(activeStation - st) < 1e-6;
          const isHovered = hoveredStation === st || draggingStation === st;
          const pathD = fairFramePath(pts);
          const topPt = pts[pts.length - 1];
          const label = getStationDisplayLabel(st);

          const strokeColor = isSelected
            ? "#38bdf8"
            : isHovered
            ? "#f59e0b"
            : "#a78bfa";

          const strokeWidth = isSelected
            ? 3.2
            : isHovered
            ? 2.5
            : isInteger
            ? 1.4
            : 0.8;

          const opacity = isSelected
            ? 1.0
            : isHovered
            ? 1.0
            : (activeStation !== undefined ? 0.55 : 0.85);

          return (
            <g
              key={`body-after-st-${st}`}
              className="transition-all cursor-pointer group"
              onClick={() => handleStationChipClick(st)}
              onPointerEnter={() => setHoveredStation(st)}
              onPointerLeave={() => setHoveredStation(null)}
            >
              <title>{`Gading ${label} (Buritan / Port) — Klik untuk Pilih & Edit`}</title>
              {/* Wide transparent stroke for reliable hit testing */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
              />
              <path
                d={pathD}
                fill="none"
                stroke={engineeringColor(strokeColor)}
                strokeWidth={strokeWidth}
                strokeDasharray="none"
                opacity={opacity}
              />
            </g>
          );
        })}

        {/* FOREBODY TRANSVERSE STATION CURVES (Starboard / Haluan - Right of CL) - St >= 10 */}
        {FOREBODY_STATIONS.filter((st) => st >= 10.0).map((st) => {
          if (!isStVisible(st)) return null;

          const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, false);
          const isInteger = st % 1 === 0;
          const isSelected = Math.abs(activeStation - st) < 1e-6;
          const isHovered = hoveredStation === st || draggingStation === st;
          const pathD = fairFramePath(pts);
          const topPt = pts[pts.length - 1];
          const label = getStationDisplayLabel(st);

          const strokeColor = isSelected
            ? "#38bdf8"
            : isHovered
            ? "#f59e0b"
            : "#22d3ee";

          const strokeWidth = isSelected
            ? 3.2
            : isHovered
            ? 2.5
            : isInteger
            ? 1.4
            : 0.8;

          const opacity = isSelected
            ? 1.0
            : isHovered
            ? 1.0
            : (activeStation !== undefined ? 0.55 : 0.85);

          return (
            <g
              key={`body-fore-st-${st}`}
              className="transition-all cursor-pointer group"
              onClick={() => handleStationChipClick(st)}
              onPointerEnter={() => setHoveredStation(st)}
              onPointerLeave={() => setHoveredStation(null)}
            >
              <title>{`Gading ${label} (Haluan / Starboard) — Klik untuk Pilih & Edit`}</title>
              {/* Wide transparent stroke for reliable hit testing */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
              />
              <path
                d={pathD}
                fill="none"
                stroke={engineeringColor(strokeColor)}
                strokeWidth={strokeWidth}
                strokeDasharray="none"
                opacity={opacity}
              />
            </g>
          );
        })}

        {/* Floating HUD banner for current active/hovered station identification */}
        <g className="body-plan-hud-banner" style={{ pointerEvents: "none" }}>
          <rect
            x={ox - 48}
            y={oy - H * scaleZ - 21}
            width={96}
            height={13}
            rx={3}
            fill="rgba(15, 23, 42, 0.92)"
            stroke={engineeringColor(hoveredStation !== null && hoveredStation !== activeStation ? "#f59e0b" : "#38bdf8")}
            strokeWidth="0.8"
          />
          <text
            x={ox}
            y={oy - H * scaleZ - 12.5}
            textAnchor="middle"
            fontSize="5.2"
            fontWeight="bold"
            fill={engineeringColor(hoveredStation !== null && hoveredStation !== activeStation ? "#f59e0b" : "#38bdf8")}
          >
            {hoveredStation !== null && hoveredStation !== activeStation
              ? `Hover: Gading ${getStationDisplayLabel(hoveredStation)} (Klik untuk Pilih)`
              : `Sedang Diedit: Gading ${getStationDisplayLabel(activeStation)} (${activeStation <= 10 ? "Buritan" : "Haluan"})`}
          </text>
        </g>

        {/* ========================================================================= */}
        {/* PHASE 3: INTERACTIVE CONTROL POINTS (HANDLES) ON ACTIVE STATION            */}
        {/* ========================================================================= */}
        {!isPreviewMode && activeStation !== undefined && isStVisible(activeStation) && (
          <g className="active-station-handles-group">
            {sortedWaterlines.map((wl) => {
              const z = wl.draftFraction * T;
              if (z <= 0.001) return null;
              const b = getStationHalfB(activeStation, wl.id, z);
              const isAfter = activeStation <= 10.0;
              const sign = isAfter ? -1 : 1;
              const ptX = ox + sign * b * scaleX;
              const ptY = oy - z * scaleZ;
              const isWlActive = wl.id === activeWlId;
              const isDragging = draggingStation === activeStation && draggingWlId === wl.id;
              const isHovered = (hoverWlId === wl.id && hoveredStation === activeStation) || isDragging;

              return (
                <g key={`active-st-${activeStation}-wl-${wl.id}`}>
                  {/* Guideline connecting to Centerline - purely visual, pointerEvents: none */}
                  {(isWlActive || isHovered) && (
                    <line
                      x1={ox}
                      y1={ptY}
                      x2={ptX}
                      stroke={engineeringColor(isDragging ? "#f59e0b" : "#38bdf8")}
                      strokeWidth="0.5"
                      strokeDasharray="1.5 1"
                      opacity="0.85"
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Outer pulse/selection ring - purely visual, pointerEvents: none */}
                  {(isWlActive || isHovered) && (
                    <circle
                      cx={ptX}
                      cy={ptY}
                      r={isDragging ? 3.6 : 3.0}
                      fill="none"
                      stroke={engineeringColor(isDragging ? "#f59e0b" : "#38bdf8")}
                      strokeWidth="0.6"
                      opacity="0.9"
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Visible Circle Node - purely visual, pointerEvents: none */}
                  <circle
                    cx={ptX}
                    cy={ptY}
                    r={isDragging ? 2.6 : isHovered ? 2.3 : isWlActive ? 2.1 : 1.7}
                    fill={engineeringColor(isDragging ? "#f59e0b" : isWlActive ? "#38bdf8" : (wl.color || "#06b6d4"))}
                    stroke="#ffffff"
                    strokeWidth={isWlActive || isDragging ? 0.6 : 0.4}
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Invisible generous hit target (r=5.5) - guarantees 100% stable hover & drag without any flickering */}
                  <circle
                    cx={ptX}
                    cy={ptY}
                    r={5.5}
                    fill="transparent"
                    stroke="none"
                    className="cursor-ew-resize"
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => handleStationHandlePointerDown(e, activeStation, wl.id, z)}
                    onPointerEnter={() => {
                      setHoverWlId(wl.id);
                      setHoverDraft(z);
                      setHoveredStation(activeStation);
                    }}
                    onPointerLeave={() => {
                      setHoverWlId(null);
                      setHoverDraft(null);
                      setHoveredStation(null);
                    }}
                  >
                    <title>{`Gading ${getStationDisplayLabel(activeStation)} @ ${wl.shortName} (Z=${z.toFixed(2)}m) -> 0.5B = ${b.toFixed(3)}m (Drag horizontal)`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  };

  // Core SVG Content Orchestrator
  const renderMidshipSvgContent = () => {
    if (studioMode === "midshipDetail") {
      const ox = isFullHullView ? 82 : 35;
      const oy = 74;
      const maxH = Math.max(H, T, 7.0);
      const scaleZ = 52 / maxH;
      const scaleX = isFullHullView ? 56 / (halfB || 7.5) : 80 / (halfB || 7.5);

      const deckY = oy - H * scaleZ;
      const dwlY = oy - T * scaleZ;
      const outerX = ox + halfB * scaleX;
      const station10DisplaySteps = Array.from(
        new Set([
          0,
          T,
          ...effectiveWaterlineLevels.map((wl) => Number((wl.draftFraction * T).toFixed(3)))
        ])
      ).sort((a, b) => a - b);

      // Keep the projected waterline endpoints on the same editable curve
      // as the hull path. Mixing persisted waterline values with local draft
      // ordinates leaves visible gaps while a Station 10 point is dragged.
      const getStation10CurveOrdinate = (z: number) => {
        const curveZ = station10CurveSteps.length > 0
          ? station10CurveSteps.reduce((closest, step) =>
              Math.abs(step - z) < Math.abs(closest - z) ? step : closest,
              station10CurveSteps[0]
            )
          : Number(z.toFixed(3));
        const matchingWl = effectiveWaterlineLevels.find(
          (wl) => Math.abs(wl.draftFraction * T - curveZ) < 0.05
        );

        return draftOrdinates[curveZ] !== undefined
          ? draftOrdinates[curveZ]
          : matchingWl
          ? getWlHalfB(matchingWl.id, curveZ)
          : getTheoreticalOrdinateAtZ(curveZ, calculatedRadius);
      };

      const curvePts = station10DisplaySteps.map((z) => {
        const val = getStation10CurveOrdinate(z);

        return {
          z,
          x: ox + val * scaleX,
          y: oy - z * scaleZ,
          isBilge: z <= R + 0.001
        };
      });

      // Station 10 is ordered by draft (vertical axis), so use the
      // transverse interpolator. The horizontal interpolator can reverse
      // its control handles when a bilge ordinate moves inward.
      const smoothCurve = getSmoothTransversePathD(curvePts);
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
          <path d={subHullPath} fill={engineeringColor("rgba(56, 189, 248, 0.08)")} />
          <path
            d={hullPath}
            fill={engineeringColor(isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)")}
            stroke={engineeringColor("#06b6d4")}
            strokeWidth="1.2"
          />

          {isFullHullView && (
            <g transform={`translate(${2 * ox}, 0) scale(-1, 1)`}>
              <path d={subHullPath} fill={engineeringColor("rgba(56, 189, 248, 0.08)")} />
              <path
                d={hullPath}
                fill={engineeringColor(isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)")}
                stroke={engineeringColor("#06b6d4")}
                strokeWidth="1.2"
              />
            </g>
          )}

          {!isPreviewMode &&
            effectiveWaterlineLevels.map((wl) => {
              const z = wl.draftFraction * T;
              const yPos = oy - z * scaleZ;
              const b_mid = getStation10CurveOrdinate(z);
              const midPtX = ox + b_mid * scaleX;
              const mirroredPtX = ox - b_mid * scaleX;
              const isActive = wl.id === activeWlId;
              const isDragging = draggingWlId === wl.id;
              const isHovered = hoverWlId === wl.id || isDragging;

              return (
                <g
                  key={`wl-proj-${wl.id}`}
                  className="transition-colors duration-150 cursor-pointer"
                  onClick={() => onSelectWlId?.(wl.id)}
                >
                  <line
                    x1={isFullHullView ? mirroredPtX : ox}
                    y1={yPos}
                    x2={midPtX}
                    y2={yPos}
                    stroke={engineeringColor(isActive ? "#38bdf8" : wl.color)}
                    strokeWidth={isActive ? "0.9" : "0.5"}
                    opacity={isActive ? 1.0 : 0.85}
                  />

                  {isActive && (
                    <circle
                      cx={midPtX}
                      cy={yPos}
                      r="2.6"
                      fill="none"
                      stroke={engineeringColor("#38bdf8")}
                      strokeWidth="0.5"
                      opacity="0.85"
                      strokeDasharray="none"
                    />
                  )}

                  <circle
                    cx={midPtX}
                    cy={yPos}
                    r={isActive ? "1.4" : isHovered ? "1.2" : "0.95"}
                    fill={engineeringColor(isActive ? "#38bdf8" : wl.color)}
                    stroke={engineeringColor("#ffffff")}
                    strokeWidth={isActive ? "0.4" : "0.25"}
                    className="cursor-ew-resize"
                    onPointerDown={(e) => handleWlPointerDown(e, wl.id, z)}
                    onPointerEnter={() => setHoverWlId(wl.id)}
                    onPointerLeave={() => setHoverWlId(null)}
                  >
                    <title>{`${wl.name} (Z = ${z.toFixed(2)} m) -> 0.5B Midship = ${b_mid.toFixed(3)} m (Klik & Geser Kiri-Kanan)`}</title>
                  </circle>

                  {isFullHullView && (
                    <circle
                      cx={mirroredPtX}
                      cy={yPos}
                      r={isActive ? "1.4" : "0.95"}
                      fill={engineeringColor(isActive ? "#38bdf8" : wl.color)}
                      stroke={engineeringColor("#ffffff")}
                      strokeWidth="0.25"
                      className="opacity-75"
                    />
                  )}
                </g>
              );
            })}

          {!isPreviewMode && (
            <>
              <line x1={ox} y1="4" x2={ox} y2={oy + 8} stroke={engineeringColor("#64748b")} strokeWidth="0.8" />
              <text x={ox - 2} y="7" fill={engineeringColor("#64748b", "text")} fontSize="2.8" textAnchor="end" fontFamily="monospace" fontWeight="bold">
                CL
              </text>

              <line
                x1={isFullHullView ? ox - halfB * scaleX - 10 : ox - 10}
                y1={oy}
                x2={outerX + 16}
                y2={oy}
                stroke={engineeringColor("#64748b")}
                strokeWidth="0.8"
              />
            </>
          )}
        </g>
      );
    }

    // Default 'bodyPlan' Mode: Full Canvas NS Savannah Style Transverse Sections
    return (
      <g>
        {renderBodyPlanSvg(100, 142, 82 / (halfB || 7.5), 104 / Math.max(H, 7.0))}
      </g>
    );
  };

  return (
    <div className={compact ? "w-full flex flex-col flex-1 min-h-0 h-full overflow-hidden" : "space-y-6"}>
      {/* ========================================================= */}
      {/* FULLSCREEN STUDIO OVERLAY FOR RADIUS BILGA & BODY PLAN     */}
      {/* ========================================================= */}
      {isFullscreenPlot && (
        <div className="fixed inset-0 z-50 bg-surface-inset flex flex-col p-2 sm:p-3 overflow-hidden select-none duration-200">
          <div className="w-full bg-surface-primary border border-border-default rounded-lg p-2.5 mb-2 space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="text-text-secondary shrink-0">
                  <Activity size={16} />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-semibold text-text-primary tracking-normal whitespace-nowrap">
                    Body Plan Studio &mdash; <span className="text-accent-primary">Station Sections & Bilge Radius</span>
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-selected text-accent-primary border border-border-default font-semibold whitespace-nowrap">
                    R = {R.toFixed(3)} m
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                {/* Handles Visibility Switcher */}
                <button
                  type="button"
                  onClick={() =>
                    setHandlesDisplayMode(
                      handlesDisplayMode === "active"
                        ? "all"
                        : handlesDisplayMode === "all"
                        ? "none"
                        : "active"
                    )
                  }
                  className={`px-2.5 py-1 rounded-md text-sm font-sans font-semibold transition-colors border cursor-pointer flex items-center space-x-1.5 ${
                    handlesDisplayMode === "all"
                      ? "bg-status-warning-subtle text-status-warning border-status-warning-border min-h-9"
                      : handlesDisplayMode === "active"
                      ? "bg-surface-selected text-accent-primary border-border-default min-h-9"
                      : "bg-surface-secondary text-text-secondary border-border-default hover:text-text-primary min-h-9"
                  } `}
                  title="Cycle through: Active WL only, All WLs, or No Points (Clean Curves)"
                 aria-label="Cycle through: Active WL only, All WLs, or No Points (Clean Curves)">
                  <span>
                    {handlesDisplayMode === "all"
                      ? "Points: All WLs"
                      : handlesDisplayMode === "active"
                      ? "Points: Active WL"
                      : "Points: Hidden"}
                  </span>
                  <span className="text-xs px-1 rounded bg-surface-primary font-semibold">
                    {handlesDisplayMode === "all"
                      ? `${effectiveWaterlineLevels.length * activeStationsConfig.length}`
                      : handlesDisplayMode === "active"
                      ? `${activeStationsConfig.length}`
                      : "0"}
                  </span>
                </button>

                {/* Mode Switcher Pills */}
                <div className="flex items-center bg-surface-inset p-0.5 rounded-lg border border-border-default text-sm font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(true);
                      setStudioMode("bodyPlan");
                    }}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      studioMode === "bodyPlan"
                        ? "bg-accent-primary text-on-accent min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                  >
                    Body Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode("xyzTable")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      studioMode === "xyzTable"
                        ? "bg-accent-primary text-on-accent min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                  >
                    XYZ Offsets Table
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(false);
                      setStudioMode("midshipDetail");
                    }}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      studioMode === "midshipDetail"
                        ? "bg-accent-primary text-on-accent min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                  >
                    Station 10 Section
                  </button>
                </div>

                {/* Actions */}
                <button
                  onClick={handleAutoFineTune}
                  className="px-2.5 py-1.5 text-on-accent rounded-md font-sans text-sm font-semibold transition-colors flex items-center space-x-1 cursor-pointer bg-accent-primary min-h-9"
                  title="Automatically fair and balance the curve until the deviation is <= ±0.05%"
                 aria-label="Automatically fair and balance the curve until the deviation is <= ±0.05%">
                  <Wand2 size={13} />
                  <span>Auto-Fit</span>
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 bg-surface-secondary hover:bg-surface-secondary text-text-primary hover:text-text-primary rounded-md transition-colors cursor-pointer min-h-9"
                  title="Reset ke Posisi Desain Awal"
                 aria-label="Reset ke Posisi Desain Awal">
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    isPreviewMode
                      ? "bg-status-warning-subtle border border-status-warning-border text-status-warning min-h-9"
                      : "bg-surface-secondary hover:bg-surface-secondary text-text-primary hover:text-accent-primary min-h-9"
                  } `}
                  title={isPreviewMode ? "Show construction guides (Edit Mode)" : "Hide construction guides (Preview Mode)"}
                 aria-pressed={isPreviewMode} aria-label={isPreviewMode ? "Show construction guides (Edit Mode)" : "Hide construction guides (Preview Mode)"}>
                  {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => setIsFullscreenPlot(false)}
                  className="p-1.5 bg-status-danger-subtle hover:bg-status-danger border border-status-danger-border text-status-danger hover:text-text-primary rounded-md transition-colors cursor-pointer ml-1 min-h-9"
                  title="Tutup Mode Layar Penuh (Esc)"
                 aria-label="Tutup Mode Layar Penuh (Esc)">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Station Count Presets & Custom Station Bar in Fullscreen */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-border-default text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono text-text-secondary mr-1 font-semibold flex items-center space-x-1">
                  <SlidersHorizontal size={12} className="text-accent-primary" />
                  <span>Jumlah Gading:</span>
                </span>
                {[
                  { id: "11" as const, label: "11 Gading", desc: "11 Gading Utama (Interval 2: 0, 2, 4... 20)" },
                  { id: "21" as const, label: "21 Gading (Std)", desc: "21 Gading Standar (AP - FP, Interval 1.0)" },
                ].map((p) => {
                  const isActive = stationPreset === p.id;
                  return (
                    <button
                      key={`fs-st-preset-${p.id}`}
                      type="button"
                      onClick={() => handleSelectStationPreset(p.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-sans font-semibold transition-colors border cursor-pointer ${
                        isActive
                          ? "bg-accent-primary text-on-accent border-accent-primary shadow-xs font-bold"
                          : "bg-surface-inset text-text-secondary border-border-default hover:text-text-primary hover:bg-surface-secondary"
                      }`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  );
                })}

                {/* Kostum Gading Button */}
                <button
                  type="button"
                  onClick={openCustomStationModal}
                  className={`px-2.5 py-1 rounded-md text-xs font-sans font-semibold transition-colors border cursor-pointer flex items-center space-x-1 ${
                    stationPreset === "custom"
                      ? "bg-accent-primary text-on-accent border-accent-primary shadow-xs font-bold"
                      : "bg-surface-inset text-accent-primary border-border-default hover:bg-surface-secondary"
                  }`}
                  title="Kostum mau berapa gading atau pilih gading tertentu"
                >
                  <Settings2 size={12} />
                  <span>Kostum Gading{stationPreset === "custom" ? ` (${activeStationsConfig.length})` : "..."}</span>
                </button>
              </div>

              {/* Quick stats / summary */}
              <div className="flex items-center space-x-2 font-mono text-xs text-text-secondary">
                <span>Aktif: <strong className="text-text-primary">{activeStationsConfig.length}</strong> gading</span>
                <span className="text-text-primary">•</span>
                <span>Tampil: <strong className="text-accent-primary">{visibleStationCount}</strong> gading</span>
              </div>
            </div>

            {/* Station Quick-Switch & Visibility Ribbon in Fullscreen */}
            {studioMode === "bodyPlan" && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-border-default text-xs">
                {/* Direct Section Dropdown & Stepper */}
                <div className="flex items-center space-x-1.5 bg-surface-primary border border-border-default rounded-md px-2 py-0.5 shrink-0">
                  <span className="text-[11px] font-mono text-text-secondary font-semibold">Pilih:</span>
                  <select
                    value={activeStation}
                    onChange={(e) => handleStationChipClick(parseFloat(e.target.value))}
                    className="bg-surface-canvas text-accent-primary font-mono text-xs font-bold border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                    title="Pilih section / gading yang mau diedit langsung"
                  >
                    {activeStationsConfig.map((cfg) => {
                      const isAfter = cfg.station <= 10.0;
                      const side = isAfter ? "Buritan" : "Haluan";
                      return (
                        <option key={`fs-sel-st-${cfg.station}`} value={cfg.station}>
                          Gading {getStationDisplayLabel(cfg.station)} — {side}
                        </option>
                      );
                    })}
                  </select>

                  <div className="flex items-center space-x-0.5 border-l border-border-default pl-1">
                    <button
                      type="button"
                      onClick={() => handleStepStation(-1)}
                      disabled={activeStationIndex <= 0}
                      className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                      title="Gading sebelumnya"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepStation(1)}
                      disabled={activeStationIndex >= activeStationsConfig.length - 1}
                      className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                      title="Gading berikutnya"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-slate-800 flex-1 min-w-0">
                  <span className="text-xs font-mono text-text-secondary font-semibold flex items-center space-x-1 shrink-0 pr-1">
                    <Layers size={12} className="text-accent-primary" />
                    <span>Semua Gading ({activeStationsConfig.length}):</span>
                  </span>
                  {activeStationsConfig.map((cfg) => {
                    const st = cfg.station;
                    const isActive = Math.abs(activeStation - st) < 1e-6;
                    const isVisible = isStVisible(st);
                    const label = getStationDisplayLabel(st);

                    return (
                      <div
                        key={`fs-station-chip-${st}`}
                        className={`inline-flex items-center rounded-md text-xs font-mono transition-all border shrink-0 ${
                          isActive
                            ? "bg-accent-primary text-on-accent border-accent-primary font-bold shadow-xs ring-1 ring-focus-ring"
                            : isVisible
                            ? "bg-surface-inset text-text-primary border-border-default hover:bg-surface-secondary hover:border-border-strong font-medium"
                            : "bg-surface-inset/50 text-text-tertiary border-dashed border-border-subtle hover:bg-surface-inset opacity-60"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleStationChipClick(st)}
                          className="px-2 py-0.5 flex items-center space-x-1 cursor-pointer"
                          title={`Pilih Gading ${label}`}
                        >
                          <span>St {label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStationVisibility(st);
                          }}
                          className="p-0.5 pr-1.5 hover:text-accent-primary transition-colors cursor-pointer"
                          title={isVisible ? `Sembunyikan Gading ${label}` : `Tampilkan Gading ${label}`}
                        >
                          {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center space-x-1 bg-surface-inset p-0.5 rounded-md border border-border-default">
                    <button
                      type="button"
                      onClick={showAllStations}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={showOnlyActiveStation}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Hanya Aktif
                    </button>
                    <button
                      type="button"
                      onClick={showAfterbodyStations}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Buritan
                    </button>
                    <button
                      type="button"
                      onClick={showForebodyStations}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Haluan
                    </button>
                  </div>
                  <div className="font-mono text-[11px] bg-surface-selected/60 border border-border-default px-2 py-0.5 rounded text-text-secondary">
                    Gading <strong className="text-accent-primary">{getStationDisplayLabel(activeStation)}</strong> &bull;{" "}
                    <strong>{visibleStationCount}</strong>/{activeStationsConfig.length}
                  </div>
                </div>

                {/* PHASE 3: Precision CAD Nudge & Reset Toolbar in Fullscreen */}
                <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/70 bg-surface-inset/40 px-2 py-1 rounded-md">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-text-secondary font-medium flex items-center space-x-1.5">
                      <span>Edit Section:</span>
                      <select
                        value={activeStation}
                        onChange={(e) => handleStationChipClick(parseFloat(e.target.value))}
                        className="bg-surface-primary text-accent-primary font-mono text-xs font-bold border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                        title="Pilih section / gading yang ingin diedit"
                      >
                        {activeStationsConfig.map((cfg) => {
                          const isAfter = cfg.station <= 10.0;
                          const side = isAfter ? "Buritan" : "Haluan";
                          return (
                            <option key={`fs-cad-st-${cfg.station}`} value={cfg.station}>
                              Gading {getStationDisplayLabel(cfg.station)} ({side})
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex items-center space-x-0.5">
                        <button
                          type="button"
                          onClick={() => handleStepStation(-1)}
                          disabled={activeStationIndex <= 0}
                          className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                          title="Gading sebelumnya"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepStation(1)}
                          disabled={activeStationIndex >= activeStationsConfig.length - 1}
                          className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                          title="Gading berikutnya"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                      <span>@ Elevasi:</span>
                      <select
                        value={activeWlId}
                        onChange={(e) => onSelectWlId?.(e.target.value)}
                        className="bg-surface-primary text-text-primary border border-border-default rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                        title="Pilih elevasi Z / garis air yang diedit pada gading ini"
                      >
                        {effectiveWaterlineLevels.map((w) => {
                          const zVal = w.draftFraction * T;
                          return (
                            <option key={w.id} value={w.id}>
                              {w.shortName} ({zVal.toFixed(2)}m)
                            </option>
                          );
                        })}
                      </select>
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-text-secondary font-mono text-[11px]">0.5B:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={(halfB * 1.15).toFixed(2)}
                        value={(getStationHalfB(activeStation, activeWlId, (effectiveWaterlineLevels.find(w => w.id === activeWlId)?.draftFraction ?? 1.0) * T)).toFixed(3)}
                        onChange={(e) => handleDirectStationHalfBChange(e.target.value)}
                        className="w-20 px-2 py-0.5 text-xs font-mono bg-surface-primary border border-border-default rounded text-text-primary font-semibold text-center focus:outline-none focus:ring-1 focus:ring-focus-ring"
                      />
                      <span className="text-text-secondary text-xs">m</span>
                    </div>
                    <div className="flex items-center space-x-0.5 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(-0.1)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Kurangi 0.1 meter"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(-0.01)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Kurangi 0.01 meter (1 cm)"
                      >
                        -0.01
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(0.01)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Tambah 0.01 meter (1 cm)"
                      >
                        +0.01
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(0.1)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Tambah 0.1 meter"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setLockPmb(!lockPmb)}
                      className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors border cursor-pointer flex items-center space-x-1 ${
                        lockPmb
                          ? "bg-surface-selected text-accent-primary border-border-default font-semibold shadow-2xs"
                          : "bg-surface-secondary text-text-secondary border-border-default hover:text-text-primary"
                      }`}
                      title={lockPmb ? "Kunci PMB Aktif: Edit Gading 10 otomatis selaras ke Gading 6-15" : "Kunci PMB Bebas: Tiap gading dapat diedit mandiri"}
                    >
                      <span>Kunci PMB (St 6–15):</span>
                      <strong className={lockPmb ? "text-accent-primary" : "text-text-secondary"}>{lockPmb ? "ON" : "OFF"}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCurrentStation}
                      className="px-2 py-0.5 bg-surface-secondary hover:bg-status-danger-subtle text-text-secondary hover:text-status-danger border border-border-default rounded text-[11px] font-sans font-medium transition-colors cursor-pointer flex items-center space-x-1"
                      title="Kembalikan ordinat gading ini ke rancangan teoritis FairingEngine"
                    >
                      <RotateCcw size={11} />
                      <span>Reset Gading</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Canvas or XYZ Table */}
          <div className="flex-1 w-full min-h-0 bg-surface-primary rounded-lg border border-border-default relative overflow-hidden flex flex-col items-center justify-center p-1 sm:p-2.5">
            {studioMode === "xyzTable" ? (
              renderXyzTableContent(false)
            ) : (
              <>
                {draggingStation !== null && draggingWlId ? (
                  <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 border border-status-warning-border px-3.5 py-1.5 rounded-full font-mono text-sm text-status-warning bg-accent-primary">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-warning-subtle animate-ping" />
                    <span>
                      Menggeser Gading <strong>{getStationDisplayLabel(draggingStation)}</strong> @{" "}
                      <strong>{effectiveWaterlineLevels.find((w) => w.id === draggingWlId)?.shortName || draggingWlId}</strong>{" "}
                      (Z = {(draggingDraft ?? 0).toFixed(2)}m):{" "}
                      <strong className="text-text-primary text-sm">
                        0.5 B = {(waterlinesData?.[draggingWlId]?.[draggingStation] ?? 0).toFixed(3)} m
                      </strong>
                    </span>
                  </div>
                ) : hoveredStation !== null ? (
                  <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-surface-primary border border-border-default px-3 py-1 rounded-full font-mono text-sm text-accent-primary pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-surface-selected" />
                    <span>
                      Gading <strong>{getStationDisplayLabel(hoveredStation)}</strong>
                      {hoverWlId
                        ? ` @ ${effectiveWaterlineLevels.find((w) => w.id === hoverWlId)?.shortName || hoverWlId} (Z = ${(hoverDraft ?? 0).toFixed(2)}m)`
                        : ""}:{" "}
                      <strong className="text-text-primary">
                        0.5 B = {(getStationHalfB(
                          hoveredStation,
                          hoverWlId || activeWlId,
                          hoverDraft ?? (effectiveWaterlineLevels.find((w) => w.id === (hoverWlId || activeWlId))?.draftFraction ?? 1.0) * T
                        )).toFixed(3)} m
                      </strong>
                    </span>
                  </div>
                ) : null}

                <svg
                  ref={svgRef}
                  className="w-full h-full select-none cursor-crosshair"
                  viewBox={studioMode === "bodyPlan" ? bodyPlanViewBox : studioMode === "midshipDetail" ? "28 10 100 80" : "0 0 200 144"}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ touchAction: "none" }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                  <defs>
                    <pattern id="cadGridFs" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke={engineeringColor("#1e293b")} strokeWidth="0.3" />
                    </pattern>
                    <pattern
                      id="waterHatch"
                      width="4"
                      height="4"
                      patternTransform="rotate(45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line x1="0" y1="0" x2="0" y2="4" stroke={engineeringColor("#0284c7")} strokeWidth="0.4" strokeOpacity="0.25" />
                    </pattern>
                    <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#f59e0b")} />
                    </marker>
                    <marker id="arrowIndigo" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#c7d2fe")} />
                    </marker>
                    <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#2dd4bf")} />
                    </marker>
                  </defs>

                  {/* Blank canvas background */}
                  {renderMidshipSvgContent()}
                </svg>
              </>
            )}
          </div>

          <div className="w-full flex items-center justify-between pt-1 px-1 text-xs font-mono text-text-secondary shrink-0">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-surface-selected" />
              <span>
                Jumlah station ({activeStationsConfig.length} gading) dan waterline ({effectiveWaterlineLevels.length} garis air) &bull;{" "}
                <span className="text-accent-primary font-semibold">
                  {handlesDisplayMode === "all"
                    ? `${effectiveWaterlineLevels.length * activeStationsConfig.length} Titik Kontrol Interaktif (Semua Garis Air)`
                    : `${activeStationsConfig.length} Titik Kontrol Interaktif (Garis Air Aktif)`}
                </span>{" "}
                selaras 100% dengan Waterline Plan &amp; 3D Offsets.
              </span>
            </span>
            <span className="text-text-secondary">NS Savannah Lines Plan Body Plan</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMBEDDED VIEW: HEADER TITLE BLOCK & PARTICULARS MATRIX     */}
      {/* ========================================================= */}
      {!visualOnly && (
        <div className="bg-surface-primary border border-border-default rounded-lg p-5 md:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border-default pb-4 gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="text-text-secondary shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary tracking-tight">
                      {language === "en"
                        ? "Body Plan Transverse Sections & Bilge Radius Studio"
                        : "Body Plan Penampang Gading Melintang & Radius Bilga"}
                    </h2>
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        isCorrectionValid
                          ? "bg-status-success-subtle text-status-success border-status-success-border"
                          : "bg-status-danger-subtle text-status-danger border-status-danger-border"
                      } `}
                    >
                      {isCorrectionValid ? "WITHIN TOLERANCE (≤ ±0.05%)" : "ADJUSTMENT REQUIRED"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Transverse Station Sections ({activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines) Bidirectionally Synchronized with the Waterplane Plan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowParticulars(!showParticulars)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border bg-surface-secondary hover:bg-surface-secondary text-text-primary border-border-default cursor-pointer min-h-9"
               aria-pressed={showParticulars}>
                {showParticulars ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
                <span>{showParticulars ? "Hide" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border bg-surface-secondary hover:bg-surface-secondary text-accent-primary border-border-default cursor-pointer min-h-9"
                title="Download midship integration data as CSV"
               aria-label="Download midship integration data as CSV">
                <Download size={14} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {showParticulars && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">Breadth B (m)</span>
                  <span className="text-sm font-semibold text-text-primary font-mono">{B.toFixed(2)} m</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">0.5 B (m)</span>
                  <span className="text-sm font-semibold text-accent-primary font-mono">{halfB.toFixed(3)} m</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">Draft T (m)</span>
                  <span className="text-sm font-semibold text-text-primary font-mono">{T.toFixed(2)} m</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">Depth H (m)</span>
                  <span className="text-sm font-semibold text-text-primary font-mono">{H.toFixed(2)} m</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">Midship Coefficient Cm</span>
                  <span className="text-sm font-semibold text-status-warning font-mono">{Cm.toFixed(3)}</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-accent-primary tracking-normal block">Bilge Radius (R)</span>
                  <span className="text-sm font-semibold text-accent-primary font-mono">{R.toFixed(4)} m</span>
                </div>
                <div className="border-b border-border-subtle py-3 min-w-0">
                  <span className="text-xs font-mono text-text-secondary tracking-normal block">Flat of Bottom</span>
                  <span className="text-sm font-semibold text-text-primary font-mono">{flatOfBottom.toFixed(4)} m</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-default text-sm font-mono">
                <div className="flex items-center space-x-3 text-text-secondary">
                  <span>
                    Am Target: <strong className="text-text-primary">{Am_rancangan.toFixed(2)} m²</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Am Hitung: <strong className="text-accent-primary">{Am_calc.toFixed(2)} m²</strong>
                  </span>
                </div>

                <div
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-semibold ${
                    isCorrectionValid
                      ? "bg-status-success-subtle border-status-success-border text-status-success"
                      : "bg-status-danger-subtle border-status-danger-border text-status-danger"
                  } `}
                >
                  {isCorrectionValid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>
                    Midship Area Correction: {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`} (Maximum ±0.05%)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* BILGE GEOMETRY & BODY PLAN CAD BLUEPRINT VISUAL           */}
      {/* ========================================================= */}
      {!tablesOnly && (
        <div className={`w-full flex flex-col ${
          compact ? "p-0 space-y-1 flex-1 min-h-0 h-full border-0 bg-transparent overflow-hidden" : "bg-surface-primary border border-border-default rounded-lg p-5 space-y-4"
        } `}>
          {/* Header Bar: Sleek Unified Studio Control */}
          {compact ? (
            /* SLIM UNIFIED COCKPIT TOOLBAR (Single clean row, ~36px) */
            <div className="bg-surface-secondary/70 border border-border-default rounded-md px-2 py-1 flex items-center justify-between gap-1.5 shrink-0 select-none text-xs">
              {/* Left: Section Selector, Stepper, Elevation & 0.5B */}
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="text-[11px] font-mono text-text-secondary font-semibold shrink-0">Gading:</span>
                <select
                  value={activeStation}
                  onChange={(e) => handleStationChipClick(parseFloat(e.target.value))}
                  className="bg-surface-canvas text-accent-primary font-mono text-xs font-bold border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer max-w-[95px]"
                >
                  {activeStationsConfig.map((cfg) => (
                    <option key={`c-st-${cfg.station}`} value={cfg.station}>
                      St. {getStationDisplayLabel(cfg.station)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center space-x-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStepStation(-1)}
                    disabled={activeStationIndex <= 0}
                    className="p-0.5 hover:bg-surface-primary text-text-secondary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                    title="Gading Sebelumnya"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepStation(1)}
                    disabled={activeStationIndex >= activeStationsConfig.length - 1}
                    className="p-0.5 hover:bg-surface-primary text-text-secondary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                    title="Gading Berikutnya"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>

                <span className="text-border-default hidden sm:inline">|</span>

                {/* Elevation selector */}
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-text-secondary font-mono text-[11px]">Z:</span>
                  <select
                    value={activeWlId}
                    onChange={(e) => onSelectWlId?.(e.target.value)}
                    className="bg-surface-canvas text-text-primary border border-border-default rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer max-w-[85px]"
                  >
                    {effectiveWaterlineLevels.map((w) => (
                      <option key={`c-wl-elev-${w.id}`} value={w.id}>
                        {w.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 0.5B Input & Nudge */}
                <div className="flex items-center space-x-1 font-mono text-xs bg-surface-primary px-1.5 py-0.5 rounded border border-border-default shrink-0">
                  <span className="text-text-secondary text-[11px]">0.5B:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={(halfB * 1.15).toFixed(2)}
                    value={(getStationHalfB(activeStation, activeWlId, (effectiveWaterlineLevels.find(w => w.id === activeWlId)?.draftFraction ?? 1.0) * T)).toFixed(3)}
                    onChange={(e) => handleDirectStationHalfBChange(e.target.value)}
                    className="w-16 px-1 py-0.5 text-xs font-mono bg-surface-canvas border border-border-default rounded text-accent-primary font-bold text-center focus:outline-none focus:ring-1 focus:ring-focus-ring"
                  />
                  <div className="flex items-center space-x-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleNudgeStationHalfB(-0.01)}
                      className="px-1 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary cursor-pointer"
                      title="-1 cm"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeStationHalfB(0.01)}
                      className="px-1 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary cursor-pointer"
                      title="+1 cm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: PMB Lock, Buttock, Reset */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setLockPmb(!lockPmb)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-sans border cursor-pointer flex items-center space-x-1 ${
                    lockPmb
                      ? "bg-surface-selected text-accent-primary border-border-default font-semibold"
                      : "bg-surface-primary text-text-secondary border-border-default hover:text-text-primary"
                  }`}
                  title={lockPmb ? "Kunci PMB Aktif (St 6–15)" : "Kunci PMB Bebas"}
                >
                  <span>PMB:</span>
                  <strong className={lockPmb ? "text-accent-primary" : "text-text-secondary"}>{lockPmb ? "ON" : "OFF"}</strong>
                </button>

                <button
                  type="button"
                  onClick={() => setShowButtocks(!showButtocks)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-sans border cursor-pointer ${
                    showButtocks
                      ? "bg-surface-selected text-accent-primary border-border-default font-semibold"
                      : "bg-surface-primary text-text-secondary border-border-default hover:text-text-primary"
                  }`}
                  title="Tampilkan garis buttock"
                >
                  Buttock
                </button>

                <button
                  type="button"
                  onClick={handleResetCurrentStation}
                  className="p-1 text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle rounded border border-border-default cursor-pointer"
                  title="Reset gading aktif ke kurva teoritis"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>
          ) : (
          <div className="bg-surface-canvas border border-border-default rounded-lg p-1.5 select-none shrink-0 space-y-1.5">
            {/* TIER 1: Primary Controls & Actions Bar */}
            <div className="flex flex-nowrap items-center justify-between gap-1.5 overflow-x-auto">
              {/* Left Group: View Mode Switcher + Waterline Presets */}
              <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="flex items-center space-x-1.5 overflow-x-auto shrink-0">
                {/* Mode Segmented Control */}
                <div className="flex items-center bg-surface-primary p-1 rounded-lg border border-border-default shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(true);
                      setStudioMode("bodyPlan");
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-sans font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "bodyPlan"
                        ? "text-on-accent bg-accent-primary min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                    title="Body Plan view"
                   aria-label="Body Plan view">
                    <span>Body Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode("xyzTable")}
                    className={`px-3 py-1.5 rounded-md text-sm font-sans font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "xyzTable"
                        ? "text-on-accent bg-accent-primary min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                    title="3D XYZ offsets table"
                   aria-label="3D XYZ offsets table">
                    <span>XYZ Offsets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(false);
                      setStudioMode("midshipDetail");
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-sans font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "midshipDetail"
                        ? "text-on-accent bg-accent-primary min-h-9"
                        : "text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                    title="Station 10 midship detail"
                   aria-label="Station 10 midship detail">
                    <span>Station 10 Section</span>
                  </button>
                </div>
              </div>

              {/* Right Group: Accuracy Status + Auto-Fit + Reset + Controls */}
              <div className="flex items-center space-x-1 shrink-0">
                {/* Accuracy Status Badge */}
                <div
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                    isCorrectionValid
                      ? "bg-status-success-subtle border-status-success-border text-status-success"
                      : "bg-status-danger-subtle border-status-danger-border text-status-danger"
                  } `}
                  title={`Luas Midship Target: ${Am_rancangan.toFixed(2)} m² | Hasil Hitung: ${Am_calc.toFixed(2)} m²`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCorrectionValid ? "bg-status-success-subtle" : "bg-status-danger-subtle"} `} />
                  <span>Correction: {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}</span>
                  <span className="text-xs px-1 rounded bg-surface-primary text-text-secondary font-normal hidden sm:inline">
                    {isCorrectionValid ? "VALID" : "DEVIATION"}
                  </span>
                </div>

                {/* Auto-Fit Button */}
                <button
                  type="button"
                  onClick={handleAutoFineTune}
                  className="px-3 py-1.5 text-on-accent rounded-md font-sans text-sm font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ring-1 ring-status-success bg-accent-primary min-h-9"
                  title="Otomatis ratakan & seimbangkan kurva bilga (≤ ±0.05%)"
                 aria-label="Otomatis ratakan & seimbangkan kurva bilga (≤ ±0.05%)">
                  <Wand2 size={13} />
                  <span>Auto-Fit</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 bg-surface-inset hover:bg-surface-secondary text-text-secondary hover:text-text-primary rounded-md transition-colors cursor-pointer border border-border-default min-h-9"
                  title="Reset ordinat midship ke desain teoritis awal"
                 aria-label="Reset ordinat midship ke desain teoritis awal">
                  <RotateCcw size={14} />
                </button>

                {/* Handles Switcher */}
                <button
                  type="button"
                  onClick={() =>
                    setHandlesDisplayMode(
                      handlesDisplayMode === "active"
                        ? "all"
                        : handlesDisplayMode === "all"
                        ? "none"
                        : "active"
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-md text-sm font-sans font-semibold transition-colors border cursor-pointer flex items-center space-x-1 ${
                    handlesDisplayMode === "all"
                      ? "bg-status-warning-subtle text-status-warning border-status-warning-border min-h-9"
                      : handlesDisplayMode === "active"
                      ? "bg-surface-selected text-accent-primary border-border-default min-h-9"
                      : "bg-surface-inset text-text-secondary border-border-default hover:text-text-primary min-h-9"
                  } `}
                  title="Cycle handle visibility: Active WL / All WLs / Hidden"
                 aria-label="Cycle handle visibility: Active WL / All WLs / Hidden">
                  <span>{handlesDisplayMode === "all" ? "All Points" : handlesDisplayMode === "active" ? "Active WL" : "Clean Curves"}</span>
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenPlot(true)}
                  className="p-1.5 bg-surface-inset hover:bg-surface-selected text-text-secondary hover:text-accent-primary rounded-md transition-colors cursor-pointer border border-border-default hover:border-border-default min-h-9"
                  title="Open fullscreen"
                 aria-label="Open fullscreen">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* TIER 2: Station Count Presets & Custom Station Bar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-default">
              <div tabIndex={0} role="region" aria-label="Preset dan Kostum Jumlah Gading" className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                <span className="text-xs font-mono text-text-secondary font-semibold flex items-center space-x-1 shrink-0 pr-1">
                  <SlidersHorizontal size={12} className="text-accent-primary" />
                  <span>Jumlah Gading:</span>
                </span>
                {[
                  { id: "11" as const, label: "11", desc: "11 Gading Utama (Interval 2)" },
                  { id: "21" as const, label: "21 (Std)", desc: "21 Gading Standar (AP - FP, Interval 1.0)" },
                ].map((p) => {
                  const isActive = stationPreset === p.id;
                  return (
                    <button
                      key={`emb-st-preset-${p.id}`}
                      type="button"
                      onClick={() => handleSelectStationPreset(p.id)}
                      className={`px-2 py-0.5 rounded-md text-xs font-sans font-semibold transition-colors border cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-accent-primary text-on-accent border-accent-primary shadow-xs font-bold"
                          : "bg-surface-inset text-text-secondary border-border-default hover:text-text-primary hover:bg-surface-secondary"
                      }`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  );
                })}

                {/* Kostum Gading Button */}
                <button
                  type="button"
                  onClick={openCustomStationModal}
                  className={`px-2 py-0.5 rounded-md text-xs font-sans font-semibold transition-colors border cursor-pointer shrink-0 flex items-center space-x-1 ${
                    stationPreset === "custom"
                      ? "bg-accent-primary text-on-accent border-accent-primary shadow-xs font-bold"
                      : "bg-surface-inset text-accent-primary border-border-default hover:bg-surface-secondary"
                  }`}
                  title="Kostum mau berapa gading atau pilih gading tertentu"
                >
                  <Settings2 size={11} />
                  <span>Kostum Gading{stationPreset === "custom" ? ` (${activeStationsConfig.length})` : "..."}</span>
                </button>
              </div>

              {/* Quick Vessel Parameters Strip */}
              <div className="hidden lg:flex items-center space-x-2 font-mono text-xs text-text-secondary shrink-0 bg-surface-primary px-2.5 py-1 rounded-lg border border-border-default">
                <span>B: <strong className="text-text-primary">{B.toFixed(1)}m</strong></span>
                <span className="text-text-primary">•</span>
                <span>T: <strong className="text-text-primary">{T.toFixed(1)}m</strong></span>
                <span className="text-text-primary">•</span>
                <span>R: <strong className="text-accent-primary">{R.toFixed(2)}m</strong></span>
                <span className="text-text-primary">•</span>
                <span>Am: <strong className="text-status-success">{Am_calc.toFixed(1)}m²</strong></span>
              </div>
            </div>
            {/* TIER 3: Station Selection & Frame Visibility Ribbon (Body Plan Mode) */}
            {studioMode === "bodyPlan" && (
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border-default text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  {/* Direct Section Dropdown & Stepper */}
                  <div className="flex items-center space-x-1.5 bg-surface-primary border border-border-default rounded-md px-2 py-0.5 shrink-0">
                    <span className="text-[11px] font-mono text-text-secondary font-semibold">Pilih:</span>
                    <select
                      value={activeStation}
                      onChange={(e) => handleStationChipClick(parseFloat(e.target.value))}
                      className="bg-surface-canvas text-accent-primary font-mono text-xs font-bold border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                      title="Pilih section / gading yang mau diedit langsung"
                    >
                      {activeStationsConfig.map((cfg) => {
                        const isAfter = cfg.station <= 10.0;
                        const side = isAfter ? "Buritan" : "Haluan";
                        return (
                          <option key={`emb-sel-st-${cfg.station}`} value={cfg.station}>
                            Gading {getStationDisplayLabel(cfg.station)} — {side}
                          </option>
                        );
                      })}
                    </select>

                    <div className="flex items-center space-x-0.5 border-l border-border-default pl-1">
                      <button
                        type="button"
                        onClick={() => handleStepStation(-1)}
                        disabled={activeStationIndex <= 0}
                        className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                        title="Gading sebelumnya"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepStation(1)}
                        disabled={activeStationIndex >= activeStationsConfig.length - 1}
                        className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                        title="Gading berikutnya"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Station Chips Ribbon */}
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Pilih Gading Ribbon"
                    className="flex items-center space-x-1.5 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-slate-800 flex-1 min-w-0"
                  >
                    <span className="text-xs font-mono text-text-secondary font-semibold flex items-center space-x-1 shrink-0 pr-1">
                      <Layers size={12} className="text-accent-primary" />
                      <span>Semua Gading ({activeStationsConfig.length}):</span>
                    </span>
                    {activeStationsConfig.map((cfg) => {
                      const st = cfg.station;
                      const isActive = Math.abs(activeStation - st) < 1e-6;
                      const isVisible = isStVisible(st);
                      const label = getStationDisplayLabel(st);

                      return (
                        <div
                          key={`station-chip-${st}`}
                          className={`inline-flex items-center rounded-md text-xs font-mono transition-all border shrink-0 ${
                            isActive
                              ? "bg-accent-primary text-on-accent border-accent-primary font-bold shadow-xs ring-1 ring-focus-ring"
                              : isVisible
                              ? "bg-surface-inset text-text-primary border-border-default hover:bg-surface-secondary hover:border-border-strong font-medium"
                              : "bg-surface-inset/50 text-text-tertiary border-dashed border-border-subtle hover:bg-surface-inset opacity-60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleStationChipClick(st)}
                            className="px-2 py-0.5 flex items-center space-x-1 cursor-pointer"
                            title={`Pilih Gading ${label}`}
                            aria-label={`Gading ${label}`}
                          >
                            <span>St {label}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStationVisibility(st);
                            }}
                            className={`p-0.5 pr-1.5 hover:text-accent-primary transition-colors cursor-pointer ${
                              isVisible ? "text-text-secondary" : "text-text-tertiary"
                            }`}
                            title={isVisible ? `Sembunyikan Gading ${label}` : `Tampilkan Gading ${label}`}
                            aria-label={isVisible ? `Sembunyikan Gading ${label}` : `Tampilkan Gading ${label}`}
                          >
                            {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Visibility Filter Presets & Info Counter */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center space-x-1 bg-surface-inset p-0.5 rounded-md border border-border-default">
                      <button
                        type="button"
                        onClick={showAllStations}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          visibleStations === "all"
                            ? "bg-surface-primary text-accent-primary font-semibold shadow-2xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        title="Tampilkan semua gading"
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={showOnlyActiveStation}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          Array.isArray(visibleStations) && visibleStations.length === 1 && Math.abs(visibleStations[0] - activeStation) < 1e-6
                            ? "bg-surface-primary text-accent-primary font-semibold shadow-2xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        title="Hanya tampilkan gading yang aktif dipilih"
                      >
                        Hanya Aktif
                      </button>
                      <button
                        type="button"
                        onClick={showAfterbodyStations}
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Tampilkan gading buritan (Station 0–10)"
                      >
                        Buritan (0–10)
                      </button>
                      <button
                        type="button"
                        onClick={showForebodyStations}
                        className="px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Tampilkan gading haluan (Station 10–20)"
                      >
                        Haluan (10–20)
                      </button>
                    </div>

                    <div className="font-mono text-[11px] bg-surface-selected/60 border border-border-default px-2.5 py-1 rounded-md text-text-secondary">
                      Gading <strong className="text-accent-primary">{getStationDisplayLabel(activeStation)}</strong> &bull;{" "}
                      <strong className="text-text-primary">{visibleStationCount}</strong> dari {activeStationsConfig.length} tampil
                    </div>
                  </div>
                </div>

                {/* PHASE 3: Precision CAD Nudge & Reset Toolbar for Active Station */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/70 bg-surface-inset/40 px-2 py-1 rounded-md">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-text-secondary font-medium flex items-center space-x-1.5">
                      <span>Edit Section:</span>
                      <select
                        value={activeStation}
                        onChange={(e) => handleStationChipClick(parseFloat(e.target.value))}
                        className="bg-surface-primary text-accent-primary font-mono text-xs font-bold border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                        title="Pilih section / gading yang ingin diedit"
                      >
                        {activeStationsConfig.map((cfg) => {
                          const isAfter = cfg.station <= 10.0;
                          const side = isAfter ? "Buritan" : "Haluan";
                          return (
                            <option key={`emb-cad-st-${cfg.station}`} value={cfg.station}>
                              Gading {getStationDisplayLabel(cfg.station)} ({side})
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex items-center space-x-0.5">
                        <button
                          type="button"
                          onClick={() => handleStepStation(-1)}
                          disabled={activeStationIndex <= 0}
                          className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                          title="Gading sebelumnya"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepStation(1)}
                          disabled={activeStationIndex >= activeStationsConfig.length - 1}
                          className="p-0.5 hover:bg-surface-secondary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                          title="Gading berikutnya"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                      <span>@ Elevasi:</span>
                      <select
                        value={activeWlId}
                        onChange={(e) => onSelectWlId?.(e.target.value)}
                        className="bg-surface-primary text-text-primary border border-border-default rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                        title="Pilih elevasi Z / garis air yang diedit pada gading ini"
                      >
                        {effectiveWaterlineLevels.map((w) => {
                          const zVal = w.draftFraction * T;
                          return (
                            <option key={w.id} value={w.id}>
                              {w.shortName} ({zVal.toFixed(2)}m)
                            </option>
                          );
                        })}
                      </select>
                    </span>

                    {/* Numeric Input */}
                    <div className="flex items-center space-x-1">
                      <span className="text-text-secondary font-mono text-[11px]">0.5B:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={(halfB * 1.15).toFixed(2)}
                        value={(getStationHalfB(activeStation, activeWlId, (effectiveWaterlineLevels.find(w => w.id === activeWlId)?.draftFraction ?? 1.0) * T)).toFixed(3)}
                        onChange={(e) => handleDirectStationHalfBChange(e.target.value)}
                        className="w-20 px-2 py-0.5 text-xs font-mono bg-surface-primary border border-border-default rounded text-text-primary font-semibold text-center focus:outline-none focus:ring-1 focus:ring-focus-ring"
                      />
                      <span className="text-text-secondary text-xs">m</span>
                    </div>

                    {/* Step Nudge Buttons */}
                    <div className="flex items-center space-x-0.5 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(-0.1)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Kurangi 0.1 meter"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(-0.01)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Kurangi 0.01 meter (1 cm)"
                      >
                        -0.01
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(0.01)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Tambah 0.01 meter (1 cm)"
                      >
                        +0.01
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNudgeStationHalfB(0.1)}
                        className="px-1.5 py-0.5 bg-surface-secondary hover:bg-surface-selected border border-border-default rounded text-text-primary transition-colors cursor-pointer"
                        title="Tambah 0.1 meter"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* PMB Lock Toggle */}
                    <button
                      type="button"
                      onClick={() => setLockPmb(!lockPmb)}
                      className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors border cursor-pointer flex items-center space-x-1 ${
                        lockPmb
                          ? "bg-surface-selected text-accent-primary border-border-default font-semibold shadow-2xs"
                          : "bg-surface-secondary text-text-secondary border-border-default hover:text-text-primary"
                      }`}
                      title={lockPmb ? "Kunci PMB Aktif: Edit Gading 10 otomatis selaras ke Gading 6-15" : "Kunci PMB Bebas: Tiap gading dapat diedit mandiri"}
                    >
                      <span>Kunci PMB (St 6–15):</span>
                      <strong className={lockPmb ? "text-accent-primary" : "text-text-secondary"}>{lockPmb ? "ON" : "OFF"}</strong>
                    </button>

                    {/* Reset Station Button */}
                    <button
                      type="button"
                      onClick={handleResetCurrentStation}
                      className="px-2 py-0.5 bg-surface-secondary hover:bg-status-danger-subtle text-text-secondary hover:text-status-danger border border-border-default rounded text-[11px] font-sans font-medium transition-colors cursor-pointer flex items-center space-x-1"
                      title="Kembalikan ordinat gading ini ke rancangan teoritis FairingEngine"
                    >
                      <RotateCcw size={11} />
                      <span>Reset Gading</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
          )}

          {/* SVG Blueprint Canvas or XYZ Table in Embedded View */}
          {studioMode === "xyzTable" ? (
            renderXyzTableContent(false)
          ) : showVisualPlot ? (
            <div className={`bg-surface-canvas rounded-lg relative overflow-hidden border border-border-default flex items-center justify-center group select-none ${
              compact
                ? "w-full h-full flex-1 min-h-0 relative p-1.5"
                : "w-full h-96 sm:h-[440px] md:h-[480px] p-3"
            } `}>
              {/* Floating Blueprint Controls Overlay */}
              {!compact && (
                <div className="absolute top-2 right-2 z-20 flex items-center space-x-1 bg-surface-primary border border-border-default rounded-lg p-1">
                  {/* Readout Pill */}
                  <div className="flex items-center space-x-1.5 bg-surface-selected border border-border-default px-2.5 py-1 rounded-md font-mono text-xs">
                    <span className="text-accent-primary font-semibold">0.5B: <strong className="text-text-primary">{activeHoverHalfB.toFixed(2)}m</strong></span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-status-warning font-semibold">R: <strong className="text-text-primary">{R.toFixed(2)}m</strong></span>
                  </div>

                  {/* Buttock */}
                  <button
                    onClick={() => setShowButtocks(!showButtocks)}
                    className={`px-2 py-1 rounded text-sm font-sans font-medium transition-colors cursor-pointer flex items-center space-x-1 ${
                      showButtocks
                        ? "bg-surface-selected border border-border-default text-accent-primary min-h-9"
                        : "bg-surface-secondary hover:bg-surface-secondary text-text-secondary hover:text-text-primary min-h-9"
                    } `}
                    title="Show / hide buttock lines"
                   aria-pressed={showButtocks} aria-label="Show / hide buttock lines">
                    <Layers size={13} />
                    <span>Buttock</span>
                  </button>

                  {/* Edit / Preview Mode */}
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="p-1.5 hover:bg-surface-secondary rounded text-text-secondary hover:text-accent-primary transition-colors cursor-pointer min-h-9"
                    title={isPreviewMode ? "Show points & construction guides (Edit Mode)" : "Hide points & construction guides (Preview Mode)"}
                   aria-pressed={isPreviewMode} aria-label={isPreviewMode ? "Show points & construction guides (Edit Mode)" : "Hide points & construction guides (Preview Mode)"}>
                    {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={() => setIsFullscreenPlot(true)}
                    className="px-2 py-1 bg-surface-selected hover:bg-surface-selected border border-border-default text-accent-primary hover:text-accent-primary rounded text-sm font-sans font-medium transition-colors cursor-pointer flex items-center space-x-1 min-h-9"
                    title="Fullscreen"
                   aria-label="Fullscreen">
                    <Maximize size={13} />
                  </button>
                </div>
              )}

              {/* Dynamic HUD Coordinate Banner */}
              {draggingStation !== null && draggingWlId ? (
                <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 border border-status-warning-border px-3 py-1 rounded-full font-mono text-xs text-status-warning bg-accent-primary">
                  <span className="w-2 h-2 rounded-full bg-status-warning-subtle animate-ping" />
                  <span>
                    Moving Frame <strong>{getStationDisplayLabel(draggingStation)}</strong> @{" "}
                    <strong>{effectiveWaterlineLevels.find((w) => w.id === draggingWlId)?.shortName || draggingWlId}</strong>{" "}
                    (Z = {(draggingDraft ?? 0).toFixed(2)}m):{" "}
                    <strong className="text-text-primary text-sm">
                      0.5 B = {(waterlinesData?.[draggingWlId]?.[draggingStation] ?? 0).toFixed(3)} m
                    </strong>
                  </span>
                </div>
              ) : hoveredStation !== null ? (
                <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-surface-primary border border-border-default px-2.5 py-1 rounded-full font-mono text-xs text-accent-primary pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  <span>
                      Frame <strong>{getStationDisplayLabel(hoveredStation)}</strong>
                    {hoverWlId
                      ? ` @ ${effectiveWaterlineLevels.find((w) => w.id === hoverWlId)?.shortName || hoverWlId} (Z = ${(hoverDraft ?? 0).toFixed(2)}m)`
                      : ""}:{" "}
                    <strong className="text-text-primary">
                      0.5 B = {(getStationHalfB(
                        hoveredStation,
                        hoverWlId || activeWlId,
                        hoverDraft ?? (effectiveWaterlineLevels.find((w) => w.id === (hoverWlId || activeWlId))?.draftFraction ?? 1.0) * T
                      )).toFixed(3)} m
                    </strong>
                  </span>
                </div>
              ) : null}

              {/* Zoom Controls at bottom-right */}
              <div className="absolute right-3 bottom-3 flex items-center space-x-1 bg-surface-primary p-1 rounded-lg border border-border-default z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.75))}
                  className="p-1 hover:bg-surface-secondary text-text-secondary rounded transition-colors flex justify-center items-center cursor-pointer min-h-9"
                  title="Zoom Out"
                 aria-label="Zoom Out">
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 hover:bg-surface-secondary text-text-secondary rounded transition-colors text-sm font-sans font-semibold text-center cursor-pointer min-h-9"
                  title="Reset Zoom"
                 aria-label="Reset Zoom">
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(Number((z + 0.1).toFixed(2)), 3))}
                  className="p-1 hover:bg-surface-secondary text-text-secondary rounded transition-colors flex justify-center items-center cursor-pointer min-h-9"
                  title="Zoom In"
                 aria-label="Zoom In">
                  <ZoomIn size={14} />
                </button>
              </div>

              <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair transition-colors duration-300 ease-in-out select-none"
                viewBox={studioMode === "bodyPlan" ? bodyPlanViewBox : studioMode === "midshipDetail" ? "28 10 100 80" : "0 0 200 144"}
                preserveAspectRatio="xMidYMid meet"
                style={{ touchAction: "none" }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              >
                <defs>
                  <pattern id="cadGridEmbedded" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" className="stroke-border-subtle" strokeWidth="0.3" />
                  </pattern>
                  <pattern
                    id="waterHatch"
                    width="4"
                    height="4"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="4" stroke={engineeringColor("#0284c7")} strokeWidth="0.4" strokeOpacity="0.25" />
                  </pattern>
                  <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#f59e0b")} />
                  </marker>
                  <marker id="arrowIndigo" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#c7d2fe")} />
                  </marker>
                  <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill={engineeringColor("#2dd4bf")} />
                  </marker>
                </defs>

                {/* Blank canvas background */}
                {renderMidshipSvgContent()}
              </svg>
            </div>
          ) : (
            <div className="bg-surface-canvas border border-dashed border-border-default rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <div className="flex items-center space-x-3 text-text-secondary">
                <div className="text-text-secondary shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Plot Visual Body Plan Disembunyikan</span>
                  <p className="text-sm text-text-secondary font-sans mt-0.5">
                    {activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines &bull; R = {R.toFixed(4)} m &bull; Flat of Bottom = {flatOfBottom.toFixed(4)} m
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualPlot(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-surface-selected hover:bg-surface-selected text-accent-primary text-sm font-semibold border border-border-default transition-colors cursor-pointer shrink-0 min-h-9"
              >
                <Eye size={13} />
                <span>Buka Plot Visual</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: 3D OFFSET COORDINATES TABLE (X, Y, Z)            */}
      {/* ========================================================= */}
      {!visualOnly && (
        <div id="section-xyz-table" className="bg-surface-primary border border-border-default rounded-lg p-5 md:p-6 space-y-4 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="text-text-secondary shrink-0">
                <TableIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
                  <span>3D Offset Ordinates Table (X, Y, Z) for Body Plan Sections</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-selected text-accent-primary border border-border-default font-semibold">
                    {activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines
                  </span>
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  Koordinat 3D lengkap (X: Jarak dari AP/Midship, Y: Separuh Lebar 0.5B, Z: Sarat Vertikal) dari konversi garis air untuk penentuan lokasi gading di Body Plan.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowXyzTableSection(!showXyzTableSection)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border bg-surface-secondary hover:bg-surface-secondary text-text-primary border-border-default cursor-pointer min-h-9"
               aria-pressed={showXyzTableSection}>
                {showXyzTableSection ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
                <span>{showXyzTableSection ? "Hide Table" : "Show Table"}</span>
              </button>
            </div>
          </div>

          {showXyzTableSection && renderXyzTableContent(true)}
        </div>
      )}

      {/* ========================================================= */}
      {/* TABLE: STATION 10 DRAFT-WISE SIMPSON INTEGRATION          */}
      {/* ========================================================= */}
      {!visualOnly && (
        <>
          <div className="bg-surface-primary border border-border-default rounded-lg p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
                  <TableIcon size={16} className="text-accent-primary" />
                  <span>Station 10 Ordinate Integration by Draft (z)</span>
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  Integrasi ordinat separuh lebar gading 10 pada tiap level garis horizontal sarat air. Nilai 0.5 B (m) dapat diedit langsung atau ditarik pada grafik.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDraftIntegrationTable(!showDraftIntegrationTable)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-surface-secondary hover:bg-surface-secondary text-text-primary border border-border-default transition-colors cursor-pointer min-h-9"
                  title={showDraftIntegrationTable ? "Hide Table" : "Show Table"}
                 aria-pressed={showDraftIntegrationTable} aria-label={showDraftIntegrationTable ? "Hide Table" : "Show Table"}>
                  {showDraftIntegrationTable ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
                  <span>{showDraftIntegrationTable ? "Hide" : "Show"}</span>
                </button>

                <button
                  onClick={handleRemoveDraftStep}
                  disabled={sortedDraftSteps.length <= 4}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    sortedDraftSteps.length <= 4
                      ? "bg-surface-secondary text-text-secondary border border-border-default cursor-not-allowed opacity-50 min-h-9"
                      : "bg-status-danger-subtle hover:bg-status-danger-subtle text-status-danger border border-status-danger-border cursor-pointer min-h-9"
                  } `}
                  title="Kurangi 1 baris sarat (z) paling rapat"
                 aria-label="Kurangi 1 baris sarat (z) paling rapat">
                  <Minus size={14} />
                  <span>Remove Draft Level (z)</span>
                </button>

                <button
                  onClick={handleAddDraftStep}
                  className="flex items-center space-x-1.5 bg-status-warning-subtle hover:bg-status-warning-subtle text-status-warning border border-status-warning-border px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer min-h-9"
                  title="Add a new draft level (z)"
                 aria-label="Add a new draft level (z)">
                  <Plus size={14} />
                  <span>Add Draft Level (z)</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            {showDraftIntegrationTable ? (
              <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
                <table className="w-full text-left text-sm font-mono border-collapse">
                  <thead>
                    <tr className="bg-surface-secondary text-text-primary border-b border-border-default text-xs">
                      <th className="py-3 px-3.5 font-semibold text-center border-r border-border-default w-24">
                        (I)<br />GADING
                      </th>
                      <th className="py-3 px-3.5 font-semibold text-center text-status-warning border-r border-border-default w-32">
                        (II)<br />SARAT z (m)
                      </th>
                      <th className="py-3 px-3.5 font-semibold text-accent-primary border-r border-border-default min-w-[140px]">
                        (III)<br />0.5 B (m)
                      </th>
                      <th className="py-3 px-3 font-semibold text-text-secondary text-center border-r border-border-default w-28">
                        (IV)<br />FAKTOR PENGALI
                      </th>
                      <th className="py-3 px-4 font-semibold text-status-success text-right border-r border-border-default min-w-[140px]">
                        (V) = (III)&times;(IV)<br />HASIL KALI
                      </th>
                      <th className="py-3 px-2 font-semibold text-text-secondary text-center w-14">
                        (VI)<br />AKSI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default bg-surface-primary">
                    {calculatedRows.map((r, idx) => {
                      const isDraftT = Math.abs(r.draft_z - T) < 0.01;
                      const isBase = r.draft_z === 0;
                      const canDelete = !isBase && !isDraftT && sortedDraftSteps.length > 4;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-surface-canvas transition-colors ${
                            isDraftT ? "bg-status-success-subtle font-semibold" : isBase ? "bg-surface-canvas" : ""
                          } `}
                        >
                          <td className="py-2 px-3 text-center border-r border-border-default text-text-primary">
                            {idx === 0 ? "10 (Midship)" : `"`}
                          </td>
                          <td className="py-2 px-3 text-center border-r border-border-default text-status-warning font-semibold">
                            {r.label}
                            {isDraftT && <span className="ml-1 text-xs text-status-success">(T)</span>}
                          </td>
                          <td className="py-1 px-2 border-r border-border-default">
                            <input aria-label="draft z"
                              type="number"
                              step="0.001"
                              min="0"
                              max={halfB * 1.5}
                              value={draftOrdinates[r.draft_z] ?? 0}
                              onChange={(e) => handleCellChange(r.draft_z, e.target.value)}
                              className="w-full bg-surface-canvas border border-border-default rounded-md py-1 px-2 text-accent-primary font-semibold font-mono text-sm focus:border-border-default focus:bg-surface-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring text-right transition-colors min-h-10"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-text-secondary border-r border-border-default">
                            {r.fs.toFixed(1)}
                          </td>
                          <td className="py-2 px-4 text-right text-status-success font-medium border-r border-border-default">
                            {r.product.toFixed(4)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {canDelete ? (
                              <button
                                onClick={() => handleDeleteSingleDraftStep(r.draft_z)}
                                className="p-1 rounded text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle transition-colors cursor-pointer inline-flex items-center justify-center min-h-9"
                                title={`Hapus baris sarat z = ${r.label} m`}
                               aria-label={`Hapus baris sarat z = ${r.label} m`}>
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span className="text-xs text-text-secondary font-sans select-none">
                                {isBase ? "BL" : isDraftT ? "DWL" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-surface-secondary border-t-2 border-border-default font-semibold text-sm text-text-primary">
                      <td colSpan={4} className="py-3 px-4 text-right tracking-normal text-text-primary border-r border-border-default">
                        Total Sigma Hasil Kali (Σ):
                      </td>
                      <td className="py-3 px-4 text-right text-status-success text-sm border-r border-border-default">
                        <div className="text-xs text-text-secondary">Luas (1 Sisi) =</div>
                        <div>{(Am_calc / 2).toFixed(4)}</div>
                      </td>
                      <td className="py-3 px-2 bg-surface-canvas"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-surface-canvas border border-dashed border-border-default rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <div className="flex items-center space-x-3 text-text-secondary">
                  <div className="text-text-secondary shrink-0">
                    <TableIcon size={18} />
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary">Station 10 Draft Integration Table Hidden</span>
                    <div className="text-xs text-text-secondary font-mono mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Total Level: <strong className="text-status-warning">{sortedDraftSteps.length} garis</strong></span>
                      <span>•</span>
                      <span>Am_calc: <strong className="text-status-success">{Am_calc.toFixed(3)} m²</strong></span>
                      <span>•</span>
                      <span>Target Am: <strong className="text-text-primary">{Am_rancangan.toFixed(3)} m²</strong></span>
                      <span>•</span>
                      <span>Deviasi: <strong className={isCorrectionValid ? "text-status-success" : "text-status-danger"}>{correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}</strong></span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDraftIntegrationTable(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-surface-selected hover:bg-surface-selected text-accent-primary text-sm font-semibold border border-border-default transition-colors cursor-pointer shrink-0 min-h-9"
                >
                  <Eye size={14} />
                  <span>Open Table</span>
                </button>
              </div>
            )}
          </div>

          {/* SUMMARY RESULT CARDS & VERIFICATION FORMULAS */}
          <div className="bg-surface-primary border border-border-default rounded-lg p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-accent-primary" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Midship Section Area Integration & Correction Results (Station 10 Verification)
                </h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm font-mono hidden md:block">
                <span className="text-text-secondary">Maximum Target Deviation: </span>
                  <strong className="text-status-success">&le; &plusmn;0.05%</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAreaResults(!showAreaResults)}
                  className="py-1.5 px-3 bg-surface-selected hover:bg-surface-selected text-accent-primary rounded-md text-sm font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-border-default min-h-9"
                  title={showAreaResults ? "Hide calculation results" : "Show calculation results"}
                 aria-pressed={showAreaResults} aria-label={showAreaResults ? "Hide calculation results" : "Show calculation results"}>
                  {showAreaResults ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
                  <span>{showAreaResults ? "Hide Results" : "Show Results"}</span>
                </button>
              </div>
            </div>

            {showAreaResults && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-canvas p-4 rounded-lg border border-border-default space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>Luas Midship Integrasi (Am_calc)</span>
                    <span className="text-xs font-mono text-accent-primary">2 · Luas (Satu Sisi)</span>
                  </div>
                  <div className="text-2xl font-semibold font-mono text-status-success">
                    {Am_calc.toFixed(3)} <span className="text-sm font-normal text-text-secondary">m&sup2;</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    = 2 &times; Luas Satu Sisi ({(Am_calc / 2).toFixed(3)})
                  </div>
                </div>

                <div className="bg-surface-canvas p-4 rounded-lg border border-border-default space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>Luas Midship Target (Am)</span>
                    <span className="text-xs font-mono text-accent-primary">Am = B &middot; T &middot; Cm</span>
                  </div>
                  <div className="text-2xl font-semibold font-mono text-accent-primary">
                    {Am_rancangan.toFixed(3)} <span className="text-sm font-normal text-text-secondary">m&sup2;</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    = {B.toFixed(2)} &times; {T.toFixed(2)} &times; {Cm.toFixed(3)}
                  </div>
                </div>

                <div className="bg-surface-canvas p-4 rounded-lg border border-border-default space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>Selisih Luas (ΔAm)</span>
                    <span className="text-xs font-mono text-status-warning">|Am_calc - Am|</span>
                  </div>
                  <div className="text-2xl font-semibold font-mono text-status-warning">
                    {Math.abs(Am_calc - Am_rancangan).toFixed(4)} <span className="text-sm font-normal text-text-secondary">m&sup2;</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    = |{Am_calc.toFixed(3)} - {Am_rancangan.toFixed(3)}|
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border space-y-1.5 transition-colors ${
                    isCorrectionValid
                      ? "bg-status-success-subtle border-status-success-border text-status-success"
                      : "bg-status-danger-subtle border-status-danger-border text-status-danger"
                  } `}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold flex items-center space-x-1.5">
                      {isCorrectionValid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>Midship Correction</span>
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-primary border border-border-default">
                      Syarat: ≤ ±0.05%
                    </span>
                  </div>
                  <div className="text-2xl font-semibold font-mono">
                    {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
                  </div>
                  <div className="text-xs opacity-90 font-mono flex items-center justify-between">
                    <span>Target: ≤ ±0.05%</span>
                    <span className={`font-semibold ${isCorrectionValid ? "text-status-success" : "text-status-danger"} `}>
                      {isCorrectionValid ? "WITHIN TOLERANCE" : "DEVIATION EXCEEDS 0.05%"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TABEL KORELASI GARIS AIR & MIDSHIP GADING 10 */}
          <div className="bg-surface-primary p-5 rounded-lg border border-border-default space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
              <div className="flex items-center space-x-2">
                <Layers size={18} className="text-accent-primary" />
                <h3 className="text-sm font-semibold text-text-primary tracking-normal">
                  Waterline & Midship (Station 10) Bilge Radius Correlation
                </h3>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="text-sm text-text-secondary font-mono hidden sm:inline">
                  Total {effectiveWaterlineLevels.length} Linked Waterlines
                </div>
                <button
                  type="button"
                  onClick={() => setShowWlAlignmentTable(!showWlAlignmentTable)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-surface-secondary hover:bg-surface-secondary text-text-primary border border-border-default transition-colors cursor-pointer min-h-9"
                 aria-pressed={showWlAlignmentTable}>
                  {showWlAlignmentTable ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
                  <span>{showWlAlignmentTable ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            {showWlAlignmentTable && (
              <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
                <table className="w-full text-left text-sm font-mono border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-surface-canvas text-text-primary border-b border-border-default text-xs">
                      <th className="py-2.5 px-3 font-semibold">GARIS AIR</th>
                      <th className="py-2.5 px-3 text-center">SARAT Z (m)</th>
                      <th className="py-2.5 px-3 text-center">FRAKSI SARAT (%T)</th>
                      <th className="py-2.5 px-3 text-right">0.5B MIDSHIP (m)</th>
                      <th className="py-2.5 px-3 text-right">0.5B WATERPLANE (m)</th>
                      <th className="py-2.5 px-3 text-center">STATUS KESELARASAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default bg-surface-primary">
                    {effectiveWaterlineLevels.map((wl) => {
                      const z = wl.draftFraction * T;
                      const b_mid_bilge = getTheoreticalOrdinateAtZ(z, R);
                      const b_mid_wl = waterlinesData?.[wl.id]?.[10.0] ?? (halfB * wl.maxBreadthFactor);
                      const diff = Math.abs(b_mid_bilge - b_mid_wl);
                      const isMatch = diff <= 0.01;

                      return (
                        <tr key={`mid-wl-${wl.id}`} className="hover:bg-surface-canvas transition-colors">
                          <td className="py-2 px-3 flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: engineeringColor(wl.color) }} />
                            <span className="font-semibold text-text-primary">{wl.name}</span>
                            <span className="text-xs text-text-secondary">({wl.shortName})</span>
                          </td>
                          <td className="py-2 px-3 text-center text-accent-primary font-semibold">
                            {z.toFixed(2)} m
                          </td>
                          <td className="py-2 px-3 text-center text-text-secondary">
                            {(wl.draftFraction * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right text-status-success font-semibold">
                            {b_mid_bilge.toFixed(3)} m
                          </td>
                          <td className="py-2 px-3 text-right text-accent-primary font-semibold">
                            {b_mid_wl.toFixed(3)} m
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isMatch
                                  ? "bg-status-success-subtle text-status-success border border-status-success-border"
                                  : "bg-status-warning-subtle text-status-warning border border-status-warning-border"
                              } `}
                            >
                              <CheckCircle2 size={11} />
                              <span>{isMatch ? "100% SELARAS" : `Selisih ${diff.toFixed(3)}m`}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DETAILED PLAIN-TEXT MATHEMATICAL EXPLANATION BOX */}
          <div className="bg-surface-canvas p-4 rounded-lg border border-border-default text-sm space-y-2 text-text-primary font-mono leading-relaxed">
            <div className="flex items-center justify-between pb-1 border-b border-border-default">
              <div className="text-xs font-semibold text-text-primary tracking-normal flex items-center space-x-2">
                <HelpCircle size={14} className="text-accent-primary" />
                <span>Midship & Bilge Radius Formula (Plain-Text Reference):</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulasBox(!showFormulasBox)}
                className="text-sm text-accent-primary font-semibold hover:underline flex items-center space-x-1 cursor-pointer min-h-9"
               aria-pressed={showFormulasBox}>
                {showFormulasBox ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showFormulasBox ? "Hide Formulas" : "Show Formulas"}</span>
              </button>
            </div>
            {showFormulasBox && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="space-y-1 border-b border-border-subtle py-3 min-w-0">
                  <p className="text-accent-primary font-semibold">1. Radius Kelengkungan Bilga (R):</p>
                  <p className="text-text-secondary">Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )</p>
                  <p className="text-text-secondary">
                    R = Akar( ({B} * {T} * (1 - {Cm})) / 0.4292 ) ={" "}
                    <strong className="text-accent-primary">{R.toFixed(4)} m</strong>
                  </p>
                </div>
                <div className="space-y-1 border-b border-border-subtle py-3 min-w-0">
                  <p className="text-accent-primary font-semibold">2. Luas Midship Hasil Integrasi (Am_calc):</p>
                  <p className="text-text-secondary">Am_calc = 2 &times; Total Luas (Satu Sisi)</p>
                  <p className="text-text-secondary">
                    Am_calc = 2 &times; {(Am_calc / 2).toFixed(4)} ={" "}
                    <strong className="text-status-success">{Am_calc.toFixed(3)} m&sup2;</strong>
                  </p>
                </div>
                <div className="space-y-1 border-b border-border-subtle py-3 min-w-0">
                  <p className="text-accent-primary font-semibold">3. Luas Midship Target Rancangan:</p>
                  <p className="text-text-secondary">Am_rancangan = B * T * Cm</p>
                  <p className="text-text-secondary">
                    Am_rancangan = {B} * {T} * {Cm} ={" "}
                    <strong className="text-accent-primary">{Am_rancangan.toFixed(3)} m&sup2;</strong>
                  </p>
                </div>
                <div className="space-y-1 border-b border-border-subtle py-3 min-w-0">
                  <p className="text-accent-primary font-semibold">4. Persentase Koreksi Midship (Wajib ≤ ±0.05%):</p>
                  <p className="text-text-secondary">Koreksi = ((Am_calc - Am_rancangan) / Am_calc) * 100%</p>
                  <p className="text-text-secondary">
                    Koreksi = (({Am_calc.toFixed(2)} - {Am_rancangan.toFixed(2)}) / {Am_calc.toFixed(2)}) * 100% ={" "}
                    <strong className={isCorrectionValid ? "text-status-success" : "text-status-danger"}>
                      {correctionPercent.toFixed(3)}%
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM STATION COUNT & SELECTION MODAL                                     */}
      {/* ========================================================================= */}
      {isStationCustomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setIsStationCustomModalOpen(false)}
        >
          <div
            className="bg-surface-primary border border-border-default rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 text-text-primary my-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-surface-selected text-accent-primary border border-border-default">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary tracking-tight">
                    Kostumisasi Jumlah &amp; Pilihan Gading
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Tentukan berapa banyak gading dan gading mana saja yang aktif pada Body Plan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStationCustomModalOpen(false)}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Presets Strip */}
            <div className="space-y-1.5 bg-surface-canvas p-3 rounded-lg border border-border-default">
              <span className="text-xs font-mono text-text-secondary font-semibold uppercase tracking-wider block">
                1. Pilih Preset Standar:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "11" as const, label: "11 Gading", sub: "Interval 2 (Gading Genap 0-20)" },
                  { id: "21" as const, label: "21 Gading", sub: "Standar Utama (St. 0 s.d 20)" },
                ].map((p) => {
                  const isMatching =
                    tempModalSelectedStations.length === STATION_PRESETS[p.id].length &&
                    tempModalSelectedStations.every((s, i) => Math.abs(s - STATION_PRESETS[p.id][i]) < 1e-4);
                  return (
                    <button
                      key={`modal-preset-${p.id}`}
                      type="button"
                      onClick={() => {
                        setTempModalSelectedStations([...STATION_PRESETS[p.id]]);
                        setCustomStationCountInput(STATION_PRESETS[p.id].length);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isMatching
                          ? "bg-accent-primary text-on-accent border-accent-primary shadow-xs font-bold ring-1 ring-focus-ring"
                          : "bg-surface-primary hover:bg-surface-secondary text-text-secondary hover:text-text-primary border-border-default"
                      }`}
                    >
                      <div className="font-semibold text-xs">{p.label}</div>
                      <div className={`text-[10px] ${isMatching ? "text-on-accent/80" : "text-text-tertiary"}`}>
                        {p.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Count Stepper & Auto-Distribute */}
            <div className="space-y-1.5 bg-surface-canvas p-3 rounded-lg border border-border-default">
              <span className="text-xs font-mono text-text-secondary font-semibold uppercase tracking-wider block">
                2. Kostum Mau Berapa Gading (Distribusi Otomatis):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 bg-surface-primary border border-border-default rounded-lg px-2.5 py-1">
                  <span className="text-xs text-text-secondary font-mono">Jumlah:</span>
                  <input
                    type="number"
                    min="3"
                    max="21"
                    value={customStationCountInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 3;
                      setCustomStationCountInput(Math.max(3, Math.min(21, val)));
                    }}
                    className="w-16 px-1.5 py-0.5 text-xs font-mono bg-surface-canvas border border-border-default rounded text-center text-text-primary font-bold focus:outline-none focus:ring-1 focus:ring-focus-ring"
                  />
                  <span className="text-xs text-text-secondary">gading</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCustomStationCount(customStationCountInput)}
                  className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-selected text-text-primary hover:text-accent-primary border border-border-default rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Wand2 size={12} className="text-accent-primary" />
                  <span>Distribusikan Otomatis ({customStationCountInput} Gading)</span>
                </button>
              </div>
            </div>

            {/* Interactive Station Checklist Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary font-semibold uppercase tracking-wider">
                  3. Pilihan Gading Individual ({tempModalSelectedStations.length} Terpilih):
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTempModalSelectedStations([...STATION_PRESETS["21"]]);
                      setCustomStationCountInput(21);
                    }}
                    className="text-[11px] text-accent-primary hover:underline cursor-pointer font-semibold"
                  >
                    Pilih Semua (21 Gading)
                  </button>
                  <span className="text-text-tertiary">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempModalSelectedStations([...STATION_PRESETS["11"]]);
                      setCustomStationCountInput(11);
                    }}
                    className="text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Gading Genap (11)
                  </button>
                  <span className="text-text-tertiary">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempModalSelectedStations([0.0, 10.0, 20.0]);
                      setCustomStationCountInput(3);
                    }}
                    className="text-[11px] text-text-secondary hover:text-status-danger cursor-pointer"
                  >
                    Reset Minimal (3)
                  </button>
                </div>
              </div>

              {/* Station Chips Matrix */}
              <div className="max-h-56 overflow-y-auto p-2.5 bg-surface-canvas rounded-lg border border-border-default space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {[
                  { title: "Buritan & Afterbody (St 0 s.d 5)", minSt: 0.0, maxSt: 5.0, color: "text-chart-secondary" },
                  { title: "Parallel Middle Body / Midship (St 6 s.d 15)", minSt: 6.0, maxSt: 15.0, color: "text-accent-primary" },
                  { title: "Haluan & Forebody (St 16 s.d 20)", minSt: 16.0, maxSt: 20.0, color: "text-status-success" },
                ].map((grp) => {
                  const grpStations = DEFAULT_STATIONS_CONFIG.filter(
                    (c) => Number.isInteger(c.station) && c.station >= grp.minSt && c.station <= grp.maxSt
                  );
                  return (
                    <div key={grp.title} className="space-y-1.5">
                      <div className={`text-[11px] font-mono font-semibold ${grp.color} flex items-center space-x-1`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{grp.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {grpStations.map((cfg) => {
                          const st = cfg.station;
                          const isSelected = tempModalSelectedStations.some((s) => Math.abs(s - st) < 1e-4);
                          const label = getStationDisplayLabel(st);
                          return (
                            <button
                              key={`modal-chk-st-${st}`}
                              type="button"
                              onClick={() => handleToggleModalStation(st)}
                              className={`px-2 py-1 rounded text-xs font-mono transition-all border flex items-center space-x-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-accent-primary text-on-accent border-accent-primary font-bold shadow-xs"
                                  : "bg-surface-primary text-text-tertiary border-border-subtle hover:bg-surface-secondary hover:text-text-primary"
                              }`}
                            >
                              <span className="w-3 h-3 flex items-center justify-center text-[10px]">
                                {isSelected ? "✓" : "○"}
                              </span>
                              <span>St {label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-border-default pt-3">
              <div className="font-mono text-xs text-text-secondary">
                Total Gading Aktif:{" "}
                <strong className="text-accent-primary text-sm font-bold">
                  {tempModalSelectedStations.length}
                </strong>{" "}
                dari 36 gading
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStationCustomModalOpen(false)}
                  className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-primary text-text-secondary hover:text-text-primary border border-border-default rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomStationsModal}
                  className="px-4 py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-on-accent rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check size={14} />
                  <span>Terapkan Konfigurasi ({tempModalSelectedStations.length} Gading)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
