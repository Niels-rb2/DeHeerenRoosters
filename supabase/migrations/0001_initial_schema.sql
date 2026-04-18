-- ════════════════════════════════════════════════════════════════════════════
-- Café De Heeren — Weekrooster
-- Initial schema — alle tabellen geprefixed met `rooster_` om te co-existeren
-- met de bestaande Kanban Board tabellen (threads, private_event_requests, …)
-- in dezelfde Supabase-instantie.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── EMPLOYEES ───────────────────────────────────────────────────────────────
-- Dit is tegelijkertijd de e-mail whitelist voor Google OAuth.
CREATE TABLE IF NOT EXISTS rooster_employees (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  is_admin   BOOLEAN NOT NULL DEFAULT false,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: Suzan als enige admin. Medewerkers voegt ze zelf toe via de admin UI.
INSERT INTO rooster_employees (name, email, is_admin)
VALUES ('Suzan', 'info@cafedeheeren.nl', true)
ON CONFLICT (email) DO NOTHING;

-- ─── DEFAULT PATTERNS ────────────────────────────────────────────────────────
-- Vast weekpatroon per medewerker (bijv. "Lisa: wo+do 16:00–23:00").
-- day_of_week: 0=ma, 1=di, 2=wo, 3=do, 4=vr, 5=za, 6=zo (ISO-8601 Monday=0 conventie).
-- end_time NULL = "tot sluit" (valt samen met sluitingstijd van die dag).
CREATE TABLE IF NOT EXISTS rooster_default_patterns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, day_of_week)
);

-- ─── SCHEDULES ───────────────────────────────────────────────────────────────
-- Weekrooster = container voor shifts + dag-overrides voor een specifieke week.
-- week_start is altijd de maandag van de betreffende week.
CREATE TABLE IF NOT EXISTS rooster_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start   DATE NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_by   UUID REFERENCES rooster_employees(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SHIFTS ──────────────────────────────────────────────────────────────────
-- Individuele shift per medewerker per dag binnen een rooster.
-- end_time NULL = "tot sluit".
-- is_day_off = true betekent: deze medewerker is deze dag vrij (zichtbaar in UI
-- zodat Suzan in één oogopslag ziet wie NIET werkt) — start_time/end_time mogen
-- dan NULL zijn.
CREATE TABLE IF NOT EXISTS rooster_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id  UUID NOT NULL REFERENCES rooster_schedules(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  is_day_off   BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, employee_id, date)
);

-- ─── DAY OVERRIDES ───────────────────────────────────────────────────────────
-- Afwijkingen per dag: sluiting, aangepaste openingstijden, dagnotitie.
CREATE TABLE IF NOT EXISTS rooster_day_overrides (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id       UUID NOT NULL REFERENCES rooster_schedules(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  is_closed         BOOLEAN NOT NULL DEFAULT false,
  custom_open_time  TIME,
  custom_close_time TIME,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, date)
);

-- ─── LEAVE REQUESTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooster_leave_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES rooster_employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SWAP REQUESTS ───────────────────────────────────────────────────────────
-- Drietrapsflow: pending_target → pending_admin → approved/rejected.
CREATE TABLE IF NOT EXISTS rooster_swap_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id       UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  requester_shift_id UUID NOT NULL REFERENCES rooster_shifts(id) ON DELETE CASCADE,
  target_id          UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  target_shift_id    UUID REFERENCES rooster_shifts(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending_target'
                       CHECK (status IN ('pending_target', 'pending_admin', 'approved', 'rejected')),
  target_accepted_at TIMESTAMPTZ,
  reviewed_by        UUID REFERENCES rooster_employees(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EVENT KEYWORDS ──────────────────────────────────────────────────────────
-- Whitelist van termen om in Google Calendar items te herkennen als relevant.
CREATE TABLE IF NOT EXISTS rooster_event_keywords (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword    TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rooster_event_keywords (keyword) VALUES
  ('pubquiz'), ('quiz'), ('karaoke'), ('live muziek'), ('dj'), ('voetbal'), ('wk'), ('ek')
ON CONFLICT (keyword) DO NOTHING;

-- ─── PUSH SUBSCRIPTIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooster_push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES rooster_employees(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooster_shifts_schedule   ON rooster_shifts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rooster_shifts_employee   ON rooster_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_rooster_shifts_date       ON rooster_shifts(date);
CREATE INDEX IF NOT EXISTS idx_rooster_overrides_sched   ON rooster_day_overrides(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rooster_leave_status      ON rooster_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_rooster_leave_employee    ON rooster_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_rooster_swap_status       ON rooster_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_rooster_patterns_emp      ON rooster_default_patterns(employee_id);
CREATE INDEX IF NOT EXISTS idx_rooster_push_employee     ON rooster_push_subscriptions(employee_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- API-routes gebruiken de service role key, vergelijkbaar met het Kanban Board
-- project. RLS aan zodat de anon key geen leesrechten heeft.
ALTER TABLE rooster_employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_default_patterns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_shifts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_day_overrides      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_leave_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_swap_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_event_keywords     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooster_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ─── UPDATED_AT trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rooster_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'rooster_employees',
    'rooster_default_patterns',
    'rooster_schedules',
    'rooster_shifts',
    'rooster_day_overrides',
    'rooster_leave_requests',
    'rooster_swap_requests'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_updated_at ON %I;
       CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION rooster_update_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
