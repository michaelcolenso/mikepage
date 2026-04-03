<script>
	import { LENS_OPTIONS } from '$lib/bookmarks/lens.js';

	export let activeLens = 'closest';
	export let onChange = () => {};
</script>

<div class="absolute left-4 bottom-4 z-20 rounded-xl border border-white/20 bg-black/45 p-3 text-white backdrop-blur-sm">
	<p class="mb-2 text-xs uppercase tracking-[0.18em] text-green-200/90">Path lens</p>
	<div class="flex gap-2">
		{#each LENS_OPTIONS as option}
			<button
				type="button"
				class={`rounded-md px-3 py-1.5 text-sm transition-colors ${
					option.id === activeLens
						? 'bg-green-300 text-green-950'
						: 'bg-white/10 hover:bg-white/20'
				}`}
				data-testid={option.id === activeLens ? 'active-lens' : undefined}
				on:click={() => onChange(option.id)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>
