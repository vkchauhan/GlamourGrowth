import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'glamour_growth.db');
const db = new Database(dbPath);

try {
  const bookings = db.prepare('SELECT * FROM bookings').all();
  console.log('Current bookings:', JSON.stringify(bookings, null, 2));
  
  const services = db.prepare('SELECT * FROM services').all();
  console.log('Available services:', JSON.stringify(services, null, 2));
  
  const bookingServices = db.prepare('SELECT * FROM booking_services').all();
  console.log('Booking services links:', JSON.stringify(bookingServices, null, 2));
} catch (error) {
  console.error('Error reading database:', error);
} finally {
  db.close();
}
