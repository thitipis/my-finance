# MyFinance — Database Schema

> **Version:** 1.0
> **Date:** March 4, 2026
> **Database:** PostgreSQL (via Supabase)
> **ORM:** Prisma

---

## Entity Relationship Overview

```
users
 ├── tax_inputs          (one user → many tax inputs, one per year)
 ├── goals               (one user → many financial goals)
 ├── insurance_data      (one user → one insurance profile)
 └── usage_events        (analytics, anonymous tracking)

tax_years
 ├── tax_brackets        (one year → many brackets)
 ├── personal_allowances (one year → one allowance set)
 └── deduction_limits    (one year → many deduction limits)

deduction_types          (master list, shared across years)
feature_flags            (global + per-tier feature toggles)
audit_log                (all admin config changes)
admin_users              (separate from regular users)
```

---

## Tables

### `users`
Regular app users.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `email` | `varchar(255)` UNIQUE NOT NULL | Login identifier |
| `password_hash` | `varchar(255)` NOT NULL | bcrypt |
| `tier` | `enum('free','premium')` | Default: `free` |
| `language` | `enum('th','en')` | Default: `th` |
| `created_at` | `timestamptz` | Default: now() |
| `updated_at` | `timestamptz` | Auto-updated |
| `last_login_at` | `timestamptz` | |

---

### `tax_inputs`
User's income and deduction data per tax year. One record per user per year.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `tax_year_id` | `uuid` FK → tax_years | |
| `filing_status` | `enum('single','married_no_income','married_separate','married_joint')` | |
| `annual_salary` | `numeric(15,2)` | |
| `bonus` | `numeric(15,2)` | Default: 0 |
| `other_income` | `numeric(15,2)` | Default: 0 |
| `spouse_income` | `numeric(15,2)` | Populated if married_joint |
| `withheld_tax` | `numeric(15,2)` | ภาษีหัก ณ ที่จ่าย |
| `provident_fund` | `numeric(15,2)` | |
| `social_security` | `numeric(15,2)` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Unique constraint:** `(user_id, tax_year_id)`

---

### `tax_deduction_entries`
User's entered deduction values per tax year (one row per deduction type per user per year).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `tax_year_id` | `uuid` FK → tax_years | |
| `deduction_type_id` | `uuid` FK → deduction_types | |
| `amount` | `numeric(15,2)` | User-entered amount |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Unique constraint:** `(user_id, tax_year_id, deduction_type_id)`

---

### `goals`
User financial goals.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `name` | `varchar(255)` NOT NULL | Custom label |
| `goal_type` | `enum('retirement','emergency_fund','investment','home_car','education','custom')` | |
| `target_amount` | `numeric(15,2)` NOT NULL | |
| `current_amount` | `numeric(15,2)` | Default: 0 |
| `monthly_contribution` | `numeric(15,2)` | |
| `annual_return_rate` | `numeric(5,2)` | e.g., 7.00 for 7% |
| `target_date` | `date` | |
| `is_active` | `boolean` | Default: true |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

---

### `insurance_data`
User's self-reported insurance coverage. One record per user.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | UNIQUE |
| `has_life_insurance` | `boolean` | Default: false |
| `life_coverage_amount` | `numeric(15,2)` | |
| `life_premium_annual` | `numeric(15,2)` | For tax deduction use |
| `has_health_insurance` | `boolean` | Default: false |
| `health_premium_annual` | `numeric(15,2)` | |
| `has_critical_illness` | `boolean` | Default: false |
| `has_accident_pa` | `boolean` | Default: false |
| `num_dependents` | `integer` | Default: 0 |
| `updated_at` | `timestamptz` | |

---

## Config Tables (Admin-managed, no code change needed)

### `tax_years`
Supported filing years.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `year` | `integer` UNIQUE NOT NULL | e.g., 2025 |
| `is_active` | `boolean` | Show/hide from users |
| `label_th` | `varchar(50)` | e.g., "ปีภาษี 2025" |
| `label_en` | `varchar(50)` | e.g., "Tax Year 2025" |
| `created_at` | `timestamptz` | |

---

