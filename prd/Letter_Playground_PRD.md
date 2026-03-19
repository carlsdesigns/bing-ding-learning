# Product Requirement Document: Letter Playground

## Overview

**Product Name:** Letter Playground
**Target User:** Children ages 2–4 who are beginning letter recognition
**Platform:** Embedded module within an existing learning app (React Native / web)
**One-Line Summary:** A zero-pressure, play-first letter game where every key press triggers a spoken letter-word association, drops a matching image onto a freeform canvas, and lets the child drag, resize, and pile up objects for open-ended creative play.

---

## Design Philosophy

This is **not** a quiz. The child is never tested, never asked to confirm, never told they got something wrong. Every interaction is purely positive: press a letter, hear a friendly voice, see a delightful image appear. The learning happens through repetition and multisensory association — visual (letter shape + image), auditory (spoken phrase), and tactile (haptic buzz + drag/pinch interaction). The child controls the pace entirely.

---

## Core Experience Flow

```
DESKTOP / TABLET                           MOBILE
┌──────────────────────────────┐           ┌──────────────────────┐
│                  [🗑️] [🔊] │           │              [🗑️][🔊]│
│                              │           │                      │
│                              │           │                      │
│      CANVAS / ART BOARD      │           │   CANVAS / ART BOARD │
│        (≥ 80% height)        │           │     (≥ 80% height)   │
│                              │           │                      │
│  🍎       🐻                 │           │  🍎    🐻            │
│      👑          🍎          │           │     👑        🍎     │
│                       🐱     │           │                 🐱   │
│                              │           │                      │
│                              │           │                      │
├──────────────────────────────┤           ├──────────────────────┤
│[⇧] A B C D E F G H I J K L M│           │[⇧] ◀ A B C D E F ▶  │
│    N O P Q R S T U V W X Y Z│           │   (swipe to scroll)  │
└──────────────────────────────┘           └──────────────────────┘

[⇧] = mode toggle (letters ↔ numbers)
[🗑️][🔊] = floating overlay icons, top-right corner of canvas
Keyboard bar = compact, ≤ 20% of screen height
```

1. The canvas dominates the screen — **minimum 80% of viewport height**. The keyboard bar is compact and minimal, hugging the bottom edge at ≤ 20% height.
2. **Clear** and **Sound** buttons float as small icon-only buttons in the **top-right corner** of the canvas, overlaying the canvas itself. They do not consume their own row or toolbar space.
3. **Desktop/Tablet:** Letter buttons display in 2 compact rows (A–M, N–Z). **Mobile:** Buttons display in a single horizontally-scrollable row; the child swipes left/right to access more letters.
4. Child taps a letter button — e.g. **Q**.
5. Immediately: haptic feedback fires, the letter button animates (bounce/glow), and ElevenLabs TTS begins: **"Q is for Queen!"**
6. An image of a queen drops onto the canvas with a playful entrance animation (bounce-in, pop, or float-down).
7. The child can now drag the queen around the canvas, pinch to resize it, or ignore it and press another letter.
8. Pressing **Q** again adds another queen. Press it 50 times, get 50 queens. No limits.

---

## Feature Specifications

### F1 — Keyboard (Letters + Hidden Number Mode)

#### Responsive Layout

The keyboard bar must be as compact as possible — **≤ 20% of screen height** — to maximize canvas space.

| Breakpoint | Layout |
|---|---|
| **Mobile (phone)** | Single horizontally-scrollable row of buttons pinned to the bottom of the screen. Single row height only (~48–56pt plus minimal padding). The child swipes left/right to reveal more buttons. Momentum scrolling enabled. No pagination dots — just a continuous strip. |
| **Desktop / Tablet** | Two compact rows of buttons (A–M top, N–Z bottom) displayed in full without scrolling. Minimal vertical padding between rows — keep the total keyboard bar as thin as possible. |

#### Mode Toggle (Letters ↔ Numbers)

A toggle button lives inline with the letter buttons, styled like a **Shift** or **Command** key on a physical keyboard. It sits at the leading edge of the button row.

| Attribute | Specification |
|---|---|
| Default mode | Letters (A–Z). |
| Toggle behavior | Tapping the toggle switches the visible buttons between A–Z and 0–9. The toggle is a simple tap — not a hold. |
| Toggle label | Shows `123` when in letter mode (indicating what it switches to), shows `ABC` when in number mode. |
| Number mode | Displays 0–9 as buttons. Pressing a number triggers the same flow: haptic → ElevenLabs TTS → image drop. Numbers use the existing number image library and number config already present in the app. |
| Hidden number input | When in **letter mode**, numbers are not visible on screen. However, if a physical keyboard is connected and the child presses a number key (0–9), the number still fires normally (haptic + TTS + image from the number library). This is an undocumented shortcut, not a visible UI element. |

