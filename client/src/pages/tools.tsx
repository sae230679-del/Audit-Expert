import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  FileText, 
  Shield, 
  Cookie,
  FileCheck,
  Scale,
  ClipboardCheck,
  FileSignature,
  BookOpen,
  MessageSquare,
  Search,
  FileWarning,
  ArrowRight
} from "lucide-react";

const tools = [
  {
    id: "privacy-policy",
    name: "Генератор политики конфиденциальности",
    description: "Создайте юридически корректную политику конфиденциальности для вашего сайта",
    icon: FileText,
    price: 1900,
    popular: true
  },
  {
    id: "cookie-policy",
    name: "Политика Cookie",
    description: "Документ о использовании файлов cookie на сайте",
    icon: Cookie,
    price: 990,
    popular: false
  },
  {
    id: "consent-form",
    name: "Форма согласия на обработку ПДн",
    description: "Шаблон согласия для форм сбора персональных данных",
    icon: FileCheck,
    price: 790,
    popular: true
  },
  {
    id: "user-agreement",
    name: "Пользовательское соглашение",
    description: "Договор-оферта для пользователей сайта",
    icon: FileSignature,
    price: 2900,
    popular: false
  },
  {
    id: "offer",
    name: "Публичная оферта",
    description: "Договор публичной оферты для интернет-магазинов",
    icon: Scale,
    price: 3900,
    popular: true
  },
  {
    id: "rkn-check",
    name: "Проверка в реестре РКН",
    description: "Проверка регистрации оператора персональных данных в Роскомнадзоре",
    icon: Search,
    price: 490,
    popular: false
  },
  {
    id: "audit-report",
    name: "Расширенный PDF-отчёт",
    description: "Детальный отчёт по всем нарушениям с расчётом штрафов",
    icon: ClipboardCheck,
    price: 1490,
    popular: false
  },
  {
    id: "legal-docs-pack",
    name: "Пакет документов для сайта",
    description: "Полный комплект документов: политика, согласия, оферта",
    icon: BookOpen,
    price: 5900,
    popular: true
  },
  {
    id: "ai-consultation",
    name: "AI-консультация по ФЗ-152",
    description: "Задайте вопросы AI-помощнику о требованиях закона",
    icon: MessageSquare,
    price: 290,
    popular: false
  },
  {
    id: "penalty-calc",
    name: "Калькулятор штрафов",
    description: "Расчёт потенциальных штрафов за нарушения ФЗ-152",
    icon: FileWarning,
    price: 0,
    popular: false
  },
  {
    id: "security-audit",
    name: "Аудит безопасности",
    description: "Проверка технических мер защиты персональных данных",
    icon: Shield,
    price: 4900,
    popular: false
  }
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Инструменты</Badge>
              <h1 className="text-4xl font-bold mb-4">
                Инструменты для соответствия ФЗ-152
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Готовые решения для приведения вашего сайта в соответствие 
                с требованиями законодательства о персональных данных
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <Card key={tool.id} className="hover-elevate transition-all relative" data-testid={`card-tool-${tool.id}`}>
                  {tool.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-primary">
                      Популярно
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="p-3 bg-primary/10 rounded-md w-fit">
                      <tool.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="mt-4">{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {tool.price === 0 ? (
                          <span className="text-primary">Бесплатно</span>
                        ) : (
                          <>{tool.price.toLocaleString("ru-RU")} ₽</>
                        )}
                      </div>
                      <Link href={`/payment?tool=${tool.id}`}>
                        <Button 
                          variant={tool.price === 0 ? "outline" : "default"}
                          data-testid={`button-buy-${tool.id}`}
                        >
                          {tool.price === 0 ? "Открыть" : "Купить"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Card className="bg-muted/50">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">Нужна помощь в выборе?</h2>
                  <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Начните с бесплатной экспресс-проверки вашего сайта, 
                    и мы подскажем какие инструменты вам понадобятся
                  </p>
                  <Link href="/">
                    <Button size="lg" data-testid="button-free-audit">
                      Бесплатная проверка
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
