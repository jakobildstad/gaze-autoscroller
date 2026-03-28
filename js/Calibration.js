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
