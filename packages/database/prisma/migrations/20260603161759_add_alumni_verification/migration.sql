-- AlterTable
ALTER TABLE "alumni_profiles" ADD COLUMN     "alumni_card_url" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
