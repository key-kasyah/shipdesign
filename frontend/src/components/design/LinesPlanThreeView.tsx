"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Layers,
  Download,
  ZoomIn,
  ZoomOut,
  Table as TableIcon
} from "lucide-react";
import { FairingEngine } from "@/utils/fairingEngine";

interface LinesPlanThreeViewProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  csaOrdinates?: number[];
}

export const LinesPlanThreeView: React.FC<LinesPlanThreeViewProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.5,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98,
  csaOrdinates
}) => {
  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(1, draft_m);
  const H = Math.max(2, depth_m);
  const Cm = cm || 0.98;
  const Cb = cb || 0.76;

  const [activeTab, setActiveTab] = useState<"cad" | "table">("cad");
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  // ==========================================
  // MATHEMATICAL PARAMETERS & OFFSETS
  // ==========================================
  
  // Calculate Bilge Radius (R) for Midship
  const R = useMemo(() => {
    const areaDiff = B * T * (1.0 - Cm);
    const denom = 2.0 - Math.PI / 2.0;
    return denom > 0 && areaDiff > 0 ? Math.sqrt(areaDiff / denom) : 0;
  }, [B, T, Cm]);

  const engine = useMemo(() => {
    const targetVol = LBP * B * T * Cb;
    return new FairingEngine(LBP, B, T, H, targetVol);
  }, [LBP, B, T, H, Cb, csaOrdinates]);

  // Use engine for waterlines and labels
  const waterlines = engine.waterlines;
  const wlLabels = engine.wlLabels;
  const numWL = waterlines.length;
  
  // Standard Sheer Profile (mm converted to m)
  const sheerAft = 2.8 * (LBP / 3 + 10) / 1000;
  const sheerFore = 5.6 * (LBP / 3 + 10) / 1000;

  // Deck curve based on sheer
  const getDeckZ = (st: number) => {
    if (st < 10) {
      const x = (10 - st) / 10;
      return H + sheerAft * Math.pow(x, 2);
    } else {
      const x = (st - 10) / 10;
      return H + sheerFore * Math.pow(x, 2);
    }
  };

  // Buttocks (B1 to B4)
  const numButtocks = 4;
  const buttockSpacing = (B/2) / numButtocks;
  const buttocks = Array.from({length: numButtocks}).map((_, i) => (i+1) * buttockSpacing);



  const offsetTable = useMemo(() => {
    engine.generateOffsets();
    
    return engine.stations.map((st) => {
      const localDeckZ = engine.getSheerZ(st);
      const offsets = engine.offsetTable[st];
      
      const buttockZ: Record<string, number> = {};
      buttocks.forEach((b, i) => {
        if (offsets["DECK"] < b) {
          buttockZ[`B${i+1}`] = -1;
        } else {
          const targetHalfArea = engine.csaOrdinates[st] / 2.0;
          const midArea = engine.csaOrdinates[10] / 2.0;
          let bLocal = (B / 2.0) * Math.sqrt(targetHalfArea / midArea);
          if (bLocal > B / 2.0) bLocal = B / 2.0;
          if (bLocal <= 0) bLocal = 0.01;
          let cSection = targetHalfArea / (bLocal * T);
          cSection = Math.max(0.01, Math.min(0.999, cSection));
          const n = (1.0 / cSection) - 1.0;
          
          let getSectionY = (z: number) => {
             if (z <= T) return bLocal * Math.pow(z / T, n);
             let flareAngle = 0.05;
             const xRatio = (st - 10) / 10.0;
             if (xRatio > 0.5) flareAngle += (xRatio - 0.5) * 0.5;
             else if (xRatio < -0.5) flareAngle += Math.abs(xRatio + 0.5) * 0.3;
             return bLocal + (z - T) * flareAngle * (B / 2.0);
          };
          
          let low = 0;
          let high = localDeckZ;
          for (let iter=0; iter<15; iter++) {
            let mid = (low + high) / 2;
            if (getSectionY(mid) < b) low = mid;
            else high = mid;
          }
          buttockZ[`B${i+1}`] = Number(((low+high)/2).toFixed(3));
        }
      });
      return { station: st, offsets, buttockZ, localDeckZ };
    });
  }, [engine, buttocks, B, T]);

  // Sectional Area Curve (SAC) normalized (0 to 1)
  const sacCurve = useMemo(() => {
    const maxCsa = Math.max(...engine.csaOrdinates);
    return engine.csaOrdinates.map(area => maxCsa > 0 ? area / maxCsa : 0);
  }, [engine]);

  // ==========================================
  // SVG CANVAS LAYOUT COORDINATES
  // ==========================================
  const CANVAS_W = 2000;
  const CANVAS_H = 1200;
  
  const X_START = 150;
  const X_END = 1850;
  const L_PIXELS = X_END - X_START;
  const ST_SPACING = L_PIXELS / 20;
  
  // Scale for Z (Height) and Y (Breadth)
  // Max Breadth is B/2, Max Height is H. Let's allocate ~250px for Height
  const scaleZ = 250 / H; 
  const scaleY = scaleZ; // Transverse and Vertical scales must match for Body Plan

  // Y-axis Base Lines
  const Y_SAC_BASE = 250;
  const Y_SHEER_BASE = 650;
  const X_BODY_CENTER = X_START + 10 * ST_SPACING; // Center of drawing
  const Y_HB_CL = 750;
  const Y_DIAG_CL = 1150;

  // Helpers to get drawing coords
  const getX = (st: number) => X_START + st * ST_SPACING;
  const getZ = (z_m: number, base: number) => base - z_m * scaleZ;
  const getY = (y_m: number, base: number, goesDown = true) => goesDown ? base + y_m * scaleY : base - y_m * scaleY;

  // Export Table of Offsets to CSV
  const handleExportCSV = () => {
    const headers = ["Station", "X Position (m)", ...engine.wlLabels.map(l => `${l} (m)`)];
    const rows = offsetTable.map(row => [
      row.station,
      (row.station * (LBP/20)).toFixed(2),
      ...engine.wlLabels.map(l => row.offsets[l])
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `LinesPlan_Offsets_${LBP}m.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // SVG viewBox for Zoom
  const vbWidth = CANVAS_W / zoomLevel;
  const vbHeight = CANVAS_H / zoomLevel;
  const vbX = (CANVAS_W - vbWidth) / 2;
  const vbY = (CANVAS_H - vbHeight) / 2;

  // Path generator (Using straight lines to guarantee no artificial spline wiggles)
  // For 21 stations, linear interpolation is the most honest representation of the offsets.
  const smoothPath = (pts: {x:number, y:number}[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(3)},${pts[i].y.toFixed(3)}`;
    }
    return d;
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6 font-sans text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Lines Plan AutoCAD Blueprint (Proyeksi Penuh)
              </h2>
              <p className="text-xs text-slate-400">
                Penyajian standar industri: Sheer, Body, Half-Breadth, SAC, dan Diagonal terintegrasi.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("cad")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "cad" ? "bg-blue-600 text-white shadow-md font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            CAD Blueprint
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "table" ? "bg-blue-600 text-white shadow-md font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Table of Offsets
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
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all bg-emerald-600 text-white shadow-md font-bold hover:bg-emerald-500"
          >
            <Download size={14} className="inline mr-1" />
            AutoCAD .SCR
          </button>
        </div>
      </div>

      {/* TAB 1: CAD BLUEPRINT */}
      {activeTab === "cad" && (
        <div className="w-full relative bg-white/95 rounded-xl border-4 border-slate-700 overflow-hidden shadow-inner group">
          
          {/* Zoom Overlay */}
          <div className="absolute right-4 top-4 flex flex-col bg-slate-800/90 p-1 rounded-lg border border-slate-600 backdrop-blur-md z-10 opacity-60 group-hover:opacity-100 transition-opacity shadow-lg">
            <button onClick={() => setZoomLevel(z => Math.min(z + 0.5, 4))} className="p-1.5 hover:bg-slate-700 text-slate-200 rounded"><ZoomIn size={16} /></button>
            <button onClick={() => setZoomLevel(1)} className="p-1 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold">{Math.round(zoomLevel * 100)}%</button>
            <button onClick={() => setZoomLevel(z => Math.max(z - 0.5, 1))} className="p-1.5 hover:bg-slate-700 text-slate-200 rounded"><ZoomOut size={16} /></button>
          </div>

          <div className="w-full overflow-hidden" style={{ minHeight: '600px' }}>
            <svg 
              ref={svgRef}
              className="w-full h-full cursor-crosshair transition-all duration-300 ease-in-out" 
              viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`} 
              preserveAspectRatio="xMidYMid meet"
              style={{ backgroundColor: '#ffffff' }}
            >
              <defs>
                <pattern id="grid10" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <pattern id="grid50" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#grid10)" />
              <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#grid50)" />
              
              {/* Decorative Frame */}
              <rect x="10" y="10" width={CANVAS_W-20} height={CANVAS_H-20} fill="none" stroke="#0f172a" strokeWidth="4" />
              <rect x="15" y="15" width={CANVAS_W-30} height={CANVAS_H-30} fill="none" stroke="#0f172a" strokeWidth="1" />
              
              <text x={25} y="40" fill="#0f172a" fontSize="16" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2" style={{writingMode: "vertical-rl", transform: "rotate(180deg)", transformOrigin: "25px 40px"}}>
                PRODUCED BY AN AUTODESK EDUCATIONAL PRODUCT
              </text>
              <text x={CANVAS_W - 25} y="40" fill="#0f172a" fontSize="16" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2" style={{writingMode: "vertical-rl"}}>
                PRODUCED BY AN AUTODESK EDUCATIONAL PRODUCT
              </text>
              <text x={CANVAS_W/2} y="35" fill="#0f172a" fontSize="16" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="2">
                PRODUCED BY AN AUTODESK EDUCATIONAL PRODUCT
              </text>
              <text x={CANVAS_W/2} y={CANVAS_H - 20} fill="#0f172a" fontSize="16" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" letterSpacing="2" style={{transform: "rotate(180deg)", transformOrigin: `${CANVAS_W/2}px ${CANVAS_H - 20}px`}}>
                PRODUCED BY AN AUTODESK EDUCATIONAL PRODUCT
              </text>

              {/* ========================================================= */}
              {/* 1. SECTIONAL AREA CURVE (SAC) */}
              {/* ========================================================= */}
              <text x={X_BODY_CENTER} y={Y_SAC_BASE - 210} fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                SECTIONAL AREA CURVE (SAC)
              </text>
              <line x1={X_START - 50} y1={Y_SAC_BASE} x2={X_END + 50} y2={Y_SAC_BASE} stroke="#334155" strokeWidth="2" />
              <path 
                d={smoothPath(offsetTable.map(st => ({ x: getX(st.station), y: Y_SAC_BASE - sacCurve[st.station] * 180 })))} 
                fill="none" stroke="#0f172a" strokeWidth="2.5" 
              />

              {/* ========================================================= */}
              {/* 2. SHEER PLAN (PROFILE) & BODY PLAN CENTER */}
              {/* ========================================================= */}
              
              {/* Base, DWL, Deck Grid for Sheer & Body */}
              <line x1={X_START - 50} y1={Y_SHEER_BASE} x2={X_END + 50} y2={Y_SHEER_BASE} stroke="#0f172a" strokeWidth="2.5" />
              <text x={X_START - 55} y={Y_SHEER_BASE+4} fill="#0f172a" fontSize="11" textAnchor="end" fontWeight="bold">BL 0</text>
              
              {waterlines.map((wl, i) => (
                <g key={`sh-wl-${i}`}>
                  <line x1={X_START - 50} y1={getZ(wl, Y_SHEER_BASE)} x2={X_END + 50} y2={getZ(wl, Y_SHEER_BASE)} stroke="#94a3b8" strokeWidth="1" />
                  <text x={X_START - 55} y={getZ(wl, Y_SHEER_BASE)+4} fill="#0f172a" fontSize="10" textAnchor="end">{wlLabels[i]}</text>
                  <text x={X_END + 55} y={getZ(wl, Y_SHEER_BASE)+4} fill="#0f172a" fontSize="10">{wlLabels[i]}</text>
                </g>
              ))}

              <text x={X_BODY_CENTER} y={Y_SHEER_BASE + 35} fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                SHEER PLAN & BODY PLAN
              </text>

              {/* Sheer Plan Stations (Vertical Lines) */}
              {offsetTable.map(st => (
                <g key={`sh-st-${st.station}`}>
                  <line x1={getX(st.station)} y1={Y_SHEER_BASE} x2={getX(st.station)} y2={getZ(st.localDeckZ, Y_SHEER_BASE)-20} stroke="#cbd5e1" strokeWidth="1" />
                  <text x={getX(st.station)} y={Y_SHEER_BASE + 15} fill="#0f172a" fontSize="11" textAnchor="middle">
                    {st.station === 0 ? "AP" : st.station === 20 ? "FP" : st.station}
                  </text>
                </g>
              ))}

              {/* Sheer Plan Curves (Aft and Fore Outlines) */}
              <path 
                d={smoothPath(offsetTable.map(st => ({ x: getX(st.station), y: getZ(st.localDeckZ, Y_SHEER_BASE) })))} 
                fill="none" stroke="#0f172a" strokeWidth="2.5" 
              />
              <path 
                d={smoothPath(offsetTable.map(st => ({ x: getX(st.station), y: getZ(0, Y_SHEER_BASE) })))} 
                fill="none" stroke="#0f172a" strokeWidth="2.5" 
              />
              
              {/* Stem and Stern Profile (Fair curves closing the hull ends) */}
              {(() => {
                const sternPts = [
                  { x: getX(0) - 20, y: getZ(offsetTable[0].localDeckZ, Y_SHEER_BASE) },
                  { x: getX(0), y: getZ(offsetTable[0].localDeckZ * 0.5, Y_SHEER_BASE) },
                  { x: getX(0), y: getZ(0, Y_SHEER_BASE) }
                ];
                const stemPts = [
                  { x: getX(20) + 30, y: getZ(offsetTable[20].localDeckZ, Y_SHEER_BASE) },
                  { x: getX(20) + 10, y: getZ(offsetTable[20].localDeckZ * 0.5, Y_SHEER_BASE) },
                  { x: getX(20), y: getZ(0, Y_SHEER_BASE) }
                ];
                return (
                  <>
                    <path d={smoothPath(sternPts)} fill="none" stroke="#0f172a" strokeWidth="2.5" />
                    <path d={smoothPath(stemPts)} fill="none" stroke="#0f172a" strokeWidth="2.5" />
                  </>
                );
              })()}

              {/* Buttock Curves in Sheer Plan */}
              {buttocks.map((b, i) => {
                const bPts = offsetTable
                  .filter(st => st.buttockZ[`B${i+1}`] !== -1)
                  .map(st => ({ x: getX(st.station), y: getZ(st.buttockZ[`B${i+1}`], Y_SHEER_BASE) }));
                if (bPts.length < 2) return null;
                return (
                  <g key={`sh-but-${i}`}>
                    <path d={smoothPath(bPts)} fill="none" stroke="#1d4ed8" strokeWidth="1.2" />
                    <text x={bPts[0].x - 15} y={bPts[0].y + 5} fill="#1d4ed8" fontSize="9">B {i+1}</text>
                  </g>
                );
              })}
              
              {/* BODY PLAN (Overlaid in Center x=1000) */}
              <g id="body-plan">
                {/* White Background to block out the sheer plan behind it */}
                <rect x={X_BODY_CENTER - (B/2)*scaleY - 20} y={getZ(H+sheerFore+1, Y_SHEER_BASE)} width={B*scaleY + 40} height={(H+sheerFore)*scaleZ + 40} fill="#ffffff" fillOpacity="0.85" />
                
                <line x1={X_BODY_CENTER} y1={Y_SHEER_BASE + 10} x2={X_BODY_CENTER} y2={getZ(H+sheerFore, Y_SHEER_BASE) - 50} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,5" />
                <text x={X_BODY_CENTER} y={getZ(H+sheerFore, Y_SHEER_BASE) - 55} fill="#ef4444" fontSize="12" textAnchor="middle" fontWeight="bold">CL</text>
                
                {/* Buttocks Grid in Body Plan */}
                {buttocks.map((b, i) => (
                  <g key={`bp-but-${i}`}>
                    <line x1={X_BODY_CENTER - b * scaleY} y1={Y_SHEER_BASE} x2={X_BODY_CENTER - b * scaleY} y2={getZ(H+sheerFore, Y_SHEER_BASE)} stroke="#94a3b8" strokeWidth="0.8" />
                    <line x1={X_BODY_CENTER + b * scaleY} y1={Y_SHEER_BASE} x2={X_BODY_CENTER + b * scaleY} y2={getZ(H+sheerFore, Y_SHEER_BASE)} stroke="#94a3b8" strokeWidth="0.8" />
                  </g>
                ))}

                {/* Draw Station Curves for Body Plan */}
                {offsetTable.map((st) => {
                  const isFore = st.station > 10;
                  const isAft = st.station < 10;
                  const isMid = st.station === 10;
                  const sign = isFore ? 1 : isAft ? -1 : 1;
                  
                  const pts = waterlines.map((z, i) => {
                    const y = st.offsets[wlLabels[i]];
                    return { x: X_BODY_CENTER + sign * (y * scaleY), y: getZ(z, Y_SHEER_BASE) };
                  });

                  if (isMid) {
                    // Draw both sides for midship
                    const ptsPort = [
                      ...waterlines.map((z, i) => ({ x: X_BODY_CENTER - (st.offsets[wlLabels[i]] * scaleY), y: getZ(z, Y_SHEER_BASE) })),
                      { x: X_BODY_CENTER - (st.offsets["DECK"] * scaleY), y: getZ(st.localDeckZ, Y_SHEER_BASE) }
                    ];
                    const ptsStbd = [
                      ...waterlines.map((z, i) => ({ x: X_BODY_CENTER + (st.offsets[wlLabels[i]] * scaleY), y: getZ(z, Y_SHEER_BASE) })),
                      { x: X_BODY_CENTER + (st.offsets["DECK"] * scaleY), y: getZ(st.localDeckZ, Y_SHEER_BASE) }
                    ];
                    return (
                      <g key={`bp-st-10`}>
                        <path d={smoothPath(ptsPort)} fill="none" stroke="#1e293b" strokeWidth="2.5" />
                        <path d={smoothPath(ptsStbd)} fill="none" stroke="#1e293b" strokeWidth="2.5" />
                      </g>
                    );
                  }

                  pts.push({ x: X_BODY_CENTER + sign * (st.offsets["DECK"] * scaleY), y: getZ(st.localDeckZ, Y_SHEER_BASE) });
                  return <path key={`bp-st-${st.station}`} d={smoothPath(pts)} fill="none" stroke="#334155" strokeWidth="1.2" />;
                })}
              </g>

              {/* ========================================================= */}
              {/* 3. HALF BREADTH PLAN */}
              {/* ========================================================= */}
              <line x1={X_START - 50} y1={Y_HB_CL} x2={X_END + 50} y2={Y_HB_CL} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,5" />
              <text x={X_START - 55} y={Y_HB_CL+4} fill="#ef4444" fontSize="11" textAnchor="end" fontWeight="bold">CL</text>
              <text x={X_BODY_CENTER} y={Y_HB_CL - 15} fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                HALF BREADTH PLAN
              </text>

              {/* Buttocks in Half Breadth (Horizontal) */}
              {buttocks.map((b, i) => (
                <g key={`hb-but-${i}`}>
                  <line x1={X_START - 20} y1={getY(b, Y_HB_CL)} x2={X_END + 20} y2={getY(b, Y_HB_CL)} stroke="#94a3b8" strokeWidth="1" />
                  <text x={X_END + 25} y={getY(b, Y_HB_CL)+3} fill="#0f172a" fontSize="9">B {i+1}</text>
                </g>
              ))}

              {/* Stations Grid in Half Breadth */}
              {offsetTable.map(st => (
                <g key={`hb-st-${st.station}`}>
                  <line x1={getX(st.station)} y1={Y_HB_CL} x2={getX(st.station)} y2={getY((B/2)+2, Y_HB_CL)} stroke="#cbd5e1" strokeWidth="1" />
                  <text x={getX(st.station)} y={getY((B/2)+3.5, Y_HB_CL)} fill="#0f172a" fontSize="10" textAnchor="middle">{st.station}</text>
                </g>
              ))}

              {/* Waterlines in Half Breadth (Longitudinal Paths) */}
              {waterlines.map((z, i) => {
                const wlName = wlLabels[i];
                const pts = offsetTable.map(st => ({ x: getX(st.station), y: getY(st.offsets[wlName], Y_HB_CL) }));
                return <path key={`hb-wl-${i}`} d={smoothPath(pts)} fill="none" stroke="#0f172a" strokeWidth={wlName === "DECK" ? "2.5" : "1.2"} />;
              })}

              {/* ========================================================= */}
              {/* 4. DIAGONAL SENT */}
              {/* ========================================================= */}
              <line x1={X_START - 50} y1={Y_DIAG_CL} x2={X_END + 50} y2={Y_DIAG_CL} stroke="#0f172a" strokeWidth="2" />
              <text x={X_BODY_CENTER} y={Y_DIAG_CL + 25} fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                DIAGONAL SENT
              </text>
              {/* Stations Grid in Diagonal */}
              {offsetTable.map(st => (
                <line key={`diag-st-${st.station}`} x1={getX(st.station)} y1={Y_DIAG_CL} x2={getX(st.station)} y2={Y_DIAG_CL - 150} stroke="#cbd5e1" strokeWidth="1" />
              ))}

              {/* Draw Diagonal Sent Curves */}
              {(() => {
                // We define 3 diagonals based on intersections with center/baseline
                const diagonals = [
                  { name: "D1", angle: 0.8, offset: 0.2 },
                  { name: "D2", angle: 1.0, offset: 0.5 },
                  { name: "D3", angle: 1.2, offset: 0.8 }
                ];
                
                return diagonals.map((diag, i) => {
                  const diagPts = offsetTable.map(st => {
                    const dwl = st.offsets["DWL"] || st.offsets["WL 5"];
                    // Very rough proxy for diagonal expansion
                    const diagVal = Math.sqrt(Math.pow(dwl || B/2, 2) + Math.pow(T, 2)) * diag.offset; 
                    return { x: getX(st.station), y: Y_DIAG_CL - diagVal * scaleY };
                  });
                  return (
                    <g key={`diag-${i}`}>
                      <path d={smoothPath(diagPts)} fill="none" stroke="#0f172a" strokeWidth={i === 1 ? "2" : "1"} />
                      <text x={X_END + 10} y={diagPts[20].y} fill="#0f172a" fontSize="10">{diag.name}</text>
                    </g>
                  );
                });
              })()}

            </svg>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE OF OFFSETS */}
      {activeTab === "table" && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <TableIcon size={16} className="text-cyan-400 mr-2" />
              Table of Offsets (Half-Breadth)
            </h3>
            <button onClick={handleExportCSV} className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner no-scrollbar">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3 font-bold text-cyan-400">Station</th>
                  <th className="py-2.5 px-3 font-bold text-slate-300">Pos X (m)</th>
                  {wlLabels.map(l => <th key={l} className="py-2.5 px-3 font-bold text-white">{l}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {offsetTable.map((row) => (
                  <tr key={row.station} className={`hover:bg-cyan-500/10 ${row.station === 10 ? "bg-amber-500/10 font-bold" : "even:bg-slate-950/40"}`}>
                    <td className="py-2 px-3 text-cyan-300 font-bold">St. {row.station}</td>
                    <td className="py-2 px-3 text-slate-400">{(row.station * (LBP/20)).toFixed(2)}</td>
                    {wlLabels.map(l => <td key={l} className="py-2 px-3 text-slate-200">{row.offsets[l]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