#### Button Specifications

| Attribute | Specification |
|---|---|
| Button size | Minimum 48×48pt tap target (ideally 56–64pt for small fingers). |
| Button style | Each button shows the uppercase letter (or digit) prominently. Rounded corners, bright colors. Consider giving each button a distinct soft color so the keyboard feels like a rainbow. Follows the app's existing design system. |
| Press feedback | On tap: (1) haptic pulse, (2) button scales down then bounces back (spring animation ~200ms), (3) subtle glow or highlight ring. |
| Physical keyboard support | If a hardware keyboard is connected, alpha key presses (a–z) trigger letter behavior, number key presses (0–9) trigger number behavior, regardless of the current visible mode. Ignore all other keys silently. |
| Accessibility | VoiceOver / TalkBack should announce the letter/number name on focus and the full phrase on activation. |

### F2 — Text-to-Speech (TTS) via ElevenLabs

This is the most nuanced system in the app. The goal: every key press should feel acknowledged, but rapid mashing should not create an overwhelming queue of overlapping audio. TTS is powered by the **ElevenLabs integration already present in the app** — the voice and its settings are already configured.

#### Speech Behavior Model

```
STATE MACHINE — TTS Queue Manager

IDLE ──(key press)──▶ SPEAKING ──(utterance complete)──▶ IDLE
                         │
                    (new key press while speaking)
                         │
                         ▼
                 INTERRUPT current utterance
                 Start new utterance immediately
                 (do NOT queue — drop the interrupted one)
```

**Rules:**

1. **Single-press, patient pace:** Child presses A. TTS says "A is for Apple!" in full. Child waits, then presses B. TTS says "B is for Bear!" in full. This is the ideal flow.

2. **Rapid mashing (same letter):** Child mashes A repeatedly. The FIRST press triggers "A is for Apple!" The TTS begins speaking. Each subsequent press while audio is still playing does the following:
   - Fires haptic feedback immediately (always).
   - Drops an image onto the canvas immediately (always).
   - Does **NOT** queue another TTS utterance. The currently-playing utterance continues uninterrupted.
   - Once the current utterance finishes, the system returns to IDLE. The next press will trigger a new utterance.

3. **Rapid switching (different letters):** Child presses A, then quickly presses B before "A is for Apple" finishes. Behavior:
   - The A utterance is **interrupted** (cancelled immediately).
   - TTS begins "B is for Bear!" from the start.
   - Both images (apple AND bear) land on the canvas — image drops are never skipped.
   - If B is then interrupted by C, same pattern: cancel B, start C.

4. **Never queue.** The TTS system holds at most ONE utterance (the currently playing one). There is no queue of pending utterances. This prevents the awful experience of audio playing 10 seconds behind the child's actions.

#### TTS Phrase Format

The spoken phrase for each letter follows this template:

```
"[Letter] is for [Word]!"
```

Examples:
- "A is for Apple!"
- "B is for Bear!"
- "Q is for Queen!"

#### ElevenLabs Implementation Notes

- Use the app's existing ElevenLabs integration. The voice ID and voice settings are already configured — do not override them.
- Pre-warm the ElevenLabs connection on screen load so the first utterance doesn't have a cold-start delay. Consider pre-generating and caching the 26 letter phrases (+ 10 number phrases) on first load or at build time, since the phrases are static and known ahead of time. This eliminates network latency during gameplay.
- The ElevenLabs SDK supports streaming and interruption — use its cancel/stop API to implement the interrupt behavior described above.
- **Offline fallback:** If ElevenLabs is unreachable (no network), fall back to the platform's native TTS engine with the same interrupt logic. Display a small visual text label ("A is for Apple!") near the spawned image as an additional fallback if all audio fails.
- Language: English (US) initially. The architecture should support localization by swapping the phrase map and ElevenLabs voice configuration.

### F3 — Canvas / Art Board

The canvas is the child's open-ended play space. It lives above the keyboard and holds all the images the child spawns.

