# Gaze-Driven PDF Autoscroller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based app that uses webcam eye tracking to automatically scroll a PDF based on where the user looks.

**Architecture:** Three independent JS modules (GazeTracker, ScrollController, PdfViewer) wired together by a thin app.js entry point. WebGazer.js provides gaze estimation, PDF.js renders the document. No backend — fully client-side.

**Tech Stack:** Vanilla HTML/CSS/JS, WebGazer.js (CDN), PDF.js / pdfjs-dist (CDN)

---

### Task 1: Project Scaffold and HTML Shell

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create `index.html` with CDN dependencies and basic structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gaze Autoscroller</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Upload screen -->
  <div id="upload-screen">
    <label id="upload-label" for="pdf-input">
      <span>Click to select a PDF</span>
      <input type="file" id="pdf-input" accept=".pdf">
    </label>
  </div>

  <!-- Reader screen (hidden until PDF loaded) -->
  <div id="reader-screen" class="hidden">
    <div id="pdf-container"></div>
    <button id="calibrate-btn">Calibrate</button>
    <div id="gaze-dot" class="hidden"></div>
  </div>

  <!-- Calibration overlay (hidden until triggered) -->
  <div id="calibration-overlay" class="hidden">
    <p id="calibration-instructions">Click each dot to calibrate eye tracking</p>
    <div class="calibration-point" data-index="0" style="top:10%;left:10%"></div>
    <div class="calibration-point" data-index="1" style="top:10%;left:50%"></div>
    <div class="calibration-point" data-index="2" style="top:10%;left:90%"></div>
    <div class="calibration-point" data-index="3" style="top:50%;left:10%"></div>
    <div class="calibration-point" data-index="4" style="top:50%;left:50%"></div>
    <div class="calibration-point" data-index="5" style="top:50%;left:90%"></div>
    <div class="calibration-point" data-index="6" style="top:90%;left:10%"></div>
    <div class="calibration-point" data-index="7" style="top:90%;left:50%"></div>
    <div class="calibration-point" data-index="8" style="top:90%;left:90%"></div>
  </div>

  <script src="https://webgazer.cs.brown.edu/webgazer.js"></script>
  <!-- PDF.js is loaded via dynamic ESM import in PdfViewer.js — no script tag needed -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/style.css` with minimal layout styles**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  background: #1a1a1a;
  color: #e0e0e0;
}

.hidden {
  display: none !important;
}

/* Upload screen */
#upload-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

#upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 320px;
  height: 180px;
  border: 2px dashed #555;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1.1rem;
  color: #aaa;
  transition: border-color 0.2s, color 0.2s;
}

#upload-label:hover {
  border-color: #888;
  color: #ddd;
}

#pdf-input {
  display: none;
}

/* Reader screen */
#reader-screen {
  width: 100%;
  height: 100%;
  position: relative;
}

#pdf-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 12px;
  scroll-behavior: auto; /* we control scrolling via JS */
}

#pdf-container canvas {
  display: block;
  max-width: calc(100% - 40px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}

/* Calibrate button */
#calibrate-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  color: #ccc;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  z-index: 100;
  transition: background 0.2s;
}

#calibrate-btn:hover {
  background: rgba(255,255,255,0.2);
}

/* Gaze debug dot */
#gaze-dot {
  position: fixed;
  width: 12px;
  height: 12px;
  background: rgba(255, 50, 50, 0.6);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
}

/* Calibration overlay */
#calibration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10000;
}

#calibration-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  color: #aaa;
  text-align: center;
  pointer-events: none;
}

.calibration-point {
  position: absolute;
  width: 20px;
  height: 20px;
  background: #4a90d9;
  border-radius: 50%;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: background 0.2s, transform 0.2s;
}

.calibration-point:hover {
  background: #6ab0f9;
  transform: translate(-50%, -50%) scale(1.2);
}

.calibration-point.clicked {
  background: #2ecc71;
}
```

- [ ] **Step 3: Verify the page loads**

Run: Open `index.html` via a local server (e.g., `npx serve .` or `python3 -m http.server 8000`) and verify:
- Dark background with a centered dashed upload box
- No console errors (CDN scripts load successfully)

