CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_index INTEGER NOT NULL DEFAULT -1
);

CREATE TABLE IF NOT EXISTS referral_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referral_index INTEGER NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO referral_state (id, last_index) VALUES (1, -1);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('title', 'MiniStream'),
  ('description', 'Selamat datang di MiniStream.'),
  ('video_type', 'mp4'),
  ('video_url', ''),
  ('referral_1', 'https://example.com/ref1'),
  ('referral_2', 'https://example.com/ref2'),
  ('referral_3', 'https://example.com/ref3');
