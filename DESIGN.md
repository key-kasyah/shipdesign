---
name: SHIP DESIGN AI — Precision Atelier
description: A precise naval engineering workspace for engineers, academics, and reviewers.
colors:
  surface-canvas: "#F4F3EE"
  surface-canvas-dark: "#171D22"
  surface-primary: "#FFFFFF"
  surface-primary-dark: "#20282F"
  surface-secondary: "#ECEEE9"
  surface-secondary-dark: "#27323B"
  surface-elevated: "#FFFFFF"
  surface-elevated-dark: "#303D47"
  surface-inset: "#E8ECE8"
  surface-inset-dark: "#141B20"
  surface-engineering: "#FFFFFF"
  surface-engineering-dark: "#101A20"
  surface-selected: "#E0EFEC"
  surface-selected-dark: "#203D40"
  border-subtle: "#DDE2DD"
  border-subtle-dark: "#303F49"
  border-default: "#C4CECA"
  border-default-dark: "#455762"
  border-strong: "#7B8984"
  border-strong-dark: "#81939E"
  text-primary: "#252B30"
  text-primary-dark: "#E9EFEE"
  text-secondary: "#53615D"
  text-secondary-dark: "#B5C2C5"
  text-tertiary: "#65716D"
  text-tertiary-dark: "#9AAFB5"
  accent-primary: "#176B70"
  accent-primary-dark: "#7EC6C7"
  accent-hover: "#12585D"
  accent-hover-dark: "#9CD9D8"
  text-on-accent: "#FFFFFF"
  text-on-accent-dark: "#102326"
  focus-ring: "#176B70"
  focus-ring-dark: "#7EC6C7"
  status-success: "#276248"
  status-success-dark: "#9AD4B0"
  status-success-subtle: "#EAF3ED"
  status-success-subtle-dark: "#21362B"
  status-success-border: "#99B5A2"
  status-success-border-dark: "#557860"
  status-warning: "#84500F"
  status-warning-dark: "#EBC17A"
  status-warning-subtle: "#FFF2DB"
  status-warning-subtle-dark: "#392F20"
  status-warning-border: "#C7A777"
  status-warning-border-dark: "#887246"
  status-danger: "#A53738"
  status-danger-dark: "#F0A3A3"
  status-danger-subtle: "#FBECEE"
  status-danger-subtle-dark: "#3B252B"
  status-danger-border: "#D39B9E"
  status-danger-border-dark: "#985D67"
  status-info: "#275E85"
  status-info-dark: "#A2C9EE"
  status-info-subtle: "#EAF1F8"
  status-info-subtle-dark: "#233442"
  status-info-border: "#9FBAD0"
  status-info-border-dark: "#567A97"
  chart-primary: "#176B70"
  chart-primary-dark: "#7EC6C7"
  chart-secondary: "#5265A6"
  chart-secondary-dark: "#B0BCEE"
  chart-tertiary: "#98602E"
  chart-tertiary-dark: "#DEB17D"
  chart-reference: "#65716D"
  chart-reference-dark: "#9AAFB5"
  overlay: "#101A2099"
  overlay-dark: "#080D12CC"
  chart-waterline-0: "#176B70"
  chart-waterline-0-dark: "#7EC6C7"
  chart-waterline-1: "#5265A6"
  chart-waterline-1-dark: "#B0BCEE"
  chart-waterline-2: "#98602E"
  chart-waterline-2-dark: "#DEB17D"
  chart-waterline-3: "#407349"
  chart-waterline-3-dark: "#9AD4B0"
  chart-waterline-4: "#9A466F"
  chart-waterline-4-dark: "#E7A0C2"
  chart-waterline-5: "#536E81"
  chart-waterline-5-dark: "#9DBCCC"
  chart-waterline-6: "#776A32"
  chart-waterline-6-dark: "#C9BD7B"
  chart-waterline-7: "#805DA0"
  chart-waterline-7-dark: "#C5A8E6"
  chart-waterline-8: "#0C7588"
  chart-waterline-8-dark: "#74D4E0"
  chart-waterline-9: "#8A4C43"
  chart-waterline-9-dark: "#E5ACA3"
  chart-waterline-10: "#5E7040"
  chart-waterline-10-dark: "#B4CA91"
  chart-waterline-11: "#765F52"
  chart-waterline-11-dark: "#D7BFA8"
typography:
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "34px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
  numeric:
    fontFamily: "Geist Mono, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "21px"
rounded:
  control: "6px"
  panel: "8px"
  dialog: "12px"
spacing:
  micro: "4px"
  tight: "8px"
  compact: "12px"
  group: "16px"
  section: "24px"
  page: "32px"
  major: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
    height: "36px"
---

## Overview

Precision Atelier is the user's approved Option A. The visual authority is output/pdf/SHIP-DESIGN-AI_Precision-Atelier_Design-Brief.pdf (44 pages). Keep this direction: matte porcelain and graphite, restrained mineral teal, measured typography, aligned engineering data, and a drawing-led workspace. The audience balances engineer, academic, and reviewer needs. This is an Operate interface; existing project information and controls are the product.

