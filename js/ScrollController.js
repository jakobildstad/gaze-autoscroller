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
