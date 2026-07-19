# Codebase Audit — Bookmark Garden

**Date**: 2026-07-19
**Scope**: Full repository — source, data, tests, CI, docs.
**Verification performed**: production build (passes), `npm run lint` (fails), Playwright suite (7/8 pass; 1 deterministic test bug), data-file analysis.

Findings are ordered by severity. File references use current line numbers.

---

## Critical — visible bugs in production

### 1. Connection lines detach from their nodes within seconds
`animate()` rotates the instanced mesh continuously (`src/routes/+page.svelte:486`), but `createConnectionLines()` builds line endpoints from the *local* instance matrices (`+page.svelte:284-293`) and adds `lineGroup` directly to the scene. The mesh rotates ~2°/second, so lines point at where the spheres were at page load and keep drifting. Raycasting/hover still work (the raycaster respects world matrices), which makes the lines look randomly misplaced.

**Fix**: add `lineGroup` as a child of `instancedMesh` so it inherits the rotation, or apply `instancedMesh.matrixWorld` to endpoint positions and keep the group in sync in `animate()`.

### 2. Empty tags create a giant fake "related" cluster and a performance cliff
1,164 of the 2,000 rendered bookmarks have `tags: ""`. `''.split(' ')` yields `['']`, so the empty string acts as a tag every untagged bookmark shares. Clicking any untagged bookmark makes all ~1,163 others "related" (`+page.svelte:116-125`) and creates a `Line2` with its own geometry *and* material for each — the page will hitch hard or freeze. `src/lib/bookmarks/relations.js:1` already filters with `.filter(Boolean)`, but the page's own tag logic (lines 68, 94, 112, 118-134, 388, 430, 441) does not.

**Fix**: export `splitTags` from `relations.js` and use it everywhere; treat zero-tag bookmarks as having no relations.

### 3. Lines are drawn for the wrong set
The FocusRail shows the top 12 lens-ranked paths, but 3D lines are drawn to *every* bookmark with any tag overlap — potentially hundreds. Drawing lines only to the 12 `relatedBookmarks` shown in the rail fixes the perf issue in #2, makes the visualization match the panel, and makes lens switching actually change the lines (today it only changes the rail).

### 4. The render loop is never cancelled — leak on unmount
`animate()` re-schedules itself unconditionally (`+page.svelte:478-491`) and the `onMount` cleanup never calls `cancelAnimationFrame`. After navigation the loop keeps calling `composer.render()` on a disposed renderer.

**Fix**: store the rAF id and cancel it in cleanup (or use `renderer.setAnimationLoop`).

### 5. Clicks use a stale mouse position — broken on touch, flaky on desktop
`onMouseClick` (`+page.svelte:464`) raycasts with the `mouse` vector last set by the 50 ms-throttled `mousemove`. On touch devices there is often no mousemove before the tap, so the raycast fires from the last position (or 0,0 = screen center) and selects the wrong bookmark.

**Fix**: compute NDC coordinates from the click event itself. Related: finishing an OrbitControls drag fires a click, which hits the `clearSelection()` branch (`+page.svelte:473`) — track pointerdown/pointerup distance and ignore drags.

---

## Privacy — needs a decision

