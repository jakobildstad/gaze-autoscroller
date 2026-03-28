# Gaze-Driven PDF Autoscroller — Design Spec

## Overview

A minimal, fully browser-based web app that uses webcam-based eye tracking to automatically scroll a PDF as the user reads. Looking near the bottom of the screen scrolls down; looking near the top scrolls up. No mouse or keyboard needed during reading.

## Goals

- Hands-free PDF reading experience
- Minimal UI — the PDF fills the screen
- Modular gaze tracker abstraction so the eye-tracking backend can be swapped easily
- POC scope — fixed scroll speed, webcam-only, Mac/browser target

## Tech Stack

- **Frontend only** — no backend server required
- **PDF.js** — renders PDF pages into a scrollable container
- **WebGazer.js** — webcam-based gaze estimation, runs in-browser
- **Vanilla HTML/CSS/JS** — no framework needed for the POC
- Served via any static file server (e.g., `npx serve`, `python -m http.server`, or VS Code Live Server)

## Architecture

Three independent modules connected by a thin `app.js` entry point:

```
┌──────────────┐     onGaze(x, y)     ┌───────────────────┐     scrollBy()     ┌──────────────┐
│ Gaze Tracker │ ──────────────────► │ Scroll Controller │ ──────────────────► │  PDF Viewer   │
│  (abstract)  │                      │                   │                      │  (PDF.js)    │
└──────────────┘                      └───────────────────┘                      └──────────────┘
```

### Module 1: Gaze Tracker

**Interface:**

```js
GazeTracker {
  init(callback: (x: number, y: number) => void): Promise<void>
  start(): void
  stop(): void
  destroy(): void
}
```

**WebGazer implementation (default):**

- `init()` — loads WebGazer.js, requests webcam permission, registers the gaze listener that invokes the callback with screen-space (x, y) coordinates
- `start()` / `stop()` — pause and resume gaze tracking
- `destroy()` — tears down WebGazer and releases the webcam

**Calibration:**

- Uses WebGazer's built-in click-based calibration (9-point grid overlay)
- Calibration data is persisted to `localStorage` so it doesn't need to be repeated every session
- A small floating "Calibrate" button in the corner allows re-triggering calibration at any time

**Swappability:**

To use a different tracker (e.g., Tobii via WebSocket, or a Python backend), create a new class implementing the same 4-method interface. No changes needed in other modules.

### Module 2: Scroll Controller

**Responsibilities:** Maps gaze y-coordinate to scroll actions on the PDF container.

**Screen zones** (percentage of viewport height):

| Zone | Range | Action |
|------|-------|--------|
| Top | 0–15% | Scroll up |
| Neutral | 15–85% | No scrolling |
| Bottom | 85–100% | Scroll down |

Zone thresholds are constants at the top of the module, easy to adjust.

**Scroll behavior:**

- Target speed: ~60px/sec (tunable constant)
- Smooth acceleration: when gaze enters a trigger zone, scroll speed eases in from 0 to target speed over ~300–400ms (ease-in curve). When gaze leaves the zone, speed eases out over the same duration. No instant jumps.
- Uses `requestAnimationFrame` for frame-rate-independent, smooth scrolling
- **Debounce/hysteresis:** gaze must remain in a trigger zone for ~200ms before scrolling begins, preventing accidental scrolls from brief glances

**Input:** `(x, y)` screen coordinates from the gaze tracker callback.
**Output:** calls `container.scrollBy()` on the PDF viewer's scroll container.

### Module 3: PDF Viewer

**Upload:**

- Landing state: a centered file input (`<input type="file" accept=".pdf">`) prompting the user to upload a PDF
- Once a PDF is selected, the upload UI disappears and the reader takes over full-screen

**Rendering:**

- PDF.js renders each page as a `<canvas>` element
- Pages are stacked vertically in a single scrollable `<div>` container — continuous scroll, not page-by-page
- Pages are scaled to fit the viewport width with some padding for comfortable reading

**UI:**

- No visible chrome beyond the PDF itself
- Small floating "Calibrate" button in one corner
- Optional toggleable gaze indicator dot for debugging (shows where WebGazer thinks you're looking)

### Entry Point: app.js

Wires the three modules together:

1. Show PDF upload UI
2. On PDF upload, render the PDF in the viewer
3. Initialize the gaze tracker (trigger calibration if needed)
4. Connect gaze tracker callback → scroll controller → PDF viewer scroll container
5. Start tracking

## File Structure

```
autoscroller_idea/
├── index.html          — single HTML page
├── css/
│   └── style.css       — minimal styles
├── js/
│   ├── app.js          — entry point, wires modules together
│   ├── gaze/
│   │   ├── GazeTracker.js       — interface/base class
│   │   └── WebGazerTracker.js   — WebGazer.js implementation
│   ├── ScrollController.js      — gaze-to-scroll logic
│   └── PdfViewer.js             — PDF.js rendering and container
├── lib/                — third-party libraries (or use CDN links in index.html for POC)
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-28-gaze-autoscroller-design.md
```

## User Flow

1. User opens the app in a browser
2. Sees a clean upload prompt — drops or selects a PDF
3. PDF renders full-screen in continuous scroll mode
4. Browser requests webcam permission
5. If no prior calibration, a 9-point calibration overlay appears — user clicks each point
6. Calibration completes, overlay disappears
7. User reads normally — when gaze drifts to the bottom 15% of the screen, the PDF smoothly accelerates into a downward scroll. When gaze returns to the middle, scrolling eases to a stop.
8. Looking at the top 15% scrolls up with the same smooth behavior.
9. User can re-calibrate at any time via the floating button.

## Constants / Configuration

| Constant | Default | Description |
|----------|---------|-------------|
| `SCROLL_SPEED` | 60 | Target scroll speed in px/sec |
| `TOP_ZONE_THRESHOLD` | 0.15 | Top 15% of viewport triggers upward scroll |
| `BOTTOM_ZONE_THRESHOLD` | 0.85 | Bottom 15% of viewport triggers downward scroll |
| `DEBOUNCE_MS` | 200 | Gaze must stay in zone this long before scrolling starts |
| `RAMP_DURATION_MS` | 350 | Time to accelerate/decelerate to/from target speed |

## Out of Scope (POC)

- Adaptive scroll speed (faster near edges)
- Server-side gaze processing
- Multi-platform testing (Windows/Linux)
- Mobile support
- PDF text search, annotations, or bookmarks
- User accounts or PDF persistence
- Keyboard shortcuts
