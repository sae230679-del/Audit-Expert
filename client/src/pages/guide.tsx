import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  BookOpen, 
  FileText, 
  Shield, 
  Scale,
  AlertTriangle,
  CheckCircle,
  Search,
  ChevronRight,
  ExternalLink
} from "lucide-react";

const sections = [
  {
    id: "basics",
    title: "Основы ФЗ-152",
    description: "Что такое персональные данные и кто является оператором",
    icon: BookOpen,
    articles: [
      { id: "what-is-pd", title: "Что такое персональные данные?" },
      { id: "who-is-operator", title: "Кто является оператором ПДн?" },
      { id: "categories-pd", title: "Категории персональных данных" },
      { id: "legal-grounds", title: "Правовые основания обработки" }
    ]
  },
  {
    id: "requirements",
    title: "Требования закона",
    description: "Обязательные требования для операторов персональных данных",
    icon: FileText,
    articles: [
      { id: "consent-requirements", title: "Требования к согласию" },
      { id: "privacy-policy", title: "Политика конфиденциальности" },
      { id: "rkn-notification", title: "Уведомление Роскомнадзора" },
      { id: "data-localization", title: "Локализация данных в РФ" }
    ]
  },
  {
    id: "website",
    title: "Требования к сайтам",
    description: "Что должно быть на сайте для соответствия закону",
    icon: Shield,
    articles: [
      { id: "forms-consent", title: "Согласие в формах сбора данных" },
      { id: "cookie-banner", title: "Cookie-баннер и уведомления" },
      { id: "documents-placement", title: "Размещение документов" },
      { id: "contact-info", title: "Контактная информация оператора" }
    ]
  },
  {
    id: "penalties",
    title: "Ответственность",
    description: "Штрафы и санкции за нарушение закона",
    icon: AlertTriangle,
    articles: [
      { id: "admin-penalties", title: "Административные штрафы" },
      { id: "criminal-liability", title: "Уголовная ответственность" },
      { id: "rkn-checks", title: "Проверки Роскомнадзора" },
      { id: "blocking-risk", title: "Риск блокировки сайта" }
    ]
  },
  {
    id: "fz149",
    title: "149-ФЗ для сайтов",
    description: "Требования закона об информации",
    icon: Scale,
    articles: [
      { id: "info-requirements", title: "Обязательная информация на сайте" },
      { id: "ecommerce-rules", title: "Правила для интернет-магазинов" },
      { id: "advertising-rules", title: "Реклама и маркировка" },
      { id: "content-rules", title: "Правила размещения контента" }
    ]
  },
  {
    id: "checklist",
    title: "Чек-листы",
    description: "Готовые чек-листы для проверки соответствия",
    icon: CheckCircle,
    articles: [
      { id: "checklist-landing", title: "Чек-лист для лендинга" },
      { id: "checklist-shop", title: "Чек-лист для интернет-магазина" },
      { id: "checklist-corporate", title: "Чек-лист для корпоративного сайта" },
      { id: "checklist-medical", title: "Чек-лист для медицинского сайта" }
    ]
  }
];

export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = sections.map(section => ({
    ...section,
    articles: section.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => 
    section.articles.length > 0 || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">База знаний</Badge>
              <h1 className="text-4xl font-bold mb-4">
                Справочник по ФЗ-152 и ФЗ-149
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Всё, что нужно знать о защите персональных данных 
                и требованиях к сайтам в России
              </p>
            </div>

            <div className="max-w-md mx-auto mb-12">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по базе знаний..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSections.map((section) => (
                <Card key={section.id} className="hover-elevate" data-testid={`card-section-${section.id}`}>
                  <CardHeader>
                    <div className="p-3 bg-primary/10 rounded-md w-fit">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="mt-4">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.articles.slice(0, 4).map((article) => (
                        <li key={article.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-between text-left h-auto py-2 px-3"
                            data-testid={`link-article-${article.id}`}
                          >
                            <span className="text-sm">{article.title}</span>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <div className="grid gap-8 md:grid-cols-2 items-center">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Нужна консультация?</h2>
                      <p className="text-muted-foreground mb-6">
                        Задайте вопрос нашему AI-консультанту или закажите 
                        консультацию с юристом по вопросам ФЗ-152
                      </p>
                      <div className="flex gap-4">
                        <Button data-testid="button-ai-chat">
                          AI-консультант
                        </Button>
                        <Button variant="outline" data-testid="button-lawyer">
                          Консультация юриста
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary mb-2">24/7</div>
                      <div className="text-muted-foreground">AI-консультант доступен круглосуточно</div>
                    </div>
                  </div>
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
