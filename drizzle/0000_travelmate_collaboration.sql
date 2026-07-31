CREATE TABLE IF NOT EXISTS shared_trips (
  id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  invite_role TEXT NOT NULL DEFAULT 'editor',
  travel_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collaboration_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  member_key_hash TEXT NOT NULL UNIQUE,
  joined_at TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES shared_trips(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collaboration_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES shared_trips(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS collaboration_members_trip_idx
  ON collaboration_members(trip_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS collaboration_events_trip_idx
  ON collaboration_events(trip_id, created_at DESC);
