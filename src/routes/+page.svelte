<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
  
  let container;
  let renderer;
  let scene;
  let camera;
  let controls;
  let composer; // For post-processing
  let instancedMesh; // Single InstancedMesh
  let raycaster;
  let mouse;
  let selectedBookmarks = [];
  let hoveredBookmark = null;
  let tooltipX = 0;
  let tooltipY = 0;

  // Configuration
  const sphereBaseSize = 0.6;
  const sphereMaxSize = 1.9;
  const clusterRadius = 40;
  const clusterLevels = 3;
  const maxInstancesPerMesh = 2000; // Define based on performance testing

  // Store bookmarks data
  let bookmarksData = [];

  // Map to link instance IDs to bookmark data
  const instanceIdToBookmark = new Map();

  // Global tag color map
  let tagColorMap = new Map();

  // Function to extract unique tags
  const getUniqueTags = (bookmarks) => {
      const tagSet = new Set();
      bookmarks.forEach(bookmark => {
          const tags = bookmark.tags.split(' ');
          tags.forEach(tag => tagSet.add(tag));
      });
      return Array.from(tagSet);
  };

  // Function to generate tag color map using HSL
  const generateTagColorMap = (tags) => {
      const tagColorMap = new Map();
      const totalTags = tags.length;
      tags.forEach((tag, index) => {
          const hue = (index / totalTags) * 360; // Evenly distribute hues
          const saturation = 70; // Percentage
          const lightness = 50; // Percentage
          tagColorMap.set(tag, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
      });
      return tagColorMap;
  };

  const init = () => {
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();
      
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('click', onMouseClick);
      
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      camera = new THREE.PerspectiveCamera(
          75, // Increased FOV
          container.clientWidth / container.clientHeight,
          0.1,
          1000
      );
      camera.position.set(0, 0, 150); // Moved camera further back
      
      renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true 
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Enable Tone Mapping and adjust exposure
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5; // Increased exposure for brighter scene
      
      // Disable shadows if they are making the scene too dark
      renderer.shadowMap.enabled = false;
      
      container.appendChild(renderer.domElement);
      
      // Post-processing setup
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      
      const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(container.clientWidth, container.clientHeight),
          1.5, // strength
          0.4, // radius
          0.85 // threshold
      );
      composer.addPass(bloomPass);
      
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 50;
      controls.maxDistance = 200;
      controls.maxPolarAngle = Math.PI / 1.5;
      
      // Ambient Light
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity
      scene.add(ambientLight);
      
      // Directional Light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Optional: Add HemisphereLight for more natural lighting
      /*
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemisphereLight.position.set(0, 200, 0);
      scene.add(hemisphereLight);
      */
      
      // Optional: Add PointLight or SpotLight
      /*
      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(50, 50, 50);
      scene.add(pointLight);
      */
      
      loadBookmarks();
      animate();
      
      window.addEventListener('resize', onWindowResize);
  };
  
  const loadBookmarks = async () => {
      try {
          const response = await fetch('/api/bookmarks?chunk=0&size=500');
          const data = await response.json();
          
          if (data.bookmarks) {
              bookmarksData = data.bookmarks;
              createBookmarkMeshes(data.bookmarks);
          }
      } catch (error) {
          console.error('Failed to load bookmarks:', error);
      }
  };
  
  const calculatePositions = (count, distributionType = 'surface') => {
      const positions = [];

      for (let i = 0; i < count; i++) {
          const theta = Math.acos(2 * Math.random() - 1); // Polar angle
          const phi = 2 * Math.PI * Math.random(); // Azimuthal angle

          const radius = distributionType === 'surface'
              ? 100 // sphereRadius
              : 100 - 50 + Math.random() * 50; // sphereRadius - sphereThickness to sphereRadius

          const x = radius * Math.sin(theta) * Math.cos(phi);
          const y = radius * Math.sin(theta) * Math.sin(phi);
          const z = radius * Math.cos(theta);

          positions.push(new THREE.Vector3(x, y, z));
      }

      return positions;
  };
  
  const createBookmarkMeshes = (bookmarks) => {
      // Extract unique tags
      const uniqueTags = getUniqueTags(bookmarks);
      
      // Generate color mapping for tags
      tagColorMap = generateTagColorMap(uniqueTags);
      
      // Shared geometry and material
      const geometry = new THREE.SphereGeometry(sphereBaseSize, 16, 16);
      
      // Use MeshStandardMaterial for better lighting and realism
      const material = new THREE.MeshStandardMaterial({
          vertexColors: true, // Important for per-instance colors
          roughness: 0.2,     // Reduced roughness for shinier surfaces
          metalness: 0.1,
          emissive: new THREE.Color(0xffffff), // Emissive color set to white
          emissiveIntensity: 0.2,              // Moderate emissive intensity
      });
      
      // Create InstancedMesh
      instancedMesh = new THREE.InstancedMesh(geometry, material, bookmarks.length);
      
      // Enable instance color attribute
      const colors = [];
      const dummy = new THREE.Object3D();
      
      // Calculate positions
      const positions = calculatePositions(bookmarks.length, 'surface'); // Use 'surface' or 'volume'
      
      bookmarks.forEach((bookmark, index) => {
          const tags = bookmark.tags.split(' ');
          
          // Determine primary tag (you can define your own logic for primary tag)
          const primaryTag = tags[0]; // For simplicity, using the first tag as primary
          
          // Get color for primary tag
          const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
          
          // Set position and scale using dummy Object3D
          dummy.position.copy(positions[index]);
          
          // Optionally scale based on number of tags or other properties
          const size = sphereBaseSize + (tags.length / 10) * (sphereMaxSize - sphereBaseSize);
          dummy.scale.set(size, size, size);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(index, dummy.matrix);
          
          // Assign color
          colors.push(tagColor.r, tagColor.g, tagColor.b);
          
          // Map instance ID to bookmark
          instanceIdToBookmark.set(index, bookmark);
      });
      
      // Add color attribute
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(colors), 3);
      instancedMesh.instanceColor.needsUpdate = true;
      
      scene.add(instancedMesh);
  };
  
  const onMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(instancedMesh);
      
      if (selectedBookmarks.length === 0) {
          // Reset all instance colors
          bookmarksData.forEach((bookmark, index) => {
              const primaryTag = bookmark.tags.split(' ')[0];
              const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
              instancedMesh.setColorAt(index, tagColor);
          });
          instancedMesh.instanceColor.needsUpdate = true;
          
          if (intersects.length > 0) {
              const instanceId = intersects[0].instanceId;
              if (instanceId !== null) {
                  // Highlight the hovered instance by darkening its color
                  const originalColor = new THREE.Color(tagColorMap.get(instanceIdToBookmark.get(instanceId).tags.split(' ')[0]));
                  const highlightColor = originalColor.clone().multiplyScalar(0.7); // Darken the color
                  instancedMesh.setColorAt(instanceId, highlightColor);
                  instancedMesh.instanceColor.needsUpdate = true;
                  container.style.cursor = 'pointer';
                  
                  // Set hoveredBookmark for tooltip
                  hoveredBookmark = instanceIdToBookmark.get(instanceId);
                  tooltipX = event.clientX;
                  tooltipY = event.clientY;
              }
          } else {
              container.style.cursor = 'grab';
              hoveredBookmark = null;
          }
      } else if (intersects.length > 0) {
          container.style.cursor = 'pointer';
      } else {
          container.style.cursor = 'grab';
      }
  };
  
  const onMouseClick = (event) => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(instancedMesh);
      
      if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== null) {
              const clickedBookmark = instanceIdToBookmark.get(instanceId);
              const clickedTags = new Set(clickedBookmark.tags.split(' '));
              
              // Find all bookmarks that share at least one tag
              selectedBookmarks = bookmarksData.filter(bookmark => {
                  const bookmarkTags = new Set(bookmark.tags.split(' '));
                  return Array.from(bookmarkTags).some(tag => clickedTags.has(tag));
              }).sort((a, b) => {
                  const aShared = a.tags.split(' ').filter(tag => clickedTags.has(tag)).length;
                  const bShared = b.tags.split(' ').filter(tag => clickedTags.has(tag)).length;
                  return bShared - aShared;
              });
              
              // Highlight related instances by darkening their colors
              bookmarksData.forEach((bookmark, index) => {
                  const isRelated = selectedBookmarks.some(b => b.hash === bookmark.hash);
                  if (isRelated) {
                      const tagColor = new THREE.Color(tagColorMap.get(bookmark.tags.split(' ')[0]));
                      const highlightColor = tagColor.clone().multiplyScalar(0.7); // Darken
                      instancedMesh.setColorAt(index, highlightColor);
                  } else {
                      // Reset to original color
                      const tagColor = new THREE.Color(tagColorMap.get(bookmark.tags.split(' ')[0]));
                      instancedMesh.setColorAt(index, tagColor);
                  }
              });
              instancedMesh.instanceColor.needsUpdate = true;
          }
      } else {
          selectedBookmarks = [];
          // Reset all colors
          bookmarksData.forEach((bookmark, index) => {
              const primaryTag = bookmark.tags.split(' ')[0];
              const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
              instancedMesh.setColorAt(index, tagColor);
          });
          instancedMesh.instanceColor.needsUpdate = true;
      }
  };
  
  const animate = () => {
      requestAnimationFrame(animate);
      
      if (controls) {
          controls.update();
      }
      
      // renderer.render(scene, camera); // Remove this line
      composer.render(); // Use composer for rendering with post-processing
  };
  
  const onWindowResize = () => {
      if (camera && renderer && container) {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
          composer.setSize(container.clientWidth, container.clientHeight);
      }
  };
  
  onMount(() => {
      init();
      
      return () => {
          window.removeEventListener('resize', onWindowResize);
          container.removeEventListener('mousemove', onMouseMove);
          container.removeEventListener('click', onMouseClick);
          
          if (controls) {
              controls.dispose();
          }
          
          if (instancedMesh) {
              instancedMesh.geometry.dispose();
              instancedMesh.material.dispose();
          }
          
          if (composer) {
              composer.dispose();
          }
          
          renderer?.dispose();
          
          if (container && renderer) {
              container.removeChild(renderer.domElement);
          }
      };
  });
