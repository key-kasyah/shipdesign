"use client";

import { engineeringColor } from "./EngineeringPalette";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Layers,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Activity,
  Table as TableIcon,
  Info,
  Compass
} from "lucide-react";
import { FairingEngine } from "@/utils/fairingEngine";
import { WaterlineConfig, DEFAULT_WATERLINE_LEVELS } from "./WaterPlaneCalculationSheet";

interface LinesPlanThreeViewProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  csaOrdinates?: number[];
  waterlinesData?: Record<string, Record<number, number>>;
  waterlineLevels?: WaterlineConfig[];
  sideProfileData?: any;
}

export const LinesPlanThreeView: React.FC<LinesPlanThreeViewProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.5,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98,
  csaOrdinates,
  waterlinesData,
  waterlineLevels,
  sideProfileData
}) => {
  const { language } = useLanguage();
  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(1, draft_m);
  const H = Math.max(2, depth_m);
  const Cm = cm || 0.98;
  const Cb = cb || 0.76;

  const [activeTab, setActiveTab] = useState<"cad" | "table">("cad");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredWL, setHoveredWL] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);

  // Layer visibility toggles
  const [showWaterlines, setShowWaterlines] = useState<boolean>(true);
  const [showButtocks, setShowButtocks] = useState<boolean>(true);
  const [showDiagonals, setShowDiagonals] = useState<boolean>(true);
  const [showSAC, setShowSAC] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);

  const effectiveLevels = useMemo(() => {
    return waterlineLevels && waterlineLevels.length > 0 ? waterlineLevels : DEFAULT_WATERLINE_LEVELS;
  }, [waterlineLevels]);

  // ==========================================
  // MATHEMATICAL PARAMETERS & OFFSETS
  // ==========================================
  const engine = useMemo(() => {
    const targetVol = LBP * B * T * Cb;
    return new FairingEngine(LBP, B, T, H, targetVol, Cm, effectiveLevels, undefined, sideProfileData);
  }, [LBP, B, T, H, Cb, Cm, csaOrdinates, effectiveLevels, sideProfileData]);

  const waterlines = engine.waterlines; // dynamic [0, ..., T, H]
  const wlLabels = engine.wlLabels; // dynamic ["WL 0", ..., "WL (DWL)", "DECK"]

  // Specific Palette matching WaterPlaneCalculationSheet dynamically
  const WL_COLORS = useMemo(() => {
    const map: Record<string, { color: string; label: string; ratio: string }> = {};
    effectiveLevels.forEach((wl) => {
      map[wl.shortName] = {
        color: wl.color,
        label: wl.name,
        ratio: `${(wl.draftFraction * 100).toFixed(1)}% T`
      };
    });
    map["DECK"] = { color: "#0f172a", label: "DECK (Geladak)", ratio: "H" };
    return map;
  }, [effectiveLevels]);

  // Standard Sheer Profile (mm converted to m)
  const sheerAft = (2.8 * (LBP / 3 + 10)) / 1000;
  const sheerFore = (5.6 * (LBP / 3 + 10)) / 1000;

  // Buttocks (B1 to B4)
  const numButtocks = 4;
  const buttockSpacing = B / 2 / numButtocks;
  const buttocks = Array.from({ length: numButtocks }).map((_, i) => (i + 1) * buttockSpacing);

  const offsetTable = useMemo(() => {
    engine.generateOffsets(waterlinesData);

    return engine.stations.map((st) => {
      const localDeckZ = engine.getSheerZ(st);
      const offsets = engine.offsetTable[st];

      const buttockZ: Record<string, number> = {};
      buttocks.forEach((b, i) => {
        const yDeck = offsets["DECK"] || 0;
        const yBase = offsets[wlLabels[0]] || 0;

        if (yDeck < b) {
          // Buttock plane is wider than this station's deck breadth -> does not intersect station
          buttockZ[`B${i + 1}`] = -1;
        } else if (yBase >= b) {
          // Buttock plane cuts the flat bottom of this station -> Z = 0
          buttockZ[`B${i + 1}`] = 0;
        } else {
          // Monotonically interpolate the exact Z height where station frame y(Z) = b
          let zFound = -1;
          for (let k = 0; k < waterlines.length - 1; k++) {
            const z1 = waterlines[k];
            const z2 = waterlines[k + 1];
            const y1 = offsets[wlLabels[k]] || 0;
            const y2 = offsets[wlLabels[k + 1]] || 0;

            if (b >= y1 && b <= y2) {
              const t = y2 > y1 ? (b - y1) / (y2 - y1) : 0;
              zFound = z1 + t * (z2 - z1);
              break;
            }
          }
          if (zFound === -1) {
            // Check between top WL and Deck
            const topWlZ = waterlines[waterlines.length - 1];
            const topWlY = offsets[wlLabels[waterlines.length - 1]] || 0;
            if (b >= topWlY && b <= yDeck) {
              const t = yDeck > topWlY ? (b - topWlY) / (yDeck - topWlY) : 0;
              zFound = topWlZ + t * (localDeckZ - topWlZ);
            }
          }
          buttockZ[`B${i + 1}`] = zFound >= 0 ? Number(zFound.toFixed(3)) : -1;
        }
      });
      return { station: st, offsets, buttockZ, localDeckZ };
    });
  }, [engine, buttocks, B, T, waterlinesData, waterlines, wlLabels]);

  // Sectional Area Curve (SAC) normalized (0 to 1)
  const sacCurve = useMemo(() => {
    const maxCsa = Math.max(...engine.csaOrdinates);
    return engine.csaOrdinates.map((area) => (maxCsa > 0 ? area / maxCsa : 0));
  }, [engine]);

  // ==========================================
  // SVG CANVAS LAYOUT COORDINATES
  // ==========================================
  const CANVAS_W = 2000;
  const CANVAS_H = 1260;

  const X_START = 150;
  const X_END = 1850;
  const L_PIXELS = X_END - X_START;
  const ST_SPACING = L_PIXELS / 20;

  const scaleZ = 250 / H;
  const scaleY = scaleZ;

  const Y_SAC_BASE = 250;
  const Y_SHEER_BASE = 660;
  const X_BODY_CENTER = X_START + 10 * ST_SPACING;
  const Y_HB_CL = 780;
  const Y_DIAG_CL = 1180;

  const getX = (st: number) => X_START + st * ST_SPACING;
  const getZ = (z_m: number, base: number) => base - z_m * scaleZ;
  const getY = (y_m: number, base: number, goesDown = true) =>
    goesDown ? base + y_m * scaleY : base - y_m * scaleY;

  // Export Table of Offsets to CSV
  const handleExportCSV = () => {
    const headers = ["Station", "X Position (m)", ...wlLabels.map((l) => `${l} (m)`)];
    const rows = offsetTable.map((row) => [
      row.station,
      (row.station * (LBP / 20)).toFixed(2),
      ...wlLabels.map((l) => row.offsets[l])
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `LinesPlan_Offsets_${LBP}m.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Keyboard shortcut Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Path generator with smooth, fair cubic Bezier spline interpolation (prevents sharp polygonal corners)
  const smoothPath = (pts: { x: number; y: number }[], tension = 0.35) => {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
    if (pts.length === 2) {
      return `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)} L ${pts[1].x.toFixed(3)},${pts[1].y.toFixed(3)}`;
    }

    // Filter out duplicate consecutive points
    const cleanPts: { x: number; y: number }[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = cleanPts[cleanPts.length - 1];
      if (Math.abs(pts[i].x - prev.x) > 0.01 || Math.abs(pts[i].y - prev.y) > 0.01) {
        cleanPts.push(pts[i]);
      }
    }
    const n = cleanPts.length;
    if (n < 2) return `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
    if (n === 2) {
      return `M ${cleanPts[0].x.toFixed(3)},${cleanPts[0].y.toFixed(3)} L ${cleanPts[1].x.toFixed(3)},${cleanPts[1].y.toFixed(3)}`;
    }

    // Centripetal Cardinal / Cubic Bezier Converter
    let d = `M ${cleanPts[0].x.toFixed(3)},${cleanPts[0].y.toFixed(3)}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? cleanPts[i - 1] : {
        x: cleanPts[0].x - (cleanPts[1].x - cleanPts[0].x),
        y: cleanPts[0].y - (cleanPts[1].y - cleanPts[0].y)
      };
      const p1 = cleanPts[i];
      const p2 = cleanPts[i + 1];
      const p3 = i < n - 2 ? cleanPts[i + 2] : {
        x: cleanPts[n - 1].x + (cleanPts[n - 1].x - cleanPts[n - 2].x),
        y: cleanPts[n - 1].y + (cleanPts[n - 1].y - cleanPts[n - 2].y)
      };

      // Calculate smooth cubic Bezier control points
      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 2;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 2;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 2;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 2;

      d += ` C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
    }
    return d;
  };

  // Crisp White Paper Palette
  const bgMain = "#ffffff";
  const lineFrame = "#0f172a";
  const textTitle = "#0f172a";
  const textMuted = "#64748b";
  const grid10Color = "#f1f5f9";
  const grid50Color = "#cbd5e1";
  const stationLineColor = "#cbd5e1";

  // Render Core CAD SVG Content (Pure White Canvas)
  const renderCadSvg = () => {
    const vbWidth = CANVAS_W / zoomLevel;
    const vbHeight = CANVAS_H / zoomLevel;
    const vbX = (CANVAS_W - vbWidth) / 2;
    const vbY = (CANVAS_H - vbHeight) / 2;

    return (
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair transition-colors duration-300 ease-in-out select-none"
        viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ backgroundColor: engineeringColor(bgMain) }}
      >
        <defs>
          <pattern id="grid10lp" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={engineeringColor(grid10Color)} strokeWidth="0.5" />
          </pattern>
          <pattern id="grid50lp" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke={engineeringColor(grid50Color)} strokeWidth="0.9" />
          </pattern>
        </defs>

        {/* Grid Background */}
        <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#grid10lp)" />
        <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#grid50lp)" />

        {/* Decorative Technical Drawing Border Frame */}
        <rect
          x="10"
          y="10"
          width={CANVAS_W - 20}
          height={CANVAS_H - 20}
          fill="none"
          stroke={engineeringColor(lineFrame)}
          strokeWidth="3.5"
        />
        <rect
          x="16"
          y="16"
          width={CANVAS_W - 32}
          height={CANVAS_H - 32}
          fill="none"
          stroke={engineeringColor(lineFrame)}
          strokeWidth="1"
        />

        {/* Outer AutoCAD Blueprint Watermark Text */}
        <text
          x={CANVAS_W / 2}
          y="35"
          fill={engineeringColor(textTitle, "text")}
          fontSize="15"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
          letterSpacing="3"
        >
          LINES PLAN 2D PROJECTION &mdash; {effectiveLevels.length} WATERLINES ({effectiveLevels[effectiveLevels.length - 1]?.shortName} S/D {effectiveLevels[0]?.shortName}) + DECK &mdash; LBP {LBP.toFixed(2)}M &bull; B {B.toFixed(2)}M &bull; T {T.toFixed(2)}M
        </text>

        {/* ========================================================= */}
        {/* 1. SECTIONAL AREA CURVE (SAC)                             */}
        {/* ========================================================= */}
        {showSAC && (
          <g id="sac-group">
            <text
              x={X_BODY_CENTER}
              y={Y_SAC_BASE - 210}
              fill={engineeringColor(textTitle, "text")}
              fontSize="13"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              1. SECTIONAL AREA CURVE (SAC / KURVA LUASAN GADING)
            </text>
            <line
              x1={X_START - 50}
              y1={Y_SAC_BASE}
              x2={X_END + 50}
              y2={Y_SAC_BASE}
              stroke={engineeringColor("#334155")}
              strokeWidth="2"
            />
            {/* Station vertical lines on SAC */}
            {offsetTable.map((st) => (
              <line
                key={`sac-st-${st.station}`}
                x1={getX(st.station)}
                y1={Y_SAC_BASE}
                x2={getX(st.station)}
                y2={Y_SAC_BASE - sacCurve[st.station] * 180}
                stroke={engineeringColor("#e2e8f0")}
                strokeWidth="0.8"
              />
            ))}
            <path
              d={smoothPath(
                offsetTable.map((st) => ({
                  x: getX(st.station),
                  y: Y_SAC_BASE - sacCurve[st.station] * 180
                }))
              )}
              fill="none"
              stroke={engineeringColor("#0284c7")}
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* ========================================================= */}
        {/* 2. SHEER PLAN (PROFILE VIEW) & WATERLINES (WL 0 - WL 6)   */}
        {/* ========================================================= */}
        <g id="sheer-plan-group">
          {/* Baseline BL 0 */}
          <line
            x1={X_START - 50}
            y1={Y_SHEER_BASE}
            x2={X_END + 50}
            y2={Y_SHEER_BASE}
            stroke={engineeringColor("#0f172a")}
            strokeWidth="2.5"
          />
          <text
            x={X_START - 55}
            y={Y_SHEER_BASE + 4}
            fill={engineeringColor(WL_COLORS["WL 0"]?.color || "#db2777", "text")}
            fontSize="11"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            BL (WL 0)
          </text>

          {/* ALL 7 WATERLINES IN SHEER PLAN (WL 0 through WL 6 + DECK) */}
          {showWaterlines &&
            waterlines.map((wl, i) => {
              const wlName = wlLabels[i];
              const conf = WL_COLORS[wlName] || { color: "#0284c7" };
              const isHovered = hoveredWL === wlName;
              const yPos = getZ(wl, Y_SHEER_BASE);

              return (
                <g key={`sh-wl-${i}`}>
                  <line
                    x1={X_START - 50}
                    y1={yPos}
                    x2={X_END + 50}
                    y2={yPos}
                    stroke={engineeringColor(conf.color)}
                    strokeWidth={isHovered ? 2.5 : wlName.includes("DWL") || wlName === "DECK" ? 1.6 : 0.9}
                    opacity={isHovered ? 1 : wlName.includes("DWL") ? 0.9 : 0.6}
                  />
                  <text
                    x={X_START - 55}
                    y={yPos + 4}
                    fill={engineeringColor(conf.color, "text")}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight={isHovered || wlName.includes("DWL") ? "bold" : "normal"}
                  >
                    {wlName}
                  </text>
                  <text
                    x={X_END + 55}
                    y={yPos + 4}
                    fill={engineeringColor(conf.color, "text")}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={isHovered || wlName.includes("DWL") ? "bold" : "normal"}
                  >
                    {wlName} (z={wl.toFixed(2)}m)
                  </text>
                </g>
              );
            })}

          <text
            x={X_BODY_CENTER}
            y={getZ(H + sheerFore, Y_SHEER_BASE) - 25}
            fill={engineeringColor(textTitle, "text")}
            fontSize="13"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            2. SHEER PLAN (TAMPAK SAMPING) & BODY PLAN (PENAMPANG MELINTANG)
          </text>

          {/* Stations Grid in Sheer Plan */}
          {offsetTable.map((st) => {
            const isHovered = hoveredStation === st.station;
            return (
              <g
                key={`sh-st-${st.station}`}
                onMouseEnter={() => setHoveredStation(st.station)}
                onMouseLeave={() => setHoveredStation(null)}
                className="cursor-pointer"
              >
                <line
                  x1={getX(st.station)}
                  y1={Y_SHEER_BASE}
                  x2={getX(st.station)}
                  y2={getZ(st.localDeckZ + 0.5, Y_SHEER_BASE)}
                  stroke={engineeringColor(isHovered ? "#0284c7" : stationLineColor)}
                  strokeWidth={isHovered ? 1.6 : 0.8}
                />
                <text
                  x={getX(st.station)}
                  y={Y_SHEER_BASE + 15}
                  fill={engineeringColor(isHovered ? "#0284c7" : textMuted, "text")}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {st.station === 0 ? "AP" : st.station === 20 ? "FP" : st.station}
                </text>
              </g>
            );
          })}

          {/* Deck Sheer Line Profile Curve */}
          <path
            d={smoothPath(
              offsetTable.map((st) => ({
                x: getX(st.station),
                y: getZ(st.localDeckZ, Y_SHEER_BASE)
              }))
            )}
            fill="none"
            stroke={engineeringColor("#0f172a")}
            strokeWidth="2.5"
          />

          {/* Keel Line */}
          <path
            d={smoothPath(
              offsetTable.map((st) => ({
                x: getX(st.station),
                y: getZ(0, Y_SHEER_BASE)
              }))
            )}
            fill="none"
            stroke={engineeringColor("#0f172a")}
            strokeWidth="2.5"
          />

          {/* Stem and Stern Profile Closing Outlines */}
          {(() => {
            const sternPts = [
              { x: getX(0) - 22, y: getZ(offsetTable[0].localDeckZ, Y_SHEER_BASE) },
              { x: getX(0), y: getZ(offsetTable[0].localDeckZ * 0.5, Y_SHEER_BASE) },
              { x: getX(0), y: getZ(0, Y_SHEER_BASE) }
            ];
            const stemPts = [
              { x: getX(20) + 30, y: getZ(offsetTable[20].localDeckZ, Y_SHEER_BASE) },
              { x: getX(20) + 12, y: getZ(offsetTable[20].localDeckZ * 0.5, Y_SHEER_BASE) },
              { x: getX(20), y: getZ(0, Y_SHEER_BASE) }
            ];
            return (
              <>
                <path d={smoothPath(sternPts)} fill="none" stroke={engineeringColor("#0f172a")} strokeWidth="2.5" />
                <path d={smoothPath(stemPts)} fill="none" stroke={engineeringColor("#0f172a")} strokeWidth="2.5" />
              </>
            );
          })()}

          {/* Buttock Curves in Sheer Plan */}
          {showButtocks &&
            buttocks.map((b, i) => {
              const bPts = offsetTable
                .filter((st) => st.buttockZ[`B${i + 1}`] !== -1)
                .map((st) => ({
                  x: getX(st.station),
                  y: getZ(st.buttockZ[`B${i + 1}`], Y_SHEER_BASE)
                }));
              if (bPts.length < 2) return null;
              return (
                <g key={`sh-but-${i}`}>
                  <path d={smoothPath(bPts, 0.35)} fill="none" stroke={engineeringColor("#2563eb")} strokeWidth="1.4" />
                  <text
                    x={bPts[0].x - 15}
                    y={bPts[0].y + 5}
                    fill={engineeringColor("#2563eb", "text")}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    B {i + 1}
                  </text>
                </g>
              );
            })}

          {/* ========================================================= */}
          {/* BODY PLAN (OVERLAID AT STATION 10 CENTER X=1000)          */}
          {/* ========================================================= */}
          <g id="body-plan-overlay">
            {/* Background Shield */}
            <rect
              x={X_BODY_CENTER - (B / 2) * scaleY - 25}
              y={getZ(H + sheerFore + 1, Y_SHEER_BASE)}
              width={B * scaleY + 50}
              height={(H + sheerFore) * scaleZ + 40}
              fill={engineeringColor("#ffffff")}
              fillOpacity="0.96"
              stroke={engineeringColor("#cbd5e1")}
              strokeWidth="1"
              rx="4"
            />

            {/* Centerline CL */}
            <line
              x1={X_BODY_CENTER}
              y1={Y_SHEER_BASE + 10}
              x2={X_BODY_CENTER}
              y2={getZ(H + sheerFore + 0.5, Y_SHEER_BASE)}
              stroke={engineeringColor("#ef4444")}
              strokeWidth="1.5"
            />
            <text
              x={X_BODY_CENTER}
              y={getZ(H + sheerFore, Y_SHEER_BASE) - 50}
              fill={engineeringColor("#ef4444", "text")}
              fontSize="12"
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight="bold"
            >
              CL
            </text>

            {/* Buttocks Grid in Body Plan */}
            {showButtocks &&
              buttocks.map((b, i) => (
                <g key={`bp-but-${i}`}>
                  <line
                    x1={X_BODY_CENTER - b * scaleY}
                    y1={Y_SHEER_BASE}
                    x2={X_BODY_CENTER - b * scaleY}
                    y2={getZ(H + sheerFore, Y_SHEER_BASE)}
                    stroke={engineeringColor("#cbd5e1")}
                    strokeWidth="0.7"
                  />
                  <line
                    x1={X_BODY_CENTER + b * scaleY}
                    y1={Y_SHEER_BASE}
                    x2={X_BODY_CENTER + b * scaleY}
                    y2={getZ(H + sheerFore, Y_SHEER_BASE)}
                    stroke={engineeringColor("#cbd5e1")}
                    strokeWidth="0.7"
                  />
                </g>
              ))}

            {/* Body Plan Transverse Station Curves */}
            {offsetTable.map((st) => {
              const isFore = st.station > 10;
              const isAft = st.station < 10;
              const isMid = st.station === 10;
              const sign = isFore ? 1 : isAft ? -1 : 1;
              const isHovered = hoveredStation === st.station;

              if (st.station === 0 || st.station === 20) {
                // AP / FP Stem line at CL
                const stemPts = [
                  { x: X_BODY_CENTER, y: getZ(0, Y_SHEER_BASE) },
                  { x: X_BODY_CENTER, y: getZ(st.localDeckZ, Y_SHEER_BASE) }
                ];
                return (
                  <path
                    key={`bp-st-${st.station}`}
                    d={smoothPath(stemPts)}
                    fill="none"
                    stroke={engineeringColor(st.station === 0 ? "#7c3aed" : "#0891b2")}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                  />
                );
              }

              // Normal Transverse Frame Points
              const framePts: { x: number; y: number }[] = [];
              const flatB = isMid || (st.station >= 6 && st.station <= 15) ? Math.max(0, (B / 2) - engine.R) : 0;

              // Start on Keel CL
              framePts.push({ x: X_BODY_CENTER, y: getZ(0, Y_SHEER_BASE) });

              // For PMB stations: include flat of bottom tangent point at baseline
              if (flatB > 0.05) {
                framePts.push({
                  x: X_BODY_CENTER + sign * (flatB * scaleY),
                  y: getZ(0, Y_SHEER_BASE)
                });
              }

              // Waterlines from bottom (WL 1) to top (DWL)
              waterlines.forEach((z, i) => {
                if (z > 0.001) {
                  const y = st.offsets[wlLabels[i]] || 0;
                  framePts.push({
                    x: X_BODY_CENTER + sign * (y * scaleY),
                    y: getZ(z, Y_SHEER_BASE)
                  });
                }
              });

              // End at Deck Point
              framePts.push({
                x: X_BODY_CENTER + sign * ((st.offsets["DECK"] || 0) * scaleY),
                y: getZ(st.localDeckZ, Y_SHEER_BASE)
              });

              if (isMid) {
                // Symmetrical Midship St. 10 (Both Port and Starboard)
                const ptsPort = framePts.map((p) => ({
                  x: X_BODY_CENTER - Math.abs(p.x - X_BODY_CENTER),
                  y: p.y
                }));
                const ptsStbd = framePts.map((p) => ({
                  x: X_BODY_CENTER + Math.abs(p.x - X_BODY_CENTER),
                  y: p.y
                }));
                return (
                  <g key={`bp-st-10`}>
                    <path
                      d={smoothPath(ptsPort, 0.25)}
                      fill="none"
                      stroke={engineeringColor("#d97706")}
                      strokeWidth={isHovered ? 3.8 : 2.8}
                    />
                    <path
                      d={smoothPath(ptsStbd, 0.25)}
                      fill="none"
                      stroke={engineeringColor("#d97706")}
                      strokeWidth={isHovered ? 3.8 : 2.8}
                    />
                  </g>
                );
              }

              return (
                <path
                  key={`bp-st-${st.station}`}
                  d={smoothPath(framePts, 0.3)}
                  fill="none"
                  stroke={engineeringColor(isHovered ? "#0284c7" : isFore ? "#0891b2" : "#7c3aed")}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                />
              );
            })}
          </g>
        </g>

        {/* ========================================================= */}
        {/* 3. HALF BREADTH PLAN (WATERLINES WL 0 THROUGH WL 6)       */}
        {/* ========================================================= */}
        <g id="half-breadth-group">
          {/* Centerline in Half Breadth */}
          <line
            x1={X_START - 50}
            y1={Y_HB_CL}
            x2={X_END + 50}
            y2={Y_HB_CL}
            stroke={engineeringColor("#ef4444")}
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <text
            x={X_START - 55}
            y={Y_HB_CL + 4}
            fill={engineeringColor("#ef4444", "text")}
            fontSize="11"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            CL
          </text>
          <text
            x={X_BODY_CENTER}
            y={Y_HB_CL - 15}
            fill={engineeringColor(textTitle, "text")}
            fontSize="13"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            3. HALF BREADTH PLAN (TAMPAK ATAS GARIS AIR WL 0 S/D WL 6)
          </text>

          {/* Buttocks in Half Breadth (Horizontal Lines) */}
          {showButtocks &&
            buttocks.map((b, i) => (
              <g key={`hb-but-${i}`}>
                <line
                  x1={X_START - 20}
                  y1={getY(b, Y_HB_CL)}
                  x2={X_END + 20}
                  y2={getY(b, Y_HB_CL)}
                  stroke={engineeringColor("#cbd5e1")}
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                <text
                  x={X_END + 25}
                  y={getY(b, Y_HB_CL) + 3}
                  fill={engineeringColor("#2563eb", "text")}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  B {i + 1}
                </text>
              </g>
            ))}

          {/* Stations Grid in Half Breadth */}
          {offsetTable.map((st) => {
            const isHovered = hoveredStation === st.station;
            return (
              <g
                key={`hb-st-${st.station}`}
                onMouseEnter={() => setHoveredStation(st.station)}
                onMouseLeave={() => setHoveredStation(null)}
                className="cursor-pointer"
              >
                <line
                  x1={getX(st.station)}
                  y1={Y_HB_CL}
                  x2={getX(st.station)}
                  y2={getY(B / 2 + 2, Y_HB_CL)}
                  stroke={engineeringColor(isHovered ? "#0284c7" : stationLineColor)}
                  strokeWidth={isHovered ? 1.6 : 0.8}
                />
                <text
                  x={getX(st.station)}
                  y={getY(B / 2 + 3.5, Y_HB_CL)}
                  fill={engineeringColor(isHovered ? "#0284c7" : textMuted, "text")}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {st.station}
                </text>
              </g>
            );
          })}

          {/* ALL 7 WATERLINES AS LONGITUDINAL CURVES (WL 0 - WL 6 + DECK) */}
          {showWaterlines &&
            waterlines.map((z, i) => {
              const wlName = wlLabels[i];
              const conf = WL_COLORS[wlName] || { color: "#0284c7" };
              const isHovered = hoveredWL === wlName;
              const pts = offsetTable.map((st) => ({
                x: getX(st.station),
                y: getY(st.offsets[wlName] || 0, Y_HB_CL)
              }));

              return (
                <g
                  key={`hb-wl-${i}`}
                  onMouseEnter={() => setHoveredWL(wlName)}
                  onMouseLeave={() => setHoveredWL(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={smoothPath(pts)}
                    fill="none"
                    stroke={engineeringColor(conf.color)}
                    strokeWidth={
                      isHovered
                        ? 3.2
                        : wlName.includes("DWL")
                        ? 2.4
                        : wlName === "DECK"
                        ? 2.2
                        : 1.3
                    }
                  />
                  {/* Waterline Label on Midship */}
                  <text
                    x={getX(10)}
                    y={getY(offsetTable[10].offsets[wlName] || 0, Y_HB_CL) - 3}
                    fill={engineeringColor(conf.color, "text")}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {wlName}
                  </text>
                </g>
              );
            })}
        </g>

        {/* ========================================================= */}
        {/* 4. DIAGONAL SENT (GARIS SENT)                             */}
        {/* ========================================================= */}
        {showDiagonals && (
          <g id="diagonal-group">
            <line
              x1={X_START - 50}
              y1={Y_DIAG_CL}
              x2={X_END + 50}
              y2={Y_DIAG_CL}
              stroke={engineeringColor("#0f172a")}
              strokeWidth="2"
            />
            <text
              x={X_BODY_CENTER}
              y={Y_DIAG_CL + 25}
              fill={engineeringColor(textTitle, "text")}
              fontSize="13"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              4. DIAGONAL SENT (GARIS SENT D1, D2, D3)
            </text>

            {offsetTable.map((st) => (
              <line
                key={`diag-st-${st.station}`}
                x1={getX(st.station)}
                y1={Y_DIAG_CL}
                x2={getX(st.station)}
                y2={Y_DIAG_CL - 130}
                stroke={engineeringColor(stationLineColor)}
                strokeWidth="0.8"
              />
            ))}

            {/* Diagonal Curves */}
            {(() => {
              const diagonals = [
                { name: "D1", offset: 0.25, color: "#059669" },
                { name: "D2", offset: 0.55, color: "#0284c7" },
                { name: "D3", offset: 0.85, color: "#d97706" }
              ];

              return diagonals.map((diag, i) => {
                const diagPts = offsetTable.map((st) => {
                  const dwlVal = st.offsets["WL 6 (DWL)"] || st.offsets["DWL"] || B / 2;
                  const diagVal = Math.sqrt(Math.pow(dwlVal, 2) + Math.pow(T, 2)) * diag.offset;
                  return {
                    x: getX(st.station),
                    y: Y_DIAG_CL - diagVal * scaleY
                  };
                });
                return (
                  <g key={`diag-${i}`}>
                    <path
                      d={smoothPath(diagPts)}
                      fill="none"
                      stroke={engineeringColor(diag.color)}
                      strokeWidth="1.5"
                    />
                    <text
                      x={X_END + 10}
                      y={diagPts[20].y}
                      fill={engineeringColor(diag.color, "text")}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {diag.name}
                    </text>
                  </g>
                );
              });
            })()}
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* FULLSCREEN STUDIO OVERLAY FOR PROJECTION                  */}
      {/* ========================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-surface-inset flex flex-col p-2 sm:p-3 overflow-hidden select-none duration-200">
          {/* Cockpit Top Bar */}
          <div className="w-full bg-surface-primary border border-border-default rounded-lg p-2.5 mb-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="text-text-secondary shrink-0">
                <Compass size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary tracking-normal">
                  Lines Plan 2D Projection Studio &mdash;{" "}
                  <span className="text-accent-primary">White Blueprint Canvas ({effectiveLevels.length} Garis Air: {effectiveLevels[effectiveLevels.length - 1]?.shortName} - {effectiveLevels[0]?.shortName})</span>
                </h2>
              </div>
            </div>

            {/* Quick Filter Toggles */}
            <div className="flex items-center space-x-1.5 text-sm font-mono">
              <button
                onClick={() => setShowWaterlines(!showWaterlines)}
                className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  showWaterlines
                    ? "bg-surface-selected text-accent-primary border-border-default min-h-9"
                    : "bg-surface-secondary text-text-secondary border-border-default min-h-9"
                } `}
               aria-pressed={showWaterlines}>
                {showWaterlines ? `WL (${effectiveLevels.length})` : "WL (OFF)"}
              </button>
              <button
                onClick={() => setShowButtocks(!showButtocks)}
                className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  showButtocks
                    ? "bg-surface-selected text-accent-primary border-border-default min-h-9"
                    : "bg-surface-secondary text-text-secondary border-border-default min-h-9"
                } `}
               aria-pressed={showButtocks}>
                Buttocks (B)
              </button>
              <button
                onClick={() => setShowDiagonals(!showDiagonals)}
                className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  showDiagonals
                    ? "bg-status-success-subtle text-status-success border-status-success-border min-h-9"
                    : "bg-surface-secondary text-text-secondary border-border-default min-h-9"
                } `}
               aria-pressed={showDiagonals}>
                Diagonals (D)
              </button>
              <button
                onClick={() => setShowSAC(!showSAC)}
                className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  showSAC
                    ? "bg-status-warning-subtle text-status-warning border-status-warning-border min-h-9"
                    : "bg-surface-secondary text-text-secondary border-border-default min-h-9"
                } `}
               aria-pressed={showSAC}>
                SAC
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 bg-status-danger-subtle hover:bg-status-danger border border-status-danger-border text-status-danger hover:text-text-primary rounded-md transition-colors ml-1 cursor-pointer min-h-9"
                title="Tutup (Esc)"
               aria-label="Tutup (Esc)">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Fullscreen Viewport Canvas with Pure White Background */}
          <div className="flex-1 w-full min-h-0 bg-surface-primary rounded-lg border border-border-default relative overflow-hidden flex items-center justify-center">
            {renderCadSvg()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMBEDDED MAIN COMPONENT VIEW                             */}
      {/* ========================================================= */}
      <div className="bg-surface-primary border border-border-default rounded-lg p-5 md:p-6 space-y-5 font-sans text-text-primary">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-border-default gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="text-text-secondary shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-semibold text-text-primary tracking-normal">
                    {language === "en"
                      ? `Lines Plan 2D Projection (${effectiveLevels.length} Waterlines: ${effectiveLevels[effectiveLevels.length - 1]?.shortName} to ${effectiveLevels[0]?.shortName} + Deck)`
                      : `Proyeksi 2D Lines Plan (${effectiveLevels.length} Garis Air: ${effectiveLevels[effectiveLevels.length - 1]?.shortName} s/d ${effectiveLevels[0]?.shortName} + Deck)`}
                  </h2>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-selected text-accent-primary border border-border-default">
                    Proyeksi 4 Bidang
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  {language === "en"
                    ? "Full naval architectural projection of Sheer, Body Plan, Half-Breadth, SAC, and Diagonals."
                    : "Penyajian lengkap gambar rencana garis: Sheer, Body Plan, Half-Breadth, SAC, dan Garis Sent terintegrasi."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab("cad")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "cad"
                  ? "bg-accent-primary text-on-accent font-semibold min-h-9"
                  : "bg-surface-secondary text-text-secondary hover:text-text-primary min-h-9"
              } `}
            >
              CAD Blueprint
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "table"
                  ? "bg-accent-primary text-on-accent font-semibold min-h-9"
                  : "bg-surface-secondary text-text-secondary hover:text-text-primary min-h-9"
              } `}
            >
              Table of Offsets
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-on-accent rounded-md text-sm font-semibold transition-colors cursor-pointer bg-accent-primary min-h-9"
            >
              <Maximize size={14} />
              <span>{language === "en" ? "Fullscreen" : "Layar Penuh"}</span>
            </button>
            <button
              onClick={() => {
                const content = engine.exportAutoCADScript();
                const link = document.createElement("a");
                link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
                link.download = `LinesPlan_${LBP}m.scr`;
                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
              className="px-3.5 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors bg-status-success hover:bg-status-success text-on-accent cursor-pointer min-h-9"
            >
              <Download size={14} className="inline mr-1" />
              AutoCAD .SCR
            </button>
          </div>
        </div>

        {/* WATERLINES COLOR-CODED LEGEND RIBBON */}
        <div className="bg-surface-canvas p-3 rounded-lg border border-border-default flex flex-wrap items-center justify-between gap-2 text-sm font-mono">
          <span className="text-xs text-text-secondary font-semibold tracking-normal">
            Garis Air ({effectiveLevels.length} Level WL):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {wlLabels.map((wlName) => {
              const conf = WL_COLORS[wlName] || { color: "#0284c7", ratio: "" };
              const isHovered = hoveredWL === wlName;
              return (
                <button
                  key={wlName}
                  onMouseEnter={() => setHoveredWL(wlName)}
                  onMouseLeave={() => setHoveredWL(null)}
                  className={`px-2.5 py-1 rounded-md border text-sm font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    isHovered
                      ? "bg-surface-primary border-border-default text-text-primary min-h-9"
                      : "bg-surface-primary border-border-default text-text-primary hover:border-border-default min-h-9"
                  } `}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: engineeringColor(conf.color) }} />
                  <span>{wlName}</span>
                  <span className="text-xs text-text-secondary">({conf.ratio})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: CAD BLUEPRINT EMBEDDED VIEW (WHITE CANVAS) */}
        {activeTab === "cad" && (
          <div className="w-full relative bg-surface-primary rounded-lg border border-border-default overflow-hidden group">
            {/* Zoom Overlay */}
            <div className="absolute right-4 top-4 flex flex-col bg-surface-primary p-1 rounded-lg border border-border-default z-10 opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 4))}
                className="p-1.5 hover:bg-surface-secondary text-text-primary rounded transition-colors cursor-pointer min-h-9"
                title="Zoom In"
               aria-label="Zoom In">
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:bg-surface-secondary text-text-primary rounded text-sm font-semibold cursor-pointer min-h-9"
                title="Reset Zoom"
               aria-label="Reset Zoom">
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 1))}
                className="p-1.5 hover:bg-surface-secondary text-text-primary rounded transition-colors cursor-pointer min-h-9"
                title="Zoom Out"
               aria-label="Zoom Out">
                <ZoomOut size={16} />
              </button>
            </div>

            <div className="w-full overflow-hidden" style={{ minHeight: "640px" }}>
              {renderCadSvg()}
            </div>
          </div>
        )}

        {/* TAB 2: TABLE OF OFFSETS */}
        {activeTab === "table" && (
          <div className="bg-surface-primary p-5 rounded-lg border border-border-default space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary tracking-normal flex items-center space-x-2">
                  <TableIcon size={16} className="text-accent-primary" />
                  <span>Table of Offsets (Separuh Lebar Ordinat Y &mdash; {effectiveLevels.length} Garis Air)</span>
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  Tabel nilai koordinat separuh lebar kapal (m) untuk setiap gading dan level garis air {effectiveLevels[effectiveLevels.length - 1]?.shortName} s/d {effectiveLevels[0]?.shortName} + Geladak.
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-status-success hover:bg-status-success text-on-accent rounded-md text-sm font-semibold transition-colors cursor-pointer min-h-9"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable engineering workspace" className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-surface-canvas border-b border-border-default text-xs text-text-secondary">
                    <th className="py-2.5 px-3 font-semibold text-accent-primary">Gading</th>
                    <th className="py-2.5 px-3 font-semibold text-text-primary">Pos X (m)</th>
                    {wlLabels.map((l) => (
                      <th
                        key={l}
                        className="py-2.5 px-3 font-semibold"
                        style={{ color: engineeringColor(WL_COLORS[l]?.color || "#0284c7") }}
                      >
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-mono text-sm">
                  {offsetTable.map((row) => (
                    <tr
                      key={row.station}
                      className={`hover:bg-surface-selected transition-colors ${
                        row.station === 10
                          ? "bg-status-warning-subtle font-semibold"
                          : "even:bg-surface-canvas"
                      } `}
                    >
                      <td className="py-2 px-3 text-accent-primary font-semibold">
                        {row.station === 0
                          ? "St. 0 (AP)"
                          : row.station === 20
                          ? "St. 20 (FP)"
                          : `St. ${row.station}`}
                      </td>
                      <td className="py-2 px-3 text-text-secondary">
                        {(row.station * (LBP / 20)).toFixed(2)}
                      </td>
                      {wlLabels.map((l) => (
                        <td key={l} className="py-2 px-3 text-text-primary">
                          {(row.offsets[l] || 0).toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
