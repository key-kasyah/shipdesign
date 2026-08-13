export class FairingEngine {
  lbp: number;
  B: number;
  T: number;
  H: number;
  csaOrdinates: number[];
  waterlines: number[];
  wlLabels: string[];
  stations: number[];
  spacing: number;
  offsetTable: Record<number, Record<string, number>>;

  constructor(lbp: number, B: number, T: number, H: number, targetVol: number) {
    this.lbp = lbp;
    this.B = B;
    this.T = T;
    this.H = H;
    
    // Generate realistic Sectional Area Curve (SAC) with Parallel Middle Body
    // Ensures exact volume integration
    const Cb = targetVol / (lbp * B * T);
    const Cm = 0.98; // Standard merchant ship midship coefficient
    let Cp = Cb / Cm;
    if (Cp > 0.95) Cp = 0.95;
    if (Cp < 0.5) Cp = 0.5;

    // Empirical PMB (Parallel Middle Body) half-length
    let xp = 0;
    if (Cp > 0.6) {
      xp = Cp - 0.6; 
    }
    
    // Shape parameter to satisfy exact Cp
    const areaRatio = (Cp - xp) / (1.0 - xp);
    const n = areaRatio / (1.0 - areaRatio);
    
    const Am = targetVol / (Cp * lbp);
    
    this.csaOrdinates = Array.from({ length: 21 }).map((_, st) => {
      const x = Math.abs((st - 10) / 10.0);
      if (x <= xp) {
        return Am;
      } else {
        const u = (x - xp) / (1.0 - xp);
        return Math.max(0.001, Am * (1.0 - Math.pow(u, n)));
      }
    });

    this.waterlines = [0.0, T * 0.2, T * 0.4, T * 0.6, T * 0.8, T, H];
    this.wlLabels = ["WL0", "WL1", "WL2", "WL3", "WL4", "WL5", "DECK"];
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

  generateOffsets() {
    const midArea = this.csaOrdinates[10] / 2.0;
    
    for (const st of this.stations) {
      this.offsetTable[st] = {};
      const targetHalfArea = this.csaOrdinates[st] / 2.0;
      
      if (targetHalfArea < 0.001) {
        for (const lbl of this.wlLabels) {
          this.offsetTable[st][lbl] = 0.0;
        }
        continue;
      }
      
      let bLocal = (this.B / 2.0) * Math.sqrt(targetHalfArea / midArea);
      if (bLocal > this.B / 2.0) bLocal = this.B / 2.0;
      if (bLocal <= 0) bLocal = 0.01;
      
      let cSection = targetHalfArea / (bLocal * this.T);
      cSection = Math.max(0.01, Math.min(0.999, cSection));
      const n = (1.0 / cSection) - 1.0;
      
      const localDeckZ = this.getSheerZ(st);
      
      for (let idx = 0; idx < this.waterlines.length; idx++) {
        const lbl = this.wlLabels[idx];
        let z = this.waterlines[idx];
        if (idx === this.waterlines.length - 1) z = localDeckZ;
        
        let y = 0;
        if (z <= this.T) {
          y = bLocal * Math.pow(z / this.T, n);
        } else {
          let flareAngle = 0.05;
          const xRatio = (st - 10) / 10.0;
          if (xRatio > 0.5) flareAngle += (xRatio - 0.5) * 0.5;
          else if (xRatio < -0.5) flareAngle += Math.abs(xRatio + 0.5) * 0.3;
          y = bLocal + (z - this.T) * flareAngle * (this.B / 2.0);
        }
        
        if (z <= this.T) y = Math.min(y, this.B / 2.0);
        this.offsetTable[st][lbl] = Number(y.toFixed(3));
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
      const pts: {x: number, z: number}[] = [];
      for (let idx = 0; idx < this.wlLabels.length; idx++) {
        const lbl = this.wlLabels[idx];
        const y = this.offsetTable[st][lbl];
        const z = idx === this.wlLabels.length - 1 ? this.getSheerZ(st) : this.waterlines[idx];
        const xCoord = st >= 10 ? y : -y;
        pts.push({x: xCoord, z});
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
        const y = hbOffsetY - this.offsetTable[st][lbl];
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
