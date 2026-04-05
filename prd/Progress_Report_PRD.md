# Product Requirement Document: Progress Report

## Overview

**Feature Name:** Progress Report
**Parent Product:** Letter Playground (existing learning app)
**Target User:** Parents of children ages 2–4 using the app
**One-Line Summary:** An AI-powered progress report that tracks a child's letter and number recognition across game modes, stores data locally per child name, and uses Google Gemini to generate personalized insights and coaching recommendations for parents.

---

## Problem Statement

Parents currently have no visibility into how their child is performing in the app. They can sit next to the child and observe, but they can't see patterns over time — which letters consistently confuse their child, which ones they've mastered, or what to focus on next. The app generates rich interaction data (every button press, every correct/incorrect answer in quiz modes) but none of it is captured or surfaced.

This feature turns that raw interaction data into actionable parenting insights without requiring an account, a login, or any cloud infrastructure.

---

## Design Philosophy

The progress report is **for the parent, not the child.** The child's experience remains unchanged — zero-pressure, play-first, no testing anxiety. The progress report lives behind a parent-facing screen that the child never needs to see or interact with.

The system should feel like having a patient, knowledgeable early childhood educator reviewing your child's work and saying: "Here's what I'm noticing, and here's what I'd try next."

---

## Game Modes That Generate Tracking Data

The app has three distinct interaction modes that each produce trackable data. The progress report must track and report on each independently.

### Mode 1: Easy Mode (Visual Letter Matching)

The app shows a letter on screen and asks the child to pick the matching letter from a set of options below. This is pure visual recognition — matching the shape of a letter to itself.

**What to track per attempt:**
- Target letter/number shown
- Options presented (the answer set)
- Which option the child selected
- Whether the selection was correct
- Timestamp
- Time to respond (milliseconds from presentation to selection)

**Insights this mode reveals:** Which letters the child can visually recognize and distinguish from similar-looking letters. Common confusions here (e.g., b/d, p/q, m/w) are well-documented in early literacy research and the report should flag them.

### Mode 2: Sound Mode (Auditory Letter Matching)

The app plays the sound of a letter (its phoneme or name) and asks the child to pick the correct letter from a set of options. This tests auditory-to-visual mapping.

**What to track per attempt:**
- Target letter/number (the one whose sound was played)
- Options presented
- Which option the child selected
- Whether the selection was correct
- Timestamp
- Time to respond
- Whether the sound was replayed before answering

**Insights this mode reveals:** Whether the child can connect what they hear to what they see. Some children are strong visual matchers but struggle with sound association, or vice versa. The report should surface this gap.

### Mode 3: Image-to-Object Mode (Association Matching)

The app shows an image (e.g., an apple) and asks the child to pick the letter that the object starts with. This tests the full association chain: object → word → first letter.

**What to track per attempt:**
- Target image shown and its associated letter
- Options presented
- Which option the child selected
- Whether the selection was correct
- Timestamp
- Time to respond

**Insights this mode reveals:** Whether the child understands the relationship between objects, words, and letters. This is the most cognitively complex mode and typically the last to develop.

---

## Data Storage Architecture

### Local Storage, No Account Required

All progress data is stored in the browser's `localStorage`. There is no account system, no cloud sync, no authentication. The data lives on the device.

### Name-Based Profiles

The app's home page has a name field. The value in this field determines whose progress data is being tracked.

**Rules:**

1. When a name is entered (e.g., "Sammy"), all subsequent game interactions are logged under the key `progress_sammy` (normalized to lowercase, trimmed).
2. If the name changes to "Isabel," tracking switches to `progress_isabel`. Sammy's data remains untouched in localStorage.
3. If the name changes back to "Sammy," the system recognizes the existing `progress_sammy` data and resumes tracking against it. No data is lost.
4. If the name field is empty, tracking still occurs under a default key (e.g., `progress_default` or `progress_unnamed`). The progress report still works — it just won't have a personalized name in the header.
5. Name matching is case-insensitive and whitespace-trimmed. "Sammy", "sammy", " SAMMY " all resolve to the same profile.

### localStorage Schema

