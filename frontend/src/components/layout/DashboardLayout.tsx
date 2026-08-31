"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Lock,
  Unlock,
  Menu,
  X,
  Ship,
  Sun,
  Moon,
  Globe
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface SidebarItemProps {
  label: string;
  icon: React.ReactNode;
  href: string;
  active: boolean;
  disabled?: boolean;
  locked?: boolean;
  tooltip?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  icon,
  href,
  active,
  disabled = false,
  locked = false,
  tooltip
}) => {
  if (disabled || locked) {
    return (
      <div
        className="group relative flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/40 cursor-not-allowed select-none transition-all"
        title={`${label} is locked`}
      >
        <span className="mr-3 text-slate-400 dark:text-slate-600">{icon}</span>
        <span className="flex-1 tracking-wide">{label}</span>
        {locked && <Lock size={13} className="text-slate-400 dark:text-slate-600" />}

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap backdrop-blur-md">
          {tooltip || "Pilih / buat proyek terlebih dahulu"}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/30 font-semibold"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
      }`}
    >
      <span className={`mr-3 ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>{icon}</span>
      <span className="flex-1 tracking-wide">{label}</span>
    </Link>
  );
};

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const match = pathname ? pathname.match(/\/projects\/([^\/]+)/) : null;
  const rawId = match ? match[1] : null;
  const projectId = rawId && rawId !== "new" && rawId !== "import" ? rawId : null;

  const [isStage1Validated, setIsStage1Validated] = useState<boolean>(false);

  useEffect(() => {
    if (!projectId) {
      setIsStage1Validated(false);
      return;
    }

    const checkValidationStatus = () => {
      const isVal = localStorage.getItem(`stage1_validated_${projectId}`) === "true";
      setIsStage1Validated(isVal);
    };

    checkValidationStatus();

    window.addEventListener("stage1-validated", checkValidationStatus);
    window.addEventListener("storage", checkValidationStatus);
    return () => {
      window.removeEventListener("stage1-validated", checkValidationStatus);
      window.removeEventListener("storage", checkValidationStatus);
    };
  }, [projectId]);

  const isNewProject = pathname === "/projects/new";
  const isProjectsList = pathname === "/projects";
  const isImport = pathname === "/projects/import";
  const isStage3 = Boolean(projectId && pathname.includes("/stage3"));
  const isStage2 = Boolean(projectId && pathname.includes("/stage2"));
  const isStage1 = Boolean(projectId && !isStage2 && !isStage3 && pathname.startsWith("/projects/"));

  const mainNav = [
    { label: t("nav.dashboard", "Dashboard"), icon: <LayoutDashboard size={18} />, href: "/" },
    {
      label: t("nav.projects", "Projects"),
      icon: <FolderOpen size={18} />,
      href: "/projects",
      active: pathname.startsWith("/projects") && (isProjectsList || isNewProject || isImport)
    }
  ];

  const stagesNav = [
    {
      label: t("nav.stage1", "Tahap 1: Kebutuhan Kapal"),
      icon: projectId ? <Unlock size={15} className="text-emerald-500 dark:text-emerald-400" /> : <Lock size={15} />,
      href: projectId ? `/projects/${projectId}` : "#",
      active: isStage1,
      locked: !projectId,
      tooltip: !projectId ? (language === "en" ? "Select / create a project first" : "Pilih / buat proyek terlebih dahulu") : undefined
    },
    {
      label: t("nav.stage2", "Tahap 2: Pra-Rancangan"),
      icon: isStage1Validated ? (
        <Unlock size={15} className="text-emerald-500 dark:text-emerald-400" />
      ) : (
        <Lock size={15} className="text-slate-400 dark:text-slate-600" />
      ),
      href: isStage1Validated ? `/projects/${projectId}/stage2` : "#",
      locked: !isStage1Validated,
      active: isStage2,
      tooltip: !projectId
        ? (language === "en" ? "Select / create a project first" : "Pilih / buat proyek terlebih dahulu")
        : !isStage1Validated
        ? (language === "en" ? "Click 'Save & Validate Draft' in Stage 1 first" : "Klik 'Simpan & Validasi Draft' di Tahap 1 terlebih dahulu")
        : undefined
    },
    {
      label: t("nav.stage3", "Tahap 3: Basic Design"),
      icon: isStage1Validated ? (
        <Unlock size={15} className="text-emerald-500 dark:text-emerald-400" />
      ) : (
        <Lock size={15} className="text-slate-400 dark:text-slate-600" />
      ),
      href: isStage1Validated ? `/projects/${projectId}/stage3` : "#",
      locked: !isStage1Validated,
      active: isStage3,
      tooltip: !projectId
        ? (language === "en" ? "Select / create a project first" : "Pilih / buat proyek terlebih dahulu")
        : !isStage1Validated
        ? (language === "en" ? "Complete Stage 1 first" : "Selesaikan Tahap 1 terlebih dahulu")
        : undefined
    },
    { label: t("nav.stage4", "Tahap 4: Detail Design"), icon: <Lock size={15} />, href: "#", locked: true, active: false }
  ];

  const headerBadge = isStage3
    ? t("badge.stage3", "Tahap 3 — Basic Design (Rencana Garis)")
    : isStage2
    ? t("badge.stage2", "Tahap 2 — Pra-Rancangan")
    : isStage1
    ? t("badge.stage1", "Tahap 1 — Kebutuhan Kapal")
    : isNewProject
    ? t("badge.new_project", "Inisialisasi Proyek Baru")
    : isProjectsList
    ? t("badge.projects_list", "Database Proyek")
    : isImport
    ? t("badge.import_project", "Import Proyek")
    : t("badge.platform", "Platform Rancang Bangun");

  const footerStatus = isStage3
    ? (language === "en" ? "Stage 3 Active" : "Tahap 3 Active")
    : isStage2
    ? (language === "en" ? "Stage 2 Active" : "Tahap 2 Active")
    : isStage1
    ? (language === "en" ? "Stage 1 Active" : "Tahap 1 Active")
    : isNewProject
    ? (language === "en" ? "Initializing Project" : "Inisialisasi Proyek")
    : isProjectsList
    ? (language === "en" ? "Projects Database" : "Database Proyek")
    : t("system_active", "System Active");

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 shrink-0 flex flex-col bg-white dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header with Ship Design Logo */}
        <div className="min-h-16 h-auto py-3.5 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
          <Link href="/" className="flex items-center space-x-3 group min-w-0 flex-1 overflow-hidden">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Ship size={20} className="text-white" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="font-black text-sm tracking-wide text-slate-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-cyan-300 dark:bg-clip-text truncate">
                {t("app.title", "SHIP DESIGN AI")}
              </span>
              <span 
                className="text-[9.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2 break-words" 
                title="Offshore and Subsea Production Research Laboratory - opart"
              >
                Offshore and Subsea Production Research Laboratory - opart
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shrink-0 ml-2"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3.5 py-6 space-y-6">
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
              {t("nav.main_menu", "Main Menu")}
            </span>
            <div className="space-y-1">
              {mainNav.map((item) => (
                <SidebarItem
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  href={item.href}
                  active={pathname === item.href}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
              {t("nav.stages_flow", "Design Stages Flow")}
            </span>
            <div className="space-y-1">
              {stagesNav.map((stage) => (
                <SidebarItem
                  key={stage.label}
                  label={stage.label}
                  icon={stage.icon}
                  href={stage.href}
                  active={stage.active}
                  locked={stage.locked}
                  tooltip={stage.tooltip}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-indigo-500/20 flex items-center justify-center border border-blue-600/20 dark:border-indigo-500/30 text-blue-600 dark:text-indigo-400 font-mono text-xs font-bold shrink-0">
              NA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{t("naval_architect", "Naval Architect")}</p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {footerStatus}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50 dark:bg-[#070B12]">
        {/* Top Header */}
        <header className="min-h-16 h-auto py-2.5 flex items-center justify-between px-6 bg-white/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-4 min-w-0 flex-1 mr-4">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 tracking-wide flex items-center space-x-3 min-w-0 flex-wrap gap-y-1">
              <span className="hidden sm:inline font-medium text-slate-600 dark:text-slate-300 truncate">
                {t("app.platform_title", "Platform Rancang Bangun Kapal Terintegrasi AI")}
              </span>
              <span className="text-[11px] bg-blue-50 dark:bg-indigo-500/10 text-blue-700 dark:text-indigo-300 border border-blue-200 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium tracking-wide whitespace-nowrap">
                {headerBadge}
              </span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            {/* Language Switcher (ID / EN) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-2 text-xs bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
              title={language === "id" ? t("lang.switch_to_en", "Ganti ke Bahasa Inggris") : t("lang.switch_to_id", "Switch to Indonesian")}
            >
              <Globe size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {language === "id" ? "ID" : "EN"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                ({language === "id" ? "IND" : "ENG"})
              </span>
            </button>

            {/* Light / Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 text-xs bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
              title={theme === "light" ? t("theme.toggle_to_dark", "Ganti ke Dark Mode") : t("theme.toggle_to_light", "Ganti ke Light Mode")}
            >
              {theme === "light" ? (
                <>
                  <Moon size={14} className="text-slate-700" />
                  <span className="font-semibold text-slate-700 hidden sm:inline">{t("theme.dark", "Dark Mode")}</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span className="font-semibold text-slate-200 hidden sm:inline">{t("theme.light", "Light Mode")}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Window */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
