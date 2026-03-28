const CLICKS_PER_POINT = 2;

export class Calibration {
  /**
   * @param {HTMLElement} overlay - the #calibration-overlay element
   */
  constructor(overlay) {
    this._overlay = overlay;
    this._points = Array.from(overlay.querySelectorAll('.calibration-point'));
    this._instructions = overlay.querySelector('#calibration-instructions');
  }

  /**
   * Sequential calibration: one dot at a time, user clicks each while looking at it.
   * Much faster and clearer than showing all dots at once.
   * @returns {Promise<void>}
   */
  async run() {
    this._overlay.classList.remove('hidden');

    // Hide all points initially
    this._points.forEach((p) => {
      p.classList.remove('active', 'clicked');
      p.style.display = 'none';
    });

    const total = this._points.length;

    for (let i = 0; i < total; i++) {
      const point = this._points[i];

      // Update instructions
      this._instructions.textContent = `Look at the dot and click it (${i + 1}/${total})`;

      // Show and activate this point
      point.style.display = '';
      point.classList.add('active');

      // Wait for the user to click it enough times
      await this._waitForClicks(point, CLICKS_PER_POINT);

      // Mark done
      point.classList.remove('active');
      point.classList.add('clicked');

      // Brief pause so user sees the green confirmation
      await this._sleep(250);

      // Hide it
      point.style.display = 'none';
    }

    // Done — brief flash then hide
    this._instructions.textContent = 'Calibration complete!';
    await this._sleep(500);

    this._overlay.classList.add('hidden');

    // Reset styles for next calibration
    this._points.forEach((p) => {
      p.classList.remove('active', 'clicked');
      p.style.display = '';
    });
  }

  /**
   * Wait for N clicks on a specific point.
   * @param {HTMLElement} point
   * @param {number} needed
   * @returns {Promise<void>}
   */
  _waitForClicks(point, needed) {
    return new Promise((resolve) => {
      let count = 0;

      const onClick = () => {
        count++;

        // Visual feedback: shrink the dot slightly on each click
        const scale = 1 - (count / needed) * 0.3;
        point.style.transform = `translate(-50%, -50%) scale(${scale})`;

        if (count >= needed) {
          point.removeEventListener('click', onClick);
          point.style.transform = '';
          resolve();
        }
      };

      point.addEventListener('click', onClick);
    });
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
