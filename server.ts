import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/lib/db.ts';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(process.cwd(), 'server.log');
function logToFile(msg: string) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, entry);
  } catch (e) {
    console.error('Failed to write to log file', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Clear log file on start
  fs.writeFileSync(logFile, `Server started at ${new Date().toISOString()}\n`);

  // Request logging middleware
  app.use((req, res, next) => {
    logToFile(`${req.method} ${req.url} [Host: ${req.headers.host}] [User-Agent: ${req.headers['user-agent']}]`);
    next();
  });

  app.use(express.json());

  // API Routes
  app.get(['/api/services', '/api/services/'], (req, res) => {
    try {
      const services = db.prepare('SELECT * FROM services ORDER BY name ASC').all();
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  });

  app.get(['/api/bookings', '/api/bookings/'], (req, res) => {
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

      const formattedBookings = bookings.map((b: any) => ({
        ...b,
        services: JSON.parse(b.services)
      }));

      res.json(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.post(['/api/bookings', '/api/bookings/'], (req, res) => {
    try {
      const body = req.body;
      logToFile(`Incoming booking request: ${JSON.stringify(body)}`);
      
      let services = body.services;
      if (!services && body.service_id) {
        services = [{ 
          service_id: body.service_id, 
          price: body.price || 0 
        }];
      }

      if (!services || !Array.isArray(services) || services.length === 0) {
        console.error('Validation failed: No services provided');
        return res.status(400).json({ error: 'At least one service is required' });
      }

      const { client_name, client_phone, date } = body;
      if (!client_name) {
        console.error('Validation failed: Client name is required');
        return res.status(400).json({ error: 'Client name is required' });
      }

      const booking_id = uuidv4();
      const total_amount = services.reduce((sum, s) => sum + (s.price || 0), 0);

      const transaction = db.transaction(() => {
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
      logToFile(`Booking saved successfully: ${id}`);
      res.json({ success: true, booking_id: id, total_amount });
    } catch (error) {
      logToFile(`Error saving booking: ${error}`);
      console.error('Error saving booking:', error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/bookings/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM bookings WHERE booking_id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Catch-all for unmatched API routes
  app.all('/api/*', (req, res) => {
    logToFile(`Unmatched API request: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logToFile(`Unhandled error: ${err.message}\n${err.stack}`);
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
