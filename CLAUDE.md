# CLAUDE.md - AI Assistant Guide

## Project Overview

This is a **Bookmark Visualization Project** - an interactive 3D web application that visualizes bookmarks as a spherical network in 3D space using Three.js and Svelte. Users can explore bookmarks, see relationships between them based on shared tags, and discover content clusters interactively.

**Key Features:**
- 3D bookmark nodes arranged in a spherical pattern
- Tag-based color coding using HSL color generation
- Interactive hover tooltips showing bookmark details
- Click to reveal related bookmarks with connection lines
- Post-processing effects (Unreal Bloom Pass)
- Real-time instanced mesh rendering for performance

## Tech Stack

### Core Technologies
- **Framework**: SvelteKit 2.0 (Svelte 5.0-next)
- **3D Graphics**: Three.js (v0.170.0)
- **Styling**: TailwindCSS 3.4 + DaisyUI 4.12
- **Build Tool**: Vite 5.0
- **Language**: JavaScript (no TypeScript)

### Key Dependencies
- `three` - 3D rendering engine
- `three-forcegraph` - Graph layout algorithms
- `lucide-svelte` - Icon components
- `lodash` - Utility functions
- `@sveltejs/adapter-auto` - SvelteKit adapter

### Development Tools
- ESLint 9.0 with Svelte plugin
- Prettier 3.1 with Svelte plugin
- Playwright for testing
- PostCSS with Autoprefixer

## Architecture & Directory Structure

```
mikepage/
├── src/
│   ├── routes/               # SvelteKit routes (file-based routing)
│   │   ├── +layout.svelte   # Root layout (imports app.css)
│   │   ├── +page.svelte     # Main page - 3D visualization component
│   │   ├── +page.js         # Page load function (if needed)
│   │   └── api/
│   │       └── bookmarks/
│   │           └── +server.js  # API endpoint for bookmarks
│   ├── lib/
│   │   ├── index.js         # Library exports
│   │   └── BookmarkVisualization.js  # Legacy/unused visualization class
│   ├── data/
│   │   └── filtered_bookmarks.json   # Bookmark data source
│   └── app.css              # Global Tailwind styles
├── static/                  # Static assets
│   ├── favicon.png
│   └── bookmark-sphere.png  # Screenshot for README
├── tests/                   # Playwright tests
│   └── test.js
├── Configuration Files:
│   ├── svelte.config.js     # SvelteKit configuration
│   ├── vite.config.js       # Vite build configuration
│   ├── tailwind.config.js   # Tailwind + DaisyUI themes
│   ├── eslint.config.js     # ESLint flat config
│   ├── playwright.config.js # Test configuration
│   ├── postcss.config.js    # PostCSS configuration
│   ├── .prettierrc          # Prettier formatting rules
│   └── package.json         # Dependencies and scripts
```

## Key Components

### 1. Main Visualization (`src/routes/+page.svelte`)

**Purpose**: The primary and only page component that handles all 3D visualization logic.

**Key Responsibilities:**
- Initialize Three.js scene, camera, renderer
- Load bookmarks from API endpoint
- Create and manage instanced meshes for performance
- Handle mouse interactions (hover, click)
- Render connection lines between related bookmarks
- Display tooltips and side panel for related bookmarks
- Post-processing effects (bloom)

**Important Functions:**
- `init()` - Initializes Three.js scene, renderer, camera, controls, and lighting
- `loadBookmarks()` - Fetches bookmark data from `/api/bookmarks`
- `createBookmarkMeshes()` - Creates a single InstancedMesh with up to 2000 instances
- `calculatePositions()` - Distributes bookmarks evenly on a sphere surface
- `generateTagColorMap()` - Creates HSL color mapping for all unique tags
- `onMouseMove()` - Handles hover effects and tooltip display
- `onMouseClick()` - Handles bookmark selection and related bookmark discovery
- `createConnectionLines()` - Draws lines between selected bookmark and related ones
- `animate()` - Main render loop using composer for post-processing

