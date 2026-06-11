-- Persist platform controls and mentorship checklist state.
CREATE TABLE "platform_configs" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "alumni_mentorships"
ADD COLUMN "milestones" JSONB;
