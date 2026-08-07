"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Eye,
  EyeOff,
  Sparkles,
  Table as TableIcon,
  Anchor,
  Activity,
  Box,
  Lock,
  Plus,
  Trash2,
  Crosshair,
  MousePointer
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

export interface SideProfileProps {
  lbp_m?: number;
  depth_m?: number;
  draft_m?: number;
  breadth_m?: number;
  cb?: number;
  vesselType?: string;
  onUpdateLoa?: (exactLoa: number, bowOverhang: number, sternOverhang: number) => void;
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

export const SideProfileNurbsEditor: React.FC<SideProfileProps> = ({
  lbp_m = 90.0,
  depth_m = 8.0,
  draft_m = 5.5,
  breadth_m = 16.0,
  cb = 0.76,
  vesselType = "GENERAL_CARGO",
  onUpdateLoa
}) => {
  const LBP = Math.max(10, lbp_m);
  const H = Math.max(2, depth_m);
  const T = Math.max(1, draft_m);

  type PresetDict = Record<string, { name: string; stern: ControlPoint[]; bow: ControlPoint[]; sheer: ControlPoint[] }>;

  // Preset Configurations
  const getPresets = (baseLbp: number, baseH: number, baseT: number): PresetDict => {
    const defaultCargoStern: ControlPoint[] = [
      { id: "st-1", name: "Lunas Buritan (Aft Keel)", category: "stern", x: baseLbp * 0.05, y: 0.0, description: "Pangkal lunas sebelum kurva poros" },
      { id: "st-2", name: "Lengkung Bossing (Bawah)", category: "stern", x: baseLbp * 0.02, y: baseT * 0.22, description: "Kepadatan titik bawah sarat (Dosen)" },
      { id: "st-3", name: "Poros Propeller (Boss)", category: "stern", x: baseLbp * 0.005, y: baseT * 0.52, description: "Tinggi pusat poros baling-baling" },
      { id: "st-4", name: "Garis Air Buritan (AP / DWL)", category: "stern", x: 0.0, y: baseT, locked: true, description: "Intersep AP pada sarat muat DWL (Acuan Statis Konstan LBP)" },
      { id: "st-5", name: "Knuckle Transom Buritan", category: "stern", x: -baseLbp * 0.025, y: baseT + (baseH - baseT) * 0.5, description: "Sudut lipatan transom belakang" },
      { id: "st-6", name: "Puncak Geladak Buritan", category: "stern", x: -baseLbp * 0.035, y: baseH + 1.1, description: "Ujung tertinggi poop deck buritan" }
    ];

    const defaultCargoBow: ControlPoint[] = [
      { id: "bw-1", name: "Forefoot Tangent (Dasar)", category: "bow", x: baseLbp * 0.94, y: 0.0, description: "Pangkal awal kelengkungan haluan" },
      { id: "bw-2", name: "Haluan Bawah Air (Elevasi Rendah)", category: "bow", x: baseLbp * 0.975, y: baseT * 0.3, description: "Kepadatan titik bawah sarat (Dosen)" },
      { id: "bw-3", name: "Haluan Bawah Air (Mid-Draft)", category: "bow", x: baseLbp * 0.99, y: baseT * 0.65, description: "Kelengkungan linggi haluan" },
      { id: "bw-4", name: "Linggi Haluan FP (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Intersep FP pada garis sarat air DWL (Acuan Statis Konstan LBP)" },
      { id: "bw-5", name: "Haluan Flaring Atas", category: "bow", x: baseLbp * 1.025, y: baseT + (baseH - baseT) * 0.55, description: "Kemiringan linggi haluan (flare)" },
      { id: "bw-6", name: "Puncak Haluan (Forecastle Peak)", category: "bow", x: baseLbp * 1.045, y: baseH + 1.8, description: "Ujung terdepan geladak akil haluan" }
    ];

    const defaultSheer: ControlPoint[] = [
      { id: "sh-1", name: "Sheer Buritan (AP)", category: "sheer", x: -baseLbp * 0.035, y: baseH + 1.1, description: "Tinggi sheer ujung buritan" },
      { id: "sh-2", name: "Sheer 1/6 LBP", category: "sheer", x: baseLbp * 0.166, y: baseH + 0.3, description: "Kurva sheer transisi buritan" },
      { id: "sh-3", name: "Sheer Midship (St. 10)", category: "sheer", x: baseLbp * 0.5, y: baseH, description: "Titik terendah sheer di midship" },
      { id: "sh-4", name: "Sheer 5/6 LBP", category: "sheer", x: baseLbp * 0.833, y: baseH + 0.55, description: "Kurva sheer transisi haluan" },
      { id: "sh-5", name: "Sheer Haluan (FP)", category: "sheer", x: baseLbp * 1.045, y: baseH + 1.8, description: "Tinggi sheer ujung haluan (forecastle)" }
    ];

    return {
      cargo: { name: "General Cargo (Raked Bow + Transom Stern)", stern: defaultCargoStern, bow: defaultCargoBow, sheer: defaultSheer },
      tanker: {
        name: "Tanker / Curah (Bulbous Bow + Cruiser Stern)",
        stern: [
          { id: "st-1", name: "Lunas Buritan (Aft Keel)", category: "stern", x: baseLbp * 0.08, y: 0.0, description: "Pangkal lunas buritan" },
          { id: "st-2", name: "Lengkung Skeg Poros", category: "stern", x: baseLbp * 0.03, y: baseT * 0.25, description: "Lengkung bawah sarat" },
          { id: "st-3", name: "Poros Propeller", category: "stern", x: baseLbp * 0.008, y: baseT * 0.5, description: "Pusat bossing baling-baling" },
          { id: "st-4", name: "Garis Air AP (DWL)", category: "stern", x: 0.0, y: baseT, locked: true, description: "Intersep AP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "st-5", name: "Lengkung Cruiser Stern", category: "stern", x: -baseLbp * 0.04, y: baseT + (baseH - baseT) * 0.45, description: "Bulatan cruiser stern melengkung" },
          { id: "st-6", name: "Puncak Geladak Poop", category: "stern", x: -baseLbp * 0.045, y: baseH + 0.9, description: "Geladak buritan tanker" }
        ],
        bow: [
          { id: "bw-1", name: "Forefoot Tangent (Dasar)", category: "bow", x: baseLbp * 0.92, y: 0.0, description: "Dasar sebelum bulb" },
          { id: "bw-2", name: "Bawah Bulbous Bow", category: "bow", x: baseLbp * 0.99, y: baseT * 0.15, description: "Dasar bulbous bow" },
          { id: "bw-3", name: "Ujung Depan Bulbous Bow", category: "bow", x: baseLbp * 1.035, y: baseT * 0.45, description: "Hidung terdepan bulb bawah air" },
          { id: "bw-4", name: "Cekungan Atas Bulb (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Intersep FP pada sarat muat DWL (Acuan Statis Konstan LBP)" },
          { id: "bw-5", name: "Linggi Haluan Tegak", category: "bow", x: baseLbp * 1.015, y: baseT + (baseH - baseT) * 0.6, description: "Kemiringan stem atas" },
          { id: "bw-6", name: "Puncak Haluan Forecastle", category: "bow", x: baseLbp * 1.03, y: baseH + 1.6, description: "Puncak haluan tanker" }
        ],
        sheer: defaultSheer
      },
      axeBow: {
        name: "Container / Patrol (Axe Bow + Flat Transom)",
        stern: [
          { id: "st-1", name: "Lunas Buritan", category: "stern", x: baseLbp * 0.04, y: 0.0, description: "Lunas buritan datar" },
          { id: "st-2", name: "Lengkung Skeg", category: "stern", x: baseLbp * 0.015, y: baseT * 0.25, description: "Lengkung bawah air" },
          { id: "st-3", name: "Poros Propeller", category: "stern", x: baseLbp * 0.005, y: baseT * 0.5, description: "Poros kemudi" },
          { id: "st-4", name: "AP pada DWL", category: "stern", x: 0.0, y: baseT, locked: true, description: "Intersep AP (Acuan Statis Konstan LBP)" },
          { id: "st-5", name: "Sudut Transom", category: "stern", x: -baseLbp * 0.02, y: baseT + (baseH - baseT) * 0.5, description: "Transom datar miring" },
          { id: "st-6", name: "Puncak Poop Deck", category: "stern", x: -baseLbp * 0.03, y: baseH + 0.8, description: "Geladak buritan" }
        ],
        bow: [
          { id: "bw-1", name: "Forefoot Vertikal", category: "bow", x: baseLbp * 0.98, y: 0.0, description: "Ujung lunas depan" },
          { id: "bw-2", name: "Linggi Haluan Bawah (Axe)", category: "bow", x: baseLbp * 0.995, y: baseT * 0.35, description: "Garis haluan kapak vertikal" },
          { id: "bw-3", name: "Linggi Haluan Mid", category: "bow", x: baseLbp * 1.002, y: baseT * 0.7, description: "Garis haluan lurus vertikal" },
          { id: "bw-4", name: "Haluan FP (DWL)", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Intersep FP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "bw-5", name: "Haluan Atas", category: "bow", x: baseLbp * 1.01, y: baseT + (baseH - baseT) * 0.55, description: "Haluan ramping" },
          { id: "bw-6", name: "Puncak Haluan Axe", category: "bow", x: baseLbp * 1.015, y: baseH + 1.4, description: "Puncak haluan kapak" }
        ],
        sheer: defaultSheer
      },
      barge: {
        name: "Tongkang / Ponton (Box Hull / Full PMB)",
        stern: [
          { id: "st-1", name: "Dasar Rake Buritan", category: "stern", x: baseLbp * 0.08, y: 0.0, description: "Awal kemiringan buritan" },
          { id: "st-2", name: "Rake Buritan Bawah", category: "stern", x: baseLbp * 0.04, y: baseT * 0.3, description: "Kemiringan bawah sarat" },
          { id: "st-3", name: "Rake Buritan Tengah", category: "stern", x: baseLbp * 0.015, y: baseT * 0.65, description: "Kemiringan tengah sarat" },
          { id: "st-4", name: "AP pada DWL", category: "stern", x: 0.0, y: baseT, locked: true, description: "Garis AP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "st-5", name: "Transom Tongkang", category: "stern", x: -baseLbp * 0.015, y: baseT + (baseH - baseT) * 0.5, description: "Dinding buritan tongkang" },
          { id: "st-6", name: "Ujung Geladak Buritan", category: "stern", x: -baseLbp * 0.02, y: baseH, description: "Geladak rata buritan tongkang" }
        ],
        bow: [
          { id: "bw-1", name: "Dasar Rake Haluan", category: "bow", x: baseLbp * 0.92, y: 0.0, description: "Awal kemiringan haluan" },
          { id: "bw-2", name: "Rake Haluan Bawah", category: "bow", x: baseLbp * 0.96, y: baseT * 0.3, description: "Kemiringan bawah sarat" },
          { id: "bw-3", name: "Rake Haluan Tengah", category: "bow", x: baseLbp * 0.985, y: baseT * 0.65, description: "Kemiringan tengah sarat" },
          { id: "bw-4", name: "FP pada DWL", category: "bow", x: baseLbp * 1.0, y: baseT, locked: true, description: "Garis FP pada DWL (Acuan Statis Konstan LBP)" },
          { id: "bw-5", name: "Transom Depan", category: "bow", x: baseLbp * 1.015, y: baseT + (baseH - baseT) * 0.5, description: "Dinding haluan tongkang" },
          { id: "bw-6", name: "Ujung Geladak Haluan", category: "bow", x: baseLbp * 1.02, y: baseH, description: "Geladak rata haluan tongkang" }
        ],
        sheer: [
          { id: "sh-1", name: "Sheer Buritan", category: "sheer", x: -baseLbp * 0.02, y: baseH, description: "Geladak datar" },
          { id: "sh-2", name: "Sheer 1/6 LBP", category: "sheer", x: baseLbp * 0.166, y: baseH, description: "Geladak datar" },
          { id: "sh-3", name: "Sheer Midship", category: "sheer", x: baseLbp * 0.5, y: baseH, description: "Geladak datar" },
          { id: "sh-4", name: "Sheer 5/6 LBP", category: "sheer", x: baseLbp * 0.833, y: baseH, description: "Geladak datar" },
          { id: "sh-5", name: "Sheer Haluan", category: "sheer", x: baseLbp * 1.02, y: baseH, description: "Geladak datar" }
        ]
      }
    };
  };

  const initialPresets = useMemo(() => getPresets(LBP, H, T), [LBP, H, T]);

  // Initial State: Select preset based on vesselType
  const defaultKey = vesselType === "TANKER" || vesselType === "BULK_CARRIER" ? "tanker" : "cargo";
  const [selectedPreset, setSelectedPreset] = useState<string>(defaultKey);
  const [sternPoints, setSternPoints] = useState<ControlPoint[]>(initialPresets[defaultKey].stern);
  const [bowPoints, setBowPoints] = useState<ControlPoint[]>(initialPresets[defaultKey].bow);
  const [sheerPoints, setSheerPoints] = useState<ControlPoint[]>(initialPresets[defaultKey].sheer);

  // Synchronize with parent dimension changes if preset changes
  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const p = initialPresets[key as keyof typeof initialPresets] || initialPresets.cargo;
    setSternPoints(p.stern);
    setBowPoints(p.bow);
    setSheerPoints(p.sheer);
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

  // Sync to parent callback if provided
  useEffect(() => {
    if (onUpdateLoa) {
      onUpdateLoa(exactLoa, foreOverhang, aftOverhang);
    }
  }, [exactLoa, foreOverhang, aftOverhang, onUpdateLoa]);

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

  // Add Point Handler at exact meter coordinates
  const handleAddPointAtCoord = (xMeter: number, yMeter: number) => {
    let cat = addCategory;
    if (cat === "auto") {
      if (yMeter > H * 0.85 && xMeter > LBP * 0.15 && xMeter < LBP * 0.85) {
        cat = "sheer";
      } else if (xMeter >= LBP * 0.5) {
        cat = "bow";
      } else {
        cat = "stern";
      }
    }

    const newId = `custom-${Date.now()}`;
    const catTitle = cat === "bow" ? "Haluan" : cat === "stern" ? "Buritan" : "Sheer";
    const clampedX = Math.round(xMeter * 100) / 100;
    const clampedY = Math.max(0, Math.round(yMeter * 100) / 100);

    const newPoint: ControlPoint = {
      id: newId,
      name: `${catTitle} Kustom (${clampedX}, ${clampedY})`,
      category: cat,
      x: clampedX,
      y: clampedY,
      description: `Titik kontrol ${catTitle} tambahan manual (dapat digeser bebas)`
    };

    if (cat === "bow") {
      setBowPoints((prev) => [...prev, newPoint].sort((a, b) => a.y - b.y));
    } else if (cat === "stern") {
      setSternPoints((prev) => [...prev, newPoint].sort((a, b) => a.y - b.y));
    } else {
      setSheerPoints((prev) => [...prev, newPoint].sort((a, b) => a.x - b.x));
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

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Header Banner: Title & Educational Directives */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Compass size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Studio Tampak Samping & Profil Lambung (NURBS Spline)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Perancangan kurva linggi haluan (bow), linggi buritan (stern), garis dasar (baseline), dan sheer geladak dengan titik kontrol interaktif.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div className="flex items-center space-x-2 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <option value="cargo">General Cargo (Raked Bow + Transom)</option>
              <option value="tanker">Tanker / Bulk (Bulbous Bow + Cruiser)</option>
              <option value="axeBow">Container / Fast (Axe Bow + Transom)</option>
              <option value="barge">Tongkang / Ponton (Box Hull / Full PMB)</option>
            </select>
          </div>
        </div>

        {/* 4 Core Principles Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                <Anchor size={14} />
                <span>1. Batasan Tetap LBP</span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">Tetap</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              LBP (<strong className="text-white font-mono">{LBP.toFixed(2)} m</strong>) bersifat konstan dari AP (St. 0) hingga FP (St. 20).
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                <Activity size={14} />
                <span>2. Kepadatan Bawah Sarat</span>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">NURBS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Titik kontrol dibuat rapat di bawah sarat air agar kelengkungan linggi haluan & buritan mulus (smooth).
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Maximize2 size={14} />
                <span>3. Nilai Pasti LOA</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">Real-Time</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              LOA dihitung dari selisih puncak haluan dan ujung buritan: <strong className="text-emerald-300 font-mono font-bold">{exactLoa.toFixed(2)} m</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-purple-400 font-semibold">
                <Box size={14} />
                <span>4. Parallel Middle Body</span>
              </div>
              <span className="text-[10px] bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold">PMB</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Zona lunas datar tengah (PMB) membentang dari St. {(pmbStartX / (LBP / 20)).toFixed(1)} s.d. St. {(pmbEndX / (LBP / 20)).toFixed(1)}.
            </p>
          </div>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 space-y-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Top Control Bar for View Toggles & Add Point Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 pb-3">
          {/* Left: View Layer Switches */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowStations(!showStations)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                showStations
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>St. 0-20</span>
            </button>

            <button
              onClick={() => setShowWaterlines(!showWaterlines)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                showWaterlines
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-300 font-semibold"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Garis Air (WL / DWL)</span>
            </button>

            <button
              onClick={() => setShowPmbZone(!showPmbZone)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                showPmbZone
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300 font-semibold"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Zona PMB</span>
            </button>

            <button
              onClick={() => setShowControlNodes(!showControlNodes)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                showControlNodes
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Titik Kontrol (Nodes)</span>
            </button>

            <button
              onClick={() => setShowWaterlineShading(!showWaterlineShading)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                showWaterlineShading
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Arsiran Sarat (T)</span>
            </button>
          </div>

          {/* Right: Add Point Mode & Reset Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add Point Toolbar Toggle & Category Pill */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsAddMode(!isAddMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isAddMode
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/50 ring-2 ring-emerald-500/20"
                    : "bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/40 hover:border-emerald-500/50"
                }`}
                title="Klik untuk mengaktifkan mode penambahan titik baru pada profil kapal"
              >
                <Plus size={14} className={isAddMode ? "rotate-45 transition-transform" : ""} />
                <span>{isAddMode ? "Tutup Mode Tambah" : "+ Tambah Titik (Add Point)"}</span>
              </button>

              {isAddMode && (
                <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-700/80">
                  {(
                    [
                      { key: "auto", label: "⚡ Otomatis", desc: "Deteksi otomatis berdasarkan posisi klik" },
                      { key: "bow", label: "🟢 Haluan", desc: "Titik profil linggi haluan" },
                      { key: "stern", label: "🟠 Buritan", desc: "Titik profil linggi buritan" },
                      { key: "sheer", label: "🟡 Sheer", desc: "Titik profil sheer geladak" }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setAddCategory(cat.key)}
                      title={cat.desc}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        addCategory === cat.key
                          ? "bg-emerald-900/90 text-white shadow-sm border border-emerald-500/60"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => applyPreset(selectedPreset)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Reset ke posisi default preset"
            >
              <RotateCcw size={13} />
              <span>Reset Titik</span>
            </button>
          </div>
        </div>

        {/* Interactive SVG Profile View Canvas */}
        <div className="w-full h-[520px] bg-[#01040a] rounded-xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center select-none shadow-inner">
          {/* Add Point Active Banner */}
          {isAddMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-2 rounded-xl text-xs flex items-center space-x-3 shadow-2xl backdrop-blur-md animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-emerald-300">Mode Tambah Titik Aktif:</span>
              <span className="text-slate-200">
                Klik pada area kanvas untuk menempatkan titik kontrol{" "}
                <span className="font-bold text-emerald-400">
                  ({addCategory === "auto" ? "Otomatis" : addCategory === "bow" ? "Haluan" : addCategory === "stern" ? "Buritan" : "Sheer"})
                </span>
              </span>
              <button
                onClick={() => setIsAddMode(false)}
                className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/50 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              >
                Selesai / Batal
              </button>
            </div>
          )}

          {/* Coordinate HUD (Live Meter Tracker) */}
          <div className="absolute bottom-3 right-3 z-20 bg-slate-950/90 border border-slate-800/90 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 flex items-center space-x-2.5 pointer-events-none backdrop-blur-md shadow-xl">
            <Crosshair size={13} className="text-cyan-400" />
            <span>X: <strong className="text-white">{hoverCoords ? `${hoverCoords.x.toFixed(2)} m` : "--"}</strong></span>
            <span className="text-slate-700">|</span>
            <span>Y: <strong className="text-white">{hoverCoords ? `${hoverCoords.y.toFixed(2)} m` : "--"}</strong></span>
            <span className="text-slate-700">|</span>
            <span>Stasi: <strong className="text-cyan-400">{hoverCoords ? (hoverCoords.x / (LBP / 20)).toFixed(1) : "--"}</strong></span>
          </div>

          <svg
            ref={svgRef}
            className={`w-full h-full ${isAddMode ? "cursor-crosshair" : "cursor-default"}`}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
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
                <line x1="0" y1="0" x2="0" y2="8" stroke="#0ea5e9" strokeWidth="0.8" strokeOpacity="0.3" />
              </pattern>

              {/* Grid Background Pattern */}
              <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f172a" strokeWidth="0.5" />
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
                  fill="rgba(168, 85, 247, 0.06)"
                  stroke="#a855f7"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  strokeOpacity="0.4"
                />
                <text
                  x={(toSvgX(pmbStartX) + toSvgX(pmbEndX)) / 2}
                  y={toSvgY(H * 1.1) - 4}
                  fill="#c084fc"
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
                        stroke={isDwl ? "#0284c7" : isDeck ? "#eab308" : isBase ? "#94a3b8" : "#1e293b"}
                        strokeWidth={isDwl || isDeck || isBase ? 1.5 : 0.6}
                        strokeDasharray={isDwl ? "6,3" : isDeck ? "4,2" : undefined}
                      />
                      <text
                        x={margin.left - 20}
                        y={y + 3.5}
                        fill={isDwl ? "#38bdf8" : isDeck ? "#facc15" : isBase ? "#cbd5e1" : "#475569"}
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
                          fill={isDwl ? "#38bdf8" : "#facc15"}
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
                        stroke={isAp ? "#f97316" : isFp ? "#22c55e" : isMid ? "#38bdf8" : "#1e293b"}
                        strokeWidth={isAp || isFp ? 1.5 : isMid ? 1.8 : 0.6}
                        strokeDasharray={isAp || isFp ? "6,2" : isMid ? "5,3" : "2,2"}
                      />
                      <text
                        x={x}
                        y={toSvgY(0) + 16}
                        fill={isAp ? "#fb923c" : isFp ? "#4ade80" : isMid ? "#38bdf8" : "#64748b"}
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
                            fill="rgba(2, 132, 199, 0.25)"
                            stroke="#38bdf8"
                            strokeWidth={0.8}
                          />
                          <text
                            x={x}
                            y={toSvgY(Math.max(H * 1.15, plotMaxY - 1.0)) - 5}
                            fill="#7dd3fc"
                            fontSize="8.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            ⊗ Gading 10 (Midship)
                          </text>

                          {/* Symbol ⊗ at DWL Intersection */}
                          <circle
                            cx={x}
                            cy={toSvgY(T)}
                            r={6}
                            fill="rgba(14, 165, 233, 0.25)"
                            stroke="#38bdf8"
                            strokeWidth={1.2}
                          />
                          <line x1={x - 6} y1={toSvgY(T)} x2={x + 6} y2={toSvgY(T)} stroke="#38bdf8" strokeWidth={1} />
                          <line x1={x} y1={toSvgY(T) - 6} x2={x} y2={toSvgY(T) + 6} stroke="#38bdf8" strokeWidth={1} />
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
              stroke="#0284c7"
              strokeWidth="2.5"
            />

            {/* Stern Profile Spline Curve */}
            <path
              d={`M ${toSvgX(sternSpline[0].x)},${toSvgY(sternSpline[0].y)} ${sternSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />

            {/* Bow Profile Spline Curve */}
            <path
              d={`M ${toSvgX(bowSpline[0].x)},${toSvgY(bowSpline[0].y)} ${bowSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />

            {/* Main Deck Sheer Curve */}
            <path
              d={`M ${toSvgX(sheerSpline[0].x)},${toSvgY(sheerSpline[0].y)} ${sheerSpline
                .slice(1)
                .map((p) => `L ${toSvgX(p.x)},${toSvgY(p.y)}`)
                .join(" ")}`}
              fill="none"
              stroke="#facc15"
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
                  stroke="#64748b"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                {/* Bow Polygon */}
                <polyline
                  points={bowPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                {/* Sheer Polygon */}
                <polyline
                  points={sheerPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")}
                  fill="none"
                  stroke="#64748b"
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
                    ? "#38bdf8"
                    : pt.category === "stern"
                    ? "#f97316"
                    : pt.category === "bow"
                    ? "#22c55e"
                    : "#eab308";

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
                        fill={isLocked ? "rgba(2, 132, 199, 0.35)" : isDragging ? "rgba(56, 189, 248, 0.5)" : "rgba(15, 23, 42, 0.85)"}
                        stroke={color}
                        strokeWidth={isLocked ? 2.5 : isSelected ? 2.5 : 1.8}
                        pointerEvents="none"
                      />
                      {/* Locked concentric crosshair / indicator */}
                      {isLocked ? (
                        <>
                          <circle cx={cx} cy={cy} r={6} fill="none" stroke="#38bdf8" strokeWidth={1.2} strokeDasharray="2,2" pointerEvents="none" />
                          <circle cx={cx} cy={cy} r={2} fill="#38bdf8" pointerEvents="none" />
                        </>
                      ) : (
                        <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" pointerEvents="none" />
                      )}

                      {/* Coordinates Label */}
                      <text
                        x={textX}
                        y={cy - (isLocked ? 13 : 10)}
                        fill={isLocked ? "#38bdf8" : isSelected ? "#ffffff" : "#94a3b8"}
                        fontSize={isLocked ? "9" : "8.5"}
                        fontWeight={isLocked || isSelected ? "bold" : "normal"}
                        textAnchor={anchor}
                        fontFamily="monospace"
                        pointerEvents="none"
                      >
                        {isLocked
                          ? `🔒 ${pt.id === "st-4" ? "AP" : "FP"} (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`
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
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                    <circle cx={toSvgX(hoverCoords.x)} cy={toSvgY(hoverCoords.y)} r={3.5} fill="#10b981" />
                    <line
                      x1={toSvgX(hoverCoords.x)}
                      y1={toSvgY(0)}
                      x2={toSvgX(hoverCoords.x)}
                      y2={toSvgY(hoverCoords.y)}
                      stroke="#10b981"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={toSvgX(hoverCoords.x)}
                      y={toSvgY(hoverCoords.y) - 16}
                      fill="#6ee7b7"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      + Tambah Titik ({hoverCoords.x.toFixed(1)}m, {hoverCoords.y.toFixed(1)}m)
                    </text>
                  </g>
                )}
              </>
            )}

            {/* Key Dimension Dimension Arrows & Labels */}
            {/* LBP Dimension */}
            <g key="dim-lbp">
              <line x1={toSvgX(0)} y1={toSvgY(0) + 32} x2={toSvgX(LBP)} y2={toSvgY(0) + 32} stroke="#38bdf8" strokeWidth="1.2" />
              <polygon points={`${toSvgX(0)},${toSvgY(0) + 32} ${toSvgX(0) + 6},${toSvgY(0) + 29} ${toSvgX(0) + 6},${toSvgY(0) + 35}`} fill="#38bdf8" />
              <polygon points={`${toSvgX(LBP)},${toSvgY(0) + 32} ${toSvgX(LBP) - 6},${toSvgY(0) + 29} ${toSvgX(LBP) - 6},${toSvgY(0) + 35}`} fill="#38bdf8" />
              <text x={toSvgX(LBP / 2)} y={toSvgY(0) + 44} fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                LBP = {LBP.toFixed(2)} m (Acuan Konstan Desain)
              </text>
            </g>

            {/* LOA Dimension (Top) */}
            <g key="dim-loa">
              <line x1={toSvgX(xMin)} y1={margin.top - 16} x2={toSvgX(xMax)} y2={margin.top - 16} stroke="#4ade80" strokeWidth="1.5" />
              <polygon points={`${toSvgX(xMin)},${margin.top - 16} ${toSvgX(xMin) + 6},${margin.top - 19} ${toSvgX(xMin) + 6},${margin.top - 13}`} fill="#4ade80" />
              <polygon points={`${toSvgX(xMax)},${margin.top - 16} ${toSvgX(xMax) - 6},${margin.top - 19} ${toSvgX(xMax) - 6},${margin.top - 13}`} fill="#4ade80" />
              <text x={toSvgX((xMin + xMax) / 2)} y={margin.top - 22} fill="#4ade80" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                LOA Pasti = {exactLoa.toFixed(2)} m ({loaRatio.toFixed(3)} x LBP)
              </text>
            </g>

            {/* Fore Overhang & Aft Overhang dimension markers */}
            {foreOverhang > 0 && (
              <g key="dim-fore-oh">
                <line x1={toSvgX(LBP)} y1={margin.top - 2} x2={toSvgX(xMax)} y2={margin.top - 2} stroke="#a7f3d0" strokeWidth="1" strokeDasharray="2,2" />
                <text x={toSvgX(LBP + foreOverhang / 2)} y={margin.top - 5} fill="#a7f3d0" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  OH Bow: +{foreOverhang.toFixed(2)}m
                </text>
              </g>
            )}

            {aftOverhang > 0 && (
              <g key="dim-aft-oh">
                <line x1={toSvgX(xMin)} y1={margin.top - 2} x2={toSvgX(0)} y2={margin.top - 2} stroke="#fed7aa" strokeWidth="1" strokeDasharray="2,2" />
                <text x={toSvgX(xMin / 2)} y={margin.top - 5} fill="#fed7aa" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                  OH Stern: +{aftOverhang.toFixed(2)}m
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Live Hydrostatic & Dimension Calculation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 font-medium">Panjang LBP</div>
            <div className="text-base font-bold text-cyan-400 font-mono">{LBP.toFixed(2)} m</div>
            <div className="text-[10px] text-slate-500">AP ke FP (Konstan)</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-0.5">
            <div className="text-[10px] text-emerald-400 font-medium">LOA Pasti (Kurva)</div>
            <div className="text-base font-bold text-emerald-300 font-mono">{exactLoa.toFixed(2)} m</div>
            <div className="text-[10px] text-emerald-400/70 font-mono">Xmax - Xmin</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 font-medium">Aproksimasi Awal</div>
            <div className="text-base font-bold text-slate-300 font-mono">{loaApproximation.toFixed(2)} m</div>
            <div className="text-[10px] text-slate-500 font-mono">1.025 x LBP</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 font-medium">Fore Overhang</div>
            <div className="text-base font-bold text-white font-mono">+{foreOverhang.toFixed(2)} m</div>
            <div className="text-[10px] text-slate-500">Di depan FP</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 font-medium">Aft Overhang</div>
            <div className="text-base font-bold text-white font-mono">+{aftOverhang.toFixed(2)} m</div>
            <div className="text-[10px] text-slate-500">Di belakang AP</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 font-medium">Rasio LOA / LBP</div>
            <div className="text-base font-bold text-amber-400 font-mono">{loaRatio.toFixed(3)}</div>
            <div className="text-[10px] text-slate-500 font-mono">Std: 1.02 ~ 1.06</div>
          </div>
        </div>
      </div>

      {/* Control Points 2-Way Coordinate Table */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs tracking-wide">
            <TableIcon size={16} />
            <span>Tabel Koordinat Titik Kontrol (2-Way Interactive Sync)</span>
          </div>
          <span className="text-xs text-slate-400">
            Nilai dapat disunting langsung untuk presisi tingkat milimeter.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Haluan (Bow) Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
              <span>🟢 Titik Kontrol Linggi Haluan (Bow Stem Profile)</span>
              <span className="text-[10px] text-slate-500">{bowPoints.length} Titik</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Nama Titik Node</th>
                    <th className="p-2.5">X (Meter dari AP)</th>
                    <th className="p-2.5">Y (Elevasi dari BL)</th>
                    <th className="p-2.5">Stasi Ref.</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
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
                            ? "bg-emerald-950/40"
                            : isLocked
                            ? "bg-cyan-950/20 hover:bg-cyan-950/30"
                            : "hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="p-2.5 text-slate-200">
                          <div className="font-medium flex items-center space-x-1.5">
                            <span>{pt.name}</span>
                            {isLocked && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] border border-cyan-500/40 font-mono font-bold">
                                <Lock size={9} />
                                <span>STATIS (FP)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{pt.description}</div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.x}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className={`w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                              isLocked
                                ? "bg-slate-900/60 border-cyan-500/30 text-cyan-400/80 cursor-not-allowed"
                                : "bg-slate-950 border-slate-800 text-emerald-400 focus:outline-none focus:border-emerald-500"
                            }`}
                            title={isLocked ? "Garis acuan konstan FP (LBP) terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.y}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className={`w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                              isLocked
                                ? "bg-slate-900/60 border-cyan-500/30 text-cyan-400/80 cursor-not-allowed"
                                : "bg-slate-950 border-slate-800 text-emerald-400 focus:outline-none focus:border-emerald-500"
                            }`}
                            title={isLocked ? "Garis acuan konstan sarat DWL terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5 text-slate-400 text-xs font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          {!isLocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoint(pt.id);
                              }}
                              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Hapus titik ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
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
            <h4 className="text-xs font-semibold text-amber-400 flex items-center justify-between">
              <span>🟠 Titik Kontrol Linggi Buritan (Stern & Transom Profile)</span>
              <span className="text-[10px] text-slate-500">{sternPoints.length} Titik</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Nama Titik Node</th>
                    <th className="p-2.5">X (Meter dari AP)</th>
                    <th className="p-2.5">Y (Elevasi dari BL)</th>
                    <th className="p-2.5">Stasi Ref.</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
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
                            ? "bg-amber-950/40"
                            : isLocked
                            ? "bg-cyan-950/20 hover:bg-cyan-950/30"
                            : "hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="p-2.5 text-slate-200">
                          <div className="font-medium flex items-center space-x-1.5">
                            <span>{pt.name}</span>
                            {isLocked && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] border border-cyan-500/40 font-mono font-bold">
                                <Lock size={9} />
                                <span>STATIS (AP)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{pt.description}</div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.x}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className={`w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                              isLocked
                                ? "bg-slate-900/60 border-cyan-500/30 text-cyan-400/80 cursor-not-allowed"
                                : "bg-slate-950 border-slate-800 text-amber-400 focus:outline-none focus:border-amber-500"
                            }`}
                            title={isLocked ? "Garis acuan konstan AP (x=0) terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.y}
                            disabled={isLocked}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className={`w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                              isLocked
                                ? "bg-slate-900/60 border-cyan-500/30 text-cyan-400/80 cursor-not-allowed"
                                : "bg-slate-950 border-slate-800 text-amber-400 focus:outline-none focus:border-amber-500"
                            }`}
                            title={isLocked ? "Garis acuan konstan sarat DWL terkunci statis" : ""}
                          />
                        </td>
                        <td className="p-2.5 text-slate-400 text-xs font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          {!isLocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoint(pt.id);
                              }}
                              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Hapus titik ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
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
        <div className="pt-2 border-t border-slate-800/80">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-yellow-400 flex items-center justify-between">
              <span>🟡 Titik Kontrol Lengkung Geladak (Deck Sheer Profile)</span>
              <span className="text-[10px] text-slate-500">{sheerPoints.length} Titik</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Nama Titik Node</th>
                    <th className="p-2.5">X (Meter dari AP)</th>
                    <th className="p-2.5">Y (Elevasi dari BL)</th>
                    <th className="p-2.5">Stasi Ref.</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {sheerPoints.map((pt) => {
                    const stasiEst = (pt.x / (LBP / 20)).toFixed(1);
                    const isSelected = selectedPointId === pt.id;
                    return (
                      <tr
                        key={pt.id}
                        onClick={() => setSelectedPointId(pt.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-yellow-950/40" : "hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="p-2.5 text-slate-200">
                          <div className="font-medium">{pt.name}</div>
                          <div className="text-[10px] text-slate-400">{pt.description}</div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.x}
                            onChange={(e) => handleNumericUpdate(pt.id, "x", parseFloat(e.target.value) || 0)}
                            className="w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border-slate-800 text-yellow-400 focus:outline-none focus:border-yellow-500"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.05"
                            value={pt.y}
                            onChange={(e) => handleNumericUpdate(pt.id, "y", parseFloat(e.target.value) || 0)}
                            className="w-20 border px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border-slate-800 text-yellow-400 focus:outline-none focus:border-yellow-500"
                          />
                        </td>
                        <td className="p-2.5 text-slate-400 text-xs font-mono">St. {stasiEst}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePoint(pt.id);
                            }}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Hapus titik ini"
                          >
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
      </div>
    </div>
  );
};
