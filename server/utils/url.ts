import { z } from "zod";
import dns from "dns";
import { promisify } from "util";

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,
  /^169\.254\./,
];

const PRIVATE_IPV6_PATTERNS = [
  /^::1$/,
  /^::$/,
  /^::ffff:127\./,
  /^::ffff:10\./,
  /^::ffff:192\.168\./,
  /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

export interface SsrfConfig {
  maxRedirects: number;
  blockIpv6Loopback: boolean;
  dnsRebindingCheck: boolean;
  failClosed: boolean;
}

export const DEFAULT_SSRF_CONFIG: SsrfConfig = {
  maxRedirects: 3,
  blockIpv6Loopback: true,
  dnsRebindingCheck: true,
  failClosed: true,
};

export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }
  if (normalized.startsWith("https://www.")) {
    normalized = "https://" + normalized.slice(12);
  }
  if (normalized.startsWith("http://www.")) {
    normalized = "http://" + normalized.slice(11);
  }
  normalized = normalized.replace(/\/$/, "");
  return normalized;
}

export function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(ip));
}

export function isPrivateIpv6(ip: string): boolean {
  return PRIVATE_IPV6_PATTERNS.some((re) => re.test(ip));
}

export function isUnsafeHost(hostname: string, config?: SsrfConfig): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;

  if (config?.blockIpv6Loopback !== false) {
    const stripped = lower.replace(/^\[/, "").replace(/\]$/, "");
    if (isPrivateIpv6(stripped)) return true;
  }

  const ipv4Match = lower.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4Match) {
    return isPrivateIpv4(lower);
  }

  if (lower.includes("0x") || lower.includes("0177") || /^\d+$/.test(lower)) {
    return true;
  }

  return false;
}

export async function resolveAndCheckDns(hostname: string, config?: SsrfConfig): Promise<{ safe: boolean; resolvedIp?: string; error?: string }> {
  if (!config?.dnsRebindingCheck) {
    return { safe: true };
  }
  try {
    const [ipv4Addresses, ipv6Addresses] = await Promise.allSettled([
      dnsResolve4(hostname),
      dnsResolve6(hostname),
    ]);

    const v4 = ipv4Addresses.status === "fulfilled" ? ipv4Addresses.value : [];
    const v6 = ipv6Addresses.status === "fulfilled" ? ipv6Addresses.value : [];

    if (v4.length === 0 && v6.length === 0) {
      return config?.failClosed ? { safe: false, error: "DNS resolution failed" } : { safe: true };
    }

    for (const addr of v4) {
      if (isPrivateIpv4(addr)) {
        return { safe: false, resolvedIp: addr, error: `DNS resolves to private IPv4: ${addr}` };
      }
    }

    for (const addr of v6) {
      if (isPrivateIpv6(addr)) {
        return { safe: false, resolvedIp: addr, error: `DNS resolves to private IPv6: ${addr}` };
      }
    }

    return { safe: true, resolvedIp: v4[0] || v6[0] };
  } catch (err) {
    if (config?.failClosed) {
      return { safe: false, error: "DNS resolution error" };
    }
    return { safe: true };
  }
}

export function extractDomain(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isSelfCheck(url: string): boolean {
  const domain = extractDomain(url);
  const selfDomains = [
    "help152fz.ru",
    "audit-expert.ru",
  ];
  return selfDomains.includes(domain);
}

export function validateWebsiteUrl(rawUrl: string, ssrfConfig?: SsrfConfig): string {
  const config = ssrfConfig || DEFAULT_SSRF_CONFIG;
  const normalized = normalizeUrl(rawUrl);
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Некорректный URL",
        path: ["websiteUrl"],
      },
    ]);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Разрешены только http/https",
        path: ["websiteUrl"],
      },
    ]);
  }

  if (url.port && !["80", "443", "8080", "8443"].includes(url.port)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Нестандартный порт запрещён",
        path: ["websiteUrl"],
      },
    ]);
  }

  if (isUnsafeHost(url.hostname, config)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: "Запрещён локальный/внутренний адрес",
        path: ["websiteUrl"],
      },
    ]);
  }

  return url.toString();
}

export async function validateWebsiteUrlAsync(rawUrl: string, ssrfConfig?: SsrfConfig): Promise<string> {
  const config = ssrfConfig || DEFAULT_SSRF_CONFIG;
  const validatedUrl = validateWebsiteUrl(rawUrl, config);

  if (config.dnsRebindingCheck) {
    const url = new URL(validatedUrl);
    const ipv4Match = url.hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    if (!ipv4Match) {
      const dnsResult = await resolveAndCheckDns(url.hostname, config);
      if (!dnsResult.safe) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: dnsResult.error || "DNS rebinding detected",
            path: ["websiteUrl"],
          },
        ]);
      }
    }
  }

  return validatedUrl;
}
