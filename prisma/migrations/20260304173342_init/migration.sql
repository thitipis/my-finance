-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('th', 'en');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('single', 'married_no_income', 'married_separate', 'married_joint');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('retirement', 'emergency_fund', 'investment', 'home_car', 'education', 'custom');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(255),
    "password_hash" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'free',
    "language" "Language" NOT NULL DEFAULT 'th',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_inputs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "filing_status" "FilingStatus" NOT NULL DEFAULT 'single',
    "annual_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "spouse_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withheld_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "provident_fund" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "social_security" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "num_children" INTEGER NOT NULL DEFAULT 0,
    "num_parents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_deduction_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "deduction_type_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_deduction_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "goal_type" "GoalType" NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "current_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "monthly_contribution" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "annual_return_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "target_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "life_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "health_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "parent_health_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "annuity_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "spouse_life_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_years" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "label_th" VARCHAR(50) NOT NULL,
    "label_en" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "min_income" DECIMAL(15,2) NOT NULL,
    "max_income" DECIMAL(15,2),
    "rate" DECIMAL(5,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_allowances" (
    "id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "self_amount" DECIMAL(15,2) NOT NULL,
    "spouse_amount" DECIMAL(15,2) NOT NULL,
    "child_amount_per_child" DECIMAL(15,2) NOT NULL,
    "parent_amount_per_parent" DECIMAL(15,2) NOT NULL,
    "max_parents" INTEGER NOT NULL DEFAULT 2,
    "expense_deduction_rate" DECIMAL(5,2) NOT NULL,
    "expense_deduction_max" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "personal_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deduction_types" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name_th" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "description_th" TEXT,
    "description_en" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "deduction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deduction_limits" (
    "id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "deduction_type_id" TEXT NOT NULL,
    "max_amount" DECIMAL(15,2),
    "max_rate_of_income" DECIMAL(5,2),
    "combined_cap_group" VARCHAR(50),
    "combined_cap_amount" DECIMAL(15,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "deduction_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "free_enabled" BOOLEAN NOT NULL DEFAULT false,
    "premium_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tax_inputs_user_id_tax_year_id_key" ON "tax_inputs"("user_id", "tax_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_deduction_entries_user_id_tax_year_id_deduction_type_id_key" ON "tax_deduction_entries"("user_id", "tax_year_id", "deduction_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_data_user_id_key" ON "insurance_data"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_years_year_key" ON "tax_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "personal_allowances_tax_year_id_key" ON "personal_allowances"("tax_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "deduction_types_code_key" ON "deduction_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "deduction_limits_tax_year_id_deduction_type_id_key" ON "deduction_limits"("tax_year_id", "deduction_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "tax_inputs" ADD CONSTRAINT "tax_inputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_inputs" ADD CONSTRAINT "tax_inputs_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deduction_entries" ADD CONSTRAINT "tax_deduction_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deduction_entries" ADD CONSTRAINT "tax_deduction_entries_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_deduction_entries" ADD CONSTRAINT "tax_deduction_entries_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_data" ADD CONSTRAINT "insurance_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_allowances" ADD CONSTRAINT "personal_allowances_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deduction_limits" ADD CONSTRAINT "deduction_limits_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deduction_limits" ADD CONSTRAINT "deduction_limits_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
