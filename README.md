# Mikepage - 3D Bookmark Visualizer

This is a personal project to visualize my bookmarks in a 3D sphere. The bookmarks are exported from Pinboard.

![Bookmark Sphere](bookmark-sphere.png)

## Features

- **Guided Canopy Scene**: Bookmark clusters live in an atmospheric 3D garden with softened lighting, fog depth, and path-focused motion.
- **First-Visit Intro Guide**: A lightweight onboarding overlay explains how to start exploring.
- **Path Lens Controls**: Switch between `Closest`, `Surprising`, and `By tag family` exploration modes.
- **Editorial Focus Rail**: Selection opens a readable side rail with summary context, related paths, and relationship explanations.
- **Responsive Focus Panel**: On smaller screens the focus rail converts into a bottom-sheet layout.
- **Reduced-Motion Friendly**: Motion is toned down when reduced-motion is requested while preserving interaction clarity.

## Development

This is a SvelteKit project.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the development server

```bash
npm run dev
```

## Data

The bookmark data is loaded from a local API endpoint (`/api/bookmarks`). This data is from a Pinboard export.

## Code Overview

- **`init()`**: Initializes Three.js scene, renderer, camera, and lighting. Also sets up post-processing and controls.
- **`loadBookmarks()`**: Fetches bookmark data from an API endpoint and initiates the 3D instanced mesh of bookmarks.
- **`createConnectionLines()`**: Draws lines between related bookmarks, with line strength based on the number of shared tags.
- **`calculatePositions()`**: Calculates positions of bookmarks in 3D space for even distribution within a sphere.
- **`onMouseMove()` and `onMouseClick()`**: Handles mouse events for interactivity, including showing tooltips and selecting bookmarks.

## Customization

- **Tag Color Mapping**: Customize the color palette of tags by modifying the `generateTagColorMap()` function.
- **Post-Processing Effects**: Adjust the bloom effect's strength, radius, and threshold in the `init()` function's UnrealBloomPass configuration.
- **Bookmark Data API**: Modify the `loadBookmarks()` function to fetch data from your preferred source. Ensure the data format includes fields like `tags`, `description`, and `href`.

## Technologies Used

*   [SvelteKit](https://kit.svelte.dev/)
*   [Three.js](https://threejs.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
