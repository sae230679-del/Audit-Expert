import * as cheerio from "cheerio";

// Dynamic import for Playwright to handle environments where it's not available
let playwrightChromium: typeof import("playwright").chromium | null = null;
type Browser = import("playwright").Browser;
type BrowserContext = import("playwright").BrowserContext;

// Environment configuration
const isProduction = process.env.NODE_ENV === "production";
const PLAYWRIGHT_TIMEOUT = isProduction ? 45000 : 30000;
const STATIC_FETCH_TIMEOUT = 15000;
const MAX_BROWSER_IDLE_TIME = 5 * 60 * 1000; // 5 minutes

export interface EnhancedDetectionResult {
  cookieBanner: {
    found: boolean;
    selector?: string;
    cmpPlatform?: string;
    hasAcceptButton: boolean;
    hasRejectButton: boolean;
    hasSettingsButton: boolean;
  };
  privacyPolicy: {
    found: boolean;
    url?: string;
    onHomepage: boolean;
    onSeparatePage: boolean;
    linkText?: string;
  };
  consentForms: {
    found: boolean;
    count: number;
    details: Array<{
      formAction?: string;
      hasCheckbox: boolean;
      hasPolicyLink: boolean;
    }>;
  };
  cookiesBeforeConsent: {
    violation: boolean;
    trackingCookies: string[];
    analyticsScripts: string[];
  };
  iframeContent: {
    analyzed: boolean;
    cookieRelatedIframes: number;
    privacyRelatedIframes: number;
  };
  networkAnalysis: {
    trackers: string[];
    analytics: string[];
    foreignServices: string[];
  };
  metaTags: {
    hasPrivacyMeta: boolean;
    hasJsonLd: boolean;
    organizationInfo?: string;
  };
  legalPages: {
    found: string[];
    notFound: string[];
  };
  renderingMethod: "static" | "playwright";
  confidence: number;
}

const COOKIE_BANNER_SELECTORS = [
  '[class*="cookie-banner"]', '[class*="cookie-notice"]', '[class*="cookie-consent"]',
  '[class*="cookieConsent"]', '[class*="CookieBanner"]', '[class*="cookie_banner"]',
  '[class*="cookie_notice"]', '[class*="cookie_consent"]', '[class*="gdpr"]',
  '[class*="consent-banner"]', '[class*="privacy-banner"]', '[class*="cookie-popup"]',
  '[class*="cookie-modal"]', '[class*="cookie-overlay"]', '[class*="cookie-bar"]',
  '[class*="cookies-banner"]', '[class*="cookies-notice"]', '[class*="cookies-popup"]',
  '#cookie-banner', '#cookie-notice', '#cookie-consent', '#cookieConsent',
  '#gdpr-banner', '#consent-banner', '#CookieConsent', '#cookie_banner',
  '#cookie_notice', '#cookies-banner', '#cookies-popup', '#cookie-law',
  '[data-cookie-consent]', '[data-gdpr]', '[data-consent]', '[data-cookies]',
  '[data-testid*="cookie"]', '[data-testid*="consent"]', '[data-cy*="cookie"]',
  '[role="dialog"][aria-label*="cookie" i]', '[role="alertdialog"][aria-label*="cookie" i]',
  '.cc-banner', '.cc-window', '.cc-dialog',
  '#onetrust-banner-sdk', '#onetrust-consent-sdk',
  '.cky-consent-container', '.cky-modal',
  '.cookiebot-dialog', '#CybotCookiebotDialog',
  '#tarteaucitronRoot', '#tarteaucitronAlertBig',
  '.evidon-banner', '#_evidon_banner',
  '.termly-styles', '#termly-code-snippet-support',
  '.qc-cmp2-container', '#qc-cmp2-container',
  '.iubenda-cs-container', '#iubenda-cs-banner',
  '[class*="осторожно"]', '[class*="куки"]', '[class*="cookie-ru"]',
];

