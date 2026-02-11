import https from "https";
import http from "http";
import { URL } from "url";
import tls from "tls";
import logger, { logSecurity } from "./utils/logger";
import { validateWebsiteUrl, isUnsafeHost, isPrivateIpv4, isPrivateIpv6, resolveAndCheckDns, DEFAULT_SSRF_CONFIG } from "./utils/url";

export interface SecurityScanResult {
  url: string;
  timestamp: string;
  overallScore: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: SecurityCategory[];
  recommendations: SecurityRecommendation[];
  owaspMapping: OwaspMapping[];
  fstekMapping: FstekMapping[];
  gostMapping: GostMapping[];
}

export interface SecurityCategory {
  name: string;
  nameRu: string;
  score: number;
  maxScore: number;
  checks: SecurityCheck[];
}

export interface SecurityCheck {
  id: string;
  name: string;
  nameRu: string;
  status: "pass" | "fail" | "warn" | "info";
  value: string;
  description: string;
  descriptionRu: string;
  weight: number;
}

export interface SecurityRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  titleRu: string;
  descriptionRu: string;
  npaReference: string;
  category: string;
}

export interface OwaspMapping {
  id: string;
  name: string;
  status: "compliant" | "partial" | "non_compliant";
  relatedChecks: string[];
}

export interface FstekMapping {
  group: string;
  measure: string;
  status: "compliant" | "partial" | "non_compliant";
  relatedChecks: string[];
}

export interface GostMapping {
  area: string;
  requirement: string;
  status: "compliant" | "partial" | "non_compliant";
  relatedChecks: string[];
}

async function fetchHeaders(targetUrl: string): Promise<{ headers: Record<string, string>; statusCode: number; redirectUrl?: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const options: any = {
      method: "HEAD",
      timeout: 10000,
      headers: {
        "User-Agent": "AuditExpert-SecurityAgent/1.0",
      },
    };

    const req = client.request(
      targetUrl,
      options,
      (res) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") {
            headers[key.toLowerCase()] = value;
          } else if (Array.isArray(value)) {
            headers[key.toLowerCase()] = value.join(", ");
          }
        }
        resolve({
          headers,
          statusCode: res.statusCode || 0,
          redirectUrl: res.headers.location || undefined,
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

async function checkTls(hostname: string): Promise<{
  protocol: string;
  cipher: string;
  validCert: boolean;
  certExpiry: string | null;
  certIssuer: string | null;
}> {
  const failResult = { protocol: "none", cipher: "none", validCert: false, certExpiry: null as string | null, certIssuer: null as string | null };

  const getCertInfo = (socket: tls.TLSSocket): { protocol: string; cipher: string; cert: tls.PeerCertificate } => {
    const cert = socket.getPeerCertificate();
    const protocol = socket.getProtocol() || "unknown";
    const cipher = socket.getCipher()?.name || "unknown";
    return { protocol, cipher, cert };
  };

  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        443,
        hostname,
        { rejectUnauthorized: true, timeout: 10000 },
        () => {
          const { protocol, cipher, cert } = getCertInfo(socket);
          socket.destroy();
          resolve({
            protocol,
            cipher,
            validCert: true,
            certExpiry: cert?.valid_to || null,
            certIssuer: cert?.issuer?.O || null,
          });
        }
      );

      socket.on("error", (err) => {
        if (err.message?.includes("certificate") || err.message?.includes("self signed") || err.message?.includes("unable to verify")) {
          const fallbackSocket = tls.connect(443, hostname, { rejectUnauthorized: false, timeout: 5000 }, () => {
            const { protocol, cipher, cert } = getCertInfo(fallbackSocket);
            fallbackSocket.destroy();
            resolve({
              protocol,
              cipher,
              validCert: false,
              certExpiry: cert?.valid_to || null,
              certIssuer: cert?.issuer?.O || null,
            });
          });
          fallbackSocket.on("error", () => resolve(failResult));
          fallbackSocket.on("timeout", () => { fallbackSocket.destroy(); resolve(failResult); });
        } else {
          resolve(failResult);
        }
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(failResult);
      });
    } catch {
      resolve(failResult);
    }
  });
}