```json
{
  "progress_profiles": ["sammy", "isabel"],
  "progress_sammy": {
    "name": "Sammy",
    "created_at": "2026-03-15T10:00:00Z",
    "last_active": "2026-04-05T14:30:00Z",
    "sessions": [
      {
        "session_id": "s_1712345678",
        "started_at": "2026-04-05T14:00:00Z",
        "ended_at": "2026-04-05T14:30:00Z",
        "attempts": [
          {
            "mode": "easy",
            "target": "B",
            "type": "letter",
            "options": ["B", "D", "P", "R"],
            "selected": "D",
            "correct": false,
            "response_time_ms": 4200,
            "timestamp": "2026-04-05T14:02:15Z"
          },
          {
            "mode": "sound",
            "target": "A",
            "type": "letter",
            "options": ["A", "E", "O", "U"],
            "selected": "A",
            "correct": true,
            "response_time_ms": 2100,
            "replayed_sound": false,
            "timestamp": "2026-04-05T14:03:42Z"
          },
          {
            "mode": "image",
            "target": "C",
            "target_image": "cat",
            "type": "letter",
            "options": ["C", "K", "S", "T"],
            "selected": "K",
            "correct": false,
            "response_time_ms": 5800,
            "timestamp": "2026-04-05T14:05:10Z"
          }
        ]
      }
    ]
  }
}
```

### localStorage Size Management

Each attempt record is roughly 200–300 bytes. At 50 attempts per session and daily usage, that's ~15KB per month per child — well within localStorage limits (typically 5–10MB). However, the system should:

- Monitor total storage used by all profiles
- If approaching 4MB total, warn the parent on the progress report screen: "Storage is getting full. Consider clearing old data for inactive profiles."
- Provide a "Clear data for [name]" option on the progress report screen
- Never auto-delete without parent confirmation

---

## Progress Report UI

### Accessing the Report

