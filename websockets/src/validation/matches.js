import { z } from 'zod';

const isoDateStringSchema = z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'must be a valid ISO date string',
});

export const MATCH_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
});

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z.object({
  sport: z.string().trim().min(1),
  homeTeam: z.string().trim().min(1),
  awayTeam: z.string().trim().min(1),
  startTime: isoDateStringSchema,
  endTime: isoDateStringSchema,
  homeScore: z.coerce.number().int().nonnegative().optional(),
  awayScore: z.coerce.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  const startTime = Date.parse(data.startTime);
  const endTime = Date.parse(data.endTime);

  if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime <= startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'endTime must be after startTime',
    });
  }
});

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
