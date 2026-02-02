import https from "https";
import { storage } from "../storage";

interface YandexGPTConfig {
  apiKey: string;
  folderId: string;
  model: string;
}

interface YandexGPTMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

interface YandexGPTResponse {
  result: {
    alternatives: Array<{
      message: {
        role: string;
        text: string;
      };
      status: string;
    }>;
    usage?: {
      inputTextTokens: string;
      completionTokens: string;
      totalTokens: string;
    };
  };
}

const API_BASE_URL = "llm.api.cloud.yandex.net";

export async function generateWithYandexGPT(
  messages: Array<{ role: string; content: string }>,
  config?: Partial<YandexGPTConfig>
): Promise<string> {
  const settings = await storage.getSettings();
  
  if (!settings?.yandexGptEnabled || !settings?.yandexGptApiKey || !settings?.yandexGptFolderId) {
    throw new Error("Yandex GPT не настроен. Добавьте API ключ и Folder ID в настройках.");
  }

  const fullConfig: YandexGPTConfig = {
    apiKey: settings.yandexGptApiKey,
    folderId: settings.yandexGptFolderId,
    model: config?.model || settings.yandexGptModel || "yandexgpt/latest",
  };

  const yandexMessages: YandexGPTMessage[] = messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    text: m.content,
  }));

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      modelUri: `gpt://${fullConfig.folderId}/${fullConfig.model}`,
      completionOptions: {
        stream: false,
        temperature: 0.6,
        maxTokens: 4000,
      },
      messages: yandexMessages,
    });

    const options = {
      hostname: API_BASE_URL,
      port: 443,
      path: "/foundationModels/v1/completion",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Api-Key ${fullConfig.apiKey}`,
        "x-folder-id": fullConfig.folderId,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const response: YandexGPTResponse = JSON.parse(data);
          if (response.result?.alternatives?.[0]?.message?.text) {
            resolve(response.result.alternatives[0].message.text);
          } else {
            reject(new Error(`Yandex GPT response error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Yandex GPT response: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Yandex GPT request failed: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

export async function testYandexGPTConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await storage.getSettings();
    
    if (!settings?.yandexGptApiKey || !settings?.yandexGptFolderId) {
      return { success: false, message: "API ключ или Folder ID не настроены" };
    }

    const response = await generateWithYandexGPT([
      { role: "user", content: "Привет! Скажи 'Тест успешен'" }
    ]);

    if (response && response.length > 0) {
      return { success: true, message: "Подключение успешно установлено" };
    } else {
      return { success: false, message: "Пустой ответ от API" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export function getYandexGPTDocumentation() {
  return {
    name: "Yandex GPT",
    description: "Нейросеть от Яндекса для генерации текста на русском языке",
    requirements: [
      "Аккаунт Yandex Cloud",
      "Создание сервисного аккаунта с ролью ai.languageModels.user",
      "Получение API ключа",
      "Folder ID каталога Yandex Cloud",
    ],
    docs: [
      { title: "Документация Yandex GPT", url: "https://yandex.cloud/en/docs/foundation-models/" },
      { title: "Быстрый старт", url: "https://yandex.cloud/en/docs/foundation-models/quickstart/yandexgpt" },
      { title: "Получение API ключа", url: "https://yandex.cloud/en/docs/iam/concepts/authorization/api-key" },
      { title: "Тарифы", url: "https://yandex.cloud/en/services/yandexgpt" },
    ],
    models: [
      { value: "yandexgpt/latest", label: "YandexGPT (последняя версия)" },
      { value: "yandexgpt-lite/latest", label: "YandexGPT Lite (быстрый)" },
      { value: "yandexgpt/rc", label: "YandexGPT RC (экспериментальный)" },
    ],
    endpoint: "llm.api.cloud.yandex.net",
  };
}
