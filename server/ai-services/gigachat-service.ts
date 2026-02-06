import https from "https";
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
        "RqUID": `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            accessToken = response.access_token;
            tokenExpiresAt = Date.now() + (response.expires_in || 1800) * 1000;
            resolve(accessToken!);
          } else {
            reject(new Error(`OAuth failed: ${JSON.stringify(response)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OAuth response: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`OAuth request failed: ${e.message}`));
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
          const response: GigaChatResponse = JSON.parse(data);
          if (response.choices && response.choices[0]?.message?.content) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error(`GigaChat response error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse GigaChat response: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`GigaChat request failed: ${e.message}`));
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
            const response = JSON.parse(data);
            if (response.data) {
              const models = response.data.map((m: any) => m.id);
              resolve({ 
                success: true, 
                message: "Подключение успешно установлено",
                models 
              });
            } else {
              resolve({ success: false, message: `Ошибка: ${data}` });
            }
          } catch (e) {
            resolve({ success: false, message: `Ошибка разбора ответа: ${data}` });
          }
        });
      });

      req.on("error", (e) => {
        resolve({ success: false, message: `Ошибка подключения: ${e.message}` });
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