| Attribute | Specification |
|---|---|
| Size | **Minimum 80% of viewport height.** The canvas fills all available space above the keyboard bar. The keyboard bar is capped at ≤ 20% height. On iPad, the canvas will be expansive. On phone, still dominant. |
| Background | A soft, neutral background — light cream, light gray, or a very subtle texture (paper, chalkboard). Avoid busy patterns that compete with the images. |
| Max objects | No hard limit enforced in UI. Implement a soft technical cap of **300 objects** to prevent performance degradation. When the cap is reached, the oldest object is silently removed as new ones are added (FIFO). See **Performance Considerations** below for optimization strategies that make 300 viable. |
| Object persistence | Objects persist only during the current session. Leaving the screen or closing the app clears the canvas. No save/load needed for MVP. |
| Z-ordering | Newly added objects appear on top. When a child drags an object, it moves to the top of the z-stack. |

#### Image Drop Animation

When a letter is pressed, the corresponding image appears on the canvas with a playful entrance:

- **Default animation:** The image starts slightly above the canvas (or at the location of the pressed key) and "drops" into a random position on the canvas with a bounce easing (overshoot, settle). Duration ~400ms.
- **Spawn position:** Random (x, y) within the canvas bounds, with padding so the image doesn't spawn half off-screen. If the same letter is mashed rapidly, each new image should land at a slightly different random position so they scatter rather than stacking perfectly.
- **Initial size:** Each image spawns at **10% of the total screen width**. All images spawn at the same default size regardless of device.

### F4 — Object Interaction (Drag, Resize, Layer)

Once an image is on the canvas, the child can play with it:

#### Drag
- Touch and hold an image, then drag to reposition anywhere on the canvas.
- The image follows the finger with no lag (use direct manipulation, not animation tween).
- On drag start: slight scale-up (105%) and subtle shadow to indicate "picked up." On release: scale back to 100%, shadow fades.
- Dragged objects are constrained to canvas bounds (the image cannot be dragged entirely off-screen, though partial overlap with edges is fine).

#### Resize ("Zoomie" Gesture)
- Two-finger pinch-to-zoom on an individual image resizes it.
- Minimum size: 50% of default spawn size.
- Maximum size: 300% of default spawn size.
- Resize is smooth and continuous, tracking the pinch gesture in real-time.
- If the device does not support multitouch (rare), provide a fallback: double-tap an image to cycle through 3 sizes (small → medium → large → small).

#### Layering
- Tapping an image (without dragging) brings it to the front of the z-stack.
- This lets the child arrange images in front of or behind each other.

#### Delight Touches (Optional, Post-MVP)
- Tapping an image triggers a small animation (wiggle, bounce) and re-plays the TTS phrase for that letter. ("A is for Apple!" when tapping an apple.)
- Long-press an image to "pop" it off the canvas with a fun particle effect (confetti, stars). This serves as a per-object delete.

### F5 — Haptic Feedback

Every letter press triggers a haptic response to create a tactile link between the child's action and the feedback.

| Event | Haptic Type |
|---|---|
| Letter button tap | Medium impact (UIImpactFeedbackGenerator.medium on iOS, equivalent on Android) |
| Image lands on canvas | Light impact |
| Begin dragging an object | Light impact |
| Pinch resize threshold crossed (e.g. each 25% increment) | Soft tick |

- On web (where haptic APIs are limited), fall back to strong visual feedback (button animation, screen flash) in place of haptics.
- Haptic feedback must fire immediately on touch, never queued or delayed.

### F6 — Clear Canvas

A small icon-only button (trash can icon) floating in the **top-right corner of the canvas**, overlaying the canvas content. It does not live in a separate toolbar row — it sits on top of the canvas to avoid stealing vertical space.

- Show a brief confirmation animation (objects fly off screen, or pop like bubbles) rather than a confirmation dialog — this is a toddler; modal dialogs are not appropriate.
- If the canvas is already empty, the button does nothing.
- The button should be semi-transparent or subtly styled so it doesn't distract from play, but still easily tappable (minimum 44×44pt tap target).
- Optionally: add a shake-to-clear gesture (shake the device to clear the canvas), with haptic feedback.

### F7 — Sound Toggle

A small icon-only button (speaker icon) floating in the **top-right corner of the canvas**, next to the Clear button.

- When muted: TTS does not play, but haptic feedback and image drops continue normally.
- Visual indicator: speaker icon with a slash through it when muted.
- Default state: sound ON.
- Same styling as the Clear button — semi-transparent, non-distracting, overlaying the canvas.

---

## Asset References

All image assets, letter-to-word mappings, and number-to-word mappings already exist in the app. Do not create new assets.

