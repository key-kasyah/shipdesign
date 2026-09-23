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
  Globe,
  PanelLeftClose
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
        className="group relative flex items-center px-3 py-3 text-sm rounded-md text-text-tertiary cursor-not-allowed select-none"
        aria-disabled="true" tabIndex={0} title={tooltip || `${label} is locked`}
      >
        <span className="mr-2.5 text-text-secondary">{icon}</span>
        <span className="flex-1 leading-5">{label}</span>
        {locked && <Lock size={13} className="text-text-secondary" />}

        {/* Tooltip */}
        <div className="absolute left-0 top-full mt-1 px-3 py-1.5 text-xs font-medium text-text-primary bg-surface-primary border border-border-default rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 pointer-events-none w-full">
          {tooltip || "Please select or create a project first"}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${
        active
          ? "bg-surface-selected text-accent-primary border border-transparent"
          : "text-text-primary hover:bg-surface-secondary hover:text-accent-primary border border-transparent"
      } `}
    >
      <span className={`mr-2.5 ${active ? "text-accent-primary" : "text-text-secondary"} `}>{icon}</span>
      <span className="flex-1 leading-5">{label}</span>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebar_collapsed");
      if (savedCollapsed === "true") {
        setSidebarCollapsed(true);
      }
    } catch (_) {}
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("sidebar_collapsed", String(next));
        } catch (_) {}
        return next;
      });
    }
  };

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
      icon: projectId ? <Unlock size={15} className="text-status-success" /> : <Lock size={15} />,
      href: projectId ? `/projects/${projectId}` : "#",
      active: isStage1,
      locked: !projectId,
      tooltip: !projectId ? (language === "en" ? "Select / create a project first" : "Pilih / buat proyek terlebih dahulu") : undefined
    },
    {
      label: t("nav.stage2", "Tahap 2: Pra-Rancangan"),
      icon: isStage1Validated ? (
        <Unlock size={15} className="text-status-success" />
      ) : (
        <Lock size={15} className="text-text-secondary" />
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
        <Unlock size={15} className="text-status-success" />
      ) : (
        <Lock size={15} className="text-text-secondary" />
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
    <div className="flex h-screen bg-surface-canvas text-text-primary overflow-hidden font-sans">
      <a href="#main-content" className="atelier-skip">Skip to workspace</a>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-primary border-r border-border-default transition-colors duration-300 ease-in-out lg:static ${
          sidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }  ${
          sidebarCollapsed
            ? "lg:invisible lg:-translate-x-full lg:w-0 lg:opacity-0 lg:border-r-0 lg:pointer-events-none"
            : "lg:visible lg:translate-x-0 lg:w-[216px] lg:opacity-100"
        } w-72 sm:w-80 shrink-0 overflow-hidden`}
      >
        <div className="w-72 sm:w-80 lg:w-[216px] flex flex-col h-full shrink-0">
          {/* Sidebar Header with Ship Design Logo */}
          <div className="h-14 flex items-center justify-between pl-4 pr-2 border-b border-border-default shrink-0">
            <Link href="/" className="flex items-center gap-2 group min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-center text-accent-primary shrink-0">
                <Ship size={20} />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="font-semibold text-xs text-text-primary whitespace-nowrap">
                  {t("app.title", "SHIP DESIGN AI")}
                </span>
                <span 
                  className="sr-only"
                  title="Offshore and Subsea Production Research Laboratory - opart"
                >
                  Offshore and Subsea Production Research Laboratory - opart
                </span>
              </div>
            </Link>
            <button aria-label={language === "en" ? "Close Sidebar" : "Tutup Menu"}
              type="button"
              className="atelier-icon-button shrink-0"
              onClick={toggleSidebar}
              title={language === "en" ? "Close Sidebar" : "Tutup Menu"}
            >
              <PanelLeftClose size={18} className="hidden lg:block" />
              <X size={20} className="lg:hidden" />
            </button>
          </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
          <div>
            <span className="px-3 text-xs font-semibold text-text-secondary tracking-normal block mb-2">
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
            <span className="px-3 text-xs font-semibold text-text-secondary tracking-normal block mb-2">
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
        <div className="p-4 border-t border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md text-text-secondary flex items-center justify-center font-medium text-xs shrink-0 border border-border-default">
              NA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{t("naval_architect", "Naval Architect")}</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {footerStatus}
              </p>
            </div>
          </div>
        </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-canvas dark:bg-surface-canvas">
        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-3 sm:px-6 bg-surface-primary border-b border-border-default shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 mr-4">
            <button aria-label={
                sidebarCollapsed
                  ? (language === "en" ? "Show Sidebar" : "Tampilkan Menu")
                  : (language === "en" ? "Hide Sidebar" : "Sembunyikan Menu")
              }
              type="button"
              className="atelier-icon-button shrink-0"
              onClick={toggleSidebar}
              title={
                sidebarCollapsed
                  ? (language === "en" ? "Show Sidebar" : "Tampilkan Menu")
                  : (language === "en" ? "Hide Sidebar" : "Sembunyikan Menu")
              }
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col xl:flex-row xl:items-center xl:gap-4 min-w-0">
              <span className="sr-only">
                {t("app.title", "SHIP DESIGN AI")}
              </span>
              <span className="text-sm font-medium text-text-primary truncate">
                {headerBadge}
              </span>
              {projectId && (
                <span className="text-xs font-mono text-text-secondary">
                  {projectId}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            {/* Light / Dark Mode Switcher */}
            <button aria-label={theme === "light" ? t("theme.toggle_to_dark", "Ganti ke Dark Mode") : t("theme.toggle_to_light", "Ganti ke Light Mode")}
              onClick={toggleTheme}
              className="atelier-button atelier-button-secondary"
              title={theme === "light" ? t("theme.toggle_to_dark", "Ganti ke Dark Mode") : t("theme.toggle_to_light", "Ganti ke Light Mode")}
            >
              {theme === "light" ? (
                <>
                  <Moon size={14} className="text-text-primary" />
                  <span className="font-semibold text-text-primary hidden sm:inline">{t("theme.dark", "Dark Mode")}</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-status-warning" />
                  <span className="font-semibold text-text-primary hidden sm:inline">{t("theme.light", "Light Mode")}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Window */}
        <main id="main-content" tabIndex={-1} className={`min-h-0 flex-1 ${isStage2 ? "overflow-hidden p-0" : isStage3 ? "overflow-y-auto p-0" : "overflow-y-auto atelier-main-padding"} `}>
          {children}
        </main>
      </div>
    </div>
  );
}
