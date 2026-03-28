import { WebGazerTracker } from './gaze/WebGazerTracker.js';
import { ScrollController } from './ScrollController.js';
import { PdfViewer } from './PdfViewer.js';
import { Calibration } from './Calibration.js';

const pdfInput = document.getElementById('pdf-input');
const uploadScreen = document.getElementById('upload-screen');
const readerScreen = document.getElementById('reader-screen');
const pdfContainer = document.getElementById('pdf-container');
const calibrateBtn = document.getElementById('calibrate-btn');
const debugBtn = document.getElementById('debug-btn');
const calibrationOverlay = document.getElementById('calibration-overlay');
const gazeDot = document.getElementById('gaze-dot');
const debugPanel = document.getElementById('debug-panel');
const cameraContainer = document.getElementById('camera-container');
const gazeCoords = document.getElementById('gaze-coords');
const statusLog = document.getElementById('status-log');

// --- Status logging ---
function log(msg) {
  console.log('[autoscroller]', msg);
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  statusLog.appendChild(line);
  statusLog.scrollTop = statusLog.scrollHeight;
}

function logError(msg, err) {
  console.error('[autoscroller]', msg, err);
  const line = document.createElement('div');
  line.className = 'error';
  line.textContent = `${new Date().toLocaleTimeString()} ERROR: ${msg} — ${err}`;
  statusLog.appendChild(line);
  statusLog.scrollTop = statusLog.scrollHeight;
}

log('App loaded');

// --- Module setup ---
const viewer = new PdfViewer(pdfContainer);
const scrollController = new ScrollController(pdfContainer);
const tracker = new WebGazerTracker();
const calibration = new Calibration(calibrationOverlay);

// Debug mode — ON by default
let debugMode = true;
debugBtn.classList.add('active');

function updateDebugVisibility() {
  gazeDot.classList.toggle('hidden', !debugMode);
  debugPanel.classList.toggle('hidden', !debugMode);
  debugBtn.classList.toggle('active', debugMode);
}
updateDebugVisibility();

debugBtn.addEventListener('click', () => {
  debugMode = !debugMode;
  updateDebugVisibility();
});

// Recalibrate
calibrateBtn.addEventListener('click', async () => {
  log('Recalibration requested');
  tracker.stop();
  await calibration.run();
  log('Recalibration complete');
  tracker.start();
});

// --- Main flow ---
let gazeCount = 0;

pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  log(`PDF selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);

  // Switch to reader view
  uploadScreen.classList.add('hidden');
  readerScreen.classList.remove('hidden');

  // Render PDF
  try {
    log('Loading PDF...');
    const buffer = await file.arrayBuffer();
    await viewer.load(buffer);
    log('PDF rendered');
  } catch (err) {
    logError('Failed to load PDF', err.message);
    return;
  }

  // Initialize gaze tracker
  try {
    log('Initializing WebGazer (requesting webcam)...');
    await tracker.init((x, y) => {
      gazeCount++;
      scrollController.onGaze(x, y);

      if (debugMode) {
        gazeDot.style.left = x + 'px';
        gazeDot.style.top = y + 'px';
        gazeCoords.textContent = `${Math.round(x)}, ${Math.round(y)} (#${gazeCount})`;
      }
    });
    log('WebGazer ready — webcam active');
  } catch (err) {
    logError('WebGazer init failed', err.message);
    return;
  }

  // Set up debug camera preview
  try {
    const srcVideo = tracker.getVideoElement();
    log(`Video element found: ${!!srcVideo}, has stream: ${!!(srcVideo && srcVideo.srcObject)}`);

    if (srcVideo && srcVideo.srcObject) {
      const debugVideo = document.createElement('video');
      debugVideo.srcObject = srcVideo.srcObject;
      debugVideo.autoplay = true;
      debugVideo.playsInline = true;
      debugVideo.muted = true;
      cameraContainer.appendChild(debugVideo);
      log('Debug camera feed attached');
    } else {
      // Try getting webcam directly as fallback
      log('No srcObject on WebGazer video, trying direct webcam access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const debugVideo = document.createElement('video');
        debugVideo.srcObject = stream;
        debugVideo.autoplay = true;
        debugVideo.playsInline = true;
        debugVideo.muted = true;
        cameraContainer.appendChild(debugVideo);
        log('Debug camera feed attached (direct)');
      } catch (camErr) {
        logError('Could not get camera for debug preview', camErr.message);
      }
    }
  } catch (err) {
    logError('Debug camera setup failed', err.message);
  }

  // Calibration
  log('Starting calibration — LOOK at each dot and click it 5 times');
  await calibration.run();
  log('Calibration complete');

  // Start tracking
  tracker.start();
  log('Gaze tracking started — look around to test');

  // Report diagnostics periodically
  const reportDiag = () => {
    const diag = tracker.getDiagnostics();
    if (gazeCount === 0) {
      if (diag.nullCount > 0) {
        log(`Listener firing but all null (${diag.nullCount} nulls) — WebGazer sees your camera but can't predict gaze yet. Need more calibration clicks.`);
      } else {
        logError('Listener never fired', `nulls: ${diag.nullCount}, data: ${diag.dataCount}, ready: ${diag.isReady}. WebGazer may not be running.`);
      }
    } else {
      log(`Tracking OK: ${gazeCount} gaze events, ${diag.nullCount} nulls`);
    }
  };
  setTimeout(reportDiag, 3000);
  setTimeout(reportDiag, 8000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  tracker.destroy();
  scrollController.destroy();
  viewer.destroy();
});
