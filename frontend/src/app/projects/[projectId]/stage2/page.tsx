"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  History,
  Lock,
  Compass,
  Cpu,
  Save,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Send,
  Eye,
  FileDown,
  Info,
  Scale,
  Activity,
  Layers,
  ChevronRight,
  FolderOpen,
  Search,
  Filter
} from "lucide-react";
import { api } from "../../../../services/api";
import { SideProfileNurbsEditor } from "../../../../components/design/SideProfileNurbsEditor";

const COMPARABLE_SHIPS_DATABASE = [
  // --- GENERAL CARGO ---
  {
    ship_name: "KM Mandiri Utama (BKI Registered)",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 3910,
    loa_m: 96.5,
    lbp_m: 89.0,
    breadth_m: 15.6,
    draft_m: 5.6,
    depth_m: 7.8,
    service_speed_knots: 12.0,
    cb: 0.72,
    source_reference: "Database BKI 2024 / Domestik Indonesia"
  },
  {
    ship_name: "KM Logistik Nusantara 1",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 5000,
    loa_m: 104.0,
    lbp_m: 98.0,
    breadth_m: 16.5,
    draft_m: 6.0,
    depth_m: 8.2,
    service_speed_knots: 12.5,
    cb: 0.74,
    source_reference: "PT PELNI / Tol Laut"
  },
  {
    ship_name: "KM Bahari Ekspres",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 2500,
    loa_m: 82.0,
    lbp_m: 76.0,
    breadth_m: 13.8,
    draft_m: 4.8,
    depth_m: 6.8,
    service_speed_knots: 11.5,
    cb: 0.70,
    source_reference: "Register Kapal BKI 2023"
  },
  {
    ship_name: "KM Swadaya Perdana",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 1500,
    loa_m: 68.0,
    lbp_m: 62.0,
    breadth_m: 11.5,
    draft_m: 3.8,
    depth_m: 5.5,
    service_speed_knots: 10.5,
    cb: 0.68,
    source_reference: "Armadakita Shipping Register 2024"
  },
  {
    ship_name: "KM Sejahtera III",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 7500,
    loa_m: 118.0,
    lbp_m: 110.0,
    breadth_m: 17.8,
    draft_m: 6.8,
    depth_m: 9.2,
    service_speed_knots: 13.0,
    cb: 0.73,
    source_reference: "Line Pelayaran Nasional 2023"
  },
  {
    ship_name: "KM Nusantara Perintis 8",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 1200,
    loa_m: 62.5,
    lbp_m: 56.0,
    breadth_m: 10.8,
    draft_m: 3.2,
    depth_m: 4.8,
    service_speed_knots: 10.0,
    cb: 0.66,
    source_reference: "Kemenhub Perintis Register 2024"
  },
  {
    ship_name: "KM Borneo Niaga",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 10000,
    loa_m: 130.0,
    lbp_m: 122.0,
    breadth_m: 19.5,
    draft_m: 7.5,
    depth_m: 10.2,
    service_speed_knots: 13.5,
    cb: 0.75,
    source_reference: "BKI Cargo Ship Fleet 2024"
  },

  // --- TANKER ---
  {
    ship_name: "MT Cakra Nusantara",
    vessel_type: "TANKER",
    dwt_ton: 5000,
    loa_m: 104.0,
    lbp_m: 98.0,
    breadth_m: 16.2,
    draft_m: 6.0,
    depth_m: 8.0,
    service_speed_knots: 12.0,
    cb: 0.76,
    source_reference: "Register Tanker BKI 2024 / Pertamina Fleet"
  },
  {
    ship_name: "MT Pertamina Pride II",
    vessel_type: "TANKER",
    dwt_ton: 7500,
    loa_m: 120.0,
    lbp_m: 112.0,
    breadth_m: 19.0,
    draft_m: 6.8,
    depth_m: 9.5,
    service_speed_knots: 12.5,
    cb: 0.76,
    source_reference: "Pertamina International Shipping"
  },
  {
    ship_name: "MT Samudra Pasifik",
    vessel_type: "TANKER",
    dwt_ton: 3500,
    loa_m: 90.0,
    lbp_m: 84.0,
    breadth_m: 14.5,
    draft_m: 5.2,
    depth_m: 7.2,
    service_speed_knots: 11.5,
    cb: 0.75,
    source_reference: "Register Tanker BKI 2023"
  },
  {
    ship_name: "MT Tirta Kencana",
    vessel_type: "TANKER",
    dwt_ton: 2000,
    loa_m: 75.0,
    lbp_m: 69.0,
    breadth_m: 12.5,
    draft_m: 4.2,
    depth_m: 5.8,
    service_speed_knots: 11.0,
    cb: 0.74,
    source_reference: "Tanker Kabotase Indonesia 2024"
  },
  {
    ship_name: "MT Gas Kalimantan",
    vessel_type: "TANKER",
    dwt_ton: 12000,
    loa_m: 142.0,
    lbp_m: 134.0,
    breadth_m: 22.0,
    draft_m: 8.2,
    depth_m: 11.5,
    service_speed_knots: 14.0,
    cb: 0.75,
    source_reference: "LPG Carrier Fleet BKI 2023"
  },
  {
    ship_name: "MT Ocean Pioneer",
    vessel_type: "TANKER",
    dwt_ton: 17500,
    loa_m: 156.0,
    lbp_m: 146.0,
    breadth_m: 24.5,
    draft_m: 9.2,
    depth_m: 12.8,
    service_speed_knots: 14.5,
    cb: 0.77,
    source_reference: "International Tanker Register 2024"
  },

  // --- CONTAINER SHIP ---
  {
    ship_name: "KM Meratus Kalabahi",
    vessel_type: "CONTAINER",
    dwt_ton: 6500,
    loa_m: 115.0,
    lbp_m: 108.0,
    breadth_m: 18.2,
    draft_m: 6.5,
    depth_m: 9.0,
    service_speed_knots: 14.0,
    cb: 0.68,
    source_reference: "Meratus Line Database"
  },
  {
    ship_name: "KM Spil Citra",
    vessel_type: "CONTAINER",
    dwt_ton: 4200,
    loa_m: 98.0,
    lbp_m: 92.5,
    breadth_m: 15.8,
    draft_m: 5.8,
    depth_m: 8.0,
    service_speed_knots: 13.0,
    cb: 0.69,
    source_reference: "SPIL Line Fleet Register"
  },
  {
    ship_name: "KM Temas Express",
    vessel_type: "CONTAINER",
    dwt_ton: 9000,
    loa_m: 130.0,
    lbp_m: 122.0,
    breadth_m: 20.4,
    draft_m: 7.2,
    depth_m: 10.2,
    service_speed_knots: 15.0,
    cb: 0.67,
    source_reference: "Temas Line Database 2024"
  },
  {
    ship_name: "KM Tanto Horas",
    vessel_type: "CONTAINER",
    dwt_ton: 3000,
    loa_m: 88.0,
    lbp_m: 82.0,
    breadth_m: 14.2,
    draft_m: 5.0,
    depth_m: 7.0,
    service_speed_knots: 12.5,
    cb: 0.66,
    source_reference: "Tanto Intim Line 2023"
  },
  {
    ship_name: "KM Samudera Feeder 5",
    vessel_type: "CONTAINER",
    dwt_ton: 15000,
    loa_m: 152.0,
    lbp_m: 142.0,
    breadth_m: 24.0,
    draft_m: 8.8,
    depth_m: 12.5,
    service_speed_knots: 16.5,
    cb: 0.65,
    source_reference: "Samudera Indonesia Fleet 2024"
  },

  // --- BULK CARRIER ---
  {
    ship_name: "MV Nusantara Coal 2",
    vessel_type: "BULK_CARRIER",
    dwt_ton: 10000,
    loa_m: 132.0,
    lbp_m: 124.0,
    breadth_m: 20.5,
    draft_m: 7.5,
    depth_m: 10.5,
    service_speed_knots: 12.0,
    cb: 0.78,
    source_reference: "PT Bukit Asam Fleet Data"
  },
  {
    ship_name: "MV Transcoal Pacific 7",
    vessel_type: "BULK_CARRIER",
    dwt_ton: 15000,
    loa_m: 148.0,
    lbp_m: 139.0,
    breadth_m: 23.0,
    draft_m: 8.5,
    depth_m: 12.0,
    service_speed_knots: 12.5,
    cb: 0.80,
    source_reference: "Transcoal Pacific Register 2024"
  },
  {
    ship_name: "MV Barito Miner",
    vessel_type: "BULK_CARRIER",
    dwt_ton: 6000,
    loa_m: 110.0,
    lbp_m: 103.0,
    breadth_m: 17.5,
    draft_m: 6.2,
    depth_m: 8.8,
    service_speed_knots: 11.5,
    cb: 0.77,
    source_reference: "Kalimantan Bulk Transporter 2023"
  },
  {
    ship_name: "MV Celebes Enterprise",
    vessel_type: "BULK_CARRIER",
    dwt_ton: 22000,
    loa_m: 168.0,
    lbp_m: 158.0,
    breadth_m: 26.0,
    draft_m: 9.8,
    depth_m: 13.8,
    service_speed_knots: 13.0,
    cb: 0.81,
    source_reference: "Indobaruna Bulk Register 2024"
  },

  // --- FERRY & PASSENGER ---
  {
    ship_name: "KMP Dharma Rucitra VII",
    vessel_type: "FERRY",
    dwt_ton: 1800,
    loa_m: 85.0,
    lbp_m: 78.0,
    breadth_m: 15.0,
    draft_m: 3.8,
    depth_m: 5.2,
    service_speed_knots: 14.5,
    cb: 0.62,
    source_reference: "PT Dharma Lautan Utama Register 2024"
  },
  {
    ship_name: "KM Kelimutu (PELNI)",
    vessel_type: "PASSENGER_SHIP",
    dwt_ton: 2800,
    loa_m: 99.8,
    lbp_m: 92.0,
    breadth_m: 16.5,
    draft_m: 4.2,
    depth_m: 6.2,
    service_speed_knots: 15.0,
    cb: 0.60,
    source_reference: "Fleet Register PT PELNI 2023"
  },
  {
    ship_name: "KMP Portlink III",
    vessel_type: "FERRY",
    dwt_ton: 3200,
    loa_m: 108.0,
    lbp_m: 100.0,
    breadth_m: 18.0,
    draft_m: 4.5,
    depth_m: 6.5,
    service_speed_knots: 15.5,
    cb: 0.61,
    source_reference: "PT ASDP Indonesia Ferry 2024"
  },
  {
    ship_name: "KM Express Bahari 9B",
    vessel_type: "PASSENGER_SHIP",
    dwt_ton: 350,
    loa_m: 42.0,
    lbp_m: 38.0,
    breadth_m: 7.8,
    draft_m: 1.8,
    depth_m: 3.2,
    service_speed_knots: 22.0,
    cb: 0.52,
    source_reference: "Kapal Cepat Passenger Register 2024"
  },

  // --- TUGBOAT & WORKBOAT ---
  {
    ship_name: "TB Brama 10",
    vessel_type: "TUG_BOAT",
    dwt_ton: 450,
    loa_m: 29.0,
    lbp_m: 26.5,
    breadth_m: 8.6,
    draft_m: 3.5,
    depth_m: 4.2,
    service_speed_knots: 10.5,
    cb: 0.58,
    source_reference: "Marine Tug Register BKI 2024"
  },
  {
    ship_name: "TB Trans Power 08",
    vessel_type: "TUG_BOAT",
    dwt_ton: 600,
    loa_m: 34.0,
    lbp_m: 31.0,
    breadth_m: 9.8,
    draft_m: 4.0,
    depth_m: 4.8,
    service_speed_knots: 11.0,
    cb: 0.59,
    source_reference: "Batam Tug Services Register 2023"
  },
  {
    ship_name: "AHTS Pelican Challenger",
    vessel_type: "TUG_BOAT",
    dwt_ton: 1500,
    loa_m: 60.0,
    lbp_m: 54.0,
    breadth_m: 14.0,
    draft_m: 5.0,
    depth_m: 6.2,
    service_speed_knots: 12.5,
    cb: 0.64,
    source_reference: "Offshore Support Register BKI 2024"
  },

  // --- FISHING & PATROL ---
  {
    ship_name: "KM Mina Jaya 02",
    vessel_type: "FISHING_VESSEL",
    dwt_ton: 400,
    loa_m: 42.0,
    lbp_m: 38.0,
    breadth_m: 8.2,
    draft_m: 3.2,
    depth_m: 4.5,
    service_speed_knots: 11.0,
    cb: 0.58,
    source_reference: "Register Kapal Perikanan KKP 2024"
  },
  {
    ship_name: "KN Tanjung Datu 301",
    vessel_type: "PATROL_VESSEL",
    dwt_ton: 850,
    loa_m: 110.0,
    lbp_m: 102.0,
    breadth_m: 15.5,
    draft_m: 4.0,
    depth_m: 6.8,
    service_speed_knots: 20.0,
    cb: 0.56,
    source_reference: "Register Kapal Patroli Bakamla / KPLP 2024"
  }
];

