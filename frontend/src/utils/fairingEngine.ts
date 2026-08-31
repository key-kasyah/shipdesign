/**
 * FairingEngine — Hydrodynamic Hull Geometry & Offset Generation Engine
 * Fully synchronized with WaterPlaneCalculationSheet (Tab 2) & MidshipBilgeCalculationSheet (Tab 3)
 */

export interface WaterlineLevelSimple {
  id: string;
  name: string;
  shortName: string;
  draftFraction: number;
  awlFactor: number;
  maxBreadthFactor: number;
  color: string;
  badge: string;
}

export class FairingEngine {
  lbp: number;
  B: number;
  T: number;
  H: number;
  cb: number;
  cm: number;
  R: number; // Bilge radius
  csaOrdinates: number[];
  waterlines: number[];
  wlLabels: string[];
  wlConfigs: WaterlineLevelSimple[];
  stations: number[];
  spacing: number;
  offsetTable: Record<number, Record<string, number>>;

  constructor(
    lbp: number,
    B: number,
    T: number,
    H: number,
    targetVol: number,
    cmVal: number = 0.98,
    customWaterlineLevels?: WaterlineLevelSimple[]
  ) {
    this.lbp = lbp;
    this.B = B;
    this.T = T;
    this.H = H;
    this.cm = cmVal;
    this.cb = targetVol / (lbp * B * T);

    // 1. Calculate exact Bilge Radius R from Midship Area formula
    const areaDiff = B * T * (1.0 - this.cm);
    const denom = 2.0 - Math.PI / 2.0;
    this.R = denom > 0 && areaDiff > 0 ? Math.sqrt(areaDiff / denom) : 0;

    // 2. Realistic SAC Curve with Parallel Middle Body (PMB: St 5.5 to 13.5)
    let Cp = this.cb / this.cm;
    Cp = Math.max(0.55, Math.min(0.92, Cp));

    // PMB half-span on 21 stations (St 0 to 20): St 5.5 to St 13.5
    const xp = Math.max(0.2, (Cp - 0.55) * 0.9);
    const areaRatio = (Cp - xp) / (1.0 - xp);
    const n = Math.max(0.5, areaRatio / (1.0 - areaRatio));

    const Am = B * T * this.cm;

    this.csaOrdinates = Array.from({ length: 21 }).map((_, st) => {
      const x = Math.abs((st - 10) / 10.0);
      if (x <= xp) {
        return Am;
      } else {
        const u = (x - xp) / (1.0 - xp);
        return Math.max(0.001, Am * (1.0 - Math.pow(u, n)));
      }
    });

    // 3. Dynamic Waterlines (from Tab 2) or standard 7 WL fallback
    if (customWaterlineLevels && customWaterlineLevels.length > 0) {
      // Sort ascending from 0 to T for bottom-up CAD stack
      const sorted = [...customWaterlineLevels].sort((a, b) => a.draftFraction - b.draftFraction);
      this.wlConfigs = sorted;
      this.waterlines = [...sorted.map((w) => w.draftFraction * this.T), this.H];
      this.wlLabels = [...sorted.map((w) => w.shortName), "DECK"];
    } else {
      this.wlConfigs = [];
      this.waterlines = [
        0.0,
        (1 / 6) * this.T,
        (2 / 6) * this.T,
        (3 / 6) * this.T,
        (4 / 6) * this.T,
        (5 / 6) * this.T,
        this.T,
        this.H
      ];
      this.wlLabels = ["WL 0", "WL 1", "WL 2", "WL 3", "WL 4", "WL 5", "WL 6 (DWL)", "DECK"];
    }

    this.stations = Array.from({ length: 21 }).map((_, i) => i);
    this.spacing = lbp / 20.0;
    this.offsetTable = {};
  }

  getSheerZ(st: number): number {
    if (st < 10) {
      const x = (10 - st) / 10.0;
      return this.H + (2.8 * (this.lbp / 3 + 10) / 1000) * (x * x);
    } else {
      const x = (st - 10) / 10.0;
      return this.H + (5.6 * (this.lbp / 3 + 10) / 1000) * (x * x);
    }
  }

