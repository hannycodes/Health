import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "myhealth-dev-secret-change-before-deploying";
const SHORT_SESSION = process.env.JWT_SHORT_EXPIRES_IN ?? "1h";
const LONG_SESSION = process.env.JWT_EXPIRES_IN ?? "12h";

/** Hash a password. Never store or log the plain value. */
export function hashPassword(password) {
  return bcrypt.hashSync(password, 8);
}

export function checkPassword(password, hash) {
  return hash ? bcrypt.compareSync(password, hash) : false;
}

export function signToken(user, remember = true) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, {
    expiresIn: remember ? LONG_SESSION : SHORT_SESSION,
  });
}

export function sessionExpiry(token) {
  const decoded = jwt.decode(token);
  return typeof decoded?.exp === "number" ? new Date(decoded.exp * 1000).toISOString() : undefined;
}

/** Strip the password hash before any user object leaves the API. */
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export class HttpError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** 403 for an account or hospital that is not allowed to sign in. */
export function assertAccountUsable(user, hospital) {
  const status = user.status ?? "ACTIVE";

  if (status === "PENDING") {
    throw new HttpError(403, "Your account is awaiting approval.", "ACCOUNT_PENDING");
  }
  if (status === "SUSPENDED") {
    throw new HttpError(403, "This account has been suspended.", "ACCOUNT_SUSPENDED");
  }
  if (status === "DISABLED") {
    throw new HttpError(403, "This account has been disabled.", "ACCOUNT_DISABLED");
  }

  if (hospital && hospital.approvalStatus !== "APPROVED") {
    throw new HttpError(
      403,
      `${hospital.name} is currently ${hospital.approvalStatus.toLowerCase()} on MyHealth.`,
      `HOSPITAL_${hospital.approvalStatus}`,
    );
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
      return next(new HttpError(401, "Authentication required.", "SESSION_EXPIRED"));
    }

    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch {
      return next(
        new HttpError(401, "Your session has ended. Please sign in again.", "SESSION_EXPIRED"),
      );
    }

    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) {
      return next(
        new HttpError(401, "Your session has ended. Please sign in again.", "SESSION_EXPIRED"),
      );
    }

    req.user = user;
    return next();
  };
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Authentication required.", "SESSION_EXPIRED"));
    if (!roles.includes(req.user.role)) {
      return next(
        new HttpError(403, "You do not have permission to perform this action.", "FORBIDDEN"),
      );
    }
    return next();
  };
}
