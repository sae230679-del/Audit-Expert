import https from "https";
import { randomUUID } from "crypto";
import { storage } from "../storage";

interface GigaChatConfig {
  credentials: string;
  scope: string;
  model: string;
}

interface GigaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GigaChatResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const API_BASE_URL = "https://gigachat.devices.sberbank.ru/api/v1";

async function getAccessToken(config: GigaChatConfig): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  return new Promise((resolve, reject) => {
    const postData = `scope=${config.scope}`;
    
    const options = {
      hostname: "ngw.devices.sberbank.ru",
      port: 9443,
      path: "/api/v2/oauth",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": `Basic ${config.credentials}`,
        "RqUID": randomUUID(),
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[GigaChat] OAuth вернул HTTP ${res.statusCode}: ${data}`);
            reject(new Error(`GigaChat OAuth: HTTP ${res.statusCode}. Проверьте Authorization Key и scope. Ответ: ${data.slice(0, 200)}`));
            return;
          }
          const response = JSON.parse(data);
          if (response.access_token) {
            accessToken = response.access_token;
            tokenExpiresAt = response.expires_at ? response.expires_at - 60000 : Date.now() + 1740000;
            console.log("[GigaChat] OAuth токен получен успешно, истекает:", new Date(tokenExpiresAt).toISOString());
            resolve(accessToken!);
          } else {
            console.error("[GigaChat] OAuth ответ без access_token:", data);
            reject(new Error(`GigaChat OAuth: токен не получен. Ответ: ${data.slice(0, 200)}`));
          }
        } catch (e) {
          console.error("[GigaChat] Ошибка парсинга OAuth ответа:", data);
          reject(new Error(`GigaChat OAuth: некорректный ответ сервера. Данные: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (e) => {
      console.error("[GigaChat] Ошибка сети OAuth:", e.message);
      reject(new Error(`GigaChat OAuth: ошибка сети — ${e.message}. Проверьте доступность ngw.devices.sberbank.ru:9443`));
    });

    req.write(postData);
    req.end();
  });
}

export async function generateWithGigaChat(
  messages: GigaChatMessage[],
  config?: Partial<GigaChatConfig>
): Promise<string> {
  const settings = await storage.getSettings();
  const gigachatSettings = await storage.getGigaChatSettings();
  
  const credentials = settings?.gigachatCredentials || gigachatSettings?.credentials;
  const enabled = settings?.gigachatEnabled || gigachatSettings?.enabled;
  
  if (!enabled || !credentials) {
    throw new Error("GigaChat не настроен. Добавьте API ключ в настройках.");
  }

  const scope = settings?.gigachatScope || 
    (gigachatSettings?.isPersonal === false ? "GIGACHAT_API_CORP" : "GIGACHAT_API_PERS");

  const fullConfig: GigaChatConfig = {
    credentials,
    scope,
    model: config?.model || settings?.gigachatModel || gigachatSettings?.model || "GigaChat",
  };

  const token = await getAccessToken(fullConfig);

  const maxTokens = gigachatSettings?.maxTokens || 4096;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: fullConfig.model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const options = {
      hostname: "gigachat.devices.sberbank.ru",
      port: 443,
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[GigaChat] API вернул HTTP ${res.statusCode}: ${data.slice(0, 300)}`);
            if (res.statusCode === 401) {
              accessToken = null;
              tokenExpiresAt = 0;
              reject(new Error(`GigaChat API: авторизация отклонена (HTTP 401). Токен будет обновлён при следующем запросе.`));
            } else {
              reject(new Error(`GigaChat API: HTTP ${res.statusCode}. ${data.slice(0, 200)}`));
            }
            return;
          }
          const response: GigaChatResponse = JSON.parse(data);
          if (response.choices && response.choices[0]?.message?.content) {
            resolve(response.choices[0].message.content);
          } else {
            console.error("[GigaChat] API ответ без choices:", data.slice(0, 300));
            reject(new Error(`GigaChat: некорректный ответ API. ${data.slice(0, 200)}`));
          }
        } catch (e) {
          console.error("[GigaChat] Ошибка парсинга ответа API:", data.slice(0, 300));
          reject(new Error(`GigaChat: ошибка парсинга ответа. ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (e) => {
      console.error("[GigaChat] Ошибка сети API:", e.message);
      reject(new Error(`GigaChat API: ошибка сети — ${e.message}. Проверьте доступность gigachat.devices.sberbank.ru`));
    });

    req.write(postData);
    req.end();
  });
}

