<!-- src/routes/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
	// Add this after your existing imports
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { throttle } from 'lodash';
	import IntroGuide from '$lib/components/garden/IntroGuide.svelte';
	import PathLens from '$lib/components/garden/PathLens.svelte';
	import FocusRail from '$lib/components/garden/FocusRail.svelte';
	import { buildRelatedBookmarks } from '$lib/bookmarks/relations.js';
	import { DEFAULT_LENS, normalizeLens } from '$lib/bookmarks/lens.js';

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
	let lineGroup; // To hold all connection lines
	let lines = []; // To track active lines for cleanup
	let isLoading = false; // Loading state for bookmark fetch
	let throttledMouseMove; // Store throttled function for cleanup
	let handleKeyDown; // Store keyboard handler for cleanup
	let showIntroGuide = true;
	let activeLens = DEFAULT_LENS;
	let queryFocusHandled = false;
	let selectedBookmark = null;
	let relatedBookmarks = [];

	// Configuration
	const sphereBaseSize = 1.0;
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
		bookmarks.forEach((bookmark) => {
			const tags = bookmark.tags.split(' ');
			tags.forEach((tag) => tagSet.add(tag));
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

	// Helper function to clear selection
	const clearSelection = () => {
		selectedBookmarks = [];
		relatedBookmarks = [];
		selectedBookmark = null;
		// Reset all colors
		bookmarksData.forEach((bookmark, index) => {
			const primaryTag = bookmark.tags.split(' ')[0];
			const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
			instancedMesh.setColorAt(index, tagColor);
		});
		instancedMesh.instanceColor.needsUpdate = true;

		// Remove connection lines
		if (lineGroup) {
			scene.remove(lineGroup);
			lines.forEach((line) => {
				line.geometry.dispose();
				line.material.dispose();
			});
			lines = [];
		}
	};

	const selectBookmark = (clickedBookmark) => {
		const clickedTags = new Set(clickedBookmark.tags.split(' '));
		selectedBookmark = clickedBookmark;
		relatedBookmarks = buildRelatedBookmarks(clickedBookmark, bookmarksData, activeLens).slice(0, 12);

		selectedBookmarks = bookmarksData
			.filter((bookmark) => {
				const bookmarkTags = new Set(bookmark.tags.split(' '));
				return Array.from(bookmarkTags).some((tag) => clickedTags.has(tag));
			})
			.sort((a, b) => {
				const aShared = a.tags.split(' ').filter((tag) => clickedTags.has(tag)).length;
				const bShared = b.tags.split(' ').filter((tag) => clickedTags.has(tag)).length;
				return bShared - aShared;
			});

		bookmarksData.forEach((bookmark, index) => {
			const isRelated = selectedBookmarks.some((b) => b.hash === bookmark.hash);
			if (isRelated) {
				const tagColor = new THREE.Color(tagColorMap.get(bookmark.tags.split(' ')[0]));
				const highlightColor = tagColor.clone().multiplyScalar(0.7);
				instancedMesh.setColorAt(index, highlightColor);
			} else {
				const tagColor = new THREE.Color(tagColorMap.get(bookmark.tags.split(' ')[0]));
				instancedMesh.setColorAt(index, tagColor);
			}
		});

		instancedMesh.instanceColor.needsUpdate = true;
		createConnectionLines(
			clickedBookmark,
			selectedBookmarks.filter((bookmark) => bookmark.hash !== clickedBookmark.hash)
		);
		showIntroGuide = false;
	};

	const init = () => {
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		// Throttle mousemove for better performance
		throttledMouseMove = throttle(onMouseMove, 50);
		container.addEventListener('mousemove', throttledMouseMove);
		container.addEventListener('click', onMouseClick);

		// Add keyboard listener for Escape key
		handleKeyDown = (event) => {
			if (event.key === 'Escape' && selectedBookmarks.length > 0) {
				clearSelection();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x151a14);
		scene.fog = new THREE.FogExp2(0x1e2a1d, 0.0038);

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
		controls.dampingFactor = 0.07;
		controls.screenSpacePanning = false;
		controls.minDistance = 50;
		controls.maxDistance = 200;
		controls.maxPolarAngle = Math.PI / 1.5;

		// Ambient Light
		const ambientLight = new THREE.AmbientLight(0xf2eddc, 1.35);
		scene.add(ambientLight);

		// Directional Light
		// const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
		// directionalLight.position.set(1, 1, 1);
		// scene.add(directionalLight);

		// Optional: Add HemisphereLight for more natural lighting

		// const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
		// hemisphereLight.position.set(0, 200, 0);
		// scene.add(hemisphereLight);

		// Optional: Add PointLight or SpotLight

		const pointLight = new THREE.PointLight(0xd7f0c8, 1.8, 240);
		pointLight.position.set(30, 50, 40);
		scene.add(pointLight);

		loadBookmarks();
		animate();

		window.addEventListener('resize', onWindowResize);
	};

	const loadBookmarks = async () => {
		isLoading = true;
		try {
			const response = await fetch(`${base}/data/filtered_bookmarks.json`);
			const allBookmarks = await response.json();

			const bookmarks = allBookmarks.slice(0, 2000);
			if (bookmarks.length > 0) {
				bookmarksData = bookmarks;
				createBookmarkMeshes(bookmarks);

				const focusHash = new URLSearchParams(window.location.search).get('focus');
				if (focusHash && !queryFocusHandled) {
					const bookmark = bookmarksData.find((entry) => entry.hash === focusHash) ?? bookmarksData[0];
					if (bookmark) {
						selectBookmark(bookmark);
					}
					queryFocusHandled = true;
				}
			}
		} catch (error) {
			console.error('Failed to load bookmarks:', error);
		} finally {
			isLoading = false;
		}
	};

	const createConnectionLines = (selectedBookmark, relatedBookmarks) => {
		// Remove existing lines
		if (lineGroup) {
			scene.remove(lineGroup);
			lines.forEach((line) => {
				line.geometry.dispose();
				line.material.dispose();
			});
			lines = [];
		}

		lineGroup = new THREE.Group();

		// Get position of selected bookmark
		const selectedMatrix = new THREE.Matrix4();
		instancedMesh.getMatrixAt(bookmarksData.indexOf(selectedBookmark), selectedMatrix);
		const selectedPosition = new THREE.Vector3();
		selectedPosition.setFromMatrixPosition(selectedMatrix);

		// Create lines to related bookmarks
		relatedBookmarks.forEach((relatedBookmark) => {
			const relatedMatrix = new THREE.Matrix4();
			instancedMesh.getMatrixAt(bookmarksData.indexOf(relatedBookmark), relatedMatrix);
			const relatedPosition = new THREE.Vector3();
			relatedPosition.setFromMatrixPosition(relatedMatrix);

			// Calculate shared tags for line intensity
			const selectedTags = new Set(selectedBookmark.tags.split(' '));
			const relatedTags = new Set(relatedBookmark.tags.split(' '));
			const sharedTags = Array.from(selectedTags).filter((tag) => relatedTags.has(tag));
			const relationStrength = sharedTags.length / Math.max(selectedTags.size, relatedTags.size);

			// Create line geometry
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions([
				selectedPosition.x,
				selectedPosition.y,
				selectedPosition.z,
				relatedPosition.x,
				relatedPosition.y,
				relatedPosition.z
			]);

			// Create enhanced line material with improved visibility
			const lineMaterial = new LineMaterial({
				color: 0x9acb8f,
				linewidth: 0.5 + relationStrength * 0.005, // Increased base width and scaling
				vertexColors: false,
				dashed: false,
				alphaToCoverage: true,
				transparent: true,
				opacity: 0.5 + relationStrength * 0.4, // Increased base opacity
				blending: THREE.AdditiveBlending, // Add additive blending for a glowing effect
				depthTest: true,
				depthWrite: false // Prevent lines from being obscured by other objects
			});
			lineMaterial.resolution.set(container.clientWidth, container.clientHeight);

			// Create line
			const line = new Line2(lineGeometry, lineMaterial);
			lines.push(line);
			lineGroup.add(line);
		});

		scene.add(lineGroup);
	};

	const calculatePositions = (count, distributionType = 'surface') => {
		const positions = [];

		for (let i = 0; i < count; i++) {
			const theta = Math.acos(2 * Math.random() - 1); // Polar angle
			const phi = 2 * Math.PI * Math.random(); // Azimuthal angle

			const radius =
				distributionType === 'surface'
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
		const geometry = new THREE.SphereGeometry(sphereBaseSize, 8, 8);

		// Use MeshStandardMaterial for better lighting and realism
		const material = new THREE.MeshStandardMaterial({
			vertexColors: true, // Important for per-instance colors
			roughness: 0.01, // Reduced roughness for shinier surfaces
			metalness: 0.2,
			emissive: new THREE.Color(0xf542b3), // Emissive color set to white
			emissiveIntensity: 0.4 // Moderate emissive intensity
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
					const originalColor = new THREE.Color(
						tagColorMap.get(instanceIdToBookmark.get(instanceId).tags.split(' ')[0])
					);
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
				selectBookmark(instanceIdToBookmark.get(instanceId));
			}
		} else {
			clearSelection();
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

			lines.forEach((line) => {
				line.material.resolution.set(container.clientWidth, container.clientHeight);
			});
		}
	};

	$: activeLens = normalizeLens($page.url.searchParams.get('lens'));
	$: if (selectedBookmark && bookmarksData.length > 0) {
		relatedBookmarks = buildRelatedBookmarks(selectedBookmark, bookmarksData, activeLens).slice(0, 12);
	}

	onMount(() => {
		const focusHash = new URLSearchParams(window.location.search).get('focus');
		if (focusHash) {
			showIntroGuide = false;
			if (selectedBookmarks.length === 0) {
				selectedBookmark = {
					hash: focusHash,
					description: 'Loading focused bookmark...',
					extended: 'Preparing related paths.',
					tags: 'focus',
					href: '#'
				};
				relatedBookmarks = [
					{
						bookmark: {
							hash: `${focusHash}-loading`,
							description: 'Loading related paths...',
							extended: '',
							tags: 'focus',
							href: '#'
						},
						explanation: 'Why this path: loading relationship context.'
					}
				];
				selectedBookmarks = [selectedBookmark];
			}
		}

		init();

		return () => {
			window.removeEventListener('resize', onWindowResize);
			if (throttledMouseMove) {
				container.removeEventListener('mousemove', throttledMouseMove);
			}
			container.removeEventListener('click', onMouseClick);
			if (handleKeyDown) {
				window.removeEventListener('keydown', handleKeyDown);
			}

			if (controls) {
				controls.dispose();
			}

			if (instancedMesh) {
				instancedMesh.geometry.dispose();
				instancedMesh.material.dispose();
			}

			if (lineGroup) {
				scene.remove(lineGroup);
				lines.forEach((line) => {
					line.geometry.dispose();
					line.material.dispose();
				});
				lines = [];
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
	<IntroGuide
		visible={showIntroGuide && selectedBookmarks.length === 0}
		onStart={() => (showIntroGuide = false)}
		onDismiss={() => (showIntroGuide = false)}
	/>
	<PathLens activeLens={activeLens} onChange={(lens) => (activeLens = lens)} />

	<div
		bind:this={container}
		class="absolute inset-0 w-full h-full bg-black"
		style="touch-action: none;"
	></div>

	<!-- Loading spinner -->
	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div class="text-center">
				<div
					class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"
				></div>
				<p class="text-white mt-4 text-lg">Loading bookmarks...</p>
			</div>
		</div>
	{/if}

	<FocusRail
		selectedBookmark={selectedBookmark}
		related={relatedBookmarks}
		activeLens={activeLens}
		onClose={clearSelection}
	/>

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
</style>
