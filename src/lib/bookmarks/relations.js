const splitTags = (bookmark) => bookmark.tags.split(' ').filter(Boolean);

export function explainRelationship(selected, candidate) {
	const selectedTags = splitTags(selected);
	const shared = splitTags(candidate).filter((tag) => selectedTags.includes(tag));
	return shared.length
		? `Why this path: shared ${shared.slice(0, 3).join(', ')}.`
		: 'Why this path: adjacent themes with a weaker direct overlap.';
}

function scoreClosest(selectedTags, candidateTags) {
	const shared = candidateTags.filter((tag) => selectedTags.includes(tag));
	return shared.length / Math.max(selectedTags.length, candidateTags.length);
}

function scoreSurprising(selectedTags, candidateTags) {
	const shared = candidateTags.filter((tag) => selectedTags.includes(tag));
	return shared.length === 0 ? 0 : 1 / shared.length + shared.length / (candidateTags.length * 4);
}

export function buildRelatedBookmarks(selected, bookmarks, lens) {
	const selectedTags = splitTags(selected);

	const rows = bookmarks
		.filter((bookmark) => bookmark.hash !== selected.hash)
		.map((bookmark) => {
			const candidateTags = splitTags(bookmark);
			const shared = candidateTags.filter((tag) => selectedTags.includes(tag));
			const score =
				lens === 'surprising'
					? scoreSurprising(selectedTags, candidateTags)
					: scoreClosest(selectedTags, candidateTags);

			return {
				bookmark,
				score,
				family: shared[0] ?? candidateTags[0] ?? 'misc',
				explanation: explainRelationship(selected, bookmark)
			};
		})
		.filter((row) => row.score > 0);

	if (lens === 'family') {
		return rows.sort((a, b) => a.family.localeCompare(b.family) || b.score - a.score);
	}

	return rows.sort((a, b) => b.score - a.score);
}
