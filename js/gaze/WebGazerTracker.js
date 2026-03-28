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
