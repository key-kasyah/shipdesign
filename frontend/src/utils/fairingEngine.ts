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

// Path generator with smooth, fair cubic Bezier spline interpolation (prevents sharp polygonal corners)
export const smoothPath = (pts: { x: number; y: number }[], tension = 0.35) => {
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

  sideProfileData?: any;

  constructor(
    lbp: number,
    B: number,
    T: number,
    H: number,
    targetVol: number,
    cmVal: number = 0.98,
    customWaterlineLevels?: WaterlineLevelSimple[],
    customStations?: number[],
    sideProfileData?: any
  ) {
    this.lbp = lbp;
    this.B = B;
    this.T = T;
    this.H = H;
    this.cm = cmVal;
    this.cb = targetVol / (lbp * B * T);
    this.sideProfileData = sideProfileData;

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

    this.stations = customStations && customStations.length > 0
      ? customStations
      : Array.from({ length: 21 }).map((_, i) => i);
    this.spacing = lbp / 20.0;
    this.offsetTable = {};
  }

  getSheerZ(st: number): number {
    // 1. If sideProfileData from Step 3 has sheer curve, interpolate directly
    if (this.sideProfileData?.sheer && Array.isArray(this.sideProfileData.sheer) && this.sideProfileData.sheer.length >= 2) {
      const x = st * (this.lbp / 20.0);
      const pts = [...this.sideProfileData.sheer].sort((a: any, b: any) => a.x - b.x);
      if (x <= pts[0].x) return pts[0].y;
      if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i].x && x <= pts[i + 1].x) {
          const dx = pts[i + 1].x - pts[i].x;
          if (dx <= 0.0001) return pts[i].y;
          const t = (x - pts[i].x) / dx;
          return pts[i].y + t * (pts[i + 1].y - pts[i].y);
        }
      }
    }

    // 2. Standard naval architectural sheer parabola fallback
    if (st < 10) {
      const x = (10 - Math.min(10, st)) / 10.0;
      return this.H + (2.8 * (this.lbp / 3 + 10) / 1000) * (x * x);
    } else {
      const x = (Math.max(10, st) - 10) / 10.0;
      return this.H + (5.6 * (this.lbp / 3 + 10) / 1000) * (x * x);
    }
  }

  getKeelZ(st: number): number {
    // Parallel middle body & midship: keel is on baseline Z = 0
    if (st >= 3.0 && st <= 18.5) return 0.0;

    // Afterbody Run (st < 3.0): gentle, realistic naval architecture deadwood cut-up
    if (st < 3.0) {
      const ratio = Math.max(0, (3.0 - Math.max(0, st)) / 3.0);
      return Number((this.T * 0.10 * Math.pow(ratio, 1.6)).toFixed(3));
    }

    // Forebody entrance (st > 18.5): forefoot cut-up
    if (st > 18.5) {
      const ratio = Math.max(0, (st - 18.5) / 2.5);
      return Number((this.T * 0.06 * Math.pow(ratio, 1.5)).toFixed(3));
    }

    return 0.0;
  }

  getTransomKnuckle(st: number): { y: number; z: number } | null {
    // Transom knuckle applies strictly to aft perpendicular (st <= 0)
    if (st > 0) return null;
    const halfB = this.B / 2.0;
    const zKnuckle = this.T + (this.H - this.T) * 0.45;
    const yKnuckle = Number((halfB * 0.38).toFixed(3));
    return { y: yKnuckle, z: Number(zKnuckle.toFixed(3)) };
  }

  generateOffsets(waterlinesData?: Record<string, Record<number, number>>) {
    const halfB = this.B / 2.0;
    const flatB = Math.max(0, halfB - this.R);

    const WL_KEY_MAP: Record<string, string> = {
      "WL 6 (DWL)": "WL6",
      "WL 5": "WL5",
      "WL 4": "WL4",
      "WL 3": "WL3",
      "WL 2": "WL2",
      "WL 1": "WL1",
      "WL 0": "WL0"
    };

    // Smooth longitudinal waterline distribution profile
    const ANCHORS: [number, number][] = [
      [-2.0, 0.22],
      [-1.0, 0.28],
      [0.0, 0.35],
      [0.5, 0.48],
      [1.0, 0.60],
      [1.5, 0.70],
      [2.0, 0.79],
      [2.5, 0.85],
      [3.0, 0.90],
      [3.5, 0.935],
      [4.0, 0.968],
      [4.5, 0.985],
      [5.0, 0.995],
      [6.0, 1.0],
      [14.5, 1.0],
      [15.0, 0.98],
      [15.5, 0.93],
      [16.0, 0.86],
      [16.5, 0.76],
      [17.0, 0.64],
      [17.5, 0.50],
      [18.0, 0.35],
      [18.5, 0.22],
      [19.0, 0.11],
      [19.5, 0.04],
      [19.8, 0.015],
      [20.0, 0.0],
      [20.5, 0.0],
      [21.0, 0.0]
    ];

    const getLongitudinalRatio = (st: number): number => {
      if (st >= 6 && st <= 14.5) return 1.000;
      if (st <= ANCHORS[0][0]) return ANCHORS[0][1];
      if (st >= ANCHORS[ANCHORS.length - 1][0]) return 0.0;

      for (let i = 0; i < ANCHORS.length - 1; i++) {
        const [x0, y0] = ANCHORS[i];
        const [x1, y1] = ANCHORS[i + 1];
        if (st >= x0 && st <= x1) {
          const t = (st - x0) / (x1 - x0);
          return y0 + t * (y1 - y0);
        }
      }
      return 0.0;
    };

    for (const st of this.stations) {
      this.offsetTable[st] = {};
      const isPMB = st >= 6.0 && st <= 14.5;
      const isFore = st > 14.5;
      const isAft = st < 6.0;

      // 1. Station maximum half-breadth at DWL
      const topWlCfg = this.wlConfigs && this.wlConfigs.length > 0 ? this.wlConfigs[this.wlConfigs.length - 1] : null;
      const dwlKey = topWlCfg?.id || "WL6";

      let bDwl = halfB * getLongitudinalRatio(st);
      if (waterlinesData) {
        if (waterlinesData[dwlKey]?.[st] !== undefined && !isNaN(waterlinesData[dwlKey][st])) {
          bDwl = waterlinesData[dwlKey][st];
        } else if (waterlinesData["WL 6 (DWL)"]?.[st] !== undefined && !isNaN(waterlinesData["WL 6 (DWL)"][st])) {
          bDwl = waterlinesData["WL 6 (DWL)"][st];
        }
      }

      const localKeel = this.getKeelZ(st);

      // Deck breadth: must flare outwards from DWL (yDeck >= bDwl)
      let deckFlare = 1.0;
      if (st > 14.0) {
        const flareProg = (st - 14.0) / 6.0;
        deckFlare = 1.0 + 0.16 * Math.pow(flareProg, 1.3);
      } else if (st < 6.0) {
        const sternProg = (6.0 - Math.max(0, st)) / 6.0;
        deckFlare = 1.0 + 0.15 * Math.pow(sternProg, 1.2);
      }
      let yDeck = Math.min(halfB * 1.15, Math.max(bDwl * 1.02, bDwl * deckFlare));
      this.offsetTable[st]["DECK"] = Number(Math.max(0, yDeck).toFixed(3));

      for (let idx = 0; idx < this.waterlines.length; idx++) {
        const lbl = this.wlLabels[idx];
        const z = this.waterlines[idx];
        const cfg = this.wlConfigs[idx];
        const wlKey = cfg?.id || WL_KEY_MAP[lbl] || `WL${idx}`;

        if (lbl === "DECK" || z >= this.H - 0.001) continue;

        // 2. Base Waterline 0 (Keel level, Z = 0)
        if (idx === 0 || z === 0 || lbl === "WL 0") {
          if (isPMB) {
            this.offsetTable[st][lbl] = Number(flatB.toFixed(3));
          } else {
            this.offsetTable[st][lbl] = 0.000;
          }
          continue;
        }

        // Submerged below rising keel
        if (z <= localKeel + 0.02) {
          this.offsetTable[st][lbl] = 0.000;
          continue;
        }

        // 3. Intermediate Waterlines (Z > 0 up to DWL)
        let directWlVal: number | undefined = undefined;
        if (waterlinesData) {
          if (waterlinesData[wlKey]?.[st] !== undefined && !isNaN(waterlinesData[wlKey][st])) {
            directWlVal = waterlinesData[wlKey][st];
          } else if (waterlinesData[lbl]?.[st] !== undefined && !isNaN(waterlinesData[lbl][st])) {
            directWlVal = waterlinesData[lbl][st];
          } else if (cfg && waterlinesData[cfg.shortName]?.[st] !== undefined && !isNaN(waterlinesData[cfg.shortName][st])) {
            directWlVal = waterlinesData[cfg.shortName][st];
          }
        }

        if (directWlVal !== undefined) {
          this.offsetTable[st][lbl] = Number(Math.max(0, Math.min(halfB * 1.05, directWlVal)).toFixed(3));
        } else {
          if (isPMB) {
            // Parallel Middle Body: Flat of Side & Bilge Radius Turn
            if (this.R > 0 && z < this.R) {
              const delta = this.R - z;
              const term = this.R * this.R - delta * delta;
              const yBilge = flatB + (term > 0 ? Math.sqrt(term) : 0);
              this.offsetTable[st][lbl] = Number(Math.min(halfB, yBilge).toFixed(3));
            } else {
              this.offsetTable[st][lbl] = Number(halfB.toFixed(3));
            }
          } else if (isFore) {
            const effectiveSpan = Math.max(0.1, this.T - localKeel);
            const zRatio = Math.max(0, Math.min(1, (z - localKeel) / effectiveSpan));
            const pFore = 0.70 + 0.50 * ((st - 14.5) / 5.5);
            const yVal = bDwl * Math.pow(zRatio, pFore);
            this.offsetTable[st][lbl] = Number(Math.max(0, Math.min(halfB, yVal)).toFixed(3));
          } else {
            const effectiveSpan = Math.max(0.1, this.T - localKeel);
            const zRatio = Math.max(0, Math.min(1, (z - localKeel) / effectiveSpan));
            const pAft = 0.65 + 0.40 * ((6.0 - Math.max(0, st)) / 6.0);
            const yVal = bDwl * Math.pow(zRatio, pAft);
            this.offsetTable[st][lbl] = Number(Math.max(0, Math.min(halfB, yVal)).toFixed(3));
          }
        }
      }

      // 4. Strictly enforce frame vertical monotonicity (y(z) monotonically increases from keel to deck)
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
      if (this.offsetTable[st]["DECK"] < prevY) {
        this.offsetTable[st]["DECK"] = prevY;
      }
    }

    // 5. Cross-Station Nesting Enforcement: strictly ensures lines never cross in Body Plan
    // Keep user-entered ordinates authoritative. The nesting pass is only allowed to
    // fill/repair generated points; it must never silently rewrite an entered offset.
    const hasExplicitOffset = (st: number, lbl: string): boolean => {
      if (!waterlinesData) return false;
      const cfg = this.wlConfigs.find((item) => item.shortName === lbl || item.id === lbl);
      const keys = Array.from(new Set([lbl, cfg?.id, cfg?.shortName].filter(Boolean) as string[]));
      return keys.some((key) => {
        const value = waterlinesData[key]?.[st];
        return value !== undefined && !isNaN(Number(value));
      });
    };

    const sortedSt = [...this.stations].sort((a, b) => a - b);
    const aftStations = sortedSt.filter((st) => st >= 0 && st <= 10.0);
    const foreStations = sortedSt.filter((st) => st >= 10.0).reverse();

    // Afterbody: st_0 <= st_0.5 <= st_1.0 ... <= st_10.0
    for (let i = 1; i < aftStations.length; i++) {
      const prevSt = aftStations[i - 1];
      const curSt = aftStations[i];
      for (const lbl of [...this.wlLabels, "DECK"]) {
        if (hasExplicitOffset(curSt, lbl)) continue;
        const minVal = this.offsetTable[prevSt]?.[lbl] ?? 0;
        if (this.offsetTable[curSt]?.[lbl] !== undefined && this.offsetTable[curSt][lbl] < minVal) {
          this.offsetTable[curSt][lbl] = Number(minVal.toFixed(3));
        }
      }
    }

    // Forebody: st_20 <= st_19.5 <= st_19 ... <= st_10.0
    for (let i = 1; i < foreStations.length; i++) {
      const prevSt = foreStations[i - 1];
      const curSt = foreStations[i];
      for (const lbl of [...this.wlLabels, "DECK"]) {
        if (hasExplicitOffset(curSt, lbl)) continue;
        const minVal = this.offsetTable[prevSt]?.[lbl] ?? 0;
        if (this.offsetTable[curSt]?.[lbl] !== undefined && this.offsetTable[curSt][lbl] < minVal) {
          this.offsetTable[curSt][lbl] = Number(minVal.toFixed(3));
        }
      }
    }
  }

  getFramePoints(
    st: number,
    ox: number,
    oy: number,
    scaleX: number,
    scaleZ: number,
    isAfterbody: boolean
  ): { x: number; y: number; z: number; wlId?: string }[] {
    const sign = isAfterbody ? -1 : 1;
    const isMid = st === 10.0;
    const isPMB = st >= 6.0 && st <= 14.5;
    const halfB = this.B / 2.0;
    const flatB = isMid || isPMB ? Math.max(0, halfB - this.R) : 0;
    const offsets = this.offsetTable[st] || {};
    const localDeckZ = this.getSheerZ(st);
    const localKeelZ = this.getKeelZ(st);

    const framePts: { x: number; y: number; z: number; wlId?: string }[] = [];

    // Perpendiculars outside hull envelope
    if (st >= 20.5) {
      return [
        { x: ox, y: oy - localKeelZ * scaleZ, z: localKeelZ, wlId: "WL0" },
        { x: ox, y: oy - localDeckZ * scaleZ, z: localDeckZ, wlId: "DECK" }
      ];
    }

    // 1. Keel CL (ox, oy - localKeelZ * scaleZ)
    framePts.push({
      x: ox,
      y: oy - localKeelZ * scaleZ,
      z: localKeelZ,
      wlId: "KEEL"
    });

    // 2. PMB flat of bottom tangent point on baseline (only when keel is on baseline)
    if (flatB > 0.05 && localKeelZ <= 0.01) {
      framePts.push({
        x: ox + sign * (flatB * scaleX),
        y: oy,
        z: 0
      });
    }

    // 3. Waterline points from bottom to top above keelZ
    let prevY = flatB > 0.05 && localKeelZ <= 0.01 ? flatB : 0;
    for (let idx = 0; idx < this.waterlines.length; idx++) {
      const z = this.waterlines[idx];
      const lbl = this.wlLabels[idx];
      const cfg = this.wlConfigs[idx];
      if (lbl === "DECK" || z <= localKeelZ + 0.05) continue;

      let y = offsets[lbl] !== undefined ? offsets[lbl] : (cfg ? offsets[cfg.id] ?? 0 : 0);
      if (y < prevY) y = prevY;
      prevY = y;

      framePts.push({
        x: ox + sign * (y * scaleX),
        y: oy - z * scaleZ,
        z,
        wlId: cfg?.id || lbl
      });
    }

    // 4. Deck sheer point
    let yDeck = offsets["DECK"] !== undefined ? offsets["DECK"] : prevY * 1.05;
    if (yDeck < prevY) yDeck = prevY;

    framePts.push({
      x: ox + sign * (yDeck * scaleX),
      y: oy - localDeckZ * scaleZ,
      z: localDeckZ,
      wlId: "DECK"
    });

    return framePts;
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
