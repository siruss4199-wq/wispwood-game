# Chapter 1 board cohesion milestone

Seven built-in imagegen sketch-to-render edits, zero retries. No previous approved sprites or scenes regenerated. No external game art. Remaining quota and billed costs were not visible.

## Production prompt set

Inputs for each call: the original SVG subject rendered to a transparent 512px PNG; approved `grip-tool-vibrant.webp` as material/lighting reference only. Output: one isolated object, actual transparent background, three-quarter overhead camera, upper-left soft studio light, premium casual illustrated 3D materials, big readable forms at 48 CSS pixels. Centered object fills approximately 88% of square, subtle contact shadow. No text, UI, frames, heavy outlines, noisy circuitry or unrelated objects.

Subject-specific instructions:
- Saltstone: chunky rounded lavender-grey coastal stone, deep crack, one glossy violet crystal, warm ivory sunlit top, cool shadows and restrained turquoise mineral seam. Preserve the original silhouette and identity.
- Buried ground: low golden coastal sand mound partly covering substantial carved ivory stone; sturdy turquoise survey pennant. Satin sand, dimensional ridges, no gritty realism.
- Route fold: thick curved accordion-folded map, three angled turquoise/ivory panels, coastal shapes, bold gold route and coral destination pin. Convincing folds and paper thickness, no tiny cartography.
- Loop cell: short turquoise glass cylinder containing violet crystal, gold endcaps, silver terminal and curved violet loop cable. Elliptical top and distinct battery silhouette.
- Survey scope: chunky diagonal turquoise telescope, gold lens rim and pivot, deep cyan glass facing upper right, dark eyepiece lower left, compact three-legged silver tripod. Satin enamel and polished functional metal.
- Resonator: violet U-shaped machine, thick prongs with inset silver conductors, luminous amethyst orb in gold socket, rounded gold foot and subtle violet arc. Clear horseshoe silhouette.
- Resonance Ampoule: squat wide violet-glass reliquary, trapezoid body, crystal behind turquoise front, thick gold base and removable gold lid with dark-violet pull tab. A sealed reward vessel, explicitly no wire, cable or terminals.

Saved runtime outputs: `saltstone-vibrant.webp`, `buried-ground-vibrant.webp`, `route-fold-vibrant.webp`, `loop-cell-vibrant.webp`, `survey-scope-vibrant.webp`, `resonator-vibrant.webp`, `resonance-ampoule-vibrant.webp` in this directory. Generated 1280px RGBA originals were downsampled to 192px WebP quality90, alpha retained. Total runtime addition: approximately 100KB. No color processing or regeneration after rendering. Original native SVGs remain available in classic/review modes.

`../../cohesion-review.html` compares every new object against its original at actual48px. Pocket winch artwork is reused on the Stone lift; Survey scope and Resonator artwork are reused on their corresponding devices.
