# Bookmark Garden Design

Date: 2026-03-26
Project: `mikepage`
Design direction: `Guided Canopy`

## Summary

Transform the current bookmark visualization from a generic 3D node cloud into an editorial, guided "signal garden" for public visitors. The experience should preserve the existing Three.js identity while making bookmark relationships easier to understand, warmer in tone, and more rewarding to explore.

The north star is `sensemaking with a little joy`. Delight should come from watching meaning emerge through soft motion, readable path reveals, and rich previews, not from spectacle for its own sake.

## Design Context

- Target audience: public visitors
- Primary job: quickly understand what kinds of ideas are saved here and discover meaningful connections between them
- Personality: editorial, lucid, cultivated, slightly poetic
- Interaction bias: guided rather than freeform

## Goals

- Make the bookmark space legible to a first-time visitor within seconds
- Keep the immersive quality of the current 3D scene
- Reveal relationships as paths, not just as an arbitrary list of related links
- Use richer previews so visitors can learn without opening every bookmark
- Make the experience feel distinctive and personal rather than dashboard-like

## Non-Goals

- Building a complex analytics or filter-heavy interface
- Turning the experience into a full bookmark management tool
- Adding decorative motion that does not improve comprehension
- Replacing the 3D scene with a conventional grid or list-first layout

## Experience Concept

The page becomes a living canopy of bookmark blooms suspended in an atmospheric botanical field. Nodes feel cultivated instead of floating in empty black space. The interface frames the content as a garden of ideas: selecting one bloom helps nearby meanings grow into view.

Visitors should understand the basic model quickly:

1. Hover a bloom to get a minimal hint.
2. Click a bloom to anchor the scene.
3. Watch the strongest paths reveal themselves outward.
4. Read the preview rail for explanation and follow links from there.

The memorable behavior is that the scene appears to reorganize around a chosen idea. Related bookmarks subtly gather, brighten, and become more readable as the interface explains why they are connected.

## Interface Structure

### 1. Living Canvas

The full-bleed Three.js scene remains the main surface.

- Replace the harsh space-like black background with a warmer atmospheric field
- Use tinted fog, depth, and soft color variation to create a botanical mood
- Nodes should feel more like luminous seeds or blooms than identical spheres
- Visual variation should be driven by tag family, relationship strength, and hover or selection state

### 2. Intro Guide

A compact, non-modal onboarding guide appears on first load.

- One sentence explains the metaphor in plain language
- One primary action suggests how to begin, such as "Pick a bloom to see what it leads to"
- It should recede once the user starts interacting
- It must not cover the whole screen or interrupt exploration

### 3. Focus Rail

The current right-side related bookmarks panel becomes a more editorial reading companion.

- Top section shows the selected bookmark with thumbnail, title, short excerpt, and tags
- Below it, related bookmarks are shown as a ranked sequence
- Each result includes thumbnail, title, excerpt, tags, and a plain-language explanation of why it appears
- Links open externally as they do now

The rail should feel like an annotated field journal, not a generic utility drawer.

### 4. Path Lens Control

A small control near the focus rail changes how paths are revealed.

- `Closest`: strongest obvious relationships
- `Surprising`: less expected but defensible relationships
- `By tag family`: grouped thematic branches

This control adds a small amount of agency without turning the interface into a settings-heavy dashboard.

## Interaction Model

### Idle State

- The canopy has a very slow ambient drift
- The scene remains spacious and readable
- No major panels are open
- The intro guide is visible for first-time visitors

### Hover State

- The hovered bloom sharpens and brightens slightly
- Its immediate neighborhood becomes more visible
- A small tooltip shows title and one-line context
- Hover does not open the full rail

### Focus State

On click, the selected bookmark becomes the anchor for the scene.

- The camera performs a short assisted reframing move
- Unrelated blooms dim slightly
- The strongest 6 to 12 related paths reveal themselves in short staggered sequence
- The focus rail opens in sync with the reveal
- Preview thumbnails load into the rail just after path reveal

The scene should feel like it is being "tended" around the chosen idea.

### Return To Rest

The user can clear focus using:

- Escape
- Background click
- A clear close control in the rail

Returning to rest should reverse the reveal cleanly and restore the ambient canopy state.

