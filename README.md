
# Bookmark Visualization Project

This project is an interactive 3D visualization of bookmarks using Three.js, Svelte, and various Three.js extensions. The visualization creates a network of bookmarks, each represented as a node, and categorizes them based on tags. Users can explore related bookmarks, visualize connections, and discover interesting content clusters.

![screenshot of the bookmark viz project](bookmark-sphere.png)

## Features

- **Interactive 3D Visualization**: Leveraging Three.js, bookmarks are represented as 3D nodes within a sphere, creating an immersive experience.
- **Bookmark Tag Coloring**: Each bookmark tag is assigned a unique color, making it easy to identify content categories.
- **Connection Lines**: Related bookmarks are visually connected, with line strength and color indicating the strength of the relationship based on shared tags.
- **Tooltip with Bookmark Info**: Hovering over a node reveals a tooltip with bookmark details, and clicking on a node displays a list of related bookmarks.
- **Bloom and Post-Processing Effects**: Using post-processing with Unreal Bloom Pass for enhanced visual appeal.
- **Camera and Orbit Controls**: Provides smooth navigation and exploration of the 3D space.

## Setup and Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/bookmark-visualization.git
   cd bookmark-visualization
   ```

2. **Install Dependencies**:
   Make sure you have Node.js installed, then install the dependencies.
   ```bash
   npm install
   ```

3. **Run the Project**:
   ```bash
   npm run dev
   ```

4. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`.

## Code Overview

### Core Components

- **Svelte for UI**: The UI is built with Svelte, including interactive panels for displaying related bookmarks and tooltips.
- **Three.js for 3D Rendering**: Used for rendering bookmarks as 3D nodes within a spherical space.
- **OrbitControls and Post-Processing**: OrbitControls allows camera movement, while post-processing effects (like Unreal Bloom Pass) enhance visual quality.
- **Dynamic Tag-Based Coloring**: Tags are assigned unique colors using HSL color generation, stored in `tagColorMap`.

### Key Scripts and Logic

- **`init()`**: Initializes Three.js scene, renderer, camera, and lighting. Also sets up post-processing and controls.
- **`loadBookmarks()`**: Fetches bookmark data from an API endpoint and initiates the 3D instanced mesh of bookmarks.
- **`createConnectionLines()`**: Draws lines between related bookmarks, with line strength based on the number of shared tags.
- **`calculatePositions()`**: Calculates positions of bookmarks in 3D space for even distribution within a sphere.
- **`onMouseMove()` and `onMouseClick()`**: Handles mouse events for interactivity, including showing tooltips and selecting bookmarks.

### Configuration

- **Bookmark Cluster Radius and Levels**: Controlled by `clusterRadius` and `clusterLevels` variables, which determine the size and depth of the bookmark cloud.
- **Sphere Size and Tag-Based Scaling**: The size of each node scales based on the number of tags, creating visual distinction between nodes.

## Customization

- **Tag Color Mapping**: Customize the color palette of tags by modifying the `generateTagColorMap()` function.
- **Post-Processing Effects**: Adjust the bloom effect's strength, radius, and threshold in the `init()` function's UnrealBloomPass configuration.
- **Bookmark Data API**: Modify the `loadBookmarks()` function to fetch data from your preferred source. Ensure the data format includes fields like `tags`, `description`, and `href`.

## Potential Enhancements

- **Additional Filter Options**: Add controls to filter bookmarks by specific tags or categories.
- **Graph Layout Options**: Experiment with different spatial layouts, such as hierarchical or cluster-based arrangements.
- **Improved Related Bookmark Discovery**: Use machine learning techniques to better categorize and find related bookmarks beyond simple tag matching.

## Troubleshooting

1. **Performance Issues**: Adjust `maxInstancesPerMesh` and reduce `sphereMaxSize` if the visualization lags.
2. **Missing Bookmark Data**: Ensure your API endpoint is reachable and returns bookmarks in the correct format.
3. **Three.js Compatibility**: Some features require specific Three.js extensions. Ensure compatibility with your version of Three.js.

## Acknowledgments

This project uses:
- **Three.js** for 3D rendering
- **Svelte** for UI components and reactivity
- **OrbitControls and LineGeometry/LineMaterial** from Three.js examples for camera controls and custom lines
- **UnrealBloomPass** for bloom effect post-processing

## License

This project is licensed under the MIT License.
