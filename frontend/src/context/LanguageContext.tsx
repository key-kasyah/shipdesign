"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "id" | "en";

export type TranslationObject = { id: string; en: string };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (keyOrObj: string | TranslationObject, fallback?: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Global & Header
  "app.title": {
    id: "SHIP DESIGN AI",
    en: "SHIP DESIGN AI"
  },
  "app.subtitle": {
    id: "Offshore and Subsea Production Research Laboratory - opart",
    en: "Offshore and Subsea Production Research Laboratory - opart"
  },
  "app.platform_title": {
    id: "Platform Rancang Bangun Kapal Terintegrasi AI",
    en: "AI-Integrated Ship Design & Engineering Platform"
  },
  "naval_architect": {
    id: "Naval Architect",
    en: "Naval Architect"
  },
  "system_active": {
    id: "Sistem Aktif",
    en: "System Active"
  },

  // Sidebar Nav
  "nav.main_menu": {
    id: "Menu Utama",
    en: "Main Menu"
  },
  "nav.dashboard": {
    id: "Dashboard",
    en: "Dashboard"
  },
  "nav.projects": {
    id: "Daftar Proyek",
    en: "Projects Database"
  },
  "nav.stages_flow": {
    id: "Tahapan Rancang Bangun",
    en: "Design Stages Flow"
  },
  "nav.stage1": {
    id: "Tahap 1: Kebutuhan Kapal",
    en: "Stage 1: Vessel Requirements"
  },
  "nav.stage2": {
    id: "Tahap 2: Pra-Rancangan",
    en: "Stage 2: Preliminary Design"
  },
  "nav.stage3": {
    id: "Tahap 3: Basic Design",
    en: "Stage 3: Basic Design"
  },
  "nav.stage4": {
    id: "Tahap 4: Detail Design",
    en: "Stage 4: Detail Design"
  },

  // Badges & Stage Headers
  "badge.stage1": {
    id: "Tahap 1 — Kebutuhan Kapal",
    en: "Stage 1 — Vessel Requirements"
  },
  "badge.stage2": {
    id: "Tahap 2 — Pra-Rancangan",
    en: "Stage 2 — Preliminary Design"
  },
  "badge.stage3": {
    id: "Tahap 3 — Basic Design (Rencana Garis)",
    en: "Stage 3 — Basic Design (Lines Plan)"
  },
  "badge.new_project": {
    id: "Inisialisasi Proyek Baru",
    en: "Initialize New Project"
  },
  "badge.projects_list": {
    id: "Database Proyek",
    en: "Projects Database"
  },
  "badge.import_project": {
    id: "Import Proyek JSON",
    en: "Import Project JSON"
  },
  "badge.platform": {
    id: "Platform Rancang Bangun",
    en: "Ship Design Platform"
  },

  // Theme & Language Controls
  "theme.dark": {
    id: "Dark Mode",
    en: "Dark Mode"
  },
  "theme.light": {
    id: "Light Mode",
    en: "Light Mode"
  },
  "theme.toggle_to_dark": {
    id: "Ganti ke Dark Mode",
    en: "Switch to Dark Mode"
  },
  "theme.toggle_to_light": {
    id: "Ganti ke Light Mode",
    en: "Switch to Light Mode"
  },
  "lang.indonesian": {
    id: "Bahasa Indonesia",
    en: "Indonesian"
  },
  "lang.english": {
    id: "English",
    en: "English"
  },
  "lang.switch_to_en": {
    id: "Ganti ke Bahasa Inggris",
    en: "Switch to English"
  },
  "lang.switch_to_id": {
    id: "Ganti ke Bahasa Indonesia",
    en: "Switch to Indonesian"
  },

  // Dashboard Page
  "dashboard.refresh": {
    id: "Refresh Data",
    en: "Refresh Data"
  },
  "dashboard.total_projects": {
    id: "Total Proyek",
    en: "Total Projects"
  },
  "dashboard.draft_revisions": {
    id: "Draft Revisi",
    en: "Draft Revisions"
  },
  "dashboard.waiting_review": {
    id: "Menunggu Review",
    en: "Waiting for Review"
  },
  "dashboard.approved_baselines": {
    id: "Baseline Disetujui",
    en: "Approved Baselines"
  },
  "dashboard.integrity_warnings": {
    id: "Peringatan Integritas Sistem",
    en: "System Integrity Warnings"
  },
  "dashboard.recent_projects": {
    id: "Spesifikasi Proyek Terkini",
    en: "Recent Project Requirements"
  },
  "dashboard.view_all": {
    id: "Lihat semua proyek",
    en: "View all projects"
  },
  "dashboard.quick_actions": {
    id: "Aksi Cepat",
    en: "Quick Actions"
  },
  "dashboard.create_new": {
    id: "Buat Proyek Baru",
    en: "Create New Project"
  },
  "dashboard.import_json": {
    id: "Import File JSON",
    en: "Import JSON File"
  },

  // Projects List Page
  "projects.search_placeholder": {
    id: "Cari Project ID, nama kapal, pemilik...",
    en: "Search Project ID, vessel name, owner..."
  },
  "projects.all_vessel_types": {
    id: "Semua Tipe Kapal",
    en: "All Vessel Types"
  },
  "projects.all_revision_statuses": {
    id: "Semua Status Revisi",
    en: "All Revision Statuses"
  },
  "projects.create_new_btn": {
    id: "Buat Proyek Baru",
    en: "Create New Project"
  },
  "projects.open": {
    id: "Buka",
    en: "Open"
  },
  "projects.delete": {
    id: "Hapus",
    en: "Delete"
  },

  // Common Actions
  "action.save": {
    id: "Simpan",
    en: "Save"
  },
  "action.cancel": {
    id: "Batal",
    en: "Cancel"
  },
  "action.back": {
    id: "Kembali",
    en: "Back"
  },
  "action.export": {
    id: "Ekspor",
    en: "Export"
  },
  "action.import": {
    id: "Import",
    en: "Import"
  },
  "action.calculate": {
    id: "Hitung",
    en: "Calculate"
  },
  "action.validate": {
    id: "Validasi",
    en: "Validate"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("id");

  useEffect(() => {
    const savedLang = localStorage.getItem("app_language") as Language;
    if (savedLang === "en" || savedLang === "id") {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === "id" ? "en" : "id";
    setLanguage(nextLang);
  };

  const t = (keyOrObj: string | TranslationObject, fallback?: string): string => {
    if (typeof keyOrObj === "object" && keyOrObj !== null) {
      return keyOrObj[language] || keyOrObj.id || fallback || "";
    }
    if (typeof keyOrObj === "string") {
      if (translations[keyOrObj] && translations[keyOrObj][language]) {
        return translations[keyOrObj][language];
      }
    }
    return fallback || (typeof keyOrObj === "string" ? keyOrObj : "");
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "id",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (keyOrObj: string | TranslationObject, fallback?: string) => {
        if (typeof keyOrObj === "object" && keyOrObj !== null) {
          return keyOrObj.id;
        }
        return fallback || (typeof keyOrObj === "string" ? keyOrObj : "");
      }
    };
  }
  return context;
};