function checkHttpHeaders(headers: Record<string, string>): SecurityCategory {
  const checks: SecurityCheck[] = [];

  const hsts = headers["strict-transport-security"];
  checks.push({
    id: "hsts",
    name: "HSTS",
    nameRu: "HTTP Strict Transport Security",
    status: hsts ? (hsts.includes("max-age=") && parseInt(hsts.split("max-age=")[1]) >= 31536000 ? "pass" : "warn") : "fail",
    value: hsts || "Отсутствует",
    description: "HSTS forces browsers to use HTTPS",
    descriptionRu: "HSTS принуждает браузеры использовать HTTPS соединение",
    weight: 10,
  });

  const xfo = headers["x-frame-options"];
  checks.push({
    id: "x-frame-options",
    name: "X-Frame-Options",
    nameRu: "Защита от Clickjacking",
    status: xfo ? "pass" : "warn",
    value: xfo || "Отсутствует",
    description: "Prevents clickjacking attacks",
    descriptionRu: "Предотвращает атаки clickjacking через iframe",
    weight: 5,
  });

  const xcto = headers["x-content-type-options"];
  checks.push({
    id: "x-content-type-options",
    name: "X-Content-Type-Options",
    nameRu: "Запрет MIME-сниффинга",
    status: xcto === "nosniff" ? "pass" : "fail",
    value: xcto || "Отсутствует",
    description: "Prevents MIME type sniffing",
    descriptionRu: "Запрещает браузеру определять MIME-тип содержимого автоматически",
    weight: 5,
  });

  const referrer = headers["referrer-policy"];
  checks.push({
    id: "referrer-policy",
    name: "Referrer-Policy",
    nameRu: "Политика реферера",
    status: referrer ? "pass" : "warn",
    value: referrer || "Отсутствует",
    description: "Controls referrer information sent",
    descriptionRu: "Контролирует передачу информации о реферере при переходах",
    weight: 3,
  });

  const permissions = headers["permissions-policy"] || headers["feature-policy"];
  checks.push({
    id: "permissions-policy",
    name: "Permissions-Policy",
    nameRu: "Политика разрешений",
    status: permissions ? "pass" : "info",
    value: permissions || "Отсутствует",
    description: "Controls browser features permissions",
    descriptionRu: "Управляет разрешениями браузерных функций (камера, микрофон и т.д.)",
    weight: 3,
  });

  const xss = headers["x-xss-protection"];
  checks.push({
    id: "x-xss-protection",
    name: "X-XSS-Protection",
    nameRu: "Защита от XSS",
    status: xss ? "pass" : "info",
    value: xss || "Отсутствует",
    description: "Browser XSS filter (legacy)",
    descriptionRu: "Встроенный фильтр XSS браузера (устаревший, но полезный)",
    weight: 2,
  });

  const score = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);

  return {
    name: "HTTP Headers",
    nameRu: "HTTP-заголовки безопасности",
    score: Math.round(score),
    maxScore,
    checks,
  };
}

function checkCsp(headers: Record<string, string>): SecurityCategory {
  const checks: SecurityCheck[] = [];
  const csp = headers["content-security-policy"];

  checks.push({
    id: "csp-present",
    name: "CSP Present",
    nameRu: "Наличие CSP",
    status: csp ? "pass" : "fail",
    value: csp ? "Установлен" : "Отсутствует",
    description: "Content Security Policy header is set",
    descriptionRu: "Заголовок Content-Security-Policy установлен",
    weight: 10,
  });

  if (csp) {
    checks.push({
      id: "csp-unsafe-inline",
      name: "No unsafe-inline",
      nameRu: "Отсутствие unsafe-inline",
      status: csp.includes("'unsafe-inline'") ? "warn" : "pass",
      value: csp.includes("'unsafe-inline'") ? "Содержит unsafe-inline" : "Безопасно",
      description: "CSP should avoid unsafe-inline",
      descriptionRu: "CSP не должен содержать unsafe-inline для защиты от XSS",
      weight: 8,
    });

    checks.push({
      id: "csp-unsafe-eval",
      name: "No unsafe-eval",
      nameRu: "Отсутствие unsafe-eval",
      status: csp.includes("'unsafe-eval'") ? "fail" : "pass",
      value: csp.includes("'unsafe-eval'") ? "Содержит unsafe-eval" : "Безопасно",
      description: "CSP should not use unsafe-eval",
      descriptionRu: "CSP не должен содержать unsafe-eval — это открывает вектор XSS атак",
      weight: 10,
    });

    checks.push({
      id: "csp-default-src",
      name: "default-src defined",
      nameRu: "Определён default-src",
      status: csp.includes("default-src") ? "pass" : "warn",
      value: csp.includes("default-src") ? "Определён" : "Отсутствует",
      description: "Default fallback policy should be defined",
      descriptionRu: "Базовая политика default-src должна быть определена",
      weight: 5,
    });
  }

  const score = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);

  return {
    name: "Content Security Policy",
    nameRu: "Политика безопасности контента (CSP)",
    score: Math.round(score),
    maxScore,
    checks,
  };
}

