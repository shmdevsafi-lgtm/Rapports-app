import { RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabase";

export const handleListReports: RequestHandler = async (_req, res) => {
  const [reportsResult, sessionsResult] = await Promise.all([
    supabaseAdmin.from("reports").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("sessions").select("*").order("created_at", { ascending: false }),
  ]);

  if (reportsResult.error && sessionsResult.error) {
    console.error("Documents listing error:", reportsResult.error, sessionsResult.error);
    res.status(500).json({
      error: reportsResult.error.message || sessionsResult.error.message || "Unable to fetch documents",
      code: reportsResult.error.code || sessionsResult.error.code || "",
    });
    return;
  }

  if (reportsResult.error) console.error("Reports listing error:", reportsResult.error);
  if (sessionsResult.error) console.error("Sessions listing error:", sessionsResult.error);

  res.json({
    reports: reportsResult.data || [],
    sessions: sessionsResult.data || [],
  });
};
