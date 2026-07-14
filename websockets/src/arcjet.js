// @ts-nocheck
// to define a set of rule for http and websocket stricter limitations and security measures
import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";
const arcjetKey = process.env.ARCJET_KEY;
const arcjetEnvironment = process.env.ARCJET_ENVIRONMENT || "production";
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
  throw new Error("ARCJET_KEY is not defined in environment variables");
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        //protect against sql injection, xss, and other common attacks
        shield({
          mode: arcjetMode,
        }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: "10s",
          max: 50,
        }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        //protect against sql injection, xss, and other common attacks
        shield({
          mode: arcjetMode,
        }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: "2s",
          max: 5,
        }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) {
      return next();
    }

    try {
      // this will analyze the request and apply the defined rules, if any rule is violated it will throw an error
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too Many Requests" });
        }

        return res.status(403).json({ error: "Forbidden" });
      }
    } catch (error) {
      console.error("Arcjet security middleware error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    next();
  };
}
