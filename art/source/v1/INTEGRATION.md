# Tidelora — asset pack v1

13 PNG: 4 backgrounds, 4 fish, 3 dishes, 1 rod, 1 six-item atlas. Generated using built-in Imagegen. Reference direction: warm naturalistic Vietnamese lakeside fishing game. Images are newly generated interpretations, not pixel-identical extractions from the approved mockup.

## React Native integration

Copy this folder into the project and import `tideloraAssets` from `assets.ts`. Static require paths are already provided. Exact dimensions and prompts are in `manifest.json`.

- Backgrounds: absolute fill, cover; compose HUD inside landscape safe-area insets. Native ratio is 2:1; allow cropping at wider device ratios.
- Home: home-morning. Put title upper left, navigation lower left, main CTA lower right. Use local dark scrims behind text instead of dimming the entire scene.
- Fishing: fishing-lake-morning. Center water is the target area. Render float, line, ripple and rod separately. Water reflections and dock are baked into the background; this is a static base, not a layered animated scene.
- Inventory: storage-interior with a dark green scrim; display fish sprites using contain. All fish face left. Do not stretch individual fish to fill tiles.
- Kitchen: kitchen-interior. Place the dish centered over the empty counter. Recipe list left, detail panel right. Add steam and contact shadow in code.
- Rod: rod-reel is a single straight static sprite, with no hands or fishing line. It is useful for preparation/idle or as visual reference; a physically bending rod requires a mesh/rig or procedural rod renderer. Do not rotate it and claim realistic bending.

## Tackle atlas

1536 × 1024; conceptual grid 3 columns × 2 rows. Source rects below are 512 × 512 pixels, top-left origin. Use Skia source rect drawing or equivalent clipping; preserve aspect ratio. This archive retains the full atlas, not six separately cut PNG files.

| ID | x | y | width | height |
|---|---:|---:|---:|---:|
| tackle-box | 0 | 0 | 512 | 512 |
| cooler | 512 | 0 | 512 | 512 |
| basket | 1024 | 0 | 512 | 512 |
| float | 0 | 512 | 512 | 512 |
| journal | 512 | 512 | 512 | 512 |
| earthworm | 1024 | 512 | 512 | 512 |

The generated float reaches close to the horizontal cell boundary. Inspect the clip at intended rendering scale before shipping; the atlas grid is not a substitute for hand-reviewed sprite bounds.

## UI drawn in code

Use vector icons for navigation, back, pause, settings, coins, checks and capacity. Buttons, borders, text, meters and tabs are live UI, not baked screenshots.

Suggested tokens: background #102E35; panel #142D27; text #F3EBDD; secondary #C4C6AF; brass #B99B63. Use a restrained brass gradient only on primary actions, 1px muted borders, 12–18dp radii and 44–48dp minimum touch targets. Serif headings paired with readable Vietnamese-supporting sans-serif body type. Keep game simulation unchanged when replacing presentation.

## Validation and limitations

- All files opened successfully; all nine sprite/atlas files have a nonconstant alpha channel.
- Some generated sprites retain soft colored fringes/halos. Alpha presence does not prove perfect cutout quality. Inspect on the actual dark-green panels and water before release.
- Fish names describe intended subjects; biological identification and fin morphology have not been independently validated. Keep species metadata separate from art. Grilled fish is generic dish artwork, not verified species-specific artwork.
- This pack provides static art for the four approved screens. It does not include animation frames, rigged meshes, separate foreground vegetation, day/night variants, audio, shrimp/crab expansions, or an implementation of the UI.
- Avoid loading all full-resolution PNGs simultaneously on mobile. Prepare lower-resolution runtime derivatives and measure on device during integration; originals here are retained unchanged.
- Original artwork prompts are included in the manifest. Generation used built-in Imagegen; no third-party stock licensing claim is made.

## Claude handoff

Integrate these assets into the existing Tidelora React Native/Expo app. First inspect its renderer and navigation. Preserve gameplay, inventory transactions and saves. Rebuild the Home, Fishing, Inventory and Kitchen presentation following the mappings above. Use actual images instead of flat vector stand-ins; do not bake text/buttons into backgrounds. Implement safe areas, reusable theme tokens, static requires, local contrast scrims and independent fishing HUD. Review image alpha edges and atlas clipping at actual phone scale. Do not claim animated water or bending-rod support from static files. Report any missing art explicitly. Verify all four screens and their primary actions on available simulator/device, and state any untested conditions.
