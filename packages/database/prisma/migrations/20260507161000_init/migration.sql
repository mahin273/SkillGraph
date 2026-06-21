-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'professor', 'admin', 'alumni');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('requested', 'active', 'completed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "github_id" VARCHAR(50) NOT NULL,
    "github_handle" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "full_name" VARCHAR(200) NOT NULL,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "student_id_no" VARCHAR(50),
    "department_id" UUID,
    "university_id" UUID,
    "graduation_year" INTEGER,
    "bio" TEXT,
    "linkedin_url" TEXT,
    "portfolio_url" TEXT,
    "public_handle" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(20) NOT NULL,
    "country" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "university_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL DEFAULT 'github',
    "access_token_enc" TEXT NOT NULL,
    "token_scope" TEXT,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_projects" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "owner_id" UUID NOT NULL,
    "repo_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "is_capstone" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_collaborators" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "github_repo_id" BIGINT NOT NULL,
    "repo_name" VARCHAR(200) NOT NULL,
    "full_name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "language" VARCHAR(50),
    "stars_count" INTEGER NOT NULL DEFAULT 0,
    "is_fork" BOOLEAN NOT NULL DEFAULT false,
    "raw_readme_text" TEXT,
    "last_ingested_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_commits" (
    "id" UUID NOT NULL,
    "repo_id" UUID NOT NULL,
    "sha" VARCHAR(40) NOT NULL,
    "message" TEXT,
    "committed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "github_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color_hex" VARCHAR(7),
    "icon_name" VARCHAR(50),

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" UUID,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_roles" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "source" VARCHAR(100) NOT NULL DEFAULT 'LinkedIn + roadmap.sh curation',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_requirements" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "criticality" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "role_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_resources" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "url" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(100),
    "duration_hours" DOUBLE PRECISION,
    "is_university_approved" BOOLEAN NOT NULL DEFAULT false,
    "course_code" VARCHAR(20),
    "rating" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(100),
    "issued_date" DATE,
    "expiry_date" DATE,
    "credential_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_learning_paths" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "completion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missing_skills_json" JSONB,
    "roadmap_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_computed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_endorsements" (
    "id" UUID NOT NULL,
    "endorser_id" UUID NOT NULL,
    "endorsed_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_requests" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "required_skills" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_matches" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "matched_user" UUID NOT NULL,
    "match_score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100),
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_fairs" (
    "id" UUID NOT NULL,
    "university_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event_date" DATE NOT NULL,
    "location" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_fairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_fair_booths" (
    "id" UUID NOT NULL,
    "fair_id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "required_skills" JSONB NOT NULL,
    "hiring_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "booth_number" VARCHAR(10),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_fair_booths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "graduation_year" INTEGER,
    "current_company" VARCHAR(200),
    "current_role" VARCHAR(200),
    "years_experience" INTEGER,
    "mentoring_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "willing_to_mentor" BOOLEAN NOT NULL DEFAULT false,
    "linkedin_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_mentorships" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "alumni_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'requested',
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_mentorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_exports" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "role_id" UUID,
    "file_path" TEXT,
    "ats_score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_decay_audits" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "skill_name" VARCHAR(100) NOT NULL,
    "current_weight" DOUBLE PRECISION NOT NULL,
    "last_active_date" TIMESTAMPTZ(6) NOT NULL,
    "last_decayed_at" TIMESTAMPTZ(6),
    "is_dormant" BOOLEAN NOT NULL DEFAULT false,
    "decay_cycles" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_decay_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulated_paths" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "scenario_name" VARCHAR(200),
    "target_role_id" UUID,
    "hypothetical_skills" JSONB NOT NULL,
    "simulated_result" JSONB NOT NULL,
    "completion_delta" DOUBLE PRECISION,
    "weeks_saved" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulated_paths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_handle_key" ON "users"("github_handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_id_no_key" ON "student_profiles"("student_id_no");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_public_handle_key" ON "student_profiles"("public_handle");

-- CreateIndex
CREATE UNIQUE INDEX "project_collaborators_project_id_user_id_key" ON "project_collaborators"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_github_repo_id_key" ON "github_repositories"("github_repo_id");

-- CreateIndex
CREATE INDEX "github_repositories_user_id_idx" ON "github_repositories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_commits_sha_key" ON "github_commits"("sha");

-- CreateIndex
CREATE INDEX "github_commits_repo_id_idx" ON "github_commits"("repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "industry_roles_title_key" ON "industry_roles"("title");

-- CreateIndex
CREATE UNIQUE INDEX "role_requirements_role_id_skill_id_key" ON "role_requirements"("role_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_resources_url_key" ON "learning_resources"("url");

-- CreateIndex
CREATE UNIQUE INDEX "peer_endorsements_endorser_id_endorsed_id_skill_id_key" ON "peer_endorsements"("endorser_id", "endorsed_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_project_id_to_user_id_key" ON "project_invitations"("project_id", "to_user_id");

-- CreateIndex
CREATE INDEX "system_notifications_user_id_is_read_idx" ON "system_notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_user_id_key" ON "alumni_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_decay_audits_student_id_skill_name_key" ON "skill_decay_audits"("student_id", "skill_name");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_projects" ADD CONSTRAINT "academic_projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_projects" ADD CONSTRAINT "academic_projects_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "academic_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_commits" ADD CONSTRAINT "github_commits_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_requirements" ADD CONSTRAINT "role_requirements_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "industry_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_requirements" ADD CONSTRAINT "role_requirements_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_paths" ADD CONSTRAINT "student_learning_paths_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_paths" ADD CONSTRAINT "student_learning_paths_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "industry_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_endorsements" ADD CONSTRAINT "peer_endorsements_endorser_id_fkey" FOREIGN KEY ("endorser_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_endorsements" ADD CONSTRAINT "peer_endorsements_endorsed_id_fkey" FOREIGN KEY ("endorsed_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_endorsements" ADD CONSTRAINT "peer_endorsements_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "academic_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "team_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_matches" ADD CONSTRAINT "team_matches_matched_user_fkey" FOREIGN KEY ("matched_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "academic_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_fairs" ADD CONSTRAINT "career_fairs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_fair_booths" ADD CONSTRAINT "career_fair_booths_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "career_fairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_mentorships" ADD CONSTRAINT "alumni_mentorships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_mentorships" ADD CONSTRAINT "alumni_mentorships_alumni_id_fkey" FOREIGN KEY ("alumni_id") REFERENCES "alumni_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_mentorships" ADD CONSTRAINT "alumni_mentorships_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "industry_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_decay_audits" ADD CONSTRAINT "skill_decay_audits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulated_paths" ADD CONSTRAINT "simulated_paths_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulated_paths" ADD CONSTRAINT "simulated_paths_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "industry_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

