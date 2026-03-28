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
