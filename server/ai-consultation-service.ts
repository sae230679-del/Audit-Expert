/**
 * AI Consultation Service - отдельный движок для справочника, чата и Telegram бота
 * Провайдеры: Yandex GPT (основной) → GigaChat (fallback) → OpenAI (опциональный)
 * Настраивается отдельно от AI для проверки сайтов
 */

import https from "https";
import fs from "fs";
import path from "path";
import { guideKnowledgeService } from "./guide-knowledge-service";
import { storage } from "./storage";

let cachedCheatsheet: string | null = null;

export function getCheatsheet(): string {
  if (cachedCheatsheet) return cachedCheatsheet;
  try {
    const filePath = path.join(process.cwd(), "server", "data", "fz152-cheatsheet.md");
    cachedCheatsheet = fs.readFileSync(filePath, "utf-8");
    return cachedCheatsheet;
  } catch (e) {
    console.error("[CONSULTATION-AI] Failed to load cheatsheet:", e);
    return "";
  }
}

const isDevelopment = process.env.NODE_ENV !== "production";


// Кэш токенов
let cachedGigaChatToken: { token: string; expiresAt: number } | null = null;
let cachedYandexToken: { token: string; expiresAt: number } | null = null;

// Типы провайдеров для консультаций
export type ConsultationProvider = "yandex" | "gigachat" | "openai";

export interface ConsultationAISettings {
  primaryProvider: ConsultationProvider;
  yandexEnabled: boolean;
  gigachatEnabled: boolean;
  openaiEnabled: boolean;
  yandexApiKey: string | null;
  yandexFolderId: string | null;
  yandexModelUri: string | null;
  gigachatApiKey: string | null;
  openaiApiKey: string | null;
  useGuideKnowledge: boolean;
}

async function getConsultationAISettings(): Promise<ConsultationAISettings> {
  const result: ConsultationAISettings = {
    primaryProvider: "gigachat",
    yandexEnabled: false,
    gigachatEnabled: false,
    openaiEnabled: false,
    yandexApiKey: null,
    yandexFolderId: null,
    yandexModelUri: null,
    gigachatApiKey: null,
    openaiApiKey: null,
    useGuideKnowledge: true,
  };

  try {
    const siteSettings = await storage.getSettings();
    if (!siteSettings) return result;

    const provider = (siteSettings as any).aiConsultantProvider || siteSettings.defaultAiProvider || "gigachat";
    result.primaryProvider = provider as ConsultationProvider;

    result.gigachatEnabled = siteSettings.gigachatEnabled || false;
    result.yandexEnabled = (siteSettings as any).yandexGptEnabled || false;
    result.openaiEnabled = (siteSettings as any).openaiEnabled || false;

    result.gigachatApiKey = siteSettings.gigachatCredentials || process.env.CONSULTATION_GIGACHAT_API_KEY || process.env.GIGACHATAPIKEY || null;
    result.yandexApiKey = (siteSettings as any).yandexGptApiKey || process.env.CONSULTATION_YANDEX_API_KEY || process.env.YANDEX_IAM_TOKEN || null;
    result.yandexFolderId = (siteSettings as any).yandexGptFolderId || process.env.CONSULTATION_YANDEX_FOLDER_ID || null;
    result.openaiApiKey = (siteSettings as any).openaiApiKey || process.env.CONSULTATION_OPENAI_API_KEY || process.env.OPENAIAPIKEY || null;

  } catch (e) {
    console.error("[CONSULTATION-AI] Error loading settings:", e);
  }

  return result;
}

// ============= YANDEX GPT =============

async function getYandexIAMToken(apiKey: string): Promise<string | null> {
  if (cachedYandexToken && cachedYandexToken.expiresAt > Date.now()) {
    return cachedYandexToken.token;
  }

  // Если apiKey это уже IAM токен (начинается с t1.)
  if (apiKey.startsWith("t1.")) {
    return apiKey;
  }

  // Получаем IAM токен через OAuth
  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      yandexPassportOauthToken: apiKey,
    });

    const options: https.RequestOptions = {
      hostname: "iam.api.cloud.yandex.net",
      port: 443,
      path: "/iam/v1/tokens",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.iamToken) {
            cachedYandexToken = {
              token: result.iamToken,
              expiresAt: Date.now() + 3600000, // 1 час
            };
            resolve(result.iamToken);
          } else {
            console.error("[CONSULTATION-AI] Yandex IAM auth failed:", body);
            resolve(null);
          }
        } catch (e) {
          console.error("[CONSULTATION-AI] Yandex IAM parse error:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e) => {
      console.error("[CONSULTATION-AI] Yandex IAM request error:", e);
      resolve(null);
    });

    req.write(requestBody);
    req.end();
  });
}

