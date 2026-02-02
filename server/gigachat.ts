import { GigaChat } from "gigachat-node";

interface GigaChatSettings {
  enabled: boolean;
  credentials: string;
  model: string;
  isPersonal: boolean;
  promptTemplate: string;
  maxTokens: number;
  lastTestAt: string | null;
  lastTestStatus: "success" | "error" | null;
}

interface GigaChatAnalysis {
  score: number;
  findings: {
    category: string;
    status: "ok" | "warning" | "critical";
    description: string;
    recommendation: string;
  }[];
  summary: string;
}

let gigachatClient: GigaChat | null = null;
let currentSettings: GigaChatSettings | null = null;

export function initGigaChat(settings: GigaChatSettings): void {
  if (!settings.credentials || !settings.enabled) {
    gigachatClient = null;
    currentSettings = null;
    return;
  }

  try {
    gigachatClient = new GigaChat({
      clientSecretKey: settings.credentials,
      isIgnoreTSL: true,
      isPersonal: settings.isPersonal,
      autoRefreshToken: true,
    });
    currentSettings = settings;
  } catch (error) {
    console.error("Failed to initialize GigaChat:", error);
    gigachatClient = null;
  }
}

export async function testGigaChatConnection(credentials: string, isPersonal: boolean): Promise<boolean> {
  try {
    const testClient = new GigaChat({
      clientSecretKey: credentials,
      isIgnoreTSL: true,
      isPersonal: isPersonal,
      autoRefreshToken: true,
    });

    await testClient.createToken();
    
    const response = await testClient.completion({
      model: "GigaChat",
      messages: [
        { role: "user", content: "Привет" }
      ],
    });

    return !!response?.choices?.[0]?.message;
  } catch (error) {
    console.error("GigaChat connection test failed:", error);
    return false;
  }
}

export async function analyzeWebsiteWithGigaChat(
  url: string,
  htmlContent: string,
  promptTemplate: string
): Promise<GigaChatAnalysis | null> {
  if (!gigachatClient || !currentSettings?.enabled) {
    return null;
  }

  try {
    await gigachatClient.createToken();

    const truncatedContent = htmlContent.substring(0, 8000);
    
    const prompt = promptTemplate
      .replace("{url}", url)
      .replace("{content}", truncatedContent);

    const response = await gigachatClient.completion({
      model: currentSettings.model || "GigaChat",
      messages: [
        {
          role: "system",
          content: "Ты эксперт по российскому законодательству в области защиты персональных данных. Анализируй сайты на соответствие 152-ФЗ и 149-ФЗ. Всегда отвечай в формате JSON."
        },
        {
          role: "user",
          content: prompt + `\n\nСодержимое сайта (${url}):\n${truncatedContent}`
        }
      ],
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 50,
        findings: [{
          category: "Общий анализ",
          status: "warning",
          description: content.substring(0, 500),
          recommendation: "Требуется детальная проверка"
        }],
        summary: content.substring(0, 200)
      };
    }

    const analysis = JSON.parse(jsonMatch[0]) as GigaChatAnalysis;
    return analysis;
  } catch (error) {
    console.error("GigaChat analysis failed:", error);
    return null;
  }
}

export function isGigaChatEnabled(): boolean {
  return !!gigachatClient && !!currentSettings?.enabled;
}

export function getGigaChatSettings(): GigaChatSettings | null {
  return currentSettings;
}
