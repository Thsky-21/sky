# PLAN.md — DID WE MAKE IT?
## Three-minute animated portfolio: First-year Sky meets Third-year Sky

**Owner:** Sky (Akash Melavanki)  
**Purpose:** Wispr Flow Hiring Challenge portfolio  
**Runtime:** 03:00 (180 seconds)  
**Format:** One continuous film, divided into three acts of 60 seconds. For production, render six 30-second animation segments and stitch them together.  
**Primary characters:** First-year Sky (younger, approximately 2024) and Third-year Sky (current, approximately 2026). They are only about two years apart.

> **Read this first:** The younger character is NOT an old man and is NOT a 40-year-old future version. Both characters are young men, close in age, and visibly the same person at different points in college. First-year Sky asks the questions. Third-year Sky answers from what he has actually experienced.

---

# 1. The correct story premise

## Logline
Two years after arriving in Bengaluru with a dream of building a company, First-year Sky meets Third-year Sky and asks the question he has been carrying since day one: **"Did we make it?"** The answer is not a founder success story. It is an honest account of ideas, three product attempts, learning to build, failing to reach customers, financial pressure, a pause, and a new willingness to get outside and find real problems.

## Character relationship
- **FIRST-YEAR SKY:** the younger version of Sky, from his first year at MSRIT. Curious, hopeful, ambitious, slightly shy, and eager to know what happened to the dream. He asks the questions the audience is thinking.
- **THIRD-YEAR SKY:** the current version of Sky. Only about two years older. He knows what happened, so he is more direct, grounded and occasionally dry. He is not cruel, cynical or rude. As the conversation progresses, his guarded tone softens and he becomes empathetic towards the younger version.
- They are not a grandfather/future-self pairing. Do not make Third-year Sky look middle-aged or dramatically older.

## Emotional arc
1. **Curiosity:** First-year Sky expects a success story.
2. **Excitement:** he hears about the first build and the first reply.
3. **Confusion:** he learns that there were three product directions and no paying customers.
4. **Disappointment:** he realises that learning to build did not automatically mean learning to sell.
5. **Empathy:** Third-year Sky tells him that the dream was not stupid; he simply underestimated the difficult middle.
6. **Forward motion:** the two decide to leave the room and look for real problems among people.

## The truthful ending
Do not claim that Sky has already built a successful company, earned revenue, secured customers, attended a hackathon, or succeeded in physical AI. The ending is open: Sky is exploring physical AI and wants to build again with better contact with the real world.

---

# 2. Canonical production files

Claude Code must read these files before implementing:

1. `PLAN.md` — production rules, character direction, design, website and workflow.
2. `SCRIPT_TIMELINE.md` — the authoritative scene-by-scene, second-by-second film script, including exact dialogue, acting, camera, sound and transitions.
3. `dialogue.json` — the machine-readable dialogue source for temporary voice generation, final voice replacement and subtitles.

**Single source of truth:** dialogue text and timecodes in `dialogue.json` must match `SCRIPT_TIMELINE.md` exactly. Do not rewrite or improvise dialogue during rendering. If an adjustment is necessary because the line does not fit the performance, stop and report the exact line and proposed change rather than silently changing it.

---

# 3. Repository and animation approach

Repository: https://github.com/lemomo-ai/lemo-opuscar

## Selected style: `cel-anime-80s`
Use `styles/cel-anime-80s/STYLE.md` as the primary visual grammar.

Why it fits this particular film:
- The story needs expressive youthful characters, close-ups, readable facial acting and painted environments.
- Its flat two-tone character cels against painted backgrounds can keep both versions of Sky recognisable while the locations move between a college, hostel room, laptop-lit desk and Bengaluru streets.
- Its limited-animation character timing can give the dialogue a deliberate, hand-animated feel.
- It can be adapted to a grounded coming-of-age short rather than a neon action sequence.

