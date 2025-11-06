import { z } from 'zod';
import { SubmissionStatus } from './common';

// Submission schemas
export const CreateSubmissionSchema = z.object({
  projectId: z.string().cuid(),
  evidenceUrls: z.string().default("[]"),  // JSON array stored as string
  notes: z.string().max(1000).optional(),
});

export const UpdateSubmissionSchema = z.object({
  evidenceUrls: z.string().optional(),  // JSON array stored as string
  notes: z.string().max(1000).optional(),
});

export const SubmissionReviewSchema = z.object({
  status: z.nativeEnum(SubmissionStatus),
  score: z.number().int().min(0).max(100).optional(),
  feedback: z.string().max(1000).optional(),
});

export const SubmissionResponseSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
  status: z.nativeEnum(SubmissionStatus),
  score: z.number().int().nullable(),
  feedback: z.string().nullable(),
  evidenceUrls: z.string(),  // JSON array stored as string
  submittedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().nullable(),
  reviewedBy: z.string().cuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z.object({
    id: z.string().cuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
  }).optional(),
  project: z.object({
    id: z.string().cuid(),
    name: z.string(),
    category: z.string(),
    difficulty: z.string(),
  }).optional(),
});

export const SubmissionStatsSchema = z.object({
  total: z.number().int().min(0),
  pending: z.number().int().min(0),
  approved: z.number().int().min(0),
  rejected: z.number().int().min(0),
  approvalRate: z.number().min(0).max(100),
});

// Type exports
export type CreateSubmissionDto = z.infer<typeof CreateSubmissionSchema>;
export type UpdateSubmissionDto = z.infer<typeof UpdateSubmissionSchema>;
export type SubmissionReviewDto = z.infer<typeof SubmissionReviewSchema>;
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;
export type SubmissionStats = z.infer<typeof SubmissionStatsSchema>;