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
import { formatVesselType } from "../../types";

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
    <div className="border-t border-border-default pt-6 space-y-8 font-sans text-text-primary">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-default gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="text-text-secondary shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary tracking-normal">
              Matriks Batasan Desain & Dimensi Acuan (Basic Design Constraints)
            </h2>
            <p className="text-sm text-text-secondary">
              Pemisahan parameter acuan tetap (konstan) hasil pra-desain terhadap komponen variabel bebas tampak samping.
            </p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 bg-surface-primary rounded-lg border border-border-default text-text-primary self-start sm:self-auto">
          Tipe: <strong className="text-accent-primary">{formatVesselType(vesselType)}</strong>
        </span>
      </div>

      {/* 2-Grid: Fixed Constraints vs Variable Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: FIXED / CONSTANT CONSTRAINTS */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-border-default">
            <div className="flex items-center space-x-2">
              <Lock size={15} className="text-status-success" />
              <h3 className="text-sm font-semibold text-text-primary tracking-normal">
                1. Batasan Desain Utama (Tetap / Konstan)
              </h3>
            </div>
            <span className="text-xs text-status-success font-semibold bg-status-success-subtle px-2 py-0.5 rounded border border-status-success-border">
              ACUAN PRA-DESAIN
            </span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            Dimensi utama hasil optimasi daya dan muat yang <strong>sifatnya tetap / konstan</strong> sebagai batas acuan dasar pembuatan rencana garis:
          </p>

          <div className="space-y-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Panjang Antar Garis Tegak (LBP):</span>
              <strong className="text-accent-primary font-semibold">{LBP.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Lebar Maksimum Kapal (B):</span>
              <strong className="text-text-primary font-semibold">{B.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Tinggi Geladak Utama (H):</span>
              <strong className="text-text-primary font-semibold">{H.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Sarat Muat Air (T / Draft):</span>
              <strong className="text-status-success font-semibold">{T.toFixed(3)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Koefisien Blok (Cb):</span>
              <strong className="text-status-warning font-semibold">{Cb.toFixed(3)}</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Luas Midship ($A_m = B \times T \times C_m$):</span>
              <strong className="text-accent-primary font-semibold">{Am.toFixed(2)} m²</strong>
            </div>
          </div>
        </div>

        {/* RIGHT: VARIABLE / FLEXIBLE DESIGN DIMENSIONS */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-border-default">
            <div className="flex items-center space-x-2">
              <Unlock size={15} className="text-status-warning" />
              <h3 className="text-sm font-semibold text-text-primary tracking-normal">
                2. Komponen Variabel Bebas (Flexible Design)
              </h3>
            </div>
            <span className="text-xs text-status-warning font-semibold bg-status-warning-subtle px-2 py-0.5 rounded border border-status-warning-border">
              DINAMIS / NURBS
            </span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            Komponen dimensi yang <strong>diperoleh setelah penggambaran tampak samping selesai</strong> bergantung pada bentuk kelengkungan linggi haluan dan buritan:
          </p>

          <div className="space-y-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <div>
                <span className="text-text-primary font-semibold block">Panjang Menyeluruh (LOA Nyata):</span>
                <span className="text-xs text-text-secondary font-mono">Dihitung dari Xmax - Xmin kurva profil</span>
              </div>
              <strong className="text-status-warning font-semibold text-sm">{realLoa.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Panjang Garis Air (LWL):</span>
              <strong className="text-accent-primary font-semibold">{lwl.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Fore Overhang (Haluan Depan FP):</span>
              <strong className="text-text-primary font-semibold">+{realForeOverhang.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Aft Overhang (Buritan Belakang AP):</span>
              <strong className="text-text-primary font-semibold">+{realAftOverhang.toFixed(2)} m</strong>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Rasio LOA / LBP:</span>
              <span className="flex items-center space-x-2">
                <strong className={`font-semibold ${isLoaValid ? "text-status-success" : "text-status-warning"} `}>
                  {loaRatio.toFixed(3)}
                </strong>
                <span className="text-xs text-text-secondary">(Standar: 1.02 ~ 1.08)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border-subtle">
              <span className="text-text-secondary">Koefisien Prismatik ($C_p = C_b / C_m$):</span>
              <strong className="text-accent-primary font-semibold">{Cp.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: PMB & HULL REGIONS */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Box size={16} className="text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary tracking-normal">
              3. Karakteristik Parallel Middle Body (PMB) & Karakteristik Lambung
            </h3>
          </div>
          <span className="text-xs text-text-secondary">
            Panjang PMB: <strong className="text-accent-primary">{pmbLength} m ({pmbPercentage}% LBP)</strong>
          </span>
        </div>

        {/* Visual PMB Breakdown Bar */}
        <div className="space-y-2">
          <div className="w-full h-8 bg-surface-inset rounded-lg border border-border-default flex overflow-hidden p-0.5">
            <div className="h-full bg-surface-selected border-r border-border-default flex items-center justify-center text-xs font-semibold text-accent-primary" style={{ width: "35%" }}>
              Afterbody (35%)
            </div>
            <div className="h-full bg-surface-selected border-r border-border-default flex items-center justify-center text-xs font-semibold text-accent-primary" style={{ width: `${pmbPercentage}%` }}>
              PMB ({pmbPercentage}%)
            </div>
            <div className="h-full bg-status-success-subtle flex items-center justify-center text-xs font-semibold text-status-success" style={{ width: `${65 - pmbPercentage}%` }}>
              Forebody ({(65 - pmbPercentage).toFixed(0)}%)
            </div>
          </div>
          <div className="flex justify-between text-xs text-text-secondary px-1">
            <span>Station 0 (AP)</span>
            <span>Station 7</span>
            <span>Station 10 (Midship)</span>
            <span>Station 13</span>
            <span>Station 20 (FP)</span>
          </div>
        </div>

        {/* PMB Explanatory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-1">
          <div className="border-b border-border-subtle py-3 min-w-0">
            <span className="text-accent-primary font-semibold block mb-1">Afterbody (St. 0 s.d 7)</span>
            <p className="text-sm text-text-secondary">
              Daerah buritan transisi. Bentuk penampang dirancang ramping (V-shape) untuk aliran air propeller dan kemudi.
            </p>
          </div>
          <div className="border-b border-border-subtle py-3 min-w-0">
            <span className="text-accent-primary font-semibold block mb-1">PMB (St. 7 s.d 13)</span>
            <p className="text-sm text-text-secondary">
              Penampang seragam seluas $A_m$. Memaksimalkan volume palka muatan dan memudahkan fabrikasi pelat dinding lambung kapal.
            </p>
          </div>
          <div className="border-b border-border-subtle py-3 min-w-0">
            <span className="text-status-success font-semibold block mb-1">Forebody (St. 13 s.d 20)</span>
            <p className="text-sm text-text-secondary">
              Daerah haluan transisi. Bentuk kurva U-shape ramping atau ditambah bulb untuk mereduksi tahanan gelombang laut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
