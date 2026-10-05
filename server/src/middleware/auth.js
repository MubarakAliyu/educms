const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

async function authenticate(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
    const token = req.cookies?.educms_token || bearer;
    if (!token) return res.status(401).json({ message: "Authentication required." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      "SELECT user_id, username, email, first_name, last_name, role, is_active, avatar FROM users WHERE user_id = $1",
      [payload.userId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ message: "Account is unavailable." });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." });
    next();
  };
}

module.exports = { authenticate, authorize };
