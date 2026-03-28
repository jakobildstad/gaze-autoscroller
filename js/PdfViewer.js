const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';
const PAGE_PADDING = 20; // px of horizontal padding on each side

let _pdfjsLib = null;

async function getPdfjsLib() {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import(PDFJS_CDN);
  _pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  return _pdfjsLib;
}

export class PdfViewer {
  /**
   * @param {HTMLElement} container - the scrollable div that will hold rendered canvases
   */
  constructor(container) {
    this._container = container;
    this._pdf = null;
  }

  /**
   * Load and render all pages of a PDF from an ArrayBuffer.
   * @param {ArrayBuffer} arrayBuffer - the raw PDF file bytes
   */
  async load(arrayBuffer) {
    const pdfjs = await getPdfjsLib();

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    this._pdf = await loadingTask.promise;

    // Clear any previously rendered pages
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    // Render all pages
    const numPages = this._pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
      await this._renderPage(i);
    }
  }

  /**
   * Render a single page into a new canvas appended to the container.
   * @param {number} pageNum - 1-based page number
   */
  async _renderPage(pageNum) {
    const page = await this._pdf.getPage(pageNum);

    // Scale page to fit viewport width minus padding
    const availableWidth = this._container.clientWidth - PAGE_PADDING * 2;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = availableWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const outputScale = window.devicePixelRatio || 1;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + 'px';
    canvas.style.height = Math.floor(viewport.height) + 'px';

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

    await page.render({
      canvasContext: context,
      viewport,
      transform,
    }).promise;

    page.cleanup();
    this._container.appendChild(canvas);
  }

  /** @returns {HTMLElement} the scroll container element */
  getContainer() {
    return this._container;
  }

  /** Clean up PDF resources. */
  destroy() {
    if (this._pdf) {
      this._pdf.destroy();
      this._pdf = null;
    }
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }
}