const CMP_PLATFORMS = [
  { pattern: /cookiebot|CybotCookiebot/i, name: 'Cookiebot' },
  { pattern: /onetrust/i, name: 'OneTrust' },
  { pattern: /cookieconsent|cc-window|cc-banner/i, name: 'CookieConsent' },
  { pattern: /tarteaucitron/i, name: 'TarteAuCitron' },
  { pattern: /iubenda/i, name: 'Iubenda' },
  { pattern: /termly/i, name: 'Termly' },
  { pattern: /cookieyes|cky-/i, name: 'CookieYes' },
  { pattern: /quantcast|qc-cmp/i, name: 'Quantcast Choice' },
  { pattern: /evidon/i, name: 'Evidon' },
  { pattern: /trustarc/i, name: 'TrustArc' },
  { pattern: /usercentrics/i, name: 'Usercentrics' },
  { pattern: /didomi/i, name: 'Didomi' },
  { pattern: /consentmanager/i, name: 'ConsentManager' },
  { pattern: /axeptio/i, name: 'Axeptio' },
];

const LEGAL_PAGES = [
  '/privacy', '/privacy-policy', '/politika-konfidencialnosti',
  '/policy', '/legal', '/terms', '/oferta', '/offer',
  '/cookies', '/cookie-policy', '/personal-data',
  '/soglasie', '/consent', '/obrabotka-dannyh',
  '/agreement', '/user-agreement', '/polzovatelskoe-soglashenie',
  '/confidentiality', '/personal', '/pdn', '/pd',
  '/about', '/contacts', '/kontakty',
];

const PRIVACY_PATTERNS = [
  /политик[аиуые]\s*(конфиденциальности|обработки|персональных)/gi,
  /обработк[аиуые]\s*персональных\s*данных/gi,
  /согласи[еяюем]\s*на\s*обработку/gi,
  /защит[аиуые]\s*персональных\s*данных/gi,
  /персональны[еых]\s*данн[ыхые]/gi,
  /конфиденциальност[ьию]/gi,
  /(?:даю|выражаю|подтверждаю)\s*(?:свое|своё)?\s*согласие/gi,
  /ознакомлен[аы]?\s*(?:с|и\s*принимаю)/gi,
  /152-?фз|фз-?152|федеральн\w+\s+закон\w*\s+№?\s*152/gi,
  /149-?фз|фз-?149/gi,
  /privacy\s*policy/gi,
  /personal\s*data/gi,
  /data\s*protection/gi,
];

const ACCEPT_BUTTON_PATTERNS = [
  /принять|принимаю|согласен|согласна|согласиться|ок|ok|accept|agree|allow|понятно|хорошо|разрешить|да/i,
];

const REJECT_BUTTON_PATTERNS = [
  /отклонить|отказаться|отказ|reject|decline|deny|нет|не согласен/i,
];

const SETTINGS_BUTTON_PATTERNS = [
  /настройки|настроить|параметры|управление|settings|customize|preferences|manage/i,
];

const TRACKING_COOKIE_PATTERNS = [
  /_ga/, /_gid/, /_gat/, /__utm/, // Google Analytics
  /_fbp/, /_fbc/, /fr/, // Facebook
  /_ym_/, /yandex/, /ymex/, // Yandex
  /tmr_/, /top-fwz/, /vk_/, // VK
  /carrotquest/, /cq_/, // CarrotQuest
  /roistat/, /rs_/, // Roistat
  /mindbox/, /mb_/, // Mindbox
  /amplitude/, /amp_/, // Amplitude
  /mixpanel/, /mp_/, // Mixpanel
  /segment/, /ajs_/, // Segment
  /hubspot/, /__hs/, // HubSpot
  /intercom/, /intercom-/, // Intercom
];

const FOREIGN_SERVICES_PATTERNS = [
  { pattern: /google-analytics\.com|googletagmanager\.com|gtag/i, name: 'Google Analytics' },
  { pattern: /facebook\.com\/tr|fbevents\.js|connect\.facebook/i, name: 'Facebook Pixel' },
  { pattern: /doubleclick\.net/i, name: 'Google DoubleClick' },
  { pattern: /googleadservices\.com/i, name: 'Google Ads' },
  { pattern: /cloudflare\.com|cdnjs\.cloudflare/i, name: 'Cloudflare' },
  { pattern: /amazonaws\.com/i, name: 'Amazon AWS' },
  { pattern: /stripe\.com|js\.stripe/i, name: 'Stripe' },
  { pattern: /intercom\.io|widget\.intercom/i, name: 'Intercom' },
  { pattern: /hotjar\.com|static\.hotjar/i, name: 'Hotjar' },
  { pattern: /crisp\.chat/i, name: 'Crisp Chat' },
  { pattern: /zendesk\.com/i, name: 'Zendesk' },
  { pattern: /hubspot\.com|hs-scripts/i, name: 'HubSpot' },
  { pattern: /mailchimp\.com/i, name: 'Mailchimp' },
  { pattern: /sendgrid\.com/i, name: 'SendGrid' },
];