  generateOffsets(waterlinesData?: Record<string, Record<number, number>>) {
    const halfB = this.B / 2.0;

    const WL_KEY_MAP: Record<string, string> = {
      "WL 6 (DWL)": "WL6",
      "WL 5": "WL5",
      "WL 4": "WL4",
      "WL 3": "WL3",
      "WL 2": "WL2",
      "WL 1": "WL1",
      "WL 0": "WL0"
    };

    // Standard longitudinal waterline distribution profile (from Tab 2 WaterPlane Calculation)
    const getLongitudinalRatio = (st: number): number => {
      // Parallel Middle Body (PMB): St. 6 to St. 15 (10 full stations)
      if (st >= 6 && st <= 15) return 1.000;
      
      // Peak 1 (Run Body towards AP)
      if (st === 5) return 0.995;
      if (st === 4) return 0.965;
      if (st === 3) return 0.890;
      if (st === 2) return 0.750;
      if (st === 1) return 0.520;
      if (st === 0) return 0.280;

      // Peak 2 (Entrance Body towards FP)
      if (st === 16) return 0.880;
      if (st === 17) return 0.650;
      if (st === 18) return 0.350;
      if (st === 19) return 0.100;
      if (st === 20) return 0.000;

      if (st < 6) {
        return Math.max(0, 0.28 + (st / 6.0) * 0.72);
      } else {
        return Math.max(0, 1.0 - ((st - 15.0) / 5.0));
      }
    };

    for (const st of this.stations) {
      this.offsetTable[st] = {};
      const isPMB = st >= 6 && st <= 15;
      const isFore = st > 15;
      const isAft = st < 6;
      const flatB = Math.max(0, halfB - this.R);

      // Station maximum half-breadth at DWL
      const topWlKey = `WL${this.waterlines.length - 2}`;
      const bDwl =
        waterlinesData?.[topWlKey]?.[st] !== undefined
          ? waterlinesData[topWlKey][st]
          : halfB * getLongitudinalRatio(st);

      for (let idx = 0; idx < this.waterlines.length; idx++) {
        const lbl = this.wlLabels[idx];
        const z = this.waterlines[idx];
        const cfg = this.wlConfigs[idx];
        const wlKey = cfg?.id || WL_KEY_MAP[lbl] || `WL${idx}`;

        // 1. Deck Line Handling
        if (lbl === "DECK" || z >= this.H - 0.001) {
          let deckFlare = 1.0;
          if (st > 15) deckFlare += ((st - 15) / 5) * 0.12;
          if (st < 3) deckFlare += ((3 - st) / 3) * 0.06;

          const yDeck = Math.min(halfB * 1.12, Math.max(bDwl, bDwl * deckFlare));
          this.offsetTable[st]["DECK"] = Number(Math.max(0, yDeck).toFixed(3));
          continue;
        }

        // 2. Base Waterline 0 (Keel level, Z = 0)
        if (idx === 0 || z === 0 || lbl === "WL 0") {
          if (isPMB) {
            this.offsetTable[st][lbl] = Number(flatB.toFixed(3));
          } else if (isAft) {
            // Skeg / keel line at centerline for afterbody
            this.offsetTable[st][lbl] = Number((flatB * (st / 6.0) * 0.3).toFixed(3));
          } else {
            // Keel / stem at centerline for forebody
            this.offsetTable[st][lbl] = 0.000;
          }
          continue;
        }

        // 3. Section Shape across Waterlines (Z > 0 to Z = T)
        if (isPMB) {
          // Parallel Middle Body: Flat of Side & Bilge Radius Turn
          if (this.R > 0 && z < this.R) {
            const delta = this.R - z;
            const term = this.R * this.R - delta * delta;
            const yBilge = flatB + (term > 0 ? Math.sqrt(term) : 0);
            this.offsetTable[st][lbl] = Number(Math.min(halfB, yBilge).toFixed(3));
          } else {
            // Above bilge turn: Flat of Side (100% full half-breadth)
            this.offsetTable[st][lbl] = Number(halfB.toFixed(3));
          }
        } else if (isFore) {
          // Forebody (Entrance / Bow): Natural smooth V/U flare from keel (0) to DWL (bDwl)
          const zRatio = Math.max(0, Math.min(1, z / this.T));
          const pFore = 0.45 + 0.65 * ((st - 15) / 5.0);
          const yVal = bDwl * Math.pow(zRatio, pFore);
          this.offsetTable[st][lbl] = Number(Math.max(0, Math.min(halfB, yVal)).toFixed(3));
        } else {
          // Afterbody (Run / Stern): Natural smooth U/V run from keel (0) to DWL (bDwl)
          const zRatio = Math.max(0, Math.min(1, z / this.T));
          const pAft = 0.40 + 0.50 * ((6.0 - st) / 6.0);
          const yVal = bDwl * Math.pow(zRatio, pAft);
          this.offsetTable[st][lbl] = Number(Math.max(0, Math.min(halfB, yVal)).toFixed(3));
        }
      }

      // 4. Strictly enforce frame monotonicity (y(z) is monotonically increasing with z from keel to deck)
      let prevY = 0;
      for (let idx = 0; idx < this.waterlines.length; idx++) {
        const lbl = this.wlLabels[idx];
        let curY = this.offsetTable[st][lbl] || 0;
        if (curY < prevY && idx > 0) {
          curY = prevY;
          this.offsetTable[st][lbl] = curY;
        }
        prevY = curY;
      }
    }
  }

