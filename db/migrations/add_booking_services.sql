-- Migration: Add booking_services table and update bookings table
-- Purpose: Support multiple services per booking

-- 1. Create services table if it doesn't exist (for reference)
CREATE TABLE IF NOT EXISTS services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Modify bookings table
-- We add total_amount and make service_id nullable for backward compatibility
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ALTER COLUMN service_id DROP NOT NULL;

-- 3. Create booking_services junction table
CREATE TABLE IF NOT EXISTS booking_services (
    booking_service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(service_id),
    service_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. (Optional) Data migration: Move existing single-service bookings to the junction table
-- This ensures old data is visible in the new multi-service UI
INSERT INTO booking_services (booking_id, service_id, service_price)
SELECT booking_id, service_id, price
FROM bookings
WHERE service_id IS NOT NULL;

-- 5. Update total_amount for existing bookings
UPDATE bookings
SET total_amount = (
    SELECT SUM(service_price)
    FROM booking_services
    WHERE booking_services.booking_id = bookings.booking_id
)
WHERE total_amount = 0;
