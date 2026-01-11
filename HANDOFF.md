# Handoff Document: Page Redesign Suggestions

**Date**: 2026-01-11
**Branch**: `claude/page-redesign-suggestions-eafXF`
**Status**: Suggestions documented, no implementation started

---

## Context

The user requested suggestions for improving or redesigning the main page of this bookmark visualization project. I analyzed the codebase and provided a comprehensive list of redesign ideas. **No code changes have been made yet.**

## Current State

The project is a 3D bookmark visualization using:
- **SvelteKit 2.0** with Svelte 5.0-next
- **Three.js** for 3D rendering
- **TailwindCSS + DaisyUI** for styling

The main visualization lives entirely in `src/routes/+page.svelte` (~600 lines). It displays ~2000 bookmarks as colored spheres arranged on a sphere surface, with hover tooltips and click-to-reveal-related functionality.

## Redesign Suggestions Provided

### Visual & Aesthetic
1. **Entry animation** - Staggered entrance for bookmark nodes
2. **Better tooltips** - Tag pills, favicons, animations
3. **Connection line colors** - Match selected node's color instead of hardcoded cyan
4. **Starfield background** - Replace plain black

### UX Improvements
5. **Search/filter** - Search bar to find bookmarks (HIGH PRIORITY)
6. **Tag legend/filter panel** - Left sidebar with clickable tag filters
7. **Keyboard navigation** - Escape, arrows, Enter, F for fullscreen
8. **Loading state** - Show spinner while fetching
9. **Empty/error states** - User-friendly messages

### Layout & Information
10. **Improved related panel** - Tabs, relationship strength, pinning
11. **Mini-map** - 2D overview for orientation
12. **Onboarding/help** - First-time user instructions

### Performance
13. **Throttle raycasting** - `onMouseMove` fires too frequently
14. **Optimize color updates** - Only update changed instances, not all
15. **Progressive loading** - Load in visible chunks
16. **LOD (Level of Detail)** - Simpler geometry for distant nodes

### New Features
17. **Cluster by tag** - Use `three-forcegraph` (already installed)
18. **Time-based visualization** - Timeline slider if timestamps exist
19. **Bookmark management** - CRUD operations
20. **Export/share views** - Screenshot or shareable links

## Recommended Starting Points

### Quick Wins (implement first)
| Task | File | Lines | Notes |
|------|------|-------|-------|
| Add loading spinner | `+page.svelte` | ~180 | Add state variable, show during `loadBookmarks()` |
| Escape key to clear | `+page.svelte` | ~400 | Add `keydown` listener, set `selectedBookmark = null` |
| Throttle mousemove | `+page.svelte` | ~292 | Use lodash `throttle` (already installed) |

### Medium Effort, High Value
| Task | Complexity | Notes |
|------|------------|-------|
| Search functionality | Medium | Add input overlay, filter `bookmarks` array, animate camera |
| Tag legend sidebar | Medium | Extract unique tags from `tagColorMap`, render as list |
| Better tooltip | Low-Medium | Style with Tailwind, add tag pills |

## Key Files to Modify

| File | Purpose |
|------|---------|
| `src/routes/+page.svelte` | Main visualization - all 3D logic and UI |
| `src/routes/api/bookmarks/+server.js` | API endpoint - modify for new data needs |
| `src/app.css` | Global styles |
| `tailwind.config.js` | Theme customization |

## Technical Notes

### Performance Concerns in Current Code
- **Line 292-350**: `onMouseMove` does raycasting + color reset on every pixel moved
- **Line 324-330**: Resets ALL instance colors even when only hover state changed
- **Line 385-420**: `createConnectionLines` disposes and recreates all lines on each click

### Unused Dependencies
- `three-forcegraph` is installed but not used - could enable tag clustering
- `src/lib/BookmarkVisualization.js` is legacy/unused

### Data Structure
Bookmarks have: `hash`, `description`, `extended`, `href`, `tags` (space-separated string)

## Questions for User

Before implementing, consider asking:
1. Which suggestions are highest priority?
2. Should search filter visually (dim non-matches) or hide non-matches?
3. Are there timestamps in the bookmark data for time-based features?
4. Is bookmark management (add/edit/delete) in scope?

---

## Git Status

- Branch: `claude/page-redesign-suggestions-eafXF`
- No commits made yet (only this handoff document)
- Clean working tree before this session

## Next Steps

1. User should prioritize which suggestions to implement
2. Create todo list with selected features
3. Implement quick wins first for immediate value
4. Test performance impact of each change