  exportAutoCADScript(): string {
    const lines: string[] = [];

    // Setup Layers
    lines.push("-LAYER M FRAME C 1  ");
    lines.push("-LAYER M WATERLINE C 5  ");
    lines.push("-LAYER M CENTERLINE C 1 L CENTER  ");

    // 1. BODY PLAN
    lines.push("-LAYER S FRAME ");
    for (const st of this.stations) {
      const pts: { x: number; z: number }[] = [];
      for (let idx = 0; idx < this.wlLabels.length; idx++) {
        const lbl = this.wlLabels[idx];
        const y = this.offsetTable[st][lbl] || 0;
        const z = idx === this.wlLabels.length - 1 ? this.getSheerZ(st) : this.waterlines[idx];
        const xCoord = st >= 10 ? y : -y;
        pts.push({ x: xCoord, z });
      }
      lines.push("SPLINE");
      for (const p of pts) {
        lines.push(`${p.x.toFixed(3)},${p.z.toFixed(3)}`);
      }
      lines.push("");
      lines.push("");
      lines.push("");
    }

    lines.push("-LAYER S CENTERLINE ");
    lines.push(`LINE 0,0 0,${this.H * 1.5} `);
    lines.push("");

    // 2. SHEER PLAN (Offset to X = 50)
    const sheerOffsetX = 50;
    lines.push("-LAYER S FRAME ");
    lines.push("SPLINE");
    for (const st of this.stations) {
      const x = sheerOffsetX + st * this.spacing;
      const z = this.getSheerZ(st);
      lines.push(`${x.toFixed(3)},${z.toFixed(3)}`);
    }
    lines.push("");
    lines.push("");
    lines.push("");
    lines.push(`LINE ${sheerOffsetX},0 ${sheerOffsetX + 20 * this.spacing},0 `);
    lines.push("");

    // 3. HALF BREADTH PLAN (Offset to X = 50, Y = -20)
    const hbOffsetX = 50;
    const hbOffsetY = -20;
    lines.push("-LAYER S WATERLINE ");
    for (const lbl of this.wlLabels) {
      lines.push("SPLINE");
      for (const st of this.stations) {
        const x = hbOffsetX + st * this.spacing;
        const y = hbOffsetY - (this.offsetTable[st][lbl] || 0);
        lines.push(`${x.toFixed(3)},${y.toFixed(3)}`);
      }
      lines.push("");
      lines.push("");
      lines.push("");
    }

    lines.push("-LAYER S CENTERLINE ");
    lines.push(`LINE ${hbOffsetX},${hbOffsetY} ${hbOffsetX + 20 * this.spacing},${hbOffsetY} `);
    lines.push("");

    return lines.join("\n");
  }
}
