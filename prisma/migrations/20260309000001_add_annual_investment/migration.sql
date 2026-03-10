-- AlterTable: add annual_investment column to portfolio_assets
ALTER TABLE "portfolio_assets" ADD COLUMN "annual_investment" DECIMAL(15,2);