**Configuration Constants:**
```javascript
sphereBaseSize = 1.0        // Minimum sphere size
sphereMaxSize = 1.9         // Maximum sphere size (scales with tag count)
clusterRadius = 40          // Not actively used in current implementation
clusterLevels = 3           // Not actively used in current implementation
maxInstancesPerMesh = 2000  // Max instances per InstancedMesh
```

### 2. Bookmarks API (`src/routes/api/bookmarks/+server.js`)

**Purpose**: Server-side API endpoint for fetching bookmark data.

**Endpoint**: `GET /api/bookmarks?chunk=0&size=2000`

**Query Parameters:**
- `chunk` (number, default: 0) - Chunk index for pagination
- `size` (number, default: 100) - Number of bookmarks per chunk

**Response Format:**
```json
{
  "bookmarks": [...],
  "hasMore": true,
  "total": 5000
}
```

**Data Source**: Reads from `src/data/filtered_bookmarks.json`

**Bookmark Schema:**
```json
{
  "hash": "unique-id",
  "description": "Bookmark title",
  "extended": "Extended description",
  "href": "https://example.com",
  "tags": "tag1 tag2 tag3"
}
```

### 3. Legacy Component (`src/lib/BookmarkVisualization.js`)

**Status**: NOT currently used in the application. The main page component has its own integrated implementation.

**Note**: This class was likely an earlier iteration. The current implementation is entirely within `+page.svelte`.

## Data Flow

1. **Page Load** → `onMount()` → `init()`
2. **Init** → `loadBookmarks()`
3. **API Call** → `/api/bookmarks?chunk=0&size=2000`
4. **Server** → Reads `filtered_bookmarks.json` → Returns chunk
5. **Client** → `createBookmarkMeshes(bookmarks)`
6. **Visualization** → Create InstancedMesh → Assign colors/positions → Add to scene
7. **User Interaction**:
   - Hover → `onMouseMove()` → Highlight + Tooltip
   - Click → `onMouseClick()` → Find related → `createConnectionLines()` → Show side panel

## Development Workflow

### Available Scripts

```bash
npm run dev      # Start development server (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run Playwright tests
npm run lint     # Run ESLint and Prettier checks
npm run format   # Format code with Prettier
```

### Development Server

- Default port: `http://localhost:5173` (Vite default)
- Hot Module Replacement (HMR) enabled
- File system access configured for `src/data` directory

### Git Workflow

**Current Branch**: `claude/add-claude-documentation-rIfBg`
**Main Branch**: Not specified in git status

**Branch Naming Convention**:
- Feature branches: `claude/feature-name-{sessionId}`
- Always develop on designated Claude branches

**Commit Guidelines**:
- Use conventional commit messages
- Commit frequently with descriptive messages
- Push to origin with `-u` flag: `git push -u origin <branch-name>`

## Code Conventions & Style Guide

### Prettier Configuration
```json
{
  "useTabs": true,           # Use tabs (not spaces)
  "singleQuote": true,       # Single quotes for strings
  "trailingComma": "none",   # No trailing commas
  "printWidth": 100          # Max line width: 100
}
```

### JavaScript Style
- **No TypeScript** - Pure JavaScript project
- ES6+ syntax (import/export, arrow functions, destructuring)
- Async/await for asynchronous operations
- Use `const` and `let` (no `var`)

### Svelte Conventions
- Svelte 5.0-next features may be available
- Use `onMount()` for component initialization
- Reactive declarations with `$:` (standard Svelte syntax)
- Component bindings with `bind:this`

### File Naming
- Svelte components: `+page.svelte`, `+layout.svelte`, `+server.js`
- Use SvelteKit naming conventions (`+` prefix for special files)
- Configuration files: lowercase with extension (e.g., `vite.config.js`)

### Three.js Patterns
- Always dispose geometries, materials, and renderers on cleanup
- Use InstancedMesh for rendering large numbers of similar objects
- Enable frustum culling for performance
- Use composer for post-processing instead of direct renderer.render()
- Clean up event listeners in component cleanup

## Common Tasks

### Adding New 3D Features