function checkCookies(headers: Record<string, string>): SecurityCategory {
  const checks: SecurityCheck[] = [];
  const setCookie = headers["set-cookie"] || "";

  const hasCookies = setCookie.length > 0;

  if (hasCookies) {
    checks.push({
      id: "cookie-secure",
      name: "Secure flag",
      nameRu: "Флаг Secure",
      status: setCookie.toLowerCase().includes("secure") ? "pass" : "fail",
      value: setCookie.toLowerCase().includes("secure") ? "Установлен" : "Отсутствует",
      description: "Cookies should have Secure flag",
      descriptionRu: "Cookies должны иметь флаг Secure для передачи только по HTTPS",
      weight: 8,
    });

    checks.push({
      id: "cookie-httponly",
      name: "HttpOnly flag",
      nameRu: "Флаг HttpOnly",
      status: setCookie.toLowerCase().includes("httponly") ? "pass" : "warn",
      value: setCookie.toLowerCase().includes("httponly") ? "Установлен" : "Отсутствует",
      description: "Cookies should have HttpOnly flag",
      descriptionRu: "Cookies должны иметь флаг HttpOnly для защиты от XSS",
      weight: 8,
    });

    checks.push({
      id: "cookie-samesite",
      name: "SameSite attribute",
      nameRu: "Атрибут SameSite",
      status: setCookie.toLowerCase().includes("samesite") ? "pass" : "warn",
      value: setCookie.toLowerCase().includes("samesite") ? "Установлен" : "Отсутствует",
      description: "Cookies should have SameSite attribute",
      descriptionRu: "Cookies должны иметь атрибут SameSite для защиты от CSRF",
      weight: 5,
    });
  } else {
    checks.push({
      id: "cookie-none",
      name: "No cookies",
      nameRu: "Cookies не обнаружены",
      status: "info",
      value: "На данной странице cookies не устанавливаются",
      description: "No cookies detected on initial request",
      descriptionRu: "При начальном запросе cookies не обнаружены",
      weight: 0,
    });
  }

  const score = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0) || 1;

  return {
    name: "Cookie Security",
    nameRu: "Безопасность Cookies",
    score: Math.round(score),
    maxScore,
    checks,
  };
}

