import { RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabase";

export const handleGenerateSession: RequestHandler = async (req, res) => {
  const {
    title,
    dateTime,
    targetAudience,
    objective,
    methodology,
    location,
  } = req.body;

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      title,
      date_time: dateTime,
      location,
      target_audience: targetAudience,
      objective,
      methodology_original: methodology,
      methodology_reformulated: methodology,
    })
    .select()
    .single();

  if (error) {
    console.error("Database insert error:", error);
    res.status(500).json({ error: error.message || "Failed to save session" });
    return;
  }

  res.json({ success: true, message: "Session saved successfully", data });
};