- **Letter images:** Use the existing image bank. Each letter (A–Z) has a corresponding folder containing a single image. Reference the existing letter config file for the letter → word → image path mapping.
- **Number images:** Use the existing number image library already present in the app. Reference the existing number config file for the number → word → image path mapping.
- **ElevenLabs voice:** Use the existing ElevenLabs integration and voice configuration. Do not create a new voice or modify voice settings.

---

## Technical Architecture

### Component Hierarchy

```
<LetterPlayground>
  ├── <Canvas>
  │     ├── <CanvasObject> (×N, one per spawned image)
  │     │     ├── Image renderer
  │     │     ├── Drag handler (pan gesture)
  │     │     └── Resize handler (pinch gesture)
  │     └── <CanvasOverlay> (top-right floating icons)
  │           ├── <ClearCanvasButton>
  │           └── <SoundToggle>
  ├── <KeyboardBar>
  │     ├── <ModeToggle> (letters ↔ numbers)
  │     └── <KeyButton> (×26 letters or ×10 digits, depending on mode)
  ├── <ElevenLabsTTSManager> (singleton, wraps existing ElevenLabs integration)
  └── <HapticManager> (singleton, fires haptic events)
```

### State Model

```typescript
interface LetterPlaygroundState {
  canvasObjects: CanvasObject[];
  isSoundEnabled: boolean;
  ttsState: 'idle' | 'speaking';
  currentUtterance: string | null;  // key currently being spoken (letter or number)
  keyboardMode: 'letters' | 'numbers';  // which buttons are visible
}

interface CanvasObject {
  id: string;           // unique ID (uuid or incrementing counter)
  key: string;          // which letter or number spawned this
  word: string;         // e.g. "Apple" or "Rocket"
  imageSource: string;  // path to image asset (from existing config)
  x: number;            // canvas x position
  y: number;            // canvas y position
  scale: number;        // 0.5 to 3.0 (1.0 = default, where default = 10% screen width)
  zIndex: number;       // layering order
  rotation: number;     // degrees (0 by default, future feature)
}
```

### TTS Manager — Detailed Logic

```
function onKeyPress(key):
    // key = letter (A-Z) or number (0-9)
    // Step 1: ALWAYS fire haptic (never skipped, never delayed)
    hapticManager.fire('medium')

    // Step 2: ALWAYS drop image (never skipped, never delayed)
    spawnImageOnCanvas(key)

    // Step 3: Handle TTS via ElevenLabs
    if ttsState == 'idle':
        // Nothing playing — start new utterance
        speak(key)

    else if ttsState == 'speaking':
        if currentUtterance == key:
            // Same key mashed — let current utterance finish
            // Do NOT interrupt, do NOT queue
            return

        else:
            // Different key — interrupt and start new
            elevenLabs.cancel()
            speak(key)

function speak(key):
    ttsState = 'speaking'
    currentUtterance = key
    // Look up word from existing letter config or number config
    phrase = `${key} is for ${config[key].word}!`
    elevenLabs.speak(phrase, onComplete: () => {
        ttsState = 'idle'
        currentUtterance = null
    })
```

### Performance Considerations

The canvas supports up to 300 simultaneous objects. At that density, naive rendering will jank. The following optimizations are required:

#### Rendering Strategy
- **Hardware-accelerated transforms only.** Every canvas object must be positioned and scaled via CSS `transform: translate3d(x, y, 0) scale(s)` (web) or `Animated` / `react-native-reanimated` shared values (React Native). Never use `top`/`left` style properties for position — these trigger layout recalculation on every frame.
- **Hybrid canvas approach (recommended for 300 objects).** For objects that are NOT currently being interacted with, render them into an offscreen bitmap/canvas layer (a flattened raster). Only the actively-dragged or actively-resized object needs to live in the interactive DOM/view layer. When a touch begins on an object, promote it from the raster layer to the interactive layer. When the touch ends, flatten it back. This keeps the interactive layer at 1–2 elements maximum, regardless of total object count.
- **If hybrid is too complex for MVP:** Use a flat list of absolutely-positioned `<img>` or `<Image>` elements with `will-change: transform` (web) or `renderToHardwareTextureAndroid` / `shouldRasterizeIOS` (React Native). Profile on the lowest-spec target device at 300 objects and tune from there.

#### Image Memory Management
- **Pre-load all 26 letter images + 10 number images on screen mount.** Store decoded bitmaps in memory so there's zero decode latency when spawning.
- **Share image references.** 300 apples on the canvas should reference the same single decoded image in memory 300 times, not 300 separate copies. Each `CanvasObject` holds a reference to the shared bitmap, not its own copy.
- **Image size budget.** At 10% screen width spawn size, images don't need to be large in memory. Downscale source images to a reasonable max resolution (e.g. 256×256 or 512×512) on load to reduce GPU texture memory, even if the source files are larger.

