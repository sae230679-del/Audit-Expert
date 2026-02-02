import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, TrendingUp, Building2, Quote, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Case } from "@shared/schema";

const defaultCases: Case[] = [
  {
    id: "1",
    title: "Микрофинансовая организация",
    siteType: "Финансы",
    description: "Крупная МФО с онлайн-заявками на кредиты. При плановой проверке Роскомнадзора выявлены серьезные нарушения хранения паспортных данных клиентов. Благодаря экстренному аудиту за 3 дня до проверки компания успела устранить все нарушения и избежала штрафа в 6 млн рублей.",
    beforeScore: 18,
    afterScore: 98,
    issues: ["Хранение сканов паспортов в незащищенном облаке", "Отсутствие шифрования персональных данных", "Нет уведомления Роскомнадзора об обработке ПДн", "Использование иностранных серверов для хранения данных граждан РФ"],
    solutions: ["Экстренный перенос всех данных на российские серверы", "Внедрение шифрования AES-256 для всех ПДн", "Подготовка и отправка уведомления в Роскомнадзор", "Разработка полного пакета из 12 документов по 152-ФЗ"],
    testimonial: "Аудит провели за 3 дня до плановой проверки. Инспектор Роскомнадзора был удивлен полным соответствием требованиям. Избежали штрафа в 6 миллионов рублей!",
    clientName: "ООО МФК БыстроДеньги",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "2",
    title: "Сеть медицинских клиник",
    siteType: "Медицина",
    description: "Сеть из 8 частных клиник с единой системой онлайн-записи и электронными медкартами. Обрабатывались специальные категории ПДн (данные о здоровье) без надлежащей защиты. Потенциальный штраф составлял до 18 млн рублей за повторное нарушение.",
    beforeScore: 22,
    afterScore: 100,
    issues: ["Медицинские данные хранились без специальной защиты", "Доступ к медкартам имели все сотрудники без разграничения", "Отсутствовало согласие на обработку специальных категорий ПДн", "Не было назначено ответственное лицо за защиту ПДн"],
    solutions: ["Внедрена система разграничения доступа к медицинским данным", "Разработаны специальные формы согласия для пациентов", "Назначен и обучен ответственный за защиту ПДн", "Проведено обучение персонала по 152-ФЗ"],
    testimonial: "После аудита мы не только избежали штрафа, но и повысили доверие пациентов. Теперь мы гордимся нашей системой защиты данных.",
    clientName: "Сеть клиник МедЛайф",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "3",
    title: "Интернет-магазин косметики",
    siteType: "E-commerce",
    description: "Популярный интернет-магазин с 200,000+ клиентов. Получили предупреждение от Роскомнадзора о нарушениях на сайте. На устранение дали 30 дней, иначе штраф до 500,000 рублей. Провели аудит и устранили все нарушения за 2 недели.",
    beforeScore: 35,
    afterScore: 95,
    issues: ["Политика конфиденциальности не соответствовала требованиям 152-ФЗ", "Формы сбора данных не содержали ссылку на согласие", "Cookie-баннер отсутствовал", "Не указан оператор персональных данных"],
    solutions: ["Переработана политика конфиденциальности по всем требованиям", "Добавлены чекбоксы согласия ко всем формам", "Установлен и настроен cookie-баннер", "Добавлена полная информация об операторе ПДн"],
    testimonial: "Роскомнадзор прислал благодарственное письмо за оперативное устранение нарушений. Штраф отменили полностью!",
    clientName: "ООО БьютиШоп",
    sortOrder: 3,
    isActive: true,
  },
];

export function CasesSection() {
  const { data: cases = defaultCases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const activeItems = cases
    .filter((i) => i.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <section id="cases" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Успешные кейсы
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Реальные примеры аудитов, которые помогли нашим клиентам достичь полного соответствия законодательству
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeItems.map((item) => {
            const improvement = item.afterScore - item.beforeScore;
            return (
              <Card 
                key={item.id} 
                className="flex flex-col"
                data-testid={`case-card-${item.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {item.siteType}
                    </Badge>
                    {improvement > 0 && (
                      <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +{improvement}%
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {item.title}
                  </CardTitle>
                  {item.clientName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.clientName}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">До:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{item.beforeScore}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">После:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{item.afterScore}%</span>
                    </div>
                  </div>

                  {item.solutions && item.solutions.length > 0 && (
                    <div className="space-y-1.5 mb-4 flex-1">
                      {item.solutions.slice(0, 2).map((solution, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{solution}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.testimonial && (
                    <div className="pt-3 border-t mt-auto">
                      <div className="flex items-start gap-2">
                        <Quote className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm italic text-foreground">
                          {item.testimonial}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/cases">
            <Button variant="outline" size="lg" data-testid="button-view-all-cases">
              Все кейсы
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
