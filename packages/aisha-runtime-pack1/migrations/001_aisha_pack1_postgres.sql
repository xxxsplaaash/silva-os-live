CREATE TABLE IF NOT EXISTS aisha_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  state_snapshot_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_turns_session_turn
  ON aisha_turns(session_id, turn_index DESC);

CREATE TABLE IF NOT EXISTS aisha_state_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_snapshots_session_created
  ON aisha_state_snapshots(session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aisha_snapshots_turn
  ON aisha_state_snapshots(turn_id);

CREATE TABLE IF NOT EXISTS aisha_episodes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  start_turn_id TEXT NOT NULL,
  end_turn_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_episodes_session_updated
  ON aisha_episodes(session_id, COALESCE(updated_at, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_episodes_thread
  ON aisha_episodes(thread_id);

CREATE TABLE IF NOT EXISTS aisha_threads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  active_episode_id TEXT NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_threads_session
  ON aisha_threads(session_id);

CREATE TABLE IF NOT EXISTS aisha_notes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  subtype TEXT NOT NULL,
  status TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_speaker_id TEXT,
  subject_person_id TEXT,
  relationship_context_person_id TEXT,
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_notes_session_status
  ON aisha_notes(session_id, status, COALESCE(updated_at, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_notes_subject
  ON aisha_notes(session_id, subject_kind, subject_speaker_id, subject_person_id, relationship_context_person_id);

CREATE TABLE IF NOT EXISTS aisha_note_links (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_note_links_from_relation
  ON aisha_note_links(from_note_id, relation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_note_links_session
  ON aisha_note_links(session_id);