- [ ] **Step 4: Commit**

```bash
git init
git add index.html css/style.css
git commit -m "scaffold: HTML shell with CDN deps and base styles"
```

---

### Task 2: GazeTracker Interface and WebGazer Implementation

**Files:**
- Create: `js/gaze/GazeTracker.js`
- Create: `js/gaze/WebGazerTracker.js`

- [ ] **Step 1: Create the GazeTracker base class in `js/gaze/GazeTracker.js`**

This defines the interface that all tracker implementations must follow.

```js
/**
 * Abstract base class for gaze trackers.
 * All implementations must override init(), start(), stop(), destroy().
 */
export class GazeTracker {
  /**
   * Initialize the tracker and register the gaze callback.
   * @param {function(number, number): void} onGaze - called with (x, y) screen coords
   * @returns {Promise<void>}
   */
  async init(onGaze) {
    throw new Error('init() must be implemented');
  }

  /** Start/resume gaze tracking. */
  start() {
    throw new Error('start() must be implemented');
  }

  /** Pause gaze tracking. */
  stop() {
    throw new Error('stop() must be implemented');
  }

  /** Tear down tracker and release resources (e.g., webcam). */
  destroy() {
    throw new Error('destroy() must be implemented');
  }
}
```

- [ ] **Step 2: Create the WebGazer implementation in `js/gaze/WebGazerTracker.js`**

```js
import { GazeTracker } from './GazeTracker.js';

export class WebGazerTracker extends GazeTracker {
  constructor() {
    super();
    this._onGaze = null;
  }

  async init(onGaze) {
    this._onGaze = onGaze;

    // webgazer is loaded as a global from the CDN script tag
    if (typeof webgazer === 'undefined') {
      throw new Error('WebGazer.js is not loaded. Ensure the script tag is present.');
    }

    webgazer
      .setGazeListener((data, _elapsedTime) => {
        if (data == null) return;
        this._onGaze(data.x, data.y);
      })
      .begin();

    // Hide the default video preview — we don't need it visible
    webgazer.showVideoPreview(false);
    webgazer.showPredictionPoints(false);

    // Wait for WebGazer to be ready (webcam access granted, model loaded)
    await new Promise((resolve) => {
      const check = () => {
        if (webgazer.isReady()) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  start() {
    webgazer.resume();
  }

  stop() {
    webgazer.pause();
  }

  destroy() {
    webgazer.end();
    this._onGaze = null;
  }
}
```

- [ ] **Step 3: Verify WebGazer loads and reports gaze**

Temporarily add to the end of `index.html` (before `</body>`), replacing the `app.js` script:

```html
<script type="module">
  import { WebGazerTracker } from './js/gaze/WebGazerTracker.js';
  const tracker = new WebGazerTracker();
  await tracker.init((x, y) => {
    console.log(`Gaze: ${Math.round(x)}, ${Math.round(y)}`);
  });
  console.log('WebGazer ready');
</script>
```

Run: Open in browser via local server. Grant webcam permission.
Expected: Console logs `WebGazer ready` followed by continuous `Gaze: x, y` logs.

Revert the temporary test script after verifying — restore the original `<script type="module" src="js/app.js"></script>`.

- [ ] **Step 4: Commit**

```bash
git add js/gaze/GazeTracker.js js/gaze/WebGazerTracker.js
git commit -m "feat: add GazeTracker interface and WebGazer implementation"
```

---

### Task 3: ScrollController with Smooth Acceleration

**Files:**
- Create: `js/ScrollController.js`
- Create: `test/ScrollController.test.html` (manual test page)

- [ ] **Step 1: Create `js/ScrollController.js`**

