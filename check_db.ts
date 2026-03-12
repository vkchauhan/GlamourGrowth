import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'glamour_growth.db');
const db = new Database(dbPath);

console.log("Tables:");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

for (const table of tables) {
    const name = (table as any).name;
    console.log(`\nSchema for ${name}:`);
    const schema = db.prepare(`PRAGMA table_info(${name})`).all();
    console.log(schema);
    
    console.log(`\nContent for ${name}:`);
    const content = db.prepare(`SELECT * FROM ${name} LIMIT 5`).all();
    console.log(content);
}

console.log("\nTesting insertion...");
try {
    const booking_id = 'test-id-' + Date.now();
    db.prepare(`
        INSERT INTO bookings (booking_id, client_name, client_phone, booking_date, total_amount, service_id, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(booking_id, 'Test Client', '1234567890', '2026-03-12', 1000, 'makeup_id', 1000);
    console.log("Insertion into bookings successful");

    db.prepare(`
        INSERT INTO booking_services (booking_service_id, booking_id, service_id, service_price)
        VALUES (?, ?, ?, ?)
    `).run('test-bs-id-' + Date.now(), booking_id, 'makeup_id', 1000);
    console.log("Insertion into booking_services successful");

    db.prepare('DELETE FROM booking_services WHERE booking_id = ?').run(booking_id);
    db.prepare('DELETE FROM bookings WHERE booking_id = ?').run(booking_id);
    console.log("Cleanup successful");
} catch (error) {
    console.error("Test insertion failed:", error);
}