#### Object Lifecycle
- **Soft cap: 300 objects.** When `canvasObjects.length >= 300`, remove the oldest object (lowest z-index / first-in) before adding a new one. Removal is silent — no animation, no notification.
- **Canvas clear performance.** Clearing 300 objects should not iterate and animate each one individually. Batch-remove all objects in a single state update, then play a single global clear animation (e.g. fade-out the entire canvas layer, then remove, then fade back in empty). Alternatively, play the "pop like bubbles" animation on a maximum of ~20 objects (evenly sampled from the set) and instantly remove the rest.

#### Gesture System
- **Gesture conflict resolution:** When a pinch gesture is detected on a canvas object, disable canvas panning for the duration of the gesture. When a drag gesture is detected, disable pinch for that touch sequence. Single-touch = drag. Two-touch on same object = resize.
- **Hit testing at scale.** With 300 objects, linear hit-testing on every touch event gets expensive. Use a spatial index (e.g. a simple grid-based hash) to narrow candidates before checking bounding boxes. Alternatively, rely on the platform's built-in hit-testing (DOM event targets on web, `hitSlop` on React Native) which is already optimized.
- **Throttle drag position updates** to the display refresh rate (60fps / requestAnimationFrame). Do not update state on every touch-move event — batch to frame boundaries.

#### Profiling Targets
- **60fps drag/resize** with 300 objects present on an iPhone SE (3rd gen) or equivalent low-spec target.
- **< 100ms** from button press to image visible on canvas.
- **< 50ms** from touch to drag-start visual response (scale-up + shadow).
- If any target is missed at 300 objects, the soft cap is tunable — drop to 250 or 200 as a configuration value, not a code change.

---

## Interaction Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Child presses 10 letters in 1 second | 10 images drop on canvas. Only the LAST letter's TTS plays (each new letter cancels the previous). Haptic fires for each press. |
| Child mashes same letter 20 times in 2 seconds | 20 images drop on canvas. TTS plays once for the first press, and again after the first finishes (if the child is still mashing when it completes). Haptic fires for each press. |
| Child drags an object while pressing a letter | Both actions succeed independently. The drag continues; the new image appears at a random position (not where the finger is dragging). |
| Child pinch-resizes an object while another image drops | Both actions succeed independently. The resize gesture continues; the new image appears separately. |
| Canvas has 300 objects and child presses another letter | Oldest object is silently removed. New object is added. No visible disruption. |
| ElevenLabs unavailable / no network | Degrade gracefully to native TTS with the same interrupt logic. Images and haptics still work. Log the error. Display a small visual text label ("A is for Apple!") near the spawned image as a fallback. |
| Device is on silent / ringer off | On iOS, TTS respects the silent switch by default. Consider using the audio session category that ignores the silent switch (`AVAudioSession.playback`), since this is an educational app where audio is core to the experience. Test and decide. |
| Child taps an object already on the canvas | (MVP) Nothing special happens — the object just moves to the top of the z-stack. (Post-MVP) Re-plays the TTS phrase and triggers a wiggle animation. |

---

## Visual Design Guidelines

All visual styling (colors, typography, spacing, border radius, etc.) inherits from the app's existing design system. No custom mood, palette, or type choices are needed for this module.

### Animations
- All animations should use spring/bounce easing — nothing linear or robotic.
- Button press: scale(0.9) → scale(1.05) → scale(1.0), ~250ms.
- Image drop: translateY(-50) → translateY(target) with overshoot, ~400ms.
- Image pickup (drag start): scale(1.05), shadow appears, ~150ms.
- Image release: scale(1.0), shadow fades, ~150ms.
- Clear canvas: all objects fly off in random directions or pop like bubbles, ~500ms stagger.

---

## Metrics & Analytics

Track the following events (anonymized, no PII, COPPA-compliant):

| Event | Payload |
|---|---|
| `letter_pressed` | letter, timestamp, time_since_last_press |
| `image_spawned` | letter, canvas_object_count |
| `image_dragged` | letter, drag_duration_ms |
| `image_resized` | letter, new_scale |
| `canvas_cleared` | object_count_at_clear |
| `session_started` | timestamp |
| `session_ended` | duration_seconds, total_presses, unique_letters_pressed |

