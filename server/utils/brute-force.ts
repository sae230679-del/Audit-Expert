import { logSecurity } from "./logger";

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttempt>();

const CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000,
};

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(loginAttempts.entries());
  for (const [key, attempt] of entries) {
    if (attempt.lockedUntil && attempt.lockedUntil < now) {
      loginAttempts.delete(key);
    } else if (now - attempt.firstAttempt > CONFIG.windowMs) {
      loginAttempts.delete(key);
    }
  }
}, CONFIG.cleanupIntervalMs);

export function getAttemptKey(ip: string, identifier?: string): string {
  return identifier ? `${ip}:${identifier}` : ip;
}

export function checkBruteForce(ip: string, identifier?: string): { blocked: boolean; retryAfter?: number; remainingAttempts?: number } {
  const key = getAttemptKey(ip, identifier);
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt) {
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts };
  }

  if (attempt.lockedUntil) {
    if (now < attempt.lockedUntil) {
      const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
      return { blocked: true, retryAfter };
    }
    loginAttempts.delete(key);
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts };
  }

  if (now - attempt.firstAttempt > CONFIG.windowMs) {
    loginAttempts.delete(key);
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts };
  }

  return { blocked: false, remainingAttempts: CONFIG.maxAttempts - attempt.count };
}

export function recordFailedLogin(ip: string, identifier?: string): void {
  const key = getAttemptKey(ip, identifier);
  const attempt = loginAttempts.get(key);
  const now = Date.now();

  if (!attempt || now - attempt.firstAttempt > CONFIG.windowMs) {
    loginAttempts.set(key, { count: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  attempt.count++;

  if (attempt.count >= CONFIG.maxAttempts) {
    attempt.lockedUntil = now + CONFIG.lockoutMs;
    logSecurity({
      type: "brute_force",
      action: "account_locked",
      ip,
      success: false,
      details: {
        identifier: identifier || "unknown",
        attempts: attempt.count,
        lockoutMinutes: CONFIG.lockoutMs / 60000,
      },
    });
  }
}

export function recordSuccessfulLogin(ip: string, identifier?: string): void {
  const key = getAttemptKey(ip, identifier);
  loginAttempts.delete(key);
}

export function updateBruteForceConfig(config: { maxAttempts?: number; windowMinutes?: number; lockoutMinutes?: number }): void {
  if (config.maxAttempts) CONFIG.maxAttempts = config.maxAttempts;
  if (config.windowMinutes) CONFIG.windowMs = config.windowMinutes * 60 * 1000;
  if (config.lockoutMinutes) CONFIG.lockoutMs = config.lockoutMinutes * 60 * 1000;
}

export function getBruteForceConfig() {
  return {
    maxAttempts: CONFIG.maxAttempts,
    windowMinutes: CONFIG.windowMs / 60000,
    lockoutMinutes: CONFIG.lockoutMs / 60000,
  };
}
