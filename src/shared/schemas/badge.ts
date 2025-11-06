import { z } from 'zod';
import { ProjectDifficulty, ProjectCategory } from './common';

// Badge schemas
export const BadgeCriteriaSchema = z.object({
  type: z.enum(['submission_count', 'score_threshold', 'project_completion', 'streak', 'category_mastery']),
  value: z.number().int().min(1),
  projectId: z.string().cuid().optional(),
  category: z.nativeEnum(ProjectCategory).optional(),
  timeRange: z.enum(['week', 'month', 'all']).optional(),
});

export const CreateBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  category: z.nativeEnum(ProjectCategory).optional(),
  difficulty: z.nativeEnum(ProjectDifficulty).optional(),
  criteria: BadgeCriteriaSchema,
  isActive: z.boolean().default(true),
});

export const UpdateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  category: z.nativeEnum(ProjectCategory).optional(),
  difficulty: z.nativeEnum(ProjectDifficulty).optional(),
  criteria: BadgeCriteriaSchema.optional(),
  isActive: z.boolean().optional(),
});

export const AssignBadgeSchema = z.object({
  userId: z.string().cuid(),
  badgeId: z.string().cuid(),
});

export const BadgeResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  category: z.nativeEnum(ProjectCategory).nullable(),
  difficulty: z.nativeEnum(ProjectDifficulty).nullable(),
  criteria: z.record(z.any()),
  isActive: z.boolean(),
  tenantId: z.string().cuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({
    userBadges: z.number().int(),
  }).optional(),
});

export const UserBadgeResponseSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  badgeId: z.string().cuid(),
  tenantId: z.string().cuid(),
  earnedAt: z.string().datetime(),
  badge: BadgeResponseSchema,
});

export const BadgeProgressSchema = z.object({
  badgeId: z.string().cuid(),
  userId: z.string().cuid(),
  currentValue: z.number().int().min(0),
  targetValue: z.number().int().min(1),
  progress: z.number().min(0).max(100),
  isEarned: z.boolean(),
});

export const BadgeStatsSchema = z.object({
  totalBadges: z.number().int().min(0),
  totalAwards: z.number().int().min(0),
  averageAwardsPerBadge: z.number().min(0),
  mostEarnedBadge: BadgeResponseSchema.nullable(),
});

// Type exports
export type BadgeCriteria = z.infer<typeof BadgeCriteriaSchema>;
export type CreateBadgeDto = z.infer<typeof CreateBadgeSchema>;
export type UpdateBadgeDto = z.infer<typeof UpdateBadgeSchema>;
export type AssignBadgeDto = z.infer<typeof AssignBadgeSchema>;
export type BadgeResponse = z.infer<typeof BadgeResponseSchema>;
export type UserBadgeResponse = z.infer<typeof UserBadgeResponseSchema>;
export type BadgeProgress = z.infer<typeof BadgeProgressSchema>;
export type BadgeStats = z.infer<typeof BadgeStatsSchema>;