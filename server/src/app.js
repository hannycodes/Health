import cors from "cors";
import express from "express";

import { authenticate, HttpError } from "./auth.js";
import { db } from "./db.js";
import { directoryRoutes } from "./routes/directory.routes.js";
import { schedulingRoutes } from "./routes/scheduling.routes.js";
import { supportRoutes } from "./routes/support.routes.js";

const DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function allowedOrigins() {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) return DEFAULT_ORIGINS;
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: allowedOrigins() }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      users: db.users.length,
      appointments: db.appointments.length,
    });
  });

  const auth = authenticate(db);

  // Each router mounts its own `auth` middleware, so the public login route in
  // the directory router stays reachable while everything else requires a token.
  app.use("/api", directoryRoutes(auth));
  app.use("/api", schedulingRoutes(auth));
  app.use("/api", supportRoutes(auth));

  app.use((req, res) => {
    res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}.` });
  });

  // Express identifies error handlers by arity, hence the unused fourth argument.
  app.use((error, _req, res, _next) => {
    if (error?.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Request body must be valid JSON." });
    }

    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error(error);

    return res.status(status).json({
      message: status >= 500 ? "Something went wrong on the server." : error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  });

  return app;
}
