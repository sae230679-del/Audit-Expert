import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, TrendingUp, Building2, Quote, ArrowLeft, AlertTriangle, Wrench } from "lucide-react";
import { Link } from "wouter";
import type { Case } from "@shared/schema";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
  {
    id: "4",
    title: "HR-платформа для рекрутинга",
    siteType: "HR-Tech",
    description: "SaaS-платформа для подбора персонала, обрабатывающая резюме и персональные данные соискателей. После жалобы кандидата началась проверка. Грозил штраф до 3 млн рублей за утечку данных третьим лицам.",
    beforeScore: 28,
    afterScore: 97,
    issues: ["Резюме кандидатов передавались клиентам без согласия", "Данные хранились бессрочно без права на удаление", "Не было процедуры реагирования на запросы субъектов ПДн", "Трансграничная передача данных без уведомления"],
    solutions: ["Внедрена система получения согласия на передачу резюме", "Настроено автоудаление данных через 1 год", "Разработан регламент работы с обращениями субъектов ПДн", "Оформлено уведомление о трансграничной передаче"],
    testimonial: "Жалоба была отозвана после того, как мы показали кандидату нашу новую политику защиты данных. Проверка закрыта без штрафа.",
    clientName: "TalentHub",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "5",
    title: "Онлайн-школа программирования",
    siteType: "EdTech",
    description: "Образовательная платформа с 15,000+ учеников, включая несовершеннолетних. При проверке выяснилось, что данные детей обрабатывались без согласия родителей. Штраф мог составить до 1,5 млн рублей.",
    beforeScore: 40,
    afterScore: 100,
    issues: ["Обработка данных несовершеннолетних без согласия родителей", "Видеозаписи занятий хранились на зарубежных серверах", "Отсутствовала верификация возраста учеников", "Преподаватели имели доступ к контактам родителей"],
    solutions: ["Внедрена система получения согласия родителей при регистрации", "Видеозаписи перенесены на российский хостинг", "Добавлена верификация возраста и типа аккаунта", "Ограничен доступ преподавателей к персональным данным"],
    testimonial: "Мы не только избежали штрафа, но и получили конкурентное преимущество. Родители выбирают нас именно за безопасность данных детей.",
    clientName: "КодКидс",
    sortOrder: 5,
    isActive: true,
  },
];

export default function CasesPage() {
  const { data: cases = defaultCases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const activeItems = cases
    .filter((i) => i.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="bg-muted/30 py-12 md:py-16 border-b">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  На главную
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Успешные кейсы
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Реальные примеры аудитов сайтов на соответствие 152-ФЗ. Узнайте, как мы помогли компаниям 
              привести свои ресурсы в соответствие с требованиями законодательства о персональных данных.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Загрузка кейсов...
            </div>
          ) : activeItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Кейсов пока нет
            </div>
          ) : (
            <div className="space-y-8">
              {activeItems.map((item) => {
                const improvement = item.afterScore - item.beforeScore;
                return (
                  <Card key={item.id} data-testid={`case-detail-${item.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant="secondary">
                              <Building2 className="w-3 h-3 mr-1" />
                              {item.siteType}
                            </Badge>
                            {improvement > 0 && (
                              <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Улучшение на {improvement}%
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl md:text-2xl">
                            {item.title}
                          </CardTitle>
                          {item.clientName && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.clientName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">До</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {item.beforeScore}%
                            </p>
                          </div>
                          <div className="text-2xl text-muted-foreground">→</div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">После</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {item.afterScore}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {item.issues && item.issues.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              Выявленные проблемы
                            </h4>
                            <ul className="space-y-2">
                              {item.issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.solutions && item.solutions.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-blue-500" />
                              Решения
                            </h4>
                            <ul className="space-y-2">
                              {item.solutions.map((solution, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                  <span>{solution}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {item.testimonial && (
                        <div className="bg-muted/50 rounded-md p-4 mt-4">
                          <Quote className="h-5 w-5 text-muted-foreground mb-2" />
                          <p className="italic text-muted-foreground">
                            "{item.testimonial}"
                          </p>
                          {item.clientName && (
                            <p className="text-sm mt-2 font-medium">
                              — {item.clientName}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Хотите стать следующим успешным кейсом?
            </p>
            <Link href="/#audit">
              <Button size="lg" data-testid="button-start-audit">
                Проверить свой сайт
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
