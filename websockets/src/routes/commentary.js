// @ts-nocheck
import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";

export const commentaryRouter = Router();

const MAX_LIMIT = 100;

commentaryRouter.get("/:id/commentary", async (req, res) => {
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    return res.status(400).json({
      errors: "invalid route parameters",
      details: paramsParsed.error.issues,
    });
  }

  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    return res.status(400).json({
      errors: "invalid query parameters",
      details: queryParsed.error.issues,
    });
  }

  const limit = Math.min(queryParsed.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsParsed.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching commentary:", error);
    return res.status(500).json({
      errors: "internal server error",
      details: JSON.stringify(error),
    });
  }
});

commentaryRouter.post("/:id/commentary", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({ error: 'Invalid commentary payload.', details: bodyResult.error.issues });
  }

  try {
    const [result] = await db.insert(commentary).values({
      matchId: paramsResult.data.id,
      ...bodyResult.data
    }).returning();

    // Broadcast to WebSocket subscribers
    if(res.app.locals.broadCastCommentary) {
      console.log(`[WS] Broadcasting commentary to match ${result.matchId}`);
      res.app.locals.broadCastCommentary(result.matchId, result);
    } else {
      console.warn('[WS] broadCastCommentary not available');
    }

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('Failed to create commentary:', error);
    res.status(500).json({ error: 'Failed to create commentary.' });
  }
});

