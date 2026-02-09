<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import * as d3 from 'd3';

	let container;
	let width = 900;
	let height = 900;
	let innerRadius;
	let outerRadius;

	let bookmarksData = [];
	let topTags = [];
	let matrix = [];
	let tagColorScale;
	let isLoading = true;

	// Interaction state
	let hoveredTag = null;
	let selectedTag = null;
	let relatedBookmarks = [];

	const TOP_N_TAGS = 30; // Show top 30 tags

	// Build co-occurrence matrix from bookmarks
	function buildCooccurrenceMatrix(bookmarks, tags) {
		const tagIndex = new Map(tags.map((t, i) => [t, i]));
		const n = tags.length;
		const mat = Array(n)
			.fill(null)
			.map(() => Array(n).fill(0));

		bookmarks.forEach((bookmark) => {
			const bookmarkTags = bookmark.tags.split(' ').filter((t) => tagIndex.has(t));

			// For each pair of tags in this bookmark, increment the matrix
			for (let i = 0; i < bookmarkTags.length; i++) {
				for (let j = 0; j < bookmarkTags.length; j++) {
					if (i !== j) {
						const idx1 = tagIndex.get(bookmarkTags[i]);
						const idx2 = tagIndex.get(bookmarkTags[j]);
						mat[idx1][idx2] += 1;
					}
				}
			}
		});

		return mat;
	}

	// Get top N tags by frequency
	function getTopTags(bookmarks, n) {
		const tagCounts = new Map();

		bookmarks.forEach((bookmark) => {
			bookmark.tags.split(' ').forEach((tag) => {
				// Skip "via:*" tags as they're attribution, not content
				if (tag.startsWith('via:')) return;
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			});
		});

		return Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([tag]) => tag);
	}

	// Find bookmarks that have a specific tag
	function getBookmarksWithTag(tag) {
		return bookmarksData.filter((b) => b.tags.split(' ').includes(tag));
	}

	// Find bookmarks that have both tags
	function getBookmarksWithBothTags(tag1, tag2) {
		return bookmarksData.filter((b) => {
			const tags = b.tags.split(' ');
			return tags.includes(tag1) && tags.includes(tag2);
		});
	}

	function render() {
		if (!container || !matrix.length) return;

		// Clear previous
		d3.select(container).selectAll('*').remove();

		const svg = d3
			.select(container)
			.append('svg')
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('width', '100%')
			.attr('height', '100%')
			.style('font', '10px sans-serif');

		// Create chord layout
		const chord = d3
			.chord()
			.padAngle(0.04)
			.sortSubgroups(d3.descending)
			.sortChords(d3.descending);

		const chords = chord(matrix);

		// Arc generator for outer ring
		const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

		// Ribbon generator for chords
		const ribbon = d3.ribbon().radius(innerRadius - 1);

		// Create group for each tag (outer arcs)
		const group = svg
			.append('g')
			.selectAll('g')
			.data(chords.groups)
			.join('g')
			.attr('class', 'group')
			.style('cursor', 'pointer')
			.on('mouseover', function (event, d) {
				hoveredTag = topTags[d.index];
				highlightConnections(d.index);
			})
			.on('mouseout', function () {
				if (!selectedTag) {
					hoveredTag = null;
					resetHighlight();
				}
			})
			.on('click', function (event, d) {
				const clickedTag = topTags[d.index];
				if (selectedTag === clickedTag) {
					selectedTag = null;
					relatedBookmarks = [];
					resetHighlight();
				} else {
					selectedTag = clickedTag;
					relatedBookmarks = getBookmarksWithTag(clickedTag);
					highlightConnections(d.index);
				}
			});

		// Draw outer arcs
		group
			.append('path')
			.attr('class', 'arc')
			.attr('fill', (d) => tagColorScale(topTags[d.index]))
			.attr('stroke', '#fff')
			.attr('stroke-width', 0.5)
			.attr('d', arc);

		// Add labels
		group
			.append('text')
			.each((d) => {
				d.angle = (d.startAngle + d.endAngle) / 2;
			})
			.attr('dy', '0.35em')
			.attr(
				'transform',
				(d) => `
				rotate(${(d.angle * 180) / Math.PI - 90})
				translate(${outerRadius + 8})
				${d.angle > Math.PI ? 'rotate(180)' : ''}
			`
			)
			.attr('text-anchor', (d) => (d.angle > Math.PI ? 'end' : null))
			.attr('fill', '#e5e5e5')
			.attr('font-size', '11px')
			.attr('font-weight', '500')
			.text((d) => topTags[d.index]);

		// Draw ribbons (chords)
		svg
			.append('g')
			.attr('fill-opacity', 0.7)
			.selectAll('path')
			.data(chords)
			.join('path')
			.attr('class', 'ribbon')
			.attr('d', ribbon)
			.attr('fill', (d) => tagColorScale(topTags[d.source.index]))
			.attr('stroke', (d) => d3.color(tagColorScale(topTags[d.source.index])).darker(0.3))
			.attr('stroke-width', 0.5)
			.style('cursor', 'pointer')
			.style('mix-blend-mode', 'screen')
			.on('mouseover', function (event, d) {
				const tag1 = topTags[d.source.index];
				const tag2 = topTags[d.target.index];
				hoveredTag = `${tag1} ↔ ${tag2}`;

				// Highlight this ribbon
				d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 1.5);

				// Dim others
				svg.selectAll('.ribbon').filter((r) => r !== d).attr('fill-opacity', 0.1);
				svg.selectAll('.arc').attr('fill-opacity', (a) =>
					a.index === d.source.index || a.index === d.target.index ? 1 : 0.3
				);
			})
			.on('mouseout', function () {
				if (!selectedTag) {
					hoveredTag = null;
					resetHighlight();
				}
			})
			.on('click', function (event, d) {
				const tag1 = topTags[d.source.index];
				const tag2 = topTags[d.target.index];
				selectedTag = `${tag1} + ${tag2}`;
				relatedBookmarks = getBookmarksWithBothTags(tag1, tag2);
			});

		function highlightConnections(index) {
			// Highlight arcs connected to this index
			svg.selectAll('.arc').attr('fill-opacity', (d) => (d.index === index ? 1 : 0.3));

			// Highlight ribbons connected to this index
			svg
				.selectAll('.ribbon')
				.attr('fill-opacity', (d) =>
					d.source.index === index || d.target.index === index ? 0.9 : 0.05
				)
				.attr('stroke-width', (d) =>
					d.source.index === index || d.target.index === index ? 1 : 0.5
				);
		}

		function resetHighlight() {
			svg.selectAll('.arc').attr('fill-opacity', 1);
			svg.selectAll('.ribbon').attr('fill-opacity', 0.7).attr('stroke-width', 0.5);
		}
	}

	async function loadData() {
		isLoading = true;
		try {
			const response = await fetch(`${base}/data/filtered_bookmarks.json`);
			bookmarksData = await response.json();

			// Get top tags
			topTags = getTopTags(bookmarksData, TOP_N_TAGS);

			// Build co-occurrence matrix
			matrix = buildCooccurrenceMatrix(bookmarksData, topTags);

			// Create color scale
			tagColorScale = d3.scaleOrdinal().domain(topTags).range(d3.schemeTableau10.concat(d3.schemePastel1));

			// Calculate dimensions
			innerRadius = Math.min(width, height) * 0.5 - 100;
			outerRadius = innerRadius + 20;

			render();
		} catch (error) {
			console.error('Failed to load bookmarks:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleResize() {
		if (container) {
			const rect = container.getBoundingClientRect();
			width = rect.width;
			height = Math.min(rect.width, window.innerHeight - 100);
			innerRadius = Math.min(width, height) * 0.5 - 100;
			outerRadius = innerRadius + 20;
			render();
		}
	}

	onMount(() => {
		loadData();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div class="min-h-screen bg-gray-950 text-white">
	<!-- Header -->
	<header class="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
		<div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold">Tag Relationships</h1>
				<p class="text-sm text-gray-400">Chord diagram of tag co-occurrence</p>
			</div>
			<a
				href="{base}/"
				class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
			>
				← Back to 3D View
			</a>
		</div>
	</header>

	<div class="flex pt-16">
		<!-- Main visualization -->
		<div class="flex-1 flex items-center justify-center p-4">
			{#if isLoading}
				<div class="text-center">
					<div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p class="mt-4 text-gray-400">Loading bookmarks...</p>
				</div>
			{:else}
				<div bind:this={container} class="w-full max-w-4xl aspect-square"></div>
			{/if}
		</div>

		<!-- Side panel -->
		<div class="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto max-h-screen">
			{#if hoveredTag || selectedTag}
				<div class="mb-4">
					<h2 class="text-lg font-semibold text-white">
						{selectedTag || hoveredTag}
					</h2>
					{#if relatedBookmarks.length > 0}
						<p class="text-sm text-gray-400 mt-1">
							{relatedBookmarks.length} bookmark{relatedBookmarks.length !== 1 ? 's' : ''}
						</p>
					{/if}
				</div>

				{#if selectedTag && relatedBookmarks.length > 0}
					<div class="space-y-3">
						{#each relatedBookmarks.slice(0, 50) as bookmark}
							<div class="p-3 bg-gray-800 rounded-lg">
								<h3 class="font-medium text-sm text-white line-clamp-2">
									{bookmark.description}
								</h3>
								{#if bookmark.extended}
									<p class="text-xs text-gray-400 mt-1 line-clamp-2">
										{bookmark.extended}
									</p>
								{/if}
								<div class="flex flex-wrap gap-1 mt-2">
									{#each bookmark.tags.split(' ').slice(0, 5) as tag}
										<span
											class="px-1.5 py-0.5 text-xs rounded"
											style="background-color: {tagColorScale && topTags.includes(tag)
												? tagColorScale(tag)
												: '#4b5563'}; color: #111"
										>
											{tag}
										</span>
									{/each}
									{#if bookmark.tags.split(' ').length > 5}
										<span class="px-1.5 py-0.5 text-xs text-gray-500">
											+{bookmark.tags.split(' ').length - 5}
										</span>
									{/if}
								</div>
								<a
									href={bookmark.href}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
								>
									Open →
								</a>
							</div>
						{/each}
						{#if relatedBookmarks.length > 50}
							<p class="text-sm text-gray-500 text-center">
								...and {relatedBookmarks.length - 50} more
							</p>
						{/if}
					</div>
				{/if}
			{:else}
				<div class="text-gray-400 text-sm">
					<h3 class="font-semibold text-white mb-2">How to read this</h3>
					<ul class="space-y-2">
						<li>
							<strong class="text-gray-300">Arcs</strong> = tags (sized by total connections)
						</li>
						<li>
							<strong class="text-gray-300">Ribbons</strong> = bookmarks shared between tags
						</li>
						<li>
							<strong class="text-gray-300">Thicker ribbon</strong> = more bookmarks with both tags
						</li>
					</ul>
					<p class="mt-4 text-gray-500">
						Hover over arcs or ribbons to explore. Click to see bookmarks.
					</p>
					<p class="mt-4 text-gray-500">
						Showing top {TOP_N_TAGS} tags by frequency.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
