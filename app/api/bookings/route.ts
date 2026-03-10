// Next.js App Router API Route
// Path: /app/api/bookings/route.ts

import db from '@/src/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Backward compatibility: Convert single service_id to services array
    let services = body.services;
    if (!services && body.service_id) {
      services = [{ 
        service_id: body.service_id, 
        price: body.price || 0 
      }];
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one service is required' }), { status: 400 });
    }

    const { client_name, client_phone, date } = body;
    const booking_id = uuidv4();
    
    // Calculate total amount
    const total_amount = services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);

    // Start transaction
    const transaction = db.transaction(() => {
      // 1. Insert into bookings table
      // We keep service_id and price for backward compatibility (using the first service)
      const firstService = services[0];
      db.prepare(`
        INSERT INTO bookings (booking_id, client_name, client_phone, booking_date, total_amount, service_id, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        booking_id, 
        client_name, 
        client_phone || null, 
        date, 
        total_amount, 
        firstService.service_id, 
        firstService.price
      );

      // 2. Insert into booking_services table
      const insertBookingService = db.prepare(`
        INSERT INTO booking_services (booking_service_id, booking_id, service_id, service_price)
        VALUES (?, ?, ?, ?)
      `);

      for (const s of services) {
        insertBookingService.run(uuidv4(), booking_id, s.service_id, s.price);
      }

      return booking_id;
    });

    const id = transaction();

    return new Response(JSON.stringify({
      success: true,
      booking_id: id,
      total_amount,
      message: 'Booking recorded successfully'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500 });
  }
}

export async function GET() {
  try {
    const bookings = db.prepare(`
      SELECT b.*, 
             (SELECT json_group_array(
                json_object(
                  'service_id', bs.service_id,
                  'name', s.name,
                  'price', bs.service_price
                )
              )
              FROM booking_services bs
              JOIN services s ON bs.service_id = s.service_id
              WHERE bs.booking_id = b.booking_id
             ) as services
      FROM bookings b
      ORDER BY b.booking_date DESC
    `).all();

    // Parse the JSON string returned by SQLite
    const formattedBookings = bookings.map((b: any) => ({
      ...b,
      services: JSON.parse(b.services)
    }));

    return new Response(JSON.stringify(formattedBookings), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch bookings' }), { status: 500 });
  }
}
