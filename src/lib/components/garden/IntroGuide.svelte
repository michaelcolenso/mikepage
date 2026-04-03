<script>
	export let visible = true;
	export let onStart = () => {};
	export let onDismiss = () => {};
</script>

{#if visible}
	<section
		data-testid="intro-guide"
		class="absolute left-4 top-4 z-20 max-w-sm rounded-xl border border-white/20 bg-black/55 p-4 text-white backdrop-blur-sm"
	>
		<p class="text-xs uppercase tracking-[0.18em] text-green-200/90">Guided Canopy</p>
		<h1 class="mt-2 text-xl font-semibold">A garden of saved ideas.</h1>
		<p class="mt-2 text-sm text-gray-100">Pick a bloom to see what it leads to.</p>
		<div class="mt-4 flex gap-2">
			<button
				type="button"
				class="rounded-md bg-green-300 px-3 py-2 text-sm font-medium text-green-950 hover:bg-green-200"
				on:click={onStart}
			>
				Start from a bloom
			</button>
			<button
				type="button"
				class="rounded-md border border-white/25 px-3 py-2 text-sm text-white hover:bg-white/10"
				on:click={onDismiss}
			>
				Hide guide
			</button>
		</div>
	</section>
{/if}
