import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";
import type { SiteSettings } from "@shared/schema";

const documentTitles: Record<string, string> = {
  privacy: "Политика конфиденциальности",
  policy: "Политика конфиденциальности",
  terms: "Пользовательское соглашение",
  cookies: "Политика использования cookies",
  consent: "Согласие на обработку персональных данных",
  offer: "Договор-оферта",
};

const documentFields: Record<string, keyof SiteSettings> = {
  privacy: "privacyPolicy",
  policy: "privacyPolicy",
  terms: "termsOfService",
  cookies: "cookiePolicy",
  consent: "consentText",
  offer: "offerText",
};

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

export default function DocumentPage() {
  const [, params] = useRoute("/:type");
  const docType = params?.type || "privacy";

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/settings/public"],
  });

  const title = documentTitles[docType] || "Документ";
  const field = documentFields[docType];
  const content = settings && field ? (settings[field] as string) : "";
  const isMarkdown = content?.startsWith("#") || content?.includes("**");

  const defaultContent: Record<string, string> = {
    privacy: `
ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Настоящая Политика конфиденциальности (далее — Политика) определяет порядок обработки и защиты персональных данных пользователей сайта help152fz.ru.

1.2. Оператором персональных данных является владелец сайта (далее — Оператор).

2. СОБИРАЕМЫЕ ДАННЫЕ

2.1. При использовании сайта могут быть собраны следующие данные:
- URL проверяемого сайта
- Адрес электронной почты
- IP-адрес
- Данные браузера (User-Agent)

3. ЦЕЛИ ОБРАБОТКИ

3.1. Персональные данные обрабатываются в следующих целях:
- Проведение аудита сайта
- Отправка результатов проверки
- Связь с пользователем

4. ХРАНЕНИЕ ДАННЫХ

4.1. Персональные данные хранятся на защищенных серверах в течение 3 лет.

4.2. Данные могут быть переданы платежному провайдеру YooKassa для обработки платежей.

5. ПРАВА ПОЛЬЗОВАТЕЛЯ

5.1. Пользователь имеет право:
- Получить информацию о своих персональных данных
- Потребовать удаления своих данных
- Отозвать согласие на обработку

6. КОНТАКТЫ

Для вопросов по обработке персональных данных обращайтесь: privacy@help152fz.ru
    `.trim(),
    terms: `
ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ

1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Настоящее Пользовательское соглашение регулирует отношения между владельцем сайта help152fz.ru и пользователем.

1.2. Использование сайта означает согласие с настоящим Соглашением.

2. УСЛУГИ

2.1. Сервис предоставляет:
- Бесплатную экспресс-проверку сайтов по 9 критериям
- Платный полный отчет за 900 рублей
- Пакеты экспертного аудита

3. ОПЛАТА

3.1. Оплата производится через платежную систему YooKassa.

3.2. После оплаты возврат средств не производится, за исключением случаев технических сбоев.

4. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ

4.1. Результаты проверки носят рекомендательный характер.

4.2. Оператор не несет ответственности за действия пользователя на основании полученных рекомендаций.

5. ИЗМЕНЕНИЯ СОГЛАШЕНИЯ

5.1. Оператор вправе изменять условия Соглашения без уведомления пользователей.
    `.trim(),
    cookies: `
ПОЛИТИКА ИСПОЛЬЗОВАНИЯ COOKIES

1. ЧТО ТАКОЕ COOKIES

1.1. Cookies — небольшие текстовые файлы, сохраняемые в браузере пользователя.

2. КАКИЕ COOKIES МЫ ИСПОЛЬЗУЕМ

2.1. Необходимые cookies — для работы сайта
2.2. Аналитические cookies — для сбора статистики

3. УПРАВЛЕНИЕ COOKIES

3.1. Вы можете отключить cookies в настройках браузера.

3.2. Отключение cookies может повлиять на работу сайта.

4. СРОК ХРАНЕНИЯ

4.1. Cookies хранятся 30 дней.
    `.trim(),
    consent: `
СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ

Я даю согласие на обработку моих персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».

Перечень данных:
- Адрес электронной почты
- URL проверяемого сайта
- IP-адрес

Цели обработки:
- Проведение аудита сайта
- Отправка результатов проверки
- Связь по вопросам оказания услуг

Согласие действует до момента его отзыва путем направления письма на адрес privacy@help152fz.ru.
    `.trim(),
    offer: `
ДОГОВОР-ОФЕРТА
на оказание услуг по аудиту сайтов

1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Настоящий документ является официальным предложением (офертой) владельца сервиса help152fz.ru (далее — Исполнитель) заключить договор на оказание услуг по аудиту сайтов на соответствие требованиям законодательства РФ о персональных данных.

1.2. Акцептом оферты является оплата услуг.

2. ПРЕДМЕТ ДОГОВОРА

2.1. Исполнитель обязуется оказать услуги по аудиту сайта Заказчика:
- Экспресс-отчет (проверка по 9 критериям)
- Пакет экспертного аудита (в зависимости от выбранного тарифа)

3. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ

3.1. Стоимость услуг определяется действующими тарифами на сайте.
3.2. Оплата производится через платежную систему YooKassa.
3.3. Услуги считаются оказанными с момента отправки отчета на email Заказчика.

4. ПРАВА И ОБЯЗАННОСТИ СТОРОН

4.1. Исполнитель обязуется:
- Провести аудит сайта в течение указанных сроков
- Предоставить рекомендации по устранению нарушений

4.2. Заказчик обязуется:
- Предоставить корректный URL сайта для проверки
- Оплатить услуги согласно выбранному тарифу

5. ВОЗВРАТ СРЕДСТВ

5.1. Возврат средств производится только в случае технических сбоев со стороны Исполнителя.
5.2. Для оформления возврата необходимо обратиться на support@help152fz.ru.

6. РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ

Указаны в разделе «Контакты» на сайте.
    `.trim(),
  };

  const displayContent = content || defaultContent[docType] || "Документ не найден";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                На главную
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : isMarkdown ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${parseMarkdown(displayContent)}</p>` }}
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {displayContent}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
