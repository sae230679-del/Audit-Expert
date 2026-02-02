import * as cheerio from "cheerio";
import {
  SERVICE_1_CRITERIA,
  CriteriaResultV2,
  CriteriaDefinition,
  CriteriaEvidence,
  CriteriaStatus,
  CriteriaGroup,
} from "../shared/criteria-registry";

const LEGAL_PAGE_PATHS = [
  "/privacy",
  "/privacy-policy",
  "/policy",
  "/personal-data",
  "/agreement",
  "/offer",
  "/contacts",
  "/cookie",
  "/cookies",
  "/terms",
  "/legal",
  "/about",
];

const FETCH_TIMEOUT = 10000;

interface FetchedPage {
  url: string;
  html: string;
  headers: Record<string, string>;
  statusCode: number;
}

interface PageCache {
  [url: string]: FetchedPage | null;
}

async function safeFetch(url: string): Promise<FetchedPage | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureLex-Compliance-Bot/2.0 (+https://securelex.ru)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      url: response.url,
      html,
      headers,
      statusCode: response.status,
    };
  } catch (error) {
    return null;
  }
}

function extractTextSnippet(html: string, searchTerms: string[], maxLength = 100): string | null {
  const $ = cheerio.load(html);
  const text = $("body").text().toLowerCase();

  for (const term of searchTerms) {
    const idx = text.indexOf(term.toLowerCase());
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + term.length + maxLength);
      return text.slice(start, end).trim().replace(/\s+/g, " ");
    }
  }
  return null;
}

function hasSelector($: cheerio.CheerioAPI, selectors: string[]): { found: boolean; selector?: string } {
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return { found: true, selector: sel };
    }
  }
  return { found: false };
}

function checkHeader(headers: Record<string, string>, headerName: string): string | null {
  return headers[headerName.toLowerCase()] || null;
}

