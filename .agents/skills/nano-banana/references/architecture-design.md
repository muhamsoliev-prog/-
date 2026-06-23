# Architecture, Facade & Roof Design Workflows

Guidance for using Nano Banana for house design, facade redesign, roof
visualization, and exterior finishing concepts. This is image generation/editing,
not CAD — output is visual concept art and renders, not engineering drawings or
construction documents. Tell the user this distinction before they rely on results
for permits, structural decisions, or contractor quotes.

## Core Technique: Iterative Edit, Not Regeneration

Nano Banana preserves the source structure (massing, window placement, proportions,
camera angle) far better through `/edit` on an existing photo/render than through
repeated `/generate` calls. For house design work, always start from a real photo
or a first generated render, then **edit forward** for every subsequent change —
this is what keeps the building's identity consistent across roof/facade/material
iterations.

```bash
# Start from the client's photo
gemini --yolo "/edit house_photo.jpg 'replace the gable roof with a modern flat roof with parapet, keep the walls, windows, and surrounding landscaping exactly as they are'"

# Then iterate on the previous output, not the original
gemini --yolo "/edit nanobanana-output/<previous>.png 'change the facade cladding from brick to vertical wood slats, keep the new roof from the last edit'"
```

## Facade Material & Finish Changes

Be explicit about what must stay fixed — Nano Banana will otherwise drift window
positions, scale, or lighting between edits.

```bash
gemini --yolo "/edit facade.jpg 'change exterior wall finish to light grey stucco with dark grey window frames, keep window and door positions, roofline, and perspective identical'"
gemini --yolo "/edit facade.jpg 'add natural stone cladding to the ground floor only, leave upper floor render unchanged'"
```

## Roof Design Iterations

```bash
gemini --yolo "/edit house.jpg 'change roof type to a hip roof with dark grey metal standing-seam panels, match the existing eave overhang and chimney position'"
gemini --yolo "/generate 'modern single-story house, low-pitch shed roof, large eave overhang, board-formed concrete and cedar wood facade, golden hour lighting, architectural photography' --aspect=16:9 --count=3"
```

## Multi-Angle Consistency

For presenting a redesign from multiple angles, generate one strong front view
first, then use `/edit` describing a camera change rather than `/generate`-ing a
new angle from scratch — this gives far better material/proportion consistency:

```bash
gemini --yolo "/edit nanobanana-output/front_view.png 'show this same house from the rear-left three-quarter angle, keep all materials, roof, and colors identical'"
```

## Interior / Renovation Concepts

Same edit-forward pattern applies to interior finishing work:

```bash
gemini --yolo "/edit living_room.jpg 'replace flooring with light oak engineered wood, repaint walls warm white, keep furniture layout and window positions'"
```

## Useful Prompt Vocabulary for This Domain

- Roof types: gable, hip, mansard, shed, flat-with-parapet, butterfly, gambrel
- Roof materials: standing-seam metal, asphalt shingle, clay tile, slate, green roof
- Facade materials: stucco, brick, board-formed concrete, cedar/wood slat cladding,
  natural stone veneer, fiber cement panel, glass curtain wall
- Lighting/render style: "architectural photography", "golden hour", "overcast
  diffuse light" (best for showing true material color), "dusk render with
  interior lights on"

## Quality Setting for This Work

Architectural renders benefit from the higher-quality model when fine material
texture or precise geometry matters:

```bash
export NANOBANANA_MODEL=gemini-3-pro-image-preview
```

## What This Workflow Cannot Do

- Cannot produce scaled floor plans, structural drawings, or permit-ready
  documents — it is a visualization tool only.
- Cannot guarantee dimensional accuracy between edits (window/door sizes can
  drift slightly) — for client-facing concept work this is acceptable; for
  construction planning it is not. Recommend a licensed architect/CAD tool for
  the latter.
