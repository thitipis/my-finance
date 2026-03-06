-- AlterTable: add new columns to portfolio_assets (all nullable for backwards compat)
ALTER TABLE "portfolio_assets"
  ADD COLUMN "asset_type"       TEXT,
  ADD COLUMN "ticker"           TEXT,
  ADD COLUMN "units"            DECIMAL(20,8),
  ADD COLUMN "avg_cost_per_unit" DECIMAL(15,4);

-- CreateIndex on portfolio_assets
CREATE INDEX "portfolio_assets_user_id_idx" ON "portfolio_assets"("user_id");
CREATE INDEX "portfolio_assets_asset_type_idx" ON "portfolio_assets"("asset_type");

-- CreateTable: instrument_catalog
CREATE TABLE "instrument_catalog" (
    "id"             TEXT NOT NULL,
    "asset_type"     TEXT NOT NULL,
    "ticker"         TEXT NOT NULL,
    "name_th"        TEXT,
    "name_en"        TEXT,
    "exchange"       TEXT,
    "provider"       TEXT,
    "sector"         TEXT,
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on instrument_catalog
CREATE UNIQUE INDEX "instrument_catalog_asset_type_ticker_key" ON "instrument_catalog"("asset_type", "ticker");
CREATE INDEX "instrument_catalog_asset_type_idx" ON "instrument_catalog"("asset_type");
CREATE INDEX "instrument_catalog_ticker_idx" ON "instrument_catalog"("ticker");
