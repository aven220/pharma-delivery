-- AlterTable
ALTER TABLE "call_assignments" ADD COLUMN "dial_clicked_at" TIMESTAMP(3),
ADD COLUMN "dial_click_count" INTEGER NOT NULL DEFAULT 0;
