# Feature Spec: Drawing Tools & World Backgrounds

**Parent PRD:** Letter Playground
**Status:** Proposed (Phase 2)
**Dependencies:** Canvas system (MVP), existing design system, ElevenLabs integration

---

## Feature A: Drawing Tools (Pen + Highlighter)

### Overview

A minimal, elegant toolbar on the right edge of the canvas gives the child access to a pen and a highlighter. The child can draw freely on the canvas alongside (and on top of or behind) the spawned letter images. The toolbar is always accessible but never intrusive — it should feel like a small tray of crayons pinned to the side.

### Toolbar Placement & Layout

```
┌─────────────────────────────────────┐
│                          [🗑️][🔊] │
│                                     │
│                                 ┌─┐ │
│         CANVAS                  │✏│ │
│                                 │🖍│ │
│                                 │🎨│ │
│   🍎       🐻                   │ │ │
│       👑          🍎            └─┘ │
│                          🐱         │
│                                     │
├─────────────────────────────────────┤
│ [⇧] A B C D E F G H I J K L M     │
│     N O P Q R S T U V W X Y Z     │
└─────────────────────────────────────┘

Right-side toolbar (top to bottom):
  ✏ = Pen tool
  🖍 = Highlighter tool
  🎨 = Color picker
```

| Attribute | Specification |
|---|---|
| Position | Right edge of the canvas, vertically centered. Floats on top of canvas content, same layer as the Clear/Sound overlay icons in the top-right. |
| Size | Narrow vertical strip — just wide enough for icon buttons (~44pt wide). Should not encroach meaningfully on canvas space. |
| Style | Semi-transparent pill or rounded-rect container. Subtle, not competing with the canvas. Follows existing design system. |
| Collapse behavior | (Optional, post-MVP) The toolbar can collapse to a single icon (e.g. a paintbrush) and expand on tap, to reclaim even more canvas space when drawing tools aren't in use. |

### Tool: Pen

| Attribute | Specification |
|---|---|
| Behavior | Freehand drawing. Touch-down starts a stroke, touch-move draws, touch-up ends the stroke. |
| Stroke width | Fixed width for MVP. Thin enough to feel like a crayon or marker (~4–6pt). If desired later, a size slider can be added. |
| Stroke rendering | Smooth Bézier curves interpolated from touch points — not jagged line segments. Use quadratic or cubic Bézier interpolation between sample points for a natural hand-drawn feel. |
| Layering | Pen strokes render **above** canvas images by default. The child draws on top of their scene. |
| Undo | No explicit undo for MVP. Clear canvas removes strokes along with images. Phase 2 could add a single-step undo. |

### Tool: Highlighter

| Attribute | Specification |
|---|---|
| Behavior | Identical to pen in terms of gesture handling (freehand touch-draw). |
| Visual difference | Wide, semi-transparent stroke (~20–30pt width, ~40% opacity). Simulates a real highlighter — you can see the canvas and images through it. |
| Blending | The highlighter uses a multiply or soft-light blend mode so overlapping strokes darken naturally rather than stacking opaque layers. |
| Layering | Highlighter strokes render **below** canvas images but **above** the background, so the child can "color" the background and the images sit on top. |

### Tool Selection UX

- Tapping the pen icon activates pen mode. Tapping it again deactivates it (returns to default object-interaction mode where touches drag/resize images).
- Same for highlighter — tap to activate, tap again to deactivate.
- Only one tool can be active at a time. Selecting pen deactivates highlighter and vice versa.
- The active tool's icon gets a visible highlight ring or filled background to indicate it's selected.
- When a drawing tool is active, touches on the canvas draw instead of dragging objects. To drag an object, the child must deactivate the drawing tool first. This is a deliberate tradeoff — a 3-year-old should not need to distinguish between "draw touch" and "drag touch" simultaneously.

### Color System

A color button (🎨) in the toolbar opens a small color selector. Two modes:

#### Rainbow Preset Colors

The default and primary color selection method. A small arc or row of **8 preset rainbow colors** appears when the color button is tapped:

```
🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫
Red  Orange  Yellow  Green  Blue  Purple  Brown  Black
```

- Large, easy-to-tap color circles (minimum 36pt diameter each).
- Tapping a color selects it immediately and closes the picker. The selected color is shown as a dot or ring on the color button itself so the child can see what color is active.
- These 8 colors are intentionally limited — toddlers don't need 16 million options. The palette should feel like a box of crayons.

#### Color Picker (Advanced)

A small "more colors" affordance (e.g. a `+` icon or a rainbow gradient swatch) at the end of the preset row opens a simple color wheel or gradient picker for parents or older children who want more control.

- This is a secondary option, not the default flow.
- Keep it simple — a color wheel or a gradient square with a draggable selector. No hex input, no RGB sliders.
- Selected color feeds back into the same active stroke color used by pen and highlighter.

