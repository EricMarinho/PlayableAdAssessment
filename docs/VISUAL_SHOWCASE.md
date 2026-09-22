# Visual & Engineering Showcase: Vibrant UA Theme

This document breaks down the design choices implemented to transition the playable ad into a high-converting, brand-aligned commercial asset.

## 🎨 Art Direction & Brand Alignment
- **Vibrant Orange Backdrop (`#F58324`):** Direct translation of Scrambly’s official Google Play store marketing materials, ensuring instant visual recognition for users.
- **Tactile 3D UI Elements:** Crisp white card wrappers (`#FFF6E8`) accented with rich Purple (`#7845D8`) bottom borders and diffused `box-shadows` to evoke a physical arcade-button feel.
- **Organic Parallax Depth:** Implemented a performant, GPU-accelerated bokeh particle system using CSS `::before` and `::after` pseudo-elements. Particles drift upwards with a smooth `±10px` lateral sway using only `transform` and `opacity` to maintain a locked 60 FPS.
- **Canvas Particle Juice:** Tapping the mascot triggers an energetic burst of gold coins (`#FFC93C`) with randomized trajectories, rotation, and crisp drop shadows to pop against the saturated orange background.