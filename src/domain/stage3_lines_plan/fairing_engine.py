import math
import os
from typing import List, Dict, Tuple

class FairingEngine:
    def __init__(self, lbp: float, breadth: float, draft: float, depth: float, csa_ordinates: List[float]):
        self.lbp = lbp
        self.B = breadth
        self.T = draft
        self.H = depth
        self.csa_ordinates = csa_ordinates
        
        self.waterlines = [0.0, draft*0.2, draft*0.4, draft*0.6, draft*0.8, draft, depth]
        self.wl_labels = ["WL0", "WL1", "WL2", "WL3", "WL4", "WL5", "DECK"]
        self.stations = list(range(21))
        
        self.spacing = self.lbp / 20.0
        self.offset_table = {}
        self.buttock_table = {}
        
    def _get_sheer_z(self, st: int) -> float:
        """Calculate local deck height (sheer) at a given station."""
        if st < 10:
            x = (10 - st) / 10.0
            return self.H + (2.8 * (self.lbp/3 + 10) / 1000) * (x**2)
        else:
            x = (st - 10) / 10.0
            return self.H + (5.6 * (self.lbp/3 + 10) / 1000) * (x**2)

    def generate_offsets(self):
        """
        Generate exact half-breadths ensuring:
        1. Integral of section area == csa_ordinates[st]
        2. Monotonicity (no crossing waterlines)
        """
        mid_area = self.csa_ordinates[10] / 2.0  # Half area
        
        for st in self.stations:
            self.offset_table[st] = {}
            target_half_area = self.csa_ordinates[st] / 2.0
            
            if target_half_area < 0.001:
                for lbl in self.wl_labels:
                    self.offset_table[st][lbl] = 0.0
                continue
                
            b_local = (self.B / 2.0) * math.sqrt(target_half_area / mid_area) if mid_area > 0 else (self.B / 2.0)
            if b_local > self.B / 2.0:
                b_local = self.B / 2.0
                
            c_section = target_half_area / (b_local * self.T)
            c_section = max(0.01, min(0.999, c_section))
            n = (1.0 / c_section) - 1.0
            
            local_deck_z = self._get_sheer_z(st)
            
            for idx, wl in enumerate(self.waterlines):
                lbl = self.wl_labels[idx]
                z = wl
                
                if idx == len(self.waterlines) - 1:
                    z = local_deck_z
                    
                if z <= self.T:
                    y = b_local * math.pow(z / self.T, n)
                else:
                    flare_angle = 0.05
                    x_ratio = (st - 10) / 10.0
                    if x_ratio > 0.5:
                        flare_angle += (x_ratio - 0.5) * 0.5
                    elif x_ratio < -0.5:
                        flare_angle += abs(x_ratio + 0.5) * 0.3
                    
                    y = b_local + (z - self.T) * flare_angle * (self.B / 2.0)
                
                if z <= self.T:
                    y = min(y, self.B / 2.0)
                    
                self.offset_table[st][lbl] = y
                
    def export_autocad_script(self, filepath: str):
        """Generate AutoCAD Script (.SCR) for Lines Plan"""
        lines = []
        
        # Layer Setup
        lines.append("-LAYER M FRAME C 1  ")
        lines.append("-LAYER M WATERLINE C 5  ")
        lines.append("-LAYER M CENTERLINE C 1 L CENTER  ")
        lines.append("-LAYER M BUTTOCK C 3  ")
        lines.append("-LAYER M DIAGONAL C 6  ")
        lines.append("-LAYER M SAC C 2  ")
        
        # 1. BODY PLAN (Centered at 0,0)
        lines.append("-LAYER S FRAME ")
        for st in self.stations:
            pts = []
            for idx, lbl in enumerate(self.wl_labels):
                y = self.offset_table[st][lbl]
                z = self.waterlines[idx]
                if idx == len(self.wl_labels) - 1:
                    z = self._get_sheer_z(st)
                
                x_coord = y if st >= 10 else -y
                pts.append((x_coord, z))
                
            lines.append("SPLINE")
            for p in pts:
                lines.append(f"{p[0]},{p[1]}")
            lines.append("")
            lines.append("")
            lines.append("")
            
        lines.append("-LAYER S CENTERLINE ")
        lines.append(f"LINE 0,0 0,{self.H * 1.5} ")
        lines.append("")
        
        # 2. SHEER PLAN (Offset to X = 50)
        sheer_offset_x = 50
        lines.append("-LAYER S FRAME ")
        lines.append("SPLINE")
        for st in self.stations:
            x = sheer_offset_x + st * self.spacing
            z = self._get_sheer_z(st)
            lines.append(f"{x},{z}")
        lines.append("")
        lines.append("")
        lines.append("")
        lines.append(f"LINE {sheer_offset_x},0 {sheer_offset_x + 20*self.spacing},0 ")
        lines.append("")
        
        # 3. HALF BREADTH PLAN (Offset to X = 50, Y = -20)
        hb_offset_x = 50
        hb_offset_y = -20
        lines.append("-LAYER S WATERLINE ")
        for lbl in self.wl_labels:
            lines.append("SPLINE")
            for st in self.stations:
                x = hb_offset_x + st * self.spacing
                y = hb_offset_y - self.offset_table[st][lbl]
                lines.append(f"{x},{y}")
            lines.append("")
            lines.append("")
            lines.append("")
            
        lines.append("-LAYER S CENTERLINE ")
        lines.append(f"LINE {hb_offset_x},{hb_offset_y} {hb_offset_x + 20*self.spacing},{hb_offset_y} ")
        lines.append("")

        with open(filepath, "w") as f:
            f.write("\n".join(lines))
            
    def validate(self) -> dict:
        validation = {
            "stations_valid": True,
            "max_error_percent": 0.0,
            "errors": []
        }
        for st in self.stations:
            area = 0.0
            prev_z = 0.0
            prev_y = self.offset_table[st]["WL0"]
            for i in range(1, 6):
                z = self.waterlines[i]
                lbl = self.wl_labels[i]
                y = self.offset_table[st][lbl]
                area += (y + prev_y) * (z - prev_z) / 2.0
                prev_y = y
                prev_z = z
                
            full_area = area * 2.0
            target_area = self.csa_ordinates[st]
            
            if target_area > 0.1:
                error = abs(full_area - target_area) / target_area * 100
                if error > validation["max_error_percent"]:
                    validation["max_error_percent"] = error
                if error > 2.0:
                    validation["errors"].append(f"Station {st}: Error {error:.2f}%")
                    validation["stations_valid"] = False
                    
        return validation