async function callYandexGPT(
  messages: { role: string; content: string }[],
  settings: ConsultationAISettings
): Promise<string | null> {
  if (!settings.yandexApiKey || !settings.yandexFolderId) {
    console.log("[CONSULTATION-AI] Yandex GPT: missing API key or folder ID");
    return null;
  }

  const iamToken = await getYandexIAMToken(settings.yandexApiKey);
  if (!iamToken) return null;

  const modelUri = settings.yandexModelUri || `gpt://${settings.yandexFolderId}/yandexgpt-lite`;

  return new Promise((resolve) => {
    const yandexMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      text: m.content,
    }));

    const requestBody = JSON.stringify({
      modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.6,
        maxTokens: "2000",
      },
      messages: yandexMessages,
    });

    const options: https.RequestOptions = {
      hostname: "llm.api.cloud.yandex.net",
      port: 443,
      path: "/foundationModels/v1/completion",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${iamToken}`,
        "x-folder-id": settings.yandexFolderId || "",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.result?.alternatives?.[0]?.message?.text) {
            console.log("[CONSULTATION-AI] Yandex GPT success");
            resolve(result.result.alternatives[0].message.text);
          } else {
            console.error("[CONSULTATION-AI] Yandex GPT response error:", body);
            resolve(null);
          }
        } catch (e) {
          console.error("[CONSULTATION-AI] Yandex GPT parse error:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e) => {
      console.error("[CONSULTATION-AI] Yandex GPT request error:", e);
      resolve(null);
    });

    req.write(requestBody);
    req.end();
  });
}

// ============= GIGACHAT =============

async function getGigaChatAccessToken(apiKey: string): Promise<string | null> {
  if (cachedGigaChatToken && cachedGigaChatToken.expiresAt > Date.now()) {
    return cachedGigaChatToken.token;
  }

  return new Promise((resolve) => {
    const data = "scope=GIGACHAT_API_PERS";

    const options: https.RequestOptions = {
      hostname: "ngw.devices.sberbank.ru",
      port: 443,
      path: "/api/v2/oauth",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
        Authorization: `Basic ${apiKey}`,
      },
      ...(isDevelopment && { rejectUnauthorized: false }),
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.access_token) {
            cachedGigaChatToken = {
              token: result.access_token,
              expiresAt: Date.now() + (result.expires_at ? result.expires_at * 1000 - Date.now() - 60000 : 1800000),
            };
            resolve(result.access_token);
          } else {
            console.error("[CONSULTATION-AI] GigaChat auth failed:", body);
            resolve(null);
          }
        } catch (e) {
          console.error("[CONSULTATION-AI] GigaChat auth parse error:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e) => {
      console.error("[CONSULTATION-AI] GigaChat auth error:", e);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

async function callGigaChat(
  messages: { role: string; content: string }[],
  settings: ConsultationAISettings
): Promise<string | null> {
  if (!settings.gigachatApiKey) {
    console.log("[CONSULTATION-AI] GigaChat: missing API key");
    return null;
  }

  const token = await getGigaChatAccessToken(settings.gigachatApiKey);
  if (!token) return null;

  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      model: "GigaChat",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const options: https.RequestOptions = {
      hostname: "gigachat.devices.sberbank.ru",
      port: 443,
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(isDevelopment && { rejectUnauthorized: false }),
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.choices && result.choices[0]) {
            console.log("[CONSULTATION-AI] GigaChat success");
            resolve(result.choices[0].message?.content || null);
          } else {
            console.error("[CONSULTATION-AI] GigaChat response error:", body);
            resolve(null);
          }
        } catch (e) {
          console.error("[CONSULTATION-AI] GigaChat parse error:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e) => {
      console.error("[CONSULTATION-AI] GigaChat request error:", e);
      resolve(null);
    });

    req.write(requestBody);
    req.end();
  });
}

// ============= OPENAI =============

async function callOpenAI(
  messages: { role: string; content: string }[],
  settings: ConsultationAISettings
): Promise<string | null> {
  if (!settings.openaiApiKey) {
    console.log("[CONSULTATION-AI] OpenAI: missing API key");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const result = await response.json();
    if (result.choices && result.choices[0]) {
      console.log("[CONSULTATION-AI] OpenAI success");
      return result.choices[0].message?.content || null;
    }
    console.error("[CONSULTATION-AI] OpenAI response error:", result);
    return null;
  } catch (e) {
    console.error("[CONSULTATION-AI] OpenAI request error:", e);
    return null;
  }
}

// ============= ОСНОВНАЯ ЛОГИКА =============

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: { title: string; url: string }[];
  provider: string;
}

function extractKeywords(question: string): string[] {
  const keywords: string[] = [];
  const q = question.toLowerCase();

  if (q.includes("политик") || q.includes("privacy") || q.includes("конфиденц")) {
    keywords.push("политика конфиденциальности");
  }
  if (q.includes("соглас") || q.includes("consent") || q.includes("чекбокс") || q.includes("галочк")) {
    keywords.push("согласие");
  }
  if (q.includes("cookie") || q.includes("куки") || q.includes("метрик") || q.includes("аналитик")) {
    keywords.push("cookies");
  }
  if (q.includes("штраф") || q.includes("наказ") || q.includes("ответствен") || q.includes("penalty")) {
    keywords.push("штраф");
  }
  if (q.includes("персональн") || q.includes("пд") || q.includes("personal") || q.includes("данн")) {
    keywords.push("персональные данные");
  }
  if (q.includes("локализ") || q.includes("хостинг") || q.includes("россий") || q.includes("сервер")) {
    keywords.push("локализация");
  }
  if (q.includes("магазин") || q.includes("ecommerce") || q.includes("заказ") || q.includes("корзин")) {
    keywords.push("интернет-магазин");
  }
  if (q.includes("удал") || q.includes("забвен") || q.includes("уничтож")) {
    keywords.push("удаление");
  }
  if (q.includes("оператор") || q.includes("152-фз") || q.includes("фз-152") || q.includes("закон")) {
    keywords.push("оператор");
  }

  if (keywords.length === 0) {
    keywords.push("персональные данные", "штраф");
  }

  return keywords;
}

const SYSTEM_PROMPT = `Ты — дружелюбный, компетентный AI-помощник по ФЗ-152 для SecureLex.ru.

ТВОЯ РОЛЬ:
Эксперт по 152-ФЗ "О персональных данных" с 10+ летним опытом.
Консультант для владельцев сайтов и веб-разработчиков.

ФОРМАТ ОТВЕТА:
1. Начни с краткого ответа на вопрос (1-2 предложения)
2. Раскрой тему структурированно с нумерацией
3. Для каждого пункта укажи:
   - ЧТО требуется (конкретное действие)
   - ПОЧЕМУ это важно (ссылка на закон)
   - ШТРАФ за нарушение (если применимо)
4. Дай практический пример (правильно vs неправильно)
5. Завершай коротким выводом или рекомендацией

СТИЛЬ:
- Простой язык для веб-разработчиков, не юридический жаргон
- Структурирование с заголовками и пунктами
- Выделяй главное жирным текстом **так**
- Краткость: до 400 слов, но содержательно

ВАЖНЫЕ ОГРАНИЧЕНИЯ:
- Не выдумывай штрафы — ссылайся только на КоАП РФ ст. 13.11
- Если не знаешь точный ответ — скажи честно
- Рекомендуй юриста для сложных случаев
- Не давай юридических заключений
- Все ответы на русском языке

БАЗА ЗНАНИЙ (справочник SecureLex):
{context}

Если вопрос не связан с ФЗ-152 или защитой персональных данных — вежливо укажи, что ты специализируешься только на этой теме.`;

/**
 * Основная функция обработки сообщения для чата/бота
 */
export async function processConsultationMessage(
  question: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const settings = await getConsultationAISettings();
  
  console.log("[CONSULTATION-AI] Processing message with settings:", {
    primary: settings.primaryProvider,
    yandexEnabled: settings.yandexEnabled,
    gigachatEnabled: settings.gigachatEnabled,
    openaiEnabled: settings.openaiEnabled,
    hasYandexKey: !!settings.yandexApiKey,
    hasGigachatKey: !!settings.gigachatApiKey,
    hasOpenaiKey: !!settings.openaiApiKey,
  });

  let context = "";
  const sources: { title: string; url: string }[] = [];

  // Получаем знания из справочника
  if (settings.useGuideKnowledge) {
    try {
      const checkTypes = extractKeywords(question);
      const knowledge = await guideKnowledgeService.getKnowledgeForAudit(checkTypes, 4000, settings.primaryProvider);
      if (knowledge.articles.length > 0) {
        context = knowledge.articles
          .map((a) => `### ${a.title}\n${a.bodyMd?.slice(0, 1500) || a.summary || ""}`)
          .join("\n\n---\n\n");

        for (const article of knowledge.articles) {
          if (article.url) {
            sources.push({ title: article.title, url: article.url });
          }
        }
      }
    } catch (e) {
      console.error("[CONSULTATION-AI] Failed to get guide knowledge:", e);
    }
  }

  const cheatsheet = getCheatsheet();
  if (cheatsheet) {
    context = context
      ? context + "\n\n---\n\nДОПОЛНИТЕЛЬНАЯ ШПАРГАЛКА:\n" + cheatsheet.slice(0, 3000)
      : "ШПАРГАЛКА ПО ФЗ-152:\n" + cheatsheet.slice(0, 4000);
  }

  if (!context) {
    context = "Справочник временно недоступен. Отвечай на основе общих знаний о ФЗ-152.";
  }

  const systemPrompt = SYSTEM_PROMPT.replace("{context}", context);

  const messages: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }];

  for (const msg of history.slice(-6)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: question });

  let answer: string | null = null;
  let usedProvider = "none";

  // Порядок провайдеров: основной → fallback → опциональный
  const providerOrder: ConsultationProvider[] = [];
  
  // Основной провайдер первым
  if (settings.primaryProvider === "yandex" && settings.yandexEnabled) {
    providerOrder.push("yandex");
  } else if (settings.primaryProvider === "gigachat" && settings.gigachatEnabled) {
    providerOrder.push("gigachat");
  } else if (settings.primaryProvider === "openai" && settings.openaiEnabled) {
    providerOrder.push("openai");
  }

  // Добавляем остальные включенные провайдеры как fallback
  if (settings.yandexEnabled && !providerOrder.includes("yandex")) {
    providerOrder.push("yandex");
  }
  if (settings.gigachatEnabled && !providerOrder.includes("gigachat")) {
    providerOrder.push("gigachat");
  }
  if (settings.openaiEnabled && !providerOrder.includes("openai")) {
    providerOrder.push("openai");
  }

  console.log("[CONSULTATION-AI] Provider order:", providerOrder);

  // Пробуем провайдеры по порядку
  for (const provider of providerOrder) {
    if (answer) break;

    switch (provider) {
      case "yandex":
        answer = await callYandexGPT(messages, settings);
        if (answer) usedProvider = "yandex";
        break;
      case "gigachat":
        answer = await callGigaChat(messages, settings);
        if (answer) usedProvider = "gigachat";
        break;
      case "openai":
        answer = await callOpenAI(messages, settings);
        if (answer) usedProvider = "openai";
        break;
    }
  }

  if (!answer) {
    answer =
      "Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, проверьте настройки AI-провайдеров в панели администратора или попробуйте позже.";
    usedProvider = "error";
  }

  console.log("[CONSULTATION-AI] Response from provider:", usedProvider);

  return {
    answer,
    sources: sources.slice(0, 3),
    provider: usedProvider,
  };
}

