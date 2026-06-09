-- CreateTable
CREATE TABLE "mentorship_messages" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorship_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentorship_messages_mentorship_id_created_at_idx" ON "mentorship_messages"("mentorship_id", "created_at");

-- CreateIndex
CREATE INDEX "mentorship_messages_sender_id_idx" ON "mentorship_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "mentorship_messages" ADD CONSTRAINT "mentorship_messages_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "alumni_mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_messages" ADD CONSTRAINT "mentorship_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