## Motion Direction

Motion must support understanding.

- Ambient motion: very slow, subtle drift only
- Hover motion: micro-intensity shifts and tiny local response
- Focus motion: short camera assistance, staggered path reveal, soft dimming of unrelated nodes
- Rail motion: smooth, editorial entrance aligned with the scene reveal

Avoid:

- Constant swirling or noisy floating
- Bouncy easing
- Large motion on hover
- Simultaneous reveal of every path

Preferred feel:

- soft
- organic
- deliberate
- calm
- articulate

## Visual Direction

### Tone

Editorial botanical futurism. Warm, cultivated, and atmospheric rather than cosmic, gamer-like, or cyber.

### Color

- Neutrals should be tinted, not pure black or white
- Background should use deep moss, soil, bark, mist, and pollen-like accent tones
- Tag families should map to a disciplined, nature-adjacent palette rather than rainbow noise
- Selected and related states should feel luminous without becoming neon

### Form

- Nodes should evolve from uniform spheres toward more seed-like or bloom-like variation
- Path lines should feel alive and intentional, more like tendrils or illuminated threads than technical graph edges
- UI panels should feel editorial and airy, not glassy or over-containerized

## Content And Copy

The page should use concise, explanatory copy that helps first-time visitors immediately.

Examples of tone:

- "A garden of saved ideas."
- "Pick a bloom to see what it leads to."
- "Why this path: shared interface design, tools, and note-taking."

Copy should be plainspoken and lightweight. No whimsical over-writing.

## Data And Relationship Logic

The current system already derives relatedness from shared tags. The new design should keep that as the baseline, but present it more clearly.

### Closest

- Rank bookmarks by number and strength of shared tags
- Favor interpretable relationships

### Surprising

- Down-rank overly obvious tag overlap
- Up-rank combinations that bridge tag families while still sharing enough common ground to feel defensible
- The exact scoring can be heuristic, but the output must stay explainable

### By Tag Family

- Group related results under broader tag clusters
- Each revealed branch should feel like a mini-subtopic growing from the selected bloom

All relationship modes should produce plain-language explanations in the focus rail.

## Use Of Existing Project Capabilities

- Keep the existing Three.js scene, instanced mesh approach, and OrbitControls foundation
- Reuse the thumbnail generation endpoint for rich previews
- Preserve current click and hover concepts, but refine the behavior and presentation
- Build on the existing related-bookmarks logic rather than replacing it with a new backend system

## Accessibility And Resilience

- Preserve keyboard dismissal with Escape
- Ensure focus rail controls are keyboard reachable
- Maintain readable contrast in both atmospheric canvas and rail UI
- Keep motion respectful and reduce or simplify effects when reduced-motion preference is present
- Ensure the experience still teaches itself if thumbnails fail to load
- Prevent tooltip and panel overflow on smaller screens

## Responsive Behavior

Desktop is the primary showcase, but the design must adapt rather than degrade.

- On smaller screens, the focus rail should become a bottom sheet or stacked panel
- The intro guide must remain concise and unobtrusive
- The main interaction model must remain usable without precise desktop hover
- Tap should substitute for hover hints where necessary

## Testing Expectations

Testing should cover the behavior that defines the experience, not just page existence.

- First-load onboarding appears for new visitors
- Selecting a bloom opens the focus rail
- Clearing selection restores resting state
- Path lens mode changes update the related results meaningfully
- External links remain functional
- Reduced-motion mode still preserves comprehension

Playwright coverage should expand beyond the current placeholder test.

## Risks

- Too much motion could make the scene feel noisy instead of intelligible
- Rich previews could overwhelm the spatial experience if the rail becomes too dominant
- Relationship scoring for `surprising` could feel arbitrary if explanations are weak
- A stronger visual metaphor could become kitsch if color and motion are not disciplined

## Recommended Implementation Scope

This is an appropriate single feature spec. It should be implemented in phases:

1. Establish new visual and atmospheric baseline
2. Redesign selection flow and focus rail
3. Add path lens modes and explanation copy
4. Refine motion, onboarding, and responsiveness
5. Add stronger behavioral tests

## Decision

Proceed with `Guided Canopy` as the implementation direction.
