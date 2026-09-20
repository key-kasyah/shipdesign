"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  SlidersHorizontal
} from "lucide-react";
import { WaterlineConfig, DEFAULT_WATERLINE_LEVELS, DEFAULT_STATIONS_CONFIG, DEFAULT_HULL_PROFILE, generateWaterlinePresets } from "./WaterPlaneCalculationSheet";
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
  onOpenDualFullscreen
}) => {
  const { language } = useLanguage();
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

  // Station Density Filter Mode: 'all' (36 Stations from Waterline Plan) or 'standard' (23 Main Stations)
  const [localStationDensity, setLocalStationDensity] = useState<"all" | "standard">("all");
  const stationDensity = propStationDensity || localStationDensity;
  const handleDensityChange = (d: "all" | "standard") => {
    setLocalStationDensity(d);
    if (onUpdateStationDensity) onUpdateStationDensity(d);
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
  
  // Standard integer/main stations filter
  const standardStationsConfig = useMemo(() => {
    return fullStationsConfig.filter((cfg) => {
      const s = cfg.station;
      return (
        s === -2 || s === -1 || s === 0 || s === 0.5 || s === 1 || s === 2 ||
        s === 3 || s === 4 || s === 5 || s === 6 || s === 7 || s === 8 ||
        s === 9 || s === 10 || s === 11 || s === 12 || s === 13 || s === 14 ||
        s === 15 || s === 16 || s === 17 || s === 18 || s === 19 || s === 19.5 ||
        s === 20 || s === 20.5 || s === 21
      );
    });
  }, [fullStationsConfig]);

  const activeStationsConfig = stationDensity === "all" ? fullStationsConfig : standardStationsConfig;

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

    if (engine && engine.offsetTable[st]) {
      return engine.getFramePoints(st, ox, oy, scaleX, scaleZ, isAfterbody);
    }

    const sign = isAfterbody ? -1 : 1;
    const isMid = st === 10.0;
    const isPMB = st >= 6.0 && st <= 15.0;
    const flatB = isMid || isPMB ? Math.max(0, halfB - calculatedRadius) : 0;
    const localDeckZ = H;

    // Stem / Stern Perpendiculars (AP & FP) run down CL
    if (st === 0.0 || st === 20.0) {
      return [
        { x: ox, y: oy, z: 0, wlId: "WL0" },
        { x: ox, y: oy - localDeckZ * scaleZ, z: localDeckZ, wlId: "DECK" }
      ];
    }

    const pts: { x: number; y: number; z: number; wlId?: string }[] = [];
    // 1. Keel CL (0,0)
    pts.push({ x: ox, y: oy, z: 0, wlId: "WL0" });

    // 2. PMB flat of bottom tangent point on baseline (Z = 0)
    if (flatB > 0.05) {
      pts.push({
        x: ox + sign * (flatB * scaleX),
        y: oy,
        z: 0
      });
    }

    // 3. Waterline level points (WL0 s.d. DWL)
    const sortedWls = [...effectiveWaterlineLevels].sort((a, b) => a.draftFraction - b.draftFraction);
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

    // A small horizontal fairing pass prevents abrupt in/out movements at
    // isolated waterline ordinates while leaving the vertical levels intact.
    const fairPts = pts.map((point, index) => {
      if (index === 0 || index === pts.length - 1) return point;
      return {
        ...point,
        x: point.x * 0.68 + ((pts[index - 1].x + pts[index + 1].x) * 0.16)
      };
    });

    let d = `M ${fairPts[0].x.toFixed(3)},${fairPts[0].y.toFixed(3)}`;
    const tension = 0.58;
    for (let i = 0; i < fairPts.length - 1; i++) {
      const p0 = fairPts[Math.max(0, i - 1)];
      const p1 = fairPts[i];
      const p2 = fairPts[i + 1];
      const p3 = fairPts[Math.min(fairPts.length - 1, i + 2)];
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

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    if (!draggingWlId && draggingDraft === null && draggingStation === null) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    let ox = 100;
    let scaleX = 86 / (halfB || 7.5);

    if (studioMode === "midshipDetail") {
      ox = isFullHullView ? 82 : 35;
      scaleX = isFullHullView ? 56 / (halfB || 7.5) : 80 / (halfB || 7.5);
    } else {
      ox = 100;
      scaleX = 86 / (halfB || 7.5);
    }

    const distFromCL = Math.abs(svgP.x - ox);
    let newHalfB = distFromCL / scaleX;
    newHalfB = Number(Math.max(0, Math.min(halfB * 1.15, newHalfB)).toFixed(3));

    if (draggingStation !== null && draggingWlId) {
      const prevWl = waterlinesData?.[draggingWlId] || {};
      const updatedWl = { ...prevWl, [draggingStation]: newHalfB };

      if (draggingStation === 10.0) {
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
      <div className={`w-full flex flex-col space-y-3.5 select-text ${embeddedInReport ? "" : "h-full min-h-[460px] p-2 sm:p-4 bg-white dark:bg-slate-950/95 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"}`}>
        {/* Top Control Bar: Search, Zone Filters, Format Switcher & Exports */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari gading / WL / zona..."
                value={xyzSearchTerm}
                onChange={(e) => setXyzSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-mono text-cyan-700 dark:text-cyan-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56 transition-all"
              />
              {xyzSearchTerm && (
                <button
                  type="button"
                  onClick={() => setXyzSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Zone Filter Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setXyzFilterZone("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  xyzFilterZone === "all" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Semua Zona ({activeStationsConfig.length})
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("afterbody")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  xyzFilterZone === "afterbody" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                ◀ AFTERBODY ({AFTERBODY_STATIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("pmb")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  xyzFilterZone === "pmb" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                PMB (St.6-15)
              </button>
              <button
                type="button"
                onClick={() => setXyzFilterZone("forebody")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  xyzFilterZone === "forebody" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                FOREBODY ({FOREBODY_STATIONS.length}) ▶
              </button>
            </div>

            {/* Station Dropdown */}
            <select
              value={xyzFilterStation}
              onChange={(e) => setXyzFilterStation(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setXyzViewFormat("matrix")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  xyzViewFormat === "matrix" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Classic Table of Offsets matrix (waterlines by column, frames by row)"
              >
                <TableIcon size={12} />
                <span>Matriks Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setXyzViewFormat("pointCloud")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  xyzViewFormat === "pointCloud" ? "bg-cyan-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Tampilan Daftar Titik Koordinat 3D Point Cloud (X, Y, Z)"
              >
                <FileText size={12} />
                <span>3D List (XYZ)</span>
              </button>
            </div>

            {/* Export Actions */}
            <button
              type="button"
              onClick={handleExportXyzCSV}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 rounded-xl text-[11px] font-mono font-bold transition-all border border-slate-200 dark:border-cyan-500/30 cursor-pointer shadow-sm"
              title="Download 3D offset ordinates as CSV"
            >
              <Download size={12} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportXyzPointCloud}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 rounded-xl text-[11px] font-mono font-bold transition-all border border-slate-200 dark:border-amber-500/30 cursor-pointer shadow-sm"
              title="Unduh 3D Point Cloud (.xyz) untuk Maxsurf / Rhino / AutoCAD"
            >
              <FileText size={12} />
              <span>.XYZ</span>
            </button>
            <button
              type="button"
              onClick={handleExportAutoCADScript}
              className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-[11px] font-mono font-bold transition-all shadow cursor-pointer"
              title="Unduh AutoCAD Script (.scr) untuk generate otomatis kurva gading 3D Spline"
            >
              <Compass size={12} />
              <span>AutoCAD .SCR</span>
            </button>
          </div>
        </div>

        {/* Legend / Coordinate Definition Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300">
                <strong>Sumbu X (Memanjang):</strong> Posisi gading dari AP (X_AP = st &times; {stationSpacing_l} m)
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">
                <strong>Sumbu Y (Melintang):</strong> Ordinat 0.5 B (CL = 0.000 m)
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-300">
                <strong>Sumbu Z (Vertikal):</strong> Sarat / Tinggi dari Base Line (BL = 0.00 m, DWL = {T.toFixed(2)} m)
              </span>
            </span>
          </div>
          <div className="text-slate-500 flex items-center space-x-2">
              <span>Total 3D Points: <strong className="text-cyan-400">{filteredPoints.length} Points</strong></span>
            <span>&bull;</span>
            <span>Total Frames: <strong className="text-white">{filteredMatrix.length} Frames</strong></span>
          </div>
        </div>

        {/* TABLE CONTENT AREA */}
        {xyzViewFormat === "matrix" ? (
          /* MATRIX GRID VIEW (TABLE OF OFFSETS) */
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner max-h-[540px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 shadow-md">
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="py-2.5 px-3 font-bold text-center border-r border-slate-200 dark:border-slate-800/80 sticky left-0 z-30 bg-slate-100 dark:bg-slate-950 w-16">
                    GADING
                  </th>
                  <th className="py-2.5 px-2.5 font-bold text-center border-r border-slate-200 dark:border-slate-800/80 sticky left-16 z-30 bg-slate-100 dark:bg-slate-950 w-20">
                    LABEL
                  </th>
                  <th className="py-2.5 px-3 font-bold text-cyan-700 dark:text-cyan-400 text-right border-r border-slate-200 dark:border-slate-800/60 w-24">
                    X_AP (m)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 text-right border-r border-slate-200 dark:border-slate-800/60 w-24">
                    X_MID (m)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-800/60 w-24">
                    ZONA
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-800/60 w-28">
                    BODY PLAN
                  </th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 text-right border-r border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50">
                    BASE LINE<br /><span className="text-[9px] text-slate-400 dark:text-slate-500">(Z=0.00m)</span>
                  </th>
                  {sortedWaterlines.map((wl) => {
                    const z = (wl.draftFraction * T).toFixed(2);
                    const isActive = wl.id === activeWlId;
                    return (
                      <th
                        key={`th-wl-${wl.id}`}
                        className={`py-2.5 px-3 font-bold text-right border-r border-slate-200 dark:border-slate-800/60 transition-colors ${
                          isActive ? "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wl.color }} />
                          <span>{wl.shortName}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">Z={z}m</span>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-3 font-bold text-amber-700 dark:text-amber-300 text-right bg-amber-50 dark:bg-amber-950/20">
                    DECK<br /><span className="text-[9px] text-amber-600/70 dark:text-amber-500/70">(Z={H.toFixed(2)}m)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 bg-white dark:bg-slate-950/30">
                {filteredMatrix.map((row) => {
                  const isHovered = hoveredStation === row.station;
                  const isMid = row.station === 10.0;
                  const isAfter = row.station <= 10.0;

                  return (
                    <tr
                      key={`mat-row-${row.station}`}
                      onMouseEnter={() => setHoveredStation(row.station)}
                      onMouseLeave={() => setHoveredStation(null)}
                      className={`transition-colors duration-100 ${
                        isHovered
                          ? "bg-cyan-50 dark:bg-cyan-950/40 text-slate-900 dark:text-white"
                          : isMid
                          ? "bg-amber-50 dark:bg-cyan-950/20 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                      }`}
                    >
                      <td
                        className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800/80 sticky left-0 z-10 font-bold ${
                          isHovered ? "bg-cyan-50 dark:bg-slate-900 text-cyan-700 dark:text-cyan-300" : isMid ? "bg-amber-50 dark:bg-slate-950 text-cyan-700 dark:text-cyan-400" : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row.station}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-center border-r border-slate-200 dark:border-slate-800/80 sticky left-16 z-10 font-bold ${
                          isHovered ? "bg-amber-50 dark:bg-slate-900 text-amber-700 dark:text-amber-300" : isMid ? "bg-amber-50 dark:bg-slate-950 text-amber-700 dark:text-amber-400" : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {row.stationLabel}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-700 dark:text-cyan-300 font-bold border-r border-slate-200 dark:border-slate-800/60">
                        {row.x_ap.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                        {row.x_mid >= 0 ? `+${row.x_mid.toFixed(3)}` : row.x_mid.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 text-[10px] border-r border-slate-200 dark:border-slate-800/60">
                        {row.zoneName}
                      </td>
                      <td className="py-2 px-3 text-center text-[10px] border-r border-slate-200 dark:border-slate-800/60">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            isAfter ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30" : "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30"
                          }`}
                        >
                          {isAfter ? "Port (Buritan)" : "Stbd (Haluan)"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
                        {row.base_y.toFixed(3)}
                      </td>
                      {sortedWaterlines.map((wl) => {
                        const yVal = row.wl_offsets[wl.id] ?? 0;
                        const isActive = wl.id === activeWlId;
                        const isZero = yVal <= 0.001;
                        return (
                          <td
                            key={`mat-cell-${row.station}-${wl.id}`}
                            className={`py-2 px-3 text-right border-r border-slate-200 dark:border-slate-800/60 ${
                              isActive
                                ? "bg-cyan-50 dark:bg-cyan-950/30 font-bold text-cyan-700 dark:text-cyan-300"
                                : isZero
                                ? "text-slate-400 dark:text-slate-600"
                                : isMid
                                ? "text-emerald-700 dark:text-emerald-300 font-bold"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {yVal.toFixed(3)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-medium text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner max-h-[540px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 shadow-md">
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <th className="py-2.5 px-3 font-bold text-center border-r border-slate-200 dark:border-slate-800/80 w-14">NO</th>
                  <th className="py-2.5 px-3 font-bold text-center border-r border-slate-200 dark:border-slate-800/80 w-20">GADING</th>
                  <th className="py-2.5 px-3 font-bold text-center border-r border-slate-200 dark:border-slate-800/80 w-24">LABEL</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60 w-32">ZONA</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60 w-36">SISI BODY PLAN</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/60 min-w-[140px]">LEVEL ELEVASI</th>
                  <th className="py-2.5 px-3 font-bold text-cyan-700 dark:text-cyan-400 text-right border-r border-slate-200 dark:border-slate-800/60 w-28">X (AP) [m]</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400 text-right border-r border-slate-200 dark:border-slate-800/60 w-28">X (MID) [m]</th>
                  <th className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400 text-right border-r border-slate-200 dark:border-slate-800/60 w-28">Y (0.5B) [m]</th>
                  <th className="py-2.5 px-3 font-bold text-amber-700 dark:text-amber-400 text-right w-28">Z (Draft) [m]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 bg-white dark:bg-slate-950/30">
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
                          ? "bg-cyan-50 dark:bg-cyan-950/40 text-slate-900 dark:text-white"
                          : isMid
                          ? "bg-amber-50 dark:bg-cyan-950/20"
                          : isDWL
                          ? "bg-emerald-50 dark:bg-emerald-950/15"
                          : isDeck
                          ? "bg-amber-50 dark:bg-amber-950/15"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      }`}
                    >
                      <td className="py-1.5 px-3 text-center text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800/80">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/80">
                        {pt.station}
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-amber-700 dark:text-amber-300 border-r border-slate-200 dark:border-slate-800/80">
                        {pt.stationLabel}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 text-[10px] border-r border-slate-200 dark:border-slate-800/60">
                        {pt.zoneName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800/60">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pt.station <= 10.0
                              ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30"
                              : "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30"
                          }`}
                        >
                          {pt.bodySide}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/60">
                        {pt.waterlineName}
                      </td>
                      <td className="py-1.5 px-3 text-right text-cyan-700 dark:text-cyan-300 font-bold border-r border-slate-200 dark:border-slate-800/60">
                        {pt.x_ap.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                        {pt.x_mid >= 0 ? `+${pt.x_mid.toFixed(3)}` : pt.x_mid.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-emerald-700 dark:text-emerald-300 font-bold border-r border-slate-200 dark:border-slate-800/60">
                        {pt.y.toFixed(3)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-amber-700 dark:text-amber-300 font-bold">
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
    const deckY = oy - H * scaleZ;
    const outerX = ox + halfB * scaleX;
    const mirrorOuterX = ox - halfB * scaleX;

    // Symmetrical Midship Section 10 paths
    const st10AfterPts = getStationFramePoints(10.0, ox, oy, scaleX, scaleZ, true);
    const st10ForePts = getStationFramePoints(10.0, ox, oy, scaleX, scaleZ, false);
    const st10AfterPath = `${smoothPath(st10AfterPts, 0.25)} L ${mirrorOuterX},${deckY} L ${ox},${deckY} Z`;
    const st10ForePath = `${smoothPath(st10ForePts, 0.25)} L ${outerX},${deckY} L ${ox},${deckY} Z`;

    // 6 Buttock Lines (B1 to B6) spaced at 1/6 increments across half-breadth
    const buttockFractions = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1.0];

    // Compute Forebody Sheer line points (St 10 to 20/21)
    const forebodyStations = FOREBODY_STATIONS.filter((st) => st >= 10.0);
    const foreSheerPts = forebodyStations.map((st) => {
      const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, false);
      return pts[pts.length - 1];
    });

    // Compute Afterbody Sheer line points (St 10 down to -2)
    const afterbodyStations = AFTERBODY_STATIONS.filter((st) => st <= 10.0);
    const aftSheerPts = [...afterbodyStations].reverse().map((st) => {
      const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, true);
      return pts[pts.length - 1];
    });

    // Compute Transom Knuckle line points for aft stations (St <= 1.5)
    const knucklePts: { x: number; y: number }[] = [];
    afterbodyStations.filter((st) => st <= 1.5).forEach((st) => {
      const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, true);
      const kn = pts.find((p) => p.wlId === "KNUCKLE");
      if (kn) knucklePts.push({ x: kn.x, y: kn.y });
    });

    return (
      <g className="body-plan-group">
        <rect x="2" y="2" width="196" height="139" fill="none" stroke="#94a3b8" strokeWidth="0.35" opacity="0.65" />

        {/* Title Header Block - Clean Drawing Metadata */}
        <g className="drawing-header">
          <text x={ox} y="13" fill="#94a3b8" fontSize="1.8" fontFamily="monospace" textAnchor="middle">
            LBP = {LBP.toFixed(2)}m &bull; B = {B.toFixed(2)}m &bull; T = {T.toFixed(2)}m &bull; H = {H.toFixed(2)}m &bull; {activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines
          </text>
        </g>

        {/* TOP CENTERLINE ARROW & BACKBOARD FACE (Authentic Gambar 1 Layout) */}
        <g className="backboard-face-indicator">
          <text x={ox} y="4.5" fill="#f8fafc" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.04em">
            BACKBOARD
          </text>
          <text x={ox} y="7.2" fill="#f8fafc" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" letterSpacing="0.04em">
            FACE
          </text>
          {/* Prominent Upward Arrow */}
          <path
            d={`M ${ox},8.2 L ${ox - 1.6},10.5 L ${ox - 0.5},10.5 L ${ox - 0.5},13.2 L ${ox + 0.5},13.2 L ${ox + 0.5},10.5 L ${ox + 1.6},10.5 Z`}
            fill="#f8fafc"
          />
        </g>

        {/* Centerline Red Axis & Red CL Label */}
        <line x1={ox} y1={13.5} x2={ox} y2={oy + 6} stroke="#ef4444" strokeWidth="1.2" />
        <text x={ox + 2.5} y="16.5" fill="#ef4444" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold">
          CL
        </text>
        <text x={ox} y={oy + 5.5} fill="#ef4444" fontSize="1.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          0
        </text>

        {/* Section Classification Badges (Port Afterbody vs Starboard Forebody) */}
        <text x={ox - 45} y="22" fill="#a78bfa" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
          ◀ AFTERBODY (Port)
        </text>
        <text x={ox + 45} y="22" fill="#2dd4bf" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
          FOREBODY (Starboard) ▶
        </text>

        {/* Midship Section Underwater Shading */}
        <path d={st10AfterPath} fill="url(#waterHatch)" opacity="0.30" />
        <path d={st10ForePath} fill="url(#waterHatch)" opacity="0.30" />

        {/* VERTICAL BUTTOCK LINES (B1 to B6 on both sides) */}
        {showButtocks && (
          <g className="buttock-lines-group" opacity="0.6">
            {buttockFractions.map((factor, idx) => {
              const bVal = halfB * factor;
              const bxRight = ox + bVal * scaleX;
              const bxLeft = ox - bVal * scaleX;
              const bNum = idx + 1; // 1 to 6
              const isOuter = idx === buttockFractions.length - 1;

              return (
                <g key={`buttock-col-${idx}`}>
                  {/* Right Forebody Buttock Line */}
                  <line
                    x1={bxRight}
                    y1="16"
                    x2={bxRight}
                    y2={oy + 2}
                    stroke="#475569"
                    strokeWidth={isOuter ? 0.6 : 0.28}
                    strokeDasharray="none"
                  />
                  {/* Left Afterbody Buttock Line */}
                  <line
                    x1={bxLeft}
                    y1="16"
                    x2={bxLeft}
                    y2={oy + 2}
                    stroke="#475569"
                    strokeWidth={isOuter ? 0.6 : 0.28}
                    strokeDasharray="none"
                  />

                  {/* Bottom Buttock Labels (B1 to B6) */}
                  <text
                    x={bxLeft}
                    y={oy + 4.5}
                    fill="#94a3b8"
                    fontSize="1.9"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`B${bNum}`}
                  </text>
                  <text
                    x={bxRight}
                    y={oy + 4.5}
                    fill="#94a3b8"
                    fontSize="1.9"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {`B${bNum}`}
                  </text>

                  {/* Meter markers */}
                  <text
                    x={bxLeft}
                    y={oy + 7.5}
                    fill="#64748b"
                    fontSize="1.3"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {`${bVal.toFixed(1)}m`}
                  </text>
                  <text
                    x={bxRight}
                    y={oy + 7.5}
                    fill="#64748b"
                    fontSize="1.3"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {`${bVal.toFixed(1)}m`}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* DIAGONAL BILGE RAY (Sent Lines) at 45 degrees */}
        {showDiagonals && (
          <g opacity="0.45">
            <line x1={ox} y1={oy} x2={ox + halfB * scaleX + 6} y2={oy - halfB * scaleZ - 6} stroke="#f59e0b" strokeWidth="0.35" strokeDasharray="none" />
            <line x1={ox} y1={oy} x2={ox - halfB * scaleX - 6} y2={oy - halfB * scaleZ - 6} stroke="#f59e0b" strokeWidth="0.35" strokeDasharray="none" />
            <text x={ox + halfB * scaleX + 7} y={oy - halfB * scaleZ - 6} fill="#f59e0b" fontSize="1.8" fontFamily="monospace">
              Sent / Diag
            </text>
          </g>
        )}

        {/* HORIZONTAL WATERLINES EXTENDING ACROSS BOTH SIDES */}
        {effectiveWaterlineLevels.map((wl) => {
          const z = wl.draftFraction * T;
          const yPos = oy - z * scaleZ;
          const isActive = wl.id === activeWlId;
          const isHovered = hoverWlId === wl.id;

          return (
            <g
              key={`body-wl-${wl.id}`}
              className="cursor-pointer transition-all"
              onClick={() => onSelectWlId?.(wl.id)}
              onPointerEnter={() => setHoverWlId(wl.id)}
              onPointerLeave={() => setHoverWlId(null)}
            >
              <line
                x1={mirrorOuterX - 3}
                y1={yPos}
                x2={outerX + 3}
                y2={yPos}
                stroke={isActive ? "#38bdf8" : wl.color}
                strokeWidth={isActive ? 0.75 : isHovered ? 0.55 : 0.22}
                strokeDasharray="none"
                opacity={isActive ? 0.9 : isHovered ? 0.7 : 0.16}
              />

              {/* Left Margin Waterline Label */}
              <text
                x={mirrorOuterX - 4.5}
                y={yPos + 0.6}
                fill={isActive ? "#38bdf8" : "#cbd5e1"}
                fontSize="1.8"
                fontFamily="sans-serif"
                fontWeight={isActive ? "bold" : "600"}
                textAnchor="end"
              >
                {wl.shortName}
              </text>

              {/* Right Margin Waterline Label */}
              <text
                x={outerX + 4.5}
                y={yPos + 0.6}
                fill={isActive ? "#38bdf8" : "#cbd5e1"}
                fontSize="1.8"
                fontFamily="sans-serif"
                fontWeight={isActive ? "bold" : "600"}
                textAnchor="start"
              >
                {wl.shortName}
              </text>
            </g>
          );
        })}

        {/* AFTERBODY TRANSVERSE STATION CURVES (Left of CL - Port / Buritan) - St < 10 */}
        {AFTERBODY_STATIONS.filter((st) => st < 10.0).map((st) => {
          const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, true);
          const isInteger = st % 1 === 0;
          const isHovered = hoveredStation === st || draggingStation === st;
          // Lower tension keeps the fair curve close to the entered offsets and
          // prevents spline overshoot near the bilge and sheer.
          const pathD = fairFramePath(pts);
          const topPt = pts[pts.length - 1];
          const showLabel = showStationLabels;
          const labelText = getStationDisplayLabel(st);

          return (
            <g
              key={`body-after-st-${st}`}
              className="transition-all cursor-pointer"
              onPointerEnter={() => setHoveredStation(st)}
              onPointerLeave={() => setHoveredStation(null)}
            >
              <path
                d={pathD}
                fill="none"
                stroke={isHovered ? "#f59e0b" : "#8b5cf6"}
                strokeWidth={isHovered ? 2.5 : isInteger ? 1.3 : 0.75}
                strokeDasharray="none"
                opacity={isHovered ? 1.0 : isInteger ? 0.95 : 0.75}
              />
              {showLabel && (
                <text
                  x={topPt.x}
                  y={topPt.y - 1.6}
                  fill={isHovered ? "#f59e0b" : isInteger ? "#c4b5fd" : "#94a3b8"}
                  fontSize={isInteger ? "1.9" : "1.4"}
                  fontFamily="sans-serif"
                  fontWeight={isHovered ? "bold" : isInteger ? "600" : "normal"}
                  textAnchor="middle"
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}

        {/* FOREBODY TRANSVERSE STATION CURVES (Right of CL - Starboard / Haluan) - St > 10 */}
        {FOREBODY_STATIONS.filter((st) => st > 10.0).map((st) => {
          const pts = getStationFramePoints(st, ox, oy, scaleX, scaleZ, false);
          const isInteger = st % 1 === 0;
          const isHovered = hoveredStation === st || draggingStation === st;
          const pathD = fairFramePath(pts);
          const topPt = pts[pts.length - 1];
          const showLabel = showStationLabels;
          const labelText = getStationDisplayLabel(st);

          return (
            <g
              key={`body-fore-st-${st}`}
              className="transition-all cursor-pointer"
              onPointerEnter={() => setHoveredStation(st)}
              onPointerLeave={() => setHoveredStation(null)}
            >
              <path
                d={pathD}
                fill="none"
                stroke={isHovered ? "#f59e0b" : "#06b6d4"}
                strokeWidth={isHovered ? 2.5 : isInteger ? 1.3 : 0.75}
                strokeDasharray="none"
                opacity={isHovered ? 1.0 : isInteger ? 0.95 : 0.75}
              />
              {showLabel && (
                <text
                  x={topPt.x}
                  y={topPt.y - 1.6}
                  fill={isHovered ? "#f59e0b" : isInteger ? "#5eead4" : "#94a3b8"}
                  fontSize={isInteger ? "1.9" : "1.4"}
                  fontFamily="sans-serif"
                  fontWeight={isHovered ? "bold" : isInteger ? "600" : "normal"}
                  textAnchor="middle"
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}

        {/* FOREBODY SHEER LINE & ANNOTATION (Exact Gambar 1) */}
        {foreSheerPts.length >= 2 && (
          <g className="forebody-sheer-annotation">
            <path
              d={smoothPath(foreSheerPts, 0.25)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Labeled 'SHEER' with pointer arrow */}
            <text x={ox + 20} y={deckY - 14} fill="#f59e0b" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold">
              SHEER
            </text>
            <line
              x1={ox + 27}
              y1={deckY - 12}
              x2={foreSheerPts[Math.min(3, foreSheerPts.length - 1)].x}
              y2={foreSheerPts[Math.min(3, foreSheerPts.length - 1)].y}
              stroke="#f59e0b"
              strokeWidth="0.6"
              markerEnd="url(#arrowAmber)"
            />
            <text x={ox + 50} y={deckY - 18} fill="#2dd4bf" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold">
              STATIONS
            </text>
            <line
              x1={ox + 62}
              y1={deckY - 16}
              x2={foreSheerPts[Math.min(6, foreSheerPts.length - 1)].x}
              y2={foreSheerPts[Math.min(6, foreSheerPts.length - 1)].y - 3}
              stroke="#2dd4bf"
              strokeWidth="0.5"
              markerEnd="url(#arrowCyan)"
            />
          </g>
        )}

        {/* AFTERBODY SHEER LINE & ANNOTATION (Exact Gambar 1) */}
        {aftSheerPts.length >= 2 && (
          <g className="afterbody-sheer-annotation">
            <path
              d={smoothPath(aftSheerPts, 0.25)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Labeled 'SHEER' with pointer arrow */}
            <text x={ox - 20} y={deckY - 14} fill="#f59e0b" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">
              SHEER
            </text>
            <line
              x1={ox - 27}
              y1={deckY - 12}
              x2={aftSheerPts[Math.min(3, aftSheerPts.length - 1)].x}
              y2={aftSheerPts[Math.min(3, aftSheerPts.length - 1)].y}
              stroke="#f59e0b"
              strokeWidth="0.6"
              markerEnd="url(#arrowAmber)"
            />
            <text x={ox - 50} y={deckY - 18} fill="#a78bfa" fontSize="2.4" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">
              STATIONS
            </text>
            <line
              x1={ox - 62}
              y1={deckY - 16}
              x2={aftSheerPts[Math.min(6, aftSheerPts.length - 1)].x}
              y2={aftSheerPts[Math.min(6, aftSheerPts.length - 1)].y - 3}
              stroke="#a78bfa"
              strokeWidth="0.5"
              markerEnd="url(#arrowIndigo)"
            />
          </g>
        )}

        {/* TRANSOM KNUCKLE LINE (Exact Gambar 1) */}
        {knucklePts.length >= 2 && (
          <g className="transom-knuckle-annotation">
            <path
              d={smoothPath(knucklePts, 0.25)}
              fill="none"
              stroke="#c7d2fe"
              strokeWidth="1.0"
              strokeDasharray="none"
            />
            <text x={ox - 45} y={deckY - 6} fill="#c7d2fe" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
              TRANSOM
            </text>
            <text x={ox - 45} y={deckY - 3.2} fill="#c7d2fe" fontSize="2.2" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
              KNUCKLE
            </text>
            <line
              x1={ox - 45}
              y1={deckY - 2}
              x2={knucklePts[0].x}
              y2={knucklePts[0].y}
              stroke="#c7d2fe"
              strokeWidth="0.5"
              markerEnd="url(#arrowIndigo)"
            />
          </g>
        )}

        {/* SYMMETRICAL MIDSHIP SECTION 10 (Both Port and Starboard in Bold Gold/Orange - Exact Gambar 1) */}
        {(() => {
          const ptsPort = getStationFramePoints(10.0, ox, oy, scaleX, scaleZ, true);
          const ptsStbd = getStationFramePoints(10.0, ox, oy, scaleX, scaleZ, false);
          const isHovered = hoveredStation === 10.0 || draggingStation === 10.0;
          const topPort = ptsPort[ptsPort.length - 1];
          const topStbd = ptsStbd[ptsStbd.length - 1];

          return (
            <g
              key="body-st-10-symmetrical"
              className="transition-all cursor-pointer"
              onPointerEnter={() => setHoveredStation(10.0)}
              onPointerLeave={() => setHoveredStation(null)}
            >
              {/* Port Side Midship Frame */}
              <path
                d={fairFramePath(ptsPort)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={isHovered ? 3.5 : 2.6}
              />
              {/* Starboard Side Midship Frame */}
              <path
                d={fairFramePath(ptsStbd)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={isHovered ? 3.5 : 2.6}
              />

              {showStationLabels && (
                <>
                  <text
                    x={topPort.x}
                    y={topPort.y - 1.6}
                    fill="#fbbf24"
                    fontSize="2.1"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    St. 10 (MID)
                  </text>
                  <text
                    x={topStbd.x}
                    y={topStbd.y - 1.6}
                    fill="#fbbf24"
                    fontSize="2.1"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    St. 10 (MID)
                  </text>
                </>
              )}
            </g>
          );
        })()}

        {/* BILGE RADIUS CIRCULAR ARC & TANGENT CALLOUT ON STATION 10 */}
        {R > 0.1 && (
          <g className="bilge-radius-indicator">
            <g opacity="0.95">
              {/* Starboard Bilge Center (+) */}
              <line
                x1={ox + flatOfBottom * scaleX - 1.5}
                y1={oy - R * scaleZ}
                x2={ox + flatOfBottom * scaleX + 1.5}
                y2={oy - R * scaleZ}
                stroke="#f59e0b"
                strokeWidth="0.45"
              />
              <line
                x1={ox + flatOfBottom * scaleX}
                y1={oy - R * scaleZ - 1.5}
                x2={ox + flatOfBottom * scaleX}
                y2={oy - R * scaleZ + 1.5}
                stroke="#f59e0b"
                strokeWidth="0.45"
              />
              {/* Port Bilge Center (+) */}
              <line
                x1={ox - flatOfBottom * scaleX - 1.5}
                y1={oy - R * scaleZ}
                x2={ox - flatOfBottom * scaleX + 1.5}
                y2={oy - R * scaleZ}
                stroke="#f59e0b"
                strokeWidth="0.45"
              />
              <line
                x1={ox - flatOfBottom * scaleX}
                y1={oy - R * scaleZ - 1.5}
                x2={ox - flatOfBottom * scaleX}
                y2={oy - R * scaleZ + 1.5}
                stroke="#f59e0b"
                strokeWidth="0.45"
              />

              {/* Radius Leader Line */}
              <line
                x1={ox + flatOfBottom * scaleX}
                y1={oy - R * scaleZ}
                x2={ox + flatOfBottom * scaleX + (R * scaleX) / Math.SQRT2}
                y2={oy - R * scaleZ + (R * scaleZ) / Math.SQRT2}
                stroke="#f59e0b"
                strokeWidth="0.5"
              />
              <text
                x={ox + flatOfBottom * scaleX + (R * scaleX) / Math.SQRT2 + 2}
                y={oy - R * scaleZ + (R * scaleZ) / Math.SQRT2 + 1}
                fill="#f59e0b"
                fontSize="2.2"
                fontFamily="monospace"
                fontWeight="bold"
              >
                R = {R.toFixed(3)} m (Radius Bilga)
              </text>
            </g>
          </g>
        )}

        {/* BOTTOM CLASSIC TITLE: STATION VIEW (Exact Gambar 1) */}
        <g className="drawing-footer">
          <text
            x={ox}
            y="141"
            fill="#ffffff"
            fontSize="4.0"
            fontFamily="'Times New Roman', Georgia, serif"
            fontWeight="800"
            textAnchor="middle"
            letterSpacing="0.12em"
          >
            STATION VIEW
          </text>
        </g>

        {/* INTERACTIVE DRAGGABLE STATION CONTROL HANDLES ON WATERLINES (When toggled on) */}
        {!isPreviewMode && handlesDisplayMode !== "none" && (
          <g className="body-plan-station-handles">
            {effectiveWaterlineLevels
              .filter((wl) => handlesDisplayMode === "all" || wl.id === activeWlId)
              .map((wl) => {
                const isActiveWl = wl.id === activeWlId;
                const z = wl.draftFraction * T;
                const yPos = oy - z * scaleZ;

                return (
                  <g key={`body-wl-handles-${wl.id}`} className="waterline-handle-group">
                    {activeStationsConfig.map((cfg) => {
                      const st = cfg.station;
                      const isAfter = st <= 10.0;
                      const b = getStationHalfB(st, wl.id, z);
                      const hx = isAfter ? ox - b * scaleX : ox + b * scaleX;
                      const isHovered = (hoveredStation === st && hoverWlId === wl.id) || (hoveredStation === st && !hoverWlId);
                      const isDragging = draggingStation === st && draggingWlId === wl.id;
                      const isInteger = st % 1 === 0;

                      // In active mode, only show nodes for the currently selected active waterline
                      if (handlesDisplayMode === "active" && !isActiveWl && !isDragging) {
                        return null;
                      }

                      return (
                        <g key={`wl-handle-st-${st}-${wl.id}`} className="station-node-handle">
                          {/* Pulsing ring indicator for active dragging node */}
                          {isDragging && (
                            <circle
                              cx={hx}
                              cy={yPos}
                              r="3.0"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="0.5"
                              strokeDasharray="none"
                            />
                          )}

                          {/* Halo highlight ring for active waterline nodes */}
                          {isActiveWl && !isDragging && (
                            <circle
                              cx={hx}
                              cy={yPos}
                              r={isHovered ? 2.0 : isInteger ? 1.4 : 1.0}
                              fill="none"
                              stroke={isAfter ? "#a78bfa" : "#2dd4bf"}
                              strokeWidth="0.28"
                              opacity={isHovered ? 0.9 : 0.4}
                            />
                          )}

                          {/* Core Draggable Control Dot */}
                          <circle
                            cx={hx}
                            cy={yPos}
                            r={
                              isDragging
                                ? 1.75
                                : isHovered
                                ? 1.4
                                : isActiveWl
                                ? isInteger
                                  ? 0.95
                                  : 0.75
                                : isInteger
                                ? 0.7
                                : 0.5
                            }
                            fill={
                              isDragging
                                ? "#f59e0b"
                                : isActiveWl
                                ? isHovered
                                  ? "#f59e0b"
                                  : isAfter
                                  ? "#7c3aed"
                                  : "#0891b2"
                                : isHovered
                                ? "#f59e0b"
                                : wl.color || (isAfter ? "#7c3aed" : "#0891b2")
                            }
                            stroke="#ffffff"
                            strokeWidth={isDragging ? 0.5 : isActiveWl ? 0.25 : 0.15}
                            opacity={isActiveWl || isHovered || isDragging ? 1.0 : 0.7}
                            className="cursor-ew-resize transition-transform"
                            onPointerDown={(e) => handleStationPointerDown(e, st, wl.id, z)}
                            onPointerEnter={() => {
                              setHoveredStation(st);
                              setHoverWlId(wl.id);
                              setHoverDraft(z);
                            }}
                            onPointerLeave={() => {
                              setHoveredStation(null);
                              setHoverWlId(null);
                              setHoverDraft(null);
                            }}
                          >
                            <title>{`Gading ${getStationDisplayLabel(st)} @ ${wl.shortName} (${z.toFixed(2)}m): 0.5B = ${b.toFixed(3)}m`}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
          </g>
        )}

        {/* BASELINE AXIS */}
        <line x1={mirrorOuterX - 6} y1={oy} x2={outerX + 6} y2={oy} stroke="#475569" strokeWidth="0.8" />
        <text x={mirrorOuterX - 7} y={oy + 0.6} fill="#94a3b8" fontSize="1.6" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          BASE LINE
        </text>
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

      const curvePts = station10CurveSteps.map((z) => {
        const val = getStation10CurveOrdinate(z);

        return {
          z,
          x: ox + val * scaleX,
          y: oy - z * scaleZ,
          isBilge: z <= R + 0.001
        };
      });

      const smoothCurve = getSmoothPathD(curvePts);
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
          <path d={subHullPath} fill="rgba(56, 189, 248, 0.08)" />
          <path
            d={hullPath}
            fill={isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)"}
            stroke="#06b6d4"
            strokeWidth="1.2"
          />

          {isFullHullView && (
            <g transform={`translate(${2 * ox}, 0) scale(-1, 1)`}>
              <path d={subHullPath} fill="rgba(56, 189, 248, 0.08)" />
              <path
                d={hullPath}
                fill={isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)"}
                stroke="#06b6d4"
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
                  className="transition-all duration-150 cursor-pointer"
                  onClick={() => onSelectWlId?.(wl.id)}
                >
                  <line
                    x1={isFullHullView ? mirroredPtX : ox}
                    y1={yPos}
                    x2={midPtX}
                    y2={yPos}
                    stroke={isActive ? "#38bdf8" : wl.color}
                    strokeWidth={isActive ? "0.9" : "0.5"}
                    opacity={isActive ? 1.0 : 0.85}
                  />

                  {isActive && (
                    <circle
                      cx={midPtX}
                      cy={yPos}
                      r="2.6"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="0.5"
                      opacity="0.85"
                      strokeDasharray="none"
                    />
                  )}

                  <circle
                    cx={midPtX}
                    cy={yPos}
                    r={isActive ? "1.4" : isHovered ? "1.2" : "0.95"}
                    fill={isActive ? "#38bdf8" : wl.color}
                    stroke="#ffffff"
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
                      fill={isActive ? "#38bdf8" : wl.color}
                      stroke="#ffffff"
                      strokeWidth="0.25"
                      className="opacity-75"
                    />
                  )}
                </g>
              );
            })}

          {!isPreviewMode && (
            <>
              <line x1={ox} y1="4" x2={ox} y2={oy + 8} stroke="#64748b" strokeWidth="0.8" />
              <text x={ox - 2} y="7" fill="#64748b" fontSize="2.8" textAnchor="end" fontFamily="monospace" fontWeight="bold">
                CL
              </text>

              <line
                x1={isFullHullView ? ox - halfB * scaleX - 10 : ox - 10}
                y1={oy}
                x2={outerX + 16}
                y2={oy}
                stroke="#64748b"
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
        {renderBodyPlanSvg(100, 132, 82 / (halfB || 7.5), 104 / Math.max(H, 7.0))}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* FULLSCREEN STUDIO OVERLAY FOR RADIUS BILGA & BODY PLAN     */}
      {/* ========================================================= */}
      {isFullscreenPlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-3xl flex flex-col p-2 sm:p-3 overflow-hidden select-none animate-in fade-in duration-200">
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 mb-2 shadow-2xl space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity size={16} />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
                    Body Plan Studio &mdash; <span className="text-cyan-400">Station Sections & Bilge Radius</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase whitespace-nowrap">
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
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all border shadow cursor-pointer flex items-center space-x-1.5 ${
                    handlesDisplayMode === "all"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10"
                      : handlesDisplayMode === "active"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                  title="Cycle through: Active WL only, All WLs, or No Points (Clean Curves)"
                >
                  <span>
                    {handlesDisplayMode === "all"
                      ? "Points: All WLs"
                      : handlesDisplayMode === "active"
                      ? "Points: Active WL"
                      : "Points: Hidden"}
                  </span>
                  <span className="text-[10px] px-1 rounded bg-slate-900/60 font-semibold">
                    {handlesDisplayMode === "all"
                      ? `${effectiveWaterlineLevels.length * activeStationsConfig.length}`
                      : handlesDisplayMode === "active"
                      ? `${activeStationsConfig.length}`
                      : "0"}
                  </span>
                </button>

                {/* Station Density Switcher */}
                <button
                  type="button"
                  onClick={() => handleDensityChange(stationDensity === "all" ? "standard" : "all")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all border shadow cursor-pointer flex items-center space-x-1 ${
                    stationDensity === "all"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                  title="Toggle between all frames (36 points) and standard frames (23 points)"
                >
                  <SlidersHorizontal size={12} className="text-cyan-400" />
                  <span>{stationDensity === "all" ? "All Frames (36)" : "Standard Frames (23)"}</span>
                </button>

                {/* Mode Switcher Pills */}
                <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(true);
                      setStudioMode("bodyPlan");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      studioMode === "bodyPlan"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Body Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode("xyzTable")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      studioMode === "xyzTable"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    XYZ Offsets Table
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(false);
                      setStudioMode("midshipDetail");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      studioMode === "midshipDetail"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Station 10 Section
                  </button>
                </div>

                {/* Actions */}
                <button
                  onClick={handleAutoFineTune}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-mono text-xs font-bold transition-all shadow-md flex items-center space-x-1 cursor-pointer"
                  title="Automatically fair and balance the curve until the deviation is <= ±0.05%"
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
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isPreviewMode
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                  }`}
                  title={isPreviewMode ? "Show construction guides (Edit Mode)" : "Hide construction guides (Preview Mode)"}
                >
                  {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => setIsFullscreenPlot(false)}
                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white rounded-lg transition-all cursor-pointer ml-1"
                  title="Tutup Mode Layar Penuh (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Waterlines Quick-Switch & Presets Bar in Fullscreen */}
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-slate-800/70 text-xs">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 mr-1 font-semibold uppercase">
                  Waterline Count:
                </span>
                {[4, 7, 11, 13, 21].map((cnt) => (
                  <button
                    key={`fs-mid-cnt-${cnt}`}
                    type="button"
                    onClick={() => handleApplyWaterlinePreset(cnt)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                      effectiveWaterlineLevels.length === cnt
                        ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                    }`}
                    title={`Terapkan ${cnt} Garis Air`}
                  >
                    {cnt} WL {cnt === 7 ? "(Std)" : ""}
                  </button>
                ))}
              </div>

              {/* Active WL Selector Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 mr-1 font-semibold uppercase">
                  Active WL:
                </span>
                {effectiveWaterlineLevels.map((wl) => {
                  const isActive = wl.id === activeWlId;
                  const zVal = wl.draftFraction * T;
                  return (
                    <button
                      key={`fs-mid-wl-tab-${wl.id}`}
                      type="button"
                      onClick={() => onSelectWlId?.(wl.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border flex items-center space-x-1 cursor-pointer ${
                        isActive
                          ? "bg-cyan-500 text-white border-cyan-400 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                      }`}
                      title={`${wl.name} (${zVal.toFixed(2)}m)`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wl.color }} />
                      <span>{wl.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fullscreen Canvas or XYZ Table */}
          <div className="flex-1 w-full min-h-0 bg-slate-900/95 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-1 sm:p-2.5 shadow-2xl">
            {studioMode === "xyzTable" ? (
              renderXyzTableContent(false)
            ) : (
              <>
                {draggingStation !== null && draggingWlId ? (
                  <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 border border-amber-500/50 px-3.5 py-1.5 rounded-full font-mono text-xs text-amber-300 backdrop-blur-md shadow-2xl animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      Menggeser Gading <strong>{getStationDisplayLabel(draggingStation)}</strong> @{" "}
                      <strong>{effectiveWaterlineLevels.find((w) => w.id === draggingWlId)?.shortName || draggingWlId}</strong>{" "}
                      (Z = {(draggingDraft ?? 0).toFixed(2)}m):{" "}
                      <strong className="text-white text-sm">
                        0.5 B = {(waterlinesData?.[draggingWlId]?.[draggingStation] ?? 0).toFixed(3)} m
                      </strong>
                    </span>
                  </div>
                ) : hoveredStation !== null ? (
                  <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-slate-900/80 border border-cyan-500/40 px-3 py-1 rounded-full font-mono text-xs text-cyan-300 backdrop-blur-md shadow-lg pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>
                      Gading <strong>{getStationDisplayLabel(hoveredStation)}</strong>
                      {hoverWlId
                        ? ` @ ${effectiveWaterlineLevels.find((w) => w.id === hoverWlId)?.shortName || hoverWlId} (Z = ${(hoverDraft ?? 0).toFixed(2)}m)`
                        : ""}:{" "}
                      <strong className="text-white">
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
                  viewBox={studioMode === "bodyPlan" ? "0 0 200 144" : studioMode === "midshipDetail" ? "28 10 100 80" : "0 0 200 144"}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ touchAction: "none" }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                  <defs>
                    <pattern id="cadGridFs" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
                    </pattern>
                    <pattern
                      id="waterHatch"
                      width="4"
                      height="4"
                      patternTransform="rotate(45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line x1="0" y1="0" x2="0" y2="4" stroke="#0284c7" strokeWidth="0.4" strokeOpacity="0.25" />
                    </pattern>
                    <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill="#f59e0b" />
                    </marker>
                    <marker id="arrowIndigo" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill="#c7d2fe" />
                    </marker>
                    <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                      <path d="M 0,1 L 4,3 L 0,5 Z" fill="#2dd4bf" />
                    </marker>
                  </defs>

                  {!isPreviewMode && studioMode !== "midshipDetail" && <rect x="0" y="0" width="200" height="144" fill="url(#cadGridFs)" />}
                  {renderMidshipSvgContent()}
                </svg>
              </>
            )}
          </div>

          <div className="w-full flex items-center justify-between pt-1 px-1 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>
                Jumlah station ({activeStationsConfig.length} gading) dan waterline ({effectiveWaterlineLevels.length} garis air) &bull;{" "}
                <span className="text-cyan-300 font-bold">
                  {handlesDisplayMode === "all"
                    ? `${effectiveWaterlineLevels.length * activeStationsConfig.length} Titik Kontrol Interaktif (Semua Garis Air)`
                    : `${activeStationsConfig.length} Titik Kontrol Interaktif (Garis Air Aktif)`}
                </span>{" "}
                selaras 100% dengan Waterline Plan &amp; 3D Offsets.
              </span>
            </span>
            <span className="text-slate-500">NS Savannah Lines Plan Body Plan</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMBEDDED VIEW: HEADER TITLE BLOCK & PARTICULARS MATRIX     */}
      {/* ========================================================= */}
      {!visualOnly && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      {language === "en"
                        ? "Body Plan Transverse Sections & Bilge Radius Studio"
                        : "Body Plan Penampang Gading Melintang & Radius Bilga"}
                    </h2>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isCorrectionValid
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {isCorrectionValid ? "WITHIN TOLERANCE (≤ ±0.05%)" : "ADJUSTMENT REQUIRED"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transverse Station Sections ({activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines) Bidirectionally Synchronized with the Waterplane Plan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowParticulars(!showParticulars)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {showParticulars ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                <span>{showParticulars ? "Hide" : "Show"}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 border-slate-200 dark:border-cyan-500/30 cursor-pointer"
                title="Download midship integration data as CSV"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {showParticulars && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Breadth B (m)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{B.toFixed(2)} m</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">0.5 B (m)</span>
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-400 font-mono">{halfB.toFixed(3)} m</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Draft T (m)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{T.toFixed(2)} m</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Depth H (m)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{H.toFixed(2)} m</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Midship Coefficient Cm</span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400 font-mono">{Cm.toFixed(3)}</span>
                </div>
                <div className="bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 uppercase tracking-wider block">Bilge Radius (R)</span>
                  <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300 font-mono">{R.toFixed(4)} m</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Flat of Bottom</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">{flatOfBottom.toFixed(4)} m</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs font-mono">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <span>
                    Am Target: <strong className="text-slate-900 dark:text-white">{Am_rancangan.toFixed(2)} m²</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Am Hitung: <strong className="text-cyan-700 dark:text-cyan-400">{Am_calc.toFixed(2)} m²</strong>
                  </span>
                </div>

                <div
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-bold ${
                    isCorrectionValid
                      ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/70 border-rose-500/40 text-rose-700 dark:text-rose-300"
                  }`}
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
          compact ? "p-0 space-y-2 flex-1 min-h-0 h-full border-0 bg-transparent shadow-none" : "bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl backdrop-blur-xl shadow-xl p-5 space-y-4"
        }`}>
          {/* Header Bar: Sleek Unified 2-Tier Studio Control */}
          <div className="bg-slate-50 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 backdrop-blur-xl shadow-sm select-none shrink-0 space-y-2.5">
            {/* TIER 1: Primary Controls & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Left Group: View Mode Switcher + Waterline Presets */}
              <div className="flex items-center space-x-2.5 overflow-x-auto">
                {/* Mode Segmented Control */}
                <div className="flex items-center bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(true);
                      setStudioMode("bodyPlan");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "bodyPlan"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title="Body Plan view"
                  >
                    <span>Body Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode("xyzTable")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "xyzTable"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title="3D XYZ offsets table"
                  >
                    <span>XYZ Offsets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullHullView(false);
                      setStudioMode("midshipDetail");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      studioMode === "midshipDetail"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title="Station 10 midship detail"
                  >
                    <span>Station 10 Section</span>
                  </button>
                </div>

                {/* Subtle Divider */}
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0 hidden sm:block" />

                {/* Waterline Preset Group */}
                <div className="flex items-center space-x-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1.5 font-semibold flex items-center space-x-1">
                    <Layers size={12} className="text-cyan-500 dark:text-cyan-400" />
                    <span className="hidden md:inline">Preset:</span>
                  </span>
                  {[4, 7, 11, 13, 21].map((cnt) => (
                    <button
                      key={`emb-mid-cnt-${cnt}`}
                      type="button"
                      onClick={() => handleApplyWaterlinePreset(cnt)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                        effectiveWaterlineLevels.length === cnt
                          ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 shadow-sm font-black"
                          : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                      title={`Apply ${cnt} waterlines`}
                    >
                      {cnt}
                    </button>
                  ))}

                  {/* Compact Stepper */}
                  <div className="flex items-center pl-1 border-l border-slate-800 space-x-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(3, desiredWlCount - 1);
                        setDesiredWlCount(next);
                        handleApplyWaterlinePreset(next);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
                      title="Kurangi 1 WL"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-[11px] font-mono font-bold text-cyan-300">
                      {desiredWlCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(25, desiredWlCount + 1);
                        setDesiredWlCount(next);
                        handleApplyWaterlinePreset(next);
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
                      title="Add 1 WL"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Group: Accuracy Status + Auto-Fit + Reset + Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Accuracy Status Badge */}
                <div
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-mono font-bold transition-all shadow-sm ${
                    isCorrectionValid
                      ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/30 text-rose-300"
                  }`}
                  title={`Luas Midship Target: ${Am_rancangan.toFixed(2)} m² | Hasil Hitung: ${Am_calc.toFixed(2)} m²`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCorrectionValid ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
                  <span>Correction: {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}</span>
                  <span className="text-[10px] px-1 rounded bg-slate-900/60 text-slate-400 font-normal hidden sm:inline">
                    {isCorrectionValid ? "VALID" : "DEVIATION"}
                  </span>
                </div>

                {/* Auto-Fit Button */}
                <button
                  type="button"
                  onClick={handleAutoFineTune}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-mono text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer ring-1 ring-emerald-400/30 active:scale-95"
                  title="Otomatis ratakan & seimbangkan kurva bilga (≤ ±0.05%)"
                >
                  <Wand2 size={13} />
                  <span>Auto-Fit</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-800 shadow-sm"
                  title="Reset ordinat midship ke desain teoritis awal"
                >
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
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border shadow-sm cursor-pointer flex items-center space-x-1 ${
                    handlesDisplayMode === "all"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : handlesDisplayMode === "active"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                  title="Cycle handle visibility: Active WL / All WLs / Hidden"
                >
                  <span>{handlesDisplayMode === "all" ? "All Points" : handlesDisplayMode === "active" ? "Active WL" : "Clean Curves"}</span>
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenPlot(true)}
                  className="p-1.5 bg-slate-950 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 rounded-xl transition-all cursor-pointer border border-slate-800 hover:border-cyan-500/40 shadow-sm"
                  title="Open fullscreen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* TIER 2: Waterline Navigation Ribbon */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center space-x-1.5 shrink-0 pr-1">
                  <Compass size={12} className="text-cyan-400" />
                  <span>Select Waterline ({effectiveWaterlineLevels.length}):</span>
                </span>
                {effectiveWaterlineLevels.map((wl) => {
                  const isActive = wl.id === activeWlId;
                  const zVal = wl.draftFraction * T;
                  return (
                    <button
                      key={`emb-mid-wl-tab-${wl.id}`}
                      type="button"
                      onClick={() => onSelectWlId?.(wl.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all border flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/40 shadow-sm"
                          : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60"
                      }`}
                      title={`${wl.name} (${zVal.toFixed(2)}m)`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wl.color }} />
                      <span>{wl.shortName}</span>
                      <span className={isActive ? "text-cyan-200" : "text-slate-500 font-normal"}>
                        {zVal.toFixed(2)}m
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Vessel Parameters Strip */}
              <div className="hidden lg:flex items-center space-x-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 shrink-0 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800/90 shadow-inner">
                <span>B: <strong className="text-slate-900 dark:text-white">{B.toFixed(1)}m</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>T: <strong className="text-slate-900 dark:text-white">{T.toFixed(1)}m</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>R: <strong className="text-cyan-600 dark:text-cyan-400">{R.toFixed(2)}m</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Am: <strong className="text-emerald-600 dark:text-emerald-400">{Am_calc.toFixed(1)}m²</strong></span>
              </div>
            </div>
          </div>

          {/* SVG Blueprint Canvas or XYZ Table in Embedded View */}
          {studioMode === "xyzTable" ? (
            renderXyzTableContent(false)
          ) : showVisualPlot ? (
            <div className={`bg-slate-50 dark:bg-slate-950/95 rounded-xl relative overflow-hidden border border-slate-200 dark:border-slate-800/90 flex items-center justify-center group select-none shadow-xl ${
              compact
                ? "w-full max-w-[1100px] aspect-[200/132] max-h-[560px] p-2 mx-auto"
                : "w-full h-96 sm:h-[440px] md:h-[480px] p-3"
            }`}>
              {/* Floating Blueprint Controls Overlay */}
              <div className={`absolute top-2 right-2 z-20 flex items-center space-x-1 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600/80 rounded-lg shadow-lg backdrop-blur-sm ${
                compact ? "p-0.5 scale-90 origin-top-right" : "p-1"
              }`}>
                {/* Readout Pill */}
                <div className="flex items-center space-x-1.5 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 px-2.5 py-1 rounded-md font-mono text-[10px]">
                  <span className="text-cyan-700 dark:text-cyan-300 font-bold">0.5B: <strong className="text-slate-900 dark:text-white">{activeHoverHalfB.toFixed(2)}m</strong></span>
                  <span className="text-slate-400 dark:text-slate-600">|</span>
                  <span className="text-amber-700 dark:text-amber-300 font-bold">R: <strong className="text-slate-900 dark:text-white">{R.toFixed(2)}m</strong></span>
                </div>

                {/* Buttock */}
                <button
                  onClick={() => setShowButtocks(!showButtocks)}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    showButtocks
                      ? "bg-purple-100 dark:bg-purple-600/30 border border-purple-300 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Show / hide buttock lines"
                >
                  <Layers size={13} />
                  <span>Buttock</span>
                </button>

                {/* Edit / Preview Mode */}
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all cursor-pointer"
                      title={isPreviewMode ? "Show points & construction guides (Edit Mode)" : "Hide points & construction guides (Preview Mode)"}
                >
                  {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                {/* Fullscreen */}
                <button
                  onClick={() => setIsFullscreenPlot(true)}
                  className="px-2 py-1 bg-cyan-100 dark:bg-cyan-600/20 hover:bg-cyan-200 dark:hover:bg-cyan-600/40 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-white rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                  title="Fullscreen"
                >
                  <Maximize size={13} />
                </button>
              </div>

              {/* Dynamic HUD Coordinate Banner */}
              {draggingStation !== null && draggingWlId ? (
                <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 border border-amber-500/50 px-3 py-1 rounded-full font-mono text-[11px] text-amber-700 dark:text-amber-300 backdrop-blur-md shadow-2xl animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    Moving Frame <strong>{getStationDisplayLabel(draggingStation)}</strong> @{" "}
                    <strong>{effectiveWaterlineLevels.find((w) => w.id === draggingWlId)?.shortName || draggingWlId}</strong>{" "}
                    (Z = {(draggingDraft ?? 0).toFixed(2)}m):{" "}
                    <strong className="text-slate-900 dark:text-white text-xs">
                      0.5 B = {(waterlinesData?.[draggingWlId]?.[draggingStation] ?? 0).toFixed(3)} m
                    </strong>
                  </span>
                </div>
              ) : hoveredStation !== null ? (
                <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-white/95 dark:bg-slate-900/80 border border-cyan-500/40 px-2.5 py-1 rounded-full font-mono text-[11px] text-cyan-700 dark:text-cyan-300 backdrop-blur-md shadow-lg pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>
                      Frame <strong>{getStationDisplayLabel(hoveredStation)}</strong>
                    {hoverWlId
                      ? ` @ ${effectiveWaterlineLevels.find((w) => w.id === hoverWlId)?.shortName || hoverWlId} (Z = ${(hoverDraft ?? 0).toFixed(2)}m)`
                      : ""}:{" "}
                    <strong className="text-slate-900 dark:text-white">
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
              <div className="absolute right-3 bottom-3 flex items-center space-x-1 bg-white/90 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 backdrop-blur-md z-10 opacity-70 group-hover:opacity-100 transition-opacity shadow-lg">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors flex justify-center items-center cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors text-[10px] font-mono font-bold text-center cursor-pointer"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 4))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition-colors flex justify-center items-center cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair transition-all duration-300 ease-in-out select-none"
                viewBox={studioMode === "bodyPlan" ? "0 0 200 144" : studioMode === "midshipDetail" ? "28 10 100 80" : "0 0 200 144"}
                preserveAspectRatio="xMidYMid meet"
                style={{ touchAction: "none" }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              >
                <defs>
                  <pattern id="cadGridEmbedded" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" className="stroke-slate-200 dark:stroke-[#1e293b]" strokeWidth="0.3" />
                  </pattern>
                  <pattern
                    id="waterHatch"
                    width="4"
                    height="4"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="4" stroke="#0284c7" strokeWidth="0.4" strokeOpacity="0.25" />
                  </pattern>
                  <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrowIndigo" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill="#c7d2fe" />
                  </marker>
                  <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                    <path d="M 0,1 L 4,3 L 0,5 Z" fill="#2dd4bf" />
                  </marker>
                </defs>

                {!isPreviewMode && studioMode !== "midshipDetail" && <rect x="0" y="0" width="200" height="144" fill="url(#cadGridEmbedded)" />}
                {renderMidshipSvgContent()}
              </svg>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Plot Visual Body Plan Disembunyikan</span>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines &bull; R = {R.toFixed(4)} m &bull; Flat of Bottom = {flatOfBottom.toFixed(4)} m
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualPlot(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all cursor-pointer shadow-sm shrink-0"
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
        <div id="section-xyz-table" className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <TableIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>3D Offset Ordinates Table (X, Y, Z) for Body Plan Sections</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 font-bold">
                    {activeStationsConfig.length} Frames &bull; {effectiveWaterlineLevels.length} Waterlines
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Koordinat 3D lengkap (X: Jarak dari AP/Midship, Y: Separuh Lebar 0.5B, Z: Sarat Vertikal) dari konversi garis air untuk penentuan lokasi gading di Body Plan.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowXyzTableSection(!showXyzTableSection)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {showXyzTableSection ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
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
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <TableIcon size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Station 10 Ordinate Integration by Draft (z)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Integrasi ordinat separuh lebar gading 10 pada tiap level garis horizontal sarat air. Nilai 0.5 B (m) dapat diedit langsung atau ditarik pada grafik.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDraftIntegrationTable(!showDraftIntegrationTable)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow"
                  title={showDraftIntegrationTable ? "Hide Table" : "Show Table"}
                >
                  {showDraftIntegrationTable ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                  <span>{showDraftIntegrationTable ? "Hide" : "Show"}</span>
                </button>

                <button
                  onClick={handleRemoveDraftStep}
                  disabled={sortedDraftSteps.length <= 4}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${
                    sortedDraftSteps.length <= 4
                      ? "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/50 cursor-not-allowed opacity-50"
                      : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/50 cursor-pointer active:scale-95"
                  }`}
                  title="Kurangi 1 baris sarat (z) paling rapat"
                >
                  <Minus size={14} />
                  <span>Remove Draft Level (z)</span>
                </button>

                <button
                  onClick={handleAddDraftStep}
                  className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg cursor-pointer active:scale-95"
                  title="Add a new draft level (z)"
                >
                  <Plus size={14} />
                  <span>Add Draft Level (z)</span>
                </button>
              </div>
            </div>

            {/* Table Container */}
            {showDraftIntegrationTable ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner no-scrollbar">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                      <th className="py-3 px-3.5 font-bold text-center border-r border-slate-200 dark:border-slate-800/60 w-24">
                        (I)<br />GADING
                      </th>
                      <th className="py-3 px-3.5 font-bold text-center text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800/60 w-32">
                        (II)<br />SARAT z (m)
                      </th>
                      <th className="py-3 px-3.5 font-bold text-cyan-700 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-800/60 min-w-[140px]">
                        (III)<br />0.5 B (m)
                      </th>
                      <th className="py-3 px-3 font-semibold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-800/60 w-28">
                        (IV)<br />FAKTOR PENGALI
                      </th>
                      <th className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400 text-right border-r border-slate-200 dark:border-slate-800/60 min-w-[140px]">
                        (V) = (III)&times;(IV)<br />HASIL KALI
                      </th>
                      <th className="py-3 px-2 font-semibold text-slate-500 dark:text-slate-400 text-center w-14">
                        (VI)<br />AKSI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50 bg-white dark:bg-slate-950/40">
                    {calculatedRows.map((r, idx) => {
                      const isDraftT = Math.abs(r.draft_z - T) < 0.01;
                      const isBase = r.draft_z === 0;
                      const canDelete = !isBase && !isDraftT && sortedDraftSteps.length > 4;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isDraftT ? "bg-emerald-50 dark:bg-emerald-950/20 font-bold" : isBase ? "bg-slate-50 dark:bg-slate-900/60" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                            {idx === 0 ? "10 (Midship)" : `"`}
                          </td>
                          <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800/60 text-amber-700 dark:text-amber-300 font-bold">
                            {r.label}
                            {isDraftT && <span className="ml-1 text-[10px] text-emerald-700 dark:text-emerald-400">(T)</span>}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800/60">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max={halfB * 1.5}
                              value={draftOrdinates[r.draft_z] ?? 0}
                              onChange={(e) => handleCellChange(r.draft_z, e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-lg py-1 px-2 text-cyan-700 dark:text-cyan-300 font-bold font-mono text-xs focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none text-right transition-all"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/60">
                            {r.fs.toFixed(1)}
                          </td>
                          <td className="py-2 px-4 text-right text-emerald-700 dark:text-emerald-400 font-medium border-r border-slate-200 dark:border-slate-800/60">
                            {r.product.toFixed(4)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {canDelete ? (
                              <button
                                onClick={() => handleDeleteSingleDraftStep(r.draft_z)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer inline-flex items-center justify-center"
                                title={`Hapus baris sarat z = ${r.label} m`}
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-sans select-none">
                                {isBase ? "BL" : isDraftT ? "DWL" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-900 dark:text-white">
                      <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        Total Sigma Hasil Kali (Σ):
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 text-sm border-r border-slate-200 dark:border-slate-800">
                        <div className="text-[9px] text-slate-500 uppercase">Luas (1 Sisi) =</div>
                        <div>{(Am_calc / 2).toFixed(4)}</div>
                      </td>
                      <td className="py-3 px-2 bg-slate-50 dark:bg-slate-950/80"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <TableIcon size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Station 10 Draft Integration Table Hidden</span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Total Level: <strong className="text-amber-700 dark:text-amber-400">{sortedDraftSteps.length} garis</strong></span>
                      <span>•</span>
                      <span>Am_calc: <strong className="text-emerald-700 dark:text-emerald-400">{Am_calc.toFixed(3)} m²</strong></span>
                      <span>•</span>
                      <span>Target Am: <strong className="text-slate-700 dark:text-slate-300">{Am_rancangan.toFixed(3)} m²</strong></span>
                      <span>•</span>
                      <span>Deviasi: <strong className={isCorrectionValid ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>{correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}</strong></span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDraftIntegrationTable(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-xs font-bold border border-cyan-200 dark:border-cyan-500/30 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Eye size={14} />
                  <span>Open Table</span>
                </button>
              </div>
            )}
          </div>

          {/* SUMMARY RESULT CARDS & VERIFICATION FORMULAS */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Midship Section Area Integration & Correction Results (Station 10 Verification)
                </h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-xs font-mono hidden md:block">
                <span className="text-slate-500 dark:text-slate-400">Maximum Target Deviation: </span>
                  <strong className="text-emerald-700 dark:text-emerald-400">&le; &plusmn;0.05%</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAreaResults(!showAreaResults)}
                  className="py-1.5 px-3 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/15 dark:hover:bg-cyan-600/25 text-cyan-700 dark:text-cyan-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-cyan-200 dark:border-cyan-500/30 shadow-sm"
                  title={showAreaResults ? "Hide calculation results" : "Show calculation results"}
                >
                  {showAreaResults ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                  <span>{showAreaResults ? "Hide Results" : "Show Results"}</span>
                </button>
              </div>
            </div>

            {showAreaResults && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Luas Midship Integrasi (Am_calc)</span>
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400">2 · Luas (Satu Sisi)</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                    {Am_calc.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    = 2 &times; Luas Satu Sisi ({(Am_calc / 2).toFixed(3)})
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Luas Midship Target (Am)</span>
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400">Am = B &middot; T &middot; Cm</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-300">
                    {Am_rancangan.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    = {B.toFixed(2)} &times; {T.toFixed(2)} &times; {Cm.toFixed(3)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Selisih Luas (ΔAm)</span>
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">|Am_calc - Am|</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                    {Math.abs(Am_calc - Am_rancangan).toFixed(4)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    = |{Am_calc.toFixed(3)} - {Am_rancangan.toFixed(3)}|
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border space-y-1.5 shadow-sm backdrop-blur-md transition-all ${
                    isCorrectionValid
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-500/40 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center space-x-1.5">
                      {isCorrectionValid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>Midship Correction</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                      Syarat: ≤ ±0.05%
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono">
                    {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
                  </div>
                  <div className="text-[11px] opacity-90 font-mono flex items-center justify-between">
                    <span>Target: ≤ ±0.05%</span>
                    <span className={`font-bold ${isCorrectionValid ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                      {isCorrectionValid ? "WITHIN TOLERANCE" : "DEVIATION EXCEEDS 0.05%"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TABEL KORELASI GARIS AIR & MIDSHIP GADING 10 */}
          <div className="bg-white dark:bg-slate-950/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Layers size={18} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Waterline & Midship (Station 10) Bilge Radius Correlation
                </h3>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                  Total {effectiveWaterlineLevels.length} Linked Waterlines
                </div>
                <button
                  type="button"
                  onClick={() => setShowWlAlignmentTable(!showWlAlignmentTable)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
                >
                  {showWlAlignmentTable ? <EyeOff size={14} className="text-cyan-600 dark:text-cyan-400" /> : <Eye size={14} className="text-cyan-600 dark:text-cyan-400" />}
                  <span>{showWlAlignmentTable ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            {showWlAlignmentTable && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <table className="w-full text-left text-xs font-mono border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                      <th className="py-2.5 px-3 font-bold">GARIS AIR</th>
                      <th className="py-2.5 px-3 text-center">SARAT Z (m)</th>
                      <th className="py-2.5 px-3 text-center">FRAKSI SARAT (%T)</th>
                      <th className="py-2.5 px-3 text-right">0.5B MIDSHIP (m)</th>
                      <th className="py-2.5 px-3 text-right">0.5B WATERPLANE (m)</th>
                      <th className="py-2.5 px-3 text-center">STATUS KESELARASAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                    {effectiveWaterlineLevels.map((wl) => {
                      const z = wl.draftFraction * T;
                      const b_mid_bilge = getTheoreticalOrdinateAtZ(z, R);
                      const b_mid_wl = waterlinesData?.[wl.id]?.[10.0] ?? (halfB * wl.maxBreadthFactor);
                      const diff = Math.abs(b_mid_bilge - b_mid_wl);
                      const isMatch = diff <= 0.01;

                      return (
                        <tr key={`mid-wl-${wl.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3 flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: wl.color }} />
                            <span className="font-bold text-slate-900 dark:text-white">{wl.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">({wl.shortName})</span>
                          </td>
                          <td className="py-2 px-3 text-center text-cyan-700 dark:text-cyan-300 font-bold">
                            {z.toFixed(2)} m
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400">
                            {(wl.draftFraction * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-300 font-bold">
                            {b_mid_bilge.toFixed(3)} m
                          </td>
                          <td className="py-2 px-3 text-right text-cyan-700 dark:text-cyan-300 font-bold">
                            {b_mid_wl.toFixed(3)} m
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMatch
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                              }`}
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
          <div className="bg-slate-50 dark:bg-slate-950/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300 font-mono leading-relaxed shadow-sm">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <HelpCircle size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span>Midship & Bilge Radius Formula (Plain-Text Reference):</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulasBox(!showFormulasBox)}
                className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                {showFormulasBox ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showFormulasBox ? "Hide Formulas" : "Show Formulas"}</span>
              </button>
            </div>
            {showFormulasBox && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <p className="text-cyan-700 dark:text-cyan-300 font-bold">1. Radius Kelengkungan Bilga (R):</p>
                  <p className="text-slate-500 dark:text-slate-400">Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    R = Akar( ({B} * {T} * (1 - {Cm})) / 0.4292 ) ={" "}
                    <strong className="text-cyan-700 dark:text-cyan-300">{R.toFixed(4)} m</strong>
                  </p>
                </div>
                <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <p className="text-cyan-700 dark:text-cyan-300 font-bold">2. Luas Midship Hasil Integrasi (Am_calc):</p>
                  <p className="text-slate-500 dark:text-slate-400">Am_calc = 2 &times; Total Luas (Satu Sisi)</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Am_calc = 2 &times; {(Am_calc / 2).toFixed(4)} ={" "}
                    <strong className="text-emerald-700 dark:text-emerald-400">{Am_calc.toFixed(3)} m&sup2;</strong>
                  </p>
                </div>
                <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <p className="text-cyan-700 dark:text-cyan-300 font-bold">3. Luas Midship Target Rancangan:</p>
                  <p className="text-slate-500 dark:text-slate-400">Am_rancangan = B * T * Cm</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Am_rancangan = {B} * {T} * {Cm} ={" "}
                    <strong className="text-cyan-700 dark:text-cyan-300">{Am_rancangan.toFixed(3)} m&sup2;</strong>
                  </p>
                </div>
                <div className="space-y-1 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <p className="text-cyan-700 dark:text-cyan-300 font-bold">4. Persentase Koreksi Midship (Wajib ≤ ±0.05%):</p>
                  <p className="text-slate-500 dark:text-slate-400">Koreksi = ((Am_calc - Am_rancangan) / Am_calc) * 100%</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Koreksi = (({Am_calc.toFixed(2)} - {Am_rancangan.toFixed(2)}) / {Am_calc.toFixed(2)}) * 100% ={" "}
                    <strong className={isCorrectionValid ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                      {correctionPercent.toFixed(3)}%
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
