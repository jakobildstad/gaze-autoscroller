# Gaze Autoscroller

A browser PDF reader that uses webcam gaze estimates to scroll as you read. WebGazer tracks gaze, PDF.js renders the document, and a six-sample smoothing filter reduces gaze jitter before the scroll controller responds.

## Run locally

```sh
npm ci
npm run dev
```

Open the localhost address printed by the server, select a PDF, allow webcam access, and complete the calibration points. Use **Calibrate** to repeat calibration and **Debug** to inspect the gaze position and camera view. Camera access requires localhost or HTTPS; PDF.js is loaded from a CDN.

The browser-side scroll-controller checks are at `/test/ScrollController.test.html` on the same local server. The modules in `js/` separate PDF rendering, calibration, tracking, and scrolling. Bundled MediaPipe assets support WebGazer.

This is an experimental interaction prototype; gaze accuracy depends on camera position, lighting, and calibration. Webcam tracking was not exercised during repository preparation.
