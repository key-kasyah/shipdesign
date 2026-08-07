"use client";

import React, { useMemo } from "react";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Compass,
  Layers,
  Box,
  TrendingUp
} from "lucide-react";

interface ConstraintsSummaryProps {
  lbp_m: number;
  breadth_m: number;
  draft_m: number;
  depth_m: number;
  cb: number;
  cm?: number;
  calculatedLoa?: number;
  foreOverhang?: number;
  aftOverhang?: number;
  vesselType?: string;
}

export const DesignConstraintsSummary: React.FC<ConstraintsSummaryProps> = ({
  lbp_m = 90.0,
  breadth_m = 16.0,
  draft_m = 5.5,
  depth_m = 8.0,
  cb = 0.76,
  cm = 0.98,
  calculatedLoa,
  foreOverhang,
  aftOverhang,
  vesselType = "GENERAL_CARGO"
}) => {
  const LBP = Math.max(10, lbp_m);
  const B = Math.max(2, breadth_m);
  const T = Math.max(1, draft_m);
  const H = Math.max(2, depth_m);
  const Cm = Math.max(0.8, Math.min(1.0, cm));
  const Cb = Math.max(0.4, Math.min(0.9, cb));

  // Hydrostatic & Geometric Formulations
  const Am = B * T * Cm; // Midship Sectional Area
  const Cp = Cb / (Cm || 1); // Prismatic Coefficient
  const displacementVol = LBP * B * T * Cb;
  const displacementTon = displacementVol * 1.025;

  // Real or Estimated LOA
  const realLoa = calculatedLoa || Number((LBP * 1.055).toFixed(2));
  const realForeOverhang = foreOverhang !== undefined ? foreOverhang : Number((LBP * 0.035).toFixed(2));
  const realAftOverhang = aftOverhang !== undefined ? aftOverhang : Number((LBP * 0.020).toFixed(2));
  const loaRatio = realLoa / LBP;

  // LWL Estimation (Length on Waterline)
  const lwl = Number((LBP * 1.025).toFixed(2));

  // PMB Estimation
  const pmbStationsCount = Cb > 0.75 ? 6 : Cb > 0.65 ? 4 : 2;
  const pmbLength = Number(((pmbStationsCount / 20) * LBP).toFixed(2));
  const pmbPercentage = Number(((pmbLength / LBP) * 100).toFixed(1));

  // Standard checks
  const isLoaValid = loaRatio >= 1.02 && loaRatio <= 1.09;
  const isLbpValid = LBP > 0;
  const isBTValid = B / T >= 2.0 && B / T <= 3.5;
  const isLHValid = LBP / H >= 9.0 && LBP / H <= 15.0;

  return (
    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6 font-sans text-slate-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Matriks Batasan Desain & Dimensi Acuan (Basic Design Constraints)
            </h2>
            <p className="text-xs text-slate-400">
              Pemisahan parameter acuan tetap (konstan) hasil pra-desain terhadap komponen variabel bebas tampak samping.
            </p>
          </div>
        </div>

        <span className="text-[11px] px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 self-start sm:self-auto">
          Tipe: <strong className="text-cyan-300">{vesselType}</strong>
        </span>
      </div>

      {/* 2-Grid: Fixed Constraints vs Variable Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: FIXED / CONSTANT CONSTRAINTS */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Lock size={15} className="text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Batasan Desain Utama (Tetap / Konstan)
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ACUAN PRA-DESAIN
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dimensi utama hasil optimasi daya dan muat yang <strong>sifatnya tetap / konstan</strong> sebagai batas acuan dasar pembuatan rencana garis:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Panjang Antar Garis Tegak (LBP):</span>
              <strong className="text-cyan-300 font-bold">{LBP.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Lebar Maksimum Kapal (B):</span>
              <strong className="text-white font-bold">{B.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Tinggi Geladak Utama (H):</span>
              <strong className="text-white font-bold">{H.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Sarat Muat Air (T / Draft):</span>
              <strong className="text-emerald-400 font-bold">{T.toFixed(3)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Koefisien Blok (Cb):</span>
              <strong className="text-amber-400 font-bold">{Cb.toFixed(3)}</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Luas Midship ($A_m = B \times T \times C_m$):</span>
              <strong className="text-cyan-300 font-bold">{Am.toFixed(2)} m²</strong>
            </div>
          </div>
        </div>

        {/* RIGHT: VARIABLE / FLEXIBLE DESIGN DIMENSIONS */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Unlock size={15} className="text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Komponen Variabel Bebas (Flexible Design)
              </h3>
            </div>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              DINAMIS / NURBS
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Komponen dimensi yang <strong>diperoleh setelah penggambaran tampak samping selesai</strong> bergantung pada bentuk kelengkungan linggi haluan dan buritan:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-amber-500/30">
              <div>
                <span className="text-slate-300 font-semibold block">Panjang Menyeluruh (LOA Nyata):</span>
                <span className="text-[10px] text-slate-500 font-mono">Dihitung dari Xmax - Xmin kurva profil</span>
              </div>
              <strong className="text-amber-300 font-bold text-sm">{realLoa.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Panjang Garis Air (LWL):</span>
              <strong className="text-cyan-300 font-bold">{lwl.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Fore Overhang (Haluan Depan FP):</span>
              <strong className="text-slate-200 font-bold">+{realForeOverhang.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Aft Overhang (Buritan Belakang AP):</span>
              <strong className="text-slate-200 font-bold">+{realAftOverhang.toFixed(2)} m</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Rasio LOA / LBP:</span>
              <span className="flex items-center space-x-2">
                <strong className={`font-bold ${isLoaValid ? "text-emerald-400" : "text-amber-400"}`}>
                  {loaRatio.toFixed(3)}
                </strong>
                <span className="text-[10px] text-slate-500">(Standar: 1.02 ~ 1.08)</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Koefisien Prismatik ($C_p = C_b / C_m$):</span>
              <strong className="text-purple-300 font-bold">{Cp.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: PMB & HULL REGIONS */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Box size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              3. Karakteristik Parallel Middle Body (PMB) & Karakteristik Lambung
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Panjang PMB: <strong className="text-cyan-300">{pmbLength} m ({pmbPercentage}% LBP)</strong>
          </span>
        </div>

        {/* Visual PMB Breakdown Bar */}
        <div className="space-y-2">
          <div className="w-full h-8 bg-slate-950 rounded-xl border border-slate-800 flex overflow-hidden p-0.5">
            <div className="h-full bg-indigo-600/40 border-r border-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-300" style={{ width: "35%" }}>
              Afterbody (35%)
            </div>
            <div className="h-full bg-cyan-500/40 border-r border-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-200" style={{ width: `${pmbPercentage}%` }}>
              PMB ({pmbPercentage}%)
            </div>
            <div className="h-full bg-emerald-600/40 flex items-center justify-center text-[10px] font-bold text-emerald-300" style={{ width: `${65 - pmbPercentage}%` }}>
              Forebody ({(65 - pmbPercentage).toFixed(0)}%)
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 px-1">
            <span>Station 0 (AP)</span>
            <span>Station 7</span>
            <span>Station 10 (Midship)</span>
            <span>Station 13</span>
            <span>Station 20 (FP)</span>
          </div>
        </div>

        {/* PMB Explanatory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-indigo-400 font-bold block mb-1">Afterbody (St. 0 s.d 7)</span>
            <p className="text-[11px] text-slate-400">
              Daerah buritan transisi. Bentuk penampang dirancang ramping (V-shape) untuk aliran air propeller dan kemudi.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-cyan-500/30">
            <span className="text-cyan-400 font-bold block mb-1">PMB (St. 7 s.d 13)</span>
            <p className="text-[11px] text-slate-400">
              Penampang seragam seluas $A_m$. Memaksimalkan volume palka muatan dan memudahkan fabrikasi pelat dinding lambung kapal.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Forebody (St. 13 s.d 20)</span>
            <p className="text-[11px] text-slate-400">
              Daerah haluan transisi. Bentuk kurva U-shape ramping atau ditambah bulb untuk mereduksi tahanan gelombang laut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
