ALTER TABLE "insurance_data"
  ADD COLUMN IF NOT EXISTS "parent_health_coverage_per_year" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "annuity_coverage_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "spouse_life_coverage_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
