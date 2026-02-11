export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "[redacted]";
  }
  
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  
  if (atIndex <= 0) {
    return "[redacted]";
  }
  
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  
  if (local.length <= 2) {
    return `***${domain}`;
  }
  
  return `${local.slice(0, 2)}***${domain}`;
}

export function maskEmailForApi(email: string): string {
  if (!email || typeof email !== "string") {
    return "[redacted]";
  }
  
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  
  if (atIndex <= 0) {
    return "[redacted]";
  }
  
  const local = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);
  const lastDotIndex = domainPart.lastIndexOf(".");
  
  if (lastDotIndex < 0) {
    return "[redacted]";
  }
  
  const domainName = domainPart.slice(0, lastDotIndex);
  const tld = domainPart.slice(lastDotIndex + 1);
  
  const totalChars = local.length + domainName.length + tld.length;
  const maxVisible = Math.max(1, Math.floor(totalChars * 0.3));
  
  const localVisible = Math.min(maxVisible, 2, local.length);
  const remainingBudget = maxVisible - localVisible;
  
  const localMasked = local.slice(0, localVisible) + "*".repeat(Math.max(local.length - localVisible, 2));
  const domainMasked = "*".repeat(Math.max(domainName.length, 3));
  
  let tldMasked: string;
  if (remainingBudget >= 1 && tld.length > 0) {
    const tldVisible = Math.min(remainingBudget, 1);
    tldMasked = tld.slice(0, tldVisible) + "*".repeat(Math.max(tld.length - tldVisible, 1));
  } else {
    tldMasked = "*".repeat(Math.max(tld.length, 2));
  }
  
  return `${localMasked}@${domainMasked}.${tldMasked}`;
}

export const DEFAULT_PII_KEYS = [
  "operatorEmail",
  "operatorAddress", 
  "operatorInn",
  "email",
  "inn",
  "subjectName",
  "subjectDocument",
  "phone",
  "passport",
  "snils",
  "birthDate",
  "address",
  "sessionId",
  "sessionID",
  "password",
  "token",
  "refreshToken",
];

export function redactObject(
  obj: unknown,
  keysToRedact: string[] = DEFAULT_PII_KEYS
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, keysToRedact));
  }
  
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (keysToRedact.includes(key)) {
        result[key] = "[redacted]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = redactObject(value, keysToRedact);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  return obj;
}

export function containsPotentialPii(text: string): boolean {
  const patterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b\d{10,12}\b/,
    /\bsessionID\b/i,
    /\bsession_id\b/i,
  ];
  
  return patterns.some((pattern) => pattern.test(text));
}
