# Pathifier

Pathifier is a high-fidelity continuous line art and dot matrix generator. It transforms bitmap images into organic, non-intersecting paths (TSP art) or dithered dot grids, optimized for plotting and vector design.

## Features
- **TSP Art:** Weighted Voronoi Stippling (Bridges 2005) with Euclidean 2-opt solver.
- **Dot Matrix:** High-performance grid-based point distribution with advanced dithering (Floyd-Steinberg, Atkinson, Stucki, Bayer).
- **Interactive Workstation:** Dual-sidebar layout with real-time algorithm visualization and interruption.
- **Professional Grading:** Integrated color grading (Blacks, Whites, Midtones, Contrast) and radial vignette.
- **Vector Export:** High-fidelity SVG export supporting multi-part paths.

## Tech Stack
- React 19 + TypeScript
- Vite
- Web Workers (Concurrency for heavy algorithms)
- Vanilla CSS (Dark industrial theme)

## Getting Started
1. `npm install`
2. `npm run dev`
3. Upload an image, crop, and start generating!
