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

const viewer = new PdfViewer(pdfContainer);
const scrollController = new ScrollController(pdfContainer);
const tracker = new WebGazerTracker();
const calibration = new Calibration(calibrationOverlay);

// Debug mode — ON by default so you can see what's happening
let debugMode = true;
debugBtn.classList.add('active');

function updateDebugVisibility() {
  gazeDot.classList.toggle('hidden', !debugMode);
  debugPanel.classList.toggle('hidden', !debugMode);
  debugBtn.classList.toggle('active', debugMode);
}
updateDebugVisibility();

// Toggle debug mode
debugBtn.addEventListener('click', () => {
  debugMode = !debugMode;
  updateDebugVisibility();
});

// Single click re-runs calibration
calibrateBtn.addEventListener('click', async () => {
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
    if (debugMode) {
      gazeDot.style.left = x + 'px';
      gazeDot.style.top = y + 'px';
      gazeCoords.textContent = `${Math.round(x)}, ${Math.round(y)}`;
    }
  });

  // Create our own video element using the same webcam stream
  const srcVideo = tracker.getVideoElement();
  if (srcVideo && srcVideo.srcObject) {
    const debugVideo = document.createElement('video');
    debugVideo.srcObject = srcVideo.srcObject;
    debugVideo.autoplay = true;
    debugVideo.playsInline = true;
    debugVideo.muted = true;
    cameraContainer.appendChild(debugVideo);
  }

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
