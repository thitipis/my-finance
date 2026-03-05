-- CreateTable
CREATE TABLE "financial_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_age" INTEGER,
    "marital_status" TEXT DEFAULT 'single',
    "num_children_plan" INTEGER DEFAULT 0,
    "retirement_age" INTEGER DEFAULT 60,
    "monthly_retirement_needs" DECIMAL(15,2),
    "has_home_goal" BOOLEAN NOT NULL DEFAULT false,
    "home_purchase_years" INTEGER,
    "home_budget" DECIMAL(15,2),
    "has_car_goal" BOOLEAN NOT NULL DEFAULT false,
    "car_purchase_years" INTEGER,
    "car_budget" DECIMAL(15,2),
    "has_education_goal" BOOLEAN NOT NULL DEFAULT false,
    "education_years" INTEGER,
    "education_budget" DECIMAL(15,2),
    "emergency_fund_months" INTEGER DEFAULT 6,
    "monthly_investable" DECIMAL(15,2),
    "current_savings" DECIMAL(15,2) DEFAULT 0,
    "expected_return" DECIMAL(5,2) DEFAULT 7,
    "inflation_rate" DECIMAL(5,2) DEFAULT 3,
    "target_wealth_override" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_plans_user_id_key" ON "financial_plans"("user_id");

-- AddForeignKey
ALTER TABLE "financial_plans" ADD CONSTRAINT "financial_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
