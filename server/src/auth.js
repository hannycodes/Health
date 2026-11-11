import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "myhealth-dev-secret-change-before-deploying";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "12h";

/** Hash a password. Never store or log the plain value. */
export function hashPassword(password) {
  return bcrypt.hashSync(password, 8);
}

export function checkPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });
}

/** Strip the password hash before any user object leaves the API. */
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Resolve the bearer token to a fresh user record on every request, so a
 * deactivated or reassigned account takes effect immediately.
 */
export function authenticate(db) {
  return (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(new HttpError(401, "Authentication required."));
    }

    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch {
      return next(new HttpError(401, "Your session is invalid or has expired."));
    }

    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) {
      return next(new HttpError(401, "This account no longer exists."));
    }

    req.user = user;
    return next();
  };
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Authentication required."));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission to perform this action."));
    }
    return next();
  };
}