const normalizeVesselCategory = (typeStr: string): string => {
  if (!typeStr) return "OTHER";
  const s = typeStr.toUpperCase();
  if (s.includes("CONTAINER")) return "CONTAINER";
  if (s.includes("TANKER") || s.includes("GAS") || s.includes("LPG") || s.includes("OIL")) return "TANKER";
  if (s.includes("BULK")) return "BULK_CARRIER";
  if (s.includes("FERRY") || s.includes("PASSENGER") || s.includes("RORO")) return "PASSENGER";
  if (s.includes("TUG") || s.includes("AHTS") || s.includes("TOW")) return "TUG_BOAT";
  if (s.includes("FISH")) return "FISHING_VESSEL";
  if (s.includes("CARGO")) return "GENERAL_CARGO";
  return s;
};

export default function Stage2PreliminaryDesign() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Active sub-tab in Stage 2
  const [activeTab, setActiveTab] = useState<
    "comparable" | "dimensions" | "weight" | "geometry" | "profile" | "ai"
  >("comparable");

  // Core Data States
  const [history2, setHistory2] = useState<any>(null);
  const [activeRevision, setActiveRevision] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States (for current active scenario snapshot)
  const [formData, setFormData] = useState<any>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [editorActor, setEditorActor] = useState("designer@ship.com");

  // Check if Stage 1 is validated, if not redirect back to Stage 1
  useEffect(() => {
    if (projectId) {
      const isStage1Val = localStorage.getItem(`stage1_validated_${projectId}`) === "true";
      if (!isStage1Val) {
        alert("Tahap 2 masih terkunci! Silakan klik 'Simpan & Validasi Draft' pada Tahap 1 terlebih dahulu.");
        router.push(`/projects/${projectId}`);
      }
    }
  }, [projectId, router]);
  const [editReason, setEditReason] = useState("Modifikasi parameter pra-rancangan");

  // Comparable Ship Input Form
  const [compForm, setCompForm] = useState({
    ship_name: "KM Mandiri Utama",
    vessel_type: "GENERAL_CARGO",
    dwt_ton: 4000,
    loa_m: 96.5,
    lbp_m: 89.0,
    breadth_m: 15.6,
    draft_m: 5.6,
    depth_m: 7.8,
    service_speed_knots: 12.0,
    cb: 0.72,
    source_reference: "Register BKI 2024"
  });

  // Workflow & State Locks
  const [hasAppliedScaling, setHasAppliedScaling] = useState(false);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);

  // AI Chat States
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string; blocked?: boolean }>>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Approval Form
  const [reviewerName, setReviewerName] = useState("lead@ship.com");
  const [reviewNote, setReviewNote] = useState("Desain seimbang, parameter berada di range empiris.");

  const [stage1Data, setStage1Data] = useState<any>(null);

  const loadStage2Data = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load Stage 1 details to know exact target vessel type and target DWT
      try {
        const hist1 = await api.getProject(projectId);
        const latestRev1 = hist1.revisions[hist1.revisions.length - 1];
        if (latestRev1) {
          setStage1Data(latestRev1.data_snapshot);
        }
      } catch (err) {
        console.error("Gagal memuat data Stage 1 untuk AI matching:", err);
      }

      const hist2 = await api.getStage2History(projectId);
      setHistory2(hist2);

      const latestRev = hist2.revisions[hist2.revisions.length - 1];
      setActiveRevision(latestRev);
      setFormData({ ...latestRev.data_snapshot });
      setUnsavedChanges(false);

      // Load validation
      const val = await api.validateStage2Scenario(projectId, latestRev.revision_id);
      setValidationResult(val);

      // Reset scaling applied flag by default on fresh page load to strictly enforce workflow
      setHasAppliedScaling(false);
    } catch (e: any) {
      setError(e.message || "Gagal memuat data Pra-Rancangan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadStage2Data();
    }
  }, [projectId]);

  // Handle updates to specific design parameters
  const handleParamChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
    setNeedsRecalculation(true);
  };

  // Handle specific weight items update
  const handleWeightChange = (index: number, field: string, value: number) => {
    const updatedWeights = [...formData.weight_items];
    updatedWeights[index] = { ...updatedWeights[index], [field]: value };
    handleParamChange("weight_items", updatedWeights);
  };

  // Handle specific capacity items update
  const handleCapacityChange = (index: number, field: string, value: number) => {
    const updatedCapacities = [...formData.capacity_items];
    updatedCapacities[index] = { ...updatedCapacities[index], [field]: value };
    handleParamChange("capacity_items", updatedCapacities);
  };

  // Apply scaling from Comparable Ship
  const handleApplyScaling = async () => {
    try {
      setLoading(true);
      const payload = {
        scenario_name: formData.scenario_name || "Skenario Hasil Skala",
        creator: editorActor,
        primary_comparable_ship: compForm
      };
      const updatedHist = await api.createStage2Scenario(projectId, payload);
      setHistory2(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      setFormData({ ...latest.data_snapshot });
      setUnsavedChanges(false);
      setNeedsRecalculation(false);
      setHasAppliedScaling(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`stage2_scaling_applied_${projectId}`, "true");
      }

      // Load validation
      const val = await api.validateStage2Scenario(projectId, latest.revision_id);
      setValidationResult(val);

      alert("Skala berhasil diterapkan! Modul Ukuran & Koefisien serta pra-rancangan lainnya kini TERBUKA.");
      setActiveTab("dimensions");
    } catch (e: any) {
      alert(`Gagal menerapkan skala: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Save changes to current scenario (triggers recalculation on backend)
  const handleSaveScenario = async () => {
    if (!activeRevision) return;
    try {
      setLoading(true);
      const payload = {
        scenario_name: formData.scenario_name,
        lbp_m: Number(formData.lbp_m),
        loa_m: Number(formData.loa_m),
        breadth_m: Number(formData.breadth_m),
        depth_m: Number(formData.depth_m),
        draft_m: Number(formData.draft_m),
        cb: Number(formData.cb),
        cm: Number(formData.cm),
        cw: Number(formData.cw),
        weight_items: formData.weight_items,
        capacity_items: formData.capacity_items,
        actor: editorActor,
        reason: editReason
      };
      
      const updatedHist = await api.updateStage2Scenario(projectId, activeRevision.revision_id, payload);
      setHistory2(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      setFormData({ ...latest.data_snapshot });
      setUnsavedChanges(false);
      setNeedsRecalculation(false);
      setHasAppliedScaling(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`stage2_scaling_applied_${projectId}`, "true");
      }

      const val = await api.validateStage2Scenario(projectId, latest.revision_id);
      setValidationResult(val);
      alert("Perubahan skenario berhasil disimpan & kalkulasi ulang otomatis selesai!");
    } catch (e: any) {
      alert(`Gagal menyimpan skenario: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Submit scenario for review
  const handleSubmitReview = async () => {
    if (!activeRevision) return;
    if (unsavedChanges) {
      alert("Simpan perubahan parameter terlebih dahulu sebelum mengajukan review.");
      return;
    }
    try {
      setLoading(true);
      const updatedHist = await api.submitStage2Scenario(projectId, activeRevision.revision_id, editorActor);
      setHistory2(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      alert("Skenario pra-rancangan berhasil diajukan untuk review baseline!");
    } catch (e: any) {
      alert(`Gagal mengajukan review: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Approve / Reject scenario review
  const handleReviewDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!activeRevision) return;
    try {
      setLoading(true);
      const payload = {
        reviewer: reviewerName,
        decision,
        note: reviewNote
      };
      const updatedHist = await api.reviewStage2Scenario(projectId, activeRevision.revision_id, payload);
      setHistory2(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      
      // Reload validation result
      const val = await api.validateStage2Scenario(projectId, latest.revision_id);
      setValidationResult(val);
      alert(`Status review berhasil diperbarui menjadi ${decision}!`);
    } catch (e: any) {
      alert(`Gagal memperbarui status review: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Send query to AI Assistant with Stage 2 Context
  const handleAskAI = async (customQuery?: string) => {
    const textToAsk = customQuery || aiQuestion;
    if (!textToAsk.trim() || !activeRevision) return;
    setAiChat((prev) => [...prev, { sender: "user", text: customQuery ? customQuery : textToAsk }]);
    if (!customQuery) setAiQuestion("");
    setAiLoading(true);

    try {
      const res = await api.askStage2AI(projectId, {
        question: textToAsk,
        mode: "SECTION_EXPLAINER",
        stage2_data: {
          lbp_m: designData.lbp_m,
          breadth_m: designData.breadth_m,
          draft_m: designData.draft_m,
          depth_m: designData.depth_m,
          cb: designData.cb,
          cm: designData.cm,
          cw: designData.cw,
          froude_number: designData.froude_number,
          displacement_ton: designData.displacement_ton,
          ehp_kw: designData.ehp_kw,
          bhp_kw: designData.bhp_kw,
          gm_m: designData.gm_m,
          weight_mismatch_percent: designData.weight_mismatch_percent
        }
      });
      setAiChat((prev) => [...prev, { sender: "ai", text: res.answer, blocked: res.safety_blocked }]);
    } catch (e: any) {
      setAiChat((prev) => [...prev, { sender: "ai", text: `Gagal mendapatkan respon AI: ${e.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Optimization States & Dynamic Calculation Engine (Ship Basic Design, Hal. 10)
  const [optimizationCount, setOptimizationCount] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasOptimized, setHasOptimized] = useState(false);
  const [optResultData, setOptResultData] = useState<any>(null);
  const [showNspReference, setShowNspReference] = useState(false);
  const [isNspModalOpen, setIsNspModalOpen] = useState(false);

  // Interactive Drag-to-Adjust Cb on Digital NSP Diagram
  const [interactiveCb, setInteractiveCb] = useState<number>(0.76);
  const [isDraggingNspLine, setIsDraggingNspLine] = useState(false);
  const [nspActiveStep, setNspActiveStep] = useState<number>(1);

  // ═══════════════════════════════════════════════════════════════════════
  //  NSP REFERENCE DATA — Digitized from published NSP Wageningen diagrams
  //  Source: "Principles of Naval Architecture" (SNAME), Rawson & Tupper
  //  Values = % of midship section area (Am) at each station
  // ═══════════════════════════════════════════════════════════════════════
  const NSP_REFERENCE_DATA: Record<string, Record<number, number>> = {
    "0.55": { 0:0, 1:15, 2:38, 3:61, 4:79, 5:90.5, 6:96.5, 7:99, 8:99.8, 9:100, 10:100, 11:100, 12:99.5, 13:97, 14:91, 15:80, 16:64, 17:44, 18:24, 19:8, 20:0 },
    "0.60": { 0:0, 1:22, 2:48, 3:70, 4:85, 5:93.5, 6:97.5, 7:99.5, 8:100, 9:100, 10:100, 11:100, 12:99.5, 13:97.5, 14:93, 15:84, 16:70, 17:52, 18:32, 19:13, 20:0 },
    "0.65": { 0:0, 1:30, 2:57, 3:77, 4:89.5, 5:95.5, 6:98.5, 7:99.8, 8:100, 9:100, 10:100, 11:100, 12:99.8, 13:98, 14:94.5, 15:87, 16:75, 17:58, 18:38, 19:17, 20:0 },
    "0.70": { 0:0, 1:38, 2:65, 3:83, 4:93, 5:97, 6:99, 7:100, 8:100, 9:100, 10:100, 11:100, 12:100, 13:98.5, 14:95.5, 15:89, 16:78, 17:63, 18:44, 19:22, 20:0 },
    "0.75": { 0:0, 1:45, 2:72, 3:88, 4:95.5, 5:98.5, 6:99.5, 7:100, 8:100, 9:100, 10:100, 11:100, 12:100, 13:99, 14:96.5, 15:91, 16:82, 17:68, 18:50, 19:27, 20:0 },
    "0.80": { 0:0, 1:52, 2:78, 3:92, 4:97, 5:99, 6:99.8, 7:100, 8:100, 9:100, 10:100, 11:100, 12:100, 13:99.5, 14:97.5, 15:93, 16:85, 17:73, 18:55, 19:32, 20:0 }
  };

  /** Interpolate NSP reference data for any Cb between 0.55 and 0.80 */
  const getNspReferenceOrdinate = (station: number, cb: number): number => {
    const cbClamped = Math.max(0.55, Math.min(0.80, cb));
    const cbKeys = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
    // Find bracketing Cb values
    let lower = 0.55, upper = 0.80;
    for (let k = 0; k < cbKeys.length - 1; k++) {
      if (cbClamped >= cbKeys[k] && cbClamped <= cbKeys[k + 1]) {
        lower = cbKeys[k]; upper = cbKeys[k + 1]; break;
      }
    }
    const lowerData = NSP_REFERENCE_DATA[lower.toFixed(2)];
    const upperData = NSP_REFERENCE_DATA[upper.toFixed(2)];
    if (!lowerData || !upperData) return 0;
    if (Math.abs(upper - lower) < 0.001) return lowerData[station] || 0;
    const t = (cbClamped - lower) / (upper - lower);
    return (lowerData[station] || 0) * (1 - t) + (upperData[station] || 0) * t;
  };

  /** Get station ordinate based on NSP Wageningen reference data */
  const getStationOrdinate = (station: number, cb: number): number => {
    return getNspReferenceOrdinate(station, cb);
  };

  useEffect(() => {
    if (formData?.cb) {
      setInteractiveCb(formData.cb);
    }
  }, [formData?.cb]);

  // Download AutoCAD SCR script for plotting CSA curve directly into AutoCAD
  const handleDownloadCsaScr = () => {
    if (!designData.geometry?.csa_ordinates) {
      alert("Data geometri CSA belum tersedia.");
      return;
    }
    const lbp = Number(designData.lbp_m) || 90;
    const spacing = lbp / 20;

    let scrContent = ";; Script AutoCAD Plot Lengkung CSA - SHIP V1 Platform\n";
    scrContent += ";; Proyek: " + projectId + "\n";
    scrContent += "PLINE\n";
    designData.geometry.csa_ordinates.forEach((val: number, idx: number) => {
      const x = (idx * spacing).toFixed(3);
      const y = val.toFixed(3);
      scrContent += `${x},${y}\n`;
    });
    scrContent += "\nZOOM E\n";

    const blob = new Blob([scrContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kurva_CSA_${projectId}_Station0_20.scr`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAutoBalanceWeight = () => {
    if (!formData.weight_items || formData.weight_items.length === 0) return;
    const targetDispl = Number(formData.displacement_ton) || 5882.04;
    const currentTotal = formData.weight_items.reduce((sum: number, w: any) => sum + (Number(w.weight_ton) || 0), 0);
    if (currentTotal <= 0 || targetDispl <= 0) return;

    const scaleFactor = targetDispl / currentTotal;
    const updatedWeights = formData.weight_items.map((w: any) => ({
      ...w,
      weight_ton: Number((Number(w.weight_ton) * scaleFactor).toFixed(2))
    }));

    const newTotal = updatedWeights.reduce((sum: number, w: any) => sum + w.weight_ton, 0);
    const newMismatch = Number((Math.abs(newTotal - targetDispl) / targetDispl * 100).toFixed(2));

    setFormData((prev: any) => ({
      ...prev,
      weight_items: updatedWeights,
      weight_mismatch_percent: newMismatch
    }));
    setUnsavedChanges(true);
    setNeedsRecalculation(true);
    alert(`⚡ Optimasi Keseimbangan Berat Selesai!\nTotal Berat disesuaikan dari ${currentTotal.toFixed(2)} Ton menjadi ${newTotal.toFixed(2)} Ton.\nMismatch Selisih kini ${newMismatch}% (≤ 0.2%).`);
  };

  const handleRunOptimization = (iterationsCount: number = 1) => {
    setIsOptimizing(true);
    try {
      // Start with current inputs entered previously by the user or from scaled comparable ship
      let currLbp = Number(formData.lbp_m) || compForm.lbp_m || 98.0;
      let currB = Number(formData.breadth_m) || compForm.breadth_m || 16.2;
      let currT = Number(formData.draft_m) || compForm.draft_m || 6.0;
      let currH = Number(formData.depth_m) || compForm.depth_m || 8.0;
      const vs = stage1Data?.service_speed_knots || formData.service_speed_knots || compForm.service_speed_knots || 12.0;
      const dwt = stage1Data?.target_dwt_ton || formData.target_dwt_ton || compForm.dwt_ton || 5000;
      const cmInput = Number(formData.cm) || 0.98;
      const cwInput = Number(formData.cw) || 0.78;

      let lastCb = 0.76;
      let lastCm = cmInput;
      let lastCw = cwInput;
      let lastCpv = 0.97;
      let lastCph = 0.78;
      let lastFb = 2.00;
      let lastLwl = 100.45;
      let lastFn = 0.20;
      let lastVolM3 = 7239.460;
      let lastDisplTon = 7420.45;
      let lastCbCalcRaw = "0.7804";

      // Target Displacement based on payload ratio (typical 67.38% DWT ratio for cargo/tanker)
      const targetDisplacement = dwt / 0.6738;

      // Run exactly iterationsCount iteration step(s) as requested by user (1x or 5x)
      for (let i = 0; i < iterationsCount; i++) {
        // 1. Formula Ship Basic Design (Hal. 10): Cb = 1.115 - ((0.276 * Vs) / (Lbp^0.5))
        const sqrtLbp = Math.sqrt(currLbp);
        const cbCalc = 1.115 - (0.276 * vs) / sqrtLbp;
        lastCbCalcRaw = cbCalc.toFixed(4);
        lastCb = Number(Math.max(0.50, Math.min(0.85, cbCalc)).toFixed(2));

        lastCm = cmInput;
        lastCw = cwInput;
        lastCpv = Number((lastCb / (lastCw > 0 ? lastCw : 1)).toFixed(2));
        lastCph = Number((lastCb / (lastCm > 0 ? lastCm : 1)).toFixed(2));
        lastFb = Number((currH - currT).toFixed(2));
        lastLwl = Number((currLbp * 1.025).toFixed(2));

        const speedMs = vs * 0.514444;
        lastFn = Number((speedMs / Math.sqrt(9.81 * lastLwl)).toFixed(2));

        // 2. Calculate Hydrostatic Molded Volume & Displacement
        lastVolM3 = Number((currLbp * currB * currT * lastCb).toFixed(3));
        lastDisplTon = Number((lastVolM3 * 1.025).toFixed(2));

        // 3. Iterative Scaling step toward Target Displacement
        if (lastDisplTon > 0 && targetDisplacement > 0) {
          const ratio = (targetDisplacement / lastDisplTon) ** (1.0 / 3.0);
          currLbp = Number((currLbp * ratio).toFixed(2));
          currB = Number((currB * ratio).toFixed(2));
          currT = Number((currT * ratio).toFixed(2));
          currH = Number((currH * ratio).toFixed(2));

          // Re-calculate after step adjustment
          const newSqrtLbp = Math.sqrt(currLbp);
          const newCbCalc = 1.115 - (0.276 * vs) / newSqrtLbp;
          lastCbCalcRaw = newCbCalc.toFixed(4);
          lastCb = Number(Math.max(0.50, Math.min(0.85, newCbCalc)).toFixed(2));
          lastCpv = Number((lastCb / (lastCw > 0 ? lastCw : 1)).toFixed(2));
          lastCph = Number((lastCb / (lastCm > 0 ? lastCm : 1)).toFixed(2));
          lastFb = Number((currH - currT).toFixed(2));
          lastLwl = Number((currLbp * 1.025).toFixed(2));
          lastFn = Number((speedMs / Math.sqrt(9.81 * lastLwl)).toFixed(2));
          lastVolM3 = Number((currLbp * currB * currT * lastCb).toFixed(3));
          lastDisplTon = Number((lastVolM3 * 1.025).toFixed(2));
        }
      }

      // Calculate the real mismatch between actual weight items and newly calculated displacement (do NOT auto-scale weight items)
      const currentWeights = formData.weight_items || [];
      const currentWeightTotal = currentWeights.reduce((sum: number, w: any) => sum + (Number(w.weight_ton) || 0), 0);
      const actualWeightMismatch = (lastDisplTon > 0 && currentWeightTotal > 0)
        ? Number((Math.abs(currentWeightTotal - lastDisplTon) / lastDisplTon * 100).toFixed(2))
        : Number(formData.weight_mismatch_percent || 0);

      const resultObj = {
        lbp: currLbp.toFixed(2).replace(".", ","),
        b: currB.toFixed(2).replace(".", ","),
        t: currT.toFixed(2).replace(".", ","),
        h: currH.toFixed(2).replace(".", ","),
        cb: lastCb.toFixed(2).replace(".", ","),
        cm: lastCm.toFixed(2).replace(".", ","),
        cw: lastCw.toFixed(2).replace(".", ","),
        cpv: lastCpv.toFixed(2).replace(".", ","),
        cph: lastCph.toFixed(2).replace(".", ","),
        fb: lastFb.toFixed(2).replace(".", ","),
        fn: lastFn.toFixed(2).replace(".", ","),
        displTon: lastDisplTon.toFixed(2).replace(".", ","),
        volM3: lastVolM3.toFixed(3).replace(".", ","),
        grt: dwt.toLocaleString("id-ID"),
        vs: vs,
        lwl: lastLwl.toFixed(2).replace(".", ","),
        cbCalcRaw: lastCbCalcRaw,
        sqrtLbp: Math.sqrt(currLbp).toFixed(4),
        weightMismatchPercent: actualWeightMismatch
      };

      const newIterationCount = optimizationCount + iterationsCount;
      setOptResultData(resultObj);
      setHasOptimized(true);
      setOptimizationCount(newIterationCount);

      // Update form data state with the calculated dimensions and real mismatch
      setFormData((prev: any) => ({
        ...prev,
        lbp_m: currLbp,
        breadth_m: currB,
        draft_m: currT,
        depth_m: currH,
        cb: lastCb,
        cm: lastCm,
        cw: lastCw,
        lwl_m: lastLwl,
        froude_number: lastFn,
        displacement_m3: lastVolM3,
        displacement_ton: lastDisplTon,
        weight_mismatch_percent: actualWeightMismatch
      }));

      setUnsavedChanges(true);
      alert(`⚡ Iterasi Optimasi Formulasi Selesai (Iterasi Ke-${newIterationCount})!\nHasil Perumusan: Cb = ${lastCb}, Lbp = ${currLbp}m, Displacement = ${lastDisplTon} Ton.\nSelisih Mismatch Berat & Apung: ${actualWeightMismatch}%.`);
    } catch (e: any) {
      alert(`Gagal optimasi: ${e.message || e}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Comparable Ship Filter & Search States
  const [shipSearch, setShipSearch] = useState("");
  const [shipTypeFilter, setShipTypeFilter] = useState("ALL");

  // Intelligent AI Ranking & Recommendation for Comparable Ships
  const targetDwt = stage1Data?.target_dwt_ton || formData.target_dwt_ton || 3910;
  const targetType = stage1Data?.vessel_type || formData.vessel_type || "GENERAL_CARGO";

  const rankedComparableShips = React.useMemo(() => {
    const targetCat = normalizeVesselCategory(targetType);

    return COMPARABLE_SHIPS_DATABASE.map((ship) => {
      const shipCat = normalizeVesselCategory(ship.vessel_type);
      const isSameType = shipCat === targetCat;
      const dwtDiff = Math.abs(ship.dwt_ton - targetDwt);
      const dwtDiffPct = dwtDiff / Math.max(targetDwt, 1);

      let score = 0;
      if (isSameType) {
        // Same vessel type gets 70 base points + up to 30 points based on DWT closeness
        score = 70 + Math.max(0, 30 * (1 - dwtDiffPct));
      } else {
        // Different vessel type gets max 40 points total
        score = Math.max(10, 40 * (1 - dwtDiffPct));
      }

      score = Math.min(100, Math.max(10, Math.round(score)));

      return {
        ...ship,
        matchScore: score,
        dwtDiff: dwtDiff,
        isExactMatch: isSameType && dwtDiff === 0
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [targetDwt, targetType]);

  const displayedComparableShips = React.useMemo(() => {
    return rankedComparableShips.filter((ship) => {
      const matchesSearch =
        shipSearch.trim() === "" ||
        ship.ship_name.toLowerCase().includes(shipSearch.toLowerCase()) ||
        (ship.source_reference && ship.source_reference.toLowerCase().includes(shipSearch.toLowerCase()));

      const normShipCat = normalizeVesselCategory(ship.vessel_type);
      const matchesType =
        shipTypeFilter === "ALL" || normShipCat === shipTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [rankedComparableShips, shipSearch, shipTypeFilter]);

  // Auto-select top recommended match automatically when stage1Data is loaded
  useEffect(() => {
    if (rankedComparableShips.length > 0) {
      const topMatch = rankedComparableShips[0];
      setCompForm({
        ship_name: topMatch.ship_name,
        vessel_type: topMatch.vessel_type,
        dwt_ton: topMatch.dwt_ton,
        loa_m: topMatch.loa_m,
        lbp_m: topMatch.lbp_m,
        breadth_m: topMatch.breadth_m,
        draft_m: topMatch.draft_m,
        depth_m: topMatch.depth_m,
        service_speed_knots: topMatch.service_speed_knots,
        cb: topMatch.cb,
        source_reference: topMatch.source_reference
      });
    }
  }, [rankedComparableShips]);

  if (loading && !history2) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin text-blue-500" size={36} />
          <p className="text-sm font-medium tracking-wide">Memuat modul Pra-Rancangan Kapal...</p>
        </div>
      </div>
    );
  }

  if (error && !history2) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-xl p-6 text-center space-y-4 shadow-xl">
          <AlertCircle size={44} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Terjadi Kendala Memuat Data</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={loadStage2Data}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm border border-slate-700"
          >
            <RefreshCw size={14} />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  const latestRevision = activeRevision;
  const designData = formData;
  const baselineActive = history2?.baselines?.find((b: any) => b.active);

  return (
    <div className="flex flex-col h-full bg-[#070B12] text-slate-100 overflow-hidden">
      {/* Header Panel */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Scale size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-bold text-base tracking-tight text-white">
                Tahap 2 — Pra-Rancangan Kapal
              </h1>
              <span className="text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-0.5 rounded-full">
                {projectId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Penyelarasan parameter hidrostatik, hambatan, berat, dan stabilitas empiris.</p>
          </div>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Workspace Form / Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800/80">
          {/* Sub Navigation Tabs */}
          <nav className="h-14 bg-slate-950/80 border-b border-slate-800/80 flex px-4 space-x-1.5 overflow-x-auto items-center shrink-0 no-scrollbar backdrop-blur-md">
            {[
              { id: "comparable", label: "Kapal Pembanding", icon: <Scale size={14} /> },
              { id: "dimensions", label: "Ukuran & Koefisien", icon: <Compass size={14} /> },
              { id: "weight", label: "Berat & Kapasitas", icon: <Layers size={14} /> },
              { id: "geometry", label: "Geometri CSA & Daya NSP", icon: <Activity size={14} /> },
              { id: "profile", label: "Tampak Samping & NURBS", icon: <Compass size={14} /> },
              { id: "ai", label: "AI Explainer", icon: <Cpu size={14} /> }
            ].map((tab) => {
              const isLocked = !hasAppliedScaling 
                ? tab.id !== "comparable" 
                : needsRecalculation 
                  ? (tab.id !== "comparable" && tab.id !== "dimensions")
                  : false;

              const lockReason = !hasAppliedScaling
                ? "Silakan klik 'Hitung & Terapkan Skala DWT' pada modul Kapal Pembanding terlebih dahulu untuk membuka tahap selanjutnya."
                : "Terdapat perubahan parameter! Silakan klik 'Hitung & Terapkan Skala DWT' atau 'Simpan Perubahan & Hitung' untuk melakukan kalkulasi ulang sebelum melanjutkan ke tahap ini.";

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isLocked) {
                      alert(lockReason);
                      return;
                    }
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold tracking-wide rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30 font-bold"
                      : isLocked
                      ? "border border-slate-800/40 text-slate-600 bg-slate-900/30 opacity-60 cursor-not-allowed"
                      : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {isLocked && <Lock size={12} className="text-amber-500/80 ml-1" />}
                </button>
              );
            })}
          </nav>

          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar bg-[#070B12]">
            {activeTab === "comparable" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* REFERENCE SHIP DATABASE CATALOG */}
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                        <FolderOpen size={16} />
                      </div>
                      <span>Katalog & Rekomendasi Kapal Pembanding AI ({COMPARABLE_SHIPS_DATABASE.length} Kapal)</span>
                    </h3>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-400 font-medium">Target Proyek:</span>
                      <span className="bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold px-3 py-1 rounded-full font-mono">
                        {targetType} • {targetDwt} Ton
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem AI menganalisis armada kapal terdaftar dan mengurutkan kapal pembanding berdasarkan <span className="text-cyan-300 font-semibold">kesesuaian tipe & DWT proyek</span>. Kapal dengan skor tertinggi direkomendasikan secara otomatis untuk akurasi scaling presisi tinggi.
                  </p>

                  {/* Search & Filter Controls */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Cari nama kapal atau referensi register..."
                        value={shipSearch}
                        onChange={(e) => setShipSearch(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all font-sans"
                      />
                    </div>

                    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
                      <Filter size={14} className="text-slate-500 shrink-0" />
                      {[
                        { id: "ALL", label: "Semua Tipe" },
                        { id: "GENERAL_CARGO", label: "General Cargo" },
                        { id: "TANKER", label: "Tanker" },
                        { id: "CONTAINER", label: "Container" },
                        { id: "BULK_CARRIER", label: "Bulk Carrier" },
                        { id: "PASSENGER", label: "Ferry / Pass" },
                        { id: "TUG_BOAT", label: "Tugboat" },
                        { id: "FISHING_VESSEL", label: "Perikanan/Patroli" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setShipTypeFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                            shipTypeFilter === f.id
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400/40 text-white font-bold shadow-md shadow-blue-600/20"
                              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                    <span>Menampilkan {displayedComparableShips.length} dari {COMPARABLE_SHIPS_DATABASE.length} kapal pembanding</span>
                  </div>

                  {displayedComparableShips.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2 backdrop-blur-md">
                      <AlertCircle size={28} className="mx-auto text-slate-500" />
                      <p className="text-xs text-slate-400">Tidak ada kapal pembanding yang cocok dengan kriteria pencarian.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedComparableShips.map((ship, idx) => {
                        const isSelected = compForm.ship_name === ship.ship_name;
                        const isTopRank = idx === 0 && shipSearch === "" && shipTypeFilter === "ALL";

                      return (
                        <div
                          key={idx}
                          className={`p-4 border rounded-2xl transition-all space-y-3.5 flex flex-col justify-between overflow-hidden shadow-lg ${
                            isSelected
                              ? "bg-blue-600/15 border-blue-500/80 ring-1 ring-blue-500/40 shadow-xl shadow-blue-600/10"
                              : isTopRank
                              ? "bg-slate-900/90 border-amber-500/50 hover:border-amber-400"
                              : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700/80"
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Recommendation / Match Badge Bar */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {ship.isExactMatch ? (
                                  <span className="inline-flex items-center space-x-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow font-mono">
                                    <span>🌟</span>
                                    <span>Perfek Match 100%</span>
                                  </span>
                                ) : isTopRank ? (
                                  <span className="inline-flex items-center space-x-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow font-mono">
                                    <span>⭐</span>
                                    <span>Rekomendasi ({ship.matchScore}%)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono px-2.5 py-1 rounded-md font-semibold">
                                    Match: {ship.matchScore}%
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] font-bold bg-slate-900/90 text-slate-300 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase shrink-0">
                                {ship.vessel_type}
                              </span>
                            </div>

                            {/* Ship Header */}
                            <div>
                              <h4 className="text-sm font-bold text-white leading-snug">{ship.ship_name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{ship.source_reference}</p>
                            </div>

                            {/* 2-Column Mini Stat Box */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Target DWT</span>
                                <span className="font-mono font-bold text-white text-xs mt-0.5 whitespace-nowrap">{ship.dwt_ton.toLocaleString()} Ton</span>
                              </div>
                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Panjang LBP</span>
                                <span className="font-mono font-bold text-white text-xs mt-0.5 whitespace-nowrap">{ship.lbp_m} m</span>
                              </div>
                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Lebar (B)</span>
                                <span className="font-mono font-bold text-white text-xs mt-0.5 whitespace-nowrap">{ship.breadth_m} m</span>
                              </div>
                              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Sarat Draft (T)</span>
                                <span className="font-mono font-bold text-white text-xs mt-0.5 whitespace-nowrap">{ship.draft_m} m</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCompForm({
                                ship_name: ship.ship_name,
                                vessel_type: ship.vessel_type,
                                dwt_ton: ship.dwt_ton,
                                loa_m: ship.loa_m,
                                lbp_m: ship.lbp_m,
                                breadth_m: ship.breadth_m,
                                draft_m: ship.draft_m,
                                depth_m: ship.depth_m,
                                service_speed_knots: ship.service_speed_knots,
                                cb: ship.cb,
                                source_reference: ship.source_reference
                              });
                              setNeedsRecalculation(true);

                              setTimeout(() => {
                                document.getElementById("scaling-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 50);
                            }}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center mt-2 active:scale-[0.98] ${
                              isSelected
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30"
                                : isTopRank
                                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            }`}
                          >
                            {isSelected ? "✓ Terpilih Sebagai Acuan Utama" : isTopRank ? "Gunakan Rekomendasi Ini" : "Pilih Kapal Ini"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

                <div id="scaling-form-section" className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-4 backdrop-blur-xl shadow-2xl">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <Scale size={18} />
                    </div>
                    <span>Spesifikasi Kapal Pembanding Acuan</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem akan menggunakan data kapal pembanding utama ini untuk memperkirakan ukuran utama lambung secara proporsional menggunakan formula scaling rasio DWT pangkat 1/3.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Nama Kapal Pembanding *</label>
                      <input
                        type="text"
                        value={compForm.ship_name}
                        onChange={(e) => setCompForm({ ...compForm, ship_name: e.target.value })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Target DWT (Ton) *</label>
                      <input
                        type="number"
                        value={compForm.dwt_ton}
                        onChange={(e) => setCompForm({ ...compForm, dwt_ton: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">LBP (m) *</label>
                      <input
                        type="number"
                        value={compForm.lbp_m}
                        onChange={(e) => setCompForm({ ...compForm, lbp_m: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Breadth (Lebar) (m) *</label>
                      <input
                        type="number"
                        value={compForm.breadth_m}
                        onChange={(e) => setCompForm({ ...compForm, breadth_m: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Draft (T) (m) *</label>
                      <input
                        type="number"
                        value={compForm.draft_m}
                        onChange={(e) => setCompForm({ ...compForm, draft_m: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Depth (Tinggi Lambung) (m) *</label>
                      <input
                        type="number"
                        value={compForm.depth_m}
                        onChange={(e) => setCompForm({ ...compForm, depth_m: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Block Coeff (Cb) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={compForm.cb}
                        onChange={(e) => setCompForm({ ...compForm, cb: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Kecepatan Dinas (Knots) *</label>
                      <input
                        type="number"
                        value={compForm.service_speed_knots}
                        onChange={(e) => setCompForm({ ...compForm, service_speed_knots: Number(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Sumber/Referensi *</label>
                      <input
                        type="text"
                        value={compForm.source_reference}
                        onChange={(e) => setCompForm({ ...compForm, source_reference: e.target.value })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleApplyScaling}
                      className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                      <Scale size={16} />
                      <span>Hitung & Terapkan Skala DWT</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dimensions" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* OPTIMIZATION ACTION CARD & SHIP BASIC DESIGN FORMULA */}
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                          <Activity size={18} />
                        </div>
                        <span>Optimasi Skenario Sesuai Buku "Ship Basic Design" (Hal. 10)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Perhitungan iteratif nilai koefisien kepenuhan Cb dan parameter hidrostatik berdasarkan rasio kecepatan Vs dan panjang Lbp.
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full font-bold font-mono">
                        Iterasi Ke-{optimizationCount}
                      </span>
                      <button
                        onClick={() => handleRunOptimization(1)}
                        disabled={isOptimizing}
                        className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-bold flex items-center space-x-2 text-xs shadow-lg shadow-blue-600/20 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isOptimizing ? "animate-spin" : ""} />
                        <span>⚡ Jalankan 1x Optimasi</span>
                      </button>
                      <button
                        onClick={() => handleRunOptimization(5)}
                        disabled={isOptimizing}
                        className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold flex items-center space-x-2 text-xs shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        <span>🚀 Jalankan 5x Iterasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Results Section: Empty state if not yet optimized, else display formula and optimization table */}
                  {!hasOptimized || !optResultData ? (
                    <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800/80 text-center space-y-3 shadow-inner backdrop-blur-md">
                      <Activity size={32} className="mx-auto text-blue-400/70 animate-pulse" />
                      <h4 className="text-sm font-bold text-white">Belum Ada Data Hasil Optimasi</h4>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Tabel <span className="text-white font-semibold">"Data Kapal Rancangan Setelah Optimasi"</span> belum dihitung. Silakan klik tombol <span className="text-cyan-400 font-bold">"⚡ Jalankan 1x Optimasi"</span> di atas untuk menghitung nilai Cb dan hidrostatik dari angka-angka ukuran utama yang dimasukkan.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Formula Reference Box (Image 2) */}
                      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-2 font-mono text-xs backdrop-blur-md shadow-inner">
                        <div className="text-cyan-400 font-bold text-xs flex items-center justify-between">
                          <span>Dalam buku "Ship Basic Design", hal.10 :</span>
                          <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Metode Alexander / Schneekluth</span>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 text-slate-200 text-sm overflow-x-auto space-y-1">
                          <div className="text-amber-300 font-bold">
                            1.8. Cb = 1,115 - ((0,276 x V<sub>(knot)</sub>) / (Lbp<sub>(m)</sub><sup>0,5</sup>))
                          </div>
                          <div className="text-slate-400 text-xs">
                            = 1,115 - ((0,276 x {optResultData.vs}) / ({optResultData.lbp}<sup>0,5</sup>)) = <span className="text-emerald-400 font-bold text-sm">{optResultData.cb}</span>
                          </div>
                        </div>
                      </div>

                      {/* Results Table (Image 1) */}
                      <div className="bg-slate-950/90 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
                        <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Data Kapal Rancangan Setelah Optimasi
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                            ✓ Terverifikasi Presisi
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono text-left border-collapse">
                            <tbody className="divide-y divide-slate-800/60">
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300 w-1/3">Lbp =</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-400 text-sm">{optResultData.lbp}</td>
                                <td className="py-2.5 px-4 text-slate-400">m</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">B =</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-400 text-sm">{optResultData.b}</td>
                                <td className="py-2.5 px-4 text-slate-400">m</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">T =</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-400 text-sm">{optResultData.t}</td>
                                <td className="py-2.5 px-4 text-slate-400">m</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">H =</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-400 text-sm">{optResultData.h}</td>
                                <td className="py-2.5 px-4 text-slate-400">m</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Cb =</td>
                                <td className="py-2.5 px-4 font-bold text-amber-400 text-sm">{optResultData.cb}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Koefisien Blok)</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Cm =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.cm}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Koefisien Midship)</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Cw =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.cw}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Koefisien Garis Air)</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Cpv =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.cpv}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Koefisien Prisma Vertikal)</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Cph =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.cph}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Koefisien Prisma Horizontal)</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Fb =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.fb}</td>
                                <td className="py-2.5 px-4 text-slate-400">m (Lambung Timbul)</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Fn =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.fn}</td>
                                <td className="py-2.5 px-4 text-slate-400">-(Froude Number)</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Displ. =</td>
                                <td className="py-2.5 px-4 font-bold text-cyan-400 text-sm">{optResultData.displTon}</td>
                                <td className="py-2.5 px-4 text-slate-400">Ton</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Vol. =</td>
                                <td className="py-2.5 px-4 font-bold text-cyan-400 text-sm">{optResultData.volM3}</td>
                                <td className="py-2.5 px-4 text-slate-400">m³</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">GRT =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.grt}</td>
                                <td className="py-2.5 px-4 text-slate-400">Ton</td>
                              </tr>
                              <tr className="bg-slate-900/30 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Vs =</td>
                                <td className="py-2.5 px-4 font-bold text-white text-sm">{optResultData.vs}</td>
                                <td className="py-2.5 px-4 text-slate-400">knot</td>
                              </tr>
                              <tr className="bg-slate-950/80 hover:bg-slate-850/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-300">Lwl =</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-400 text-sm">{optResultData.lwl}</td>
                                <td className="py-2.5 px-4 text-slate-400">m</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-2xl">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                        <Compass size={18} />
                      </div>
                      <span>Ukuran Utama Lambung & Koefisien (Editor Parameter Skenario)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Form editor parameter untuk melihat, memasukkan, atau mengubah dimensi utama lambung (LBP, B, T, H) dan koefisien bentuk (Cb, Cm, Cw) secara manual atau otomatis dari hasil scaling & optimasi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">LBP (Panjang) (m)</label>
                      <input
                        type="number"
                        value={designData.lbp_m || ""}
                        onChange={(e) => handleParamChange("lbp_m", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Breadth (Lebar B) (m)</label>
                      <input
                        type="number"
                        value={designData.breadth_m || ""}
                        onChange={(e) => handleParamChange("breadth_m", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Draft (Sarat Air T) (m)</label>
                      <input
                        type="number"
                        value={designData.draft_m || ""}
                        onChange={(e) => handleParamChange("draft_m", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Depth (Tinggi Lambung H) (m)</label>
                      <input
                        type="number"
                        value={designData.depth_m || ""}
                        onChange={(e) => handleParamChange("depth_m", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Cb (Block Coeff)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cb || ""}
                        onChange={(e) => handleParamChange("cb", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Cm (Midship Coeff)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cm || ""}
                        onChange={(e) => handleParamChange("cm", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Cw (Waterplane Coeff)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cw || ""}
                        onChange={(e) => handleParamChange("cw", Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:border-blue-500/80 text-white font-medium outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Froude Number (Fn)</label>
                      <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 font-mono font-bold select-none">
                        {designData.froude_number || "0.00"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Displacement (Ton)</label>
                      <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2.5 px-3.5 text-xs text-cyan-400 font-mono font-bold select-none">
                        {designData.displacement_ton || "0.00"}
                      </div>
                    </div>
                  </div>

                  {/* Dimension Ratios Status Bar */}
                  <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-4 backdrop-blur-md shadow-inner">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hasil Pemeriksaan Rasio Empiris</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Card 1: LBP / Breadth */}
                      {(() => {
                        const ratio = designData.lbp_m && designData.breadth_m ? designData.lbp_m / designData.breadth_m : 0;
                        const isValid = ratio >= 5.0 && ratio <= 8.5;
                        return (
                          <div className={`p-3.5 bg-slate-900/80 border ${isValid ? "border-emerald-500/30" : "border-amber-500/30"} rounded-xl text-center shadow-md relative`}>
                            <div className="text-[11px] text-slate-400 mb-1 font-medium">LBP / Breadth</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">Range: 5.0 - 8.5</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {isValid ? "✓ Sesuai Standar" : "⚠️ Perlu Penyesuaian"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 2: Breadth / Draft */}
                      {(() => {
                        const ratio = designData.breadth_m && designData.draft_m ? designData.breadth_m / designData.draft_m : 0;
                        const isValid = ratio >= 1.8 && ratio <= 3.2;
                        return (
                          <div className={`p-3.5 bg-slate-900/80 border ${isValid ? "border-emerald-500/30" : "border-amber-500/30"} rounded-xl text-center shadow-md relative`}>
                            <div className="text-[11px] text-slate-400 mb-1 font-medium">Breadth / Draft</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">Range: 1.8 - 3.2</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {isValid ? "✓ Sesuai Standar" : "⚠️ Perlu Penyesuaian"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 3: LBP / Depth */}
                      {(() => {
                        const ratio = designData.lbp_m && designData.depth_m ? designData.lbp_m / designData.depth_m : 0;
                        const isValid = ratio >= 9.0 && ratio <= 15.0;
                        return (
                          <div className={`p-3.5 bg-slate-900/80 border ${isValid ? "border-emerald-500/30" : "border-amber-500/30"} rounded-xl text-center shadow-md relative`}>
                            <div className="text-[11px] text-slate-400 mb-1 font-medium">LBP / Depth</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">Range: 9.0 - 15.0</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {isValid ? "✓ Sesuai Standar" : "⚠️ Perlu Penyesuaian"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 4: Freeboard (H - T) */}
                      {(() => {
                        const fb = designData.depth_m && designData.draft_m ? designData.depth_m - designData.draft_m : 0;
                        const minFb = designData.depth_m ? 0.10 * designData.depth_m : 0.5;
                        const isValid = fb >= minFb;
                        return (
                          <div className={`p-3.5 bg-slate-900/80 border ${isValid ? "border-emerald-500/30" : "border-amber-500/30"} rounded-xl text-center shadow-md relative`}>
                            <div className="text-[11px] text-slate-400 mb-1 font-medium">Freeboard (H - T)</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {fb ? fb.toFixed(2) : "-"} m
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">Min: &gt; 10% H</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
                              {isValid ? "✓ Sesuai Standar" : "⚠️ Perlu Penyesuaian"}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-2 gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        placeholder="Nama Editor (designer@ship.com)"
                        value={editorActor}
                        onChange={(e) => setEditorActor(e.target.value)}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white max-w-xs focus:border-blue-500/80 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Alasan Perubahan..."
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white max-w-sm focus:border-blue-500/80 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveScenario}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-semibold flex items-center justify-center space-x-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <Save size={16} />
                      <span>Simpan Perubahan & Hitung</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "weight" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* Weight Items Table */}
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-2xl">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <Layers size={18} />
                    </div>
                    <span>Distribusi Berat Ringan (LWT) & Berat Mati (DWT)</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/80">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800/80 uppercase text-[10px] tracking-wider">
                          <th className="p-4">Kelompok Berat</th>
                          <th className="p-4 text-center">Massa (Ton)</th>
                          <th className="p-4 text-center">LCG dari AP (m)</th>
                          <th className="p-4 text-center">VCG dari BL (m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {designData.weight_items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors font-medium">
                            <td className="p-4 font-semibold text-slate-100">{item.group_name}</td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                value={item.weight_ton}
                                onChange={(e) => handleWeightChange(idx, "weight_ton", Number(e.target.value))}
                                className="bg-slate-900/80 border border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-28 text-white font-mono text-xs focus:border-blue-500/80 outline-none"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                value={item.lcg_m}
                                onChange={(e) => handleWeightChange(idx, "lcg_m", Number(e.target.value))}
                                className="bg-slate-900/80 border border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-24 text-white font-mono text-xs focus:border-blue-500/80 outline-none"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                value={item.vcg_m}
                                onChange={(e) => handleWeightChange(idx, "vcg_m", Number(e.target.value))}
                                className="bg-slate-900/80 border border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-24 text-white font-mono text-xs focus:border-blue-500/80 outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Weight Displacement mismatch panel */}
                  <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 flex items-center justify-between backdrop-blur-md shadow-inner">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Status Keseimbangan Berat</h4>
                      <p className="text-xs text-slate-400">
                        Target Displacement: <span className="text-white font-bold font-mono">{designData.displacement_ton} Ton</span> | 
                        Total Berat: <span className="text-white font-bold font-mono">
                          {designData.weight_items?.reduce((sum: number, w: any) => sum + w.weight_ton, 0).toFixed(2)} Ton
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-0.5">Mismatch Selisih</div>
                        <div className={`text-xl font-mono font-black ${
                          (designData.weight_mismatch_percent || 0) <= 1.5
                            ? "text-emerald-400"
                            : (designData.weight_mismatch_percent || 0) <= 5.0
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}>
                          {designData.weight_mismatch_percent || "0.0"} %
                        </div>
                      </div>
                      
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        (designData.weight_mismatch_percent || 0) <= 1.5
                          ? "bg-emerald-500"
                          : (designData.weight_mismatch_percent || 0) <= 5.0
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 space-x-3">
                    <button
                      onClick={handleAutoBalanceWeight}
                      className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>⚡ Optimasi Keseimbangan Berat (Mismatch ≤ 0.2%)</span>
                    </button>
                    <button
                      onClick={handleSaveScenario}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <Save size={16} />
                      <span>Simpan Keseimbangan Berat</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "geometry" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* TOP SECTION: DIAGRAM LENGKUNG CSA (BERDASARKAN DIAGRAM NSP WAGENINGEN) */}
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                          <Layers size={18} />
                        </div>
                        <span>1. Diagram Lengkung CSA (Curve of Sectional Areas) & DWL</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Diagram CSA menggambarkan luasan potongan melintang gading kapal dari station 0 (AP) hingga station 20 (FP) yang dihitung berdasarkan distribusi persentase Diagram NSP (Nederlandsche Scheepsbouw Proefstation).
                      </p>
                    </div>

                    <button
                      onClick={() => setShowNspReference(!showNspReference)}
                      className="py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-blue-300 rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shrink-0 cursor-pointer shadow-inner"
                    >
                      <Eye size={15} />
                      <span>{showNspReference ? "Sembunyikan Referensi NSP" : "🔍 Lihat Diagram Acuan NSP Wageningen"}</span>
                    </button>
                  </div>

                  {/* NSP Wageningen Reference Diagram Interactive Box */}
                  {showNspReference && (
                    <div className="bg-[#030712] rounded-2xl p-6 space-y-6 shadow-2xl">
                      {/* Dynamic Digital NSP Wageningen Engine */}
                      {(() => {
                        const currentAm = (designData.breadth_m || 14) * (designData.draft_m || 5) * (designData.cm || 0.98);
                        const currentLbp = designData.lbp_m || 90;
                        const stationInterval = currentLbp / 20;

                        // 21 Station Data calculated dynamically from interactiveCb
                        const computedStationData = Array.from({ length: 21 }).map((_, i) => {
                          const pctAm = getStationOrdinate(i, interactiveCb);
                          const areaM2 = (pctAm / 100) * currentAm;
                          return { station: i, pctAm, areaM2 };
                        });

                        // Simpson's 1/3 Rule Integration: Multipliers 1, 4, 2, 4, ..., 1
                        const simpsonWeights = [1, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 2, 4, 1];
                        let simpsonSum = 0;
                        let momentSum = 0;

                        computedStationData.forEach((st, idx) => {
                          const w = simpsonWeights[idx];
                          simpsonSum += w * st.areaM2;
                          momentSum += w * st.areaM2 * (idx * stationInterval);
                        });

                        const simpsonVolumeM3 = (stationInterval / 3) * simpsonSum;
                        const simpsonDisplacementTon = simpsonVolumeM3 * 1.025;
                        const calculatedLcbM = simpsonVolumeM3 > 0 ? momentSum / simpsonSum : currentLbp / 2;
                        const lcbPctLbp = ((calculatedLcbM / currentLbp) - 0.5) * 100;
                        const calculatedCp = (designData.breadth_m && designData.draft_m && designData.cm)
                          ? simpsonVolumeM3 / (currentLbp * designData.breadth_m * designData.draft_m * designData.cm)
                          : interactiveCb / 0.98;

                        return (
                          <div className="space-y-6">
                            {/* Controls Header: Standard Reference Badge + Cb Input + Fullscreen Trigger */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                              {/* Reference Standards Badge */}
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center space-x-2">
                                  <span>📖</span>
                                  <span>Data Baku Nomogram NSP Wageningen (SNAME / PNA)</span>
                                </span>
                              </div>

                              {/* Direct Numerical Cb Input & Fullscreen Trigger */}
                              <div className="flex items-center space-x-3 shrink-0">
                                <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                                  <label className="text-slate-400 text-xs font-mono font-bold">Nilai Cb:</label>
                                  <input
                                    type="number"
                                    min="0.55"
                                    max="0.80"
                                    step="0.001"
                                    value={interactiveCb}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) {
                                        setInteractiveCb(Math.max(0.55, Math.min(0.80, val)));
                                      }
                                    }}
                                    className="w-20 bg-slate-950 border border-amber-500/50 text-amber-300 font-mono font-bold text-xs px-2 py-1 rounded text-center shadow-inner focus:outline-none focus:border-amber-400"
                                  />
                                  <button
                                    onClick={() => setInteractiveCb(designData.cb || 0.76)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono font-bold rounded cursor-pointer transition-all"
                                  >
                                    Atur Ulang Cb
                                  </button>
                                </div>

                                <button
                                  onClick={() => setIsNspModalOpen(true)}
                                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
                                >
                                  <Eye size={14} />
                                  <span className="hidden sm:inline">Presisi Tinggi Fullscreen</span>
                                </button>
                              </div>
                            </div>

                            {/* 1 & 2. Digital NSP Nomogram Canvas */}
                            <div className="space-y-4">
                              <div className="bg-[#02050e] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80 font-mono text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-cyan-400 font-bold uppercase tracking-wider">
                                      📐 1 & 2. Diagram NSP Interaktif (Wageningen)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Standard NSP Wageningen (21 Station: St. 0 AP s.d St. 20 FP)
                                  </div>
                                </div>

                                {/* High Precision Digitized Vector SVG Nomogram */}
                                <div className="w-full overflow-x-auto no-scrollbar py-2">
                                  <svg className="w-full min-w-[760px] h-auto" viewBox="0 0 1000 550" preserveAspectRatio="xMidYMid meet">
                                    {/* Blueprint Outer Frame */}
                                    <rect x="100" y="50" width="840" height="420" fill="#030712" stroke="#475569" strokeWidth="1.6" />
                                    
                                    {/* Centerline: Station 10 / 0% Line */}
                                    <line x1="520" y1="50" x2="520" y2="470" stroke="#64748b" strokeWidth="2" />
                                    <text x="520" y="42" fill="#94a3b8" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      Station 10 (0% Luas dari Garis Tengah)
                                    </text>

                                    {/* Top Subheaders for Stern & Bow */}
                                    <text x="310" y="30" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      &larr; Bagian Belakang (Buritan / Stern: Station 0 s.d 9)
                                    </text>
                                    <text x="730" y="30" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      Bagian Depan (Haluan / Bow: Station 11 s.d 20) &rarr;
                                    </text>

                                    {/* X-Grid & Ticks: Stern (Left, 100% to 0%) */}
                                    {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((val, idx) => {
                                      const x = 100 + idx * 42;
                                      return (
                                        <g key={`stern-grid-${idx}`}>
                                          <line x1={x} y1="50" x2={x} y2="470" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                          <line x1={x} y1="470" x2={x} y2="476" stroke="#64748b" strokeWidth="1" />
                                          <text x={x} y="492" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">{val}</text>
                                        </g>
                                      );
                                    })}

                                    {/* X-Grid & Ticks: Bow (Right, 0% to 100%) */}
                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val, idx) => {
                                      const x = 520 + idx * 42;
                                      return (
                                        <g key={`bow-grid-${idx}`}>
                                          <line x1={x} y1="50" x2={x} y2="470" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                          <line x1={x} y1="470" x2={x} y2="476" stroke="#64748b" strokeWidth="1" />
                                          <text x={x} y="492" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">{val}</text>
                                        </g>
                                      );
                                    })}

                                    {/* Sumbu X Main Label */}
                                    <text x="520" y="515" fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      Ordinat Luasan Gading / Station (% Am)
                                    </text>

                                    {/* Y-Grid & Ticks: Cb Values (0.55 to 0.80) */}
                                    {[0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal, i) => {
                                      const y = 470 - ((cbVal - 0.55) / 0.25) * 420;
                                      return (
                                        <g key={`y-grid-${i}`}>
                                          <line x1="100" y1={y} x2="940" y2={y} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                          <line x1="92" y1={y} x2="100" stroke="#64748b" strokeWidth="1" />
                                          <text x="86" y={y + 4} fill="#cbd5e1" fontSize="10.5" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                                            {cbVal.toFixed(2)}
                                          </text>
                                        </g>
                                      );
                                    })}

                                    {/* Sumbu Y Title (Rotated) */}
                                    <text x="-260" y="28" fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace" transform="rotate(-90)">
                                      Koefisien Blok (Cb)
                                    </text>

                                    {/* Station Curves 1..9 and 11..19 */}
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                      const isStern = stNum < 10;
                                      const pathPoints = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal) => {
                                        const ordPct = getStationOrdinate(stNum, cbVal) / 100;
                                        const yPixel = 470 - ((cbVal - 0.55) / 0.25) * 420;
                                        const xPixel = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);
                                        return `${xPixel.toFixed(1)},${yPixel.toFixed(1)}`;
                                      });

                                      return (
                                        <path
                                          key={`st-curve-${stNum}`}
                                          d={`M ${pathPoints.join(" L ")}`}
                                          fill="none"
                                          stroke="#64748b"
                                          strokeWidth="1.2"
                                        />
                                      );
                                    })}

                                    {/* Active Cb Red Laser Line & Yellow Intersections & Green Drop Lines */}
                                    {(() => {
                                      const activeCb = Math.max(0.55, Math.min(0.80, interactiveCb));
                                      const yBC = 470 - ((activeCb - 0.55) / 0.25) * 420;
                                      return (
                                        <g key="active-laser-bc">
                                          {/* Horizontal Red Laser Line for active Cb */}
                                          <line x1="90" y1={yBC} x2="950" y2={yBC} stroke="#ef4444" strokeWidth="2.2" />
                                          <rect x="42" y={yBC - 9} width="48" height="18" rx="4" fill="#ef4444" />
                                          <text x="66" y={yBC + 3.5} fill="#ffffff" fontSize="9.5" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                                            Cb {activeCb.toFixed(2)}
                                          </text>

                                          {/* Intersection Points & Vertical Green Projection Lines */}
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                            const isStern = stNum < 10;
                                            const ordPct = getStationOrdinate(stNum, activeCb) / 100;
                                            const xPoint = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);
                                            return (
                                              <g key={`laser-drop-${stNum}`}>
                                                {/* Green Vertical Projection Line to Sumbu X */}
                                                <line x1={xPoint} y1={yBC} x2={xPoint} y2="470" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,2" />
                                                {/* Yellow Active Intersection Point */}
                                                <circle cx={xPoint} cy={yBC} r="3.2" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                                              </g>
                                            );
                                          })}
                                        </g>
                                      );
                                    })()}
                                  </svg>
                                </div>
                              </div>

                              {/* Reading Guide / Step-by-Step Procedure */}
                              <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 font-mono text-xs space-y-2">
                                <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                                  <span>📖 Prosedur Pembacaan Nomogram NSP Wageningen:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-[11px] text-slate-400">
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                                    <span className="text-red-400 font-bold block mb-1">① Atur Nilai Cb</span>
                                    Garis merah horizontal bergeser sesuai Koefisien Blok kapal (sumbu Y).
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                                    <span className="text-amber-400 font-bold block mb-1">② Titik Potong</span>
                                    Garis merah memotong kurva tiap station (titik kuning intersep).
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                                    <span className="text-emerald-400 font-bold block mb-1">③ Proyeksi Vertikal</span>
                                    Garis hijau putus-putus diproyeksikan tegak lurus turun ke sumbu X.
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                                    <span className="text-cyan-400 font-bold block mb-1">④ Baca Ordinat (% Am)</span>
                                    Nilai persentase luasan gading (% Am) terbaca di skala sumbu X.
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60">
                                    <span className="text-purple-400 font-bold block mb-1">⑤ Integrasi CSA</span>
                                    Data 21 ordinat luasan (Luas = % Am x Am, Am = B x T x Cm) otomatis dihitung menjadi Kurva CSA & Simpson 1/3.
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* KARTU TEORI & DIAGRAM ILUSTRASI LUAS MIDSHIP (Am) */}
                            <div className="bg-slate-950/90 border border-slate-800/80 p-5 rounded-2xl space-y-4 font-mono">
                              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                                {/* Left Side: Explanation Text & Formula */}
                                <div className="space-y-3 flex-1 text-xs">
                                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                                    <span className="text-base text-amber-400">❖</span>
                                    <span>Luas Midship (Am)</span>
                                  </div>
                                  <p className="text-slate-300 leading-relaxed text-xs">
                                    Merupakan luasan bagian tengah kapal yang dipotong secara melintang yang memiliki lebar <strong className="text-cyan-300">B</strong> dan tinggi sarat <strong className="text-emerald-300">T</strong>. Dirumuskan dengan :
                                  </p>
                                  
                                  {/* Formula Box */}
                                  <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5 shadow-inner">
                                    <div className="text-amber-300 font-bold text-sm tracking-wide">
                                      Am = B x T x Cm
                                    </div>
                                    <div className="text-slate-400 text-xs">
                                      = {Number(designData.breadth_m || 0).toFixed(2)}m × {Number(designData.draft_m || 0).toFixed(3)}m × {Number(designData.cm || 0.98).toFixed(2)} = <span className="text-emerald-400 font-bold text-sm">{currentAm.toFixed(2)} m²</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                                    <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                                      <span className="text-slate-400 block text-[10px]">Lebar (B)</span>
                                      <span className="text-cyan-300 font-bold">{Number(designData.breadth_m || 0).toFixed(2)} m</span>
                                    </div>
                                    <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                                      <span className="text-slate-400 block text-[10px]">Sarat (T)</span>
                                      <span className="text-emerald-300 font-bold">{Number(designData.draft_m || 0).toFixed(3)} m</span>
                                    </div>
                                    <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                                      <span className="text-slate-400 block text-[10px]">Koefisien (Cm)</span>
                                      <span className="text-amber-300 font-bold">{Number(designData.cm || 0.98).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Technical Blueprint SVG Diagram */}
                                <div className="w-full lg:w-80 h-56 bg-[#02050e] rounded-xl border border-slate-800/90 p-3 flex items-center justify-center relative overflow-hidden shadow-inner shrink-0">
                                  <svg className="w-full h-full" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                      {/* Hatch Pattern for Shaded Area Am */}
                                      <pattern id="hatch-midship-am" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                        <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.45" />
                                      </pattern>
                                    </defs>

                                    {/* Centerline Line and Symbol */}
                                    <line x1="180" y1="15" x2="180" y2="195" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,3,2,3" />
                                    {/* CL symbol */}
                                    <text x="180" y="208" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">℄</text>

                                    {/* Upper Deck Outline with Camber */}
                                    <path d="M 60,55 Q 180,45 300,55" fill="none" stroke="#64748b" strokeWidth="1.5" />

                                    {/* Topsides Hull Outline above Waterline */}
                                    <line x1="60" y1="55" x2="60" y2="90" stroke="#64748b" strokeWidth="1.5" />
                                    <line x1="300" y1="55" x2="300" y2="90" stroke="#64748b" strokeWidth="1.5" />

                                    {/* Waterline (W - L) */}
                                    <line x1="35" y1="90" x2="325" y2="90" stroke="#38bdf8" strokeWidth="1.5" />
                                    <text x="45" y="83" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="serif">W</text>
                                    <text x="315" y="83" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="serif">L</text>

                                    {/* Submerged Hull Shaded Area Am (Cross Section below WL) */}
                                    <path
                                      d="M 60,90 L 60,150 Q 60,170 85,170 L 275,170 Q 300,170 300,150 L 300,90 Z"
                                      fill="url(#hatch-midship-am)"
                                      stroke="#38bdf8"
                                      strokeWidth="2"
                                    />

                                    {/* Center Am Text Badge */}
                                    <g>
                                      <rect x="155" y="118" width="50" height="22" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1" />
                                      <text x="180" y="133" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Am</text>
                                    </g>

                                    {/* Dimension T (Draft) on Right */}
                                    <line x1="300" y1="90" x2="335" y2="90" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="275" y1="170" x2="335" y2="170" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="330" y1="92" x2="330" y2="168" stroke="#34d399" strokeWidth="1.2" />
                                    {/* Dimension Arrows for T */}
                                    <polygon points="330,90 327,97 333,97" fill="#34d399" />
                                    <polygon points="330,170 327,163 333,163" fill="#34d399" />
                                    <text x="345" y="134" fill="#34d399" fontSize="12" fontWeight="bold" textAnchor="start" fontFamily="monospace">T</text>

                                    {/* Dimension B (Breadth) on Bottom */}
                                    <line x1="60" y1="170" x2="60" y2="195" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="300" y1="170" x2="300" y2="195" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="62" y1="190" x2="298" y2="190" stroke="#38bdf8" strokeWidth="1.2" />
                                    {/* Dimension Arrows for B */}
                                    <polygon points="60,190 67,187 67,193" fill="#38bdf8" />
                                    <polygon points="300,190 293,187 293,193" fill="#38bdf8" />
                                    <text x="180" y="185" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">B</text>
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {/* 3. HASIL PEMBACAAN NUMERIK ORDINAT STATION (0 S.D 20) */}
                            <div className="bg-slate-950/90 border border-slate-800/80 p-5 rounded-2xl space-y-4 font-mono text-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-cyan-400 font-bold uppercase tracking-wider">
                                <div className="flex items-center space-x-2">
                                  <span>📊 3. HASIL PEMBACAAN NUMERIK ORDINAT STATION (0 S.D 20)</span>
                                </div>
                                <span className="text-slate-400 text-[11px] font-mono">
                                  Luas Midship Am = <span className="text-white font-bold">{currentAm.toFixed(2)} m²</span> (Am = B x T x Cm = {Number(designData.breadth_m || 0).toFixed(2)}m x {Number(designData.draft_m || 0).toFixed(3)}m x {Number(designData.cm || 0.98).toFixed(2)})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                                {computedStationData.map((st) => (
                                  <div key={`st-card-${st.station}`} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-center space-y-1">
                                    <div className="text-[10px] text-slate-500 font-bold">St. {st.station}</div>
                                    <div className="font-bold text-cyan-400 text-xs">{st.pctAm.toFixed(1)}% Am</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{st.areaM2.toFixed(1)} m²</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 4 & 5. KURVA CSA REAL-TIME & HASIL INTEGRASI SIMPSON 1/3 */}
                            <div className="bg-slate-950/90 border border-slate-800/80 p-5 rounded-2xl space-y-5 font-mono">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                                    <span>📈 4 & 5. KURVA CSA REAL-TIME & HASIL INTEGRASI SIMPSON 1/3</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Kurva CSA dihitung dari 21 ordinat luasan station (Luas = % Am × Am) dengan Luas Midship <span className="text-white font-semibold">Am = B x T x Cm = {currentAm.toFixed(2)} m²</span>.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-amber-300 font-bold text-[11px] bg-slate-900 border border-amber-500/30 px-3 py-1 rounded-lg">
                                    Am = B x T x Cm = {currentAm.toFixed(2)} m²
                                  </span>
                                  <span className="text-cyan-400 font-bold text-[11px] bg-slate-900 border border-cyan-500/30 px-3 py-1 rounded-lg">
                                    Rule Integrasi: <span className="text-white">Simpson 1/3 (21 Station)</span>
                                  </span>
                                </div>
                              </div>

                              {/* Real-time CSA Curve Plot with Midship Am Indicator */}
                              <div className="w-full h-72 bg-[#02050e] rounded-xl border border-slate-800 p-4 relative overflow-hidden flex items-center justify-center">
                                <svg className="w-full h-full" viewBox="0 0 1000 280" preserveAspectRatio="none">
                                  {computedStationData.map((_, idx) => {
                                    const x = 50 + (idx / 20) * 900;
                                    return <line key={`csa-grid-v-${idx}`} x1={x} y1="20" x2={x} y2="230" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />;
                                  })}
                                  <line x1="50" y1="230" x2="950" y2="230" stroke="#475569" strokeWidth="1.5" />
                                  <path
                                    d={`M 50,230 ${computedStationData.map((st, idx) => {
                                      const x = 50 + (idx / 20) * 900;
                                      const y = 230 - (st.pctAm / 100) * 190;
                                      return `L ${x},${y}`;
                                    }).join(" ")} L 950,230 Z`}
                                    fill="rgba(56, 189, 248, 0.12)"
                                    stroke="#38bdf8"
                                    strokeWidth="2.5"
                                  />
                                  {/* Apex Midship Label at Station 10 */}
                                  <g key="csa-midship-tag">
                                    <line x1="500" y1="22" x2="500" y2="38" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />
                                    <rect x="390" y="8" width="220" height="20" rx="5" fill="#090d16" stroke="#f59e0b" strokeWidth="0.8" />
                                    <text x="500" y="22" fill="#fde047" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      St. 10 Midship: Am = {currentAm.toFixed(2)} m² (100%)
                                    </text>
                                  </g>
                                  {computedStationData.map((st, idx) => {
                                    const x = 50 + (idx / 20) * 900;
                                    const y = 230 - (st.pctAm / 100) * 190;
                                    return (
                                      <g key={`csa-node-${idx}`}>
                                        <title>{`Station ${idx}: ${st.pctAm.toFixed(1)}% Am | Luas = ${st.areaM2.toFixed(2)} m² (Am = B x T x Cm = ${currentAm.toFixed(2)} m²)`}</title>
                                        <circle cx={x} cy={y} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                                        <text x={x} y="252" fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="monospace">{idx}</text>
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>

                              {/* 4 Hydrostatic Result Cards */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">VOLUME DISPLACEMENT (V)</div>
                                  <div className="text-xl font-black text-cyan-400">{simpsonVolumeM3.toFixed(2)} m³</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Volume = (h / 3) * Jumlah(Faktor * Luas)</div>
                                  <div className="text-[9px] text-slate-500 font-mono">h = {stationInterval.toFixed(2)}m | Am = {currentAm.toFixed(2)} m²</div>
                                </div>
                                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">TONASE DISPLACEMENT (Δ)</div>
                                  <div className="text-xl font-black text-emerald-400">{simpsonDisplacementTon.toFixed(2)} Ton</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Displacement = Volume * 1.025</div>
                                  <div className="text-[9px] text-slate-500 font-mono">Massa Jenis Air Laut = 1.025 ton/m³</div>
                                </div>
                                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">KOEFISIEN PRISMA (CP)</div>
                                  <div className="text-xl font-black text-amber-400">{calculatedCp.toFixed(3)}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Cp = Volume / (Lbp * Am)</div>
                                  <div className="text-[9px] text-slate-500 font-mono">Am = B x T x Cm ({currentAm.toFixed(2)} m²)</div>
                                </div>
                                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">TITIK BERAT LCB (DARI AP)</div>
                                  <div className="text-xl font-black text-white">{calculatedLcbM.toFixed(2)} m</div>
                                  <div className="text-[10px] text-slate-400 font-mono">LCB = Total_Momen / Total_Luas</div>
                                  <div className="text-[9px] text-slate-500 font-mono">({lcbPctLbp >= 0 ? `+${lcbPctLbp.toFixed(2)}%` : `${lcbPctLbp.toFixed(2)}%`} dari Midship)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {isNspModalOpen && (
                        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
                          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl relative">
                            {/* Modal Header */}
                            <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider">
                                  📐 Diagram Digital NSP Wageningen (Nederlandsche Scheepsbouw Proefstation)
                                </span>
                                <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded">
                                  Cb Proyek = {designData.cb || 0.76}
                                </span>
                              </div>
                              <button
                                onClick={() => setIsNspModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-xs font-bold cursor-pointer"
                              >
                                ✕ Tutup Visualizer
                              </button>
                            </div>

                            {/* Modal Content - High-Res Interactive Digital Vector SVG Diagram */}
                            <div className="flex-1 overflow-auto p-4 bg-[#02050e] flex flex-col items-center justify-start space-y-4 no-scrollbar">
                              <div className="w-full max-w-5xl">
                                <svg className="w-full h-auto" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
                                  {/* Blueprint Outer Frame */}
                                  <rect x="100" y="60" width="840" height="460" fill="#030712" stroke="#475569" strokeWidth="1.8" />
                                  
                                  {/* Centerline: Station 10 / 0% Line */}
                                  <line x1="520" y1="60" x2="520" y2="520" stroke="#64748b" strokeWidth="2" />
                                  <text x="520" y="52" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                    Station 10 (0% Luas dari Garis Tengah)
                                  </text>

                                  {/* Top Subheaders for Stern & Bow */}
                                  <text x="310" y="38" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                    &larr; Bagian Belakang (Buritan / Stern: Station 0 s.d 9)
                                  </text>
                                  <text x="730" y="38" fill="#94a3b8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                    Bagian Depan (Haluan / Bow: Station 11 s.d 20) &rarr;
                                  </text>

                                  {/* X-Grid & Ticks: Stern (Left, 100% to 0%) */}
                                  {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((val, idx) => {
                                    const x = 100 + idx * 42;
                                    return (
                                      <g key={`modal-stern-grid-${idx}`}>
                                        <line x1={x} y1="60" x2={x} y2="520" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                        <line x1={x} y1="520" x2={x} y2="526" stroke="#64748b" strokeWidth="1" />
                                        <text x={x} y="542" fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontFamily="monospace">{val}</text>
                                      </g>
                                    );
                                  })}

                                  {/* X-Grid & Ticks: Bow (Right, 0% to 100%) */}
                                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val, idx) => {
                                    const x = 520 + idx * 42;
                                    return (
                                      <g key={`modal-bow-grid-${idx}`}>
                                        <line x1={x} y1="60" x2={x} y2="520" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                        <line x1={x} y1="520" x2={x} y2="526" stroke="#64748b" strokeWidth="1" />
                                        <text x={x} y="542" fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontFamily="monospace">{val}</text>
                                      </g>
                                    );
                                  })}

                                  {/* Sumbu X Main Label */}
                                  <text x="520" y="565" fill="#cbd5e1" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                    Ordinat Luasan Gading / Station (% Am)
                                  </text>

                                  {/* Y-Grid & Ticks: Cb Values (0.55 to 0.80) */}
                                  {[0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal, i) => {
                                    const y = 520 - ((cbVal - 0.55) / 0.25) * 460;
                                    return (
                                      <g key={`modal-y-grid-${i}`}>
                                        <line x1="100" y1={y} x2="940" y2={y} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25" strokeDasharray="2,3" />
                                        <line x1="92" y1={y} x2="100" stroke="#64748b" strokeWidth="1" />
                                        <text x="86" y={y + 4} fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                                          {cbVal.toFixed(2)}
                                        </text>
                                      </g>
                                    );
                                  })}

                                  {/* Sumbu Y Title (Rotated) */}
                                  <text x="-290" y="24" fill="#cbd5e1" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace" transform="rotate(-90)">
                                    Koefisien Blok (Cb)
                                  </text>

                                  {/* Station Curves 1..9 and 11..19 */}
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                    const isStern = stNum < 10;
                                    const pathPoints = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal) => {
                                      const ordPct = getStationOrdinate(stNum, cbVal) / 100;
                                      const yPixel = 520 - ((cbVal - 0.55) / 0.25) * 460;
                                      const xPixel = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);
                                      return `${xPixel.toFixed(1)},${yPixel.toFixed(1)}`;
                                    });

                                    return (
                                      <path
                                        key={`modal-st-path-${stNum}`}
                                        d={`M ${pathPoints.join(" L ")}`}
                                        fill="none"
                                        stroke="#64748b"
                                        strokeWidth="1.4"
                                      />
                                    );
                                  })}

                                  {/* Active Cb Red Laser Line & Yellow Intersections & Green Drop Lines */}
                                  {(() => {
                                    const activeCb = Math.max(0.55, Math.min(0.80, Number(designData.cb) || 0.76));
                                    const yBC = 520 - ((activeCb - 0.55) / 0.25) * 460;

                                    return (
                                      <g key="modal-bc-laser">
                                        <line x1="90" y1={yBC} x2="950" y2={yBC} stroke="#ef4444" strokeWidth="2.5" />
                                        <rect x="36" y={yBC - 10} width="56" height="20" rx="4" fill="#ef4444" />
                                        <text x="64" y={yBC + 4} fill="#ffffff" fontSize="10.5" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                                          Cb {activeCb.toFixed(3)}
                                        </text>

                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                          const isStern = stNum < 10;
                                          const ordPct = getStationOrdinate(stNum, activeCb) / 100;
                                          const xPoint = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);

                                          return (
                                            <g key={`modal-drop-${stNum}`}>
                                              <line x1={xPoint} y1={yBC} x2={xPoint} y2="520" stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3,2" />
                                              <circle cx={xPoint} cy={yBC} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
                                            </g>
                                          );
                                        })}
                                      </g>
                                    );
                                  })()}

                                  {/* Optional Auxiliary Reference Lines */}
                                  {(() => {
                                    const activeCm = Number(designData.cm) || 0.98;
                                    const yGC = 520 - Math.min(1.0, Math.max(0.0, (activeCm - 0.95) / 0.04)) * 460;

                                    return (
                                      <g key="modal-gc-laser">
                                        <line x1="95" y1={yGC} x2="940" y2={yGC} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,3" strokeOpacity="0.7" />
                                        <text x="75" y={yGC + 4} fill="#3b82f6" fontSize="11" fontWeight="bold" fontFamily="monospace">GC</text>
                                      </g>
                                    );
                                  })()}

                                  {(() => {
                                    const activeFn = Number(designData.froude_number) || 0.20;
                                    const yCN = 520 - Math.min(1.0, activeFn / 0.35) * 420;

                                    return (
                                      <g key="modal-cn-laser">
                                        <line x1="95" y1={yCN} x2="940" y2={yCN} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,4" strokeOpacity="0.7" />
                                        <text x="75" y={yCN + 4} fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily="monospace">CN</text>
                                      </g>
                                    );
                                  })()}
                                </svg>
                              </div>

                              {/* Reading Guide inside modal */}
                              <div className="w-full max-w-5xl bg-slate-950/90 rounded-xl border border-slate-800 p-4 font-mono text-xs space-y-2">
                                <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                                  <span>📖 Prosedur Pembacaan Nomogram NSP Wageningen:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-[11px] text-slate-400">
                                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                    <span className="text-red-400 font-bold block mb-1">① Atur Nilai Cb</span>
                                    Garis merah horizontal bergeser pada sumbu Y (Koefisien Blok kapal).
                                  </div>
                                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                    <span className="text-amber-400 font-bold block mb-1">② Titik Potong</span>
                                    Garis merah memotong kurva tiap station (titik kuning intersep).
                                  </div>
                                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                    <span className="text-emerald-400 font-bold block mb-1">③ Proyeksi Vertikal</span>
                                    Garis hijau putus-putus diproyeksikan tegak lurus turun ke sumbu X.
                                  </div>
                                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                    <span className="text-cyan-400 font-bold block mb-1">④ Baca Ordinat (% Am)</span>
                                    Nilai persentase luasan gading (% Am) terbaca di skala sumbu X.
                                  </div>
                                  <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                    <span className="text-purple-400 font-bold block mb-1">⑤ Integrasi CSA</span>
                                    Data 21 ordinat luasan (Luas = % Am x Am, Am = B x T x Cm) otomatis dihitung menjadi Kurva CSA & Simpson 1/3.
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
                              <span>Diagram Digital NSP Wageningen (SNAME / PNA) — Cb Proyek = {designData.cb || 0.76}</span>
                              <button
                                onClick={() => setIsNspModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-all"
                              >
                                Tutup Visualizer
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* BOTTOM SECTION: ESTIMASI HAMBATAN & DAYA MESIN (NSP POWERING) */}
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-2xl">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <Activity size={18} />
                    </div>
                    <span>2. Perhitungan Estimasi Daya Mesin (NSP Powering & Resistance)</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Estimasi daya NSP (Navy Sparrows Point) menghitung daya EHP / BHP bersih berdasarkan korelasi koefisien kepenuhan Cb ({designData.cb}), Froude number ({designData.froude_number}), dan target kecepatan dinas Vs ({designData.service_speed_knots || 12} Knot).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 shadow-inner">
                    <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl text-center space-y-1 shadow">
                      <div className="text-[11px] font-medium text-slate-400">Daya Hambatan Bersih (EHP)</div>
                      <div className="text-2xl font-black font-mono text-cyan-400">{designData.ehp_kw?.toFixed(2) || "0.0"} kW</div>
                      <div className="text-[10px] font-mono text-slate-500">{(designData.ehp_kw / 0.7457).toFixed(1)} HP</div>
                    </div>
                    <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl text-center space-y-1 shadow">
                      <div className="text-[11px] font-medium text-slate-400">Efisiensi Propulsi (&eta;p)</div>
                      <div className="text-2xl font-black font-mono text-white">{designData.propulsive_efficiency || "0.55"}</div>
                      <div className="text-[10px] text-slate-500">Estimasi Efisiensi Lambung & Propeller</div>
                    </div>
                    <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl text-center space-y-1 shadow">
                      <div className="text-[11px] font-medium text-slate-400">Daya Poros Mesin (BHP)</div>
                      <div className="text-2xl font-black font-mono text-emerald-400">{designData.bhp_kw?.toFixed(2) || "0.0"} kW</div>
                      <div className="text-[10px] font-mono text-slate-500">Termasuk Sea Margin {designData.sea_margin_percent}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <SideProfileNurbsEditor
                  lbp_m={Number(designData.lbp_m) || 90.0}
                  depth_m={Number(designData.depth_m) || 8.0}
                  draft_m={Number(designData.draft_m) || 5.5}
                  breadth_m={Number(designData.breadth_m) || 16.0}
                  cb={Number(designData.cb) || 0.76}
                  vesselType={designData.vessel_type || "GENERAL_CARGO"}
                  onUpdateLoa={(exactLoa) => {
                    if (formData.loa_m !== exactLoa) {
                      setFormData((prev: any) => ({ ...prev, loa_m: exactLoa }));
                    }
                  }}
                />
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-0 max-w-7xl mx-auto">
                <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col space-y-4 backdrop-blur-xl shadow-2xl" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <Cpu size={18} />
                    </div>
                    <span>AI Design Companion (Stage 2 Explainer)</span>
                  </h3>
                  {/* Section Explanation Presets */}
                  <div className="space-y-2 border-b border-slate-800/80 pb-3">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 block">
                      Pilih Section Modul Pra-Rancangan untuk Penjelasan AI:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "📊 Section 1 — Kapal Pembanding & Scaling DWT", query: "Beri penjelasan lengkap mengenai Section 1 Kapal Pembanding dan Scaling Rasio DWT" },
                        { label: "⚡ Section 2 — Optimasi Cb & Hydrostatics (Alexander)", query: "Beri penjelasan lengkap mengenai Section 2 Optimasi Cb Alexander dan Parameter Hidrostatik (Lbp, B, T, H, Cb)" },
                        { label: "⚖️ Section 3 — Distribusi Berat & Keseimbangan LWT", query: "Beri penjelasan lengkap mengenai Section 3 Distribusi Berat Ringan LWT dan Keseimbangan Mismatch Selisih" },
                        { label: "🚀 Section 4 — Geometri CSA & Estimasi Hambatan NSP", query: "Beri penjelasan lengkap mengenai Section 4 Geometri CSA, Ordinat Station NSP Wageningen, dan Estimasi Daya Mesin" }
                      ].map((preset, pidx) => (
                        <button
                          key={pidx}
                          onClick={() => handleAskAI(preset.query)}
                          disabled={aiLoading}
                          className="py-1.5 px-3 bg-slate-950/80 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-cyan-300 rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-left"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat logs */}
                  <div className="flex-1 border border-slate-800/80 rounded-2xl bg-slate-950/80 p-4 overflow-y-auto space-y-3 no-scrollbar backdrop-blur-md shadow-inner" style={{ minHeight: 0 }}>
                    {aiChat.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 p-6">
                        <Cpu size={32} className="text-blue-500/60 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-white">AI Stage 2 Design Explainer</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-md leading-relaxed">
                            Klik salah satu tombol <span className="text-cyan-400 font-semibold font-mono">Pilih Section Modul</span> di atas untuk mendapatkan rincian teknis hidrostatik (Alexander Cb, LWT, NSP Powering, GM Stabilitas). Setelah itu Anda dapat mengajukan pertanyaan lanjutan!
                          </p>
                        </div>
                      </div>
                    ) : (
                      aiChat.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed shadow-md ${
                              msg.sender === "user"
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-blue-400/30"
                                : msg.blocked
                                ? "bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-tl-none"
                                : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap"
                            }`}
                          >
                            <p className="font-semibold mb-1.5 opacity-70 text-[10px] uppercase font-mono tracking-wider">
                              {msg.sender === "user" ? "Perancang" : "AI Asisten"}
                            </p>
                            <div className="space-y-2 text-slate-200">
                              {msg.text.split("\n").filter(l => l.trim() !== "").map((line, lidx) => {
                                // Formatting sederhana untuk bold **text** dan list
                                const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                
                                if (line.startsWith("# ")) {
                                  return <h1 key={lidx} className="text-sm font-bold text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("# ", "") }} />;
                                }
                                if (line.startsWith("## ")) {
                                  return <h2 key={lidx} className="text-xs font-bold text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("## ", "") }} />;
                                }
                                if (line.startsWith("### ")) {
                                  return <h3 key={lidx} className="text-xs font-semibold text-slate-100 mt-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("### ", "") }} />;
                                }
                                if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                                  return (
                                    <div key={lidx} className="flex items-start space-x-2 pl-2 my-0.5">
                                      <span className="text-cyan-400 font-bold">•</span>
                                      <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, "") }} />
                                    </div>
                                  );
                                }
                                return (
                                  <p key={lidx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center space-x-2">
                          <RefreshCw className="animate-spin text-blue-400" size={14} />
                          <span>AI sedang menganalisis data proyek...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message input */}
                  <div className="flex space-x-2.5">
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Masukkan pertanyaan mengenai pra-rancangan kapal..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAskAI();
                      }}
                      className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans"
                    />
                    <button
                      onClick={() => handleAskAI()}
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      <Send size={14} />
                      <span>Kirim</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
