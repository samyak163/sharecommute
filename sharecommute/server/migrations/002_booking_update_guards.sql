-- Prevent a future code path from reactivating or enlarging a reservation
-- without the same capacity checks used during insertion.
CREATE TRIGGER booking_capacity_update_guard BEFORE UPDATE OF seats, status, ride_id, user_id ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM rides WHERE id = NEW.ride_id AND status = 'open' AND owner_id <> NEW.user_id
  ) THEN RAISE(ABORT, 'ride_unavailable') END;
  SELECT CASE WHEN NEW.seats > (
    SELECT capacity - 1 - seeded_passengers - COALESCE((
      SELECT SUM(seats) FROM bookings WHERE ride_id = NEW.ride_id AND status = 'confirmed' AND id <> OLD.id
    ), 0) FROM rides WHERE id = NEW.ride_id
  ) THEN RAISE(ABORT, 'not_enough_seats') END;
END;