### Drawing Performance Considerations

- **Stroke storage:** Each stroke is stored as an array of points + color + tool type (pen/highlighter) + width. At 60fps touch sampling, a 2-second stroke is ~120 points. Keep strokes as lightweight data, not rendered bitmaps, until the canvas needs to flatten for performance.
- **Progressive flattening:** If stroke count exceeds ~200, flatten older strokes into a raster bitmap layer and keep only recent strokes as vector data. This prevents the canvas from slowing down as the child draws more.
- **Clear canvas** removes all strokes along with all images. A single global reset.

---

## Feature B: World Backgrounds

### Overview

The canvas background can be swapped from the default neutral color to a full-bleed illustrated "world" — an underwater scene, a starry sky, a frozen tundra, etc. These backgrounds transform the canvas into themed play spaces where the child's letter images and drawings feel like they belong in a scene. A small selector in the UI lets the child pick a world, and a microphone option lets them describe a custom world using voice (or text).

### World Selector Placement

```
┌─────────────────────────────────────┐
│ [🌍]                     [🗑️][🔊] │
│                                     │
│                                 ┌─┐ │
│         CANVAS                  │✏│ │
│    (background: Underwater)     │🖍│ │
│                                 │🎨│ │
│   🍎       🐻                   │ │ │
│       👑          🍎            └─┘ │
│                          🐱         │
│                                     │
├─────────────────────────────────────┤
│ [⇧] A B C D E F G H I J K L M     │
└─────────────────────────────────────┘

[🌍] = World selector button, top-left corner of canvas
```

| Attribute | Specification |
|---|---|
| Trigger | A small globe or landscape icon in the **top-left corner** of the canvas (mirroring the Clear/Sound icons in the top-right). |
| Tap behavior | Opens a horizontal strip or small modal showing: (1) pre-created world thumbnails, (2) any user-generated backgrounds saved to the backgrounds folder, and (3) a microphone/text input option to create a new world. The child taps a thumbnail to apply that world. |
| Close behavior | Tapping a world applies it and closes the selector. Tapping outside the selector closes it without changing anything. |
| Create new option | A microphone icon (and optional text field) at the end of the strip lets the child or parent describe a custom world. Generation is handled by the app's existing AI image tools via the image manager. See "Custom World Generation" below. |

### Pre-Created Worlds

The following worlds are **pre-generated using the app's built-in AI image tools** (via the image manager) and stored in a dedicated backgrounds folder. They ship as bundled assets — no runtime generation needed. Use the style guide below as the generation prompt constraints when creating these images.

| World | Description | Key Visual Elements |
|---|---|---|
| **Under the Sea** | Ocean floor with soft blue-green water, coral, bubbles, sand at the bottom. | Coral reef shapes, gentle light rays from above, a few small fish or starfish baked into the background (not interactive — just scenery). |
| **The Land** | A green meadow with rolling hills, a blue sky, a few clouds, maybe a distant tree line. | Grass texture at the bottom third, soft gradient sky, a sun or gentle clouds. |
| **The Schoolyard** | A playground scene — fence, hopscotch lines, a bench, blue sky. | Concrete or asphalt ground, a colorful fence or wall, chalk-drawing aesthetic. |
| **In the Clouds** | A dreamy sky filled with fluffy clouds, soft pinks and blues, golden light. | Layered cloud shapes the child's images can "sit" on. Whimsical, cotton-candy palette. |
| **In the Stars** | Deep space — dark indigo/black sky with stars, nebulae, a moon or planet. | Twinkling stars (can be subtly animated), a crescent moon, swirls of color. |
| **Frozen World** | Snowy tundra or ice landscape — white ground, pale blue sky, snowflakes. | Ice formations, snow-covered ground, soft falling snowflakes (subtle animation). |
| **Desert** | Warm sand dunes, orange/golden sky, a cactus or two in the distance. | Sand texture at the bottom, warm gradient sky, heat shimmer or subtle dust motes. |
| **Blank (default)** | The existing neutral canvas background (light cream/gray). No illustration. | This is always an option so the child can return to a clean slate. |

### Background Image Style Guide

All world backgrounds must follow these rules so that the transparent-PNG letter/number images sit naturally on top of them:

#### Composition Rules

- **Bottom third is the "ground plane."** Most worlds should have a clear ground surface in the lower third of the image (ocean floor, grass, snow, sand, clouds to stand on, etc.). This is where spawned images will visually "land" even though they're placed randomly — the ground plane creates the illusion of a coherent scene.
- **Upper two-thirds is open space.** Keep the upper portion of the background relatively sparse and low-contrast. This is where images and drawings will pile up, and a busy background will make everything unreadable.
- **No focal-point objects in the center.** The center of the canvas is the child's space. Background elements (trees, coral, cacti) should live at the edges or in the bottom third.
- **Horizontal seamlessness preferred.** If the canvas can be scrolled or if different aspect ratios crop differently, the background should tile or stretch gracefully at the horizontal edges. Avoid important details at the far left/right edges.

