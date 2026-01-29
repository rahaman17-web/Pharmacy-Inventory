import db from "../db.js";

// Log audit. If client provided, use it (within transaction), else use db helper.
export async function logAudit({ user_id, action, details }, client = null) {
  if (String(process.env.DISABLE_AUDIT || "").toLowerCase() === "true") return;
  const detailsJson = details ? JSON.stringify(details) : null;
  if (client) {
    await client.query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)`, [user_id || null, action, detailsJson]);
  } else {
    await db.query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)`, [user_id || null, action, detailsJson]);
  }
}
