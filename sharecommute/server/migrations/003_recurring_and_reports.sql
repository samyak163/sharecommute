CREATE TABLE recurring_templates (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  ride_json TEXT NOT NULL,
  weekdays TEXT NOT NULL,
  local_time TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL CHECK (end_date >= start_date),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_templates_owner ON recurring_templates(owner_id, created_at);
ALTER TABLE rides ADD COLUMN template_id TEXT REFERENCES recurring_templates(id);
ALTER TABLE rides ADD COLUMN occurrence_date TEXT;
CREATE UNIQUE INDEX idx_rides_template_occurrence ON rides(template_id, occurrence_date) WHERE template_id IS NOT NULL;

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  ride_id TEXT NOT NULL REFERENCES rides(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE UNIQUE INDEX idx_reports_open_user_ride ON reports(reporter_id,ride_id) WHERE status = 'open';
CREATE INDEX idx_reports_status_created ON reports(status,created_at);
