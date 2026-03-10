import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'glamour_growth.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    service_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_price REAL NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    booking_id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    booking_date TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    service_id TEXT, -- Backward compatibility
    price REAL,      -- Backward compatibility
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS booking_services (
    booking_service_id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    service_price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id)
  );
`);

// Seed initial services if empty
const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
if (servicesCount.count === 0) {
  const insertService = db.prepare('INSERT INTO services (service_id, name, default_price, category) VALUES (?, ?, ?, ?)');
  const initialServices = [
    { id: 'pedicure_id', name: 'Pedicure', price: 800, category: 'Nails' },
    { id: 'manicure_id', name: 'Manicure', price: 700, category: 'Nails' },
    { id: 'waxing_id', name: 'Waxing', price: 1200, category: 'Hair Removal' },
    { id: 'threading_id', name: 'Threading', price: 200, category: 'Hair Removal' },
    { id: 'makeup_id', name: 'Party Makeup', price: 2500, category: 'Makeup' },
    { id: 'bridal_makeup_id', name: 'Bridal Makeup', price: 15000, category: 'Makeup' },
  ];

  for (const s of initialServices) {
    insertService.run(s.id, s.name, s.price, s.category);
  }
}

export default db;
