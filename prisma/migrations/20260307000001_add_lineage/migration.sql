-- CreateTable: life_stage_templates
CREATE TABLE "life_stage_templates" (
    "id" TEXT NOT NULL,
    "age_from" INTEGER NOT NULL,
    "age_to" INTEGER NOT NULL,
    "title_th" VARCHAR(100) NOT NULL,
    "description_th" TEXT NOT NULL,
    "icon" VARCHAR(10) NOT NULL,
    "alloc_equity" INTEGER NOT NULL DEFAULT 70,
    "alloc_bond" INTEGER NOT NULL DEFAULT 20,
    "alloc_cash" INTEGER NOT NULL DEFAULT 10,
    "color_hex" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_stage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lineage_events
CREATE TABLE "lineage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "event_year" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT 'neutral',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lineage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lineage_events_user_id_idx" ON "lineage_events"("user_id");

-- AddForeignKey
ALTER TABLE "lineage_events" ADD CONSTRAINT "lineage_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default life stage templates
INSERT INTO "life_stage_templates" ("id","age_from","age_to","title_th","description_th","icon","alloc_equity","alloc_bond","alloc_cash","color_hex","is_active","sort_order","created_at","updated_at") VALUES
  ('lst-1', 18, 25, 'วัยเริ่มต้น', 'ช่วงวัยสร้างรากฐานชีวิต เวลาของคุณยังมีมาก ลงทุนเชิงรุกเพื่อผลตอบแทนระยะยาว สร้างวินัยการออมและนิสัยการเงินที่ดีตั้งแต่ต้น', '🌱', 85, 10, 5, '#10b981', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lst-2', 26, 35, 'วัยสะสม', 'รายได้เพิ่มขึ้น อาจมีภาระครอบครัว ซื้อบ้าน แต่งงาน สะสมสินทรัพย์อย่างต่อเนื่อง ปกป้องครอบครัวด้วยประกันชีวิตและสุขภาพที่เหมาะสม', '🏗️', 75, 18, 7, '#6366f1', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lst-3', 36, 45, 'วัยรุ่งเรือง', 'รายได้สูงสุดในชีวิต โฟกัสที่การสะสมความมั่งคั่ง เร่งชำระหนี้ เพิ่มการลงทุนในกองทุนและหุ้น วางแผนการศึกษาบุตรและบำเหน็จบำนาญ', '🚀', 65, 25, 10, '#f59e0b', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lst-4', 46, 55, 'วัยเตรียมการ', 'เริ่มลดความเสี่ยงในพอร์ต เตรียมเงินบำนาญ วางแผนมรดก ดูแลสุขภาพให้มากขึ้น ตรวจสอบความคุ้มครองประกันสุขภาพ', '🎯', 50, 35, 15, '#f97316', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lst-5', 56, 65, 'วัยก่อนเกษียณ', 'ปรับพอร์ตเป็นอนุรักษ์นิยม ออมเงินบำนาญให้เต็มที่ในช่วงสุดท้าย วางแผนการถอนเงิน เตรียมมรดกสำหรับทายาทและคนที่คุณรัก', '🏖️', 35, 45, 20, '#ef4444', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lst-6', 66, 100, 'วัยเกษียณ', 'ถอนเงินจากสินทรัพย์อย่างระมัดระวัง เน้นรายได้ที่มั่นคงและสม่ำเสมอ วางแผนการส่งต่อมรดก สุขภาพและความสุขคือสิ่งสำคัญที่สุด', '🌅', 20, 50, 30, '#8b5cf6', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
