import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqItem } from "@shared/schema";

const defaultFaqItems: FaqItem[] = [
  {
    id: "1",
    question: "Как долго занимает проверка?",
    answer: "Бесплатная экспресс-проверка занимает около 30 секунд. Полный аудит от экспертов выполняется в течение 1-3 рабочих дней в зависимости от выбранного пакета.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "2",
    question: "Что происходит с моими данными?",
    answer: "Мы собираем только URL сайта и email для отправки отчета. Все данные обрабатываются в соответствии с 152-ФЗ и хранятся на защищенных серверах в России. Вы можете запросить удаление данных в любой момент.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "3",
    question: "Какой пакет мне выбрать?",
    answer: "Выбор зависит от типа вашего сайта. Для лендингов подойдет базовый пакет, для интернет-магазинов рекомендуем расширенный с анализом платежных данных. Медицинские сайты требуют специализированного аудита.",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "4",
    question: "Чем отличается краткий и полный отчет?",
    answer: "Краткий отчет показывает общую картину соответствия по 9 критериям. Полный отчет за 900₽ содержит детальный анализ каждого нарушения, информацию о штрафах и конкретные рекомендации по исправлению.",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "5",
    question: "Можно ли проверять несколько сайтов?",
    answer: "Да, вы можете проверить неограниченное количество сайтов бесплатно. Для каждого сайта доступна покупка полного отчета или заказ экспертного аудита.",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "6",
    question: "Что входит в полный пакет документов?",
    answer: "Полный пакет включает: Политику конфиденциальности, Согласие на обработку ПДн, Договор-оферту, Политику cookies, инструкции по внедрению и внутреннюю документацию оператора.",
    sortOrder: 6,
    isActive: true,
  },
  {
    id: "7",
    question: "Какие способы оплаты доступны?",
    answer: "Мы принимаем оплату через СБП, ЮMoney, банковские карты российских банков и Tinkoff Pay. Все платежи защищены и обрабатываются через YooKassa.",
    sortOrder: 7,
    isActive: true,
  },
];

interface FaqSectionProps {
  items?: FaqItem[];
}

export function FaqSection({ items = defaultFaqItems }: FaqSectionProps) {
  const activeItems = items.filter((i) => i.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Часто задаваемые вопросы
          </h2>
          <p className="text-muted-foreground">
            Ответы на популярные вопросы о нашем сервисе
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {activeItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger
                className="text-left hover:no-underline py-4"
                data-testid={`faq-trigger-${item.id}`}
              >
                <span className="font-medium">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
