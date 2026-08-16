"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Lock,
  Unlock,
  Settings,
  Menu,
  X,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Cpu,
  Info
} from "lucide-react";

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
        className="group relative flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg text-slate-500 bg-slate-900/30 border border-slate-800/40 cursor-not-allowed select-none transition-all"
        title={`${label} is locked`}
      >
        <span className="mr-3 text-slate-600">{icon}</span>
        <span className="flex-1 tracking-wide">{label}</span>
        {locked && <Lock size={13} className="text-slate-600" />}

        {/* Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-1.5 text-[11px] font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap backdrop-blur-md">
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
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30 font-semibold"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
      }`}
    >
      <span className={`mr-3 ${active ? "text-white" : "text-slate-400"}`}>{icon}</span>
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

  const match = pathname ? pathname.match(/\/projects\/([^\/]+)/) : null;
  const rawId = match ? match[1] : null;
  const projectId = rawId && rawId !== "new" && rawId !== "import" ? rawId : null;

  const [isStage1Validated, setIsStage1Validated] = useState<boolean>(false);

  React.useEffect(() => {
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
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/" },
    {
      label: "Projects",
      icon: <FolderOpen size={18} />,
      href: "/projects",
      active: pathname.startsWith("/projects") && (isProjectsList || isNewProject || isImport)
    }
  ];

  const stagesNav = [
    {
      label: "Tahap 1: Kebutuhan Kapal",
      icon: projectId ? <Unlock size={15} className="text-emerald-400" /> : <Lock size={15} />,
      href: projectId ? `/projects/${projectId}` : "#",
      active: isStage1,
      locked: !projectId,
      tooltip: !projectId ? "Pilih / buat proyek terlebih dahulu" : undefined
    },
    {
      label: "Tahap 2: Pra-Rancangan",
      icon: isStage1Validated ? (
        <Unlock size={15} className="text-emerald-400" />
      ) : (
        <Lock size={15} className="text-slate-600" />
      ),
      href: isStage1Validated ? `/projects/${projectId}/stage2` : "#",
      locked: !isStage1Validated,
      active: isStage2,
      tooltip: !projectId
        ? "Pilih / buat proyek terlebih dahulu"
        : !isStage1Validated
        ? "Klik 'Simpan & Validasi Draft' di Tahap 1 terlebih dahulu"
        : undefined
    },
    {
      label: "Tahap 3: Basic Design",
      icon: isStage1Validated ? (
        <Unlock size={15} className="text-emerald-400" />
      ) : (
        <Lock size={15} className="text-slate-600" />
      ),
      href: isStage1Validated ? `/projects/${projectId}/stage3` : "#",
      locked: !isStage1Validated,
      active: isStage3,
      tooltip: !projectId
        ? "Pilih / buat proyek terlebih dahulu"
        : !isStage1Validated
        ? "Selesaikan Tahap 1 terlebih dahulu"
        : undefined
    },
    { label: "Tahap 4: Detail Design", icon: <Lock size={15} />, href: "#", locked: true, active: false },
    { label: "Tahap 5: Production Design", icon: <Lock size={15} />, href: "#", locked: true, active: false },
    { label: "Tahap 6: Konstruksi", icon: <Lock size={15} />, href: "#", locked: true, active: false },
    { label: "Tahap 7: Testing & Delivery", icon: <Lock size={15} />, href: "#", locked: true, active: false }
  ];

  const headerBadge = isStage3
    ? "Tahap 3 — Basic Design (Rencana Garis)"
    : isStage2
    ? "Tahap 2 — Pra-Rancangan"
    : isStage1
    ? "Tahap 1 — Kebutuhan Kapal"
    : isNewProject
    ? "Inisialisasi Proyek Baru"
    : isProjectsList
    ? "Database Proyek"
    : isImport
    ? "Import Proyek"
    : "Platform Rancang Bangun";

  const footerStatus = isStage3
    ? "Tahap 3 Active"
    : isStage2
    ? "Tahap 2 Active"
    : isStage1
    ? "Tahap 1 Active"
    : isNewProject
    ? "Inisialisasi Proyek"
    : isProjectsList
    ? "Database Proyek"
    : "System Active";

  return (
    <div className="flex h-screen bg-[#070B12] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header with UNHAS Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-slate-950 border border-slate-700/80 shadow-md group-hover:border-cyan-400/60 transition-colors shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/unhas-logo.png" 
                alt="Logo Universitas Hasanuddin" 
                className="object-contain w-full h-full"
                loading="eager"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent truncate">
                SHIP DESIGN AI
              </span>
              <span className="text-[10px] font-medium text-slate-400 -mt-0.5 truncate">
                Universitas Hasanuddin
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3.5 py-6 space-y-6">
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Main Menu
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
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Design Stages Flow
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
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold">
              NA
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Naval Architect</p>
              <p className="text-[10px] font-mono text-slate-400">
                {footerStatus}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#070B12]">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <button
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm md:text-base font-semibold text-slate-100 tracking-wide flex items-center space-x-3">
              <span className="hidden sm:inline font-medium text-slate-300">Platform Rancang Bangun Kapal Terintegrasi AI</span>
              <span className="text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium tracking-wide">
                {headerBadge}
              </span>
            </h1>
          </div>
          <div className="flex items-center space-x-2.5 text-xs bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-lg shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-mono text-[11px] tracking-tight">Engine Connected</span>
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