**Adaptation rules:** keep the cel construction, painted backgrounds, controlled backlight and hand-drawn feeling. Reduce the CRT / videotape treatment to a very subtle texture. Do not make this a cyberpunk music video. Avoid excessive neon, huge glowing signage, exaggerated anime expressions or a teenage action-show aesthetic.

## Why not `scifi-toon`
The repository describes this as adult-animation sitcom grammar: thick boiling outlines, enlarged eyes, elastic mouths, dialogue-driven comedy and exaggerated reactions. It could work for a comedy, but this story depends on subtle emotional acting and a credible two-year age difference. It is not the best fit for this film.

## Repository facts Claude Code must respect
- This repository builds films through code; it is not a text-to-video model or a stock-footage generator.
- Its documented pipeline uses a single timeline to drive picture, voice, music, foley and subtitles, then mixes and muxes the result.
- Its directing guide says the film is judged through sound, rhythm, camera and performance, not just attractive frames.
- Its default film length is 30–60 seconds; a three-minute film is an intentionally longer production and should be built in reviewed segments.

## Required repository reading
Before coding, inspect the actual checked-out repository and read:
- `DIRECTOR.md`
- `TECHNIQUE.md`
- `core/README.md`
- `styles/cel-anime-80s/STYLE.md`
- `styles/cel-anime-80s/DEMO.md` only after the treatment and storyboard are written

Do not assume paths, command flags, functions or dependencies. Verify them from the checkout. Do not copy the demo film's characters, shots, story, palette or title. Borrow only the animation technique.

---

# 4. Character bible

## First-year Sky — younger self
- College year: First year at MSRIT; story period approximately 2024.
- Age relationship: only about two years younger than Third-year Sky. Keep the facial proportions almost identical.
- Look: same face, eye shape, nose, jaw, skin tone and overall height as Third-year Sky. Slightly tidier / newer college clothes, backpack or first-year lanyard, simple T-shirt or hoodie.
- Acting: sits forward, leans in, reacts quickly, gestures more, eyes brighter. His confidence is mixed with curiosity and a little shyness.
- Voice: youthful and recognisably the same person; curious, quicker, slightly more animated. Do not make him sound like a child.

## Third-year Sky — current self
- College year: Third year at MSRIT; current version.
- Age relationship: only about two years older. No wrinkles, grey hair, mature beard, deep old-man voice or middle-aged body shape.
- Look: same face and youthful proportions. Slightly more lived-in college clothing, perhaps a dark overshirt / hoodie. A laptop, notebook or keys can distinguish his current routine.
- Acting: more contained, grounded and direct. He sometimes looks away before admitting a difficult truth. A little dry humour is fine; no harshness or fake swagger.
- Emotional shift: starts guarded and matter-of-fact; becomes softer and empathetic when the younger version questions the dream.
- Voice: same youthful male identity as First-year Sky. Slightly steadier and calmer, not significantly deeper. The difference should come from performance, not artificial ageing.

## Absolute continuity rules
- Both characters must immediately read as the same young person.
- Do not depict one as 19 and the other as 40. The visual age gap is approximately two years.
- Do not add major facial hair or aged facial features to Third-year Sky.
- Distinguish them mainly through college-year clothing, posture, confidence, energy and vocal delivery.
- Make front, 3/4 and side model sheets for both before rendering. Keep face geometry consistent.
- Expression sheet: curious, excited, doubtful, defensive, disappointed, embarrassed, empathetic, quietly determined.

---

# 5. Voice direction

## Temporary voice generation
Generate temporary placeholder voices first, only to establish timing, pacing and the emotional difference. Do not treat these as final voice identities.

**First-year Sky voice prompt:**
"Young Indian male college student, around 19, natural conversational English with a light Bengaluru/Karnataka influence. Curious, hopeful, slightly shy at first, quick to ask questions, occasionally excited. It should sound like the same person as the other character, just a little less settled. No childish pitch, no caricatured accent, no announcer voice."

