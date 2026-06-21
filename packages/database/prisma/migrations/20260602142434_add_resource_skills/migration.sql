-- CreateTable
CREATE TABLE "resource_skills" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "resource_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_resource_completions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_resource_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_skills_resource_id_skill_id_key" ON "resource_skills"("resource_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_resource_completions_student_id_resource_id_key" ON "student_resource_completions"("student_id", "resource_id");

-- AddForeignKey
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_resource_completions" ADD CONSTRAINT "student_resource_completions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_resource_completions" ADD CONSTRAINT "student_resource_completions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