The progress report is accessible via a button/link on the home page or a parent-facing menu. It is **not** accessible from within the game itself (to avoid breaking the child's flow).

When the parent taps "Progress Report," the app shows the report for whichever name is currently in the name field. If no name is entered, show the default profile's data.

### Report Structure

The report is a single scrollable page with the following sections:

#### Header
- Child's name (from the profile)
- Date range of tracked data (e.g., "March 15 – April 5, 2026")
- Total sessions and total attempts
- Last active date

#### Section 1: Overall Summary

A high-level snapshot of how the child is doing. This is AI-generated via Google Gemini (see AI Integration section). It should read like a short paragraph from a teacher's progress note.

Example (with sufficient data):
> "Sammy has been practicing consistently over the past 3 weeks with 12 sessions. She's showing strong visual letter recognition — she correctly identifies most letters in Easy Mode about 78% of the time. Her biggest challenge right now is distinguishing B from D, which is very common at this age. Sound-based recognition is developing well, though she tends to need more time with vowel sounds. She hasn't had much exposure to Image-to-Object matching yet, so that's a natural next step."

Example (with minimal data):
> "Sammy just started! With only 2 sessions so far, it's too early to spot patterns, but here's what we know: she's been exploring letters in Easy Mode and seems comfortable with A, M, and S. Keep going — the more she plays, the more specific these insights will get."

#### Section 2: Mode-by-Mode Breakdown

Three sub-sections, one per game mode. Each shows:

**Easy Mode (Visual Matching)**
- Overall accuracy percentage
- Letters/numbers mastered (≥80% accuracy over 5+ attempts): displayed as green badges
- Letters/numbers struggling with (≤50% accuracy over 3+ attempts): displayed as red/orange badges
- Common confusions: a list of pairs the child frequently mixes up (e.g., "Picks D when shown B — 6 out of 8 times")
- Trend: improving, steady, or declining (based on rolling accuracy over last 3 sessions vs. prior 3)

**Sound Mode (Auditory Matching)**
- Same structure as Easy Mode
- Additional insight: "Replays sound frequently for: E, I, U" (if the child often re-listens before answering)

**Image-to-Object Mode (Association Matching)**
- Same structure as Easy Mode
- Additional insight: which object-letter pairs are strongest/weakest

#### Section 3: AI-Generated Recommendations

This is the coaching section. It is generated by Google Gemini based on the child's data and framed as advice from a child education specialist to the parent. It should include:

1. **What to focus on next** — specific letters or modes to prioritize, based on the data.
2. **Activities to try** — concrete suggestions the parent can do at home (e.g., "Try tracing the letter B with your finger while saying its name. Then do the same with D. Emphasize that B has bumps on the right and D has a bump on the left.").
3. **Encouragement and context** — normalize what the child is experiencing. "Confusing b and d is one of the most common challenges in early literacy. Most children work through this between ages 4–6. You're giving Sammy a head start by exposing her to it now."
4. **General coaching** (when data is sparse) — if there aren't enough attempts to generate specific insights, provide general early literacy coaching tips that are always useful. Examples:
   - "At this age, repetition is the most powerful learning tool. Don't worry if she presses the same letter 20 times — that repetition is building neural pathways."
   - "Try pointing out letters in the real world — on cereal boxes, street signs, book covers. This bridges the gap between the app and everyday life."
   - "Children often recognize the first letter of their own name before any other letter. Use 'S is for Sammy' as an anchor."
5. **Known common struggles** — even without data, the AI should bake in knowledge of where children typically struggle most:
   - Letters: b/d, p/q, m/w, n/u are the classic visual confusion pairs
   - Letters: E/I/U vowel sounds are harder to distinguish than consonants
   - Numbers: 6/9, 2/5, and 12/21 (digit reversal) are common
   - The progression from visual recognition → sound association → object-letter mapping is a known developmental sequence

---

## AI Integration (Google Gemini)

### How It Works

When the parent opens the Progress Report, the app:

1. Reads the child's profile data from localStorage
2. Computes aggregate statistics (accuracy per letter, per mode, confusion pairs, trends)
3. Sends a structured prompt to the Google Gemini API (or the app's existing AI API endpoint) with the computed stats
4. Receives the AI-generated summary and recommendations
5. Renders the response in the report UI

### Prompt Structure

The prompt sent to Gemini should follow this template:

```
You are an early childhood education specialist reviewing a young child's progress in a letter and number recognition app. The child's name is {name} and they are approximately 3 years old.

Here is their performance data:

EASY MODE (Visual Letter Matching):
- Total attempts: {n}
- Overall accuracy: {x}%
- Letters mastered (≥80% accuracy, 5+ attempts): {list}
- Letters struggling (≤50% accuracy, 3+ attempts): {list}
- Common confusion pairs: {list of "picks X when shown Y" with counts}
- Trend: {improving/steady/declining}

SOUND MODE (Auditory Matching):
- Total attempts: {n}
- Overall accuracy: {x}%
- Letters mastered: {list}
- Letters struggling: {list}
- Letters where sound is frequently replayed: {list}
- Trend: {improving/steady/declining}

IMAGE-TO-OBJECT MODE (Association Matching):
- Total attempts: {n}
- Overall accuracy: {x}%
- Strongest pairs: {list}
- Weakest pairs: {list}
- Trend: {improving/steady/declining}

SESSION HISTORY:
- Total sessions: {n}
- Date range: {start} to {end}
- Average session length: {minutes}
- Sessions in last 7 days: {n}

Based on this data, provide:
1. A warm, encouraging 2-3 sentence summary of how {name} is doing overall. Speak directly to the parent.
2. A "Focus Areas" section with 2-3 specific things to work on, ordered by priority.
3. A "Recommended Activities" section with 2-3 concrete, practical activities the parent can do at home or during app time. Be specific — don't just say "practice more."
4. A "Context & Encouragement" section that normalizes what the child is experiencing and provides developmental context.

If the data is sparse (fewer than 20 total attempts), provide general early literacy coaching instead of data-specific insights, but still reference any patterns you can see. Borrow from established research on common early literacy challenges.

Tone: warm, knowledgeable, reassuring. Like a favorite preschool teacher talking to a parent at pickup. Never clinical or alarming. Use the child's name.
```

### API Call Details

- **Model:** Google Gemini (or the app's existing AI API — whichever is already integrated)
- **Endpoint:** Use the app's existing AI API infrastructure if available. If not, call the Gemini API directly.
- **Rate limiting:** Cache the AI response in localStorage for 1 hour. If the parent re-opens the report within that window, show the cached version. This prevents excessive API calls during a single review session.
- **Fallback:** If the API call fails (network error, rate limit), display the computed statistics without the AI narrative sections. Show a message: "Couldn't generate personalized insights right now. Here's the raw data." The statistical breakdowns (accuracy percentages, mastered/struggling lists, confusion pairs) should always render, AI or not.
- **Loading state:** While waiting for the AI response, show the statistical sections immediately (these are computed locally) and display a skeleton/loading state for the AI narrative sections.

---

## Data Collection Implementation

### Where to Instrument

Every game mode that presents a question and accepts an answer must log an attempt record. The logging function should be a single shared utility that all game modes call:

```typescript
interface AttemptRecord {
  mode: 'easy' | 'sound' | 'image';
  target: string;              // the correct answer (letter or number)
  type: 'letter' | 'number';
  options: string[];           // the answer choices presented
  selected: string;            // what the child picked
  correct: boolean;
  response_time_ms: number;
  timestamp: string;           // ISO 8601
  replayed_sound?: boolean;    // sound mode only
  target_image?: string;       // image mode only (e.g., "cat")
}

function logAttempt(attempt: AttemptRecord): void {
  const name = getCurrentProfileName(); // from the home page name field
  const profileKey = `progress_${name.toLowerCase().trim() || 'default'}`;
  
  // Get or create profile
  let profile = JSON.parse(localStorage.getItem(profileKey) || 'null');
  if (!profile) {
    profile = createNewProfile(name);
    addToProfileList(profileKey);
  }
  
  // Get or create current session
  let currentSession = getOrCreateCurrentSession(profile);
  currentSession.attempts.push(attempt);
  
  // Save
  profile.last_active = new Date().toISOString();
  localStorage.setItem(profileKey, JSON.stringify(profile));
}
```

### Session Management

A session starts when the child enters any game mode and ends when:
- The child returns to the home page
- The app is backgrounded for more than 5 minutes
- The browser tab is closed or navigated away

Sessions group attempts for temporal analysis (e.g., "she did better in her morning sessions this week").

### What NOT to Track

- Free play on the canvas (Letter Playground mode) — this is unstructured play with no right/wrong answers
- How long the child spends dragging objects around
- Which letters the child presses in free play mode (this has no assessment value)

Only quiz/matching modes where there is a correct answer generate tracking data.

---

## Statistics Computation (Client-Side)

These calculations run locally before the AI prompt is assembled. They should be computed fresh each time the report is opened.

### Per-Letter/Number Stats

For each letter (A–Z) and number (0–9), across each mode:
- Total attempts
- Correct count
- Accuracy percentage
- Average response time
- Most common wrong answer (the letter/number they pick instead)

### Mastery Classification

| Classification | Criteria |
|---|---|
| Mastered | ≥80% accuracy AND ≥5 attempts in that mode |
| Developing | 50–79% accuracy OR fewer than 5 attempts |
| Struggling | ≤50% accuracy AND ≥3 attempts in that mode |
| Not yet attempted | 0 attempts |

### Confusion Pair Detection

For each letter where accuracy is below 70%, identify which wrong answer appears most frequently. If a specific wrong answer accounts for ≥40% of errors, flag it as a confusion pair.

Example: If B is shown 10 times and the child picks D 5 times, picks P once, and picks B correctly 4 times — the confusion pair is B→D.

### Trend Calculation

Compare accuracy in the most recent 3 sessions vs. the prior 3 sessions. If the recent average is ≥10 percentage points higher, trend = improving. If ≥10 points lower, trend = declining. Otherwise, trend = steady.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Name field is empty | Track under `progress_default`. Report header says "Your Child" instead of a name. |
| Name has special characters | Strip non-alphanumeric characters for the storage key. Display the original name in the UI. |
| Name is very long | Truncate the storage key to 50 characters. Display the full name. |
| Two children with similar names (e.g., "Sam" and "Sammy") | These are separate profiles. The system treats them independently. |
| localStorage is disabled or full | Show an error message on the progress report screen: "Progress tracking requires browser storage to be enabled. Your browser's storage may be full or disabled." Game modes still work — they just don't log data. |
| Child switches names mid-session | The session continues logging under the new name. The old name's session is closed. |
| Profile has data but 0 quiz attempts (only free play) | Show the report with a message: "No quiz data yet! Try the matching games to start tracking progress." |
| AI API returns an error | Display computed statistics without narrative sections. Show a retry button. |
| AI API returns inappropriate content | The prompt is tightly scoped to educational content. If the response contains anything off-topic, discard it and show stats only. |

---

## UI/UX Details

### Visual Design

Follow the app's existing design system. The progress report should feel warm and inviting — not like a clinical assessment. Use the same color palette, typography, and component styles as the rest of the app.

**Mastered letters:** Green background badge or checkmark
**Struggling letters:** Soft orange/amber badge (not red — avoid alarm)
**Developing:** Blue or neutral badge
**Not attempted:** Gray, muted

### Accessibility

- All text in the report should be legible at the app's default font size
- Color coding should be supplemented with icons or text labels (not color alone)
- The report should be scrollable and not require horizontal scrolling on any screen size

### Loading States

1. Parent taps "Progress Report"
2. Immediately: render the header and statistical sections (computed locally, instant)
3. Show skeleton loaders for the AI-generated Summary and Recommendations sections
4. Fire the Gemini API call
5. When the response arrives, fade in the AI sections
6. If the API call takes >10 seconds, show a "Taking longer than usual..." message
7. If it fails, show stats-only view with retry option

---

## Privacy Considerations

- All data stays on the device. Nothing is sent to a server except the aggregated statistics sent to the Gemini API for insight generation.
- The Gemini API prompt contains no personally identifiable information beyond the child's first name. No device IDs, no location, no images.
- Parents should be able to delete all data for a profile at any time.
- Consider adding a brief privacy note on the progress report screen: "All progress data is stored on this device only. Aggregated statistics are sent to our AI service to generate personalized insights."

---

## MVP Scope

### Build This

- [ ] Attempt logging utility that all game modes call on each answer
- [ ] localStorage profile management (create, read, switch, list)
- [ ] Name-based profile switching tied to the home page name field
- [ ] Session management (start, end, timeout)
- [ ] Progress Report screen accessible from home page
- [ ] Client-side statistics computation (per-letter accuracy, confusion pairs, trends, mastery classification)
- [ ] Statistical display: mastered/struggling badges, confusion pair list, accuracy percentages, per-mode breakdowns
- [ ] Google Gemini API integration for summary and recommendations
- [ ] AI response caching (1 hour)
- [ ] Fallback to stats-only view if AI fails
- [ ] "Clear data for [name]" action
- [ ] Privacy notice

### Don't Build Yet (Phase 2+)

- [ ] Export report as PDF or image for sharing
- [ ] Historical trend charts (line graphs showing accuracy over time)
- [ ] Push notifications ("Sammy hasn't practiced in 3 days!")
- [ ] Multi-device sync (would require an account system)
- [ ] Comparison between children
- [ ] Detailed per-session drill-down view
- [ ] Goal setting ("Let's get B to 80% this week!")
- [ ] Integration with the Letter Playground free-play mode (tracking press patterns for exposure data)

---

## Acceptance Criteria

1. **Every quiz-mode answer is logged.** Whether the child gets it right or wrong, easy/sound/image mode, every answer produces a record in localStorage.
2. **Name switching works bidirectionally.** Change name from Sammy to Isabel and back — both profiles retain their data independently.
3. **The report renders instantly for statistics.** The computed stats (accuracy, confusion pairs, badges) appear within 1 second of opening the report. Only the AI sections wait on the network.
4. **The AI summary reads like a teacher, not a robot.** It uses the child's name, references specific letters, and provides actionable advice — not generic platitudes.
5. **The report degrades gracefully.** If the AI call fails, the parent still sees a complete statistical breakdown. If localStorage is unavailable, the app still works — it just doesn't track.
6. **Confusion pairs are accurate.** If a child picks D when shown B four out of five times, the report flags "B → D confusion" — not the reverse.
7. **The report respects the child's experience.** No part of the progress report is visible to the child during gameplay. No scores, no grades, no "you got it wrong" messaging leaks into the game modes.

---

## Technical Notes

### localStorage Key Convention

```
progress_profiles          → ["sammy", "isabel", "default"]
progress_sammy             → { full profile object }
progress_isabel            → { full profile object }
progress_report_cache_sammy → { cached AI response + timestamp }
```

### Gemini API Response Caching

```typescript
interface CachedReport {
  generated_at: string;    // ISO 8601
  summary: string;         // AI-generated summary HTML/markdown
  recommendations: string; // AI-generated recommendations HTML/markdown
  data_hash: string;       // hash of the stats that were sent — if stats change, invalidate cache
}
```

Cache invalidation: expire after 1 hour OR if the underlying data has changed (new attempts logged since the cached response was generated). Use a simple hash of the attempt count + last attempt timestamp to detect changes.

### Performance

- Statistics computation should complete in <100ms even with 1,000+ attempt records
- The Gemini API call should have a 15-second timeout
- localStorage reads/writes should be batched where possible (don't write after every single attempt — batch per session end or every 10 attempts, whichever comes first)