const RUSSIAN_SERVICES_PATTERNS = [
  { pattern: /mc\.yandex\.ru|metrika/i, name: 'Yandex.Metrika' },
  { pattern: /top-fwz1\.mail\.ru|top\.mail\.ru/i, name: 'Mail.ru Top' },
  { pattern: /vk\.com\/rtrg|vk\.com\/js/i, name: 'VK Pixel' },
  { pattern: /jivosite\.com/i, name: 'JivoSite' },
  { pattern: /carrotquest\.io/i, name: 'CarrotQuest' },
  { pattern: /calltouch\.ru/i, name: 'Calltouch' },
  { pattern: /comagic\.ru/i, name: 'CoMagic' },
  { pattern: /roistat\.com/i, name: 'Roistat' },
];

// Browser instance management with auto-cleanup
let browserInstance: Browser | null = null;
let browserLastUsed: number = 0;
let browserCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let playwrightAvailable: boolean | null = null;

// Initialize Playwright dynamically
async function initPlaywright(): Promise<boolean> {
  if (playwrightAvailable !== null) return playwrightAvailable;
  
  try {
    const playwright = await import("playwright");
    playwrightChromium = playwright.chromium;
    playwrightAvailable = true;
    console.log("[EnhancedDetection] Playwright initialized successfully");
    return true;
  } catch (error) {
    console.warn("[EnhancedDetection] Playwright not available, using static analysis only:", error);
    playwrightAvailable = false;
    return false;
  }
}

async function getBrowser(): Promise<Browser | null> {
  if (!await initPlaywright() || !playwrightChromium) {
    return null;
  }
  
  if (!browserInstance) {
    try {
      browserInstance = await playwrightChromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
        ],
      });
      console.log("[EnhancedDetection] Browser launched");
    } catch (error) {
      console.error("[EnhancedDetection] Failed to launch browser:", error);
      playwrightAvailable = false;
      return null;
    }
  }
  
  browserLastUsed = Date.now();
  scheduleCleanup();
  
  return browserInstance;
}

function scheduleCleanup(): void {
  if (browserCleanupTimer) {
    clearTimeout(browserCleanupTimer);
  }
  
  browserCleanupTimer = setTimeout(async () => {
    if (browserInstance && Date.now() - browserLastUsed >= MAX_BROWSER_IDLE_TIME) {
      await closeBrowser();
      console.log("[EnhancedDetection] Browser closed due to inactivity");
    }
  }, MAX_BROWSER_IDLE_TIME);
}

export async function closeBrowser(): Promise<void> {
  if (browserCleanupTimer) {
    clearTimeout(browserCleanupTimer);
    browserCleanupTimer = null;
  }
  
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (error) {
      console.error("[EnhancedDetection] Error closing browser:", error);
    }
    browserInstance = null;
  }
}

// Graceful shutdown
process.on('beforeExit', closeBrowser);
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);

async function fetchWithPlaywright(url: string, timeout = PLAYWRIGHT_TIMEOUT): Promise<{
  html: string;
  cookies: Array<{ name: string; value: string; domain: string }>;
  networkRequests: string[];
} | null> {
  const browser = await getBrowser();
  if (!browser) {
    return null;
  }
  
  let context: BrowserContext | null = null;
  
  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Help152FZ-Bot/3.0',
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
    
    const page = await context.newPage();
    const networkRequests: string[] = [];
    
    page.on('request', request => {
      const reqUrl = request.url();
      if (reqUrl.startsWith('http')) {
        networkRequests.push(reqUrl);
      }
    });
    
    // Navigate with timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: timeout * 0.6 
    });
    
    // Wait for network to settle
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: timeout * 0.3 }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
    
    // Wait for cookie banners to appear
    await Promise.race([
      page.waitForSelector(COOKIE_BANNER_SELECTORS.slice(0, 15).join(', '), { timeout: 3000 }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
    
    // Scroll to trigger lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, Math.min(document.body.scrollHeight / 3, 1000));
    }).catch(() => {});
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    }).catch(() => {});
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const html = await page.content();
    const cookies = await context.cookies();
    
    return {
      html,
      cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
      networkRequests,
    };
  } catch (error) {
    console.error("[EnhancedDetection] Playwright fetch error:", error);
    return null;
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {}
    }
  }
}

