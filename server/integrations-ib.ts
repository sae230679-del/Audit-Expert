import logger, { logSecurity } from "./utils/logger";

export interface IntegrationConfig {
  id: string;
  name: string;
  nameRu: string;
  vendor: string;
  type: "edr" | "siem" | "sast" | "waf";
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  description: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  nameRu: string;
  vendor: string;
  type: string;
  connected: boolean;
  lastCheck: string | null;
  version: string | null;
  error: string | null;
}

export interface IntegrationEvent {
  source: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  timestamp: string;
  raw?: any;
}

const INTEGRATIONS_META: Omit<IntegrationConfig, "enabled" | "apiUrl" | "apiKey">[] = [
  {
    id: "kaspersky_kata",
    name: "Kaspersky KATA",
    nameRu: "Kaspersky Anti Targeted Attack (KATA)",
    vendor: "Лаборатория Касперского",
    type: "edr",
    description: "Платформа для защиты от целевых атак и APT-угроз. Интеграция по API для получения оповещений об инцидентах, обнаруженных угрозах и статусе защиты конечных точек.",
  },
  {
    id: "pt_maxpatrol",
    name: "PT MaxPatrol SIEM",
    nameRu: "Positive Technologies MaxPatrol SIEM",
    vendor: "Positive Technologies",
    type: "siem",
    description: "SIEM-система для сбора, корреляции и анализа событий безопасности. Интеграция для получения инцидентов, корреляционных правил и статуса мониторинга.",
  },
  {
    id: "solar_appscreener",
    name: "Solar appScreener",
    nameRu: "Solar appScreener (ГК Солар)",
    vendor: "ГК Солар",
    type: "sast",
    description: "Статический анализатор кода (SAST/DAST) для поиска уязвимостей в исходном коде и веб-приложениях. Интеграция для запуска сканирований и получения отчётов.",
  },
  {
    id: "usergate_waf",
    name: "UserGate WAF",
    nameRu: "UserGate Web Application Firewall",
    vendor: "UserGate",
    type: "waf",
    description: "Межсетевой экран веб-приложений для защиты от атак на уровне приложений (OWASP Top 10). Интеграция для мониторинга блокировок и настройки правил.",
  },
];

async function testConnection(apiUrl: string, apiKey: string): Promise<{ ok: boolean; error?: string; version?: string }> {
  try {
    if (!apiUrl || !apiKey) {
      return { ok: false, error: "API URL или API Key не заданы" };
    }

    const url = new URL(apiUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false, error: "Неверный протокол URL" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/v1/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "AuditExpert/1.0",
      },
      signal: controller.signal,
    }).catch((err) => {
      clearTimeout(timeout);
      throw err;
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: true, version: data.version || "unknown" };
    }

    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { ok: false, error: "Таймаут подключения (10 сек)" };
    }
    return { ok: false, error: error.message || "Неизвестная ошибка" };
  }
}

export function getIntegrationsMeta(): typeof INTEGRATIONS_META {
  return INTEGRATIONS_META;
}

export async function checkIntegrationStatus(
  integrationId: string,
  apiUrl: string,
  apiKey: string
): Promise<IntegrationStatus> {
  const meta = INTEGRATIONS_META.find((i) => i.id === integrationId);
  if (!meta) {
    throw new Error(`Unknown integration: ${integrationId}`);
  }

  const result = await testConnection(apiUrl, apiKey);

  logSecurity({
    type: "integration",
    action: "connection_check",
    success: result.ok,
    details: {
      integrationId,
      error: result.error,
    },
  });

  return {
    id: meta.id,
    name: meta.name,
    nameRu: meta.nameRu,
    vendor: meta.vendor,
    type: meta.type,
    connected: result.ok,
    lastCheck: new Date().toISOString(),
    version: result.version || null,
    error: result.error || null,
  };
}

export function generateSiemConfig(integrationId: string, apiUrl: string): string {
  const meta = INTEGRATIONS_META.find((i) => i.id === integrationId);
  if (!meta) return "";

  switch (integrationId) {
    case "kaspersky_kata":
      return `# Конфигурация интеграции с Kaspersky KATA
# Endpoint: ${apiUrl}
# Формат передачи событий: JSON over HTTPS
# Типы событий для передачи:
#   - security_scan_completed (результаты аудита)
#   - login_failed (неудачные попытки входа)
#   - brute_force_detected (обнаружение перебора)
#   - csrf_violation (нарушение CSRF)
#
# Пример события:
# {
#   "source": "audit-expert",
#   "event_type": "security_scan",
#   "severity": "info",
#   "timestamp": "2026-02-11T12:00:00Z",
#   "details": { "url": "example.com", "grade": "B" }
# }
`;

    case "pt_maxpatrol":
      return `# Конфигурация интеграции с PT MaxPatrol SIEM
# Endpoint: ${apiUrl}
# Протокол: Syslog (RFC 5424) / CEF
# Порт: 514 (UDP) / 6514 (TLS)
#
# Формат CEF:
# CEF:0|AuditExpert|SecurityAgent|1.0|{event_id}|{event_name}|{severity}|
#   src={client_ip} dst={target_url} msg={description}
#
# Маппинг severity:
#   critical -> 10, high -> 7, medium -> 5, low -> 3, info -> 1
#
# Категории событий:
#   - Аудит безопасности (security_scan)
#   - Аутентификация (auth_*)
#   - Нарушения политик (policy_violation)
`;

    case "solar_appscreener":
      return `# Конфигурация интеграции с Solar appScreener
# API Endpoint: ${apiUrl}
# Формат: REST API v2
#
# Доступные операции:
#   POST /api/v2/scans - запуск сканирования
#   GET  /api/v2/scans/{id} - статус сканирования
#   GET  /api/v2/scans/{id}/report - получение отчёта
#   GET  /api/v2/vulnerabilities - список уязвимостей
#
# Типы сканирования:
#   - SAST (статический анализ кода)
#   - DAST (динамический анализ)
#   - SCA (анализ зависимостей)
`;

    case "usergate_waf":
      return `# Конфигурация интеграции с UserGate WAF
# Management API: ${apiUrl}
# Протокол: REST API over HTTPS
#
# Доступные операции:
#   GET  /api/v1/rules - список правил WAF
#   GET  /api/v1/events - лог заблокированных запросов
#   POST /api/v1/rules - добавление правила
#   GET  /api/v1/stats - статистика блокировок
#
# Категории правил OWASP:
#   - SQL Injection (A03)
#   - XSS (A07)
#   - Path Traversal (A01)
#   - Command Injection (A03)
`;

    default:
      return "";
  }
}
