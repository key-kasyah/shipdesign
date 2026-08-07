# Ship Design AI Platform - Frontend Web UI

Aplikasi antarmuka web modern untuk mengelola data kebutuhan kapal (**Tahap 1 — Kebutuhan Kapal / Design Requirements**) yang terintegrasi dengan asisten cerdas AI.

## 🚀 Teknologi Utama
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Icon Pack**: Lucide React
- **Backend API**: Python FastAPI (server.py)

---

## 🛠️ Cara Menjalankan Aplikasi

### 1. Jalankan Backend Server (Python FastAPI)
Di root folder repositori:
```bash
python server.py
```
Server backend akan berjalan di: `http://localhost:8000`

### 2. Jalankan Frontend Server (Next.js)
Di folder `/frontend`:
```bash
npm run dev
```
Akses UI melalui peramban web di alamat: `http://localhost:3000`

---

## 🧪 Cara Menjalankan Pengujian

### 1. Pengujian API Backend (FastAPI)
Di root folder repositori:
```bash
python -m unittest tests/test_api_server.py
```

### 2. Pengujian Frontend UI Client
Di root folder repositori:
```bash
node frontend/src/tests/ui.test.js
```

---

## 📁 Struktur Folder Frontend

```text
frontend/
├── src/
│   ├── app/                # Next.js App Router (Layout & Pages)
│   │   ├── layout.tsx      # Sidebar & header layout wrapper
│   │   ├── page.tsx        # Dashboard analytics page
│   │   ├── projects/       # Projects pages & detail form tabs
│   │   └── settings/       # Settings page placeholder
│   │
│   ├── components/         # Reusable UI component blocks
│   │   └── layout/         # Navigation & sidebar components
│   │
│   ├── services/           # REST API client communication
│   │   └── api.ts          # Axios/fetch typed wrapper
│   │
│   ├── types/              # TypeScript interface schemas
│   │   └── index.ts        # Aligned with Python dataclasses
│   │
│   └── tests/              # Frontend mock unit tests
│       └── ui.test.js      # Mock API test runner
```

---

## 🔒 Safety Guardrails AI Assistant
Panel asisten AI yang disematkan pada UI mematuhi batasan keselamatan Tahap 1. AI secara otomatis menyaring dan menolak kata kunci yang menanyakan estimasi dimensi utama lambung (LOA, Breadth, Draft), koefisien bentuk (Cb, Cm, Cp), displacement, stabilitas, trim, maupun daya mesin utama untuk mematuhi pembatasan penguncian **LOCKED** Tahap 2–7.