**Third-year Sky voice prompt:**
"Young Indian male college student, around 21, natural conversational English with the same broad Bengaluru/Karnataka influence. The same vocal identity as the younger speaker, only slightly steadier and more measured. Initially direct, guarded and mildly dry; becomes warm and empathetic near the end. No deep middle-aged voice, no movie-trailer delivery, no motivational-speaker tone."

## Final voice replacement
Sky will record the final dialogue himself. Build the project so every dialogue line has a separate audio file and stable line ID. Replacing the temporary voice assets must not require rebuilding the animation.

- Use separate WAV files for each line: `Y01.wav`, `T01.wav`, etc.
- Keep 0.3–0.6 seconds of clean room tone / edit handles around lines where possible.
- Make a `VOICE_REPLACEMENT.md` listing line ID, speaker, exact dialogue, duration target, file name and delivery note.
- Sky can perform both characters. Differentiate them through pace, intention, energy and small vocal choices—not an exaggerated pitch shift.
- If a very subtle pitch / EQ shift is used for First-year Sky, keep it minimal and reversible.
- No synthetic imitation of another real person.

## Performance rule
The characters must sound like two versions of the same person having an honest conversation—not two voice actors reading a script. Preserve breaths, small pauses and imperfect rhythms. Do not overact every line.

---

# 6. Visual direction and colour system

## Overall look
A polished, cinematic, youthful animated short for an 18+ audience. Mature means honest writing, restrained acting, strong composition and careful sound—not dark colours everywhere or adult-looking characters.

**Frame:** 16:9, 1920×1080 master, 24 fps output unless the selected style's actual instructions require a different frame rate. Character animation may use the style's stepped timing.  
**Character movement:** restrained and expressive—eye direction, breath, shoulder shifts, hands, leaning and follow-through.  
**Camera:** wide two-shots, over-shoulder dialogue shots, close-ups for admissions, inserts of objects, and controlled camera moves. No random movement in every shot.

## Palette
Use a consistent palette across the website and film:

| Token | Hex | Use |
|---|---|---|
| Deep ink | `#111820` | Website base and deepest shadows |
| Midnight blue | `#1D2B3A` | Conversation room and night scenes |
| Slate blue | `#40576A` | Secondary backgrounds and city distance |
| Warm ivory | `#F1EBDD` | Paper, dialogue subtitles and highlights |
| Muted amber | `#D3A15F` | Desk lamp, memory light and emphasis |
| Muted teal | `#6F9B9A` | Small current-day accent and screen light |
| Soft sage | `#8B9A88` | Reflective scenes and outside world |
| Rust | `#A76550` | Small accent for friction / failed attempts only |

### Colour arc
- First-year / college memories: warm late-afternoon amber, faded campus green, concrete grey and warm paper.
- Present conversation room: midnight blue, slate, warm desk-lamp amber.
- Building montage: deep blue with restrained monitor teal; keep skin tones natural.
- No replies / uncertainty: reduce saturation and let the room feel still; do not use an aggressive red failure screen.
- Ending: natural morning light, sage and amber. It should feel like a door opening, not a victory celebration.

## Character accent distinction
- First-year Sky: a small warm accent on backpack strap / lanyard / shirt detail.
- Third-year Sky: a small muted teal or slate accent on overshirt / notebook.
- Keep both outfits believable for MSRIT students. No business suits, luxury watches or founder stereotypes.

## Motifs
- **Blank sheet:** the future is unwritten; it becomes a visual bridge to memories.
- **Voice waveform:** younger Sky remembers the old voice notes; it briefly becomes a timeline of memories.
- **Email counter:** 10 sent → one reply in the first experiment; later 50 sent → zero replies. Keep these two attempts visually distinct.
- **Door:** the final decision to leave the room and meet people.

---

# 7. Three-minute structure

Use the exact timeline in `SCRIPT_TIMELINE.md` and the exact dialogue in `dialogue.json`.