#### Color & Contrast Rules

- **Muted mid-tones dominate.** Backgrounds should be colorful but not saturated. Think watercolor, not neon. The spawned PNG images (which are bright and high-contrast) need to pop against the background, not compete with it.
- **Avoid pure white and pure black in backgrounds.** The letter images and pen strokes need contrast against the background. Pure white or black areas kill that contrast for light or dark objects respectively. Keep the lightest background value ≤ 90% white, darkest ≥ 15% black.
- **Consistent warm or cool bias per world.** Each world should commit to a temperature: underwater is cool blues/greens, desert is warm golds/oranges. This makes the transparent PNGs feel "in world" regardless of their original palette.

#### Technical Specifications

| Attribute | Specification |
|---|---|
| Format | High-quality JPEG (for file size) or PNG. No transparency needed — these are full-bleed solid backgrounds. |
| Resolution | At least 2048px on the long edge to look crisp on iPad Pro / large tablets. Provide @1x and @2x variants or a single high-res image that downscales. |
| Aspect ratio | Produce at a wide aspect ratio (16:9 or wider). The app should use `object-fit: cover` (or equivalent) to fill the canvas, cropping top/bottom on narrower screens. Because the ground plane is in the bottom third, anchor the image to the **bottom edge** so the ground is never cropped away. |
| File size | Target < 500KB per background after compression. These load on screen entry and should not block the first interaction. |
| Naming convention | `world_undersea.jpg`, `world_land.jpg`, `world_schoolyard.jpg`, etc. |
| Storage location | All backgrounds (pre-created and user-generated) are stored in a **dedicated backgrounds folder** managed by the image manager. Pre-created worlds are bundled at build time. User-generated worlds are saved to the same folder at runtime, making them persist across sessions and appear alongside the pre-created worlds in the selector. |

#### Interaction with Letter Images

- Background renders at **z-index 0**, below everything. Highlighter strokes sit above the background. Letter/number images sit above highlighter strokes. Pen strokes sit on top of everything.
- Changing the background does not move, remove, or resize any existing canvas objects or drawings. The world just swaps underneath.
- The 10%-screen-width spawn size for letter images remains the same regardless of background. No per-world scaling.

### Custom World Generation (Voice / Text Input)

At the end of the world selector strip, a microphone icon lets the user describe a custom background. Generation is handled entirely through the **image manager**, which calls the app's **built-in AI image generation tools**. Generated backgrounds are saved to the backgrounds folder so they persist and can be reselected later.

#### Voice Input Flow

1. Child (or more likely, parent) taps the **microphone icon** in the world selector.
2. A listening indicator appears (pulsing mic icon, "Listening..." label). The app begins capturing audio.
3. The user speaks a description: *"A jungle with monkeys and vines"* or *"Outer space with a big red planet."*
4. On silence detection or a tap to stop, the audio is transcribed using the app's existing speech-to-text capability.
5. The transcribed text is displayed briefly for confirmation. A small "Create" button appears next to it.
6. On confirmation, the image manager wraps the user's description with the style guide prompt (see below) and sends it to the app's **built-in AI image generation tools**.
7. While generating, show a loading state on the canvas (subtle shimmer or progress indicator overlaying the current background — do not clear the canvas).
8. When the image is ready, it is **saved to the backgrounds folder** via the image manager with a generated filename (e.g. `world_custom_jungle_1.jpg`), then applied as the current background. Existing canvas objects remain untouched.

#### Text Input Fallback

- If the user prefers typing, tapping the microphone icon also reveals a small text input field as an alternative to speaking.
- The text input accepts the same free-form description and follows the same generation flow from step 5 onward.

#### Image Manager Integration

The image manager is the single point of contact for all background image operations:

| Operation | Image Manager Responsibility |
|---|---|
| **List backgrounds** | Returns all images in the backgrounds folder (pre-created + user-generated), with thumbnails, for the world selector UI. |
| **Generate new background** | Accepts a text prompt, wraps it with the style guide system prompt, calls the app's built-in AI image generation tools, saves the result to the backgrounds folder, and returns the image path. |
| **Delete a user-generated background** | Removes a user-generated image from the backgrounds folder. Pre-created worlds cannot be deleted. |
| **Pre-create bundled worlds** | At build time (or first launch), the image manager generates the 7 pre-created worlds using the built-in AI image tools and the descriptions/style guide from this spec, saving them to the backgrounds folder. |

#### Style Guide Prompt for Generation

When the image manager generates a background (whether pre-created at build time or user-requested at runtime), it wraps the description with style constraints:

