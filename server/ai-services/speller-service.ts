const YandexSpeller = require("yandex-speller");

interface SpellerError {
  code: number;
  pos: number;
  row: number;
  col: number;
  len: number;
  word: string;
  s: string[];
}

interface SpellerResult {
  original: string;
  corrected: string;
  errors: Array<{
    word: string;
    suggestions: string[];
    position: number;
    length: number;
  }>;
  hasErrors: boolean;
}

export async function checkSpelling(text: string): Promise<SpellerResult> {
  return new Promise((resolve, reject) => {
    YandexSpeller.checkText(text, (err: Error | null, body: SpellerError[]) => {
      if (err) {
        reject(new Error(`Ошибка проверки орфографии: ${err.message}`));
        return;
      }

      const errors = (body || []).map((e: SpellerError) => ({
        word: e.word,
        suggestions: e.s || [],
        position: e.pos,
        length: e.len,
      }));

      let corrected = text;
      const sortedErrors = [...errors].sort((a, b) => b.position - a.position);
      
      for (const error of sortedErrors) {
        if (error.suggestions.length > 0) {
          corrected = 
            corrected.substring(0, error.position) + 
            error.suggestions[0] + 
            corrected.substring(error.position + error.length);
        }
      }

      resolve({
        original: text,
        corrected,
        errors,
        hasErrors: errors.length > 0,
      });
    });
  });
}

export async function checkMultipleTexts(texts: string[]): Promise<SpellerResult[]> {
  const results = await Promise.all(texts.map(text => checkSpelling(text)));
  return results;
}

export function getSpellerDocumentation() {
  return {
    name: "Яндекс Спеллер",
    description: "Бесплатный сервис проверки орфографии от Яндекса",
    features: [
      "Проверка русского, украинского и английского текста",
      "Автоматическое исправление ошибок",
      "Список предложенных вариантов замены",
    ],
    docs: [
      { title: "Документация Яндекс Спеллер", url: "https://yandex.ru/dev/speller/" },
      { title: "API Reference", url: "https://yandex.ru/dev/speller/doc/dg/concepts/About.html" },
    ],
    limits: [
      "Ограничение на количество запросов (не документировано точно)",
      "Максимальная длина текста в одном запросе",
    ],
  };
}
