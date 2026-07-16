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
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    return res.status(400).json({
      errors: "invalid route parameters",
      details: paramsParsed.error.issues,
    });
  }

  const bodyParsed = createCommentarySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    return res.status(400).json({
      errors: "invalid payload",
      details: bodyParsed.error.issues,
    });
  }

  try {
    const [entry] = await db
      .insert(commentary)
      .values({
        matchId: paramsParsed.data.id,
        ...bodyParsed.data,
      })
      .returning();

      if(res.app.locals.broadCastCommentary) {
        res.app.locals.broadCastCommentary(entry.matchId, entry);
      }

    res.status(201).json({ message: "Commentary created successfully", data: entry });
  } catch (error) {
    console.error("Error creating commentary:", error);
    return res.status(500).json({
      errors: "internal server error",
      details: JSON.stringify(error),
    });
  }
});