function checkTlsSecurity(tlsInfo: Awaited<ReturnType<typeof checkTls>>): SecurityCategory {
  const checks: SecurityCheck[] = [];

  checks.push({
    id: "tls-version",
    name: "TLS Version",
    nameRu: "Версия TLS",
    status: tlsInfo.protocol.includes("TLSv1.3") ? "pass" : tlsInfo.protocol.includes("TLSv1.2") ? "warn" : "fail",
    value: tlsInfo.protocol,
    description: "TLS 1.3 is recommended",
    descriptionRu: `Используется ${tlsInfo.protocol}. Рекомендуется TLS 1.3`,
    weight: 10,
  });

  checks.push({
    id: "tls-cert-valid",
    name: "Certificate valid",
    nameRu: "Валидность сертификата",
    status: tlsInfo.validCert ? "pass" : "fail",
    value: tlsInfo.validCert ? "Валидный" : "Невалидный или самоподписанный",
    description: "SSL certificate should be valid",
    descriptionRu: tlsInfo.validCert ? "SSL-сертификат валидный" : "SSL-сертификат невалидный или самоподписанный",
    weight: 10,
  });

  if (tlsInfo.certExpiry) {
    const expiryDate = new Date(tlsInfo.certExpiry);
    const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    checks.push({
      id: "tls-cert-expiry",
      name: "Certificate expiry",
      nameRu: "Срок действия сертификата",
      status: daysLeft > 30 ? "pass" : daysLeft > 7 ? "warn" : "fail",
      value: `${daysLeft} дней до истечения (${tlsInfo.certExpiry})`,
      description: "Certificate should not expire soon",
      descriptionRu: `До истечения сертификата: ${daysLeft} дней`,
      weight: 5,
    });
  }

  checks.push({
    id: "tls-cipher",
    name: "Cipher suite",
    nameRu: "Набор шифров",
    status: tlsInfo.cipher !== "none" ? "pass" : "fail",
    value: tlsInfo.cipher,
    description: "Strong cipher suite should be used",
    descriptionRu: `Используется набор шифров: ${tlsInfo.cipher}`,
    weight: 5,
  });

  const score = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);

  return {
    name: "SSL/TLS Configuration",
    nameRu: "Конфигурация SSL/TLS",
    score: Math.round(score),
    maxScore,
    checks,
  };
}

function checkCors(headers: Record<string, string>): SecurityCategory {
  const checks: SecurityCheck[] = [];
  const acao = headers["access-control-allow-origin"];

  checks.push({
    id: "cors-origin",
    name: "CORS Origin",
    nameRu: "CORS: разрешённые источники",
    status: !acao ? "pass" : acao === "*" ? "fail" : "pass",
    value: acao || "Не установлен (хорошо — по умолчанию запрещён)",
    description: "CORS should not allow all origins",
    descriptionRu: acao === "*" ? "CORS разрешает все источники — это небезопасно" : "CORS настроен корректно",
    weight: 8,
  });

  const acac = headers["access-control-allow-credentials"];
  if (acao === "*" && acac === "true") {
    checks.push({
      id: "cors-credentials-wildcard",
      name: "CORS Credentials + Wildcard",
      nameRu: "CORS: credentials с wildcard",
      status: "fail",
      value: "Критическая уязвимость",
      description: "Wildcard origin with credentials is a security vulnerability",
      descriptionRu: "Использование Access-Control-Allow-Origin: * вместе с credentials — критическая уязвимость",
      weight: 10,
    });
  }

  const score = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const maxScore = checks.reduce((s, c) => s + c.weight, 0);

  return {
    name: "CORS Configuration",
    nameRu: "Настройки CORS",
    score: Math.round(score),
    maxScore,
    checks,
  };
}

function generateOwaspMapping(categories: SecurityCategory[]): OwaspMapping[] {
  const allChecks = categories.flatMap((c) => c.checks);
  const getStatus = (ids: string[]): "compliant" | "partial" | "non_compliant" => {
    const relevant = allChecks.filter((c) => ids.includes(c.id));
    if (relevant.length === 0) return "partial";
    const passed = relevant.filter((c) => c.status === "pass").length;
    if (passed === relevant.length) return "compliant";
    if (passed > 0) return "partial";
    return "non_compliant";
  };

  return [
    { id: "A01", name: "Broken Access Control", status: getStatus(["cors-origin", "cors-credentials-wildcard", "x-frame-options"]), relatedChecks: ["cors-origin", "x-frame-options"] },
    { id: "A02", name: "Cryptographic Failures", status: getStatus(["tls-version", "tls-cert-valid", "tls-cipher", "cookie-secure"]), relatedChecks: ["tls-version", "tls-cert-valid"] },
    { id: "A05", name: "Security Misconfiguration", status: getStatus(["hsts", "x-content-type-options", "permissions-policy"]), relatedChecks: ["hsts", "x-content-type-options"] },
    { id: "A07", name: "Authentication Failures", status: getStatus(["cookie-httponly", "cookie-samesite", "cookie-secure"]), relatedChecks: ["cookie-httponly", "cookie-samesite"] },
    { id: "A09", name: "Logging & Monitoring Failures", status: "partial", relatedChecks: [] },
  ];
}

