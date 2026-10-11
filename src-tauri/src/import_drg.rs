use std::collections::HashMap;
use std::path::Path;

use calamine::{open_workbook, Data, Reader, Xlsx};
use chrono::Utc;
use serde::Serialize;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub mdc: i64,
    pub adrg: i64,
    pub drg: i64,
    pub code_sets: i64,
    pub cc: i64,
    pub exclude_sets: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleVersionSummary {
    pub id: String,
    pub name: String,
    pub source_file: String,
    pub imported_at: String,
    pub counts: Counts,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MdcDto {
    pub code: String,
    pub name: String,
    pub rule_expr: String,
    pub sort: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdrgDto {
    pub code: String,
    pub name: String,
    pub rule_expr: String,
    pub mdc_code: String,
    pub sort: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrgDto {
    pub code: String,
    pub name: String,
    pub rule_expr: String,
    pub adrg_code: String,
    pub mdc_code: String,
    pub sort: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CcDto {
    pub code: String,
    pub name: String,
    pub kind: String,
    pub exclude_set: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RulePackDto {
    pub version_id: String,
    pub name: String,
    pub mdcs: Vec<MdcDto>,
    pub adrgs: Vec<AdrgDto>,
    pub drgs: Vec<DrgDto>,
    pub sets: HashMap<String, Vec<String>>,
    pub set_names: HashMap<String, HashMap<String, String>>,
    pub cc_by_code: HashMap<String, CcDto>,
    pub exclude_sets: HashMap<String, Vec<String>>,
}

struct SheetTable {
    headers: HashMap<String, usize>,
    rows: Vec<Vec<Data>>,
}

pub async fn import_drg_xlsx(path: &Path, pool: &SqlitePool) -> Result<RuleVersionSummary, AppError> {
    let source_file = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown.xlsx")
        .to_string();

    let mut workbook: Xlsx<_> = open_workbook(path)?;

    let mdc_rows = parse_mdc(&mut workbook)?;
    let adrg_rows = parse_adrg(&mut workbook)?;
    let drg_rows = parse_drg(&mut workbook)?;
    let code_set_rows = parse_code_sets(&mut workbook)?;
    let cc_rows = parse_cc(&mut workbook)?;
    let exclude_rows = parse_exclude_sets(&mut workbook)?;

    let id = Uuid::new_v4().to_string();
    let name = "CHS-DRG 3.0（国家版）".to_string();
    let imported_at = Utc::now().to_rfc3339();

    let mut tx = pool.begin().await?;

    sqlx::query("UPDATE rule_versions SET is_active = 0 WHERE is_active != 0")
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO rule_versions (id, name, kind, source_file, imported_at, is_active)
        VALUES (?1, ?2, 'drg', ?3, ?4, 1)
        "#,
    )
    .bind(&id)
    .bind(&name)
    .bind(&source_file)
    .bind(&imported_at)
    .execute(&mut *tx)
    .await?;

    insert_mdc(&mut tx, &id, &mdc_rows).await?;
    insert_adrg(&mut tx, &id, &adrg_rows).await?;
    insert_drg(&mut tx, &id, &drg_rows).await?;
    insert_code_sets(&mut tx, &id, &code_set_rows).await?;
    insert_cc(&mut tx, &id, &cc_rows).await?;
    insert_exclude_sets(&mut tx, &id, &exclude_rows).await?;

    tx.commit().await?;

    Ok(RuleVersionSummary {
        id,
        name,
        source_file,
        imported_at,
        counts: Counts {
            mdc: mdc_rows.len() as i64,
            adrg: adrg_rows.len() as i64,
            drg: drg_rows.len() as i64,
            code_sets: code_set_rows.len() as i64,
            cc: cc_rows.len() as i64,
            exclude_sets: exclude_rows.len() as i64,
        },
    })
}

pub async fn load_active_summary(pool: &SqlitePool) -> Result<Option<RuleVersionSummary>, AppError> {
    let row = sqlx::query_as::<_, (String, String, String, String)>(
        r#"
        SELECT id, name, source_file, imported_at
        FROM rule_versions
        WHERE is_active = 1
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?;

    let Some((id, name, source_file, imported_at)) = row else {
        return Ok(None);
    };

    let counts = count_tables(pool, &id).await?;
    Ok(Some(RuleVersionSummary {
        id,
        name,
        source_file,
        imported_at,
        counts,
    }))
}

pub async fn fetch_rule_pack(pool: &SqlitePool) -> Result<RulePackDto, AppError> {
    let summary = load_active_summary(pool)
        .await?
        .ok_or_else(|| AppError::Message("当前没有活动规则版本".into()))?;

    let mdcs = sqlx::query_as::<_, (String, String, Option<String>, i32)>(
        r#"
        SELECT code, name, rule_expr, sort
        FROM mdc
        WHERE version_id = ?1
        ORDER BY sort, code
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(code, name, rule_expr, sort)| MdcDto {
        code,
        name,
        rule_expr: rule_expr.unwrap_or_default(),
        sort,
    })
    .collect();

    let adrgs = sqlx::query_as::<_, (String, String, Option<String>, String, i32)>(
        r#"
        SELECT code, name, rule_expr, mdc_code, sort
        FROM adrg
        WHERE version_id = ?1
        ORDER BY sort, code
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(code, name, rule_expr, mdc_code, sort)| AdrgDto {
        code,
        name,
        rule_expr: rule_expr.unwrap_or_default(),
        mdc_code,
        sort,
    })
    .collect();

    let drgs = sqlx::query_as::<_, (String, String, Option<String>, String, String, i32)>(
        r#"
        SELECT code, name, rule_expr, adrg_code, mdc_code, sort
        FROM drg
        WHERE version_id = ?1
        ORDER BY sort, code
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(code, name, rule_expr, adrg_code, mdc_code, sort)| DrgDto {
        code,
        name,
        rule_expr: rule_expr.unwrap_or_default(),
        adrg_code,
        mdc_code,
        sort,
    })
    .collect();

    let mut sets: HashMap<String, Vec<String>> = HashMap::new();
    let mut set_names: HashMap<String, HashMap<String, String>> = HashMap::new();
    let code_set_rows = sqlx::query_as::<_, (String, String, Option<String>)>(
        r#"
        SELECT set_id, icd_code, icd_name
        FROM code_sets
        WHERE version_id = ?1
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?;

    for (set_id, icd_code, icd_name) in code_set_rows {
        sets.entry(set_id.clone()).or_default().push(icd_code.clone());
        if let Some(n) = icd_name {
            set_names
                .entry(set_id)
                .or_default()
                .insert(icd_code, n);
        }
    }

    let mut cc_by_code: HashMap<String, CcDto> = HashMap::new();
    let cc_rows = sqlx::query_as::<_, (String, Option<String>, Option<String>, String)>(
        r#"
        SELECT icd_code, icd_name, exclude_set, kind
        FROM cc
        WHERE version_id = ?1
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?;

    for (icd_code, icd_name, exclude_set, kind) in cc_rows {
        cc_by_code.insert(
            icd_code.clone(),
            CcDto {
                code: icd_code,
                name: icd_name.unwrap_or_default(),
                kind,
                exclude_set: exclude_set.unwrap_or_default(),
            },
        );
    }

    // Virtual sets used by official DSL: `QTZD in MCC` / `QTZD in {MCC, CC}`
    let mut mcc_codes = Vec::new();
    let mut cc_codes = Vec::new();
    for (code, dto) in &cc_by_code {
        match dto.kind.as_str() {
            "MCC" => mcc_codes.push(code.clone()),
            "CC" => cc_codes.push(code.clone()),
            _ => {}
        }
    }
    sets.insert("MCC".to_string(), mcc_codes);
    sets.insert("CC".to_string(), cc_codes);

    let mut exclude_sets: HashMap<String, Vec<String>> = HashMap::new();
    let exclude_rows = sqlx::query_as::<_, (String, String)>(
        r#"
        SELECT set_id, icd_code
        FROM exclude_sets
        WHERE version_id = ?1
        "#,
    )
    .bind(&summary.id)
    .fetch_all(pool)
    .await?;

    for (set_id, icd_code) in exclude_rows {
        exclude_sets.entry(set_id).or_default().push(icd_code);
    }

    Ok(RulePackDto {
        version_id: summary.id,
        name: summary.name,
        mdcs,
        adrgs,
        drgs,
        sets,
        set_names,
        cc_by_code,
        exclude_sets,
    })
}

async fn count_tables(pool: &SqlitePool, version_id: &str) -> Result<Counts, AppError> {
    let mdc = count_one(pool, "mdc", version_id).await?;
    let adrg = count_one(pool, "adrg", version_id).await?;
    let drg = count_one(pool, "drg", version_id).await?;
    let code_sets = count_one(pool, "code_sets", version_id).await?;
    let cc = count_one(pool, "cc", version_id).await?;
    let exclude_sets = count_one(pool, "exclude_sets", version_id).await?;
    Ok(Counts {
        mdc,
        adrg,
        drg,
        code_sets,
        cc,
        exclude_sets,
    })
}

async fn count_one(pool: &SqlitePool, table: &str, version_id: &str) -> Result<i64, AppError> {
    let sql = format!("SELECT COUNT(*) FROM {table} WHERE version_id = ?1");
    let count: i64 = sqlx::query_scalar(&sql)
        .bind(version_id)
        .fetch_one(pool)
        .await?;
    Ok(count)
}

fn parse_mdc(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<MdcRow>, AppError> {
    let table = read_sheet_table(workbook, "MDC", &["MDC编码"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let code = cell_str(row, table.col("MDC编码")?);
        if should_skip_code(&code) {
            continue;
        }
        out.push(MdcRow {
            code,
            name: cell_str(row, table.col("MDC名称")?),
            rule_expr: clean_rule_expr(&cell_str(row, table.col("MDC规则")?)),
            sort: cell_i32(row, table.col("排序")?),
        });
    }
    Ok(out)
}

fn parse_adrg(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<AdrgRow>, AppError> {
    let table = read_sheet_table(workbook, "ADRG", &["ADRG编码"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let code = cell_str(row, table.col("ADRG编码")?);
        if should_skip_code(&code) {
            continue;
        }
        out.push(AdrgRow {
            code,
            name: cell_str(row, table.col("ADRG名称")?),
            rule_expr: clean_rule_expr(&cell_str(row, table.col("ADRG规则")?)),
            mdc_code: cell_str(row, table.col("所属MDC编码")?),
            sort: cell_i32(row, table.col("MDC内排序")?),
        });
    }
    Ok(out)
}

fn parse_drg(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<DrgRow>, AppError> {
    let table = read_sheet_table(workbook, "DRG", &["DRG"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let code = cell_str(row, table.col("DRG")?);
        if should_skip_code(&code) {
            continue;
        }
        out.push(DrgRow {
            code,
            name: cell_str(row, table.col("DRG名称")?),
            rule_expr: clean_rule_expr(&cell_str(row, table.col("DRG规则")?)),
            adrg_code: cell_str(row, table.col("所属ADRG编码")?),
            mdc_code: cell_str(row, table.col("所属MDC编码")?),
            sort: cell_i32(row, table.col("排序")?),
        });
    }
    Ok(out)
}

fn parse_code_sets(
    workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<CodeSetRow>, AppError> {
    let table = read_sheet_table(workbook, "集合", &["集合编号", "ICD编码"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let set_id = cell_str(row, table.col("集合编号")?);
        let icd_code = cell_str(row, table.col("ICD编码")?).to_uppercase();
        if set_id.is_empty() || should_skip_code(&icd_code) {
            continue;
        }
        out.push(CodeSetRow {
            set_id,
            icd_code,
            icd_name: cell_str(row, table.col("ICD名称")?),
            type_code: cell_str(row, table.col("类型编号")?),
        });
    }
    Ok(out)
}

fn parse_cc(workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>) -> Result<Vec<CcRow>, AppError> {
    let table = read_sheet_table(workbook, "CC", &["疾病编码"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let icd_code = cell_str(row, table.col("疾病编码")?).to_uppercase();
        if should_skip_code(&icd_code) {
            continue;
        }
        let kind = cell_str(row, table.col("类型")?).to_uppercase();
        if kind != "CC" && kind != "MCC" {
            continue;
        }
        out.push(CcRow {
            icd_code,
            icd_name: cell_str(row, table.col("疾病名称")?),
            exclude_set: cell_str(row, table.col("排除表")?),
            kind,
        });
    }
    Ok(out)
}

fn parse_exclude_sets(
    workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>,
) -> Result<Vec<ExcludeRow>, AppError> {
    let table = read_sheet_table(workbook, "排除表", &["集合编号", "ICD编码"])?;
    let mut out = Vec::new();
    for row in &table.rows {
        let set_id = cell_str(row, table.col("集合编号")?);
        let icd_code = cell_str(row, table.col("ICD编码")?).to_uppercase();
        if set_id.is_empty() || should_skip_code(&icd_code) {
            continue;
        }
        out.push(ExcludeRow {
            set_id,
            icd_code,
            icd_name: cell_str(row, table.col("ICD名称")?),
        });
    }
    Ok(out)
}

fn read_sheet_table(
    workbook: &mut Xlsx<std::io::BufReader<std::fs::File>>,
    sheet: &str,
    required_headers: &[&str],
) -> Result<SheetTable, AppError> {
    let range = workbook
        .worksheet_range(sheet)
        .map_err(|e| AppError::Excel(format!("sheet `{sheet}`: {e}")))?;

    let mut header_row_idx = None;
    let mut headers = HashMap::new();

    for (idx, row) in range.rows().enumerate() {
        let mut map = HashMap::new();
        for (col, cell) in row.iter().enumerate() {
            let name = data_to_string(cell).trim().to_string();
            if !name.is_empty() {
                map.insert(name, col);
            }
        }
        if required_headers.iter().all(|h| map.contains_key(*h)) {
            header_row_idx = Some(idx);
            headers = map;
            break;
        }
    }

    let header_row_idx = header_row_idx.ok_or_else(|| {
        AppError::Excel(format!(
            "sheet `{sheet}` 未找到表头（需要: {}）",
            required_headers.join("/")
        ))
    })?;

    let rows = range
        .rows()
        .skip(header_row_idx + 1)
        .map(|r| r.to_vec())
        .filter(|r| r.iter().any(|c| !matches!(c, Data::Empty)))
        .collect();

    Ok(SheetTable { headers, rows })
}

impl SheetTable {
    fn col(&self, name: &str) -> Result<usize, AppError> {
        self.headers
            .get(name)
            .copied()
            .ok_or_else(|| AppError::Excel(format!("缺少列: {name}")))
    }
}

fn should_skip_code(code: &str) -> bool {
    let t = code.trim();
    t.is_empty() || t == "000" || t == "0000"
}

/// Strip Excel XML artifacts and CR from rule expressions.
fn clean_rule_expr(s: &str) -> String {
    s.replace("_x000D_", "").replace('\r', "")
}

fn cell_str(row: &[Data], idx: usize) -> String {
    row.get(idx).map(data_to_string).unwrap_or_default().trim().to_string()
}

fn cell_i32(row: &[Data], idx: usize) -> i32 {
    let raw = cell_str(row, idx);
    if raw.is_empty() {
        return 0;
    }
    raw.parse::<f64>()
        .ok()
        .map(|v| v as i32)
        .or_else(|| raw.parse::<i32>().ok())
        .unwrap_or(0)
}

fn data_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => {
            if f.fract() == 0.0 {
                format!("{}", *f as i64)
            } else {
                f.to_string()
            }
        }
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        Data::DateTime(dt) => dt.to_string(),
        Data::DateTimeIso(s) | Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("{e:?}"),
    }
}

struct MdcRow {
    code: String,
    name: String,
    rule_expr: String,
    sort: i32,
}

struct AdrgRow {
    code: String,
    name: String,
    rule_expr: String,
    mdc_code: String,
    sort: i32,
}

struct DrgRow {
    code: String,
    name: String,
    rule_expr: String,
    adrg_code: String,
    mdc_code: String,
    sort: i32,
}

struct CodeSetRow {
    set_id: String,
    icd_code: String,
    icd_name: String,
    type_code: String,
}

struct CcRow {
    icd_code: String,
    icd_name: String,
    exclude_set: String,
    kind: String,
}

struct ExcludeRow {
    set_id: String,
    icd_code: String,
    icd_name: String,
}

const BATCH: usize = 400;

async fn insert_mdc(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[MdcRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            "INSERT INTO mdc (version_id, code, name, rule_expr, sort) ",
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.code)
                .push_bind(&row.name)
                .push_bind(empty_to_none(&row.rule_expr))
                .push_bind(row.sort);
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

async fn insert_adrg(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[AdrgRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            "INSERT INTO adrg (version_id, code, name, rule_expr, mdc_code, sort) ",
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.code)
                .push_bind(&row.name)
                .push_bind(empty_to_none(&row.rule_expr))
                .push_bind(&row.mdc_code)
                .push_bind(row.sort);
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

async fn insert_drg(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[DrgRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            "INSERT INTO drg (version_id, code, name, rule_expr, adrg_code, mdc_code, sort) ",
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.code)
                .push_bind(&row.name)
                .push_bind(empty_to_none(&row.rule_expr))
                .push_bind(&row.adrg_code)
                .push_bind(&row.mdc_code)
                .push_bind(row.sort);
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

async fn insert_code_sets(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[CodeSetRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            r#"INSERT INTO code_sets (version_id, set_id, icd_code, icd_name, "type") "#,
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.set_id)
                .push_bind(&row.icd_code)
                .push_bind(empty_to_none(&row.icd_name))
                .push_bind(empty_to_none(&row.type_code));
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

async fn insert_cc(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[CcRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            "INSERT INTO cc (version_id, icd_code, icd_name, exclude_set, kind) ",
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.icd_code)
                .push_bind(empty_to_none(&row.icd_name))
                .push_bind(empty_to_none(&row.exclude_set))
                .push_bind(&row.kind);
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

async fn insert_exclude_sets(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    version_id: &str,
    rows: &[ExcludeRow],
) -> Result<(), AppError> {
    for chunk in rows.chunks(BATCH) {
        let mut qb = QueryBuilder::<Sqlite>::new(
            "INSERT INTO exclude_sets (version_id, set_id, icd_code, icd_name) ",
        );
        qb.push_values(chunk, |mut b, row| {
            b.push_bind(version_id)
                .push_bind(&row.set_id)
                .push_bind(&row.icd_code)
                .push_bind(empty_to_none(&row.icd_name));
        });
        qb.build().execute(&mut **tx).await?;
    }
    Ok(())
}

fn empty_to_none(s: &str) -> Option<&str> {
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_pool_at;
    use std::time::Instant;

    #[tokio::test]
    async fn imports_official_fixture_counts() {
        let xlsx = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/rules/chs-drg-3.0.xlsx");
        assert!(xlsx.exists(), "missing fixture: {}", xlsx.display());

        let dir = std::env::temp_dir().join(format!("drgdip-import-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("rules.db");

        let started = Instant::now();
        let pool = init_pool_at(&db_path).await.expect("init pool");
        let summary = import_drg_xlsx(&xlsx, &pool).await.expect("import");
        let elapsed = started.elapsed();

        println!(
            "import counts: mdc={} adrg={} drg={} code_sets={} cc={} exclude_sets={} elapsed={elapsed:?}",
            summary.counts.mdc,
            summary.counts.adrg,
            summary.counts.drg,
            summary.counts.code_sets,
            summary.counts.cc,
            summary.counts.exclude_sets
        );

        assert!(summary.counts.adrg > 500, "adrg={}", summary.counts.adrg);
        assert!(summary.counts.drg > 800, "drg={}", summary.counts.drg);
        assert!(
            summary.counts.code_sets > 50_000,
            "code_sets={}",
            summary.counts.code_sets
        );
        assert!(summary.counts.cc > 5_000, "cc={}", summary.counts.cc);

        let op_fm3: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT COUNT(*)
            FROM code_sets
            WHERE version_id = ?1 AND set_id = 'OP_FM3'
            "#,
        )
        .bind(&summary.id)
        .fetch_optional(&pool)
        .await
        .expect("query OP_FM3");

        let n = op_fm3.map(|r| r.0).unwrap_or(0);
        assert!(n > 0, "OP_FM3 should be non-empty");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
