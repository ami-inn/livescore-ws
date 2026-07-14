// @ts-nocheck
import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema } from "../validation/commentary.js";

export const commentaryRouter = Router();

commentaryRouter.get("/", async (req, res) => {
  res.status(200).json({ message: "Commentary route is working!" });
});

commentaryRouter.post("/", async (req, res) => {
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

    res.status(201).json({ message: "Commentary created successfully", data: entry });
  } catch (error) {
    console.error("Error creating commentary:", error);
    return res.status(500).json({
      errors: "internal server error",
      details: JSON.stringify(error),
    });
  }
});

