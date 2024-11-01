<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  
  let container;
  let renderer;
  let scene;
  let camera;
  let controls;
  let bookmarkMeshes = [];
  let raycaster;
  let mouse;
  let selectedBookmark = $state(null);
  
  const init = () => {
      // Initialize raycaster for mouse interaction
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();
      
      // Add mouse move listener
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('click', onMouseClick);
      
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      
      // Camera setup
      camera = new THREE.PerspectiveCamera(
          75,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
      );
      camera.position.z = 100;
      
      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      
      // OrbitControls setup
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 50;
      controls.maxDistance = 200;
      controls.maxPolarAngle = Math.PI / 1.5;
      
      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 0);
      scene.add(directionalLight);
      
      // Load bookmarks
      loadBookmarks();
      
      // Start animation
      animate();
      
      // Handle window resize
      window.addEventListener('resize', onWindowResize);
  };
  
  const loadBookmarks = async () => {
      try {
          const response = await fetch('/api/bookmarks?chunk=0&size=100');
          const data = await response.json();
          
          if (data.bookmarks) {
              createBookmarkMeshes(data.bookmarks);
          }
      } catch (error) {
          console.error('Failed to load bookmarks:', error);
      }
  };
  
  const createBookmarkMeshes = (bookmarks) => {
      const geometry = new THREE.SphereGeometry(1, 8, 8);
      const group = new THREE.Group();
      
      bookmarks.forEach((bookmark, index) => {
          const angle = (index / bookmarks.length) * Math.PI * 2;
          const radius = 50;
          const height = Math.random() * 20 - 10;
          
          const material = new THREE.MeshPhongMaterial({
              color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5)
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
          );
          
          mesh.userData = bookmark;
          group.add(mesh);
          bookmarkMeshes.push(mesh);
      });
      
      scene.add(group);
  };
  
  const onMouseMove = (event) => {
      // Calculate mouse position relative to container
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(bookmarkMeshes);
      
      // Reset all meshes to original color
      bookmarkMeshes.forEach(mesh => {
          mesh.material.emissive.setHex(0x000000);
      });
      
      // Highlight hovered mesh
      if (intersects.length > 0) {
          intersects[0].object.material.emissive.setHex(0x333333);
          container.style.cursor = 'pointer';
      } else {
          container.style.cursor = 'grab';
      }
  };
  
  const onMouseClick = (event) => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bookmarkMeshes);
      
      if (intersects.length > 0) {
          selectedBookmark = intersects[0].object.userData;
      } else {
          selectedBookmark = null;
      }
  };
  
  const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      if (controls) {
          controls.update();
      }
      
      // Removed automatic rotation since we now have OrbitControls
      // if (scene) {
      //     scene.rotation.y += 0.001;
      // }
      
      renderer?.render(scene, camera);
  };
  
  const onWindowResize = () => {
      if (camera && renderer && container) {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
      }
  };
  
  onMount(() => {
      init();
      
      return () => {
          // Cleanup
          window.removeEventListener('resize', onWindowResize);
          container.removeEventListener('mousemove', onMouseMove);
          container.removeEventListener('click', onMouseClick);
          
          // Dispose of OrbitControls
          if (controls) {
              controls.dispose();
          }
          
          // Dispose of Three.js resources
          bookmarkMeshes.forEach(mesh => {
              mesh.geometry.dispose();
              mesh.material.dispose();
          });
          
          renderer?.dispose();
          
          // Remove canvas
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
  
  {#if selectedBookmark}
      <div class="absolute top-4 right-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg max-w-md">
          <h3 class="text-lg font-semibold mb-2 text-gray-900">{selectedBookmark.description}</h3>
          <p class="text-sm text-gray-600 mb-2">{selectedBookmark.extended}</p>
          <div class="flex flex-wrap gap-2 mb-2">
              {#each selectedBookmark.tags.split(' ') as tag}
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {tag}
                  </span>
              {/each}
          </div>
          <a 
              href={selectedBookmark.href} 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 text-sm"
          >
              Open Link →
          </a>
      </div>
  {/if}
</div>

<style>
  :global(body) {
      margin: 0;
      overflow: hidden;
  }
</style>