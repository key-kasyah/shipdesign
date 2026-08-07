import os
import re
import json
import urllib.request
from typing import Any, Dict, List, Tuple
from src.core.enums import RevisionStatus
from src.domain.stage1_requirements.models import ProjectData, ValidationResult

def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        if k and k not in os.environ:
                            os.environ[k] = v.strip().strip('"').strip("'")
        except Exception:
            pass

_load_env()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

class AISafetyException(Exception):
    """Exception jika pertanyaan melanggar batasan keselamatan AI."""
    pass


class AIAssistantService:
    """
    Service Layer untuk AI Requirements Assistant Tahap 1 & Tahap 2 (Sprint 1.6 & 2.0).
    Menjelaskan data proyek, validasi, rute, dan teori arsitektur kapal via OpenRouter LLM.
    """

    # Knowledge Base Sederhana untuk Penjelasan Parameter
    KNOWLEDGE_BASE = {
        "target_dwt_ton": {
            "name": "Target DWT (Deadweight Tonnage)",
            "unit": "ton",
            "description": "Deadweight Tonnage adalah berat total yang dapat diangkut oleh kapal secara aman, meliputi kargo, bahan bakar, air tawar, ballast, perbekalan, penumpang, dan awak kapal.",
            "importance": "Menentukan kapasitas angkut komersial kapal dan merupakan parameter utama dalam memperkirakan dimensi utama lambung pada Tahap 2.",
            "impact": "Mempengaruhi sarat maksimum (draft), panjang (LOA), lebar (Breadth), serta daya mesin yang dibutuhkan untuk mendorong kapal."
        },
        "service_speed_knots": {
            "name": "Kecepatan Dinas (Service Speed)",
            "unit": "knots (nautical miles per hour)",
            "description": "Kecepatan dinas adalah kecepatan operasional rata-rata kapal yang direncanakan pada kondisi muatan penuh dan laut normal.",
            "importance": "Menentukan waktu tempuh perjalanan antara pelabuhan asal dan tujuan.",
            "impact": "Mempengaruhi bentuk garis air lambung (Froude Number) serta kapasitas daya mesin utama yang terpasang."
        },
        "water_density_t_m3": {
            "name": "Densitas Air (Water Density)",
            "unit": "t/m³",
            "description": "Massa per satuan volume air di mana kapal beroperasi. Air laut standar bernilai 1.025 t/m³ sedangkan air tawar bernilai 1.000 t/m³.",
            "importance": "Menentukan gaya apung (buoyancy) kapal berdasarkan Hukum Archimedes.",
            "impact": "Mempengaruhi draft kapal ketika berpindah dari air asin ke air tawar (Fresh Water Allowance)."
        },
        "endurance_days": {
            "name": "Endurance (Daya Jelajah)",
            "unit": "hari",
            "description": "Waktu maksimum dalam hari di mana kapal dapat beroperasi secara mandiri tanpa perlu mengisi ulang bahan bakar, air tawar, atau perbekalan.",
            "importance": "Menentukan jangkauan operasional kapal untuk menyelesaikan rute tanpa singgah.",
            "impact": "Mempengaruhi volume tanki bahan bakar dan tanki air tawar yang harus disediakan di dalam lambung."
        }
    }

    @staticmethod
    def build_context(project_data: ProjectData, val_res: ValidationResult, stage2_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Menyusun context terstruktur untuk input AI di Stage 1 & Stage 2."""
        ctx = {
            "active_stage": "STAGE_2" if stage2_data else "STAGE_1",
            "project_data": {
                "project_id": project_data.project_id,
                "project_name": project_data.project_name,
                "vessel_type": project_data.vessel_type.value if hasattr(project_data.vessel_type, "value") else str(project_data.vessel_type),
                "target_dwt_ton": project_data.target_dwt_ton,
                "service_speed_knots": project_data.service_speed_knots,
                "endurance_days": project_data.endurance_days,
                "water_density_t_m3": project_data.water_density_t_m3,
                "water_type": project_data.water_type.value if hasattr(project_data.water_type, "value") else str(project_data.water_type),
                "route_name": getattr(project_data, "route_name", "-"),
                "route_distance_nm": getattr(project_data, "route_distance_nm", None),
                "is_complete": project_data.is_complete
            },
            "validation_result": {
                "is_valid": val_res.is_valid,
                "is_complete": val_res.is_complete,
                "issues": [
                    {
                        "code": i.code,
                        "field_path": i.field_path,
                        "severity": i.severity.value if hasattr(i.severity, "value") else str(i.severity),
                        "message": i.message,
                        "suggestion": i.suggestion
                    } for i in val_res.issues
                ]
            }
        }
        if stage2_data:
            ctx["stage2_data"] = stage2_data
        return ctx

    @staticmethod
    def safety_check(question: str) -> Tuple[bool, str]:
        """
        Memeriksa apakah pertanyaan melanggar batasan keselamatan AI & Anti-Jailbreak.
        Mengembalikan (is_safe, message).
        """
        q_lower = question.lower()

        # 1. Anti-Jailbreak & Prompt Injection Patterns
        jailbreak_patterns = [
            r"ignore\s+(all\s+)?(previous\s+)?instructions",
            r"ignore\s+(system\s+)?prompt",
            r"act\s+as\s+dan",
            r"do\s+anything\s+now",
            r"you\s+are\s+unrestricted",
            r"pretend\s+you\s+are",
            r"roleplay\s+as",
            r"forget\s+(your\s+)?system",
            r"tuliskan\s+puisi",
            r"buatkan\s+cerita",
            r"tulis\s+kode\s+python\s+untuk",
            r"bypass\s+validation",
            r"override\s+approval",
            r"jailbreak"
        ]

        for pattern in jailbreak_patterns:
            if re.search(pattern, q_lower):
                return False, (
                    "⚠️ Terdeteksi Percobaan Jailbreak / Prompt Injection!\n\n"
                    "Sebagai AI Assistant khusus platform SHIP V1, saya dilarang mengabaikan instruksi sistem, "
                    "melakukan roleplay di luar bidang perkapalan, atau menjalankan perintah yang tidak aman. "
                    "Silakan ajukan pertanyaan yang berkaitan dengan parameter teknis dan pra-rancangan kapal."
                )

        # 2. Strict Off-Topic Block (non-maritime / non-engineering tasks)
        off_topic_keywords = [
            "siapa presiden", "cuaca hari ini", "resep makanan", "saham", "crypto",
            "cerita fiksi", "game", "berita politik", "lagu"
        ]
        for kw in off_topic_keywords:
            if kw in q_lower:
                return False, (
                    "Maaf, pertanyaan Anda berada di luar domain arsitektur perkapalan dan platform SHIP V1. "
                    "Saya hanya diprogram untuk menjelaskan parameter kebutuhan kapal, analisis validasi, rute maritim, "
                    "dan perhitungan pra-rancangan kapal."
                )

        return True, ""

    @classmethod
    def call_openrouter_llm(cls, question: str, context: Dict[str, Any], mode: str) -> str:
        """Memanggil OpenRouter API (model LLM) untuk menghasilkan respon AI cerdas."""
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Ship Design AI Platform"
            }

            system_prompt = (
                "Anda adalah seorang Naval Architect & Marine Engineering Assistant berpengalaman untuk platform SHIP V1.\n"
                "Tugas utama Anda adalah memberikan penjelasan teknis perkapalan yang ringkas, terstruktur, rapi, dan langsung ke inti (to-the-point).\n\n"
                "ATURAN FORMAT BALASAN:\n"
                "1. JANGAN PERNAH membuat paragraf panjang yang menumpuk (dinding teks). Gunakan poin-poin (bullet points) atau penomoran.\n"
                "2. Jika pengguna memilih/bertanya tentang suatu Section, jelaskan dalam 3-4 poin ringkas:\n"
                "   - **Fungsi Utama**: Untuk apa section tersebut di tahap desain kapal.\n"
                "   - **Parameter Kunci**: Parameter teknis utama yang dihitung/diinput.\n"
                "   - **Dampak pada Desain**: Akibat dari parameter tersebut terhadap kapal.\n"
                "3. Gunakan bahasa Indonesia yang ramah, profesional, dan padat informasi.\n"
                "4. Cetak tebal (bold) untuk istilah teknis penting agar mudah dibaca."
            )

            user_content = (
                f"Mode Analisis: {mode}\n"
                f"Konteks Proyek: {json.dumps(context, indent=2)}\n\n"
                f"Pertanyaan / Perintah: {question}"
            )

            # Models fallback sequence
            models_to_try = [
                "google/gemini-2.5-flash-lite",
                "deepseek/deepseek-v4-flash",
                "openai/gpt-4o-mini"
            ]

            for model_name in models_to_try:
                try:
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content}
                        ],
                        "temperature": 0.2
                    }

                    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        if "choices" in res_data and len(res_data["choices"]) > 0:
                            return res_data["choices"][0]["message"]["content"]
                except Exception as err:
                    print(f"[OpenRouter Model {model_name} Error]: {err}")
                    continue

            return ""
        except Exception as e:
            print(f"[OpenRouter API Note]: Falling back to local KB due to: {e}")
            return ""

    @classmethod
    def answer_question(cls, question: str, context: Dict[str, Any], mode: str) -> str:
        """Menjawab pertanyaan pengguna berdasarkan OpenRouter API & fallback local KB."""
        # 1. Safety Check First
        is_safe, safety_msg = cls.safety_check(question)
        if not is_safe:
            raise AISafetyException(safety_msg)

        # 2. Try OpenRouter LLM Call
        llm_reply = cls.call_openrouter_llm(question, context, mode)
        if llm_reply:
            return llm_reply

        # 3. Fallback to Local KB Engine jika LLM tidak merespon
        proj = context.get("project_data", {})
        val = context.get("validation_result", {})
        stg2 = context.get("stage2_data", {})

        target_dwt = proj.get("target_dwt_ton", 5000.0)
        speed_knots = proj.get("service_speed_knots", 12.0)
        vessel_type = proj.get("vessel_type", "TANKER")
        water_type = proj.get("water_type", "SEAWATER")
        water_density = proj.get("water_density_t_m3", 1.025)
        route_str = proj.get("route_name") or "Jakarta (Tanjung Priok) - Makassar (Soekarno-Hatta) - Manokwari"
        route_nm = proj.get("route_distance_nm") or 1376.0

        # Calculations
        est_displ = round(target_dwt / 0.70, 0)
        est_hours = round(route_nm / max(speed_knots, 1.0), 1)
        est_days = round(est_hours / 24.0, 1)
        est_draft = round((est_displ / (100 * 16.2 * 0.76 * 1.025)) if stg2.get("draft_m") is None else stg2.get("draft_m", 6.0), 2)
        est_power = round(est_displ**0.666 * speed_knots**3 / 500, 0)

        q_lower = question.lower()
        if "dwt" in q_lower or "deadweight" in q_lower:
            return (
                f"**Fungsi Memasukkan Target DWT ({target_dwt:,.0f} Ton):**\n\n"
                f"1. **Kapasitas Muat Komersial:** DWT (Deadweight Tonnage) menentukan total bobot bersih muatan, bahan bakar, air tawar, dan perbekalan yang dapat diangkut kapal.\n"
                f"2. **Penentuan Dimensi Utama (Stage 2):** DWT menjadi parameter dasar untuk menghitung estimasi *Displacement* (±{est_displ:,.0f} ton), Panjang Kapal (LBP), Lebar (B), Sarat Air (Draft ±{est_draft} m), dan Tinggi Geladak (Depth).\n"
                f"3. **Estimasi Daya Mesin & Stabilitas:** DWT memengaruhi hambatan lambung dan kebutuhan daya mesin utama (±{est_power:,.0f} kW) agar kapal dapat berlayar pada kecepatan {speed_knots} knot."
            )

        return (
            f"**Analisis Ringkas Proyek ({proj.get('project_name', 'Kapal')}):**\n"
            f"- **Tipe Kapal:** {vessel_type}\n"
            f"- **Target DWT:** {target_dwt:,.0f} Ton\n"
            f"- **Kecepatan Dinas:** {speed_knots} Knot\n"
            f"- **Rute:** {route_str} ({route_nm} NM)\n\n"
            f"Sistem telah menyimpan data ini untuk perhitungan hidrostatik dan dimensi utama pada tahap selanjutnya."
        )
