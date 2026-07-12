to generate schemas
Act as a senior software architect. Generate a `src/db/schema.js` file using Drizzle ORM and PostgreSQL for a real-time sports application.

- Create a match_status enum with values scheduled, live, and finished.
- Create a matches table with the fields id, sport, homeTeam, awayTeam, status, startTime, endTime, homeScore with default 0, awayScore with default 0, and createdAt with default now.
- Create a commentary table with the fields id, matchId referencing the matches table, minute, sequence, period, eventType, actor, team, message, metadata(jsonb), tags, and createdAt with default now.
- Ensure you use camelCase for the variable names and the default snake_case naming convention for all database columns.


zod valiation 

Act as a senior software engineer. Generate a validation file using Zod at `src/validation/matches.js` that exactly follows these requirements.

- Create a listMatchesQuerySchema that validates an optional limit as a coerced positive integer with a maximum of 100.
- Create a constant named MATCH_STATUS with key-value pairs for SCHEDULED, LIVE, and FINISHED in lowercase.
- Create a matchIdParamSchema that validates a required id as a coerced positive integer.
- Create a createMatchSchema that validates sport, homeTeam, and awayTeam as non-empty strings.
- Include startTime and endTime as strings within the createMatchSchema and add a refinement to verify they are valid ISO date strings.
- Add a superRefine check to createMatchSchema to ensure the endTime is chronologically after the startTime.
- Include optional homeScore and awayScore fields in the createMatchSchema as coerced non-negative integers.
- Create an updateScoreSchema that requires homeScore and awayScore as coerced non-negative integers.

Ensure all schemas are exported and use camelCase for variables and the naming convention described.