/**
 * Получить статус всех провайдеров консультаций
 */
export async function getConsultationAIStatus(): Promise<{
  yandex: { enabled: boolean; configured: boolean; maskedKey: string | null };
  gigachat: { enabled: boolean; configured: boolean; maskedKey: string | null };
  openai: { enabled: boolean; configured: boolean; maskedKey: string | null };
  primaryProvider: ConsultationProvider;
  useGuideKnowledge: boolean;
}> {
  const settings = await getConsultationAISettings();

  const maskKey = (key: string | null): string | null => {
    if (!key) return null;
    if (key.length <= 8) return "****";
    return key.slice(0, 4) + "****" + key.slice(-4);
  };

  return {
    yandex: {
      enabled: settings.yandexEnabled,
      configured: !!(settings.yandexApiKey && settings.yandexFolderId),
      maskedKey: maskKey(settings.yandexApiKey),
    },
    gigachat: {
      enabled: settings.gigachatEnabled,
      configured: !!settings.gigachatApiKey,
      maskedKey: maskKey(settings.gigachatApiKey),
    },
    openai: {
      enabled: settings.openaiEnabled,
      configured: !!settings.openaiApiKey,
      maskedKey: maskKey(settings.openaiApiKey),
    },
    primaryProvider: settings.primaryProvider,
    useGuideKnowledge: settings.useGuideKnowledge,
  };
}
