-- AlterTable: add AI provider/model/token fields to ai_settings
ALTER TABLE "ai_settings"
  ADD COLUMN "ai_provider"    TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN "ai_model"       TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  ADD COLUMN "api_token"      TEXT,
  ADD COLUMN "ollama_base_url" TEXT DEFAULT 'http://localhost:11434';
