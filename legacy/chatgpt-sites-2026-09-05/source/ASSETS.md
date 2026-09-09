# Original game art

Both assets were generated with the built-in imagegen tool and inspected before integration. No image CLI fallback was used.

- public/town.png: 1536×1024 RGB original top-down pixel neighborhood.
- public/citizens.png: 1254×1254 RGBA original 4×4 citizen sprite atlas. True alpha; integrated using 400% CSS background sizing. Generator returned 1254 rather than requested 1024 dimensions; a few minor sprite-edge flecks remain.

The exact prompts follow.
Built-in imagegen mode. Two independent calls issued in parallel.

ASSET 1
Use case: stylized-concept
Asset type: actual simulation game background map asset, landscape 1536x1024.
Primary request: An original clean standalone overhead 2D 16-bit pixel-art modern magical city neighborhood map.
Composition: Orthographic top-down with slight classic RPG roof/facade perspective, NOT isometric. A complete rectangular neighborhood fills the image edge to edge. Apartment blocks upper-left; magic academy upper-right; cafe and market lower-left; clinic and dragon garden lower-right; a central circular fountain park. Buildings stay in their four quadrants. Clear walkable horizontal and vertical paths cross through the center and around the periphery, with open central crossroads and courtyard space for separate animated inhabitants. Fountain modest enough to leave circulation around it. No outside decorative frame.
Style: Cozy but crisp, colorful and detailed tile-based 16-bit pixel art, consistent block-sized pixels with sharp nearest-neighbor edges, midnight navy outlines, jade trees, blue and slate pavement, red and coral roofs, subtle turquoise and lavender magical accents. Modern-fantasy town with inviting gardens, compact buildings, clear gameplay readability.
Constraints: No people, no humanoids, no labels, no letters, no words, no text, no user interface, no watermark. No perspective vanishing point, no isometric diamond view. The final image itself is only the playable map artwork.

ASSET 2
Use case: stylized-concept
Asset type: transparent sprite atlas for interactive game characters, square 1024x1024 PNG with genuine alpha transparency.
Primary request: EXACT uniform 4-column by 4-row grid containing exactly 16 separate full-body front-facing 16-bit pixel RPG ADULT modern-fantasy citizens, one in each cell.
Layout is essential: Image 1024x1024. Each of the 16 invisible cells is exactly 256x256. Each character is centered horizontally in its cell and occupies central 50% of cell width and approximately 75% of cell height. Each cell has the same feet baseline at about 87% of its height, and ample transparent margin. Identical scale across the full sheet, all full bodies, no character crosses its cell bounds. No visible grid lines.
Subjects: Sixteen distinct adult citizens with varied skin tones and hairstyles, mixed genders, friendly neutral faces, mostly casual modern clothing such as jackets, sweaters, trousers, skirts, sneakers, a few subtle fantasy robes or hats. Each stands facing the camera in a classic simple idle RPG pose, arms by sides, feet separated. Modern fantasy community, no weapons.
Style: Native low-resolution sprite pixel blocks upscaled nearest-neighbor, crisp jagged pixel edges, cohesive 16-bit palette, midnight navy outlines, teal jade coral lavender clothing accents, each sprite individually readable. No smooth painterly rendering or antialiased edges.
Constraints: Genuinely transparent background with clean alpha, not a checkerboard painted into the image and not white. No floor shadows, no text, no labels, no numbering, no borders, no decorative objects between characters, no watermark. Exactly 16 full-body adults in four rows of four.