```js
// Tunable constants
const SCROLL_SPEED = 60;           // target px/sec
const TOP_ZONE = 0.15;             // top 15% triggers up-scroll
const BOTTOM_ZONE = 0.85;          // bottom 15% triggers down-scroll
const DEBOUNCE_MS = 200;           // gaze must stay in zone this long
const RAMP_DURATION_MS = 350;      // time to reach full speed

export class ScrollController {
  /**
   * @param {HTMLElement} container - the scrollable element
   */
  constructor(container) {
    this._container = container;
    this._direction = 0;            // -1 = up, 0 = none, 1 = down
    this._currentSpeed = 0;         // current px/sec (smoothed)
    this._targetSpeed = 0;          // what we're ramping toward
    this._zoneEnterTime = null;     // when gaze entered current zone
    this._debounced = false;        // has debounce threshold been met?
    this._rafId = null;
    this._lastFrameTime = null;

    this._tick = this._tick.bind(this);
  }

  /**
   * Called by the gaze tracker with screen-space coordinates.
   * @param {number} _x - unused for now
   * @param {number} y  - vertical screen position in pixels
   */
  onGaze(_x, y) {
    const viewportHeight = window.innerHeight;
    const ratio = y / viewportHeight;

    let newDirection = 0;
    if (ratio <= TOP_ZONE) {
      newDirection = -1;
    } else if (ratio >= BOTTOM_ZONE) {
      newDirection = 1;
    }

    if (newDirection !== this._direction) {
      // Direction changed — reset debounce
      this._direction = newDirection;
      this._zoneEnterTime = newDirection !== 0 ? performance.now() : null;
      this._debounced = false;

      if (newDirection === 0) {
        // Gaze left the trigger zone — ramp down
        this._targetSpeed = 0;
      }
    }

    // Check debounce: has gaze been in zone long enough?
    if (newDirection !== 0 && !this._debounced && this._zoneEnterTime !== null) {
      if (performance.now() - this._zoneEnterTime >= DEBOUNCE_MS) {
        this._debounced = true;
        this._targetSpeed = SCROLL_SPEED;
        this._startLoop();
      }
    }
  }

  /** Start the animation loop if not already running. */
  _startLoop() {
    if (this._rafId !== null) return;
    this._lastFrameTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  /** Stop the animation loop. */
  _stopLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
      this._lastFrameTime = null;
    }
  }

  /** Single animation frame: ramp speed and scroll. */
  _tick(now) {
    const dt = (now - this._lastFrameTime) / 1000; // seconds
    this._lastFrameTime = now;

    // Ramp current speed toward target
    const rampRate = SCROLL_SPEED / (RAMP_DURATION_MS / 1000); // px/sec per sec
    if (this._currentSpeed < this._targetSpeed) {
      this._currentSpeed = Math.min(this._currentSpeed + rampRate * dt, this._targetSpeed);
    } else if (this._currentSpeed > this._targetSpeed) {
      this._currentSpeed = Math.max(this._currentSpeed - rampRate * dt, 0);
    }

    // Apply scroll
    if (this._currentSpeed > 0.5) {
      const px = this._currentSpeed * dt * this._direction;
      this._container.scrollBy(0, px);
    }

    // Keep looping if still moving or ramping
    if (this._currentSpeed > 0.5 || this._targetSpeed > 0) {
      this._rafId = requestAnimationFrame(this._tick);
    } else {
      this._currentSpeed = 0;
      this._rafId = null;
      this._lastFrameTime = null;
    }
  }

  /** Clean up. */
  destroy() {
    this._stopLoop();
  }
}
```

- [ ] **Step 2: Create a manual test page `test/ScrollController.test.html`**

This lets you verify scroll behavior without the webcam, using mouse position to simulate gaze.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ScrollController Test</title>
  <style>
    body { margin: 0; background: #222; color: #eee; font-family: system-ui; }
    #scroll-container {
      width: 100%;
      height: 100vh;
      overflow-y: auto;
    }
    .page {
      height: 800px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      border-bottom: 1px solid #444;
    }
    #info {
      position: fixed;
      top: 10px;
      left: 10px;
      font-size: 0.85rem;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 100;
    }
    .zone-top { position: fixed; top: 0; left: 0; right: 0; height: 15vh; background: rgba(255,0,0,0.05); pointer-events: none; z-index: 50; }
    .zone-bottom { position: fixed; bottom: 0; left: 0; right: 0; height: 15vh; background: rgba(0,128,255,0.05); pointer-events: none; z-index: 50; }
  </style>
