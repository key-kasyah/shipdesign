"use client";

import { engineeringColor } from "./EngineeringPalette";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Compass,
  Move,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Sliders,
  CheckCircle2,
  Download,
  Info,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  Table as TableIcon,
  Lock,
  Plus,
  Trash2,
  Crosshair,
  MousePointer,
  Save,
  Clock,
  X
} from "lucide-react";

export interface ControlPoint {
  id: string;
  name: string;
  category: "bow" | "stern" | "sheer";
  x: number; // in meters from AP (x=0)
  y: number; // in meters from Baseline (y=0)
  locked?: boolean;
  description: string;
}

export interface SideProfileData {
  stern: ControlPoint[];
  bow: ControlPoint[];
  sheer: ControlPoint[];
  preset?: string;
  exactLoa?: number;
  foreOverhang?: number;
  aftOverhang?: number;
}

export interface SideProfileProps {
  lbp_m?: number;
  depth_m?: number;
  draft_m?: number;
  breadth_m?: number;
  cb?: number;
  vesselType?: string;
  projectId?: string;
  initialProfileData?: SideProfileData;
  onUpdateLoa?: (exactLoa: number, bowOverhang: number, sternOverhang: number) => void;
  onChangeProfile?: (data: SideProfileData) => void;
  onSave?: (data: SideProfileData) => Promise<void> | void;
}

// Generate smooth parametric Catmull-Rom Spline through control points
function generateCatmullRomSpline(points: { x: number; y: number }[], samplesPerSegment = 20): { x: number; y: number }[] {
  if (points.length < 2) return points;
  if (points.length === 2) {
    const res: { x: number; y: number }[] = [];
    for (let i = 0; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      res.push({
        x: points[0].x + t * (points[1].x - points[0].x),
        y: points[0].y + t * (points[1].y - points[0].y)
      });
    }
    return res;
  }

  const result: { x: number; y: number }[] = [];
  const extended = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < extended.length - 2; i++) {
    const p0 = extended[i - 1];
    const p1 = extended[i];
    const p2 = extended[i + 1];
    const p3 = extended[i + 2];

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      result.push({ x, y });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// Geometrically insert a new point between the two closest adjacent points along the curve
function insertPointIntoCurve(points: ControlPoint[], newPoint: ControlPoint): ControlPoint[] {
  if (points.length <= 1) return [...points, newPoint];

  const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.hypot(px - projX, py - projY);
  };

  let bestIndex = 1;
  let minDistance = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(newPoint.x, newPoint.y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    if (d < minDistance) {
      minDistance = d;
      bestIndex = i + 1;
    }
  }

  const dStart = Math.hypot(newPoint.x - points[0].x, newPoint.y - points[0].y);
  const dEnd = Math.hypot(newPoint.x - points[points.length - 1].x, newPoint.y - points[points.length - 1].y);

  if (dStart < minDistance && dStart < dEnd) {
    bestIndex = 0;
  } else if (dEnd < minDistance && dEnd <= dStart) {
    bestIndex = points.length;
  }

  const updated = [...points];
  updated.splice(bestIndex, 0, newPoint);
  return updated;
}