```
System prompt for image generation:
"Generate a children's illustration suitable as a full-bleed background
for a toddler's play canvas. Style: soft watercolor, muted mid-tones,
no pure white or pure black. Composition: ground plane in the bottom
third, open sparse space in the upper two-thirds, no central focal
objects. Safe for children. No text. No characters or people.
Aspect ratio: 16:9 or wider. High resolution.
User description: [transcribed or typed input]"
```

#### Persistence & Reuse

- All generated backgrounds are saved to the backgrounds folder and persist across sessions. The child (or parent) can reselect a previously generated world any time.
- The world selector shows pre-created worlds first, then user-generated worlds in reverse chronological order (newest first).
- No cap on saved user-generated worlds for MVP. If storage becomes a concern, implement a soft cap (e.g. 20 saved custom worlds) with oldest-first eviction and a prompt before deleting.

#### Edge Cases

| Scenario | Behavior |
|---|---|
| User says something unintelligible | STT returns low-confidence transcription. Show the text and let the user retry or edit before generating. |
| Image generation fails | Show a friendly error ("Hmm, I couldn't paint that world. Try again?"). Fall back to current background — never clear the canvas or show a broken state. |
| User describes something inappropriate | The built-in AI image tools' content filter handles this. If the request is rejected, show a neutral message ("Let's try a different world!") with no detail about why. |
| Generated image doesn't follow the style guide | Best-effort outcome. The system prompt constrains the generation, but results will vary. The pre-created worlds are the reliable, curated fallback. |
| User has no network | Voice/text generation requires network for the AI image tools. Show a message ("I need the internet to paint new worlds — try the ones we already have!") and highlight the pre-created worlds. |

---

## Implementation Priority

| Item | Priority | Rationale |
|---|---|---|
| Pen tool with rainbow presets | P1 | Core creative feature. Simple to implement. High play value. |
| Highlighter tool | P1 | Identical gesture system to pen, just different stroke style. Ship together. |
| Image manager: backgrounds folder + list/save operations | P1 | Foundation for all background features. Small surface area — just folder management and thumbnail generation. |
| Pre-create 7 world backgrounds via image manager + built-in AI image tools | P1 | Use the same generation pipeline that custom worlds will use. Generate at build time using the style guide prompt. Store in backgrounds folder. Validates the pipeline before exposing it to users. |
| World selector UI | P1 | Required to access the backgrounds. Reads from the backgrounds folder via image manager. |
| Color picker (advanced) | P2 | The 8 rainbow presets cover 95% of toddler needs. Advanced picker is for older kids/parents. |
| Voice-to-world generation (mic → STT → image manager → AI image tools → backgrounds folder) | P2 | Same pipeline as pre-creation, just triggered at runtime. Requires STT + network. The pre-created worlds carry the feature without it. |
| Text-to-world generation | P2 | Same as voice, alternative input method. Ship together with voice. |
| Collapsible drawing toolbar | P3 | Nice-to-have polish. Not needed if the toolbar is already slim enough. |
| Stroke undo | P3 | Complex state management for low toddler demand. Clear-all is sufficient for MVP. |

---

## Acceptance Criteria

1. **Drawing tools work alongside image interaction.** When no tool is active, touches drag/resize images as before. When pen or highlighter is active, touches draw. Switching between modes is a single tap.
2. **Pen strokes are smooth.** Bézier-interpolated curves, no jagged segments. 60fps rendering even with 100+ strokes on canvas.
3. **Highlighter is visually distinct.** Wide, semi-transparent, renders below images. Overlapping highlighter strokes blend naturally.
4. **Rainbow colors are the default.** Tapping the color button shows 8 large, easy-to-tap preset colors. No extra steps needed to start drawing in color.
5. **World backgrounds fill the canvas edge-to-edge.** No letterboxing, no gaps. Background anchors to the bottom edge so the ground plane is always visible.
6. **Changing backgrounds preserves all canvas content.** Images, strokes, and drawings remain exactly where they are.
7. **Pre-created worlds are generated via the image manager at build time** using the built-in AI image tools and the style guide prompt. They load instantly from the backgrounds folder at runtime — no network dependency.
8. **User-generated worlds persist across sessions.** The image manager saves them to the backgrounds folder. They appear in the world selector alongside pre-created worlds on every subsequent visit.
9. **The world selector shows all available backgrounds** — pre-created first, then user-generated in reverse chronological order. The selector reads from the backgrounds folder via the image manager.
10. **Custom world generation (when implemented) never blocks or clears the canvas.** Generation happens via the image manager calling the built-in AI image tools. Failure is graceful and friendly.
11. **The drawing toolbar does not meaningfully reduce canvas space.** It is ≤ 44pt wide and floats on the right edge.
12. **Clear canvas removes everything** — images, pen strokes, highlighter strokes. Background remains (it's a scene, not content).