These metrics help answer: Which letters does the child gravitate toward? How long are play sessions? Is the child interacting with the canvas (dragging/resizing) or just pressing buttons?

---

## MVP Scope vs. Future Enhancements

### MVP (Build This First)

- [ ] Responsive keyboard: single scrollable row on mobile, 2 rows on desktop/tablet
- [ ] Mode toggle button (letters ↔ numbers) inline with keyboard buttons
- [ ] Hidden physical keyboard support for numbers even in letter mode
- [ ] 26 letter buttons + 10 number buttons with haptic feedback and press animation
- [ ] ElevenLabs TTS integration with interrupt/no-queue logic as specified
- [ ] Image drop onto canvas at 10% screen width, with bounce animation
- [ ] Drag to reposition objects on canvas
- [ ] Pinch to resize objects on canvas
- [ ] Z-index management (tap or drag brings to front)
- [ ] Clear canvas button with animation
- [ ] Sound on/off toggle
- [ ] Pre-load all images (letters + numbers) on mount from existing asset bank
- [ ] Soft cap at 300 canvas objects (FIFO removal), configurable
- [ ] Performance optimizations for 300 objects (shared image refs, hardware-accelerated transforms, spatial hit-testing)
- [ ] Config-driven: letter → word → image mapping from existing config files

### Phase 2

- [ ] Tap canvas object to re-hear its TTS phrase + wiggle animation
- [ ] Long-press canvas object to delete it (with pop/confetti effect)
- [ ] Lowercase letter mode toggle (keyboard shows a–z instead of A–Z)
- [ ] Phonics mode toggle: TTS says the letter *sound* instead of the letter name ("ah" for A, "buh" for B)
- [ ] Background themes (chalkboard, paper, grass field, space)

### Phase 3

- [ ] Save/load canvas as a "drawing" the child can revisit
- [ ] Screenshot/share: export canvas as an image to share with family
- [ ] Multiple images per letter (A = apple, airplane, ant — cycles on repeat presses)
- [ ] Simple drawing tool: finger-paint lines on the canvas alongside the images
- [ ] Letter tracing overlay: when an image spawns, a faint outline of the letter appears briefly behind it, reinforcing letter shape recognition
- [ ] Sticker rotation: two-finger twist gesture to rotate objects on the canvas
- [ ] Localization: Spanish, French, etc. (swap manifest + TTS voice)

---

## Acceptance Criteria (MVP)

1. **Every key press produces three simultaneous responses:** haptic feedback, ElevenLabs TTS audio (subject to the interrupt rules), and an image appearing on the canvas. No exceptions.
2. **TTS never queues.** At most one utterance is in-flight at any time. Rapid presses of the same letter do not restart or stack audio. Pressing a different letter cancels the current utterance and starts the new one.
3. **Images always drop.** Regardless of TTS state, every single key press adds an image to the canvas. The image count should exactly match the number of button presses in a session (minus any FIFO removals after 300).
4. **Images spawn at 10% screen width.** Consistent across all devices and all letters/numbers.
5. **Canvas interactions are smooth.** Drag and pinch-resize must run at 60fps with no jank at 300 objects on-screen. Object pickup and release animations must feel responsive (< 100ms from touch to visual response).
6. **No modals, no dialogs, no confirmations, no quizzes.** The child never encounters a popup, a question, or any interruption to free play.
7. **Keyboard mode toggle works.** Tapping the toggle switches between letters and numbers. Physical keyboard number presses work in both modes.
8. **Responsive layout.** Mobile shows a single scrollable row; desktop/tablet shows two rows.
9. **Works offline (degraded).** If ElevenLabs is unreachable, fall back to native TTS. Images and haptics always work regardless of network.
10. **Session is ephemeral.** Closing the screen or the app clears the canvas. Reopening starts fresh.

---

## Open Questions

1. **R mapping:** Need to confirm the word and image for the letter R from the existing asset bank.
2. **Canvas object cap tuning:** 300 is the starting target. Performance-test on the lowest-spec target device. The cap should be a config value so it can be dropped to 250 or 200 without a code change if needed.
3. **ElevenLabs phrase caching:** Should we pre-generate all 36 phrases (26 letters + 10 numbers) at build time or on first screen load? Build-time caching eliminates all runtime latency but increases bundle size. First-load caching keeps the bundle lean but adds a one-time delay.
4. **Parent controls:** Should there be a hidden parent menu (e.g. triple-tap corner) to adjust volume, toggle phonics mode, or view session stats? Not in MVP, but consider for Phase 2.