### 6. 162 private bookmarks are published
The data file includes bookmarks with `"shared": "no"` (Pinboard's private flag), plus `toread` status and full timestamps, deployed to public GitHub Pages *and* committed to a public repo (including git history). If unintentional, filter to `shared === "yes"` when exporting — and note that removing them later requires a history rewrite, so the sooner the better.

---

## Broken project checks

### 7. `npm run lint` fails
17 files fail the Prettier check. Run `npm run format` once and commit.

### 8. One Playwright test fails deterministically
`tests/bookmark-garden.spec.js:19` — `getByText(/Why this path:/)` violates strict mode when more than one related card renders (the normal case). Change to `.first()`. The reduced-motion test at line 46 has the same latent bug and only passes by timing luck. Also `tests/test.js` is fully subsumed by the spec file — merge them.

### 9. CI has no quality gate
`.github/workflows/deploy.yml` builds and deploys on push to main with no lint or test step, which is how #7 and #8 went unnoticed. Add a job running `npm run lint && npx playwright test` before deploy.

---

## Dead code and stale docs

### 10. `src/routes/api/bookmarks/+server.js` is dead
With `adapter-static` it is not emitted into the build (verified: `build/` has no `api/`), the page fetches `static/data/filtered_bookmarks.json` directly, and its cwd-relative `fs.readFile` would not survive deployment anyway. Delete it.

### 11. Duplicate 1 MB data file
`src/data/filtered_bookmarks.json` is byte-identical (md5-verified) to `static/data/filtered_bookmarks.json`. Only the static copy is used. Delete the `src/data` copy.

### 12. CLAUDE.md is actively wrong
It describes the pre-garden architecture: the removed API endpoint as the data flow, black background, `adapter-auto`, no mention of `relations.js`/`lens.js`/garden components, and it points at the duplicate data path. For a repo primarily worked on by AI agents, this is the highest-leverage doc fix.

### 13. HANDOFF.md is stale
Dated 2026-01-11, says "no implementation started" — but the quick wins (spinner, Escape, throttle) and the onboarding/related-panel work have since shipped. It also asks whether the data has timestamps — yes, every bookmark has `time`, so the timeline idea is feasible. Delete or replace with a current status.

### 14. Unused dependencies and code
- `three-forcegraph`, `@sveltejs/adapter-auto`, `lucide-svelte`: zero imports in `src/`.
- `src/lib/BookmarkVisualization.js` (243 lines): acknowledged legacy.
- Constants `clusterRadius`, `clusterLevels`, `maxInstancesPerMesh` (`+page.svelte:51-53`): unused.
- `import { throttle } from 'lodash'` pulls the whole CJS lodash into the 612 KB main chunk — use `lodash-es` or a small local throttle.

---

## Smaller correctness / UX items

- **Lens state and URL disagree** (`+page.svelte:507`): the lens initializes from `?lens=`, but clicking a lens button only mutates local state — the URL never updates, so shared links drop the chosen lens, and any `$page` store change would silently revert it. Have `onChange` call `goto` with `replaceState` and let the reactive statement be the single source of truth. Similarly, `selectBookmark` setting `relatedBookmarks` at line 114 is redundant with the reactive block at 508.
- **No fetch error UI** (`+page.svelte:262`): a failed data load logs to console and leaves an empty scene; add a visible error state and a `response.ok` check.
- **`?focus=` fallback is silent** (`+page.svelte:255`): an unknown hash focuses `bookmarksData[0]` with no indication. The test suite's `focus=test-seed` currently depends on this fallback — if fixed, seed tests with a real hash.
- **Hover resets all 2,000 instance colors ~20×/sec** (`+page.svelte:428-434`), re-uploading the whole color buffer. Remember the previously hovered id and restore only that one. Same idea in `selectBookmark`: build a `Set` of related hashes instead of `selectedBookmarks.some(...)` per bookmark (`+page.svelte:128`).
- **Tooltip can overflow the viewport** at the right/bottom edges (`+page.svelte:620-628`); clamp its position.
- **1,255 unique tags share one HSL wheel** (`generateTagColorMap`), so adjacent tags are visually indistinguishable. Consider coloring by top-N tags plus a neutral for the long tail — this also makes a future legend feasible.
- **Accessibility**: the 3D canvas is mouse-only. The FocusRail links being real `<a>` tags is good; consider an `aria-live` announcement on selection and a keyboard path into selection (a search box would double as one — still the highest-value missing feature from the redesign list).

---

## Suggested order of attack

1. Decide on the private-bookmarks question (#6) — everything else can wait behind it.
2. One hygiene PR: format (#7), test fix (#8), CI gate (#9), delete dead code/data/docs (#10, #11, #13, #14), update CLAUDE.md (#12).
3. One correctness PR: line rotation (#1), empty tags (#2), lines-match-rail (#3), rAF cleanup (#4), click coordinates (#5).
4. Perf and UX polish items as time allows.

**Note on tooling**: upgrading `@playwright/test` from the 1.x pin is cheap and avoids browser-compatibility issues (newer Chromium binaries removed old headless mode, which Playwright ≤1.46 relies on).
