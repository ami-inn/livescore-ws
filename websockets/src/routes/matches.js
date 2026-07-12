import {Router} from 'express';
import { createMatchSchema } from '../validation/matches';
import { matches } from '../db/schema';
import { db } from '../db/db';
import { getMatchStatus } from '../utils/match-status';


export const matchesRouter = Router();


matchesRouter.get('/', async (req, res) => {
    return res.json({ message: 'Matches route is working!' });
})

matchesRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body); // Validate the request body against the schema
   const {data:{startTime, endTime,homeScore,awayScore}} = parsed;
    if (!parsed.success) {
        return res.status(400).json({ errors: 'invalid payload', details:JSON.stringify(parsed.error.errors) }); // Return validation errors if any
    }

    try {

        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime), // Convert startTime to a Date object
            endTime: new Date(endTime), // Convert endTime to a Date object
            homeScore: homeScore ?? 0, // Default to 0 if not provided
            awayScore: awayScore ?? 0, // Default to 0 if not provided
            status:getMatchStatus(startTime, endTime) // Determine the match status based on start and end times
        }).returning();

        res.status(201).json({ message: 'Match created successfully', data: event }); // Return the created match
        
    } catch (error) {
        return res.status(500).json({ errors: 'internal server error', details: JSON.stringify(error) }); // Handle any unexpected errors
    }
})