| Act | Time | Story purpose |
|---|---:|---|
| Act I — The question | 00:00–01:00 | Hook, blank page, first-year ambition, arrival in Bengaluru |
| Act II — The attempts | 01:00–02:00 | Thinking → first build → three product directions → learning |
| Act III — The lesson | 02:00–03:00 | Distribution gap, zero revenue, pause, empathy, physical-AI exploration and moving outside |

## Segment rendering plan
The repository's documented default is 30–60 seconds. For reliable iteration, render six segments:
1. `clip_01_000-030`
2. `clip_02_030-060`
3. `clip_03_060-090`
4. `clip_04_090-120`
5. `clip_05_120-150`
6. `clip_06_150-180`

The six segments must join into one continuous 180-second film. Match character position, eyeline, camera direction, lighting, room geography, audio ambience and music across every seam. Do not add title cards between the six clips unless specified in the script.

---

# 8. Website experience

## Concept: a short-film screening room
The website should feel like entering a film, not opening a SaaS landing page or a résumé template.

### Opening screen
- Full viewport, deep ink background.
- Small eyebrow: `A SHORT FILM BY SKY`.
- Main title: `DID WE MAKE IT?`
- Subtitle: `First year meets third year.`
- One clear action: `PLAY FILM · 03:00`.
- Show a still frame of the two versions of Sky across the blank sheet.
- No sound autoplay. The visitor chooses to start.

### Film player
- Large 16:9 responsive player.
- Minimal controls: play/pause, sound, captions, scrubber and replay.
- Three chapter markers: `THE QUESTION`, `THE ATTEMPTS`, `THE LESSON`.
- Subtitles must be readable and must not cover either character's face.
- Respect reduced-motion settings. Provide a transcript and poster frame.
- Do not auto-play the film with sound.

### After-film interaction — audience value
After the credits/end frame, the two characters' empty chairs remain on screen. Present one question:

**"What would your first-year self ask you today?"**

Let the visitor answer by typing or, if browser speech recognition is supported, speaking. Show the words back as a small card / note. Do not upload, store or publish the visitor's answer. If speech recognition uses a browser speech service, disclose that the browser may process the audio; provide typing as an equal alternative. If this interaction cannot be implemented safely and reliably, ship the typed version first.

This interaction is not a game or a quiz. It turns the film's question back toward the viewer and gives them something personal to reflect on.

### Optional proof strip below the interaction
Use short, factual details—not decorative résumé cards:
- First outreach experiment: 10 emails, 1 reply.
- Later outreach: around 50 emails, 0 replies.
- Three product directions explored.
- One package shipped publicly, only if the exact package URL/status is checked before publication.
- Current exploration: physical AI.

Keep the two email experiments clearly separated. Do not imply revenue or customers.

### Site palette
- Background: `#111820`
- Main text: `#F1EBDD`
- Secondary text: muted slate / grey
- Accent: `#D3A15F`
- Focus and interaction: `#6F9B9A`
- Avoid generic blue-purple AI gradients, excessive glassmorphism, neon overload or startup dashboards.

---

# 9. Audio and music plan

- Create an original instrumental cue with a sense of forward motion, inspired by the feeling Sky described—not by copying the melody, arrangement or recording of the song he listens to.
- Opening: quiet room tone, hostel fan, distant Bengaluru traffic, chair movement and paper slide.
- College memory: soft bus/campus ambience; music introduces a light rhythmic pulse.
- Building montage: keyboard taps, laptop fan, notification, domain-purchase click, email send.
- No-reply moment: reduce the music almost to silence. Let the inbox remain on screen.
- Financial pressure / pause: softer, sparse instrumentation; page turns and room tone.
- Ending: morning outdoor ambience and a restrained musical lift, not a triumphant anthem.
- Dialogue must remain clear above music. Target integrated loudness around -14 LUFS if consistent with the repository's mix pipeline.
- Use only original or properly licensed music and sound effects. Add all used assets and licences to `CREDITS`.

---