async function checkCriteria(
  criteria: CriteriaDefinition,
  homePageData: FetchedPage | null,
  pageCache: PageCache,
  baseUrl: string
): Promise<CriteriaResultV2> {
  const result: CriteriaResultV2 = {
    id: criteria.id,
    group: criteria.group,
    title: criteria.title,
    status: "needs_manual",
    recommendation: criteria.recommendation,
    severity: criteria.severity,
  };

  if (criteria.checkKind === "manual_required") {
    result.status = "needs_manual";
    result.details = "Требуется ручная проверка специалистом";
    return result;
  }

  if (!homePageData) {
    result.status = "failed";
    result.details = "Не удалось загрузить главную страницу сайта";
    return result;
  }

  const $ = cheerio.load(homePageData.html);

  switch (criteria.id) {
    // ФЗ-152 checks
    case "fz152.policy.exists": {
      const policyUrls = ["/privacy", "/privacy-policy", "/policy", "/personal-data"];
      for (const path of policyUrls) {
        const pageUrl = new URL(path, baseUrl).toString();
        if (!pageCache[pageUrl]) {
          pageCache[pageUrl] = await safeFetch(pageUrl);
        }
        if (pageCache[pageUrl]?.statusCode === 200) {
          result.status = "passed";
          result.evidence = { url: pageUrl, type: "url", value: `Страница существует (HTTP 200)` };
          return result;
        }
      }
      // Check for links in homepage
      const privacyLink = $('a[href*="privacy"], a[href*="policy"], a[href*="personal"]').first();
      if (privacyLink.length) {
        const href = privacyLink.attr("href");
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "selector", value: `Найдена ссылка: ${href}` };
        return result;
      }
      result.status = "failed";
      result.details = "Политика обработки ПДн не найдена";
      break;
    }

    case "fz152.policy.operator_name": {
      const terms = ["оператор", "наименование оператора", "организация", "ооо", "ао", "пао", "ип"];
      const snippet = extractTextSnippet(homePageData.html, terms);
      if (snippet) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: snippet };
      } else {
        result.status = "warning";
        result.details = "Наименование оператора не найдено явно на главной странице";
      }
      break;
    }

    case "fz152.policy.purposes": {
      const terms = ["цел", "обработк", "персональн"];
      const snippet = extractTextSnippet(homePageData.html, terms);
      if (snippet) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: snippet };
      } else {
        result.status = "needs_manual";
        result.details = "Требуется проверка документа Политики ПДн";
      }
      break;
    }

    case "fz152.policy.categories":
    case "fz152.policy.legal_basis":
    case "fz152.policy.storage_period":
    case "fz152.policy.third_parties":
    case "fz152.policy.cross_border":
    case "fz152.rights.access": {
      result.status = "needs_manual";
      result.details = "Требуется анализ текста Политики обработки ПДн";
      break;
    }

    case "fz152.consent.checkbox": {
      const checkboxSelectors = [
        'input[type="checkbox"][name*="consent"]',
        'input[type="checkbox"][name*="agree"]',
        'input[type="checkbox"][name*="personal"]',
        'input[type="checkbox"][id*="consent"]',
        'input[type="checkbox"][id*="agree"]',
        'input[type="checkbox"]',
      ];
      const found = hasSelector($, checkboxSelectors);
      if (found.found) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "selector", value: found.selector! };
      } else {
        result.status = "warning";
        result.details = "Чекбокс согласия не найден на главной странице";
      }
      break;
    }

    case "fz152.consent.link_to_policy": {
      const linkFound = $('a[href*="privacy"], a[href*="policy"], a[href*="pdn"], a[href*="personal-data"]').length > 0;
      if (linkFound) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "selector", value: 'a[href*="privacy"]' };
      } else {
        result.status = "warning";
        result.details = "Ссылка на Политику не найдена рядом с формами";
      }
      break;
    }

    case "fz152.contacts.dpo": {
      const contactTerms = ["ответственн", "dpo", "защит", "персональн", "обращени"];
      const snippet = extractTextSnippet(homePageData.html, contactTerms);
      if (snippet) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: snippet };
      } else {
        result.status = "needs_manual";
        result.details = "Требуется проверка контактов ответственного лица";
      }
      break;
    }

    // ФЗ-149 checks
    case "fz149.operator_info.inn": {
      const innMatch = homePageData.html.match(/ИНН[\s:]*(\d{10,12})/i);
      if (innMatch) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: `ИНН: ${innMatch[1]}` };
      } else {
        result.status = "warning";
        result.details = "ИНН не найден на сайте";
      }
      break;
    }

    case "fz149.operator_info.ogrn": {
      const ogrnMatch = homePageData.html.match(/ОГРН[\s:]*(\d{13,15})/i);
      if (ogrnMatch) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: `ОГРН: ${ogrnMatch[1]}` };
      } else {
        result.status = "warning";
        result.details = "ОГРН не найден на сайте";
      }
      break;
    }

    case "fz149.operator_info.address": {
      const addressTerms = ["адрес", "г.", "ул.", "д.", "офис", "улица", "город"];
      const snippet = extractTextSnippet(homePageData.html, addressTerms);
      if (snippet) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: snippet };
      } else {
        result.status = "warning";
        result.details = "Юридический адрес не найден";
      }
      break;
    }

    case "fz149.operator_info.email": {
      const emailMatch = homePageData.html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: `Email: ${emailMatch[0]}` };
      } else {
        result.status = "warning";
        result.details = "Контактный email не найден";
      }
      break;
    }

    // Cookie checks
    case "cookies.banner.exists": {
      const bannerSelectors = [
        '[class*="cookie"]',
        '[id*="cookie"]',
        '[class*="consent"]',
        '[id*="consent"]',
        '[class*="gdpr"]',
        '[data-cookie]',
      ];
      const found = hasSelector($, bannerSelectors);
      if (found.found) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "selector", value: found.selector! };
      } else {
        result.status = "warning";
        result.details = "Баннер cookies не обнаружен (может загружаться динамически)";
      }
      break;
    }

    case "cookies.banner.accept_button":
    case "cookies.banner.reject_option":
    case "cookies.banner.settings_option": {
      result.status = "needs_manual";
      result.details = "Требуется проверка интерактивных элементов баннера";
      break;
    }

    case "cookies.policy.exists": {
      const cookieUrls = ["/cookie", "/cookies", "/cookie-policy"];
      for (const path of cookieUrls) {
        const pageUrl = new URL(path, baseUrl).toString();
        if (!pageCache[pageUrl]) {
          pageCache[pageUrl] = await safeFetch(pageUrl);
        }
        if (pageCache[pageUrl]?.statusCode === 200) {
          result.status = "passed";
          result.evidence = { url: pageUrl, type: "url", value: "Страница Политики cookies найдена" };
          return result;
        }
      }
      result.status = "warning";
      result.details = "Отдельная страница Политики cookies не найдена";
      break;
    }

    case "cookies.policy.types_listed":
    case "cookies.policy.purposes":
    case "cookies.policy.third_party":
    case "cookies.no_preload": {
      result.status = "needs_manual";
      result.details = "Требуется анализ Политики cookies";
      break;
    }

    // Technical checks
    case "technical.https.enabled": {
      if (homePageData.url.startsWith("https://")) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "url", value: "Сайт использует HTTPS" };
      } else {
        result.status = "failed";
        result.details = "Сайт не использует HTTPS";
      }
      break;
    }

    case "technical.https.redirect": {
      const httpUrl = baseUrl.replace("https://", "http://");
      const httpPage = await safeFetch(httpUrl);
      if (httpPage && httpPage.url.startsWith("https://")) {
        result.status = "passed";
        result.evidence = { url: httpUrl, type: "url", value: "Редирект на HTTPS работает" };
      } else {
        result.status = "warning";
        result.details = "Редирект с HTTP на HTTPS не настроен или не проверен";
      }
      break;
    }

    case "technical.hsts.enabled": {
      const hsts = checkHeader(homePageData.headers, "strict-transport-security");
      if (hsts) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `HSTS: ${hsts}` };
      } else {
        result.status = "warning";
        result.details = "Заголовок HSTS не найден";
      }
      break;
    }

    case "technical.csp.exists": {
      const csp = checkHeader(homePageData.headers, "content-security-policy");
      if (csp) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `CSP: ${csp.substring(0, 100)}...` };
      } else {
        result.status = "warning";
        result.details = "Заголовок CSP не найден";
      }
      break;
    }

    case "technical.xfo.exists": {
      const xfo = checkHeader(homePageData.headers, "x-frame-options");
      if (xfo) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `X-Frame-Options: ${xfo}` };
      } else {
        result.status = "warning";
        result.details = "Заголовок X-Frame-Options не найден";
      }
      break;
    }

    case "technical.xcto.exists": {
      const xcto = checkHeader(homePageData.headers, "x-content-type-options");
      if (xcto) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `X-Content-Type-Options: ${xcto}` };
      } else {
        result.status = "warning";
        result.details = "Заголовок X-Content-Type-Options не найден";
      }
      break;
    }

    case "technical.referrer.policy": {
      const rp = checkHeader(homePageData.headers, "referrer-policy");
      if (rp) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `Referrer-Policy: ${rp}` };
      } else {
        result.status = "warning";
        result.details = "Заголовок Referrer-Policy не найден";
      }
      break;
    }

    case "technical.permissions.policy": {
      const pp = checkHeader(homePageData.headers, "permissions-policy");
      if (pp) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: `Permissions-Policy: ${pp.substring(0, 100)}...` };
      } else {
        result.status = "warning";
        result.details = "Заголовок Permissions-Policy не найден";
      }
      break;
    }

    case "technical.mixed_content": {
      const hasMixedContent = /src=["']http:\/\//i.test(homePageData.html);
      if (!hasMixedContent) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: "Смешанный контент не обнаружен" };
      } else {
        result.status = "failed";
        result.details = "Обнаружен смешанный контент (HTTP ресурсы на HTTPS странице)";
      }
      break;
    }

    case "technical.forms.secure": {
      const insecureForm = $('form[action^="http:"]').length > 0;
      if (!insecureForm) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "selector", value: "Все формы безопасны" };
      } else {
        result.status = "failed";
        result.details = "Найдены формы, отправляющие данные через HTTP";
      }
      break;
    }

    case "technical.cors.configured": {
      result.status = "needs_manual";
      result.details = "Требуется проверка настроек CORS для API";
      break;
    }

    case "technical.server_info.hidden": {
      const server = checkHeader(homePageData.headers, "server");
      const xPoweredBy = checkHeader(homePageData.headers, "x-powered-by");
      if (!server && !xPoweredBy) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "header", value: "Информация о сервере скрыта" };
      } else if (server || xPoweredBy) {
        result.status = "warning";
        result.evidence = { 
          url: homePageData.url, 
          type: "header", 
          value: `Server: ${server || "N/A"}, X-Powered-By: ${xPoweredBy || "N/A"}` 
        };
        result.details = "Рекомендуется скрыть информацию о сервере";
      }
      break;
    }

    // Legal pages checks
    case "legal.offer.exists": {
      const offerUrls = ["/offer", "/agreement", "/terms", "/dogovor"];
      for (const path of offerUrls) {
        const pageUrl = new URL(path, baseUrl).toString();
        if (!pageCache[pageUrl]) {
          pageCache[pageUrl] = await safeFetch(pageUrl);
        }
        if (pageCache[pageUrl]?.statusCode === 200) {
          result.status = "passed";
          result.evidence = { url: pageUrl, type: "url", value: "Страница оферты найдена" };
          return result;
        }
      }
      result.status = "warning";
      result.details = "Страница публичной оферты не найдена";
      break;
    }

    case "legal.offer.subject":
    case "legal.offer.price":
    case "legal.offer.payment_terms":
    case "legal.offer.delivery_terms":
    case "legal.refund.policy": {
      result.status = "needs_manual";
      result.details = "Требуется анализ текста оферты/договора";
      break;
    }

    case "legal.contacts.page_exists": {
      const contactUrls = ["/contacts", "/contact", "/kontakty", "/about"];
      for (const path of contactUrls) {
        const pageUrl = new URL(path, baseUrl).toString();
        if (!pageCache[pageUrl]) {
          pageCache[pageUrl] = await safeFetch(pageUrl);
        }
        if (pageCache[pageUrl]?.statusCode === 200) {
          result.status = "passed";
          result.evidence = { url: pageUrl, type: "url", value: "Страница контактов найдена" };
          return result;
        }
      }
      result.status = "warning";
      result.details = "Страница контактов не найдена";
      break;
    }

    case "legal.contacts.phone": {
      const phoneMatch = homePageData.html.match(/(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
      if (phoneMatch) {
        result.status = "passed";
        result.evidence = { url: homePageData.url, type: "text_snippet", value: `Телефон: ${phoneMatch[0]}` };
      } else {
        result.status = "warning";
        result.details = "Контактный телефон не найден";
      }
      break;
    }

    default:
      result.status = "needs_manual";
      result.details = "Критерий требует ручной проверки";
  }

  return result;
}

