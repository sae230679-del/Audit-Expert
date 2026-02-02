import { storage } from "../storage";
import { generateWithGigaChat, testGigaChatConnection, getGigaChatDocumentation } from "./gigachat-service";
import { generateWithYandexGPT, testYandexGPTConnection, getYandexGPTDocumentation } from "./yandex-gpt-service";
import { generateWithOpenAI, testOpenAIConnection, getOpenAIDocumentation } from "./openai-service";

export type AIProvider = "gigachat" | "yandex" | "openai";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateWithAI(
  messages: AIMessage[],
  provider?: AIProvider
): Promise<string> {
  const settings = await storage.getSettings();
  const selectedProvider = provider || (settings?.defaultAiProvider as AIProvider) || "gigachat";

  switch (selectedProvider) {
    case "gigachat":
      return generateWithGigaChat(messages);
    case "yandex":
      return generateWithYandexGPT(messages);
    case "openai":
      return generateWithOpenAI(messages);
    default:
      throw new Error(`Неизвестный провайдер ИИ: ${selectedProvider}`);
  }
}

export async function testAIConnection(provider: AIProvider): Promise<{ success: boolean; message: string; models?: string[] }> {
  switch (provider) {
    case "gigachat":
      return testGigaChatConnection();
    case "yandex":
      return testYandexGPTConnection();
    case "openai":
      return testOpenAIConnection();
    default:
      return { success: false, message: `Неизвестный провайдер: ${provider}` };
  }
}

export function getAIDocumentation(provider: AIProvider) {
  switch (provider) {
    case "gigachat":
      return getGigaChatDocumentation();
    case "yandex":
      return getYandexGPTDocumentation();
    case "openai":
      return getOpenAIDocumentation();
    default:
      return null;
  }
}

export async function getAvailableProviders(): Promise<Array<{ id: AIProvider; name: string; enabled: boolean; isDefault: boolean }>> {
  const settings = await storage.getSettings();
  
  return [
    {
      id: "gigachat",
      name: "GigaChat (Сбер)",
      enabled: settings?.gigachatEnabled || false,
      isDefault: settings?.defaultAiProvider === "gigachat",
    },
    {
      id: "yandex",
      name: "Yandex GPT",
      enabled: settings?.yandexGptEnabled || false,
      isDefault: settings?.defaultAiProvider === "yandex",
    },
    {
      id: "openai",
      name: "OpenAI",
      enabled: settings?.openaiEnabled || false,
      isDefault: settings?.defaultAiProvider === "openai",
    },
  ];
}

export {
  generateWithGigaChat,
  testGigaChatConnection,
  getGigaChatDocumentation,
  generateWithYandexGPT,
  testYandexGPTConnection,
  getYandexGPTDocumentation,
  generateWithOpenAI,
  testOpenAIConnection,
  getOpenAIDocumentation,
};
