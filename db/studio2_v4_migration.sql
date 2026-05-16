CREATE TABLE IF NOT EXISTS studio2_thread_state (
  thread_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studio2_character_state (
  thread_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_studio2_character_state_thread
  ON studio2_character_state(thread_id);

CREATE TABLE IF NOT EXISTS studio2_relationship_state (
  thread_id TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (thread_id, pair_key)
);

CREATE INDEX IF NOT EXISTS idx_studio2_relationship_state_thread
  ON studio2_relationship_state(thread_id);

CREATE TABLE IF NOT EXISTS studio2_reflection_patches (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio2_reflection_patches_thread
  ON studio2_reflection_patches(thread_id, created_at DESC);