The implementation is presentation-only. The original system remains authoritative for business behavior. Do not add latent features depicted by illustrative mockups. Preserve API methods, payloads and request order; calculations and units; stage gates; validation behavior; import parsing and timing; localStorage keys; keyboard shortcuts; SVG geometry, pointer handlers, and mounted editor instances. Do not alter backend, project data, dependencies, providers, or the fairing engine as part of design work.

## Colors

CSS in frontend/src/app/globals.css is the implementation source. All theme roles are CSS custom properties, exposed through Tailwind's inline theme. The light theme is porcelain (#F4F3EE), white sheets, graphite text (#252B30), and teal (#176B70). Dark uses graphite canvas (#171D22), restrained layered sheets (#20282F), pale text (#E9EFEE), and mineral teal (#7EC6C7). Use text-on-accent on primary controls in both themes.

Success, warning, danger, and information have independent foreground, background, and border tokens. Pair status color with existing text or an icon. Use selected surface color for reference rows, not solid accent across large panels. Borders separate working regions without glows.

EngineeringPalette.tsx maps colors only at the browser paint boundary. Original waterline colors remain in data and payloads. Preserve the original alpha, geometry, distinction between series, hatch, and dash semantics. Chart geometry is meaningful, not decorative imagery.

## Typography

Use the existing next/font Geist and Geist Mono imports. Headings 28/34 at desktop and 24/30 on mobile; workstation title 22px; section titles 18px; body 14/21; metadata 12/18. Keep numeric data tabular. Use monospace for identifiers, coordinates, units and formulas; use the sans family for descriptive UI. Explanations should remain near 65–75 characters per line. SVG annotations retain engineering coordinate scaling and are inspected within zoomable/scrollable drawings rather than treated as body text.

## Layout

The desktop shell sidebar is 216px and its existing collapsed state hides it entirely. Preserve the existing mobile drawer below 1024px. The top shell header is 56px. Page gutters are 24px, increasing to 32px at 1440px; mobile gutters are 16px. Forms cap at 1120px; import at 800px; data and engineering workspaces remain fluid.

Dashboard uses a quiet project count and one table. Project list keeps all original sort fields, search and vessel filter. New project and Stage1 use a sequential form sheet. Stage2 reference ships are comparable rows: identity and provenance, match status, four aligned measurements, selection action. Workstation tabs scroll horizontally at narrow widths. Tables and drawings scroll locally without squeezing operational content. Stage3 retains all existing mounted panels and fullscreen behavior.

## Elevation & Depth

Resting workspaces are flat, with matte surface changes and 1px dividers. Only floating overlays may use the shared shadow (light: 0 8px 28px #10232622; dark: 0 8px 28px #00000055). Do not add gradients, background blur, glows, glass panels, or a shadow to every container.

## Shapes

Controls use 6px corners, sheets 8px, dialogs 12px. Small chips can be pill shaped. Preserve a rectilinear drawing instrument feel, ample separators, and alignment. Avoid nested decorative cards. Mobile controls must provide a 44px touch height; desktop form inputs are at least 40px and ordinary buttons at least 36px.

## Components

Primary actions use mineral teal with on-accent text. Secondary actions have a neutral border and sheet background. Focus is a 2px contrasting outline with a 2px gap; it must not be removed by a utility. Keep all existing loading, disabled, success, warning, error and readonly conditions. Forms expose an accessible name without changing validation or input types.

Navigation marks the current destination. Stage locks preserve the existing decision logic; locked Stage2 tabs still explain their lock when clicked. The theme button names its alternate action; there is no System theme, language switch, density setting, notification feature, or extra menu. Layer switches retain their existing state and handlers, with a clear track, thumb and accessible pressed state.

Motion is limited to short state color changes (140–150ms); no decorative entrances, chart tweening or number counting. Reduced motion keeps state legible with static loading text/icons. Never animate pointer geometry or modify the timing of save, import, toast, or calculation routines.

## Do's and Don'ts

- Do consult the agreed brief and this system together with source behavior.
- Do validate both themes at 390, 768, 1024, 1366, 1440 and 1920px.
- Do use Impeccable for context, craft and final audit; UI/UX Pro Max for focused accessibility/layout guidance; Emil design engineering for restrained interaction details. Web Interface Guidelines are a technical check, not permission to change product behavior.
- Do verify behavior against tmp/atelier-baseline/src and isolate browser API fixtures from actual project files.
- Don't claim 21st.dev was used: no callable 21st.dev tool was available. Do not install a replacement component kit or reroll the approved design.
- Don't change business logic or backend to eliminate pre-existing lint issues.
- Don't replace native confirmation/alerts, existing defaults, tab mounting, calculations or state restoration with a new workflow.
- Don't use generic purple-blue gradients, glassmorphism, uniform card grids, huge headings, or invented AI illustrations.
