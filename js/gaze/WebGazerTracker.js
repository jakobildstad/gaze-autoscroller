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

    // Hide WebGazer's default overlay — we'll manage the video ourselves
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

    // Grab the webcam video element WebGazer created and expose it
    this._videoElement = document.getElementById('webgazerVideoFeed');
    if (this._videoElement) {
      // Force it visible — WebGazer may hide it
      this._videoElement.removeAttribute('hidden');
      this._videoElement.style.cssText = 'width:100%;height:100%;display:block;object-fit:cover;';
    }

    // Also hide WebGazer's default container elements (face overlay, etc.)
    const wgContainer = document.getElementById('webgazerVideoContainer');
    if (wgContainer) {
      wgContainer.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
    }
  }

  start() {
    webgazer.resume();
  }

  stop() {
    webgazer.pause();
  }

  /** Returns the webcam video element for debug display. */
  getVideoElement() {
    return this._videoElement || null;
  }

  destroy() {
    webgazer.end();
    this._onGaze = null;
    this._videoElement = null;
  }
}
