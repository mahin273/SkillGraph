/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verification_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "email_verification_token_hash" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "google_id" VARCHAR(100),
ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "github_id" DROP NOT NULL,
ALTER COLUMN "github_handle" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