</script>

<div class="relative w-full h-screen">
  <div 
      bind:this={container} 
      class="absolute inset-0 w-full h-full bg-black"
      style="touch-action: none;"
  />
  
  {#if selectedBookmarks.length > 0}
      <div class="absolute top-4 right-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg max-w-md max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-bold text-gray-900">
                  Related Bookmarks ({selectedBookmarks.length})
              </h2>
              <button 
                  class="text-gray-500 hover:text-gray-700"
                  on:click={() => {
                      selectedBookmarks = [];
                      // Reset all colors
                      bookmarksData.forEach((bookmark, index) => {
                          const primaryTag = bookmark.tags.split(' ')[0];
                          const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
                          instancedMesh.setColorAt(index, tagColor);
                      });
                      instancedMesh.instanceColor.needsUpdate = true;
                  }}
              >
                  ×
              </button>
          </div>
          
          <div class="space-y-4">
              {#each selectedBookmarks as bookmark}
                  <div class="p-3 bg-white/50 rounded-lg">
                      <h3 class="text-lg font-semibold mb-2 text-gray-900">{bookmark.description}</h3>
                      <p class="text-sm text-gray-600 mb-2">{bookmark.extended}</p>
                      <div class="flex flex-wrap gap-2 mb-2">
                          {#each bookmark.tags.split(' ') as tag}
                              <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  {tag}
                              </span>
                          {/each}
                      </div>
                      <a 
                          href={bookmark.href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                      >
                          Open Link →
                      </a>
                  </div>
              {/each}
          </div>
      </div>
  {/if}

  {#if hoveredBookmark}
      <div 
          class="absolute p-2 bg-gray-800 text-white rounded-lg pointer-events-none"
          style="left: {tooltipX + 10}px; top: {tooltipY + 10}px;"
      >
          <strong>{hoveredBookmark.description}</strong>
          <p>{hoveredBookmark.extended}</p>
      </div>
  {/if}
</div>

<style>
  :global(body) {
      margin: 0;
      overflow: hidden;
  }
  .tooltip {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px;
      border-radius: 4px;
      pointer-events: none;
      white-space: nowrap;
  }
</style>
