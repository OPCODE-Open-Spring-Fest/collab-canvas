const jwt = require("jsonwebtoken");
const { getBlacklist } = require("../controllers/authController");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

exports.authMiddleware = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "No token" });

    const token = auth.split(" ")[1];
    if (tokenBlacklist.includes(token)) {
        return res.status(403).json({ message: "Logged out" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        res.status(403).json({ message: "Invalid token" });
    }
}
 