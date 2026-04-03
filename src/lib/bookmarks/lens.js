export const DEFAULT_LENS = 'closest';

export const LENS_OPTIONS = [
	{ id: 'closest', label: 'Closest', description: 'Strongest obvious relationships' },
	{ id: 'surprising', label: 'Surprising', description: 'Unexpected but defensible bridges' },
	{ id: 'family', label: 'By tag family', description: 'Grouped thematic branches' }
];

export function normalizeLens(value) {
	return LENS_OPTIONS.some((option) => option.id === value) ? value : DEFAULT_LENS;
}
