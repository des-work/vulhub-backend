-- Performance Optimization: Critical Database Indexes
-- This migration adds essential indexes for query performance

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_status 
ON "User"("tenantId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_tenant 
ON "User"("email", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_login 
ON "User"("lastLoginAt") WHERE "lastLoginAt" IS NOT NULL;

-- Submission table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_user_tenant 
ON "Submission"("userId", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_project_tenant 
ON "Submission"("projectId", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_status_tenant 
ON "Submission"("status", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_created_at 
ON "Submission"("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_reviewed_at 
ON "Submission"("reviewedAt") WHERE "reviewedAt" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_score 
ON "Submission"("score") WHERE "score" IS NOT NULL;

-- Project table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_tenant_active 
ON "Project"("tenantId", "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_category_tenant 
ON "Project"("category", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_difficulty_tenant 
ON "Project"("difficulty", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_public_active 
ON "Project"("isPublic", "isActive");

-- Badge table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badge_tenant_active 
ON "Badge"("tenantId", "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badge_category_tenant 
ON "Badge"("category", "tenantId");

-- UserBadge table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badge_user_tenant 
ON "UserBadge"("userId", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badge_badge_tenant 
ON "UserBadge"("badgeId", "tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badge_earned_at 
ON "UserBadge"("earnedAt");

-- Leaderboard table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_tenant_score 
ON "Leaderboard"("tenantId", "score" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_user_tenant 
ON "Leaderboard"("userId", "tenantId");

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_user_status_score 
ON "Submission"("userId", "status", "score") WHERE "status" = 'APPROVED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_tenant_status_created 
ON "Submission"("tenantId", "status", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_status_created 
ON "User"("tenantId", "status", "createdAt");

-- Partial indexes for specific use cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submission_approved_score 
ON "Submission"("score" DESC) WHERE "status" = 'APPROVED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active_tenant 
ON "User"("tenantId") WHERE "status" = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_active_public 
ON "Project"("tenantId") WHERE "isActive" = true AND "isPublic" = true;

-- Text search indexes (if using PostgreSQL full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_name_search 
ON "Project" USING gin(to_tsvector('english', "name"));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_description_search 
ON "Project" USING gin(to_tsvector('english', "description"));

-- Analyze tables after index creation
ANALYZE "User";
ANALYZE "Submission";
ANALYZE "Project";
ANALYZE "Badge";
ANALYZE "UserBadge";
ANALYZE "Leaderboard";