1. **Modify Scene Setup** in `init()` function
2. **Add to Animation Loop** if continuous updates needed
3. **Clean Up Resources** in `onMount()` return function
4. **Test Performance** - watch for frame rate drops

### Modifying Bookmark Display

1. **Color Changes**: Edit `generateTagColorMap()` function
2. **Position Algorithm**: Edit `calculatePositions()` function
3. **Size/Scale**: Modify `sphereBaseSize`, `sphereMaxSize` constants
4. **Mesh Properties**: Edit material properties in `createBookmarkMeshes()`

### Adding New API Endpoints

1. Create `src/routes/api/{endpoint}/+server.js`
2. Export async `GET`, `POST`, `PUT`, `DELETE` functions
3. Return `json()` responses from `@sveltejs/kit`
4. Handle errors with appropriate status codes

### Styling Changes

1. **Global Styles**: Edit `src/app.css`
2. **Component Styles**: Use Tailwind classes or `<style>` block
3. **Theme Changes**: Modify `tailwind.config.js` DaisyUI themes
4. **Typography**: Use `@tailwindcss/typography` plugin

## Performance Considerations

### Current Optimizations

1. **InstancedMesh**: Single mesh for up to 2000 bookmarks (efficient GPU rendering)
2. **Instanced Colors**: Per-instance color attribute (no separate materials)
3. **Frustum Culling**: Enabled by default (don't render off-screen objects)
4. **Pixel Ratio Capping**: `Math.min(window.devicePixelRatio, 2)`
5. **Efficient Line Rendering**: Using Line2 with LineMaterial from Three.js examples

### Performance Bottlenecks to Watch

1. **Line Creation**: Creating many Line2 objects can be expensive
   - Current: Lines only created on click
   - Consider: Reuse line objects instead of dispose/recreate

2. **Color Updates**: `instancedMesh.instanceColor.needsUpdate = true` triggers GPU upload
   - Current: Updates on every mousemove when not selecting
   - Consider: Debounce or only update hovered instance

3. **Raycasting**: Performed on every mousemove
   - Current: Acceptable performance
   - Consider: Throttle if experiencing issues

4. **Bloom Post-Processing**: Can be expensive
   - Current settings: strength=1.5, radius=0.4, threshold=0.85
   - Adjust if frame rate drops

### Optimization Strategies

- **Chunk Loading**: API supports pagination (currently loading 2000 at once)
- **LOD (Level of Detail)**: Geometry already prepared in BookmarkVisualization.js (not used)
- **Lazy Loading**: Consider loading bookmarks progressively
- **Web Workers**: Consider offloading position calculations

## Testing Strategy

### Current Setup
- **Framework**: Playwright
- **Config**: `playwright.config.js`
- **Tests**: `tests/test.js`

### Testing Approach
- E2E tests for critical user flows
- Visual regression testing for 3D rendering (if implemented)
- API endpoint testing
- Performance benchmarking

### Running Tests
```bash
npm test              # Run all tests
npm test -- --debug   # Debug mode
```

## Deployment Considerations

### Build Output
```bash
npm run build  # Creates production build in .svelte-kit/output
```

### Adapter
- Using `@sveltejs/adapter-auto`
- Automatically detects deployment platform
- Supports: Vercel, Netlify, Cloudflare Pages, etc.

### Environment Requirements
- Node.js runtime for API endpoints
- Static file serving for client assets
- File system access to `src/data/filtered_bookmarks.json`

### Production Optimizations
- Code splitting (automatic with Vite)
- Tree shaking (automatic)
- Minification (automatic)
- Asset optimization (automatic)

## Three.js Specifics

### Scene Configuration
- Background: Black (`0x000000`)
- Camera: PerspectiveCamera (FOV: 75°, position: `[0, 0, 150]`)
- Renderer: WebGL with antialias, ACES Filmic tone mapping

### Lighting Setup
- **Ambient Light**: White, intensity 1.0
- **Point Light**: White, intensity 1, distance 100, position `[50, 50, 50]`
- **No Shadows**: `renderer.shadowMap.enabled = false`

### Controls
- **OrbitControls**: Damped movement (factor: 0.07)
- **Distance Limits**: Min 50, Max 200
- **Polar Angle Limit**: Max `Math.PI / 1.5`
- **Screen Space Panning**: Disabled

### Post-Processing
- **EffectComposer** with two passes:
  1. RenderPass (base scene render)
  2. UnrealBloomPass (glow effect)

## Data Management

### Bookmark Data Location
- **Path**: `src/data/filtered_bookmarks.json`
- **Format**: JSON array of bookmark objects
- **Size**: ~1MB (1016628 bytes)

### Data Structure
Each bookmark must have:
- `hash` (string, unique identifier)
- `description` (string, title/name)
- `extended` (string, longer description)
- `href` (string, URL)
- `tags` (string, space-separated tags)

### Updating Bookmark Data
1. Replace or edit `src/data/filtered_bookmarks.json`
2. Maintain the same schema
3. Restart dev server to see changes

## Common Issues & Solutions

### Issue: 3D Scene Not Rendering
- Check container dimensions (must have width/height)
- Verify Three.js initialization completed
- Check browser console for WebGL errors
- Ensure `container` ref is bound before init

### Issue: Poor Performance
- Reduce `maxInstancesPerMesh` constant
- Decrease `sphereMaxSize` to reduce geometry complexity
- Lower bloom pass strength/radius
- Reduce bookmark chunk size in API call

### Issue: Connection Lines Not Visible
- Lines use additive blending and cyan color
- May be hard to see against certain backgrounds
- Adjust `lineMaterial` color, opacity, or linewidth
- Check if lines are behind other objects (depthWrite: false)

### Issue: Colors Not Updating
- Ensure `instancedMesh.instanceColor.needsUpdate = true` is called
- Check that color changes are applied via `setColorAt()`
- Verify tagColorMap is generated correctly

## API for AI Assistants

### When Modifying Visualization
1. **Always read `src/routes/+page.svelte` first**
2. Test changes with `npm run dev`
3. Check performance impact (open DevTools Performance)
4. Update constants if changing layout behavior
5. Dispose resources properly in cleanup

### When Adding Features
1. Consider performance impact of new 3D elements
2. Follow InstancedMesh pattern for similar objects
3. Add cleanup logic to prevent memory leaks
4. Test with large bookmark datasets
5. Update this documentation

### When Fixing Bugs
1. Check browser console for errors
2. Verify Three.js object lifecycle (create → use → dispose)
3. Test interaction handlers (mouse events)
4. Check reactive state updates in Svelte
5. Validate bookmark data format

## Key Files Reference

| File | Purpose | Modify When... |
|------|---------|----------------|
| `src/routes/+page.svelte` | Main visualization | Changing 3D rendering, interactions, UI |
| `src/routes/api/bookmarks/+server.js` | Bookmark API | Changing data source, pagination |
| `src/data/filtered_bookmarks.json` | Bookmark data | Updating bookmark content |
| `src/routes/+layout.svelte` | Root layout | Adding global UI, changing global imports |
| `src/app.css` | Global styles | Adding Tailwind directives, global CSS |
| `tailwind.config.js` | Tailwind config | Changing themes, plugins, content paths |
| `vite.config.js` | Build config | Changing build behavior, adding plugins |
| `svelte.config.js` | SvelteKit config | Changing adapter, kit options |
| `package.json` | Dependencies | Adding/removing packages |

## Additional Notes

### Unused Code
- `src/lib/BookmarkVisualization.js` - Legacy code, not in use
- Consider removing if confirmed unnecessary

### Future Improvements
- Implement progressive loading for large datasets
- Add search/filter functionality
- Add bookmark clustering algorithms
- Implement keyboard navigation
- Add accessibility features (ARIA labels, keyboard controls)
- Add VR/AR support

### Browser Compatibility
- Requires WebGL support
- Best performance in modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile support may require performance optimizations

---

**Last Updated**: 2026-01-07
**Version**: 1.0.0
**Maintained For**: Claude Code and AI assistants working on this repository
