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