export async function testGigaChatConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
  try {
    const settings = await storage.getSettings();
    const gigachatSettings = await storage.getGigaChatSettings();
    
    const credentials = settings?.gigachatCredentials || gigachatSettings?.credentials;
    if (!credentials) {
      return { success: false, message: "API ключ не настроен" };
    }

    const scope = settings?.gigachatScope || 
      (gigachatSettings?.isPersonal === false ? "GIGACHAT_API_CORP" : "GIGACHAT_API_PERS");
    const model = settings?.gigachatModel || gigachatSettings?.model || "GigaChat";

    const fullConfig: GigaChatConfig = {
      credentials,
      scope,
      model,
    };

    const token = await getAccessToken(fullConfig);

    return new Promise((resolve) => {
      const options = {
        hostname: "gigachat.devices.sberbank.ru",
        port: 443,
        path: "/api/v1/models",
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              console.error(`[GigaChat] Test API HTTP ${res.statusCode}: ${data.slice(0, 300)}`);
              if (res.statusCode === 401) {
                accessToken = null;
                tokenExpiresAt = 0;
              }
              resolve({ success: false, message: `GigaChat API вернул HTTP ${res.statusCode}. ${data.slice(0, 150)}` });
              return;
            }
            const response = JSON.parse(data);
            if (response.data) {
              const models = response.data.map((m: any) => m.id);
              resolve({ 
                success: true, 
                message: `Подключение успешно! Доступные модели: ${models.join(", ")}`,
                models 
              });
            } else {
              resolve({ success: false, message: `Некорректный ответ GigaChat API: ${data.slice(0, 150)}` });
            }
          } catch (e) {
            resolve({ success: false, message: `Ошибка разбора ответа GigaChat: ${data.slice(0, 150)}` });
          }
        });
      });

      req.on("error", (e) => {
        resolve({ success: false, message: `Ошибка сети: ${e.message}. Проверьте доступность gigachat.devices.sberbank.ru:443` });
      });

      req.end();
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export function getGigaChatDocumentation() {
  return {
    name: "GigaChat (Сбер)",
    description: "Российская нейросеть от Сбербанка для генерации текста",
    requirements: [
      "Регистрация на developers.sber.ru/studio",
      "Создание проекта GigaChat API",
      "Получение Authorization Key (показывается один раз)",
      "Сертификат НУЦ Минцифры (устанавливается автоматически)",
    ],
    docs: [
      { title: "Документация GigaChat API", url: "https://developers.sber.ru/docs/ru/gigachat/api/overview" },
      { title: "Получение API ключа", url: "https://developers.sber.ru/docs/ru/gigachat/api/integration" },
      { title: "Тарифы", url: "https://developers.sber.ru/docs/ru/gigachat/api/tariffs" },
      { title: "Сертификаты MinTsifra", url: "https://developers.sber.ru/docs/ru/gigachat/certificates" },
    ],
    scopes: [
      { value: "GIGACHAT_API_PERS", label: "Для физических лиц (бесплатный лимит)" },
      { value: "GIGACHAT_API_CORP", label: "Для юридических лиц (pay-as-you-go)" },
      { value: "GIGACHAT_API_B2B", label: "Для ИП/юрлиц (пакеты)" },
    ],
    models: [
      { value: "GigaChat", label: "GigaChat (стандартный)" },
      { value: "GigaChat-Pro", label: "GigaChat Pro (улучшенный)" },
      { value: "GigaChat-Max", label: "GigaChat Max (максимальный)" },
    ],
    ports: {
      oauth: "9443 (ngw.devices.sberbank.ru)",
      api: "443 (gigachat.devices.sberbank.ru)",
    },
  };
}
