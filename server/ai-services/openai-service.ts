import https from "https";
import http from "http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { storage } from "../storage";

interface OpenAIConfig {
  apiKey: string;
  proxyUrl?: string;
  proxyEnabled: boolean;
  model: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
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

const OPENAI_API_URL = "api.openai.com";

export async function generateWithOpenAI(
  messages: OpenAIMessage[],
  config?: Partial<OpenAIConfig>
): Promise<string> {
  const settings = await storage.getSettings();
  
  if (!settings?.openaiEnabled || !settings?.openaiApiKey) {
    throw new Error("OpenAI не настроен. Добавьте API ключ в настройках.");
  }

  const fullConfig: OpenAIConfig = {
    apiKey: settings.openaiApiKey,
    proxyUrl: settings.openaiProxyUrl || undefined,
    proxyEnabled: settings.openaiProxyEnabled || false,
    model: config?.model || settings.openaiModel || "gpt-4",
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: fullConfig.model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });

    let agent: https.Agent | undefined;
    
    if (fullConfig.proxyEnabled && fullConfig.proxyUrl) {
      agent = new HttpsProxyAgent(fullConfig.proxyUrl);
    }

    const options: https.RequestOptions = {
      hostname: OPENAI_API_URL,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${fullConfig.apiKey}`,
      },
      agent,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const response: OpenAIResponse = JSON.parse(data);
          if (response.choices && response.choices[0]?.message?.content) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error(`OpenAI response error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse OpenAI response: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`OpenAI request failed: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

export async function testOpenAIConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
  try {
    const settings = await storage.getSettings();
    
    if (!settings?.openaiApiKey) {
      return { success: false, message: "API ключ не настроен" };
    }

    const fullConfig: OpenAIConfig = {
      apiKey: settings.openaiApiKey,
      proxyUrl: settings.openaiProxyUrl || undefined,
      proxyEnabled: settings.openaiProxyEnabled || false,
      model: settings.openaiModel || "gpt-4",
    };

    return new Promise((resolve) => {
      let agent: https.Agent | undefined;
      
      if (fullConfig.proxyEnabled && fullConfig.proxyUrl) {
        agent = new HttpsProxyAgent(fullConfig.proxyUrl);
      }

      const options: https.RequestOptions = {
        hostname: OPENAI_API_URL,
        port: 443,
        path: "/v1/models",
        method: "GET",
        headers: {
          "Authorization": `Bearer ${fullConfig.apiKey}`,
        },
        agent,
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.data) {
              const models = response.data
                .filter((m: any) => m.id.includes("gpt"))
                .map((m: any) => m.id)
                .slice(0, 10);
              resolve({ 
                success: true, 
                message: "Подключение успешно установлено",
                models 
              });
            } else if (response.error) {
              resolve({ success: false, message: response.error.message });
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

export function getOpenAIDocumentation() {
  return {
    name: "OpenAI",
    description: "GPT модели от OpenAI (через ваш собственный сервер/прокси)",
    requirements: [
      "API ключ OpenAI",
      "Настройка прокси-сервера (опционально)",
      "Доступ к api.openai.com (напрямую или через прокси)",
    ],
    docs: [
      { title: "Документация OpenAI API", url: "https://platform.openai.com/docs" },
      { title: "API Reference", url: "https://platform.openai.com/docs/api-reference" },
      { title: "Получение API ключа", url: "https://platform.openai.com/api-keys" },
      { title: "Модели", url: "https://platform.openai.com/docs/models" },
    ],
    models: [
      { value: "gpt-4", label: "GPT-4 (стандартный)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo (быстрый)" },
      { value: "gpt-4o", label: "GPT-4o (мультимодальный)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (экономичный)" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (бюджетный)" },
    ],
    proxyNote: "Если OpenAI заблокирован в вашем регионе, используйте прокси-сервер. Формат URL: http://user:pass@host:port или socks5://host:port",
  };
}