function generateFstekMapping(categories: SecurityCategory[]): FstekMapping[] {
  const allChecks = categories.flatMap((c) => c.checks);
  const getStatus = (ids: string[]): "compliant" | "partial" | "non_compliant" => {
    const relevant = allChecks.filter((c) => ids.includes(c.id));
    if (relevant.length === 0) return "partial";
    const passed = relevant.filter((c) => c.status === "pass").length;
    if (passed === relevant.length) return "compliant";
    if (passed > 0) return "partial";
    return "non_compliant";
  };

  return [
    { group: "ИАФ", measure: "ИАФ.6 — Идентификация и аутентификация (сетевой уровень)", status: getStatus(["tls-version", "tls-cert-valid"]), relatedChecks: ["tls-version", "tls-cert-valid"] },
    { group: "ЗИС", measure: "ЗИС.3 — Обеспечение защиты информации при передаче", status: getStatus(["hsts", "tls-version", "cookie-secure"]), relatedChecks: ["hsts", "tls-version", "cookie-secure"] },
    { group: "ЗИС", measure: "ЗИС.17 — Защита от XSS/Clickjacking", status: getStatus(["csp-present", "x-frame-options", "x-xss-protection"]), relatedChecks: ["csp-present", "x-frame-options"] },
    { group: "РСБ", measure: "РСБ.1 — Определение событий безопасности", status: "partial", relatedChecks: [] },
    { group: "АНЗ", measure: "АНЗ.1 — Выявление уязвимостей", status: "compliant", relatedChecks: [] },
  ];
}

function generateGostMapping(categories: SecurityCategory[]): GostMapping[] {
  const allChecks = categories.flatMap((c) => c.checks);
  const getStatus = (ids: string[]): "compliant" | "partial" | "non_compliant" => {
    const relevant = allChecks.filter((c) => ids.includes(c.id));
    if (relevant.length === 0) return "partial";
    const passed = relevant.filter((c) => c.status === "pass").length;
    if (passed === relevant.length) return "compliant";
    if (passed > 0) return "partial";
    return "non_compliant";
  };

  return [
    { area: "СМЭ", requirement: "Сетевой мониторинг и экранирование", status: getStatus(["csp-present", "cors-origin"]), relatedChecks: ["csp-present", "cors-origin"] },
    { area: "ЗИ", requirement: "Защита информации при передаче", status: getStatus(["tls-version", "hsts", "cookie-secure"]), relatedChecks: ["tls-version", "hsts"] },
    { area: "ЗВК", requirement: "Защита внутренних каналов", status: getStatus(["cookie-httponly", "cookie-samesite"]), relatedChecks: ["cookie-httponly"] },
  ];
}

function generateRecommendations(categories: SecurityCategory[]): SecurityRecommendation[] {
  const recommendations: SecurityRecommendation[] = [];
  const allChecks = categories.flatMap((c) => c.checks);

  for (const check of allChecks) {
    if (check.status === "fail") {
      recommendations.push({
        priority: check.weight >= 10 ? "critical" : check.weight >= 5 ? "high" : "medium",
        titleRu: `Исправить: ${check.nameRu}`,
        descriptionRu: check.descriptionRu,
        npaReference: getNpaReference(check.id),
        category: check.name,
      });
    } else if (check.status === "warn") {
      recommendations.push({
        priority: check.weight >= 8 ? "high" : "medium",
        titleRu: `Улучшить: ${check.nameRu}`,
        descriptionRu: check.descriptionRu,
        npaReference: getNpaReference(check.id),
        category: check.name,
      });
    }
  }

  recommendations.sort((a, b) => {
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    return priority[a.priority] - priority[b.priority];
  });

  return recommendations;
}

