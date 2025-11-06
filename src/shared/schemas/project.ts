import { z } from 'zod';
import { ProjectDifficulty, ProjectCategory } from './common';

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  vulhubId: z.string().optional(),
  category: z.nativeEnum(ProjectCategory),
  difficulty: z.nativeEnum(ProjectDifficulty),
  points: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  tags: z.string().default("[]"),  // JSON array stored as string
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(ProjectCategory).optional(),
  difficulty: z.nativeEnum(ProjectDifficulty).optional(),
  points: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  tags: z.string().optional(),  // JSON array stored as string
});

export const ProjectSearchSchema = z.object({
  query: z.string().optional(),
  category: z.nativeEnum(ProjectCategory).optional(),
  difficulty: z.nativeEnum(ProjectDifficulty).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export const ProjectResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  vulhubId: z.string().nullable(),
  category: z.nativeEnum(ProjectCategory),
  difficulty: z.nativeEnum(ProjectDifficulty),
  points: z.number().int(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  tags: z.string(),  // JSON array stored as string
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({
    submissions: z.number().int(),
  }).optional(),
});

export const ProjectStatsSchema = z.object({
  totalSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  pendingSubmissions: z.number().int().min(0),
  averageScore: z.number().min(0),
  completionRate: z.number().min(0).max(100),
});

// Type exports
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
export type ProjectSearchDto = z.infer<typeof ProjectSearchSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type ProjectStats = z.infer<typeof ProjectStatsSchema>;