export async function runComplianceChecksV2(websiteUrl: string): Promise<{
  results: CriteriaResultV2[];
  totals: { total: number; passed: number; warning: number; failed: number; needs_manual: number };
}> {
  const results: CriteriaResultV2[] = [];
  const pageCache: PageCache = {};

  // Normalize URL
  let baseUrl = websiteUrl.trim();
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }
  baseUrl = baseUrl.replace(/\/$/, "");

  // Fetch homepage
  const homePageData = await safeFetch(baseUrl);
  pageCache[baseUrl] = homePageData;

  // Process all criteria
  for (const criteria of SERVICE_1_CRITERIA) {
    const result = await checkCriteria(criteria, homePageData, pageCache, baseUrl);
    results.push(result);
  }

  // Calculate totals
  const totals = {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    warning: results.filter((r) => r.status === "warning").length,
    failed: results.filter((r) => r.status === "failed").length,
    needs_manual: results.filter((r) => r.status === "needs_manual").length,
  };

  return { results, totals };
}

export function groupResultsByCategory(results: CriteriaResultV2[]): Record<CriteriaGroup, CriteriaResultV2[]> {
  const grouped: Record<CriteriaGroup, CriteriaResultV2[]> = {
    fz152: [],
    fz149: [],
    cookies: [],
    technical: [],
    legal: [],
  };

  for (const r of results) {
    grouped[r.group].push(r);
  }

  return grouped;
}
