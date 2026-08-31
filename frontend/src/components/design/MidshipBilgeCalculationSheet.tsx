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
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  X,
  Layers,
  Table as TableIcon
} from "lucide-react";
import { WaterlineConfig, DEFAULT_WATERLINE_LEVELS } from "./WaterPlaneCalculationSheet";

/**
 * Helper: Smooth curve (Monotone Cubic Interpolation)
 * Produces a perfectly fair curve, eliminating micro-wiggles caused by non-uniform point spacing.
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

interface MidshipBilgeCalculationProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  vesselType?: string;
  waterlineLevels?: WaterlineConfig[];
  waterlinesData?: Record<string, Record<number, number>>;
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
  waterlinesData
}) => {
  const { language } = useLanguage();
  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(0.5, draft_m);
  const H = Math.max(1, depth_m);
  const Cb = cb || 0.75;
  const Cm = cm || 0.99;
  const halfB = Number((B / 2).toFixed(3)); // 7.50m

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

  // Helper to generate discrete points on the circular bilge arc (0 to R) plus upper section steps
  const createDefaultDraftSteps = (rVal: number, draftT: number, depthH: number): number[] => {
    const safeR = Math.max(0.1, Math.min(rVal || 2.0, draftT));
    // 16 points along the bilge arc (0 to R)
    const bilgeSteps = Array.from({ length: 16 }).map((_, i) => {
      return Number(((i / 15) * safeR).toFixed(3));
    });

    // Upper steps above R up to depth H
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

  // Interaction states
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingDraft, setDraggingDraft] = useState<number | null>(null);
  const [hoverDraft, setHoverDraft] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isFullHullView, setIsFullHullView] = useState<boolean>(false);
  const [isFullscreenPlot, setIsFullscreenPlot] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Ensure draftSteps is always sorted
  const sortedDraftSteps = useMemo(() => [...draftSteps].sort((a, b) => a - b), [draftSteps]);

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
    setDraftOrdinates((prev) => ({
      ...prev,
      [draft_z]: isNaN(num) ? 0 : Number(num.toFixed(3))
    }));
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
      setDraftSteps([...sortedDraftSteps, newZ]);
    }
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

      const ord = draftOrdinates[draft_z] || 0;
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

  // SVG Interaction Handlers (Horizontal Dragging along Draft Line z)
  const handlePointerDown = (e: React.PointerEvent, z: number) => {
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

    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const ox = isFullHullView ? 82 : 35;
    const scaleX = isFullHullView ? 56 / (halfB || 7.5) : 80 / (halfB || 7.5);

    let newHalfB = (svgP.x - ox) / scaleX;
    newHalfB = Math.max(0, Math.min(halfB, newHalfB));

    setDraftOrdinates((prev) => ({
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

  // Active Readout Info
  const activeHoverZ = hoverDraft ?? draggingDraft ?? R;
  const activeHoverHalfB = draftOrdinates[activeHoverZ] ?? halfB;

  // Core SVG Blueprint Renderer with Optimized Framing
  const renderMidshipSvgContent = () => {
    const ox = isFullHullView ? 82 : 35;
    const oy = 74;
    const maxH = Math.max(H, T, 7.0);
    const scaleZ = 52 / maxH;
    const scaleX = isFullHullView ? 56 / (halfB || 7.5) : 80 / (halfB || 7.5);

    const deckY = oy - H * scaleZ;
    const dwlY = oy - T * scaleZ;
    const rY = oy - R * scaleZ;
    const outerX = ox + halfB * scaleX;

    // Interactive Curve Points
    const curvePts = sortedDraftSteps.map((z) => ({
      z,
      x: ox + (draftOrdinates[z] || 0) * scaleX,
      y: oy - z * scaleZ,
      isBilge: z <= R + 0.001
    }));

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
        {/* Submerged Area Water Fill */}
        <path d={subHullPath} fill="url(#waterHatch)" />
        <path
          d={hullPath}
          fill={isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)"}
          stroke="#06b6d4"
          strokeWidth="1.2"
        />

        {/* Port Side Symmetrical Hull (Mirror) */}
        {isFullHullView && (
          <g transform={`translate(${2 * ox}, 0) scale(-1, 1)`}>
            <path d={subHullPath} fill="url(#waterHatch)" />
            <path
              d={hullPath}
              fill={isPreviewMode ? "rgba(6, 182, 212, 0.18)" : "rgba(6, 182, 212, 0.08)"}
              stroke="#06b6d4"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* ========================================================================= */}
        {/* GARIS HORIZONTAL: HORIZONTAL WATERLINE REFERENCE GRID LINES (SOLID LINES) */}
        {/* ========================================================================= */}
        {!isPreviewMode &&
          sortedDraftSteps.map((z, idx) => {
            const yPos = oy - z * scaleZ;
            const isDWL = Math.abs(z - T) < 0.01;
            const isDeck = Math.abs(z - H) < 0.01;
            const isTangentR = Math.abs(z - R) < 0.05;
            const isBase = z === 0;
            const isHovered = hoverDraft === z || draggingDraft === z;

            const lineX1 = isFullHullView ? ox - halfB * scaleX - 6 : ox - 6;
            const lineX2 = outerX + (isFullHullView ? 6 : 14);

            return (
              <g key={`h-grid-${z}-${idx}`}>
                {/* Horizontal reference line across the midship section (SOLID) */}
                <line
                  x1={lineX1}
                  y1={yPos}
                  x2={lineX2}
                  y2={yPos}
                  stroke={
                    isHovered
                      ? "#38bdf8"
                      : isDWL
                      ? "#10b981"
                      : isTangentR
                      ? "#f59e0b"
                      : isDeck
                      ? "#94a3b8"
                      : isBase
                      ? "#64748b"
                      : "#334155"
                  }
                  strokeWidth={isHovered ? 0.7 : isDWL || isDeck || isTangentR || isBase ? 0.5 : 0.25}
                  opacity={isHovered ? 1 : isDWL || isTangentR || isDeck || isBase ? 0.9 : 0.35}
                />
              </g>
            );
          })}

        {/* ========================================================================= */}
        {/* WATERLINE PROJECTION PLANES FROM TAB 2 (SOLID WATERLINE LINES)            */}
        {/* ========================================================================= */}
        {!isPreviewMode &&
          effectiveWaterlineLevels.map((wl) => {
            const z = wl.draftFraction * T;
            const yPos = oy - z * scaleZ;
            const b_mid = getTheoreticalOrdinateAtZ(z, R);
            const midPtX = ox + b_mid * scaleX;
            const mirroredPtX = ox - b_mid * scaleX;

            return (
              <g key={`wl-proj-${wl.id}`} className="transition-all duration-200">
                {/* Horizontal reference line matching Waterline color (SOLID) */}
                <line
                  x1={isFullHullView ? mirroredPtX : ox}
                  y1={yPos}
                  x2={midPtX}
                  y2={yPos}
                  stroke={wl.color}
                  strokeWidth="0.5"
                  opacity={0.9}
                />
                {/* Intersection Circle Point on Bilge Curve */}
                <circle
                  cx={midPtX}
                  cy={yPos}
                  r="1.0"
                  fill={wl.color}
                  stroke="#ffffff"
                  strokeWidth="0.25"
                  className="cursor-pointer shadow-sm"
                >
                  <title>{`${wl.name} (Z = ${z.toFixed(2)} m) -> 0.5B Midship = ${b_mid.toFixed(3)} m`}</title>
                </circle>

                {isFullHullView && (
                  <circle
                    cx={mirroredPtX}
                    cy={yPos}
                    r="1.0"
                    fill={wl.color}
                    stroke="#ffffff"
                    strokeWidth="0.25"
                  />
                )}

                {/* Right Badge Label for Waterline */}
                {!isFullHullView && (
                  <text
                    x={outerX + 16}
                    y={yPos + 0.8}
                    fill={wl.color}
                    fontSize="2.1"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {`${wl.shortName} (Z=${z.toFixed(2)}m, 0.5B=${b_mid.toFixed(3)}m)`}
                  </text>
                )}
              </g>
            );
          })}

        {/* Structural Reference Labels on Right (Non-overlapping) */}
        {!isPreviewMode && !isFullHullView && (
          <g>
            {/* Deck Level H */}
            <text x={outerX + 16} y={deckY + 1.2} fill="#94a3b8" fontSize="2.5" fontFamily="monospace" fontWeight="bold">
              Deck (H = {H.toFixed(2)}m)
            </text>

            {/* Bilge Tangent Level R (Positioned with clear distinction) */}
            <text x={ox - 8} y={rY + 0.8} fill="#f59e0b" fontSize="2.2" fontFamily="monospace" fontWeight="bold" textAnchor="end">
              R = {R.toFixed(3)}m (Tangen)
            </text>
          </g>
        )}

        {/* Centerline CL & Baseline BL Lines */}
        {!isPreviewMode && (
          <>
            {/* Centerline CL (Solid Clean Axis) */}
            <line
              x1={ox}
              y1="4"
              x2={ox}
              y2={oy + 8}
              stroke="#64748b"
              strokeWidth="0.8"
            />
            <text
              x={ox - 2}
              y="7"
              fill="#64748b"
              fontSize="2.8"
              textAnchor="end"
              fontFamily="monospace"
              fontWeight="bold"
            >
              CL
            </text>

            {/* Baseline Solid BL Line */}
            <line
              x1={isFullHullView ? ox - halfB * scaleX - 10 : ox - 10}
              y1={oy}
              x2={outerX + 16}
              y2={oy}
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* Breadth Dimension (B/2) Top Arrow */}
            <line x1={ox} y1="14" x2={outerX} y2="14" stroke="#38bdf8" strokeWidth="0.5" />
            <polygon points={`${ox},14 ${ox + 2},13 ${ox + 2},15`} fill="#38bdf8" />
            <polygon points={`${outerX},14 ${outerX - 2},13 ${outerX - 2},15`} fill="#38bdf8" />
            <text
              x={ox + (outerX - ox) / 2}
              y="11.5"
              fill="#38bdf8"
              fontSize="2.7"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              0.5 B = {halfB.toFixed(3)} m (Lebar Total B = {B.toFixed(2)} m)
            </text>

            {/* Flat of Bottom Dimension Callout (Keel Tangent) */}
            {flatOfBottom > 0.1 && (
              <g>
                <line x1={ox} y1={oy + 5} x2={ox + flatOfBottom * scaleX} y2={oy + 5} stroke="#10b981" strokeWidth="0.4" />
                <polygon points={`${ox},${oy + 5} ${ox + 1.5},${oy + 4.2} ${ox + 1.5},${oy + 5.8}`} fill="#10b981" />
                <polygon points={`${ox + flatOfBottom * scaleX},${oy + 5} ${ox + flatOfBottom * scaleX - 1.5},${oy + 4.2} ${ox + flatOfBottom * scaleX - 1.5},${oy + 5.8}`} fill="#10b981" />
                <text
                  x={ox + (flatOfBottom * scaleX) / 2}
                  y={oy + 8.5}
                  fill="#10b981"
                  fontSize="2.1"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  Tangen Lunas = {flatOfBottom.toFixed(3)}m
                </text>
              </g>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* INTERACTIVE DRAGGABLE POINTS ALONG HORIZONTAL LINES       */}
        {/* ========================================================= */}
        {!isPreviewMode &&
          curvePts
            .filter((p) => p.isBilge)
            .map((p) => {
              const isDragging = draggingDraft === p.z;
              const isHovered = hoverDraft === p.z || isDragging;
              const currentOrd = draftOrdinates[p.z] || 0;

              return (
                <g key={`drag-pt-${p.z}`}>
                  {/* Point Drag Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={(isHovered ? 1.3 : 0.8) / zoomLevel}
                    fill={isDragging ? "#38bdf8" : isHovered ? "#67e8f9" : "#f59e0b"}
                    stroke="#ffffff"
                    strokeWidth={0.3 / zoomLevel}
                    className="cursor-ew-resize hover:fill-cyan-300 transition-all filter drop-shadow"
                    onPointerDown={(e) => handlePointerDown(e, p.z)}
                    onPointerEnter={() => setHoverDraft(p.z)}
                    onPointerLeave={() => setHoverDraft(null)}
                  />

                  {/* Symmetrical Left Point when mirrored */}
                  {isFullHullView && (
                    <circle
                      cx={2 * ox - p.x}
                      cy={p.y}
                      r={(isHovered ? 1.3 : 0.8) / zoomLevel}
                      fill={isDragging ? "#38bdf8" : isHovered ? "#67e8f9" : "#f59e0b"}
                      stroke="#ffffff"
                      strokeWidth={0.3 / zoomLevel}
                      className="opacity-70"
                    />
                  )}

                  {/* Hover Tag */}
                  {isHovered && (
                    <g>
                      <rect
                        x={p.x - 17 / zoomLevel}
                        y={p.y - 6.5 / zoomLevel}
                        width={34 / zoomLevel}
                        height={5.2 / zoomLevel}
                        rx={1 / zoomLevel}
                        fill="#020617"
                        stroke="#38bdf8"
                        strokeWidth={0.3 / zoomLevel}
                        opacity={0.95}
                      />
                      <text
                        x={p.x}
                        y={p.y - 3 / zoomLevel}
                        fill="#38bdf8"
                        fontSize={2.2 / zoomLevel}
                        fontFamily="monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        z={p.z.toFixed(2)}m | y={currentOrd.toFixed(3)}m
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* FULLSCREEN STUDIO OVERLAY FOR RADIUS BILGA               */}
      {/* ========================================================= */}
      {isFullscreenPlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-3xl flex flex-col p-2 sm:p-3 overflow-hidden select-none animate-in fade-in duration-200">
          {/* COMPACT TOP COCKPIT HEADER */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 mb-2 shadow-2xl space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Studio Title */}
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity size={16} />
                </div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white tracking-wide whitespace-nowrap">
                    Bilge Radius Studio &mdash; <span className="text-cyan-400">Gading 10 (Midship)</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase whitespace-nowrap">
                    R = {R.toFixed(3)} m
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
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                      isCorrectionValid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {isCorrectionValid ? "MEMENUHI" : "DEVIASI"}
                  </span>
                </div>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400">Am:</span>
                  <span className="font-bold text-cyan-400">{Am_calc.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500">/ {Am_rancangan.toFixed(2)}m²</span>
                </div>
                <span className="text-slate-700 hidden md:inline">|</span>
                <div className="flex items-center space-x-1 whitespace-nowrap">
                  <span className="text-[10px] text-slate-400">Tangen Lunas:</span>
                  <span className="font-bold text-amber-400">{flatOfBottom.toFixed(3)} m</span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleAutoFineTune}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-mono text-xs font-bold transition-all shadow-md flex items-center space-x-1 cursor-pointer"
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
                  onClick={() => setIsFullHullView(!isFullHullView)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    isFullHullView
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                  }`}
                  title="Tampilkan Simetri Penuh Kiri & Kanan (Port & Starboard)"
                >
                  <Maximize2 size={13} />
                  <span>{isFullHullView ? "Simetri Penuh" : "0.5 B"}</span>
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isPreviewMode
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300"
                  }`}
                  title={isPreviewMode ? "Tampilkan Garis Bantu (Edit Mode)" : "Sembunyikan Garis Bantu (Preview Mode)"}
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
          </div>

          {/* Fullscreen Canvas */}
          <div className="flex-1 w-full min-h-0 bg-slate-900/95 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-1 sm:p-2.5 shadow-2xl">
            {draggingDraft !== null && (
              <div className="absolute top-3 left-3 z-30 flex items-center space-x-2 bg-amber-500/20 border border-amber-500/50 px-3 py-1 rounded-full font-mono text-xs text-amber-300 backdrop-blur-md shadow-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  Menggeser Sarat Z = {draggingDraft.toFixed(2)} m:{" "}
                  <strong>0.5 B = {(draftOrdinates[draggingDraft] ?? 0).toFixed(3)} m</strong>
                </span>
              </div>
            )}

            <svg
              ref={svgRef}
              className="w-full h-full select-none cursor-crosshair"
              viewBox="-15 -6 195 96"
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
              </defs>

              {!isPreviewMode && <rect x="-15" y="-6" width="195" height="96" fill="url(#cadGridFs)" />}
              {renderMidshipSvgContent()}
            </svg>
          </div>

          <div className="w-full flex items-center justify-between pt-1 px-1 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>
                Geser titik secara horizontal pada garis sarat air untuk menyesuaikan kelengkungan bilga. Tekan{" "}
                <strong>Esc</strong> untuk kembali.
              </span>
            </span>
            <span className="text-slate-500">Interval Garis Sarat Horizontal</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMBEDDED VIEW: HEADER TITLE BLOCK & PARTICULARS MATRIX     */}
      {/* ========================================================= */}
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
                    {language === "en"
                      ? "Bilge Radius & Midship Area Calculation (Station 10)"
                      : "Perhitungan Radius Bilga & Luas Midship (Gading 10)"}
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isCorrectionValid
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse"
                    }`}
                  >
                    {language === "en" ? "Tolerance: ≤ ±0.05%" : "Toleransi: ≤ ±0.05%"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === "en"
                    ? "Determination of Bilge Curvature Radius (R) and Vertical Integration of Midship Section 10 Area with Simpson's Rule."
                    : "Penentuan Radius Kelengkungan Bilga (R) dan Integrasi Vertikal Luas Penampang Midship Section 10 dengan Aturan Simpson."}
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
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Breadth (B)" : "Lebar (B)"}</span>
            <div className="font-bold text-white">{B.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">0.5 B (Half)</span>
            <div className="font-bold text-cyan-300">{halfB.toFixed(3)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Draft (T)" : "Sarat Air (T)"}</span>
            <div className="font-bold text-emerald-400">{T.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Deck Depth (H)" : "Tinggi Geladak (H)"}</span>
            <div className="font-bold text-slate-300">{H.toFixed(2)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Midship Coeff (Cm)" : "Koefisien Midship (Cm)"}</span>
            <div className="font-bold text-amber-300">{Cm.toFixed(3)}</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Bilge Radius (R)" : "Radius Bilga (R)"}</span>
            <div className="font-bold text-cyan-400">{R.toFixed(4)} m</div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase">{language === "en" ? "Flat of Bottom (0.5B - R)" : "Tangen Dasar (0.5B - R)"}</span>
            <div className="font-bold text-emerald-300">{flatOfBottom.toFixed(4)} m</div>
          </div>
        </div>

        {/* STATUS PILL */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              {language === "en" ? "Bilge Corner Cut Area" : "Luas Sudut Terpotong Bilga"} ={" "}
              <strong>{(B * T * (1 - Cm)).toFixed(3)} m&sup2;</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
              {language === "en" ? "Target Midship Area (Am)" : "Target Luas Midship (Am)"} ={" "}
              <strong>{Am_rancangan.toFixed(2)} m&sup2;</strong>
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
              {language === "en"
                ? `Midship Area Correction: ${correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`} (Max ±0.05%)`
                : `Koreksi Luas Midship: ${correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`} (Maksimal ±0.05%)`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BILGE GEOMETRY & MIDSHIP PROFILE CAD BLUEPRINT VISUAL     */}
      {/* ========================================================= */}
      <div className="w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4 flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center space-x-2">
            <TrendingUp size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === "en"
                ? "Visual Blueprint Midship Section (Station 10 Horizontal Waterlines)"
                : "Visual Blueprint Penampang Midship (Garis Horizontal Sarat Air Gading 10)"}
            </h3>
          </div>

          {/* Real-time Value Readout Pill */}
          <div className="flex items-center space-x-2.5 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-xl font-mono text-xs">
            <span className="text-cyan-400 font-bold">
              0.5 B = <strong className="text-white">{activeHoverHalfB.toFixed(3)} m</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Sarat Z = <strong className="text-amber-400">{activeHoverZ.toFixed(2)} m</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Am = <strong className="text-emerald-400">{Am_calc.toFixed(2)} m²</strong>
            </span>
          </div>

          {/* Canvas Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullHullView(!isFullHullView)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow ${
                isFullHullView
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
              title="Tampilkan Simetri Penuh Kiri & Kanan (Port & Starboard)"
            >
              <Layers size={14} />
              <span>{isFullHullView ? "Simetri Penuh" : "0.5 B (Half)"}</span>
            </button>

            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow ${
                isPreviewMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
              title={isPreviewMode ? "Tampilkan Garis Bantu (Edit Mode)" : "Sembunyikan Garis Bantu (Preview Mode)"}
            >
              {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isPreviewMode ? "Preview" : "Edit Mode"}</span>
            </button>

            <button
              onClick={() => setIsFullscreenPlot(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Buka Mode Layar Penuh (Fullscreen Studio)"
            >
              <Maximize size={14} />
              <span>{language === "en" ? "Fullscreen" : "Layar Penuh"}</span>
            </button>
          </div>
        </div>

        {/* SVG Blueprint Canvas */}
        <div className="w-full h-80 sm:h-96 md:h-[420px] bg-slate-950/95 rounded-xl relative overflow-hidden border border-slate-800/90 flex items-center justify-center p-3 group">
          {/* Zoom Controls Overlay */}
          <div className="absolute right-4 top-4 flex flex-col bg-slate-900/80 p-1 rounded-lg border border-slate-700 backdrop-blur-md z-10 opacity-60 group-hover:opacity-100 transition-opacity shadow-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 4))}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors flex justify-center items-center"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors text-[10px] font-bold text-center"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors flex justify-center items-center"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair transition-all duration-300 ease-in-out select-none"
            viewBox="-15 -6 195 96"
            preserveAspectRatio="xMidYMid meet"
            style={{ touchAction: "none" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            <defs>
              <pattern id="cadGridEmbedded" width="10" height="10" patternUnits="userSpaceOnUse">
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
            </defs>

            {!isPreviewMode && <rect x="-15" y="-6" width="195" height="96" fill="url(#cadGridEmbedded)" />}
            {renderMidshipSvgContent()}
          </svg>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TABLE: STATION 10 DRAFT-WISE SIMPSON INTEGRATION          */}
      {/* ========================================================= */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <TableIcon size={16} className="text-cyan-400" />
              <span>
                {language === "en"
                  ? "Station 10 Midship Ordinate Integration Table Against Draft (z)"
                  : "Tabel Integrasi Ordinat Midship Gading 10 Terhadap Sarat Air (z)"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === "en"
                ? "Integration of half-breadth ordinates at station 10 for each horizontal draft level. 0.5 B (m) values can be edited directly or dragged on the plot."
                : "Integrasi ordinat separuh lebar gading 10 pada tiap level garis horizontal sarat air. Nilai 0.5 B (m) dapat diedit langsung atau ditarik pada grafik."}
            </p>
          </div>
          <button
            onClick={handleAddDraftStep}
            className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg"
          >
            <Plus size={14} />
            <span>{language === "en" ? "Add Draft Step (z)" : "Tambah Garis Sarat (z)"}</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner no-scrollbar">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 text-[11px]">
                <th className="py-3 px-3.5 font-bold text-center border-r border-slate-800/60 w-24">
                  (I)
                  <br />
                  {language === "en" ? "FRAME" : "GADING"}
                </th>
                <th className="py-3 px-3.5 font-bold text-center text-amber-400 border-r border-slate-800/60 w-32">
                  (II)
                  <br />
                  {language === "en" ? "DRAFT z (m)" : "SARAT z (m)"}
                </th>
                <th className="py-3 px-3.5 font-bold text-cyan-300 border-r border-slate-800/60 min-w-[140px]">
                  (III)
                  <br />
                  0.5 B (m)
                </th>
                <th className="py-3 px-3 font-semibold text-slate-400 text-center border-r border-slate-800/60 w-28">
                  (IV)
                  <br />
                  {language === "en" ? "SIMPSON MULTIPLIER" : "FAKTOR PENGALI"}
                </th>
                <th className="py-3 px-4 font-bold text-emerald-400 text-right min-w-[140px]">
                  (V) = (III)&times;(IV)
                  <br />
                  {language === "en" ? "PRODUCT" : "HASIL KALI"}
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
                <td
                  colSpan={4}
                  className="py-3 px-4 text-right uppercase tracking-wider text-slate-300 border-r border-slate-800"
                >
                  {language === "en" ? "Total Product Sigma (Σ):" : "Total Sigma Hasil Kali (Σ):"}
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                  <div className="text-[9px] text-slate-500 uppercase">
                    {language === "en" ? "Area (1 Side) =" : "Luas (1 Sisi) ="}
                  </div>
                  <div>{(Am_calc / 2).toFixed(4)}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUMMARY RESULT CARDS & VERIFICATION FORMULAS             */}
      {/* ========================================================= */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              {language === "en"
                ? "Midship Integration Results & Area Verification (Section 10 Verification)"
                : "Hasil Integrasi & Koreksi Luas Penampang Midship (Section 10 Verification)"}
            </h3>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-400">{language === "en" ? "Max Deviation Target:" : "Target Deviasi Maksimal:"} </span>
            <strong className="text-emerald-400">&le; &plusmn;0.05%</strong>
          </div>
        </div>

        {/* Result Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Luas Midship Hasil Integrasi */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{language === "en" ? "Integrated Midship Area (Am_calc)" : "Luas Midship Integrasi (Am_calc)"}</span>
              <span className="text-[10px] font-mono text-cyan-400">
                {language === "en" ? "2 · Area (One Side)" : "2 · Luas (Satu Sisi)"}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {Am_calc.toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              = 2 &times; {language === "en" ? "One Side Area" : "Luas Satu Sisi"} ({(Am_calc / 2).toFixed(3)})
            </div>
          </div>

          {/* Card 2: Luas Midship Target */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{language === "en" ? "Target Midship Area (Am)" : "Luas Midship Target (Am)"}</span>
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
              <span>{language === "en" ? "Area Difference (ΔAm)" : "Selisih Luasan (&Delta;Am)"}</span>
              <span className="text-[10px] font-mono text-cyan-400">Am_calc - Am</span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-300">
              {(Am_calc - Am_rancangan).toFixed(3)} <span className="text-sm font-normal text-slate-400">m&sup2;</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {language === "en" ? "Absolute integration deviation" : "Deviasi absolut integrasi"}
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
                <span>{language === "en" ? "Midship Correction" : "Koreksi Midship"}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                {language === "en" ? "Requirement: ≤ ±0.05%" : "Syarat: ≤ ±0.05%"}
              </span>
            </div>
            <div className="text-2xl font-black font-mono">
              {correctionPercent > 0 ? `+${correctionPercent.toFixed(3)}%` : `${correctionPercent.toFixed(3)}%`}
            </div>
            <div className="text-[11px] opacity-90 font-mono flex items-center justify-between">
              <span>{language === "en" ? "Target: ≤ ±0.05%" : "Target: ≤ ±0.05%"}</span>
              <span className={`font-bold ${isCorrectionValid ? "text-emerald-400" : "text-rose-400"}`}>
                {isCorrectionValid
                  ? language === "en"
                    ? "MEETS REQUIREMENT"
                    : "MEMENUHI SYARAT"
                  : language === "en"
                  ? "DEVIATION EXCEEDS 0.05%"
                  : "DEVASIAN MELEBIHI 0.05%"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABEL KORELASI GARIS AIR & MIDSHIP GADING 10 (LINES PLAN INTEGRITY)       */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Layers size={18} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === "en"
                  ? "Waterlines & Midship (Station 10) Bilge Alignment"
                  : "Korelasi Garis Air & Midship (Gading 10) Radius Bilga"}
              </h3>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total {effectiveWaterlineLevels.length} Garis Air Terhubung
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800 text-[11px]">
                  <th className="py-2.5 px-3 font-bold">GARIS AIR</th>
                  <th className="py-2.5 px-3 text-center">SARAT Z (m)</th>
                  <th className="py-2.5 px-3 text-center">FRAKSI SARAT (%T)</th>
                  <th className="py-2.5 px-3 text-right">0.5B MIDSHIP (m)</th>
                  <th className="py-2.5 px-3 text-right">0.5B WATERPLANE (m)</th>
                  <th className="py-2.5 px-3 text-center">STATUS KESELARASAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {effectiveWaterlineLevels.map((wl) => {
                  const z = wl.draftFraction * T;
                  const b_mid_bilge = getTheoreticalOrdinateAtZ(z, R);
                  const b_mid_wl = waterlinesData?.[wl.id]?.[10.0] ?? (halfB * wl.maxBreadthFactor);
                  const diff = Math.abs(b_mid_bilge - b_mid_wl);
                  const isMatch = diff <= 0.01;

                  return (
                    <tr key={`mid-wl-${wl.id}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: wl.color }} />
                        <span className="font-bold text-white">{wl.name}</span>
                        <span className="text-[10px] text-slate-400">({wl.shortName})</span>
                      </td>
                      <td className="py-2 px-3 text-center text-cyan-300 font-bold">
                        {z.toFixed(2)} m
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">
                        {(wl.draftFraction * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-300 font-bold">
                        {b_mid_bilge.toFixed(3)} m
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-300 font-bold">
                        {b_mid_wl.toFixed(3)} m
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMatch
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
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
        </div>

        {/* DETAILED PLAIN-TEXT MATHEMATICAL EXPLANATION BOX */}
        <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300 font-mono leading-relaxed">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 flex items-center space-x-2">
            <HelpCircle size={14} className="text-cyan-400" />
            <span>
              {language === "en"
                ? "Midship & Bilge Radius Formulas (Plain-Text Reference):"
                : "Rumus Midship & Radius Bilga (Plain-Text Reference):"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">
                {language === "en" ? "1. Bilge Radius of Curvature (R):" : "1. Radius Kelengkungan Bilga (R):"}
              </p>
              <p className="text-slate-400">Radius_Bilga = Akar( (B * T * (1 - Cm)) / (2 - (pi / 2)) )</p>
              <p className="text-slate-400">
                R = Akar( ({B} * {T} * (1 - {Cm})) / 0.4292 ) ={" "}
                <strong className="text-cyan-300">{R.toFixed(4)} m</strong>
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">
                {language === "en" ? "2. Integrated Midship Area (Am_calc):" : "2. Luas Midship Hasil Integrasi (Am_calc):"}
              </p>
              <p className="text-slate-400">
                Am_calc = 2 &times; {language === "en" ? "Total Area (One Side)" : "Total Luas (Satu Sisi)"}
              </p>
              <p className="text-slate-400">
                Am_calc = 2 &times; {(Am_calc / 2).toFixed(4)} ={" "}
                <strong className="text-emerald-400">{Am_calc.toFixed(3)} m&sup2;</strong>
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">
                {language === "en" ? "3. Target Design Midship Area:" : "3. Luas Midship Target Rancangan:"}
              </p>
              <p className="text-slate-400">Am_rancangan = B * T * Cm</p>
              <p className="text-slate-400">
                Am_rancangan = {B} * {T} * {Cm} ={" "}
                <strong className="text-cyan-300">{Am_rancangan.toFixed(3)} m&sup2;</strong>
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
              <p className="text-cyan-300 font-bold">
                {language === "en"
                  ? "4. Midship Correction Percentage (Required ≤ ±0.05%):"
                  : "4. Persentase Koreksi Midship (Wajib ≤ ±0.05%):"}
              </p>
              <p className="text-slate-400">
                {language === "en"
                  ? "Correction = ((Am_calc - Am_design) / Am_calc) * 100%"
                  : "Koreksi = ((Am_calc - Am_rancangan) / Am_calc) * 100%"}
              </p>
              <p className="text-slate-400">
                {language === "en" ? "Correction" : "Koreksi"} = (({Am_calc.toFixed(2)} - {Am_rancangan.toFixed(2)}) /{" "}
                {Am_calc.toFixed(2)}) * 100% ={" "}
                <strong className={isCorrectionValid ? "text-emerald-300" : "text-rose-300"}>
                  {correctionPercent.toFixed(3)}%
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
