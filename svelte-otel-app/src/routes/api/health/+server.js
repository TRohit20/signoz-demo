import { json } from '@sveltejs/kit';

export async function GET() {

    const data = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Application is healthy'
    }
    console.log(json(data));
    // {"status":"healthy","timestamp":"2025-05-10T12:33:37.966Z","message":"Application is healthy"}
  return json(data);
} 