export const SideProfileNurbsEditor: React.FC<SideProfileProps> = ({
  lbp_m = 90.0,
  depth_m = 8.0,
  draft_m = 5.5,
  breadth_m = 16.0,
  cb = 0.76,
  vesselType = "GENERAL_CARGO",
  projectId,
  initialProfileData,
  onUpdateLoa,
  onChangeProfile,
  onSave
}) => {
  const { language } = useLanguage();
  const LBP = Math.max(10, lbp_m);
  const H = Math.max(2, depth_m);
  const T = Math.max(1, draft_m);

  const englishPointText = (text: string) => {
    const translations: Record<string, string> = {
      "Forefoot Tangent (Dasar)": "Forefoot Tangent (Baseline)",
      "Pangkal awal kelengkungan haluan": "Start of bow curvature",
      "Haluan Bawah Air (Elevasi Rendah)": "Low Underwater Bow",
      "Kepadatan titik bawah sarat (Dosen)": "Low-draft bow control point",
      "Haluan Bawah Air (Mid-Draft)": "Mid-Draft Underwater Bow",
      "Kelengkungan linggi haluan": "Bow stem curvature",
      "Linggi Haluan FP (DWL)": "Fore Peak FP (DWL)",
      "Intersep FP pada garis sarat air DWL (Acuan Statis Konstan LBP)": "FP intersection at DWL (fixed LBP reference)",
      "Haluan Flaring Atas": "Upper Bow Flare",
      "Kemiringan linggi haluan (flare)": "Upper bow stem flare",
      "Puncak Haluan (Forecastle Peak)": "Forecastle Peak",
      "Ujung terdepan geladak akhir haluan": "Forwardmost forecastle deck point",
      "Lunas Buritan (Aft Keel)": "Aft Keel",
      "Pangkal lunas sebelum kurva poros": "Keel origin before the shaft curve",
      "Garis Air Buritan (AP / DWL)": "Aft Waterline (AP / DWL)",
      "Intersep AP pada sarat muat DWL (Acuan Statis Konstan LBP)": "AP intersection at design draft DWL (fixed LBP reference)",
      "Knuckle Transom Buritan": "Aft Transom Knuckle",
      "Sudut lipatan transom belakang": "Aft transom break angle",
      "Puncak Geladak Buritan": "Aft Deck Peak",
      "Ujung tertinggi poop deck buritan": "Highest point of the aft poop deck",
      "Sheer Buritan (AP)": "Aft Sheer (AP)",
      "Tinggi sheer ujung buritan": "Aft stern sheer height",
      "Sheer Midship (St. 10)": "Midship Sheer (St. 10)",
      "Titik terendah sheer di midship": "Lowest sheer point at midship",
      "Sheer Haluan (FP)": "Fore Sheer (FP)",
      "Tinggi sheer ujung haluan (forecastle)": "Forecastle sheer height"
    };
    return translations[text] || text;
  };

  type PresetDict = Record<string, { name: string; stern: ControlPoint[]; bow: ControlPoint[]; sheer: ControlPoint[] }>;

  // Preset Configurations
  const getPresets = (baseLbp: number, baseH: number, baseT: number): PresetDict => {
    const defaultCargoStern: ControlPoint[] = [
      { id: "st-1", name: "Aft Keel", category: "stern", x: baseLbp * 0.05, y: 0.0, description: "Keel origin before the shaft curve" },
      { id: "st-2", name: "Bossing Curve (Lower)", category: "stern", x: baseLbp * 0.02, y: baseT * 0.22, description: "Lower draft transition point" },
      { id: "st-3", name: "Propeller Shaft (Boss)", category: "stern", x: baseLbp * 0.005, y: baseT * 0.52, description: "Propeller shaft center height" },
      { id: "st-4", name: "Aft Waterline (AP / DWL)", category: "stern", x: 0.0, y: baseT, locked: true, description: "AP intersection at design draft DWL (fixed LBP reference)" },
      { id: "st-5", name: "Aft Transom Knuckle", category: "stern", x: -baseLbp * 0.025, y: baseT + (baseH - baseT) * 0.5, description: "Aft transom break angle" },
      { id: "st-6", name: "Aft Deck Peak", category: "stern", x: -baseLbp * 0.035, y: baseH + 1.1, description: "Highest point of the aft poop deck" }
    ];

    const defaultCargoBow: ControlPoint[] = [
      { id: "bw-1", name: "Forefoot Tangent (Baseline)", category: "bow", x: baseLbp * 0.94, y: 0.0, description: "Start of bow curvature" },
      { id: "bw-2", name: "Low Underwater Bow", category: "bow", x: baseLbp * 0.975, y: baseT * 0.3, description: "Low-draft bow control point" },
      { id: "bw-3", name: "Mid-Draft Underwater Bow", category: "bow", x: baseLbp * 0.99, y: baseT * 0.65, description: "Bow stem curvature" },
      { id: "bw-4", name: "Fore Peak FP (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "FP intersection at DWL (fixed LBP reference)" },
      { id: "bw-5", name: "Upper Bow Flare", category: "bow", x: baseLbp * 1.025, y: baseT + (baseH - baseT) * 0.55, description: "Upper bow stem flare" },
      { id: "bw-6", name: "Forecastle Peak", category: "bow", x: baseLbp * 1.045, y: baseH + 1.8, description: "Forwardmost forecastle deck point" }
    ];

    const defaultSheer: ControlPoint[] = [
      { id: "sh-1", name: "Aft Sheer (AP)", category: "sheer", x: -baseLbp * 0.035, y: baseH + 1.1, description: "Aft stern sheer height" },
      { id: "sh-2", name: "Sheer 1/6 LBP", category: "sheer", x: baseLbp * 0.166, y: baseH + 0.3, description: "Aft sheer transition curve" },
      { id: "sh-3", name: "Midship Sheer (St. 10)", category: "sheer", x: baseLbp * 0.5, y: baseH, description: "Lowest sheer point at midship" },
      { id: "sh-4", name: "Sheer 5/6 LBP", category: "sheer", x: baseLbp * 0.833, y: baseH + 0.55, description: "Bow sheer transition curve" },
      { id: "sh-5", name: "Fore Sheer (FP)", category: "sheer", x: baseLbp * 1.045, y: baseH + 1.8, description: "Forecastle sheer height" }
    ];

    return {
      cargo: { name: "General Cargo (Raked Bow + Transom Stern)", stern: defaultCargoStern, bow: defaultCargoBow, sheer: defaultSheer },
      tanker: {
        name: "Tanker / Curah (Bulbous Bow + Cruiser Stern)",
        stern: [
          { id: "st-1", name: "Aft Keel", category: "stern", x: baseLbp * 0.08, y: 0.0, description: "Aft keel base" },
          { id: "st-2", name: "Lengkung Skeg Poros", category: "stern", x: baseLbp * 0.03, y: baseT * 0.25, description: "Lengkung bawah sarat" },
          { id: "st-3", name: "Poros Propeller", category: "stern", x: baseLbp * 0.008, y: baseT * 0.5, description: "Pusat bossing baling-baling" },
          { id: "st-4", name: "Aft Waterline (DWL)", category: "stern", x: 0.0, y: baseT, locked: true, description: "AP intersection at DWL (fixed LBP reference)" },
          { id: "st-5", name: "Lengkung Cruiser Stern", category: "stern", x: -baseLbp * 0.04, y: baseT + (baseH - baseT) * 0.45, description: "Bulatan cruiser stern melengkung" },
          { id: "st-6", name: "Puncak Geladak Poop", category: "stern", x: -baseLbp * 0.045, y: baseH + 0.9, description: "Geladak buritan tanker" }
        ],
        bow: [
          { id: "bw-1", name: "Forefoot Tangent (Dasar)", category: "bow", x: baseLbp * 0.92, y: 0.0, description: "Dasar sebelum bulb" },
          { id: "bw-2", name: "Bawah Bulbous Bow", category: "bow", x: baseLbp * 0.99, y: baseT * 0.15, description: "Dasar bulbous bow" },
          { id: "bw-3", name: "Ujung Depan Bulbous Bow", category: "bow", x: baseLbp * 1.035, y: baseT * 0.45, description: "Hidung terdepan bulb bawah air" },
          { id: "bw-4", name: "Cekungan Atas Bulb (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Intersep FP pada sarat muat DWL (Acuan Statis Konstan LBP)" },
          { id: "bw-5", name: "Vertical Bow Stem", category: "bow", x: baseLbp * 1.015, y: baseT + (baseH - baseT) * 0.6, description: "Upper stem rake" },
          { id: "bw-6", name: "Forecastle Bow Peak", category: "bow", x: baseLbp * 1.03, y: baseH + 1.6, description: "Tanker bow peak" }
        ],
        sheer: defaultSheer
      },
      axeBow: {
        name: "Container / Patrol (Axe Bow + Flat Transom)",
        stern: [
          { id: "st-1", name: "Aft Keel", category: "stern", x: baseLbp * 0.04, y: 0.0, description: "Flat aft keel" },
          { id: "st-2", name: "Lengkung Skeg", category: "stern", x: baseLbp * 0.015, y: baseT * 0.25, description: "Lengkung bawah air" },
          { id: "st-3", name: "Poros Propeller", category: "stern", x: baseLbp * 0.005, y: baseT * 0.5, description: "Poros kemudi" },
          { id: "st-4", name: "AP pada DWL", category: "stern", x: 0.0, y: baseT, locked: true, description: "Intersep AP (Acuan Statis Konstan LBP)" },
          { id: "st-5", name: "Sudut Transom", category: "stern", x: -baseLbp * 0.02, y: baseT + (baseH - baseT) * 0.5, description: "Transom datar miring" },
          { id: "st-6", name: "Puncak Poop Deck", category: "stern", x: -baseLbp * 0.03, y: baseH + 0.8, description: "Geladak buritan" }
        ],
        bow: [
          { id: "bw-1", name: "Forefoot Vertikal", category: "bow", x: baseLbp * 0.98, y: 0.0, description: "Ujung lunas depan" },
          { id: "bw-2", name: "Lower Axe Bow Stem", category: "bow", x: baseLbp * 0.995, y: baseT * 0.35, description: "Vertical axe bow line" },
          { id: "bw-3", name: "Mid Bow Stem", category: "bow", x: baseLbp * 1.002, y: baseT * 0.7, description: "Straight vertical bow line" },
          { id: "bw-4", name: "Fore Peak (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "FP intersection at DWL (fixed LBP reference)" },
          { id: "bw-5", name: "Upper Bow", category: "bow", x: baseLbp * 1.01, y: baseT + (baseH - baseT) * 0.55, description: "Fine bow entrance" },
          { id: "bw-6", name: "Axe Bow Peak", category: "bow", x: baseLbp * 1.015, y: baseH + 1.4, description: "Axe bow peak" }
        ],
        sheer: defaultSheer
      },
      barge: {
        name: "Tongkang / Ponton (Box Hull / Full PMB)",
        stern: [
          { id: "st-1", name: "Aft Rake Base", category: "stern", x: baseLbp * 0.08, y: 0.0, description: "Start of aft rake" },
          { id: "st-2", name: "Lower Aft Rake", category: "stern", x: baseLbp * 0.04, y: baseT * 0.3, description: "Lower draft rake" },
          { id: "st-3", name: "Mid Aft Rake", category: "stern", x: baseLbp * 0.015, y: baseT * 0.65, description: "Mid-draft rake" },
          { id: "st-4", name: "AP pada DWL", category: "stern", x: 0.0, y: baseT, locked: true, description: "Garis AP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "st-5", name: "Transom Tongkang", category: "stern", x: -baseLbp * 0.015, y: baseT + (baseH - baseT) * 0.5, description: "Dinding buritan tongkang" },
          { id: "st-6", name: "Aft Deck End", category: "stern", x: -baseLbp * 0.02, y: baseH, description: "Flat barge aft deck" }
        ],
        bow: [
          { id: "bw-1", name: "Bow Rake Base", category: "bow", x: baseLbp * 0.92, y: 0.0, description: "Start of bow rake" },
          { id: "bw-2", name: "Lower Bow Rake", category: "bow", x: baseLbp * 0.96, y: baseT * 0.3, description: "Lower draft rake" },
          { id: "bw-3", name: "Mid Bow Rake", category: "bow", x: baseLbp * 0.985, y: baseT * 0.65, description: "Mid-draft rake" },
          { id: "bw-4", name: "FP pada DWL", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Garis FP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "bw-5", name: "Transom Depan", category: "bow", x: baseLbp * 1.015, y: baseT + (baseH - baseT) * 0.5, description: "Dinding haluan tongkang" },
          { id: "bw-6", name: "Bow Deck End", category: "bow", x: baseLbp * 1.02, y: baseH, description: "Flat barge bow deck" }
        ],
        sheer: [
          { id: "sh-1", name: "Aft Sheer", category: "sheer", x: -baseLbp * 0.02, y: baseH, description: "Flat deck" },
          { id: "sh-2", name: "Sheer 1/6 LBP", category: "sheer", x: baseLbp * 0.166, y: baseH, description: "Geladak datar" },
          { id: "sh-3", name: "Sheer Midship", category: "sheer", x: baseLbp * 0.5, y: baseH, description: "Geladak datar" },
          { id: "sh-4", name: "Sheer 5/6 LBP", category: "sheer", x: baseLbp * 0.833, y: baseH, description: "Geladak datar" },
          { id: "sh-5", name: "Fore Sheer", category: "sheer", x: baseLbp * 1.02, y: baseH, description: "Flat deck" }
        ]
      }
    };
  };

  const initialPresets = useMemo(() => getPresets(LBP, H, T), [LBP, H, T]);

  // Initial State: Select preset based on vesselType or restored initialProfileData / localStorage
  const vTypeUpper = (vesselType || "").toUpperCase();
  const defaultKey = vTypeUpper.includes("TANK") || vTypeUpper.includes("BULK") ? "tanker" : "cargo";

  const getInitialState = () => {
    if (initialProfileData?.stern && initialProfileData?.bow && initialProfileData?.sheer) {
      return {
        preset: initialProfileData.preset || defaultKey,
        stern: initialProfileData.stern,
        bow: initialProfileData.bow,
        sheer: initialProfileData.sheer,
      };
    }
    if (typeof window !== "undefined") {
      try {
        const storageKey = projectId ? `side_profile_saved_${projectId}` : "side_profile_saved_default";
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.stern && parsed.bow && parsed.sheer) {
            return {
              preset: parsed.preset || defaultKey,
              stern: parsed.stern,
              bow: parsed.bow,
              sheer: parsed.sheer,
            };
          }
        }
      } catch (e) {
        console.warn("Could not parse saved side profile:", e);
      }
    }
    const p = initialPresets[defaultKey] || initialPresets.cargo;
    return {
      preset: defaultKey,
      stern: p.stern,
      bow: p.bow,
      sheer: p.sheer,
    };
  };

  const initialLoaded = useMemo(() => getInitialState(), [initialProfileData, projectId]);

  const [selectedPreset, setSelectedPreset] = useState<string>(initialLoaded.preset);
  const [sternPoints, setSternPoints] = useState<ControlPoint[]>(initialLoaded.stern);
  const [bowPoints, setBowPoints] = useState<ControlPoint[]>(initialLoaded.bow);
  const [sheerPoints, setSheerPoints] = useState<ControlPoint[]>(initialLoaded.sheer);

  // Table visibility toggle state
  const [showCoordinateTables, setShowCoordinateTables] = useState<boolean>(true);

  // Save State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Synchronize with parent dimension changes if preset changes
  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const p = initialPresets[key as keyof typeof initialPresets] || initialPresets.cargo;
    setSternPoints(p.stern);
    setBowPoints(p.bow);
    setSheerPoints(p.sheer);
    if (onChangeProfile) {
      onChangeProfile({
        stern: p.stern,
        bow: p.bow,
        sheer: p.sheer,
        preset: key,
      });
    }
  };

  // Enforce static locked coordinates for AP (0, T) and FP (LBP, T) when LBP/T changes
  useEffect(() => {
    setSternPoints((prev) =>
      prev.map((p) => (p.id === "st-4" ? { ...p, x: 0.0, y: T, locked: true } : p))
    );
    setBowPoints((prev) =>
      prev.map((p) => (p.id === "bw-4" ? { ...p, x: LBP, y: T, locked: true } : p))
    );
  }, [LBP, T]);

  // View Options
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showWaterlines, setShowWaterlines] = useState<boolean>(true);
  const [showControlNodes, setShowControlNodes] = useState<boolean>(true);
  const [showWaterlineShading, setShowWaterlineShading] = useState<boolean>(true);
  const [showPmbZone, setShowPmbZone] = useState<boolean>(true);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Add Point Mode State
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [addCategory, setAddCategory] = useState<"auto" | "bow" | "stern" | "sheer">("auto");
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Dragging Control Point State
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dynamic Spline Calculations
  const sternSpline = useMemo(() => generateCatmullRomSpline(sternPoints, 24), [sternPoints]);
  const bowSpline = useMemo(() => generateCatmullRomSpline(bowPoints, 24), [bowPoints]);
  const sheerSpline = useMemo(() => generateCatmullRomSpline(sheerPoints, 24), [sheerPoints]);

  // All combined control points for the table & bounds calculations
  const allPoints = useMemo(() => [...sternPoints, ...bowPoints, ...sheerPoints], [sternPoints, bowPoints, sheerPoints]);

  // Derived Exact Measurements
  const xMin = useMemo(() => Math.min(...sternPoints.map((p) => p.x), ...sheerPoints.map((p) => p.x)), [sternPoints, sheerPoints]);
  const xMax = useMemo(() => Math.max(...bowPoints.map((p) => p.x), ...sheerPoints.map((p) => p.x)), [bowPoints, sheerPoints]);
  const exactLoa = useMemo(() => Number((xMax - xMin).toFixed(3)), [xMax, xMin]);
  const aftOverhang = useMemo(() => Number((0 - xMin).toFixed(3)), [xMin]);
  const foreOverhang = useMemo(() => Number((xMax - LBP).toFixed(3)), [xMax, LBP]);
  const loaRatio = useMemo(() => Number((exactLoa / LBP).toFixed(3)), [exactLoa, LBP]);
  const loaApproximation = useMemo(() => Number((1.025 * LBP).toFixed(2)), [LBP]);

  // Sync to parent callback if provided (guarded against infinite re-renders)
  const onUpdateLoaRef = useRef(onUpdateLoa);
  useEffect(() => {
    onUpdateLoaRef.current = onUpdateLoa;
  });

  const lastReportedLoaRef = useRef<{ loa?: number; fore?: number; aft?: number }>({});

  useEffect(() => {
    if (
      onUpdateLoaRef.current &&
      (lastReportedLoaRef.current.loa !== exactLoa ||
        lastReportedLoaRef.current.fore !== foreOverhang ||
        lastReportedLoaRef.current.aft !== aftOverhang)
    ) {
      lastReportedLoaRef.current = { loa: exactLoa, fore: foreOverhang, aft: aftOverhang };
      onUpdateLoaRef.current(exactLoa, foreOverhang, aftOverhang);
    }
  }, [exactLoa, foreOverhang, aftOverhang]);

  // Parallel Middle Body (PMB) boundaries (Zone where bottom is flat and sides parallel)
  const pmbStartX = useMemo(() => {
    // Starts where aft keel ends
    const firstSternKeel = sternPoints[0]?.x || LBP * 0.08;
    return Math.max(firstSternKeel, LBP * 0.25);
  }, [sternPoints, LBP]);

  const pmbEndX = useMemo(() => {
    // Ends where bow keel starts
    const firstBowKeel = bowPoints[0]?.x || LBP * 0.92;
    return Math.min(firstBowKeel, LBP * 0.75);
  }, [bowPoints, LBP]);

  // SVG Coordinate Conversion Helpers with Dedicated CAD Margins
  const svgWidth = 1180;
  const svgHeight = 520;

  const margin = {
    left: 110,   // Dedicated space on the left for waterlines labels ("DWL (5.44m)", "Geladak", "BL")
    right: 100,  // Dedicated space on the right
    top: 55,     // Space for LOA bar & Overhang annotations
    bottom: 55   // Space for LBP bar & Station labels
  };

  const usableWidth = svgWidth - margin.left - margin.right;
  const usableHeight = svgHeight - margin.top - margin.bottom;

  // Auto-fit Domain bounds in meters
  const plotMinX = useMemo(() => Math.min(-LBP * 0.08, xMin - 2.0), [xMin, LBP]);
  const plotMaxX = useMemo(() => Math.max(LBP * 1.08, xMax + 2.0), [xMax, LBP]);
  const plotMinY = -0.5;
  const plotMaxY = useMemo(() => Math.max(H * 1.25, ...allPoints.map((p) => p.y)) + 1.2, [H, allPoints]);

  const toSvgX = (xMeter: number) => {
    return margin.left + ((xMeter - plotMinX) / (plotMaxX - plotMinX)) * usableWidth;
  };

  const toSvgY = (yMeter: number) => {
    return margin.top + usableHeight - ((yMeter - plotMinY) / (plotMaxY - plotMinY)) * usableHeight;
  };

  const fromSvgCoords = (svgX: number, svgY: number): { xMeter: number; yMeter: number } => {
    const clampedSvgX = Math.max(margin.left, Math.min(svgWidth - margin.right, svgX));
    const clampedSvgY = Math.max(margin.top, Math.min(svgHeight - margin.bottom, svgY));

    const xMeter = plotMinX + ((clampedSvgX - margin.left) / usableWidth) * (plotMaxX - plotMinX);
    const yMeter = plotMinY + (((margin.top + usableHeight) - clampedSvgY) / usableHeight) * (plotMaxY - plotMinY);
    return { xMeter, yMeter };
  };

  // Mouse / Drag Handlers
  const handlePointerDown = (e: React.PointerEvent, pointId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (pointId === "st-4" || pointId === "bw-4") {
      // Locked point (AP/FP on DWL) is static and cannot be dragged
      setSelectedPointId(pointId);
      return;
    }
    setDraggingPointId(pointId);
    setSelectedPointId(pointId);
  };

  // Window-level Drag Listener for ultra-smooth, unbreakable dragging
  useEffect(() => {
    if (!draggingPointId) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
      const rawSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;
      const { xMeter, yMeter } = fromSvgCoords(rawSvgX, rawSvgY);

      const clampedX = Math.round(xMeter * 100) / 100;
      const clampedY = Math.max(0, Math.round(yMeter * 100) / 100);

      const updatePoint = (pt: ControlPoint) => {
        if (pt.id !== draggingPointId || pt.locked || pt.id === "st-4" || pt.id === "bw-4") return pt;
        let finalX = clampedX;
        if (pt.category === "stern") {
          finalX = Math.min(LBP * 0.45, Math.max(-LBP * 0.25, clampedX));
        } else if (pt.category === "bow") {
          finalX = Math.max(LBP * 0.55, Math.min(LBP * 1.35, clampedX));
        }
        return { ...pt, x: finalX, y: clampedY };
      };

      setSternPoints((prev) => prev.map(updatePoint));
      setBowPoints((prev) => prev.map(updatePoint));
      setSheerPoints((prev) => prev.map(updatePoint));
    };

    const handleWindowPointerUp = () => {
      setDraggingPointId(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [draggingPointId, LBP, H, svgWidth, svgHeight, fromSvgCoords]);

  // Direct numeric input update
  const handleNumericUpdate = (id: string, field: "x" | "y", val: number) => {
    if (id === "st-4" || id === "bw-4") return; // Disallow modifying locked reference points
    const updater = (list: ControlPoint[]) =>
      list.map((p) => (p.id === id && !p.locked ? { ...p, [field]: Number(val.toFixed(2)) } : p));

    setSternPoints(updater);
    setBowPoints(updater);
    setSheerPoints(updater);
  };

  // Add Point Handler at exact meter coordinates with intelligent geometric curve insertion
  const handleAddPointAtCoord = (xMeter: number, yMeter: number, forcedCat?: "bow" | "stern" | "sheer") => {
    let cat = forcedCat || addCategory;
    if (cat === "auto") {
      if (yMeter > H * 0.82 && xMeter > LBP * 0.12 && xMeter < LBP * 0.88) {
        cat = "sheer";
      } else if (xMeter >= LBP * 0.5) {
        cat = "bow";
      } else {
        cat = "stern";
      }
    }

    const newId = `custom-${Date.now()}`;
    const catTitle = cat === "bow" ? "Bow" : cat === "stern" ? "Stern" : "Sheer";
    const clampedX = Math.round(xMeter * 100) / 100;
    const clampedY = Math.max(0, Math.round(yMeter * 100) / 100);

    const newPoint: ControlPoint = {
      id: newId,
      name: `${catTitle} Kustom (${clampedX}, ${clampedY})`,
      category: cat,
      x: clampedX,
      y: clampedY,
      description: `Manual ${catTitle} control point (freely draggable)`
    };

    if (cat === "bow") {
      setBowPoints((prev) => insertPointIntoCurve(prev, newPoint));
    } else if (cat === "stern") {
      setSternPoints((prev) => insertPointIntoCurve(prev, newPoint));
    } else {
      setSheerPoints((prev) => insertPointIntoCurve(prev, newPoint));
    }

    setSelectedPointId(newId);
    setIsAddMode(false);
  };

  // Delete Point Handler
  const handleDeletePoint = (id: string) => {
    if (id === "st-4" || id === "bw-4") return; // cannot delete AP / FP
    setSternPoints((prev) => prev.filter((p) => p.id !== id));
    setBowPoints((prev) => prev.filter((p) => p.id !== id));
    setSheerPoints((prev) => prev.filter((p) => p.id !== id));
    if (selectedPointId === id) setSelectedPointId(null);
  };

  // Auto-sync working changes to parent & draft storage (guarded against infinite re-renders)
  const onChangeProfileRef = useRef(onChangeProfile);
  useEffect(() => {
    onChangeProfileRef.current = onChangeProfile;
  });

  const lastEmittedProfileRef = useRef<string>("");

  useEffect(() => {
    const payload = {
      stern: sternPoints,
      bow: bowPoints,
      sheer: sheerPoints,
      preset: selectedPreset,
      exactLoa,
      foreOverhang,
      aftOverhang
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastEmittedProfileRef.current) return;
    lastEmittedProfileRef.current = serialized;

    if (onChangeProfileRef.current) {
      onChangeProfileRef.current(payload);
    }
    if (typeof window !== "undefined") {
      const draftKey = projectId ? `side_profile_draft_${projectId}` : "side_profile_draft_default";
      try {
        localStorage.setItem(draftKey, serialized);
      } catch (e) {
        // ignore quota errors
      }
    }
  }, [sternPoints, bowPoints, sheerPoints, selectedPreset, exactLoa, foreOverhang, aftOverhang, projectId]);

  // Save Side Profile Handler
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const profilePayload: SideProfileData = {
      stern: sternPoints,
      bow: bowPoints,
      sheer: sheerPoints,
      preset: selectedPreset,
      exactLoa,
      foreOverhang,
      aftOverhang,
    };

    if (typeof window !== "undefined") {
      const storageKey = projectId ? `side_profile_saved_${projectId}` : "side_profile_saved_default";
      try {
        localStorage.setItem(storageKey, JSON.stringify(profilePayload));
      } catch (e) {}
    }

    if (onSave) {
      try {
        await onSave(profilePayload);
      } catch (err) {
        console.error("Save profile error:", err);
      }
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLastSavedTime(timeStr);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="min-w-0 space-y-8 font-sans text-text-primary">
      {/* Header Banner: Title & Educational Directives */}
      <div className="border-b border-border-default pb-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <div className="text-text-secondary shrink-0">
                <Compass size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-text-primary tracking-tight">
                  {language === "en" ? "Side Profile & Hull Profile Studio (NURBS Spline)" : "Studio Tampak Samping & Profil Lambung (NURBS Spline)"}
                </h2>
                <p className="text-sm text-text-secondary mt-0.5 leading-relaxed">
                  {language === "en"
                    ? "Design bow, stern, baseline, and deck sheer curves with interactive control points."
                    : "Perancangan kurva linggi haluan (bow), linggi buritan (stern), garis dasar (baseline), dan sheer geladak dengan titik kontrol interaktif."}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset Selector & Save Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary font-medium">Preset:</span>
              <select
                aria-label="Hull profile preset"
                value={selectedPreset}
                onChange={(e) => applyPreset(e.target.value)}
                className="bg-surface-primary border border-border-default text-text-primary text-sm rounded-md px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default cursor-pointer font-medium min-h-10"
              >
                <option value="cargo">General Cargo (Raked Bow + Transom)</option>
                <option value="tanker">Tanker / Bulk (Bulbous Bow + Cruiser)</option>
                <option value="axeBow">Container / Fast (Axe Bow + Transom)</option>
                <option value="barge">{language === "en" ? "Barge / Pontoon (Box Hull / Full PMB)" : "Tongkang / Ponton (Box Hull / Full PMB)"}</option>
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                saveSuccess
                  ? "bg-status-success text-on-accent border border-status-success-border min-h-9"
                  : "text-on-accent border border-border-default bg-accent-primary min-h-9"
              } `}
              title="Save the side profile (bow, stern & sheer control points) to the database"
             aria-label="Save the side profile (bow, stern & sheer control points) to the database">
              {isSaving ? (
                <RotateCcw size={14} className="animate-spin text-text-primary" />
              ) : saveSuccess ? (
                <CheckCircle2 size={14} className="text-current" />
              ) : (
                <Save size={14} />
              )}
              <span>
                {isSaving
                  ? language === "en" ? "Saving..." : "Menyimpan..."
                  : saveSuccess
                  ? language === "en" ? "Saved!" : "Tersimpan!"
                  : language === "en" ? "Save Side Profile" : "Simpan Profil Samping"}
              </span>
              {lastSavedTime && !isSaving && !saveSuccess && (
                <span className="text-xs font-mono opacity-75 ml-0.5">({lastSavedTime})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="min-w-0 space-y-4 relative">
        {/* Top Control Bar for View Toggles & Add Point Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm border-b border-border-default pb-3">
          {/* Left: View Layer Switches (Unified CAD Layer Toggles) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowStations(!showStations)}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                showStations
                  ? "bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-primary border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-canvas min-h-9"
              } `}
             aria-pressed={showStations}>
              <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border border-border-strong after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-surface-primary after:content-[''] ${showStations ? "bg-accent-primary after:translate-x-4" : "bg-surface-inset"} `} />
              <span>St. 0-20</span>
            </button>

            <button
              onClick={() => setShowWaterlines(!showWaterlines)}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                showWaterlines
                  ? "bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-primary border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-canvas min-h-9"
              } `}
             aria-pressed={showWaterlines}>
              <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border border-border-strong after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-surface-primary after:content-[''] ${showWaterlines ? "bg-accent-primary after:translate-x-4" : "bg-surface-inset"} `} />
              <span>Waterlines (WL / DWL)</span>
            </button>

            <button
              onClick={() => setShowPmbZone(!showPmbZone)}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                showPmbZone
                  ? "bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-primary border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-canvas min-h-9"
              } `}
             aria-pressed={showPmbZone}>
              <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border border-border-strong after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-surface-primary after:content-[''] ${showPmbZone ? "bg-accent-primary after:translate-x-4" : "bg-surface-inset"} `} />
              <span>Zona PMB</span>
            </button>

            <button
              onClick={() => setShowControlNodes(!showControlNodes)}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                showControlNodes
                  ? "bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-primary border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-canvas min-h-9"
              } `}
             aria-pressed={showControlNodes}>
              <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border border-border-strong after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-surface-primary after:content-[''] ${showControlNodes ? "bg-accent-primary after:translate-x-4" : "bg-surface-inset"} `} />
              <span>Control Points (Nodes)</span>
            </button>

            <button
              onClick={() => setShowWaterlineShading(!showWaterlineShading)}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                showWaterlineShading
                  ? "bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-primary border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-canvas min-h-9"
              } `}
             aria-pressed={showWaterlineShading}>
              <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border border-border-strong after:absolute after:left-0.5 after:top-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-surface-primary after:content-[''] ${showWaterlineShading ? "bg-accent-primary after:translate-x-4" : "bg-surface-inset"} `} />
              <span>Draft Shading (T)</span>
            </button>
          </div>

          {/* Right: Add Point Mode & Reset Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add Point Toolbar Toggle & Category Pill */}
            <div className="flex items-center space-x-1.5 bg-surface-secondary p-1 rounded-lg border border-border-default">
              <button
                onClick={() => setIsAddMode(!isAddMode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  isAddMode
                    ? "bg-accent-primary text-on-accent border border-border-default min-h-9"
                    : "bg-surface-primary hover:bg-surface-canvas text-text-primary border border-border-default min-h-9"
                } `}
                title="Klik untuk mengaktifkan mode penambahan titik baru pada profil kapal"
               aria-pressed={isAddMode} aria-label="Klik untuk mengaktifkan mode penambahan titik baru pada profil kapal">
                <Plus size={13} className={isAddMode ? "rotate-45 transition-transform" : "transition-transform"} />
                <span>{isAddMode ? "Close Add Mode" : "Add Control Point"}</span>
              </button>

              {isAddMode && (
                <div className="flex items-center space-x-1 pl-1.5 border-l border-border-default">
                  {(
                    [
                      { key: "auto", label: "Otomatis", desc: "Deteksi otomatis berdasarkan posisi klik" },
                      { key: "bow", label: "Bow", desc: "Bow stem profile point" },
                      { key: "stern", label: "Stern", desc: "Stern profile point" },
                      { key: "sheer", label: "Sheer", desc: "Deck sheer profile point" }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setAddCategory(cat.key)}
                      title={cat.desc}
                      className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        addCategory === cat.key
                          ? "bg-accent-primary text-on-accent border border-border-default min-h-9"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary min-h-9"
                      } `}
                     aria-label={cat.desc}>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => applyPreset(selectedPreset)}
              className="px-3 py-1.5 bg-surface-primary hover:bg-surface-canvas border border-border-default text-text-secondary hover:text-text-primary rounded-md text-sm font-medium flex items-center space-x-1.5 transition-colors cursor-pointer min-h-9"
              title="Reset ke posisi default preset"
             aria-label="Reset ke posisi default preset">
              <RotateCcw size={13} />
              <span>Reset Points</span>
            </button>
          </div>
        </div>

        {/* Interactive SVG Profile View Canvas */}
        <div className="atelier-profile-canvas mx-auto h-[540px] bg-surface-engineering rounded-lg border border-border-default relative overflow-hidden flex items-center justify-center select-none">
          {/* Add Point Active Center Banner */}
          {isAddMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-surface-primary border border-border-default text-text-primary px-4 py-2 rounded-lg text-sm flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-surface-selected" />
              <span className="font-semibold text-accent-primary">Add Point Mode:</span>
              <span className="text-text-primary text-xs">
                Klik pada garis profil untuk menempatkan titik{" "}
                <span className="font-semibold text-text-primary font-mono">
                  ({addCategory === "auto" ? "Automatic" : addCategory === "bow" ? "Bow" : addCategory === "stern" ? "Stern" : "Sheer"})
                </span>
              </span>
              <button
                onClick={() => setIsAddMode(false)}
                className="px-2.5 py-1 bg-surface-selected hover:bg-accent-hover border border-border-default text-accent-primary rounded-md text-sm font-medium cursor-pointer transition-colors ml-1 min-h-9"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Coordinate HUD (Live Meter Tracker) */}
          <div className="absolute bottom-3 right-3 z-20 bg-surface-primary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-secondary flex items-center space-x-2.5 pointer-events-none">
            <Crosshair size={13} className="text-accent-primary" />
            <span>X: <strong className="text-text-primary">{hoverCoords ? `${hoverCoords.x.toFixed(2)} m` : "--"}</strong></span>
            <span className="text-text-primary">|</span>
            <span>Y: <strong className="text-text-primary">{hoverCoords ? `${hoverCoords.y.toFixed(2)} m` : "--"}</strong></span>
            <span className="text-text-primary">|</span>
            <span>Station: <strong className="text-accent-primary">{hoverCoords ? (hoverCoords.x / (LBP / 20)).toFixed(1) : "--"}</strong></span>
          </div>

          <svg
            ref={svgRef}
            className={`w-full h-full ${isAddMode ? "cursor-crosshair" : "cursor-default"} `}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onDoubleClick={(e) => {
              if (!svgRef.current) return;
              const rect = svgRef.current.getBoundingClientRect();
              const rawSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              const rawSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;
              const { xMeter, yMeter } = fromSvgCoords(rawSvgX, rawSvgY);
              handleAddPointAtCoord(xMeter, yMeter);
            }}
            onClick={(e) => {
              if (!isAddMode || !svgRef.current) return;
              const rect = svgRef.current.getBoundingClientRect();
              const rawSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              const rawSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;
              const { xMeter, yMeter } = fromSvgCoords(rawSvgX, rawSvgY);
              handleAddPointAtCoord(xMeter, yMeter);
            }}
            onMouseMove={(e) => {
              if (!svgRef.current) return;
              const rect = svgRef.current.getBoundingClientRect();
              const rawSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              const rawSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;
              const { xMeter, yMeter } = fromSvgCoords(rawSvgX, rawSvgY);
              setHoverCoords({
                x: Math.round(xMeter * 100) / 100,
                y: Math.max(0, Math.round(yMeter * 100) / 100)
              });
            }}
            onMouseLeave={() => setHoverCoords(null)}
          >
            <defs>
              {/* Pattern for Submerged Region */}
              <pattern id="submerged-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke={engineeringColor("#0284c7")} className="" strokeWidth="0.8" strokeOpacity="0.3" />
              </pattern>

              {/* Grid Background Pattern */}
              <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" className="stroke-border-subtle" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width={svgWidth} height={svgHeight} fill="url(#cad-grid)" />

            {/* Parallel Middle Body (PMB) Highlight Zone */}
            {showPmbZone && (
              <g key="pmb-zone">
                <rect
                  x={toSvgX(pmbStartX)}
                  y={toSvgY(H * 1.15)}
                  width={toSvgX(pmbEndX) - toSvgX(pmbStartX)}
                  height={toSvgY(0) - toSvgY(H * 1.15)}
                  className="fill-chart-secondary/10 stroke-chart-secondary/50"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={(toSvgX(pmbStartX) + toSvgX(pmbEndX)) / 2}
                  y={toSvgY(H * 1.1) - 4}
                  className="fill-chart-secondary"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Zona Parallel Middle Body (PMB)
                </text>
              </g>
            )}

            {/* Waterlines Grid (WL 0, 1, 2, ... DWL T, Deck H) */}
            {showWaterlines && (
              <g key="waterlines-group">
                {/* Horizontal Waterlines */}
                {[0, T * 0.25, T * 0.5, T * 0.75, T, H, H + 1.5].map((elev, idx) => {
                  const y = toSvgY(elev);
                  const isDwl = Math.abs(elev - T) < 0.05;
                  const isDeck = Math.abs(elev - H) < 0.05;
                  const isBase = elev === 0;

                  return (
                    <g key={`wl-${idx}`}>
                      <line
                        x1={margin.left - 15}
                        y1={y}
                        x2={svgWidth - margin.right + 15}
                        y2={y}
                        className={
                          isDwl
                            ? "stroke-chart-primary"
                            : isDeck
                            ? "stroke-chart-tertiary"
                            : isBase
                            ? "stroke-text-tertiary"
                            : "stroke-border-subtle/80"
                        }
                        strokeWidth={isDwl || isDeck || isBase ? 1.5 : 0.6}
                        strokeDasharray={isDwl ? "6,3" : isDeck ? "4,2" : undefined}
                      />
                      <text
                        x={margin.left - 20}
                        y={y + 3.5}
                        className={
                          isDwl
                            ? "fill-chart-primary font-semibold"
                            : isDeck
                            ? "fill-chart-tertiary font-semibold"
                            : isBase
                            ? "fill-text-secondary"
                            : "fill-text-secondary"
                        }
                        fontSize="9.5"
                        fontWeight={isDwl || isDeck ? "bold" : "normal"}
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {isBase
                          ? "BL (0m)"
                          : isDwl
                          ? `DWL (${T.toFixed(2)}m)`
                          : isDeck
                          ? `Geladak (${H.toFixed(2)}m)`
                          : `WL ${elev.toFixed(1)}m`}
                      </text>

                      {/* Right side label for DWL and Deck */}
                      {(isDwl || isDeck) && (
                        <text
                          x={svgWidth - margin.right + 20}
                          y={y + 3.5}
                          className={isDwl ? "fill-chart-primary" : "fill-chart-tertiary"}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="start"
                          fontFamily="monospace"
                        >
                          {isDwl ? `DWL (${T.toFixed(2)}m)` : `Deck (${H.toFixed(2)}m)`}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* 21 Stations Vertical Grid Lines (0 AP to 20 FP) */}
            {showStations && (
              <g key="stations-group">
                {Array.from({ length: 21 }).map((_, idx) => {
                  const xMeter = (idx / 20) * LBP;
                  const x = toSvgX(xMeter);
                  const isAp = idx === 0;
                  const isFp = idx === 20;
                  const isMid = idx === 10;

                  return (
                    <g key={`station-${idx}`}>
                      <line
                        x1={x}
                        y1={toSvgY(plotMinY + 0.1)}
                        x2={x}
                        y2={toSvgY(Math.max(H * 1.15, plotMaxY - 1.0))}
                        className={
                          isAp
                            ? "stroke-chart-tertiary"
                            : isFp
                            ? "stroke-status-success"
                            : isMid
                            ? "stroke-chart-primary"
                            : "stroke-border-subtle/80"
                        }
                        strokeWidth={isAp || isFp ? 1.5 : isMid ? 1.8 : 0.6}
                        strokeDasharray={isAp || isFp ? "6,2" : isMid ? "5,3" : "2,2"}
                      />
                      <text
                        x={x}
                        y={toSvgY(0) + 16}
                        className={
                          isAp
                            ? "fill-chart-tertiary font-semibold"
                            : isFp
                            ? "fill-status-success font-semibold"
                            : isMid
                            ? "fill-chart-primary font-semibold"
                            : "fill-text-secondary"
                        }
                        fontSize={isAp || isFp || isMid ? "9.5" : "9"}
                        fontWeight={isAp || isFp || isMid ? "bold" : "normal"}
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {isAp ? "0 (AP)" : isFp ? "20 (FP)" : isMid ? "10 (⊗ Midship)" : idx}
                      </text>

                      {/* Prominent Midship (⊗) Badge at top and at DWL intersection */}
                      {isMid && (
                        <g key="midship-highlight">
                          <rect
                            x={x - 52}
                            y={toSvgY(Math.max(H * 1.15, plotMaxY - 1.0)) - 16}
                            width={104}
                            height={15}
                            rx={3}
                            className="fill-chart-primary/15 stroke-chart-primary"
                            strokeWidth={0.8}
                          />
                          <text
                            x={x}
                            y={toSvgY(Math.max(H * 1.15, plotMaxY - 1.0)) - 5}
                            className="fill-chart-primary font-semibold font-mono text-[8.5px]"
                            textAnchor="middle"
                          >
                            ⊗ Station 10 (Midship)
                          </text>

                          {/* Symbol ⊗ at DWL Intersection */}
                          <circle
                            cx={x}
                            cy={toSvgY(T)}
                            r={6}
                            className="fill-chart-primary/20 stroke-chart-primary"
                            strokeWidth={1.2}
                          />
                          <line x1={x - 6} y1={toSvgY(T)} x2={x + 6} y2={toSvgY(T)} className="stroke-chart-primary" strokeWidth={1} />
                          <line x1={x} y1={toSvgY(T) - 6} x2={x} y2={toSvgY(T) + 6} className="stroke-chart-primary" strokeWidth={1} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Submerged Hull Shaded Region (Under DWL) */}
            {showWaterlineShading && (
              <path
                d={`
                  M ${toSvgX(sternSpline[0].x)},${toSvgY(sternSpline[0].y)}
                  ${sternSpline
                    .filter((p) => p.y <= T)
                    .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                    .join(" ")}
                  L ${toSvgX(sternPoints.find((p) => p.name.includes("AP"))?.x || 0)},${toSvgY(T)}
                  L ${toSvgX(bowPoints.find((p) => p.name.includes("FP"))?.x || LBP)},${toSvgY(T)}
                  ${bowSpline
                    .filter((p) => p.y <= T)
                    .reverse()
                    .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                    .join(" ")}
                  L ${toSvgX(bowSpline[0].x)},${toSvgY(0)}
                  L ${toSvgX(sternSpline[0].x)},${toSvgY(0)}
                  Z
                `}
                fill="url(#submerged-hatch)"
                stroke="none"
              />
            )}

            {/* Flat Keel Line along the Bottom */}
            <line
              x1={toSvgX(sternSpline[0].x)}
              y1={toSvgY(0)}
              x2={toSvgX(bowSpline[0].x)}
              y2={toSvgY(0)}
              className="stroke-chart-primary"
              strokeWidth="2.5"
            />

            {/* Stern Profile Spline Curve */}
            <path
              d={`M ${toSvgX(sternSpline[0].x)},${toSvgY(sternSpline[0].y)} ${sternSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              className="stroke-chart-primary"
              strokeWidth="2.5"
            />

            {/* Bow Profile Spline Curve */}
            <path
              d={`M ${toSvgX(bowSpline[0].x)},${toSvgY(bowSpline[0].y)} ${bowSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              className="stroke-chart-primary"
              strokeWidth="2.5"
            />

            {/* Main Deck Sheer Curve */}
            <path
              d={`M ${toSvgX(sheerSpline[0].x)},${toSvgY(sheerSpline[0].y)} ${sheerSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              className="stroke-chart-tertiary"
              strokeWidth="2"
              strokeDasharray="5,2"
            />

            {/* Control Point Polylines */}
            {showControlNodes && (
              <>
                {/* Stern Polygon */}
                <polyline
                  points={sternPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")}
                  fill="none"
                  className="stroke-text-tertiary"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                {/* Bow Polygon */}
                <polyline
                  points={bowPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")}
                  fill="none"
                  className="stroke-text-tertiary"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                {/* Sheer Polygon */}
                <polyline
                  points={sheerPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")}
                  fill="none"
                  className="stroke-text-tertiary"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />

                {/* Control Nodes / Handles */}
                {allPoints.map((pt) => {
                  const cx = toSvgX(pt.x);
                  const cy = toSvgY(pt.y);
                  const isSelected = selectedPointId === pt.id;
                  const isDragging = draggingPointId === pt.id;
                  const isLocked = pt.locked || pt.id === "st-4" || pt.id === "bw-4";

                  const color = isLocked
                    ? "#0284c7"
                    : pt.category === "stern"
                    ? "#ea580c"
                    : pt.category === "bow"
                    ? "#16a34a"
                    : "#d97706";

                  // Smart text anchoring to guarantee zero clipping at left/right edges
                  const anchor = cx < margin.left + 35 ? "start" : cx > svgWidth - margin.right - 35 ? "end" : "middle";
                  const textX = anchor === "start" ? cx + 8 : anchor === "end" ? cx - 8 : cx;

                  return (
                    <g
                      key={`node-${pt.id}`}
                      className={isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
                    >
                      {/* Invisible Large Hit Target for Smooth Clicking & Dragging */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={18}
                        fill="transparent"
                        className={isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
                        onPointerDown={(e) => handlePointerDown(e, pt.id)}
                      />

                      {/* Visual Node Touch Ring / Halo */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isLocked ? 11 : isSelected ? 10 : 7}
                        className={
                          isLocked
                            ? "fill-chart-primary/20"
                            : isDragging
                            ? "fill-chart-primary/40"
                            : "fill-surface-engineering"
                        }
                        stroke={engineeringColor(color)}
                        strokeWidth={isLocked ? 2.5 : isSelected ? 2.5 : 1.8}
                        pointerEvents="none"
                      />
                      {/* Locked concentric crosshair / indicator */}
                      {isLocked ? (
                        <>
                          <circle cx={cx} cy={cy} r={6} fill="none" stroke={engineeringColor(color)} strokeWidth={1.2} strokeDasharray="2,2" pointerEvents="none" />
                          <circle cx={cx} cy={cy} r={2} fill={engineeringColor(color)} pointerEvents="none" />
                        </>
                      ) : (
                        <circle cx={cx} cy={cy} r={2.5} className="fill-text-secondary" pointerEvents="none" />
                      )}

                      {/* Coordinates Label */}
                      <text
                        x={textX}
                        y={cy - (isLocked ? 13 : 10)}
                        className={
                          isLocked
                            ? "fill-chart-primary font-semibold"
                            : isSelected
                            ? "fill-text-secondary font-semibold"
                            : "fill-text-secondary"
                        }
                        fontSize={isLocked ? "9" : "8.5"}
                        fontWeight={isLocked || isSelected ? "bold" : "normal"}
                        textAnchor={anchor}
                        fontFamily="monospace"
                        pointerEvents="none"
                      >
                        {isLocked
                          ? `[LOCK] ${pt.id === "st-4" ? "AP" : "FP"} (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`
                          : `${pt.name.split(" ")[0]} (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`}
                      </text>
                    </g>
                  );
                })}

                {/* Ghost Node Indicator in Add Point Mode */}
                {isAddMode && hoverCoords && (
                  <g key="add-ghost-node" className="pointer-events-none">
                    <circle
                      cx={toSvgX(hoverCoords.x)}
                      cy={toSvgY(hoverCoords.y)}
                      r={14}
                      className="fill-chart-primary/20 stroke-chart-primary"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                    <circle cx={toSvgX(hoverCoords.x)} cy={toSvgY(hoverCoords.y)} r={3.5} className="fill-chart-primary" />
                    <line
                      x1={toSvgX(hoverCoords.x)}
                      y1={toSvgY(0)}
                      x2={toSvgX(hoverCoords.x)}
                      y2={toSvgY(hoverCoords.y)}
                      className="stroke-status-success/70"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={toSvgX(hoverCoords.x)}
                      y={toSvgY(hoverCoords.y) - 16}
                      className="fill-status-success"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      + Add Point ({hoverCoords.x.toFixed(1)}m, {hoverCoords.y.toFixed(1)}m)
                    </text>
                  </g>
                )}
              </>
            )}

            {/* Key Dimension Dimension Arrows & Labels */}
            {/* LBP Dimension */}
            <g key="dim-lbp">
              <line x1={toSvgX(0)} y1={toSvgY(0) + 32} x2={toSvgX(LBP)} y2={toSvgY(0) + 32} className="stroke-chart-primary" strokeWidth="1.2" />
              <polygon points={`${toSvgX(0)},${toSvgY(0) + 32} ${toSvgX(0) + 6},${toSvgY(0) + 29} ${toSvgX(0) + 6},${toSvgY(0) + 35}`} className="fill-chart-primary" />
              <polygon points={`${toSvgX(LBP)},${toSvgY(0) + 32} ${toSvgX(LBP) - 6},${toSvgY(0) + 29} ${toSvgX(LBP) - 6},${toSvgY(0) + 35}`} className="fill-chart-primary" />
              <text x={toSvgX(LBP / 2)} y={toSvgY(0) + 44} className="fill-chart-primary" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                LBP = {LBP.toFixed(2)} m (Acuan Konstan Desain)
              </text>
            </g>

            {/* LOA Dimension (Top) */}
            <g key="dim-loa">
              <line x1={toSvgX(xMin)} y1={margin.top - 16} x2={toSvgX(xMax)} y2={margin.top - 16} className="stroke-status-success" strokeWidth="1.5" />
              <polygon points={`${toSvgX(xMin)},${margin.top - 16} ${toSvgX(xMin) + 6},${margin.top - 19} ${toSvgX(xMin) + 6},${margin.top - 13}`} className="fill-status-success" />
              <polygon points={`${toSvgX(xMax)},${margin.top - 16} ${toSvgX(xMax) - 6},${margin.top - 19} ${toSvgX(xMax) - 6},${margin.top - 13}`} className="fill-status-success" />
              <text x={toSvgX((xMin + xMax) / 2)} y={margin.top - 22} className="fill-status-success" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                LOA Pasti = {exactLoa.toFixed(2)} m ({loaRatio.toFixed(3)} x LBP)
              </text>
            </g>

            {/* Fore Overhang & Aft Overhang dimension markers */}
            {foreOverhang > 0 && (
              <g key="dim-fore-oh">
                <line x1={toSvgX(LBP)} y1={margin.top - 2} x2={toSvgX(xMax)} y2={margin.top - 2} className="stroke-status-success" strokeWidth="1" strokeDasharray="2,2" />
                <text x={toSvgX(LBP + foreOverhang / 2)} y={margin.top - 5} className="fill-status-success" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  OH Bow: +{foreOverhang.toFixed(2)}m
                </text>
              </g>
            )}

            {aftOverhang > 0 && (
              <g key="dim-aft-oh">
                <line x1={toSvgX(xMin)} y1={margin.top - 2} x2={toSvgX(0)} y2={margin.top - 2} className="stroke-chart-tertiary" strokeWidth="1" strokeDasharray="2,2" />
                <text x={toSvgX(xMin / 2)} y={margin.top - 5} className="fill-chart-tertiary" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  OH Stern: +{aftOverhang.toFixed(2)}m
                </text>
              </g>
            )}
          </svg>
        </div>

          {/* Selected node inspector — kept outside the drawing so controls never cover geometry */}
          {(() => {
            const selectedPt = allPoints.find((p) => p.id === selectedPointId);
            if (!selectedPt) return null;
            const isLocked = selectedPt.locked || selectedPt.id === "st-4" || selectedPt.id === "bw-4";
            return (
              <div className="bg-surface-primary border border-border-default rounded-lg p-4 flex flex-wrap items-center gap-4 text-sm font-mono">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    selectedPt.category === "bow"
                      ? "bg-status-success"
                      : selectedPt.category === "stern"
                      ? "bg-status-warning"
                      : "bg-status-warning"
                  } `} />
                  <div className="flex flex-col">
                    <span className="font-semibold text-text-primary text-xs truncate max-w-[140px]">{selectedPt.name}</span>
                    <span className="text-xs text-text-secondary">
                      {selectedPt.category === "bow" ? "Bow" : selectedPt.category === "stern" ? "Stern" : "Sheer"}
                      {isLocked && " • Statis"}
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-surface-secondary" />

                {/* X input */}
                <div className="flex items-center space-x-1">
                  <span className="text-text-secondary text-xs">X:</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={isLocked}
                    aria-label="Selected point X coordinate in metres"
                    value={selectedPt.x}
                    onChange={(e) => handleNumericUpdate(selectedPt.id, "x", parseFloat(e.target.value) || 0)}
                    className={`w-16 px-1.5 py-0.5 rounded border text-center font-semibold text-sm ${
                      isLocked
                        ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                        : "bg-surface-primary border-border-default text-text-primary focus:border-border-default min-h-10"
                    } `}
                  />
                  <span className="text-text-secondary text-xs">m</span>
                </div>

                {/* Y input */}
                <div className="flex items-center space-x-1">
                  <span className="text-text-secondary text-xs">Y:</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={isLocked}
                    aria-label="Selected point Y coordinate in metres"
                    value={selectedPt.y}
                    onChange={(e) => handleNumericUpdate(selectedPt.id, "y", parseFloat(e.target.value) || 0)}
                    className={`w-16 px-1.5 py-0.5 rounded border text-center font-semibold text-sm ${
                      isLocked
                        ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                        : "bg-surface-primary border-border-default text-text-primary focus:border-border-default min-h-10"
                    } `}
                  />
                  <span className="text-text-secondary text-xs">m</span>
                </div>

                {!isLocked && (
                  <button
                    onClick={() => handleDeletePoint(selectedPt.id)}
                    className="p-1.5 text-status-danger hover:text-status-danger hover:bg-status-danger-subtle rounded-md transition-colors cursor-pointer min-h-9"
                    title="Delete this control point"
                   aria-label="Delete this control point">
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  onClick={() => setSelectedPointId(null)}
                  className="text-text-secondary hover:text-text-secondary p-1 rounded-md hover:bg-surface-secondary transition-colors cursor-pointer min-h-9"
                    title="Close Inspector"
                 aria-label="Close Inspector">
                  <X size={12} />
                </button>
              </div>
            );
          })()}


        {/* Live Hydrostatic & Dimension Calculation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-3 text-left tabular-nums">
          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">Panjang LBP</div>
            <div className="text-base font-semibold text-accent-primary font-mono">{LBP.toFixed(2)} m</div>
            <div className="text-xs text-text-secondary">AP ke FP (Konstan)</div>
          </div>

          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">LOA Pasti (Kurva)</div>
            <div className="text-base font-semibold text-accent-primary font-mono">{exactLoa.toFixed(2)} m</div>
            <div className="text-xs text-text-secondary font-mono">Xmax - Xmin</div>
          </div>

          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">Aproksimasi Awal</div>
            <div className="text-base font-semibold text-text-primary font-mono">{loaApproximation.toFixed(2)} m</div>
            <div className="text-xs text-text-secondary font-mono">1.025 x LBP</div>
          </div>

          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">Fore Overhang</div>
            <div className="text-base font-semibold text-text-primary font-mono">+{foreOverhang.toFixed(2)} m</div>
            <div className="text-xs text-text-secondary">Di depan FP</div>
          </div>

          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">Aft Overhang</div>
            <div className="text-base font-semibold text-text-primary font-mono">+{aftOverhang.toFixed(2)} m</div>
            <div className="text-xs text-text-secondary">Di belakang AP</div>
          </div>

          <div className="py-3 border-b border-border-subtle space-y-1 min-w-0">
            <div className="text-xs text-text-secondary font-medium">Rasio LOA / LBP</div>
            <div className="text-base font-semibold text-text-primary font-mono">{loaRatio.toFixed(3)}</div>
            <div className="text-xs text-text-secondary font-mono">Std: 1.02 ~ 1.06</div>
          </div>
        </div>
      </div>

      {/* Control Points 2-Way Coordinate Table */}
      <div className="pt-6 border-t border-border-default space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
          <div className="flex items-center space-x-2 text-accent-primary font-semibold text-sm tracking-normal">
            <TableIcon size={16} />
            <span>Control Point Coordinate Tables (2-Way Interactive Sync)</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-text-secondary hidden md:inline">
              {language === "en"
                ? "Values can be edited directly for millimeter precision."
                : "Nilai dapat disunting langsung untuk presisi tingkat milimeter."}
            </span>
            <button
              type="button"
              onClick={() => setShowCoordinateTables(!showCoordinateTables)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer border ${
                showCoordinateTables
                  ? "bg-surface-secondary hover:bg-surface-secondary text-text-primary border-border-default min-h-9"
                  : "bg-surface-selected hover:bg-surface-selected text-accent-primary border-border-default min-h-9"
              } `}
              title={
                showCoordinateTables
                  ? (language === "en" ? "Hide Coordinate Tables" : "Sembunyikan Tabel Koordinat")
                  : (language === "en" ? "Show Coordinate Tables" : "Tampilkan Tabel Koordinat")
              }
             aria-pressed={showCoordinateTables} aria-label={
                showCoordinateTables
                  ? (language === "en" ? "Hide Coordinate Tables" : "Sembunyikan Tabel Koordinat")
                  : (language === "en" ? "Show Coordinate Tables" : "Tampilkan Tabel Koordinat")
              }>
              {showCoordinateTables ? <EyeOff size={14} className="text-accent-primary" /> : <Eye size={14} className="text-accent-primary" />}
              <span>
                {showCoordinateTables
                  ? (language === "en" ? "Hide Tables" : "Sembunyikan Tabel")
                  : (language === "en" ? "Show Tables" : "Tampilkan Tabel")}
              </span>
            </button>
          </div>
        </div>

        {showCoordinateTables ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Haluan (Bow) Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                <span>Bow Stem Control Points (Bow Stem Profile)</span>
              </div>
              <span className="text-xs text-text-secondary">{bowPoints.length} Points</span>
            </h4>
            <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-secondary text-text-secondary text-xs font-semibold border-b border-border-default">
                  <tr>
                    <th className="p-2.5">Node Name</th>
                    <th className="p-2.5">X (Meters from AP)</th>
                    <th className="p-2.5">Y (Elevation from BL)</th>
                    <th className="p-2.5">Station Ref.</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-sm">
                  {bowPoints.map((pt) => {
                    const stasiEst = (pt.x / (LBP / 20)).toFixed(1);
                    const isLocked = pt.locked || pt.id === "bw-4";
                    const isSelected = selectedPointId === pt.id;
                    return (
                      <tr
                        key={pt.id}
                        onClick={() => setSelectedPointId(pt.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-surface-selected"
                            : isLocked
                            ? "bg-surface-canvas hover:bg-surface-secondary"
                            : "hover:bg-surface-canvas"
                        } `}
                      >
                        <td className="p-2.5 text-text-primary">
                          <div className="font-medium flex items-center space-x-1.5">
                            <span>{englishPointText(pt.name)}</span>
                            {isLocked && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary text-xs border border-border-default font-mono font-medium">
                                <Lock size={9} />
                                <span>STATIS (FP)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary">{englishPointText(pt.description)}</div>
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: X coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.x}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className={`w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                              isLocked
                                ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                                : "bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                            } `}
                            title={isLocked ? "Garis acuan konstan FP (LBP) terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: Y coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.y}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className={`w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                              isLocked
                                ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                                : "bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                            } `}
                            title={isLocked ? "Garis acuan konstan sarat DWL terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5 text-text-secondary text-sm font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          {!isLocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoint(pt.id);
                              }}
                              className="text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle p-1.5 rounded-md transition-colors cursor-pointer min-h-9"
                              title="Delete this point"
                             aria-label="Delete this point">
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-text-secondary text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buritan (Stern) Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                <span>Stern Stem Control Points (Stern & Transom Profile)</span>
              </div>
              <span className="text-xs text-text-secondary">{sternPoints.length} Points</span>
            </h4>
            <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-secondary text-text-secondary text-xs font-semibold border-b border-border-default">
                  <tr>
                    <th className="p-2.5">Node Name</th>
                    <th className="p-2.5">X (Meters from AP)</th>
                    <th className="p-2.5">Y (Elevation from BL)</th>
                    <th className="p-2.5">Station Ref.</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-sm">
                  {sternPoints.map((pt) => {
                    const stasiEst = (pt.x / (LBP / 20)).toFixed(1);
                    const isLocked = pt.locked || pt.id === "st-4";
                    const isSelected = selectedPointId === pt.id;
                    return (
                      <tr
                        key={pt.id}
                        onClick={() => setSelectedPointId(pt.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-surface-selected"
                            : isLocked
                            ? "bg-surface-canvas hover:bg-surface-secondary"
                            : "hover:bg-surface-canvas"
                        } `}
                      >
                        <td className="p-2.5 text-text-primary">
                          <div className="font-medium flex items-center space-x-1.5">
                            <span>{englishPointText(pt.name)}</span>
                            {isLocked && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary text-xs border border-border-default font-mono font-medium">
                                <Lock size={9} />
                                <span>STATIS (AP)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary">{englishPointText(pt.description)}</div>
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: X coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.x}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className={`w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                              isLocked
                                ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                                : "bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                            } `}
                            title={isLocked ? "Garis acuan konstan AP (x=0) terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: Y coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.y}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className={`w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                              isLocked
                                ? "bg-surface-secondary border-border-default text-text-secondary cursor-not-allowed min-h-10"
                                : "bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                            } `}
                            title={isLocked ? "Garis acuan konstan sarat DWL terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5 text-text-secondary text-sm font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          {!isLocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoint(pt.id);
                              }}
                              className="text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle p-1.5 rounded-md transition-colors cursor-pointer min-h-9"
                              title="Delete this point"
                             aria-label="Delete this point">
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-text-secondary text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sheer Geladak Table (Collapsible / Secondary) */}
        <div className="pt-2 border-t border-border-default">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-primary flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                <span>Deck Sheer Control Points (Deck Sheer Profile)</span>
              </div>
              <span className="text-xs text-text-secondary">{sheerPoints.length} Points</span>
            </h4>
            <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-secondary text-text-secondary text-xs font-semibold border-b border-border-default">
                  <tr>
                    <th className="p-2.5">Node Name</th>
                    <th className="p-2.5">X (Meters from AP)</th>
                    <th className="p-2.5">Y (Elevation from BL)</th>
                    <th className="p-2.5">Station Ref.</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-sm">
                  {sheerPoints.map((pt) => {
                    const stasiEst = (pt.x / (LBP / 20)).toFixed(1);
                    const isSelected = selectedPointId === pt.id;
                    return (
                      <tr
                        key={pt.id}
                        onClick={() => setSelectedPointId(pt.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-surface-selected" : "hover:bg-surface-canvas"
                        } `}
                      >
                        <td className="p-2.5 text-text-primary">
                          <div className="font-medium">{englishPointText(pt.name)}</div>
                          <div className="text-xs text-text-secondary">{englishPointText(pt.description)}</div>
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: X coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.x}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className="w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                          />
                        </td>
                        <td className="p-2.5">
                          <input aria-label={`Point ${pt.id}: Y coordinate (m)`}
                            type="number"
                            step="0.05"
                            value={pt.y}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className="w-24 min-w-[5.5rem] border px-2 py-1 rounded-md text-sm font-mono font-semibold bg-surface-primary border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring focus:border-border-default min-h-10"
                          />
                        </td>
                        <td className="p-2.5 text-text-secondary text-sm font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePoint(pt.id);
                            }}
                            className="text-text-secondary hover:text-status-danger hover:bg-status-danger-subtle p-1.5 rounded-md transition-colors cursor-pointer min-h-9"
                            title="Delete this point"
                           aria-label="Delete this point">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
        ) : (
          <div
            onClick={() => setShowCoordinateTables(true)}
            className="bg-surface-canvas hover:bg-surface-secondary border border-dashed border-border-default hover:border-border-default rounded-lg p-3.5 flex items-center justify-between gap-3 text-sm cursor-pointer transition-colors group"
            title={language === "en" ? "Click to expand coordinate tables" : "Klik untuk menampilkan tabel koordinat"}
          >
            <div className="flex items-center space-x-3 text-text-secondary">
              <TableIcon size={16} className="text-text-secondary group-hover:text-accent-primary transition-colors" />
              <div>
                <span className="font-semibold text-text-primary group-hover:text-text-primary transition-colors">
                  {language === "en" ? "Control Points Coordinate Tables are Hidden" : "Tabel Koordinat Titik Kontrol Disembunyikan"}
                </span>
                <span className="text-xs text-text-secondary font-mono ml-2">
                  ({bowPoints.length} Bow • {sternPoints.length} Stern • {sheerPoints.length} Sheer)
                </span>
              </div>
            </div>
            <span className="text-sm text-text-secondary group-hover:text-accent-primary flex items-center gap-1 font-medium transition-colors">
              <span>{language === "en" ? "Click to expand" : "Klik untuk menampilkan"}</span>
              <ChevronDown size={14} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
