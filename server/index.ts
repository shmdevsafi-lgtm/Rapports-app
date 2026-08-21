import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleGenerateSession } from "./routes/generate-session";
import { handleSaveReport } from "./routes/save-report";
import { handleListReports } from "./routes/list-reports";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb", type: "*/*" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use((req, _res, next) => {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Leave malformed bodies for the route validation to reject.
      }
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.post("/api/generate-session", handleGenerateSession);
  app.post("/api/save-report", handleSaveReport);
  app.get("/api/reports", handleListReports);

  return app;
}
