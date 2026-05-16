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

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  kind TEXT,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  char_id TEXT,
  prompt_id TEXT,
  gallery_id TEXT,
  planner_id TEXT,
  campaign_id TEXT,
  overall REAL,
  drift INTEGER,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_events_subject ON review_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_review_events_char_id ON review_events(char_id);
CREATE INDEX IF NOT EXISTS idx_review_events_prompt_id ON review_events(prompt_id);
CREATE INDEX IF NOT EXISTS idx_review_events_gallery_id ON review_events(gallery_id);
CREATE INDEX IF NOT EXISTS idx_review_events_planner_id ON review_events(planner_id);
CREATE INDEX IF NOT EXISTS idx_review_events_campaign_id ON review_events(campaign_id);

CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  type TEXT,
  ts TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_logs_ts ON session_logs(ts DESC);

CREATE TABLE IF NOT EXISTS studio_pulse_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  pinned INTEGER NOT NULL DEFAULT 0,
  include_in_context INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_threads_status ON studio_pulse_threads(status);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_threads_updated_at ON studio_pulse_threads(updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_pulse_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  speaker_id TEXT,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  tone TEXT,
  delay_ms INTEGER DEFAULT 0,
  reply_to_id TEXT,
  emotional_state TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES studio_pulse_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_messages_thread_id ON studio_pulse_messages(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS studio_pulse_assets (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  workflow_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  preview_url TEXT,
  text_extract TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES studio_pulse_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_assets_thread_id ON studio_pulse_assets(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_assets_workflow_id ON studio_pulse_assets(workflow_id);

CREATE TABLE IF NOT EXISTS studio_pulse_workflows (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES studio_pulse_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_workflows_thread_id ON studio_pulse_workflows(thread_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_pulse_workflows_status ON studio_pulse_workflows(status);

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

CREATE TABLE IF NOT EXISTS provider_credentials (
  id TEXT PRIMARY KEY,
  provider_adapter TEXT NOT NULL,
  secret_type TEXT NOT NULL,
  label TEXT,
  encrypted_value TEXT NOT NULL,
  masked_value TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_adapter ON provider_credentials(provider_adapter);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_enabled ON provider_credentials(enabled);
