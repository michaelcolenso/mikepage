<script>
	export let selectedBookmark = null;
	export let related = [];
	export let activeLens = 'closest';
	export let onClose = () => {};
</script>

{#if selectedBookmark}
	<aside
		data-testid="focus-rail"
		class="absolute right-4 top-4 z-20 max-h-[80vh] w-[min(28rem,92vw)] overflow-y-auto rounded-xl bg-white/92 p-4 shadow-xl backdrop-blur-sm"
	>
		<div class="mb-4 flex items-start justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-[0.18em] text-gray-500">Focused bloom</p>
				<h2 data-testid="selected-title" class="mt-1 text-lg font-bold text-gray-900">
					{selectedBookmark.description}
				</h2>
			</div>
			<button class="text-gray-500 hover:text-gray-700" on:click={onClose}>Close</button>
		</div>

		<p class="mb-3 text-sm text-gray-600">{selectedBookmark.extended || 'No summary available.'}</p>
		<div class="mb-3 flex flex-wrap gap-2">
			{#each selectedBookmark.tags.split(' ') as tag}
				<span class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-900">{tag}</span>
			{/each}
		</div>
		<a
			href={selectedBookmark.href}
			target="_blank"
			rel="noopener noreferrer"
			class="mb-4 inline-flex text-sm text-blue-600 hover:text-blue-800"
		>
			Open focused link →
		</a>

		<div class="mt-3 border-t border-gray-200 pt-3">
			<h3 class="text-sm font-semibold text-gray-800">
				{activeLens === 'family' ? 'Thematic branches' : 'Related paths'}
			</h3>
			<div class="mt-3 space-y-3">
				{#each related as item}
					<article data-testid="related-card" class="rounded-lg bg-white/70 p-3">
						<h4 class="text-sm font-semibold text-gray-900">{item.bookmark.description}</h4>
						<p class="mt-1 text-xs text-gray-600">{item.explanation}</p>
						<a
							href={item.bookmark.href}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-2 inline-flex text-xs text-blue-600 hover:text-blue-800"
						>
							Open link →
						</a>
					</article>
				{/each}
			</div>
		</div>
	</aside>
{/if}
