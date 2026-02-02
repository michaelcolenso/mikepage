<!-- src/routes/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
	import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { throttle } from 'lodash';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide
	} from 'd3-force-3d';

	let container;
	let renderer;
	let scene;
	let camera;
	let controls;
	let composer;
	let instancedMesh;
	let raycaster;
	let mouse;
	let selectedBookmarks = [];
	let hoveredBookmark = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let lineGroup;
	let lines = [];
	let isLoading = false;
	let throttledMouseMove;
	let handleKeyDown;
	let simulation;
	let simulationRunning = false;

	// Configuration
	const sphereBaseSize = 1.0;
	const sphereMaxSize = 1.9;
	const maxBookmarks = 2000;

	// Data
	let bookmarksData = [];
	let graphNodes = [];
	const instanceIdToBookmark = new Map();
	const nodeScales = [];
	let tagColorMap = new Map();
	const dummy = new THREE.Object3D();

	const getUniqueTags = (bookmarks) => {
		const tagSet = new Set();
		bookmarks.forEach((bookmark) => {
			bookmark.tags.split(' ').forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet);
	};

	const generateTagColorMap = (tags) => {
		const map = new Map();
		const totalTags = tags.length;
		tags.forEach((tag, index) => {
			const hue = (index / totalTags) * 360;
			map.set(tag, `hsl(${hue}, 70%, 50%)`);
		});
		return map;
	};

	// Build links between bookmarks that share 2+ tags
	const buildGraphLinks = (bookmarks) => {
		// Inverted index: tag -> bookmark indices
		const tagToIndices = new Map();
		bookmarks.forEach((b, i) => {
			b.tags.split(' ').forEach((tag) => {
				if (!tagToIndices.has(tag)) tagToIndices.set(tag, []);
				tagToIndices.get(tag).push(i);
			});
		});

		// For each bookmark, count shared tags with other bookmarks
		const pairCounts = new Map();
		bookmarks.forEach((b, i) => {
			const relatedCounts = new Map();
			b.tags.split(' ').forEach((tag) => {
				const indices = tagToIndices.get(tag);
				// Skip very popular tags to avoid combinatorial explosion
				if (indices.length > 150) return;
				indices.forEach((j) => {
					if (j !== i) {
						relatedCounts.set(j, (relatedCounts.get(j) || 0) + 1);
					}
				});
			});

			relatedCounts.forEach((count, j) => {
				if (count >= 2) {
					const key = Math.min(i, j) + '|' + Math.max(i, j);
					if (!pairCounts.has(key)) {
						pairCounts.set(key, { source: i, target: j, value: count });
					}
				}
			});
		});

		let links = Array.from(pairCounts.values());

		// Cap links for performance (keep strongest connections)
		if (links.length > 8000) {
			links.sort((a, b) => b.value - a.value);
			links.length = 8000;
		}

		return links;
	};

	const clearSelection = () => {
		if (!instancedMesh) return;
		selectedBookmarks = [];

		bookmarksData.forEach((bookmark, index) => {
			const primaryTag = bookmark.tags.split(' ')[0];
			const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
			instancedMesh.setColorAt(index, tagColor);
		});
		instancedMesh.instanceColor.needsUpdate = true;

		if (lineGroup) {
			scene.remove(lineGroup);
			lines.forEach((line) => {
				line.geometry.dispose();
				line.material.dispose();
			});
			lines = [];
		}
	};

	const init = () => {
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		throttledMouseMove = throttle(onMouseMove, 50);
		container.addEventListener('mousemove', throttledMouseMove);
		container.addEventListener('click', onMouseClick);

		handleKeyDown = (event) => {
			if (event.key === 'Escape' && selectedBookmarks.length > 0) {
				clearSelection();
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x000000);

		camera = new THREE.PerspectiveCamera(
			75,
			container.clientWidth / container.clientHeight,
			0.1,
			2000
		);
		camera.position.set(0, 0, 350);

		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true
		});
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.5;
		renderer.shadowMap.enabled = false;
		container.appendChild(renderer.domElement);

		composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera));
		composer.addPass(
			new UnrealBloomPass(
				new THREE.Vector2(container.clientWidth, container.clientHeight),
				1.5,
				0.4,
				0.85
			)
		);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.07;
		controls.screenSpacePanning = false;
		controls.minDistance = 100;
		controls.maxDistance = 600;
		controls.maxPolarAngle = Math.PI; // Allow full rotation for 3D graph

		const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
		scene.add(ambientLight);

		const pointLight = new THREE.PointLight(0xffffff, 1, 500);
		pointLight.position.set(100, 100, 100);
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
			const bookmarks = allBookmarks.slice(0, maxBookmarks);

			if (bookmarks.length > 0) {
				bookmarksData = bookmarks;

				// Build graph nodes
				graphNodes = bookmarks.map((b, i) => ({ index: i }));

				// Generate links from shared tags
				const links = buildGraphLinks(bookmarks);
				console.log(`Force graph: ${graphNodes.length} nodes, ${links.length} links`);

				// Create force simulation in 3D
				simulation = forceSimulation(graphNodes, 3)
					.force(
						'link',
						forceLink(links)
							.id((d) => d.index)
							.distance((link) => 40 / Math.sqrt(link.value))
							.strength((link) => Math.min(0.7, link.value * 0.15))
					)
					.force('charge', forceManyBody().strength(-40))
					.force('center', forceCenter())
					.force('collide', forceCollide(3));

				// Warmup: run 100 ticks before first render so layout has initial structure
				simulation.stop();
				simulation.tick(100);

				// Create meshes at warmup positions
				createBookmarkMeshes(bookmarks);

				// Restart simulation for animated settling
				simulationRunning = true;
				simulation.on('end', () => {
					simulationRunning = false;
				});
				simulation.restart();
			}
		} catch (error) {
			console.error('Failed to load bookmarks:', error);
		} finally {
			isLoading = false;
		}
	};

	const createBookmarkMeshes = (bookmarks) => {
		const uniqueTags = getUniqueTags(bookmarks);
		tagColorMap = generateTagColorMap(uniqueTags);

		const geometry = new THREE.SphereGeometry(sphereBaseSize, 8, 8);
		const material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.01,
			metalness: 0.2,
			emissive: new THREE.Color(0xf542b3),
			emissiveIntensity: 0.4
		});

		instancedMesh = new THREE.InstancedMesh(geometry, material, bookmarks.length);

		const colors = [];
		bookmarks.forEach((bookmark, index) => {
			const tags = bookmark.tags.split(' ');
			const primaryTag = tags[0];
			const tagColor = new THREE.Color(tagColorMap.get(primaryTag));

			// Position from force simulation
			const node = graphNodes[index];
			dummy.position.set(node.x || 0, node.y || 0, node.z || 0);

			// Scale based on tag count
			const size = sphereBaseSize + (tags.length / 10) * (sphereMaxSize - sphereBaseSize);
			nodeScales[index] = size;
			dummy.scale.set(size, size, size);
			dummy.updateMatrix();
			instancedMesh.setMatrixAt(index, dummy.matrix);

			colors.push(tagColor.r, tagColor.g, tagColor.b);
			instanceIdToBookmark.set(index, bookmark);
		});

		instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
			new Float32Array(colors),
			3
		);
		instancedMesh.instanceColor.needsUpdate = true;
		scene.add(instancedMesh);
	};

	// Update InstancedMesh positions from simulation node coordinates
	const updateNodePositions = () => {
		if (!instancedMesh || !graphNodes.length) return;

		graphNodes.forEach((node, i) => {
			dummy.position.set(node.x || 0, node.y || 0, node.z || 0);
			const s = nodeScales[i] || 1;
			dummy.scale.set(s, s, s);
			dummy.updateMatrix();
			instancedMesh.setMatrixAt(i, dummy.matrix);
		});

		instancedMesh.instanceMatrix.needsUpdate = true;
	};

	const createConnectionLines = (selectedBookmark, relatedBookmarks) => {
		if (lineGroup) {
			scene.remove(lineGroup);
			lines.forEach((line) => {
				line.geometry.dispose();
				line.material.dispose();
			});
			lines = [];
		}

		lineGroup = new THREE.Group();

		// Get position from simulation node
		const selectedIndex = bookmarksData.indexOf(selectedBookmark);
		const selectedNode = graphNodes[selectedIndex];
		const selectedPosition = new THREE.Vector3(
			selectedNode.x || 0,
			selectedNode.y || 0,
			selectedNode.z || 0
		);

		// Use selected node's tag color for connection lines
		const selectedColor = new THREE.Color(
			tagColorMap.get(selectedBookmark.tags.split(' ')[0])
		);

		relatedBookmarks.forEach((relatedBookmark) => {
			const relatedIndex = bookmarksData.indexOf(relatedBookmark);
			const relatedNode = graphNodes[relatedIndex];
			const relatedPosition = new THREE.Vector3(
				relatedNode.x || 0,
				relatedNode.y || 0,
				relatedNode.z || 0
			);

			const selectedTags = new Set(selectedBookmark.tags.split(' '));
			const relatedTags = new Set(relatedBookmark.tags.split(' '));
			const sharedTags = Array.from(selectedTags).filter((tag) => relatedTags.has(tag));
			const relationStrength =
				sharedTags.length / Math.max(selectedTags.size, relatedTags.size);

			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions([
				selectedPosition.x,
				selectedPosition.y,
				selectedPosition.z,
				relatedPosition.x,
				relatedPosition.y,
				relatedPosition.z
			]);

			const lineMaterial = new LineMaterial({
				color: selectedColor,
				linewidth: 0.5 + relationStrength * 0.005,
				vertexColors: false,
				dashed: false,
				alphaToCoverage: true,
				transparent: true,
				opacity: 0.3 + relationStrength * 0.5,
				blending: THREE.AdditiveBlending,
				depthTest: true,
				depthWrite: false
			});
			lineMaterial.resolution.set(container.clientWidth, container.clientHeight);

			const line = new Line2(lineGeometry, lineMaterial);
			lines.push(line);
			lineGroup.add(line);
		});

		scene.add(lineGroup);
	};

	const onMouseMove = (event) => {
		if (!instancedMesh) return;

		const rect = container.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObject(instancedMesh);

		if (selectedBookmarks.length === 0) {
			bookmarksData.forEach((bookmark, index) => {
				const primaryTag = bookmark.tags.split(' ')[0];
				const tagColor = new THREE.Color(tagColorMap.get(primaryTag));
				instancedMesh.setColorAt(index, tagColor);
			});
			instancedMesh.instanceColor.needsUpdate = true;

			if (intersects.length > 0) {
				const instanceId = intersects[0].instanceId;
				if (instanceId !== null) {
					const originalColor = new THREE.Color(
						tagColorMap.get(instanceIdToBookmark.get(instanceId).tags.split(' ')[0])
					);
					const highlightColor = originalColor.clone().multiplyScalar(0.7);
					instancedMesh.setColorAt(instanceId, highlightColor);
					instancedMesh.instanceColor.needsUpdate = true;
					container.style.cursor = 'pointer';

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
		if (!instancedMesh) return;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObject(instancedMesh);

		if (intersects.length > 0) {
			const instanceId = intersects[0].instanceId;
			if (instanceId !== null) {
				const clickedBookmark = instanceIdToBookmark.get(instanceId);
				const clickedTags = new Set(clickedBookmark.tags.split(' '));

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
						const tagColor = new THREE.Color(
							tagColorMap.get(bookmark.tags.split(' ')[0])
						);
						const highlightColor = tagColor.clone().multiplyScalar(0.7);
						instancedMesh.setColorAt(index, highlightColor);
					} else {
						const tagColor = new THREE.Color(
							tagColorMap.get(bookmark.tags.split(' ')[0])
						);
						instancedMesh.setColorAt(index, tagColor);
					}
				});
				instancedMesh.instanceColor.needsUpdate = true;

				createConnectionLines(clickedBookmark, selectedBookmarks);
			}
		} else {
			clearSelection();
		}
	};

	const animate = () => {
		requestAnimationFrame(animate);

		// Update node positions while simulation is settling
		if (simulationRunning && selectedBookmarks.length === 0) {
			updateNodePositions();
		}

		if (controls) controls.update();
		composer.render();
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

	onMount(() => {
		init();

		return () => {
			if (simulation) simulation.stop();
			window.removeEventListener('resize', onWindowResize);
			if (throttledMouseMove) {
				container.removeEventListener('mousemove', throttledMouseMove);
			}
			container.removeEventListener('click', onMouseClick);
			if (handleKeyDown) {
				window.removeEventListener('keydown', handleKeyDown);
			}

			if (controls) controls.dispose();

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

			if (composer) composer.dispose();
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

	{#if selectedBookmarks.length > 0}
		<div
			class="absolute top-4 right-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg max-w-md max-h-[80vh] overflow-y-auto"
		>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-lg font-bold text-gray-900">
					Related Bookmarks ({selectedBookmarks.length})
				</h2>
				<button class="text-gray-500 hover:text-gray-700" on:click={clearSelection}>
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
</style>
