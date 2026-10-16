CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty')),
  verification TEXT NOT NULL CHECK (verification IN ('development', 'email', 'sample')),
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  suspended INTEGER NOT NULL DEFAULT 0 CHECK (suspended IN (0, 1)),
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE login_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty')),
  code_hash TEXT NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('development', 'email')),
  requested_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
  ip TEXT NOT NULL
);
CREATE INDEX idx_challenges_email_requested ON login_challenges(email, requested_at);
CREATE INDEX idx_challenges_ip_requested ON login_challenges(ip, requested_at);

CREATE TABLE rides (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL CHECK (destination <> origin),
  departure TEXT NOT NULL,
  departure_ms INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carpool', 'cab', 'bike')),
  vehicle TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 7),
  seeded_passengers INTEGER NOT NULL DEFAULT 0 CHECK (seeded_passengers >= 0 AND seeded_passengers < capacity),
  total_paise INTEGER NOT NULL CHECK (total_paise BETWEEN 0 AND 500000),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
  sample INTEGER NOT NULL DEFAULT 0 CHECK (sample IN (0, 1)),
  created_at INTEGER NOT NULL,
  CHECK ((type = 'bike' AND capacity = 2) OR (type = 'carpool' AND capacity <= 5) OR type = 'cab')
);
CREATE INDEX idx_rides_route_departure ON rides(origin, destination, departure_ms) WHERE status = 'open';
CREATE INDEX idx_rides_owner ON rides(owner_id, created_at);

CREATE TABLE bookings (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  ride_id TEXT NOT NULL REFERENCES rides(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  seats INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 6),
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  idempotency_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, idempotency_key)
);
CREATE UNIQUE INDEX idx_bookings_active_user_ride ON bookings(user_id, ride_id) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_ride_active ON bookings(ride_id, status);
CREATE INDEX idx_bookings_user ON bookings(user_id, seq);

-- The database independently protects the last seat, even if another writer
-- bypasses application validation. Cancellations release seats by changing status.
CREATE TRIGGER booking_capacity_guard BEFORE INSERT ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM rides WHERE id = NEW.ride_id AND status = 'open' AND owner_id <> NEW.user_id
  ) THEN RAISE(ABORT, 'ride_unavailable') END;
  SELECT CASE WHEN NEW.seats > (
    SELECT capacity - 1 - seeded_passengers - COALESCE((
      SELECT SUM(seats) FROM bookings WHERE ride_id = NEW.ride_id AND status = 'confirmed'
    ), 0) FROM rides WHERE id = NEW.ride_id
  ) THEN RAISE(ABORT, 'not_enough_seats') END;
END;
