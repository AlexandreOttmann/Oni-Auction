-- Oni — PostgreSQL schema bootstrap
-- Run once on first container start via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('ADMIN', 'BUYER', 'SELLER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lots
CREATE TABLE IF NOT EXISTS lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  starting_price  NUMERIC(12,2) NOT NULL,
  price_floor     NUMERIC(12,2),     -- Dutch auction: minimum price before no-winner close
  price_step      NUMERIC(12,2),     -- Dutch auction: price drop per round
  round_duration  INT,               -- Dutch auction: seconds per round
  seller_id       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auctions
CREATE TABLE IF NOT EXISTS auctions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('ENGLISH', 'DUTCH')),
  status       TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSING', 'CLOSED', 'SETTLED')),
  lot_id       UUID REFERENCES lots(id),
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bids (permanent record — written by bid-worker, not auction-api)
CREATE TABLE IF NOT EXISTS bids (
  id          UUID PRIMARY KEY,
  auction_id  UUID NOT NULL REFERENCES auctions(id),
  lot_id      UUID NOT NULL REFERENCES lots(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      NUMERIC(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'INVALID')),
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids (auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON bids (lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids (user_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions (status);
CREATE INDEX IF NOT EXISTS idx_auctions_starts_at ON auctions (starts_at);

-- Seed data for local dev
INSERT INTO users (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User',   'admin@oni.local',  'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', 'Acme Corp',    'buyer@oni.local',  'BUYER'),
  ('00000000-0000-0000-0000-000000000003', 'Parts Seller', 'seller@oni.local', 'SELLER')
ON CONFLICT DO NOTHING;
