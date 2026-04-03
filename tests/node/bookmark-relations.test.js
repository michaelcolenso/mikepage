import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRelatedBookmarks, explainRelationship } from '../../src/lib/bookmarks/relations.js';

const fixtures = [
	{
		hash: 'a',
		description: 'Interface Notes',
		extended: 'Saved writing about interface systems.',
		href: 'https://example.com/a',
		tags: 'design interface notes'
	},
	{
		hash: 'b',
		description: 'Tool Catalog',
		extended: 'A list of design tools.',
		href: 'https://example.com/b',
		tags: 'design tools interface'
	},
	{
		hash: 'c',
		description: 'Ambient Computing',
		extended: 'Thoughts on calm software.',
		href: 'https://example.com/c',
		tags: 'ambient computing design'
	},
	{
		hash: 'd',
		description: 'Garden Journal',
		extended: 'Notes on gardens.',
		href: 'https://example.com/d',
		tags: 'garden nature'
	}
];

test('closest lens ranks strongest shared-tag matches first', () => {
	const related = buildRelatedBookmarks(fixtures[0], fixtures, 'closest');
	assert.equal(related[0].bookmark.hash, 'b');
	assert.equal(related[1].bookmark.hash, 'c');
});

test('surprising lens still returns explainable bridges', () => {
	const related = buildRelatedBookmarks(fixtures[0], fixtures, 'surprising');
	assert.equal(related[0].bookmark.hash, 'c');
	assert.match(related[0].explanation, /shared/i);
});

test('family lens groups results by primary family label', () => {
	const related = buildRelatedBookmarks(fixtures[0], fixtures, 'family');
	assert.equal(related[0].family, 'design');
});

test('relationship explanation names shared tags in plain language', () => {
	const text = explainRelationship(fixtures[0], fixtures[1]);
	assert.match(text, /design/i);
	assert.match(text, /interface/i);
});
