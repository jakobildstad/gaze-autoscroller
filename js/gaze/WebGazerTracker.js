import { GazeTracker } from './GazeTracker.js';

export class WebGazerTracker extends GazeTracker {
  constructor() {
    super();
    this._onGaze = null;
    this._nullCount = 0;
    this._dataCount = 0;
    this._videoElement = null;
  }

  async init(onGaze) {
    this._onGaze = onGaze;

    if (typeof webgazer === 'undefined') {
      throw new Error('WebGazer.js is not loaded. Ensure the script tag is present.');
    }

    webgazer
      .setGazeListener((data, _elapsedTime) => {
        if (data == null) {
          this._nullCount++;
          return;
        }
        this._dataCount++;
        this._onGaze(data.x, data.y);
      })
      .begin();

    // IMPORTANT: keep video preview ON — WebGazer needs its internal canvas
    // for face mesh processing. We just make the container tiny and transparent.
    webgazer.showVideoPreview(true);
    webgazer.showPredictionPoints(false);

    // Wait for WebGazer to be ready
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

    // Make WebGazer's default container invisible but still in DOM and processing
    // (moving off-screen or display:none can cause browsers to stop video processing)
    const wgContainer = document.getElementById('webgazerVideoContainer');
    if (wgContainer) {
      wgContainer.style.cssText = 'position:fixed !important; top:0 !important; left:0 !important; width:1px !important; height:1px !important; opacity:0 !important; overflow:hidden !important; pointer-events:none !important; z-index:-1 !important;';
    }

    // Grab the video element for our own debug preview
    this._videoElement = document.getElementById('webgazerVideoFeed');
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

  /** Returns diagnostic info about gaze listener activity. */
  getDiagnostics() {
    return {
      nullCount: this._nullCount,
      dataCount: this._dataCount,
      isReady: typeof webgazer !== 'undefined' && webgazer.isReady(),
    };
  }

  destroy() {
    webgazer.end();
    this._onGaze = null;
    this._videoElement = null;
  }
}
