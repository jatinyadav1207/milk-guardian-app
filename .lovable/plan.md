

# MilkGuard — Installable Mobile App (PWA)

## Approach: Progressive Web App (PWA)

To make MilkGuard a standalone, shareable app that works on any phone without app stores, we'll build it as a **PWA (Progressive Web App)**. Users visit the URL, tap "Add to Home Screen," and it opens like a native app — full screen, with its own icon, works offline.

No third-party apps needed. You can share the published URL with anyone.

---

## Milk Quality Reference Data & Detection Logic

Based on published dairy science data, here are the baselines for pure milk:

| Parameter | Normal Range | What Abnormal Means |
|-----------|-------------|---------------------|
| **pH** | 6.5 – 6.8 | <6.5: acid/sour milk; >6.8: soda/neutralizer added |
| **TDS** (ppm) | 700 – 1200 | <700: water dilution; >1200: salt/sugar/urea added |
| **Gas (MQ-135)** | 0 – 50 (arbitrary units) | >50: ammonia/alcohol detected (decomposition or adulterant) |

**Detection rules built into the app:**
- **Water dilution**: TDS < 700 AND pH normal
- **Soda/Detergent**: pH > 6.8
- **Acid/Sour milk**: pH < 6.5
- **Urea/Salt/Sugar**: TDS > 1200 AND pH normal
- **Ammonia/Alcohol**: Gas > 50
- **Multiple adulterants**: 2+ rules triggered
- **Pure**: All values in normal range

---

## What Will Be Built

### 1. PWA Setup
- Add `manifest.json` with MilkGuard name, teal theme color, and icons
- Add mobile meta tags to `index.html` (viewport, theme-color, apple-touch-icon)
- No service worker (keeps things simple; installability works with just the manifest)

### 2. App Structure (4 pages + sidebar)
- **Sidebar**: MilkGuard branding, nav links, device status indicator
- **Dashboard** (`/`): Stats cards, live sensor gauges (pH/TDS/Gas) with color-coded bars, recent tests, quality verdict banner
- **Test History** (`/test-history`): Searchable list of past tests with results
- **Baselines** (`/baselines`): View/edit normal ranges for each sensor
- **Settings** (`/settings`): ESP32 connection info, integration guide, detection rules reference

### 3. Detection Engine
- `src/utils/milkAnalysis.ts` — pure function that takes sensor readings and returns verdict + detected contaminants using the rules above
- Default baselines pre-loaded with the scientific values

### 4. Data & State
- All data in `localStorage` (tests, baselines, settings)
- React context for device connection state and sensor readings
- Demo/simulate mode to test without ESP32 connected

### 5. Premium UI Design
- Deep teal primary (`#0D9488`), dark navy text, light gray background
- Color-coded results: emerald (pure), red (adulterated), amber (warning)
- Polished cards with gradients, smooth animations
- Fully responsive — optimized for mobile-first usage
- App title: **MilkGuard**

### 6. Files to Create/Modify
- `public/manifest.json` — PWA manifest
- `index.html` — meta tags, title → "MilkGuard"
- `src/index.css` — custom teal/navy color palette
- `src/utils/milkAnalysis.ts` — detection logic + types
- `src/contexts/MilkGuardContext.tsx` — app state (readings, tests, baselines)
- `src/components/AppSidebar.tsx` — sidebar navigation
- `src/components/Layout.tsx` — layout wrapper with sidebar
- `src/pages/Dashboard.tsx` — main dashboard
- `src/pages/TestHistory.tsx` — test history page
- `src/pages/Baselines.tsx` — baselines management
- `src/pages/Settings.tsx` — settings & ESP32 guide
- `src/App.tsx` — routing updates