async function fetchStaticHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STATIC_FETCH_TIMEOUT);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[EnhancedDetection] Static fetch returned ${response.status} for ${url}`);
      return '';
    }
    
    return await response.text();
  } catch (error) {
    console.warn("[EnhancedDetection] Static fetch error:", error);
    return '';
  }
}

function detectCMP(html: string): string | null {
  for (const cmp of CMP_PLATFORMS) {
    if (cmp.pattern.test(html)) {
      return cmp.name;
    }
  }
  return null;
}

function findCookieBanner($: cheerio.CheerioAPI): {
  found: boolean;
  selector?: string;
  hasAcceptButton: boolean;
  hasRejectButton: boolean;
  hasSettingsButton: boolean;
} {
  for (const selector of COOKIE_BANNER_SELECTORS) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.text().toLowerCase();
      const html = element.html() || '';
      
      const hasAcceptButton = element.find('button, a, [role="button"]').toArray().some(el => {
        const btnText = $(el).text();
        return ACCEPT_BUTTON_PATTERNS.some(p => p.test(btnText));
      });
      
      const hasRejectButton = element.find('button, a, [role="button"]').toArray().some(el => {
        const btnText = $(el).text();
        return REJECT_BUTTON_PATTERNS.some(p => p.test(btnText));
      });
      
      const hasSettingsButton = element.find('button, a, [role="button"]').toArray().some(el => {
        const btnText = $(el).text();
        return SETTINGS_BUTTON_PATTERNS.some(p => p.test(btnText));
      });
      
      return { found: true, selector, hasAcceptButton, hasRejectButton, hasSettingsButton };
    }
  }
  
  const bodyText = $('body').text().toLowerCase();
  if (/мы используем cookies|мы используем куки|сайт использует cookie/i.test(bodyText)) {
    return { found: true, selector: 'text-match', hasAcceptButton: false, hasRejectButton: false, hasSettingsButton: false };
  }
  
  return { found: false, hasAcceptButton: false, hasRejectButton: false, hasSettingsButton: false };
}

function findPrivacyPolicyOnPage($: cheerio.CheerioAPI, url: string): {
  found: boolean;
  linkUrl?: string;
  linkText?: string;
} {
  const privacyLinkSelectors = [
    'a[href*="privacy"]', 'a[href*="policy"]', 'a[href*="personal"]',
    'a[href*="consent"]', 'a[href*="confidential"]', 'a[href*="pdn"]',
    'a[href*="soglasie"]', 'a[href*="politika"]', 'a[href*="konfidencial"]',
  ];
  
  for (const selector of privacyLinkSelectors) {
    const link = $(selector).first();
    if (link.length > 0) {
      return {
        found: true,
        linkUrl: link.attr('href'),
        linkText: link.text().trim(),
      };
    }
  }
  
  const allLinks = $('a');
  for (let i = 0; i < allLinks.length; i++) {
    const link = $(allLinks[i]);
    const text = link.text().toLowerCase();
    if (PRIVACY_PATTERNS.some(p => p.test(text))) {
      return {
        found: true,
        linkUrl: link.attr('href'),
        linkText: link.text().trim(),
      };
    }
  }
  
  return { found: false };
}

function findConsentForms($: cheerio.CheerioAPI): {
  found: boolean;
  count: number;
  details: Array<{ formAction?: string; hasCheckbox: boolean; hasPolicyLink: boolean }>;
} {
  const forms = $('form');
  const details: Array<{ formAction?: string; hasCheckbox: boolean; hasPolicyLink: boolean }> = [];
  
  forms.each((_, form) => {
    const $form = $(form);
    const hasPersonalDataInputs = $form.find('input[type="email"], input[type="tel"], input[name*="phone"], input[name*="email"], input[name*="name"]').length > 0;
    
    if (hasPersonalDataInputs) {
      const hasCheckbox = $form.find('input[type="checkbox"]').length > 0;
      const hasPolicyLink = $form.find('a[href*="privacy"], a[href*="policy"], a[href*="consent"], a[href*="personal"]').length > 0 ||
                           PRIVACY_PATTERNS.some(p => p.test($form.text()));
      
      details.push({
        formAction: $form.attr('action'),
        hasCheckbox,
        hasPolicyLink,
      });
    }
  });
  
  return {
    found: details.length > 0,
    count: details.length,
    details,
  };
}

function analyzeMetaTags($: cheerio.CheerioAPI): {
  hasPrivacyMeta: boolean;
  hasJsonLd: boolean;
  organizationInfo?: string;
} {
  const hasPrivacyMeta = $('meta[name*="privacy"], meta[property*="privacy"], link[rel="privacy-policy"]').length > 0;
  
  let hasJsonLd = false;
  let organizationInfo: string | undefined;
  
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const content = $(script).html();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'Organization' || data['@type'] === 'WebSite') {
          hasJsonLd = true;
          organizationInfo = data.name || data.legalName;
        }
        if (data.privacyPolicy) {
          hasJsonLd = true;
        }
      }
    } catch {}
  });
  
  return { hasPrivacyMeta, hasJsonLd, organizationInfo };
}

function analyzeTrackingCookies(cookies: Array<{ name: string }>): string[] {
  const trackingCookies: string[] = [];
  
  for (const cookie of cookies) {
    for (const pattern of TRACKING_COOKIE_PATTERNS) {
      if (pattern.test(cookie.name)) {
        trackingCookies.push(cookie.name);
        break;
      }
    }
  }
  
  return Array.from(new Set(trackingCookies));
}

function analyzeNetworkRequests(requests: string[]): {
  trackers: string[];
  analytics: string[];
  foreignServices: string[];
} {
  const trackers: string[] = [];
  const analytics: string[] = [];
  const foreignServices: string[] = [];
  
  for (const url of requests) {
    for (const service of FOREIGN_SERVICES_PATTERNS) {
      if (service.pattern.test(url)) {
        if (service.name.includes('Analytics') || service.name.includes('Metrika')) {
          analytics.push(service.name);
        } else {
          foreignServices.push(service.name);
        }
      }
    }
    
    for (const service of RUSSIAN_SERVICES_PATTERNS) {
      if (service.pattern.test(url)) {
        analytics.push(service.name);
      }
    }
  }
  
  return {
    trackers: Array.from(new Set(trackers)),
    analytics: Array.from(new Set(analytics)),
    foreignServices: Array.from(new Set(foreignServices)),
  };
}

async function checkLegalPages(baseUrl: string): Promise<{ found: string[]; notFound: string[] }> {
  const found: string[] = [];
  const notFound: string[] = [];
  
  const checkPage = async (path: string): Promise<boolean> => {
    try {
      const fullUrl = new URL(path, baseUrl).toString();
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Help152FZ-Compliance-Bot/3.0' },
        redirect: 'follow',
      });
      return response.ok;
    } catch {
      return false;
    }
  };
  
  const priorityPages = LEGAL_PAGES.slice(0, 10);
  const results = await Promise.all(priorityPages.map(async path => {
    const exists = await checkPage(path);
    return { path, exists };
  }));
  
  for (const result of results) {
    if (result.exists) {
      found.push(result.path);
    } else {
      notFound.push(result.path);
    }
  }
  
  return { found, notFound };
}

function isSpaShell(html: string): boolean {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().trim();
  const hasMinimalContent = bodyText.length < 500;
  const hasAppRoot = $('#app, #root, [data-reactroot], [ng-app], #__next').length > 0;
  const hasHeavyScripts = $('script[src]').length > 3;
  
  return hasMinimalContent && hasAppRoot && hasHeavyScripts;
}

export async function runEnhancedDetection(url: string): Promise<EnhancedDetectionResult> {
  let html = '';
  let cookies: Array<{ name: string; value: string; domain: string }> = [];
  let networkRequests: string[] = [];
  let renderingMethod: "static" | "playwright" = "static";
  
  // Start static fetch immediately
  const staticHtmlPromise = fetchStaticHtml(url);
  
  // Check if Playwright is available while fetching static HTML
  const playwrightReady = await initPlaywright();
  const staticHtml = await staticHtmlPromise;
  
  // Determine if we need Playwright rendering
  const needsPlaywright = playwrightReady && (isSpaShell(staticHtml) || staticHtml.length < 1000);
  
  if (needsPlaywright) {
    // SPA detected - use Playwright as primary
    const playwrightResult = await fetchWithPlaywright(url);
    if (playwrightResult) {
      html = playwrightResult.html;
      cookies = playwrightResult.cookies;
      networkRequests = playwrightResult.networkRequests;
      renderingMethod = "playwright";
    } else {
      // Fallback to static HTML
      html = staticHtml;
      console.log("[EnhancedDetection] Playwright unavailable, using static HTML");
    }
  } else if (staticHtml) {
    // Use static HTML as base
    html = staticHtml;
    
    // Try Playwright for cookies and network analysis if available
    if (playwrightReady) {
      const playwrightResult = await fetchWithPlaywright(url, PLAYWRIGHT_TIMEOUT * 0.5);
      if (playwrightResult) {
        cookies = playwrightResult.cookies;
        networkRequests = playwrightResult.networkRequests;
        
        // Use Playwright HTML if significantly larger
        if (playwrightResult.html.length > html.length * 1.2) {
          html = playwrightResult.html;
          renderingMethod = "playwright";
        }
      }
    }
  } else {
    // No static HTML - last resort Playwright attempt
    if (playwrightReady) {
      const playwrightResult = await fetchWithPlaywright(url);
      if (playwrightResult) {
        html = playwrightResult.html;
        cookies = playwrightResult.cookies;
        networkRequests = playwrightResult.networkRequests;
        renderingMethod = "playwright";
      }
    }
  }
  
  // Ensure we have at least empty HTML
  if (!html) {
    html = '<html><body></body></html>';
    console.warn("[EnhancedDetection] No HTML content available for", url);
  }
  
  const $ = cheerio.load(html);
  
  const cookieBannerResult = findCookieBanner($);
  const cmpPlatform = detectCMP(html);
  
  const privacyOnPage = findPrivacyPolicyOnPage($, url);
  const legalPagesResult = await checkLegalPages(url);
  
  const consentForms = findConsentForms($);
  const metaTags = analyzeMetaTags($);
  const trackingCookies = analyzeTrackingCookies(cookies);
  const networkAnalysis = analyzeNetworkRequests(networkRequests);
  
  let confidence = 0.5;
  if (renderingMethod === "playwright") confidence += 0.2;
  if (cookieBannerResult.found) confidence += 0.1;
  if (privacyOnPage.found || legalPagesResult.found.length > 0) confidence += 0.1;
  if (cookies.length > 0) confidence += 0.1;
  
  return {
    cookieBanner: {
      found: cookieBannerResult.found,
      selector: cookieBannerResult.selector,
      cmpPlatform: cmpPlatform || undefined,
      hasAcceptButton: cookieBannerResult.hasAcceptButton,
      hasRejectButton: cookieBannerResult.hasRejectButton,
      hasSettingsButton: cookieBannerResult.hasSettingsButton,
    },
    privacyPolicy: {
      found: privacyOnPage.found || legalPagesResult.found.some(p => p.includes('privacy') || p.includes('policy') || p.includes('personal')),
      url: privacyOnPage.linkUrl,
      onHomepage: privacyOnPage.found,
      onSeparatePage: legalPagesResult.found.length > 0,
      linkText: privacyOnPage.linkText,
    },
    consentForms,
    cookiesBeforeConsent: {
      violation: trackingCookies.length > 0,
      trackingCookies,
      analyticsScripts: networkAnalysis.analytics,
    },
    iframeContent: {
      analyzed: true,
      cookieRelatedIframes: $('iframe[src*="cookie"], iframe[src*="consent"]').length,
      privacyRelatedIframes: $('iframe[src*="privacy"], iframe[src*="policy"]').length,
    },
    networkAnalysis,
    metaTags,
    legalPages: legalPagesResult,
    renderingMethod,
    confidence: Math.min(confidence, 1),
  };
}

export function generateEnhancedChecks(result: EnhancedDetectionResult): Array<{
  id: string;
  name: string;
  status: "passed" | "warning" | "failed";
  details: string;
  category: string;
}> {
  const checks: Array<{
    id: string;
    name: string;
    status: "passed" | "warning" | "failed";
    details: string;
    category: string;
  }> = [];
  
  checks.push({
    id: "ENH-001",
    name: "Cookie-баннер",
    status: result.cookieBanner.found ? "passed" : "failed",
    details: result.cookieBanner.found
      ? `Обнаружен cookie-баннер${result.cookieBanner.cmpPlatform ? ` (${result.cookieBanner.cmpPlatform})` : ''}`
      : "Cookie-баннер не обнаружен",
    category: "cookies",
  });
  
  if (result.cookieBanner.found) {
    checks.push({
      id: "ENH-002",
      name: "Кнопка принятия cookies",
      status: result.cookieBanner.hasAcceptButton ? "passed" : "warning",
      details: result.cookieBanner.hasAcceptButton
        ? "Кнопка принятия cookies найдена"
        : "Кнопка принятия cookies не найдена",
      category: "cookies",
    });
    
    checks.push({
      id: "ENH-003",
      name: "Возможность отказа от cookies",
      status: result.cookieBanner.hasRejectButton ? "passed" : "warning",
      details: result.cookieBanner.hasRejectButton
        ? "Кнопка отказа от cookies найдена"
        : "Возможность отказа от cookies не предусмотрена",
      category: "cookies",
    });
  }
  
  checks.push({
    id: "ENH-004",
    name: "Политика конфиденциальности",
    status: result.privacyPolicy.found ? "passed" : "failed",
    details: result.privacyPolicy.found
      ? `Политика конфиденциальности найдена${result.privacyPolicy.url ? `: ${result.privacyPolicy.url}` : ''}`
      : "Политика конфиденциальности не найдена",
    category: "fz152",
  });
  
  checks.push({
    id: "ENH-005",
    name: "Юридические страницы",
    status: result.legalPages.found.length > 0 ? "passed" : "warning",
    details: result.legalPages.found.length > 0
      ? `Найдены страницы: ${result.legalPages.found.join(', ')}`
      : "Юридические страницы не найдены",
    category: "legal",
  });
  
  if (result.consentForms.found) {
    const formsWithCheckbox = result.consentForms.details.filter(f => f.hasCheckbox).length;
    const formsWithPolicy = result.consentForms.details.filter(f => f.hasPolicyLink).length;
    
    checks.push({
      id: "ENH-006",
      name: "Согласие в формах",
      status: formsWithCheckbox === result.consentForms.count ? "passed" : "warning",
      details: `Форм с ПДн: ${result.consentForms.count}, с чекбоксом согласия: ${formsWithCheckbox}`,
      category: "fz152",
    });
    
    checks.push({
      id: "ENH-007",
      name: "Ссылка на политику в формах",
      status: formsWithPolicy === result.consentForms.count ? "passed" : "warning",
      details: `Форм со ссылкой на политику: ${formsWithPolicy} из ${result.consentForms.count}`,
      category: "fz152",
    });
  }
  
  checks.push({
    id: "ENH-008",
    name: "Cookies до согласия",
    status: result.cookiesBeforeConsent.violation ? "warning" : "passed",
    details: result.cookiesBeforeConsent.violation
      ? `Обнаружены tracking cookies до согласия: ${result.cookiesBeforeConsent.trackingCookies.join(', ')}`
      : "Tracking cookies до согласия не обнаружены",
    category: "cookies",
  });
  
  if (result.networkAnalysis.foreignServices.length > 0) {
    checks.push({
      id: "ENH-009",
      name: "Иностранные сервисы",
      status: "warning",
      details: `Обнаружены иностранные сервисы: ${result.networkAnalysis.foreignServices.join(', ')}`,
      category: "fz149",
    });
  }
  
  if (result.metaTags.hasJsonLd) {
    checks.push({
      id: "ENH-010",
      name: "Структурированные данные",
      status: "passed",
      details: result.metaTags.organizationInfo
        ? `JSON-LD с информацией об организации: ${result.metaTags.organizationInfo}`
        : "JSON-LD структурированные данные найдены",
      category: "technical",
    });
  }
  
  return checks;
}
