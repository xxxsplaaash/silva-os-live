PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS state_snapshots (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  title TEXT,
  char_id TEXT,
  campaign_id TEXT,
  prompt_text TEXT,
  saved INTEGER DEFAULT 0,
  tested INTEGER DEFAULT 0,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompts_char_id ON prompts(char_id);
CREATE INDEX IF NOT EXISTS idx_prompts_campaign_id ON prompts(campaign_id);

CREATE TABLE IF NOT EXISTS gallery_items (
  id TEXT PRIMARY KEY,
  title TEXT,
  char_id TEXT,
  campaign_id TEXT,
  prompt_id TEXT,
  img_src TEXT,
  provider TEXT,
  model TEXT,
  drift INTEGER DEFAULT 0,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gallery_char_id ON gallery_items(char_id);
CREATE INDEX IF NOT EXISTS idx_gallery_prompt_id ON gallery_items(prompt_id);
CREATE INDEX IF NOT EXISTS idx_gallery_campaign_id ON gallery_items(campaign_id);

CREATE TABLE IF NOT EXISTS planner_posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  char_id TEXT,
  campaign_id TEXT,
  prompt_id TEXT,
  scheduled_for TEXT,
  status TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_planner_char_id ON planner_posts(char_id);
CREATE INDEX IF NOT EXISTS idx_planner_prompt_id ON planner_posts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_planner_campaign_id ON planner_posts(campaign_id);

CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  type TEXT,
  ts TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_logs_ts ON session_logs(ts DESC);

CREATE TABLE IF NOT EXISTS character_state (
  character_id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationships (
  pair_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
