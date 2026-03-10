// Next.js App Router API Route
// Path: /app/api/services/route.ts

import db from '@/src/lib/db';

export async function GET() {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY name ASC').all();
    return new Response(JSON.stringify(services), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch services' }), { status: 500 });
  }
}
