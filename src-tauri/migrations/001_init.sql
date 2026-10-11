CREATE TABLE IF NOT EXISTS rule_versions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    source_file TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mdc (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_expr TEXT,
    sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adrg (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_expr TEXT,
    mdc_code TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS drg (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    rule_expr TEXT,
    adrg_code TEXT NOT NULL,
    mdc_code TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS code_sets (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    set_id TEXT NOT NULL,
    icd_code TEXT NOT NULL,
    icd_name TEXT,
    type TEXT
);

CREATE TABLE IF NOT EXISTS cc (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    icd_code TEXT NOT NULL,
    icd_name TEXT,
    exclude_set TEXT,
    kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exclude_sets (
    version_id TEXT NOT NULL REFERENCES rule_versions(id),
    set_id TEXT NOT NULL,
    icd_code TEXT NOT NULL,
    icd_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_code_sets_version_set
    ON code_sets (version_id, set_id);

CREATE INDEX IF NOT EXISTS idx_exclude_sets_version_set
    ON exclude_sets (version_id, set_id);

CREATE INDEX IF NOT EXISTS idx_cc_version_icd
    ON cc (version_id, icd_code);

CREATE INDEX IF NOT EXISTS idx_adrg_version_mdc
    ON adrg (version_id, mdc_code);
