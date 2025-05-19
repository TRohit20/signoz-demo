import { json } from '@sveltejs/kit';

export async function GET() {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return json({
        message: 'Test API response',
        timestamp: new Date().toISOString(),
        data: {
            items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' }
            ]
        }
    });
} 