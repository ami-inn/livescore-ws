// @ts-nocheck
import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100; // Define a maximum limit for the number of matches to return

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query); // Validate the query parameters against the schema
  if (!parsed.success) {
    return res.status(400).json({
      errors: "invalid query parameters",
      details: parsed.error.issues,
    }); // Return validation errors if any
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT); // Default to 50 if not provided, and cap at MAX_LIMIT

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit); // Fetch matches from the database, ordered by start time descending
    res.status(200).json({ data }); // Return the fetched matches
  } catch (error) {
    console.error("Error fetching matches:", error);
    return res.status(500).json({
      errors: "internal server error",
      details: JSON.stringify(error),
    }); // Handle any unexpected errors
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body); // Validate the request body against the schema

  if (!parsed.success) {
    return res.status(400).json({
      errors: "invalid payload",
      details: parsed.error.issues,
    }); // Return validation errors if any
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime), // Convert startTime to a Date object
        endTime: new Date(endTime), // Convert endTime to a Date object
        homeScore: homeScore ?? 0, // Default to 0 if not provided
        awayScore: awayScore ?? 0, // Default to 0 if not provided
        status: getMatchStatus(startTime, endTime), // Determine the match status based on start and end times
      })
      .returning();

      if(res.app.locals.broadcastMatchCreated) {
        res.app.locals.broadcastMatchCreated(event); // Broadcast the match creation event to all connected WebSocket clients
      }

    res
      .status(201)
      .json({ message: "Match created successfully", data: event }); // Return the created match
  } catch (error) {
    return res.status(500).json({
      errors: "internal server error",
      details: JSON.stringify(error),
    }); // Handle any unexpected errors
  }
});
