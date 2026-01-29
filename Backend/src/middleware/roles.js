export function requireRole(allowed = []) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ error: "Forbidden" });
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!allowed.includes(role)) return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}