# 10. Build workflow and acceptance gates

## Gate A — repository inspection
1. Inspect the checked-out project and repository status.
2. Read all required repository docs in Section 3.
3. Confirm Node / Python / ffmpeg requirements from the repository's current docs.
4. Confirm the actual render commands and required setup tiers.
5. Do not download optional asset packs unless the selected treatment requires them.

## Gate B — pre-production
1. Create `TREATMENT.md` with the logline, story turn, visual benchmark and sound arc.
2. Create `CHARACTER_BIBLE.md` based on Section 4.
3. Create identical-age-gap model sheets for First-year Sky and Third-year Sky.
4. Create two rendered style frames: opening blank-page two-shot and ending doorway shot.
5. Create a 6–9 frame storyboard sheet from the actual drawing code.
6. Check the characters are visibly only two years apart. Stop if one looks middle-aged.

## Gate C — voice and timeline
1. Read `dialogue.json` and use its line IDs as stable IDs.
2. Generate temporary voices for the exact lines.
3. Render each line as a separate audio file.
4. Check line duration against the assigned timecode. Do not time-stretch dialogue unnaturally.
5. Generate subtitles from the same dialogue source.
6. Keep the audio replaceable with Sky's real voice recordings.

## Gate D — animation
1. Render the first 30 seconds and review it before proceeding.
2. Render the second 30 seconds and review the Act I seam.
3. Continue with clips 03–06 in order.
4. Keep room geography and character screen direction consistent.
5. Use B-roll as transitions, not as a replacement for the two-character conversation.
6. Never create fictional product dashboards, customers, payments or revenue.

## Gate E — review and website
- Watch the complete film at normal speed with sound.
- Check every line against `dialogue.json` and `SCRIPT_TIMELINE.md`.
- Check subtitle timing and spelling.
- Check there are no black frames, frozen mouths, inconsistent faces, missing hands, broken props or audio gaps.
- Ensure the final runtime is 180 seconds.
- Test the website on desktop and mobile, keyboard controls and reduced motion.
- Test the public deployment in an incognito browser.

## Deliverables
- `PLAN.md`
- `SCRIPT_TIMELINE.md`
- `dialogue.json`
- `TREATMENT.md`
- `CHARACTER_BIBLE.md`
- `VOICE_REPLACEMENT.md`
- model sheets and storyboard sheet
- six 30-second renders
- final `did-we-make-it.mp4` (180 seconds)
- `did-we-make-it.srt`
- `poster.jpg`
- `CREDITS`
- reproducible build script and responsive website

---

# 11. Non-negotiable story safeguards

1. The younger character is First-year Sky, not an older person.
2. The current character is Third-year Sky, approximately two years older.
3. Keep the same youthful face and broadly similar voice for both.
4. The younger character asks questions; the current character answers.
5. The current character starts direct and guarded, then becomes empathetic.
6. Do not write a fake success ending. Sky has not claimed paying customers or revenue.
7. Separate the first experiment (10 emails, one reply) from the later outreach (around 50 emails, no replies).
8. Do not imply the first product failed only because of competitors; the customer segment was also a poor fit.
9. Do not say the third product was technically poor; Sky says he enjoyed building it and learned a lot.
10. Do not imply that Sky has already built a physical-AI product. It is a direction he is exploring.
11. Do not say Sky attended a hackathon; his story says he has not attended one yet. The first product idea emerged while discussing a hackathon idea with friends.
12. Do not invent names, customers, revenue, funding, product outcomes, dialogue from teachers or friends, or events.
13. No copied logos, brand look-alikes, unapproved photos, private emails or identifiable friends.
14. Do not copy a song. Create an original instrumental cue.

## Final test
A viewer should finish feeling they met a real third-year student who started with an ambitious first-year dream, learned to build through repeated attempts, discovered that distribution and customer understanding are hard, and is still willing to try. The film should not say "I made it." It should say: **"I haven't made it yet. But now I understand the next step better."**
