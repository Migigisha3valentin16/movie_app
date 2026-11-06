import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const secret = process.env.JWT_SECRET || "development-secret";
const adminUsername = process.env.ADMIN_USER || "admin";

const adminPasswordHash = bcrypt.hashSync(
  process.env.ADMIN_PASSWORD || "admin123",
  10
);

export function login(req, res) {
  const { username, password } = req.body;

  const validUsername = username === adminUsername;
  const validPassword =
    validUsername && bcrypt.compareSync(password || "", adminPasswordHash);

  if (!validUsername || !validPassword) {
    return res.status(401).json({
      error: "Invalid username or password"
    });
  }

  const token = jwt.sign(
    {
      username,
      role: "admin"
    },
    secret,
    {
      expiresIn: "8h"
    }
  );

  res.json({ token });
}

export function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = authorization.substring(7);

  try {
    const user = jwt.verify(token, secret);

    if (user.role !== "admin") {
      return res.status(403).json({
        error: "Admin access required"
      });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}