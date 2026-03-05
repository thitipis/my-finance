-- AlterTable
ALTER TABLE "financial_profiles" ADD COLUMN     "crypto_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "etf_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "foreign_stock_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gold_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "other_invest_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "thai_stock_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;