### `tax_brackets`
Progressive income tax brackets per year.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tax_year_id` | `uuid` FK → tax_years | |
| `min_income` | `numeric(15,2)` NOT NULL | Inclusive lower bound |
| `max_income` | `numeric(15,2)` | NULL = no upper limit |
| `rate` | `numeric(5,2)` NOT NULL | e.g., 5.00 for 5% |
| `sort_order` | `integer` | For display ordering |

---

### `personal_allowances`
Standard allowances per year.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tax_year_id` | `uuid` FK → tax_years | UNIQUE |
| `self_amount` | `numeric(15,2)` | e.g., 60000 |
| `spouse_amount` | `numeric(15,2)` | e.g., 60000 |
| `child_amount_per_child` | `numeric(15,2)` | e.g., 30000 |
| `parent_amount_per_parent` | `numeric(15,2)` | e.g., 30000 |
| `max_parents` | `integer` | e.g., 2 |
| `expense_deduction_rate` | `numeric(5,2)` | e.g., 50.00 for 50% |
| `expense_deduction_max` | `numeric(15,2)` | e.g., 100000 |

---

### `deduction_types`
Master list of all deduction categories.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `varchar(50)` UNIQUE | e.g., `SSF`, `RMF`, `LIFE_INS` |
| `name_th` | `varchar(255)` | Thai name |
| `name_en` | `varchar(255)` | English name |
| `description_th` | `text` | |
| `description_en` | `text` | |
| `is_active` | `boolean` | Default: true |
| `sort_order` | `integer` | |

---

### `deduction_limits`
Per-year limits and caps for each deduction type.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tax_year_id` | `uuid` FK → tax_years | |
| `deduction_type_id` | `uuid` FK → deduction_types | |
| `max_amount` | `numeric(15,2)` | Absolute cap, NULL = no cap |
| `max_rate_of_income` | `numeric(5,2)` | % of taxable income cap |
| `combined_cap_group` | `varchar(50)` | e.g., `SSF_RMF_ESG` — shared pool cap |
| `combined_cap_amount` | `numeric(15,2)` | Max across the combined group |
| `is_active` | `boolean` | Default: true |

**Unique constraint:** `(tax_year_id, deduction_type_id)`

---

### `feature_flags`
Feature toggles per subscription tier — managed by admin.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `key` | `varchar(100)` UNIQUE NOT NULL | e.g., `ai_chat`, `ai_tips`, `ai_tax_optimize` |
| `description` | `text` | What this flag controls |
| `free_enabled` | `boolean` | Default: false |
| `premium_enabled` | `boolean` | Default: true |
| `updated_at` | `timestamptz` | |
| `updated_by` | `uuid` FK → admin_users | |

**Seed data:**
| key | free | premium |
|---|---|---|
| `ai_chat` | false | true |
| `ai_tips` | false | true |
| `ai_tax_optimize` | false | true |
| `ai_insurance_gap` | false | true |
| `ai_health_score_explain` | false | true |

---

## Admin & Audit Tables

### `admin_users`
Separate admin accounts, not linked to regular users.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `varchar(255)` UNIQUE NOT NULL | |
| `password_hash` | `varchar(255)` NOT NULL | |
| `name` | `varchar(255)` | |
| `is_active` | `boolean` | Default: true |
| `created_at` | `timestamptz` | |

---

### `audit_log`
Every admin config change is recorded here.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `admin_user_id` | `uuid` FK → admin_users | |
| `table_name` | `varchar(100)` | e.g., `tax_brackets` |
| `record_id` | `uuid` | The changed record |
| `action` | `enum('create','update','delete')` | |
| `old_values` | `jsonb` | Snapshot before change |
| `new_values` | `jsonb` | Snapshot after change |
| `created_at` | `timestamptz` | |

---

### `usage_events`
Anonymous analytics events — no PII stored.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `event_type` | `varchar(100)` | e.g., `tax_calculated`, `goal_created`, `ai_chat_used` |
| `metadata` | `jsonb` | Non-PII context (e.g., tax year, goal type) |
| `created_at` | `timestamptz` | |

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_tax_inputs_user_year     ON tax_inputs(user_id, tax_year_id);
CREATE INDEX idx_deduction_entries_user   ON tax_deduction_entries(user_id, tax_year_id);
CREATE INDEX idx_goals_user               ON goals(user_id) WHERE is_active = true;
CREATE INDEX idx_tax_brackets_year        ON tax_brackets(tax_year_id, min_income);
CREATE INDEX idx_deduction_limits_year    ON deduction_limits(tax_year_id);
CREATE INDEX idx_usage_events_user        ON usage_events(user_id, created_at);
CREATE INDEX idx_audit_log_admin          ON audit_log(admin_user_id, created_at);
```

---

## Notes

- All monetary values use `numeric(15,2)` — no floating point rounding errors
- `uuid` PKs throughout — safe for distributed systems and no ID enumeration attacks
- No PII beyond email stored — PDPA compliant by design
- All config tables are read-heavy / write-rare — safe to cache in application layer (Redis or in-memory) if needed later
