import { z } from 'zod';
import { TimeRangeSchema } from './common';

// Leaderboard schemas
export const LeaderboardEntrySchema = z.object({
  userId: z.string().cuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  totalScore: z.number().min(0),
  totalSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  averageScore: z.number().min(0),
  rank: z.number().int().min(1),
  badges: z.number().int().min(0),
  lastSubmissionAt: z.string().datetime().nullable(),
});

export const LeaderboardStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  totalSubmissions: z.number().int().min(0),
  averageScore: z.number().min(0),
  topScore: z.number().min(0),
  lastUpdated: z.string().datetime(),
});

export const LeaderboardResponseSchema = z.object({
  data: z.array(LeaderboardEntrySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export const UserRankSchema = z.object({
  totalScore: z.number().min(0),
  totalSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  averageScore: z.number().min(0),
  rank: z.number().int().min(1),
});

export const TopPerformerSchema = z.object({
  userId: z.string().cuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  totalScore: z.number().min(0),
  totalSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  rank: z.number().int().min(1),
});

export const RecentActivitySchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  projectId: z.string().cuid(),
  score: z.number().int().min(0),
  reviewedAt: z.string().datetime(),
  user: z.object({
    id: z.string().cuid(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
  project: z.object({
    id: z.string().cuid(),
    name: z.string(),
    category: z.string(),
    difficulty: z.string(),
  }),
});

// Type exports
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardStats = z.infer<typeof LeaderboardStatsSchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type UserRank = z.infer<typeof UserRankSchema>;
export type TopPerformer = z.infer<typeof TopPerformerSchema>;
export type RecentActivity = z.infer<typeof RecentActivitySchema>;