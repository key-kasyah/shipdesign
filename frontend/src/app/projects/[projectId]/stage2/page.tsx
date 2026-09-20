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
  Filter,
  Check,
  Sparkles,
  Star,
  X
} from "lucide-react";
import { api } from "../../../../services/api";
import { useLanguage } from "../../../../context/LanguageContext";
import { formatVesselType } from "../../../../types";

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
  const { t, language } = useLanguage();
  const projectId = params.projectId as string;

  // Active sub-tab in Stage 2
  const [activeTab, setActiveTab] = useState<
    "comparable" | "dimensions" | "weight" | "geometry" | "ai"
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

  // Non-intrusive Toast Notification System (replaces blocking browser alerts)
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);

  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "success"
  ) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, show: false } : null));
    }, 4500);
  };

  // Check if Stage 1 is validated, if not redirect back to Stage 1
  useEffect(() => {
    if (projectId) {
      const isStage1Val = localStorage.getItem(`stage1_validated_${projectId}`) === "true";
      if (!isStage1Val) {
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

      showNotification(
        "Scaling Applied Successfully",
        "Comparable ship DWT scale applied. Dimensions & Hydrostatics module is now unlocked.",
        "success"
      );
      setActiveTab("dimensions");
    } catch (e: any) {
      showNotification(
        "Scaling Failed",
        `Failed to apply scaling: ${e.message || e}`,
        "error"
      );
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
      showNotification(
        "Scenario Saved",
        "Design scenario changes saved and recalculations updated.",
        "success"
      );
    } catch (e: any) {
      showNotification(
        "Save Failed",
        `Failed to save scenario: ${e.message}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit scenario for review
  const handleSubmitReview = async () => {
    if (!activeRevision) return;
    if (unsavedChanges) {
      showNotification(
        "Unsaved Changes",
        "Please save parameter changes before submitting for review.",
        "warning"
      );
      return;
    }
    try {
      setLoading(true);
      const updatedHist = await api.submitStage2Scenario(projectId, activeRevision.revision_id, editorActor);
      setHistory2(updatedHist);
      const latest = updatedHist.revisions[updatedHist.revisions.length - 1];
      setActiveRevision(latest);
      showNotification(
        "Submitted for Review",
        "Preliminary design scenario successfully submitted for baseline review.",
        "success"
      );
    } catch (e: any) {
      showNotification(
        "Submission Failed",
        `Failed to submit review: ${e.message}`,
        "error"
      );
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
      showNotification(
        "Review Decision Recorded",
        `Status review updated to ${decision}.`,
        decision === "APPROVED" ? "success" : "warning"
      );
    } catch (e: any) {
      showNotification(
        "Review Update Failed",
        `Failed to update review status: ${e.message}`,
        "error"
      );
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

  // Computed baseline optimization state so the engine is never empty
  const computedOptData = React.useMemo(() => {
    const currLbp = Number(formData.lbp_m) || Number(compForm.lbp_m) || 98.0;
    const currB = Number(formData.breadth_m) || Number(compForm.breadth_m) || 16.2;
    const currT = Number(formData.draft_m) || Number(compForm.draft_m) || 6.0;
    const currH = Number(formData.depth_m) || Number(compForm.depth_m) || 8.0;
    const vs = Number(stage1Data?.service_speed_knots) || Number(formData.service_speed_knots) || Number(compForm.service_speed_knots) || 12.0;
    const dwt = Number(stage1Data?.target_dwt_ton) || Number(formData.target_dwt_ton) || Number(compForm.dwt_ton) || 5000;
    const cmInput = Number(formData.cm) || 0.98;
    const cwInput = Number(formData.cw) || 0.78;

    const sqrtLbp = Math.sqrt(currLbp);
    const cbCalc = 1.115 - (0.276 * vs) / sqrtLbp;
    const lastCb = Number(Math.max(0.50, Math.min(0.85, cbCalc)).toFixed(2));
    const lastCm = cmInput;
    const lastCw = cwInput;
    const lastCpv = Number((lastCb / (lastCw > 0 ? lastCw : 1)).toFixed(2));
    const lastCph = Number((lastCb / (lastCm > 0 ? lastCm : 1)).toFixed(2));
    const lastFb = Number((currH - currT).toFixed(2));
    const lastLwl = Number((currLbp * 1.025).toFixed(2));
    const speedMs = vs * 0.514444;
    const lastFn = Number((speedMs / Math.sqrt(9.81 * lastLwl)).toFixed(2));
    const lastVolM3 = Number((currLbp * currB * currT * lastCb).toFixed(3));
    const lastDisplTon = Number((lastVolM3 * 1.025).toFixed(2));

    return {
      lbp: currLbp.toFixed(2),
      b: currB.toFixed(2),
      t: currT.toFixed(2),
      h: currH.toFixed(2),
      cb: lastCb.toFixed(2),
      cm: lastCm.toFixed(2),
      cw: lastCw.toFixed(2),
      cpv: lastCpv.toFixed(2),
      cph: lastCph.toFixed(2),
      fb: lastFb.toFixed(2),
      fn: lastFn.toFixed(2),
      displTon: lastDisplTon.toFixed(2),
      volM3: lastVolM3.toFixed(3),
      grt: dwt.toLocaleString("en-US"),
      vs: vs,
      lwl: lastLwl.toFixed(2),
      cbCalcRaw: cbCalc.toFixed(4),
      sqrtLbp: sqrtLbp.toFixed(4)
    };
  }, [formData, compForm, stage1Data]);

  const activeOptData = optResultData || computedOptData;
  const [showNspReference, setShowNspReference] = useState(false);

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
      showNotification(
        "Data Not Ready",
        "CSA geometry ordinate data is not yet available for plotting.",
        "warning"
      );
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
    showNotification(
      "Weight Balance Optimized",
      `Total weight adjusted from ${currentTotal.toFixed(2)} Ton to ${newTotal.toFixed(2)} Ton (mismatch: ${newMismatch}%).`,
      "success"
    );
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
        lbp: currLbp.toFixed(2),
        b: currB.toFixed(2),
        t: currT.toFixed(2),
        h: currH.toFixed(2),
        cb: lastCb.toFixed(2),
        cm: lastCm.toFixed(2),
        cw: lastCw.toFixed(2),
        cpv: lastCpv.toFixed(2),
        cph: lastCph.toFixed(2),
        fb: lastFb.toFixed(2),
        fn: lastFn.toFixed(2),
        displTon: lastDisplTon.toFixed(2),
        volM3: lastVolM3.toFixed(3),
        grt: dwt.toLocaleString("en-US"),
        vs: vs,
        lwl: lastLwl.toFixed(2),
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
      showNotification(
        `Optimization Iteration #${newIterationCount} Completed`,
        `Formulation solved: Cb = ${lastCb}, Lbp = ${currLbp}m, Displacement = ${lastDisplTon} Ton (mismatch: ${actualWeightMismatch}%).`,
        "success"
      );
    } catch (e: any) {
      showNotification(
        "Optimization Failed",
        `Failed to run optimization: ${e.message || e}`,
        "error"
      );
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Full-Width Sub-Navigation Tabs Bar */}
      <div className="w-full bg-white dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 py-2 shadow-xs shrink-0">
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {[
            { id: "comparable", label: language === "en" ? "Comparable Ships" : "Kapal Pembanding", icon: <Scale size={14} className="shrink-0" /> },
            { id: "dimensions", label: language === "en" ? "Dimensions & Coeffs" : "Ukuran & Koefisien", icon: <Compass size={14} className="shrink-0" /> },
            { id: "weight", label: language === "en" ? "Weight & Capacity" : "Berat & Kapasitas", icon: <Layers size={14} className="shrink-0" /> },
            { id: "geometry", label: language === "en" ? "CSA & NSP Curves" : "Geometri CSA & NSP", icon: <Activity size={14} className="shrink-0" /> },
            { id: "ai", label: language === "en" ? "AI Co-Pilot" : "AI Explainer", icon: <Cpu size={14} className="shrink-0" /> }
          ].map((tab) => {
            const isLocked = !hasAppliedScaling 
              ? tab.id !== "comparable" 
              : needsRecalculation 
                ? (tab.id !== "comparable" && tab.id !== "dimensions")
                : false;

            const lockReason = !hasAppliedScaling
              ? "Please click 'Calculate & Apply DWT Scaling' on the Comparable Ships module first to unlock next steps."
              : "Parameters changed! Please click 'Calculate & Apply DWT Scaling' or 'Save Changes & Calculate' to recalculate before proceeding.";

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isLocked) {
                    showNotification("Module Locked", lockReason, "warning");
                    return;
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs rounded-xl transition-all duration-150 cursor-pointer text-center min-w-0 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold border border-blue-600"
                    : isLocked
                    ? "bg-slate-100 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 border border-slate-300 dark:border-slate-800 cursor-not-allowed font-semibold"
                    : "bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-blue-600 border border-slate-300 dark:border-slate-700 font-bold shadow-2xs"
                }`}
              >
                {tab.icon}
                <span className={`truncate font-bold ${activeTab === tab.id ? "text-white" : ""}`}>{tab.label}</span>
                {isLocked && <Lock size={12} className="text-amber-600 dark:text-amber-400 ml-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Form / Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar bg-slate-50 dark:bg-[#070B12]">
            {activeTab === "comparable" && (
              <div className="space-y-5 w-full">
                {/* REFERENCE SHIP DATABASE CATALOG */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl space-y-3.5 backdrop-blur-xl shadow-xs dark:shadow-xl">
                  {/* Compact Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800/60">
                    <div className="flex items-center space-x-2.5">
                      <FolderOpen size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {language === "en" ? "AI Comparable Ships" : "Katalog Kapal Pembanding AI"}
                      </h3>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-semibold">({displayedComparableShips.length} {language === "en" ? "ships available" : "kapal tersedia"})</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">{language === "en" ? "Project Target:" : "Target Proyek:"}</span>
                      <span className="bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 text-blue-900 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full font-mono text-[11px]">
                        {targetType} • {targetDwt.toLocaleString()} Ton
                      </span>
                    </div>
                  </div>

                  {/* Compact Search & Filter Row */}
                  <div className="flex flex-col lg:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder={language === "en" ? "Search ship name or register reference..." : "Cari nama kapal atau referensi register..."}
                        value={shipSearch}
                        onChange={(e) => setShipSearch(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/90 border border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all font-sans font-medium shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full lg:w-auto shrink-0">
                      {[
                        { id: "ALL", label: "All" },
                        { id: "CONTAINER", label: "Container" },
                        { id: "GENERAL_CARGO", label: "General Cargo" },
                        { id: "TANKER", label: "Tanker" },
                        { id: "BULK_CARRIER", label: "Bulk Carrier" },
                        { id: "PASSENGER", label: "Ferry" },
                        { id: "TUG_BOAT", label: "Tug Boat" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setShipTypeFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                            shipTypeFilter === f.id
                              ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-950/70 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-2xs"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {displayedComparableShips.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-2 backdrop-blur-md">
                      <AlertCircle size={28} className="mx-auto text-slate-500" />
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{language === "en" ? "No comparable ships match search criteria." : "Tidak ada kapal pembanding yang cocok dengan kriteria pencarian."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedComparableShips.map((ship, idx) => {
                        const isSelected = compForm.ship_name === ship.ship_name;
                        const isTopRank = idx === 0 && shipSearch === "" && shipTypeFilter === "ALL";

                        return (
                          <div
                            key={idx}
                            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                              isSelected
                                ? "bg-gradient-to-b from-blue-50/90 via-white to-white dark:from-blue-950/40 dark:to-slate-900/90 border-2 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-600/15"
                                : isTopRank
                                ? "bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:to-slate-900/90 border border-amber-300 dark:border-amber-500/40 hover:border-amber-400 shadow-xs hover:shadow-md"
                                : "bg-white dark:bg-slate-900/60 hover:bg-slate-50/60 dark:hover:bg-slate-900/95 border border-slate-200 hover:border-slate-300 dark:border-slate-800/90 dark:hover:border-slate-700/90 shadow-2xs hover:shadow-sm"
                            }`}
                          >
                            <div className="space-y-3.5">
                              {/* Recommendation / Match Badge Bar */}
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  {ship.isExactMatch ? (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-400 font-extrabold text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                                      <Sparkles size={12} className="text-emerald-700 dark:text-emerald-400" />
                                      <span>{language === "en" ? "Perfect Match 100%" : "Perfek Match 100%"}</span>
                                    </span>
                                  ) : isTopRank ? (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-950 dark:text-amber-300 font-extrabold text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                                      <Star size={12} className="text-amber-600 fill-amber-600 dark:text-amber-400 dark:fill-amber-400" />
                                      <span>{language === "en" ? "Recommended" : "Rekomendasi"} ({ship.matchScore}%)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60 text-[11px] font-mono px-2.5 py-1 rounded-full font-bold">
                                      Match: {ship.matchScore}%
                                    </span>
                                  )}
                                </div>

                                <span className="text-[11px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 px-2.5 py-0.5 rounded-full font-mono shrink-0">
                                  {formatVesselType(ship.vessel_type)}
                                </span>
                              </div>

                              {/* Ship Header */}
                              <div>
                                <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors leading-snug">
                                  {ship.ship_name}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1 flex items-center gap-1.5 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-slate-500 shrink-0" />
                                  <span className="truncate">{ship.source_reference}</span>
                                </p>
                              </div>

                              {/* 4-Stat Metric Grid */}
                              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                                <div className={`p-3 rounded-xl border transition-colors ${
                                  isSelected
                                    ? "bg-blue-50/70 dark:bg-slate-950/60 border-blue-200 dark:border-slate-800/60"
                                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 group-hover:border-slate-300 dark:group-hover:border-slate-700/60"
                                }`}>
                                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider block mb-1">Target DWT</span>
                                  <div className="flex items-baseline space-x-1">
                                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">{ship.dwt_ton.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ton</span>
                                  </div>
                                </div>
                                <div className={`p-3 rounded-xl border transition-colors ${
                                  isSelected
                                    ? "bg-blue-50/70 dark:bg-slate-950/60 border-blue-200 dark:border-slate-800/60"
                                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 group-hover:border-slate-300 dark:group-hover:border-slate-700/60"
                                }`}>
                                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider block mb-1">{language === "en" ? "LBP Length" : "Panjang LBP"}</span>
                                  <div className="flex items-baseline space-x-1">
                                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">{ship.lbp_m}</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">m</span>
                                  </div>
                                </div>
                                <div className={`p-3 rounded-xl border transition-colors ${
                                  isSelected
                                    ? "bg-blue-50/70 dark:bg-slate-950/60 border-blue-200 dark:border-slate-800/60"
                                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 group-hover:border-slate-300 dark:group-hover:border-slate-700/60"
                                }`}>
                                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider block mb-1">{language === "en" ? "Breadth (B)" : "Lebar (B)"}</span>
                                  <div className="flex items-baseline space-x-1">
                                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">{ship.breadth_m}</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">m</span>
                                  </div>
                                </div>
                                <div className={`p-3 rounded-xl border transition-colors ${
                                  isSelected
                                    ? "bg-blue-50/70 dark:bg-slate-950/60 border-blue-200 dark:border-slate-800/60"
                                    : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 group-hover:border-slate-300 dark:group-hover:border-slate-700/60"
                                }`}>
                                  <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-bold tracking-wider block mb-1">{language === "en" ? "Draft (T)" : "Sarat Draft (T)"}</span>
                                  <div className="flex items-baseline space-x-1">
                                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">{ship.draft_m}</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">m</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
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
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-4 active:scale-[0.98] ${
                                isSelected
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 border border-blue-600 font-extrabold"
                                  : isTopRank
                                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-xs border border-amber-500/50"
                                  : "bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-600 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:border-blue-600 shadow-xs font-bold"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={15} className="text-white font-black shrink-0" />
                                  <span className="text-white font-extrabold">{language === "en" ? "Selected as Primary Reference" : "Terpilih Sebagai Acuan Utama"}</span>
                                </>
                              ) : isTopRank ? (
                                <>
                                  <Sparkles size={15} className="text-slate-950 font-black shrink-0" />
                                  <span className="text-slate-950 font-extrabold">{language === "en" ? "Use Recommended Ship" : "Gunakan Rekomendasi Ini"}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">{language === "en" ? "Select This Ship" : "Pilih Kapal Ini"}</span>
                                  <ArrowRight size={14} className="font-bold shrink-0" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div id="scaling-form-section" className="relative bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200 dark:border-slate-800/90 p-6 rounded-2xl space-y-5 backdrop-blur-xl shadow-xs dark:shadow-2xl overflow-hidden">
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/5 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Scale size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {language === "en" ? "Primary Reference Ship Specifications" : "Spesifikasi Kapal Pembanding Acuan"}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === "en"
                          ? "The system uses this primary reference ship to estimate main hull dimensions proportionally using DWT power 1/3 scaling formula."
                          : "Sistem akan menggunakan data kapal pembanding utama ini untuk memperkirakan ukuran utama lambung secara proporsional menggunakan formula scaling rasio DWT pangkat 1/3."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{language === "en" ? "Comparable Ship Name *" : "Nama Kapal Pembanding *"}</label>
                      <input
                        type="text"
                        value={compForm.ship_name}
                        onChange={(e) => setCompForm({ ...compForm, ship_name: e.target.value })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target DWT (Ton) *</label>
                      <input
                        type="number"
                        value={compForm.dwt_ton}
                        onChange={(e) => setCompForm({ ...compForm, dwt_ton: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">LBP (m) *</label>
                      <input
                        type="number"
                        value={compForm.lbp_m}
                        onChange={(e) => setCompForm({ ...compForm, lbp_m: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Breadth (B) (m) *</label>
                      <input
                        type="number"
                        value={compForm.breadth_m}
                        onChange={(e) => setCompForm({ ...compForm, breadth_m: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Draft (T) (m) *</label>
                      <input
                        type="number"
                        value={compForm.draft_m}
                        onChange={(e) => setCompForm({ ...compForm, draft_m: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Depth (H) (m) *</label>
                      <input
                        type="number"
                        value={compForm.depth_m}
                        onChange={(e) => setCompForm({ ...compForm, depth_m: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Block Coeff (Cb) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={compForm.cb}
                        onChange={(e) => setCompForm({ ...compForm, cb: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{language === "en" ? "Service Speed (Knots) *" : "Kecepatan Dinas (Knots) *"}</label>
                      <input
                        type="number"
                        value={compForm.service_speed_knots}
                        onChange={(e) => setCompForm({ ...compForm, service_speed_knots: Number(e.target.value) })}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleApplyScaling}
                      className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-bold flex items-center space-x-2 text-xs shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                    >
                      <Scale size={16} />
                      <span>{language === "en" ? "Calculate & Apply DWT Scaling" : "Hitung & Terapkan Skala DWT"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dimensions" && (
              <div className="space-y-6 w-full">
                {/* OPTIMIZATION ACTION CARD & SHIP BASIC DESIGN FORMULA ENGINE */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-5 shadow-xs dark:shadow-2xl">
                  {/* Card Header & Controls */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                        <Activity size={18} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2.5 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            Hydrostatic Optimization & Formulation Engine
                          </h3>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 rounded-md">
                            Ship Basic Design (p. 10)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Live calculation of block coefficient Cb, displacement, and hydrostatic parameters based on service speed Vs and Lbp length.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 shrink-0 self-start lg:self-center">
                      <span className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs px-3 py-1.5 rounded-xl font-bold font-mono">
                        Iteration #{optimizationCount}
                      </span>
                      <button
                        onClick={() => handleRunOptimization(1)}
                        disabled={isOptimizing}
                        className="py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-bold flex items-center space-x-1.5 text-xs shadow-md shadow-blue-600/20 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={isOptimizing ? "animate-spin" : ""} />
                        <span>⚡ Run 1x Optimization</span>
                      </button>
                      <button
                        onClick={() => handleRunOptimization(5)}
                        disabled={isOptimizing}
                        className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold flex items-center space-x-1.5 text-xs shadow-md shadow-indigo-600/20 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                      >
                        <Sparkles size={13} />
                        <span>🚀 Run 5x Iterations</span>
                      </button>
                    </div>
                  </div>

                  {/* 4-Stat Metric KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Block Coeff (Cb)</span>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{activeOptData.cb}</div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">Block Coefficient</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Displacement (Δ)</span>
                      <div className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-300">{activeOptData.displTon} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ton</span></div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">Vol: {activeOptData.volM3} m³</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Froude Number (Fn)</span>
                      <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-300">{activeOptData.fn}</div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">Speed: {activeOptData.vs} kts</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Freeboard (Fb)</span>
                      <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{activeOptData.fb} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">m</span></div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">H - T Reserve Buoyancy</span>
                    </div>
                  </div>

                  {/* Complete Hydrostatic Specification Table */}
                  <div className="w-full bg-white dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Optimized Vessel Hydrostatic Specifications</span>
                      </h4>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-md">
                        ✓ Synchronized
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono text-left border-collapse">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium w-1/4">Lbp (Length Between Perp.)</td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-600 dark:text-emerald-400 w-1/4">{activeOptData.lbp} m</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium w-1/4">Breadth Molded (B)</td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-600 dark:text-emerald-400 w-1/4">{activeOptData.b} m</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Design Draft (T)</td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-600 dark:text-emerald-400">{activeOptData.t} m</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Depth Molded (H)</td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-600 dark:text-emerald-400">{activeOptData.h} m</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Waterline Length (Lwl)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.lwl} m</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Freeboard (Fb)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.fb} m</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Block Coeff (Cb)</td>
                            <td className="py-2.5 px-3.5 font-bold text-amber-600 dark:text-amber-300">{activeOptData.cb}</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Midship Coeff (Cm)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.cm}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Waterplane Coeff (Cw)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.cw}</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Vert. Prismatic (Cpv)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.cpv}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Horiz. Prismatic (Cph)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.cph}</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Froude Number (Fn)</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">{activeOptData.fn}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40 bg-slate-50/50 dark:bg-slate-900/30">
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Molded Displacement</td>
                            <td className="py-2.5 px-3.5 font-bold text-cyan-600 dark:text-cyan-300">{activeOptData.displTon} Ton</td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">Molded Volume</td>
                            <td className="py-2.5 px-3.5 font-bold text-cyan-600 dark:text-cyan-300">{activeOptData.volM3} m³</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* HULL PRINCIPAL DIMENSIONS & FORM COEFFICIENTS EDITOR */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-6 shadow-xs dark:shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                          <Compass size={18} />
                        </div>
                        <span>Hull Principal Dimensions & Form Coefficients Editor</span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Form parameter editor to view, input, or fine-tune principal hull dimensions (LBP, Breadth, Draft, Depth) and form coefficients (Cb, Cm, Cw).
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
                        <span>🔗</span>
                        <span>Draft T = {Number(designData.draft_m || 5.44).toFixed(2)} m ➔ Stage 3 DWL</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">LBP (Length Between Perp.) (m)</label>
                      <input
                        type="number"
                        value={designData.lbp_m || ""}
                        onChange={(e) => handleParamChange("lbp_m", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Breadth Molded (Beam B) (m)</label>
                      <input
                        type="number"
                        value={designData.breadth_m || ""}
                        onChange={(e) => handleParamChange("breadth_m", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Draft (Design Waterline T) (m)</label>
                      <input
                        type="number"
                        value={designData.draft_m || ""}
                        onChange={(e) => handleParamChange("draft_m", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Depth Molded (Height H) (m)</label>
                      <input
                        type="number"
                        value={designData.depth_m || ""}
                        onChange={(e) => handleParamChange("depth_m", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Block Coefficient (Cb)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cb || ""}
                        onChange={(e) => handleParamChange("cb", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Midship Coefficient (Cm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cm || ""}
                        onChange={(e) => handleParamChange("cm", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Waterplane Coefficient (Cw)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={designData.cw || ""}
                        onChange={(e) => handleParamChange("cw", Number(e.target.value))}
                        className="w-full bg-slate-50 hover:bg-white dark:bg-slate-950/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-xl py-2.5 px-3.5 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-900 dark:text-white font-medium outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Froude Number (Fn)</label>
                      <div className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-300 font-mono font-bold select-none shadow-2xs">
                        {designData.froude_number || "0.00"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Displacement (Ton)</label>
                      <div className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl py-2.5 px-3.5 text-xs text-cyan-700 dark:text-cyan-400 font-mono font-bold select-none shadow-2xs">
                        {designData.displacement_ton || "0.00"}
                      </div>
                    </div>
                  </div>

                  {/* Dimension Ratios Status Bar */}
                  <div className="bg-slate-50 dark:bg-slate-950/80 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-inner">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Empirical Dimensional Ratio Compliance Checks</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Card 1: LBP / Breadth */}
                      {(() => {
                        const ratio = designData.lbp_m && designData.breadth_m ? designData.lbp_m / designData.breadth_m : 0;
                        const isValid = ratio >= 5.0 && ratio <= 8.5;
                        return (
                          <div className={`p-3.5 bg-white dark:bg-slate-900/80 border ${isValid ? "border-emerald-300 dark:border-emerald-500/30" : "border-amber-300 dark:border-amber-500/30"} rounded-xl text-center shadow-2xs relative`}>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">LBP / Breadth</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Range: 5.0 - 8.5</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {isValid ? "✓ Compliant" : "⚠️ Needs Adjustment"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 2: Breadth / Draft */}
                      {(() => {
                        const ratio = designData.breadth_m && designData.draft_m ? designData.breadth_m / designData.draft_m : 0;
                        const isValid = ratio >= 1.8 && ratio <= 3.2;
                        return (
                          <div className={`p-3.5 bg-white dark:bg-slate-900/80 border ${isValid ? "border-emerald-300 dark:border-emerald-500/30" : "border-amber-300 dark:border-amber-500/30"} rounded-xl text-center shadow-2xs relative`}>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Breadth / Draft</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Range: 1.8 - 3.2</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {isValid ? "✓ Compliant" : "⚠️ Needs Adjustment"}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Card 3: LBP / Depth */}
                      {(() => {
                        const ratio = designData.lbp_m && designData.depth_m ? designData.lbp_m / designData.depth_m : 0;
                        const isValid = ratio >= 9.0 && ratio <= 15.0;
                        return (
                          <div className={`p-3.5 bg-white dark:bg-slate-900/80 border ${isValid ? "border-emerald-300 dark:border-emerald-500/30" : "border-amber-300 dark:border-amber-500/30"} rounded-xl text-center shadow-2xs relative`}>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">LBP / Depth</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {ratio ? ratio.toFixed(2) : "-"}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Range: 9.0 - 15.0</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {isValid ? "✓ Compliant" : "⚠️ Needs Adjustment"}
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
                          <div className={`p-3.5 bg-white dark:bg-slate-900/80 border ${isValid ? "border-emerald-300 dark:border-emerald-500/30" : "border-amber-300 dark:border-amber-500/30"} rounded-xl text-center shadow-2xs relative`}>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Freeboard (H - T)</div>
                            <div className={`text-lg font-bold font-mono ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {fb ? fb.toFixed(2) : "-"} m
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Min: &gt; 10% H</div>
                            <div className={`text-[9px] font-bold font-mono mt-1 ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {isValid ? "✓ Compliant" : "⚠️ Needs Adjustment"}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveScenario}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-semibold flex items-center justify-center space-x-2 text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <Save size={16} />
                      <span>Save Changes & Recalculate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "weight" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                {/* Weight Items Table */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-6 shadow-xs dark:shadow-2xl">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                      <Layers size={18} />
                    </div>
                    <span>Distribusi Berat Ringan (LWT) & Berat Mati (DWT)</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950/80 shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800/80 uppercase text-[10px] tracking-wider">
                          <th className="p-3.5 sm:p-4">Kelompok Berat</th>
                          <th className="p-3.5 sm:p-4 text-center">Massa (Ton)</th>
                          <th className="p-3.5 sm:p-4 text-center">LCG dari AP (m)</th>
                          <th className="p-3.5 sm:p-4 text-center">VCG dari BL (m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                        {designData.weight_items?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-medium">
                            <td className="p-3.5 sm:p-4 font-semibold text-slate-900 dark:text-slate-100">{item.group_name}</td>
                            <td className="p-3.5 sm:p-4 text-center">
                              <input
                                type="number"
                                value={item.weight_ton}
                                onChange={(e) => handleWeightChange(idx, "weight_ton", Number(e.target.value))}
                                className="bg-slate-50 hover:bg-white dark:bg-slate-900/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-28 text-slate-900 dark:text-white font-mono text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                              />
                            </td>
                            <td className="p-3.5 sm:p-4 text-center">
                              <input
                                type="number"
                                value={item.lcg_m}
                                onChange={(e) => handleWeightChange(idx, "lcg_m", Number(e.target.value))}
                                className="bg-slate-50 hover:bg-white dark:bg-slate-900/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-24 text-slate-900 dark:text-white font-mono text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                              />
                            </td>
                            <td className="p-3.5 sm:p-4 text-center">
                              <input
                                type="number"
                                value={item.vcg_m}
                                onChange={(e) => handleWeightChange(idx, "vcg_m", Number(e.target.value))}
                                className="bg-slate-50 hover:bg-white dark:bg-slate-900/80 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-lg py-1.5 px-2.5 text-center w-24 text-slate-900 dark:text-white font-mono text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Weight Displacement mismatch panel */}
                  <div className="bg-slate-50 dark:bg-slate-950/80 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Status Keseimbangan Berat</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Target Displacement: <span className="text-slate-900 dark:text-white font-bold font-mono">{designData.displacement_ton} Ton</span> | 
                        Total Berat: <span className="text-slate-900 dark:text-white font-bold font-mono">
                          {designData.weight_items?.reduce((sum: number, w: any) => sum + w.weight_ton, 0).toFixed(2)} Ton
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-semibold tracking-wider mb-0.5">Mismatch Selisih</div>
                        <div className={`text-xl font-mono font-black ${
                          (designData.weight_mismatch_percent || 0) <= 1.5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (designData.weight_mismatch_percent || 0) <= 5.0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
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
                      className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>⚡ Auto-Balance Weight (Mismatch ≤ 0.2%)</span>
                    </button>
                    <button
                      onClick={handleSaveScenario}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl transition-all font-semibold flex items-center space-x-2 text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                    >
                      <Save size={16} />
                      <span>Save Weight Distribution</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "geometry" && (
              <div className="space-y-6 w-full">
                {/* TOP SECTION: DIAGRAM LENGKUNG CSA (BERDASARKAN DIAGRAM NSP WAGENINGEN) */}
                <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-6 backdrop-blur-xl shadow-xs dark:shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                          <Layers size={18} />
                        </div>
                        <span>1. Curve of Sectional Areas (CSA) & Design Waterline (DWL)</span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        The CSA curve illustrates the transverse sectional area of the hull from Station 0 (AP) to Station 20 (FP) computed according to the Wageningen NSP percentage distribution.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowNspReference(!showNspReference)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-blue-400 border border-slate-300 dark:border-slate-800 rounded-xl transition-all font-bold flex items-center space-x-2 text-xs shrink-0 cursor-pointer shadow-xs"
                    >
                      <Eye size={15} />
                      <span>{showNspReference ? "Hide NSP Reference" : "🔍 View Wageningen NSP Reference Diagram"}</span>
                    </button>
                  </div>

                  {/* NSP Wageningen Reference Diagram Interactive Box */}
                  {showNspReference && (
                    <div className="bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xs dark:shadow-2xl">
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
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                              {/* Reference Standards Badge */}
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 flex items-center space-x-2">
                                  <span>📖</span>
                                  <span>Data Baku Nomogram NSP Wageningen (SNAME / PNA)</span>
                                </span>
                              </div>

                              {/* Direct Numerical Cb Input & Reset */}
                              <div className="flex items-center space-x-3 shrink-0">
                                <div className="flex items-center space-x-2 bg-white dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-2xs">
                                  <label className="text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">Nilai Cb:</label>
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
                                    className="w-20 bg-slate-50 dark:bg-slate-950 border border-amber-500 text-slate-900 dark:text-amber-300 font-mono font-black text-xs px-2 py-1 rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                  <button
                                    onClick={() => setInteractiveCb(designData.cb || 0.76)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold rounded cursor-pointer transition-all border border-slate-300 dark:border-slate-700"
                                  >
                                    Atur Ulang Cb
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 1 & 2. Digital NSP Nomogram Canvas */}
                            <div className="space-y-4">
                              <div className="bg-white dark:bg-[#02050e] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-xs dark:shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800/80 font-mono text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-blue-600 dark:text-cyan-400 font-extrabold uppercase tracking-wider">
                                      📐 1 & 2. Diagram NSP Interaktif (Wageningen)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                                    Standard NSP Wageningen (21 Station: St. 0 AP s.d St. 20 FP)
                                  </div>
                                </div>

                                {/* High Precision Digitized Vector SVG Nomogram */}
                                <div className="w-full overflow-x-auto no-scrollbar py-2">
                                  <svg className="w-full min-w-[760px] h-auto" viewBox="0 0 1000 550" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                      {/* Strict clip path strictly enclosing the plot area: x=100 to 940, y=50 to 470 */}
                                      <clipPath id="nsp-plot-bounds">
                                        <rect x="100" y="50" width="840" height="420" />
                                      </clipPath>
                                    </defs>

                                    {/* Blueprint Outer Frame */}
                                    <rect x="100" y="50" width="840" height="420" fill="#f8fafc" className="dark:fill-[#030712]" stroke="#94a3b8" strokeWidth="1.5" />
                                    
                                    {/* Centerline: Station 10 / 0% Line */}
                                    <line x1="520" y1="50" x2="520" y2="470" stroke="#2563eb" strokeWidth="1.8" strokeDasharray="6,3" />
                                    <text x="520" y="42" fill="#1d4ed8" className="dark:fill-[#60a5fa]" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      Station 10 (0% Luas dari Garis Tengah)
                                    </text>

                                    {/* Top Subheaders for Stern & Bow */}
                                    <text x="310" y="30" fill="#1e293b" className="dark:fill-[#cbd5e1]" fontSize="11.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      &larr; Bagian Belakang (Buritan / Stern: Station 0 s.d 9)
                                    </text>
                                    <text x="730" y="30" fill="#1e293b" className="dark:fill-[#cbd5e1]" fontSize="11.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      Bagian Depan (Haluan / Bow: Station 11 s.d 20) &rarr;
                                    </text>

                                    {/* X-Grid & Ticks: Stern (Left, 100% to 0%) */}
                                    {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((val, idx) => {
                                      const x = 100 + idx * 42;
                                      return (
                                        <g key={`stern-grid-${idx}`}>
                                          <line x1={x} y1="50" x2={x} y2="470" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeWidth="0.8" strokeDasharray="2,3" />
                                          <line x1={x} y1="470" x2={x} y2="476" stroke="#64748b" strokeWidth="1" />
                                          <text x={x} y="492" fill="#334155" className="dark:fill-[#94a3b8]" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{val}</text>
                                        </g>
                                      );
                                    })}

                                    {/* X-Grid & Ticks: Bow (Right, 0% to 100%) */}
                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val, idx) => {
                                      const x = 520 + idx * 42;
                                      return (
                                        <g key={`bow-grid-${idx}`}>
                                          <line x1={x} y1="50" x2={x} y2="470" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeWidth="0.8" strokeDasharray="2,3" />
                                          <line x1={x} y1="470" x2={x} y2="476" stroke="#64748b" strokeWidth="1" />
                                          <text x={x} y="492" fill="#334155" className="dark:fill-[#94a3b8]" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{val}</text>
                                        </g>
                                      );
                                    })}

                                    {/* Sumbu X Main Label */}
                                    <text x="520" y="518" fill="#0f172a" className="dark:fill-white" fontSize="12" fontWeight="extrabold" textAnchor="middle" fontFamily="monospace">
                                      Ordinat Luasan Gading / Station (% Am)
                                    </text>

                                    {/* Y-Grid & Ticks: Cb Values (0.55 to 0.80) */}
                                    {[0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal, i) => {
                                      const y = 470 - ((cbVal - 0.55) / 0.25) * 420;
                                      return (
                                        <g key={`y-grid-${i}`}>
                                          <line x1="100" y1={y} x2="940" y2={y} stroke="#cbd5e1" className="dark:stroke-[#1e293b]" strokeWidth="0.8" strokeDasharray="2,3" />
                                          <line x1="92" y1={y} x2="100" stroke="#64748b" strokeWidth="1.2" />
                                          <text x="86" y={y + 4} fill="#0f172a" className="dark:fill-[#f8fafc]" fontSize="11" fontWeight="extrabold" textAnchor="end" fontFamily="monospace">
                                            {cbVal.toFixed(2)}
                                          </text>
                                        </g>
                                      );
                                    })}

                                    {/* Sumbu Y Title (Rotated) */}
                                    <text x="-260" y="24" fill="#0f172a" className="dark:fill-white" fontSize="12" fontWeight="extrabold" textAnchor="middle" fontFamily="monospace" transform="rotate(-90)">
                                      Koefisien Blok (Cb)
                                    </text>

                                    {/* Station Curves strictly clipped inside plot area */}
                                    <g clipPath="url(#nsp-plot-bounds)">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                        const isStern = stNum < 10;
                                        const pathPoints = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80].map((cbVal) => {
                                          const ordPct = getStationOrdinate(stNum, cbVal) / 100;
                                          const yPixel = 470 - ((cbVal - 0.55) / 0.25) * 420;
                                          const rawX = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);
                                          const xPixel = Math.max(100, Math.min(940, rawX));
                                          return `${xPixel.toFixed(1)},${yPixel.toFixed(1)}`;
                                        });

                                        return (
                                          <path
                                            key={`st-curve-${stNum}`}
                                            d={`M ${pathPoints.join(" L ")}`}
                                            fill="none"
                                            stroke="#334155"
                                            className="dark:stroke-[#94a3b8]"
                                            strokeWidth="1.5"
                                          />
                                        );
                                      })}
                                    </g>

                                    {/* Active Cb Red Laser Line & Yellow Intersections & Green Drop Lines */}
                                    {(() => {
                                      const activeCb = Math.max(0.55, Math.min(0.80, interactiveCb));
                                      const yBC = 470 - ((activeCb - 0.55) / 0.25) * 420;
                                      return (
                                        <g key="active-laser-bc">
                                          {/* Horizontal Red Laser Line for active Cb */}
                                          <line x1="90" y1={yBC} x2="950" y2={yBC} stroke="#dc2626" strokeWidth="2.5" />
                                          <rect x="36" y={yBC - 10} width="54" height="20" rx="5" fill="#dc2626" />
                                          <text x="63" y={yBC + 4} fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                                            Cb {activeCb.toFixed(2)}
                                          </text>

                                          {/* Intersection Points & Vertical Green Projection Lines (clipped) */}
                                          <g clipPath="url(#nsp-plot-bounds)">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((stNum) => {
                                              const isStern = stNum < 10;
                                              const ordPct = getStationOrdinate(stNum, activeCb) / 100;
                                              const rawX = isStern ? (100 + (1.0 - ordPct) * 420) : (520 + ordPct * 420);
                                              const xPoint = Math.max(100, Math.min(940, rawX));
                                              return (
                                                <g key={`laser-drop-${stNum}`}>
                                                  {/* Green Vertical Projection Line to Sumbu X */}
                                                  <line x1={xPoint} y1={yBC} x2={xPoint} y2="470" stroke="#16a34a" strokeWidth="1.2" strokeDasharray="3,2" />
                                                  {/* Yellow Active Intersection Point */}
                                                  <circle cx={xPoint} cy={yBC} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
                                                </g>
                                              );
                                            })}
                                          </g>
                                        </g>
                                      );
                                    })()}
                                  </svg>
                                </div>
                              </div>

                              {/* Reading Guide / Step-by-Step Procedure */}
                              <div className="bg-white dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 font-mono text-xs space-y-3 shadow-2xs">
                                <div className="text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2">
                                  <span>📖 Prosedur Pembacaan Nomogram NSP Wageningen:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-[11px]">
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-2xs">
                                    <span className="text-rose-600 dark:text-rose-400 font-bold block mb-1">① Atur Nilai Cb</span>
                                    <span className="text-slate-700 dark:text-slate-300">Garis merah horizontal bergeser sesuai Koefisien Blok kapal (sumbu Y).</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-2xs">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold block mb-1">② Titik Potong</span>
                                    <span className="text-slate-700 dark:text-slate-300">Garis merah memotong kurva tiap station (titik kuning intersep).</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-2xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">③ Proyeksi Vertikal</span>
                                    <span className="text-slate-700 dark:text-slate-300">Garis hijau putus-putus diproyeksikan tegak lurus turun ke sumbu X.</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-2xs">
                                    <span className="text-blue-600 dark:text-cyan-400 font-bold block mb-1">④ Baca Ordinat (% Am)</span>
                                    <span className="text-slate-700 dark:text-slate-300">Nilai persentase luasan gading (% Am) terbaca di skala sumbu X.</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-2xs">
                                    <span className="text-indigo-600 dark:text-purple-400 font-bold block mb-1">⑤ Integrasi CSA</span>
                                    <span className="text-slate-700 dark:text-slate-300">Data 21 ordinat luasan (Luas = % Am x Am, Am = B x T x Cm) otomatis dihitung menjadi Kurva CSA & Simpson 1/3.</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* KARTU TEORI & DIAGRAM ILUSTRASI LUAS MIDSHIP (Am) */}
                            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl space-y-4 font-mono shadow-xs dark:shadow-xl">
                              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                                {/* Left Side: Explanation Text & Formula */}
                                <div className="space-y-3 flex-1 text-xs">
                                  <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                                    <span className="text-base text-amber-500 dark:text-amber-400">❖</span>
                                    <span>Luas Midship (Am)</span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                                    Merupakan luasan bagian tengah kapal yang dipotong secara melintang yang memiliki lebar <strong className="text-cyan-600 dark:text-cyan-300">B</strong> dan tinggi sarat <strong className="text-emerald-600 dark:text-emerald-300">T</strong>. Dirumuskan dengan :
                                  </p>
                                  
                                  {/* Formula Box */}
                                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-2xs">
                                    <div className="text-amber-700 dark:text-amber-300 font-bold text-sm tracking-wide">
                                      Am = B x T x Cm
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                      = {Number(designData.breadth_m || 0).toFixed(2)}m × {Number(designData.draft_m || 0).toFixed(3)}m × {Number(designData.cm || 0.98).toFixed(2)} = <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{currentAm.toFixed(2)} m²</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold">Lebar (B)</span>
                                      <span className="text-cyan-700 dark:text-cyan-300 font-bold">{Number(designData.breadth_m || 0).toFixed(2)} m</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold">Sarat (T)</span>
                                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">{Number(designData.draft_m || 0).toFixed(3)} m</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold">Koefisien (Cm)</span>
                                      <span className="text-amber-700 dark:text-amber-300 font-bold">{Number(designData.cm || 0.98).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Technical Blueprint SVG Diagram */}
                                <div className="w-full lg:w-80 h-56 bg-slate-50 dark:bg-[#02050e] rounded-xl border border-slate-200 dark:border-slate-800/90 p-3 flex items-center justify-center relative overflow-hidden shadow-2xs shrink-0">
                                  <svg className="w-full h-full" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                      {/* Hatch Pattern for Shaded Area Am */}
                                      <pattern id="hatch-midship-am" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                                        <line x1="0" y1="0" x2="0" y2="8" stroke="#0284c7" strokeWidth="1.2" strokeOpacity="0.45" />
                                      </pattern>
                                    </defs>

                                    {/* Centerline Line and Symbol */}
                                    <line x1="180" y1="15" x2="180" y2="195" stroke="#64748b" strokeWidth="1" strokeDasharray="6,3,2,3" />
                                    {/* CL symbol */}
                                    <text x="180" y="208" fill="#64748b" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">℄</text>

                                    {/* Upper Deck Outline with Camber */}
                                    <path d="M 60,55 Q 180,45 300,55" fill="none" stroke="#475569" strokeWidth="1.5" />

                                    {/* Topsides Hull Outline above Waterline */}
                                    <line x1="60" y1="55" x2="60" y2="90" stroke="#475569" strokeWidth="1.5" />
                                    <line x1="300" y1="55" x2="300" y2="90" stroke="#475569" strokeWidth="1.5" />

                                    {/* Waterline (W - L) */}
                                    <line x1="35" y1="90" x2="325" y2="90" stroke="#0284c7" strokeWidth="1.5" />
                                    <text x="45" y="83" fill="#0284c7" fontSize="13" fontWeight="bold" fontFamily="serif">W</text>
                                    <text x="315" y="83" fill="#0284c7" fontSize="13" fontWeight="bold" fontFamily="serif">L</text>

                                    {/* Submerged Hull Shaded Area Am (Cross Section below WL) */}
                                    <path
                                      d="M 60,90 L 60,150 Q 60,170 85,170 L 275,170 Q 300,170 300,150 L 300,90 Z"
                                      fill="url(#hatch-midship-am)"
                                      stroke="#0284c7"
                                      strokeWidth="2"
                                    />

                                    {/* Center Am Text Badge */}
                                    <g>
                                      <rect x="155" y="118" width="50" height="22" rx="4" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                                      <text x="180" y="133" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Am</text>
                                    </g>

                                    {/* Dimension T (Draft) on Right */}
                                    <line x1="300" y1="90" x2="335" y2="90" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="275" y1="170" x2="335" y2="170" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="330" y1="92" x2="330" y2="168" stroke="#059669" strokeWidth="1.2" />
                                    {/* Dimension Arrows for T */}
                                    <polygon points="330,90 327,97 333,97" fill="#059669" />
                                    <polygon points="330,170 327,163 333,163" fill="#059669" />
                                    <text x="345" y="134" fill="#059669" fontSize="12" fontWeight="bold" textAnchor="start" fontFamily="monospace">T</text>

                                    {/* Dimension B (Breadth) on Bottom */}
                                    <line x1="60" y1="170" x2="60" y2="195" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="300" y1="170" x2="300" y2="195" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1="62" y1="190" x2="298" y2="190" stroke="#0284c7" strokeWidth="1.2" />
                                    {/* Dimension Arrows for B */}
                                    <polygon points="60,190 67,187 67,193" fill="#0284c7" />
                                    <polygon points="300,190 293,187 293,193" fill="#0284c7" />
                                    <text x="180" y="185" fill="#0284c7" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">B</text>
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {/* 3. HASIL PEMBACAAN NUMERIK ORDINAT STATION (0 S.D 20) */}
                            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl space-y-4 font-mono text-xs shadow-xs dark:shadow-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">
                                <div className="flex items-center space-x-2">
                                  <span>📊 3. HASIL PEMBACAAN NUMERIK ORDINAT STATION (0 S.D 20)</span>
                                </div>
                                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                                  Luas Midship Am = <span className="text-slate-900 dark:text-white font-bold">{currentAm.toFixed(2)} m²</span> (Am = B x T x Cm = {Number(designData.breadth_m || 0).toFixed(2)}m x {Number(designData.draft_m || 0).toFixed(3)}m x {Number(designData.cm || 0.98).toFixed(2)})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                                {computedStationData.map((st) => (
                                  <div key={`st-card-${st.station}`} className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-2xs">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">St. {st.station}</div>
                                    <div className="font-bold text-cyan-700 dark:text-cyan-400 text-xs">{st.pctAm.toFixed(1)}% Am</div>
                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{st.areaM2.toFixed(1)} m²</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 4 & 5. KURVA CSA REAL-TIME & HASIL INTEGRASI SIMPSON 1/3 */}
                            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl space-y-5 font-mono shadow-xs dark:shadow-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center space-x-2 text-cyan-700 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider">
                                    <span>📈 4 & 5. KURVA CSA REAL-TIME & HASIL INTEGRASI SIMPSON 1/3</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                    Kurva CSA dihitung dari 21 ordinat luasan station (Luas = % Am × Am) dengan Luas Midship <span className="text-slate-900 dark:text-white font-semibold">Am = B x T x Cm = {currentAm.toFixed(2)} m²</span>.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-amber-800 dark:text-amber-300 font-bold text-[11px] bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 px-3 py-1 rounded-lg">
                                    Am = B x T x Cm = {currentAm.toFixed(2)} m²
                                  </span>
                                  <span className="text-cyan-800 dark:text-cyan-400 font-bold text-[11px] bg-cyan-50 dark:bg-slate-900 border border-cyan-300 dark:border-cyan-500/30 px-3 py-1 rounded-lg">
                                    Rule Integrasi: <span className="text-slate-900 dark:text-white">Simpson 1/3 (21 Station)</span>
                                  </span>
                                </div>
                              </div>

                              {/* Real-time CSA Curve Plot with Midship Am Indicator */}
                              <div className="w-full h-72 bg-slate-50 dark:bg-[#02050e] rounded-xl border border-slate-200 dark:border-slate-800 p-4 relative overflow-hidden flex items-center justify-center shadow-inner">
                                <svg className="w-full h-full" viewBox="0 0 1000 280" preserveAspectRatio="none">
                                  {computedStationData.map((_, idx) => {
                                    const x = 50 + (idx / 20) * 900;
                                    return <line key={`csa-grid-v-${idx}`} x1={x} y1="20" x2={x} y2="230" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="2,2" />;
                                  })}
                                  <line x1="50" y1="230" x2="950" y2="230" stroke="#64748b" strokeWidth="1.5" />
                                  <path
                                    d={`M 50,230 ${computedStationData.map((st, idx) => {
                                      const x = 50 + (idx / 20) * 900;
                                      const y = 230 - (st.pctAm / 100) * 190;
                                      return `L ${x},${y}`;
                                    }).join(" ")} L 950,230 Z`}
                                    fill="rgba(2, 132, 199, 0.15)"
                                    stroke="#0284c7"
                                    strokeWidth="2.5"
                                  />
                                  {/* Apex Midship Label at Station 10 */}
                                  <g key="csa-midship-tag">
                                    <line x1="500" y1="22" x2="500" y2="38" stroke="#d97706" strokeWidth="1" strokeDasharray="2,2" />
                                    <rect x="390" y="8" width="220" height="20" rx="5" fill="#ffffff" stroke="#d97706" strokeWidth="1" />
                                    <text x="500" y="22" fill="#b45309" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                      St. 10 Midship: Am = {currentAm.toFixed(2)} m² (100%)
                                    </text>
                                  </g>
                                  {computedStationData.map((st, idx) => {
                                    const x = 50 + (idx / 20) * 900;
                                    const y = 230 - (st.pctAm / 100) * 190;
                                    return (
                                      <g key={`csa-node-${idx}`}>
                                        <title>{`Station ${idx}: ${st.pctAm.toFixed(1)}% Am | Luas = ${st.areaM2.toFixed(2)} m² (Am = B x T x Cm = ${currentAm.toFixed(2)} m²)`}</title>
                                        <circle cx={x} cy={y} r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
                                        <text x={x} y="252" fill="#334155" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{idx}</text>
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>

                              {/* 4 Hydrostatic Result Cards */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">VOLUME DISPLACEMENT (V)</div>
                                  <div className="text-xl font-black text-cyan-700 dark:text-cyan-400">{simpsonVolumeM3.toFixed(2)} m³</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Volume = (h / 3) * Jumlah(Faktor * Luas)</div>
                                  <div className="text-[9px] text-slate-500 font-mono">h = {stationInterval.toFixed(2)}m | Am = {currentAm.toFixed(2)} m²</div>
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">TONASE DISPLACEMENT (Δ)</div>
                                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">{simpsonDisplacementTon.toFixed(2)} Ton</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Displacement = Volume * 1.025</div>
                                  <div className="text-[9px] text-slate-500 font-mono">Massa Jenis Air Laut = 1.025 ton/m³</div>
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">KOEFISIEN PRISMA (CP)</div>
                                  <div className="text-xl font-black text-amber-700 dark:text-amber-400">{calculatedCp.toFixed(3)}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Cp = Volume / (Lbp * Am)</div>
                                  <div className="text-[9px] text-slate-500 font-mono">Am = B x T x Cm ({currentAm.toFixed(2)} m²)</div>
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">TITIK BERAT LCB (DARI AP)</div>
                                  <div className="text-xl font-black text-slate-900 dark:text-white">{calculatedLcbM.toFixed(2)} m</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">LCB = Total_Momen / Total_Luas</div>
                                  <div className="text-[9px] text-slate-500 font-mono">({lcbPctLbp >= 0 ? `+${lcbPctLbp.toFixed(2)}%` : `${lcbPctLbp.toFixed(2)}%`} dari Midship)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>

                {/* BOTTOM SECTION: ESTIMASI HAMBATAN & DAYA MESIN (NSP POWERING) */}
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 rounded-2xl space-y-6 shadow-xs dark:shadow-2xl">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                      <Activity size={18} />
                    </div>
                    <span>2. Perhitungan Estimasi Daya Mesin (NSP Powering & Resistance)</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Estimasi daya NSP (Navy Sparrows Point) menghitung daya EHP / BHP bersih berdasarkan korelasi koefisien kepenuhan Cb ({designData.cb}), Froude number ({designData.froude_number}), dan target kecepatan dinas Vs ({designData.service_speed_knots || 12} Knot).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/80 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
                    <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl text-center space-y-1 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Daya Hambatan Bersih (EHP)</div>
                      <div className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-400">{designData.ehp_kw?.toFixed(2) || "0.0"} kW</div>
                      <div className="text-[10px] font-mono text-slate-500">{(designData.ehp_kw / 0.7457).toFixed(1)} HP</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl text-center space-y-1 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Efisiensi Propulsi (&eta;p)</div>
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">{designData.propulsive_efficiency || "0.55"}</div>
                      <div className="text-[10px] text-slate-500">Estimasi Efisiensi Lambung & Propeller</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl text-center space-y-1 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Daya Poros Mesin (BHP)</div>
                      <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">{designData.bhp_kw?.toFixed(2) || "0.0"} kW</div>
                      <div className="text-[10px] font-mono text-slate-500">Termasuk Sea Margin {designData.sea_margin_percent}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-0 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col space-y-4 shadow-xs dark:shadow-2xl" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                      <Cpu size={18} />
                    </div>
                    <span>AI Design Companion (Stage 2 Explainer)</span>
                  </h3>
                  {/* Section Explanation Presets */}
                  <div className="space-y-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
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
                          className="py-1.5 px-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950/80 dark:hover:bg-blue-600/20 border border-slate-200 hover:border-blue-300 dark:border-slate-800 dark:hover:border-blue-500/40 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-cyan-300 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-left shadow-2xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat logs */}
                  <div className="flex-1 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50 dark:bg-slate-950/80 p-4 overflow-y-auto space-y-3 no-scrollbar shadow-inner" style={{ minHeight: 0 }}>
                    {aiChat.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 p-6">
                        <Cpu size={32} className="text-blue-500/60 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">AI Stage 2 Design Explainer</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                            Klik salah satu tombol <span className="text-cyan-700 dark:text-cyan-400 font-semibold font-mono">Pilih Section Modul</span> di atas untuk mendapatkan rincian teknis hidrostatik (Alexander Cb, LWT, NSP Powering, GM Stabilitas). Setelah itu Anda dapat mengajukan pertanyaan lanjutan!
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
                                ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 rounded-tl-none"
                                : "bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none whitespace-pre-wrap shadow-2xs"
                            }`}
                          >
                            <p className="font-semibold mb-1.5 opacity-70 text-[10px] uppercase font-mono tracking-wider">
                              {msg.sender === "user" ? "Perancang" : "AI Asisten"}
                            </p>
                            <div className="space-y-2 text-slate-800 dark:text-slate-200">
                              {msg.text.split("\n").filter(l => l.trim() !== "").map((line, lidx) => {
                                const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                
                                if (line.startsWith("# ")) {
                                  return <h1 key={lidx} className="text-sm font-bold text-cyan-700 dark:text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("# ", "") }} />;
                                }
                                if (line.startsWith("## ")) {
                                  return <h2 key={lidx} className="text-xs font-bold text-cyan-700 dark:text-cyan-300 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("## ", "") }} />;
                                }
                                if (line.startsWith("### ")) {
                                  return <h3 key={lidx} className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace("### ", "") }} />;
                                }
                                if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                                  return (
                                    <div key={lidx} className="flex items-start space-x-2 pl-2 my-0.5">
                                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
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
                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 shadow-2xs">
                          <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={14} />
                          <span>AI is analyzing project data...</span>
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
                      placeholder="Ask a question regarding preliminary ship design..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAskAI();
                      }}
                      className="flex-1 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-sans shadow-2xs"
                    />
                    <button
                      onClick={() => handleAskAI()}
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      <Send size={14} />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sleek Floating Toast Notification (replaces blocking browser alerts) */}
      {toast && toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center space-x-3.5 max-w-md ${
              toast.type === "success"
                ? "bg-slate-900/95 border-emerald-500/50 text-white ring-1 ring-emerald-500/30"
                : toast.type === "error"
                ? "bg-slate-900/95 border-rose-500/50 text-white ring-1 ring-rose-500/30"
                : toast.type === "warning"
                ? "bg-slate-900/95 border-amber-500/50 text-white ring-1 ring-amber-500/30"
                : "bg-slate-900/95 border-blue-500/50 text-white ring-1 ring-blue-500/30"
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                toast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : toast.type === "error"
                  ? "bg-rose-500/20 text-rose-400"
                  : toast.type === "warning"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {toast.type === "success" && <CheckCircle size={20} />}
              {toast.type === "error" && <AlertCircle size={20} />}
              {toast.type === "warning" && <AlertTriangle size={20} />}
              {toast.type === "info" && <Info size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white tracking-wide">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast((prev) => (prev ? { ...prev, show: false } : null))}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