</head>
<body>
  <div class="zone-top"></div>
  <div class="zone-bottom"></div>
  <div id="info">Move mouse to top/bottom 15% to simulate gaze. Scroll position: <span id="pos">0</span></div>
  <div id="scroll-container">
    <div class="page" style="background:#2a2a2a">Page 1</div>
    <div class="page" style="background:#333">Page 2</div>
    <div class="page" style="background:#2a2a2a">Page 3</div>
    <div class="page" style="background:#333">Page 4</div>
    <div class="page" style="background:#2a2a2a">Page 5</div>
    <div class="page" style="background:#333">Page 6</div>
    <div class="page" style="background:#2a2a2a">Page 7</div>
    <div class="page" style="background:#333">Page 8</div>
  </div>
  <script type="module">
    import { ScrollController } from '../js/ScrollController.js';

    const container = document.getElementById('scroll-container');
    const posSpan = document.getElementById('pos');
    const controller = new ScrollController(container);

    // Use mouse position as a stand-in for gaze
    document.addEventListener('mousemove', (e) => {
      controller.onGaze(e.clientX, e.clientY);
    });

    // Update scroll position display
    container.addEventListener('scroll', () => {
      posSpan.textContent = Math.round(container.scrollTop);
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Test the scroll controller**

Run: Open `test/ScrollController.test.html` via local server.

Verify:
1. Move mouse to bottom 15% — after ~200ms pause, scrolling starts and smoothly accelerates
2. Move mouse back to center — scrolling smoothly decelerates and stops
3. Move mouse to top 15% — scrolling starts upward with same smooth ramp
4. Quick flick through the bottom zone — should NOT trigger scrolling (debounce works)

- [ ] **Step 4: Commit**

```bash
git add js/ScrollController.js test/ScrollController.test.html
git commit -m "feat: ScrollController with smooth acceleration and debounce"
```

---

### Task 4: PdfViewer Module

**Files:**
- Create: `js/PdfViewer.js`

- [ ] **Step 1: Create `js/PdfViewer.js`**

Uses dynamic ESM import so we don't need a global script tag for PDF.js.

```js
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';
const PAGE_PADDING = 20; // px of horizontal padding on each side

let _pdfjsLib = null;

async function getPdfjsLib() {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import(PDFJS_CDN);
  _pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  return _pdfjsLib;
}

export class PdfViewer {
  /**
   * @param {HTMLElement} container - the scrollable div that will hold rendered canvases
   */
  constructor(container) {
    this._container = container;
    this._pdf = null;
  }

  /**
   * Load and render all pages of a PDF from an ArrayBuffer.
   * @param {ArrayBuffer} arrayBuffer - the raw PDF file bytes
   */
  async load(arrayBuffer) {
    const pdfjs = await getPdfjsLib();

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    this._pdf = await loadingTask.promise;

    // Clear any previously rendered pages
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    // Render all pages
    const numPages = this._pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
      await this._renderPage(i);
    }
  }

  /**
   * Render a single page into a new canvas appended to the container.
   * @param {number} pageNum - 1-based page number
   */
  async _renderPage(pageNum) {
    const page = await this._pdf.getPage(pageNum);

    // Scale page to fit viewport width minus padding
    const availableWidth = this._container.clientWidth - PAGE_PADDING * 2;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = availableWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const outputScale = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + 'px';
    canvas.style.height = Math.floor(viewport.height) + 'px';

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

    await page.render({
      canvasContext: context,
      viewport,
      transform,
    }).promise;

    page.cleanup();
    this._container.appendChild(canvas);
  }

  /** @returns {HTMLElement} the scroll container element */
  getContainer() {
    return this._container;
  }

  /** Clean up PDF resources. */
  destroy() {
    if (this._pdf) {
      this._pdf.destroy();
      this._pdf = null;
    }
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }
}
```

- [ ] **Step 2: Verify PDF rendering**

Temporarily replace the `app.js` script in `index.html` with an inline test:

```html
<script type="module">
  import { PdfViewer } from './js/PdfViewer.js';

  const viewer = new PdfViewer(document.getElementById('pdf-container'));
  document.getElementById('pdf-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    document.getElementById('upload-screen').classList.add('hidden');
    document.getElementById('reader-screen').classList.remove('hidden');
    await viewer.load(buffer);
    console.log('PDF rendered');
  });
</script>
```

Run: Open in browser, select a multi-page PDF.
Expected: Upload UI disappears, PDF pages render vertically in a scrollable container, scaled to fit the viewport width. Console logs `PDF rendered`.

Revert the inline script — restore `<script type="module" src="js/app.js"></script>`.

- [ ] **Step 3: Commit**

```bash
git add js/PdfViewer.js
git commit -m "feat: PdfViewer module renders PDF pages in scrollable container"
```

---

### Task 5: Calibration UI

**Files:**
- Create: `js/Calibration.js`

The calibration overlay is already in `index.html` (9 dots). This module handles the logic: showing the overlay, tracking clicks, feeding them to WebGazer, and resolving when complete.

- [ ] **Step 1: Create `js/Calibration.js`**

```js
const CLICKS_PER_POINT = 5; // number of clicks on each point before it's "done"

export class Calibration {
  /**
   * @param {HTMLElement} overlay - the #calibration-overlay element
   */
  constructor(overlay) {
    this._overlay = overlay;
    this._points = Array.from(overlay.querySelectorAll('.calibration-point'));
  }

  /**
   * Show the calibration overlay and wait for the user to click all points.
   * Each point must be clicked CLICKS_PER_POINT times.
   * WebGazer automatically trains on click events, so we just need clicks at known positions.
   * @returns {Promise<void>} resolves when calibration is complete
   */
  run() {
    return new Promise((resolve) => {
      this._overlay.classList.remove('hidden');

      const clickCounts = new Map();
      this._points.forEach((p) => clickCounts.set(p, 0));

      const onClick = (e) => {
        const point = e.target;
        if (!point.classList.contains('calibration-point')) return;

        const count = clickCounts.get(point) + 1;
        clickCounts.set(point, count);

        // Visual feedback: grow opacity as clicks accumulate
        point.style.opacity = 0.3 + 0.7 * (count / CLICKS_PER_POINT);

        if (count >= CLICKS_PER_POINT) {
          point.classList.add('clicked');
        }

        // Check if all points are done
        const allDone = this._points.every(
          (p) => clickCounts.get(p) >= CLICKS_PER_POINT
        );

        if (allDone) {
          this._overlay.removeEventListener('click', onClick);
          this._overlay.classList.add('hidden');

          // Reset point styles for next calibration
          this._points.forEach((p) => {
            p.classList.remove('clicked');
            p.style.opacity = '';
          });

          resolve();
        }
      };

      this._overlay.addEventListener('click', onClick);
    });
  }
}
```

- [ ] **Step 2: Verify calibration works**

Temporarily test by adding to an inline script:

```html
<script type="module">
  import { Calibration } from './js/Calibration.js';
  const cal = new Calibration(document.getElementById('calibration-overlay'));
  document.getElementById('calibrate-btn').addEventListener('click', async () => {
    document.getElementById('reader-screen').classList.remove('hidden');
    await cal.run();
    console.log('Calibration complete!');
  });
  // Show reader screen for testing
  document.getElementById('upload-screen').classList.add('hidden');
  document.getElementById('reader-screen').classList.remove('hidden');
</script>
```

Run: Open in browser. Click "Calibrate". Click each dot 5 times.
Expected: Dots turn green as completed. After all 9 are done, overlay disappears and console logs `Calibration complete!`.

Revert the inline test script.

- [ ] **Step 3: Commit**

```bash
git add js/Calibration.js
git commit -m "feat: Calibration module with 9-point click-based calibration UI"
```

---

### Task 6: App Entry Point — Wire Everything Together

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create `js/app.js`**

```js
import { WebGazerTracker } from './gaze/WebGazerTracker.js';
import { ScrollController } from './ScrollController.js';
import { PdfViewer } from './PdfViewer.js';
import { Calibration } from './Calibration.js';

const pdfInput = document.getElementById('pdf-input');
const uploadScreen = document.getElementById('upload-screen');
const readerScreen = document.getElementById('reader-screen');
const pdfContainer = document.getElementById('pdf-container');
const calibrateBtn = document.getElementById('calibrate-btn');
const calibrationOverlay = document.getElementById('calibration-overlay');
const gazeDot = document.getElementById('gaze-dot');

const viewer = new PdfViewer(pdfContainer);
const scrollController = new ScrollController(pdfContainer);
const tracker = new WebGazerTracker();
const calibration = new Calibration(calibrationOverlay);

let gazeDebug = false;

// Toggle gaze dot on double-click of calibrate button
calibrateBtn.addEventListener('dblclick', () => {
  gazeDebug = !gazeDebug;
  gazeDot.classList.toggle('hidden', !gazeDebug);
});

// Single click re-runs calibration
calibrateBtn.addEventListener('click', async () => {
  scrollController.destroy();
  tracker.stop();
  await calibration.run();
  tracker.start();
});

// PDF upload
pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();

  // Switch to reader view
  uploadScreen.classList.add('hidden');
  readerScreen.classList.remove('hidden');

  // Render PDF
  await viewer.load(buffer);

  // Initialize gaze tracker
  await tracker.init((x, y) => {
    scrollController.onGaze(x, y);

    // Update debug dot position
    if (gazeDebug) {
      gazeDot.style.left = x + 'px';
      gazeDot.style.top = y + 'px';
    }
  });

  // Run calibration on first use
  await calibration.run();

  // Start tracking
  tracker.start();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  tracker.destroy();
  scrollController.destroy();
  viewer.destroy();
});
```

- [ ] **Step 2: Verify the full flow end-to-end**

Run: `npx serve .` in the project root. Open the URL in Chrome.

Test the full flow:
1. Upload screen appears — select a PDF file
2. PDF renders in continuous scroll mode
3. Browser prompts for webcam permission — grant it
4. Calibration overlay appears — click each of the 9 dots 5 times
5. Calibration completes, overlay hides
6. Look toward the bottom of the screen — after a brief pause, PDF scrolls down smoothly
7. Look toward the center — scrolling eases to a stop
8. Look toward the top — PDF scrolls up smoothly
9. Click "Calibrate" button — recalibration overlay appears
10. Double-click "Calibrate" — red gaze dot appears/disappears showing where WebGazer predicts you're looking

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up app entry point connecting all modules"
```

---

### Task 7: Final Polish and Manual QA

**Files:**
- Possibly tweak: `js/ScrollController.js` (tune constants)
- Possibly tweak: `css/style.css`

- [ ] **Step 1: Full manual QA pass**

Run through the complete user flow with a real multi-page PDF:

1. Upload a 10+ page PDF
2. Complete calibration
3. Read naturally for 2-3 minutes
4. Verify scrolling feels comfortable — not too fast, not too slow
5. Verify smooth ramp-up and ramp-down (no jerky starts/stops)
6. Verify debounce works (quick glances at edges don't trigger scroll)
7. Verify upward scrolling works when looking at top
8. Verify the gaze debug dot (double-click Calibrate) tracks eye position reasonably

- [ ] **Step 2: Tune constants if needed**

If scrolling feels too fast/slow, adjust `SCROLL_SPEED` in `js/ScrollController.js`.
If debounce is too sensitive or too sluggish, adjust `DEBOUNCE_MS`.
If acceleration feels abrupt, increase `RAMP_DURATION_MS`.
If the trigger zones are too large/small, adjust `TOP_ZONE` / `BOTTOM_ZONE`.

- [ ] **Step 3: Commit any tuning changes**

```bash
git add -A
git commit -m "polish: tune scroll speed and zone thresholds after QA"
```

- [ ] **Step 4: Add a .gitignore**

```bash
echo "node_modules/
.DS_Store
" > .gitignore
git add .gitignore
git commit -m "chore: add .gitignore"
```
