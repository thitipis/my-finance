-- Add expected_return to portfolio_assets (annual % return per asset / type, e.g. 7.00 = 7%/year)
ALTER TABLE "portfolio_assets" ADD COLUMN IF NOT EXISTS "expected_return" DECIMAL(5,2);

-- Add debt_interest_rate to financial_profiles (weighted average annual interest rate on all debts)
ALTER TABLE "financial_profiles" ADD COLUMN IF NOT EXISTS "debt_interest_rate" DECIMAL(5,2) DEFAULT 0;
