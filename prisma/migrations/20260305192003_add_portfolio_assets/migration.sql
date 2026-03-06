-- CreateTable
CREATE TABLE "portfolio_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'other',
    "emoji" TEXT NOT NULL DEFAULT '💰',
    "current_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_assets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
