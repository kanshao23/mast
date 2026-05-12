CREATE TABLE IF NOT EXISTS projects (
  path TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifecycle TEXT,
  intent TEXT,
  bet_level INTEGER,
  north_star TEXT,
  weekly_goal TEXT,
  external_block TEXT,
  multica_workspace_id TEXT,
  multica_project_id TEXT,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_activity (
  project_path TEXT NOT NULL,
  date TEXT NOT NULL,
  commits INTEGER DEFAULT 0,
  claude_sessions INTEGER DEFAULT 0,
  hours REAL DEFAULT 0,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  PRIMARY KEY (project_path, date)
);

CREATE TABLE IF NOT EXISTS health_snapshots (
  project_path TEXT NOT NULL,
  date TEXT NOT NULL,
  health_score REAL,
  velocity_trend TEXT,
  zombie_risk REAL,
  focus_area TEXT,
  PRIMARY KEY (project_path, date)
);

CREATE TABLE IF NOT EXISTS shipped_metrics (
  project_path TEXT NOT NULL,
  date TEXT NOT NULL,
  downloads INTEGER,
  mrr REAL,
  crashfree REAL,
  rating REAL,
  PRIMARY KEY (project_path, date)
);

CREATE TABLE IF NOT EXISTS multica_issues (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_path TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  labels TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  multica_issue_id TEXT,
  created_at TEXT NOT NULL,
  pushed_at TEXT
);

CREATE TABLE IF NOT EXISTS briefs (
  date TEXT PRIMARY KEY,
  markdown TEXT NOT NULL,
  generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingest_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  ran_at TEXT NOT NULL,
  ok INTEGER NOT NULL,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_date ON daily_activity(date);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON issue_drafts(status);
