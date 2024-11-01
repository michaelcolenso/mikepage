// src/routes/api/bookmarks/+server.js
import { json } from '@sveltejs/kit';
import fs from 'fs/promises';

export async function GET({ url }) {
    try {
        const chunk = parseInt(url.searchParams.get('chunk')) || 0;
        const size = parseInt(url.searchParams.get('size')) || 100;
        
        const fileContent = await fs.readFile('src/data/filtered_bookmarks.json', 'utf-8');
        const allBookmarks = JSON.parse(fileContent);
        
        const start = chunk * size;
        const end = start + size;
        const bookmarks = allBookmarks.slice(start, end);
        
        return json({
            bookmarks,
            hasMore: end < allBookmarks.length,
            total: allBookmarks.length
        });
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to load bookmarks' }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}