function getNpaReference(checkId: string): string {
  const refs: Record<string, string> = {
    hsts: "ФСТЭК Приказ 21, ЗИС.3; ГОСТ Р 57580, ЗИ",
    "x-frame-options": "ФСТЭК Приказ 21, ЗИС.17; OWASP A01:2025",
    "x-content-type-options": "OWASP A05:2025; ФСТЭК Приказ 21, ЗИС.17",
    "referrer-policy": "OWASP A05:2025",
    "permissions-policy": "OWASP A05:2025",
    "csp-present": "ФСТЭК Приказ 21, ЗИС.17; ГОСТ Р 57580, СМЭ; OWASP A05:2025",
    "csp-unsafe-inline": "OWASP A03:2025; ФСТЭК ЗИС.17",
    "csp-unsafe-eval": "OWASP A03:2025; ФСТЭК ЗИС.17",
    "cookie-secure": "ФСТЭК Приказ 21, ЗИС.3; OWASP A02:2025",
    "cookie-httponly": "ФСТЭК Приказ 21, ЗИС.17; OWASP A07:2025",
    "cookie-samesite": "OWASP A01:2025; ГОСТ Р 57580",
    "tls-version": "ФСТЭК Приказ 21, ЗИС.3; ГОСТ Р 57580, ЗИ; OWASP A02:2025",
    "tls-cert-valid": "152-ФЗ; ФСТЭК Приказ 21, ИАФ.6",
    "cors-origin": "OWASP A01:2025; A05:2025",
  };
  return refs[checkId] || "OWASP Top 10:2025";
}

function calculateGrade(percentage: number): "A" | "B" | "C" | "D" | "F" {
  if (percentage >= 90) return "A";
  if (percentage >= 75) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export async function runSecurityScan(targetUrl: string): Promise<SecurityScanResult> {
  logger.info(`[SECURITY-AGENT] Starting scan for ${targetUrl}`);

  let url: string;
  try {
    url = validateWebsiteUrl(targetUrl);
  } catch {
    url = targetUrl;
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
  }

  const parsedUrl = new URL(url);

  if (isUnsafeHost(parsedUrl.hostname)) {
    throw new Error("SSRF: целевой хост является внутренним/локальным адресом");
  }

  const dnsCheck = await resolveAndCheckDns(parsedUrl.hostname, DEFAULT_SSRF_CONFIG);
  if (!dnsCheck.safe) {
    throw new Error(`SSRF: ${dnsCheck.error}`);
  }
  const categories: SecurityCategory[] = [];

  try {
    const { headers } = await fetchHeaders(url);
    categories.push(checkHttpHeaders(headers));
    categories.push(checkCsp(headers));
    categories.push(checkCookies(headers));
    categories.push(checkCors(headers));

    if (parsedUrl.protocol === "https:") {
      const tlsInfo = await checkTls(parsedUrl.hostname);
      categories.push(checkTlsSecurity(tlsInfo));
    }
  } catch (error: any) {
    logger.error(`[SECURITY-AGENT] Scan error: ${error.message}`);
    categories.push({
      name: "Connection",
      nameRu: "Подключение",
      score: 0,
      maxScore: 10,
      checks: [{
        id: "connection-error",
        name: "Connection",
        nameRu: "Подключение",
        status: "fail",
        value: error.message,
        description: "Failed to connect to target",
        descriptionRu: `Не удалось подключиться к сайту: ${error.message}`,
        weight: 10,
      }],
    });
  }

  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const maxScore = categories.reduce((s, c) => s + c.maxScore, 0) || 1;
  const percentage = (totalScore / maxScore) * 100;

  const result: SecurityScanResult = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    overallScore: totalScore,
    maxScore,
    grade: calculateGrade(percentage),
    categories,
    recommendations: generateRecommendations(categories),
    owaspMapping: generateOwaspMapping(categories),
    fstekMapping: generateFstekMapping(categories),
    gostMapping: generateGostMapping(categories),
  };

  logSecurity({
    type: "scan",
    action: "security_scan_completed",
    success: true,
    details: {
      url: targetUrl,
      score: totalScore,
      maxScore,
      grade: result.grade,
      checksTotal: categories.reduce((s, c) => s + c.checks.length, 0),
      failedChecks: categories.reduce((s, c) => s + c.checks.filter((ch) => ch.status === "fail").length, 0),
    },
  });

  logger.info(`[SECURITY-AGENT] Scan completed for ${targetUrl}: ${result.grade} (${totalScore}/${maxScore})`);

  return result;
}
