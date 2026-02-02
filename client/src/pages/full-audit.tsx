import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ShoppingCart, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Building2,
  Landmark,
  Users,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";

const siteTypes = [
  {
    id: "landing",
    name: "Лендинг",
    description: "Одностраничный сайт для продвижения услуг или продуктов",
    icon: Globe,
    criteria: 25,
    price: 4900,
    deadline: "2-3 дня"
  },
  {
    id: "ecommerce",
    name: "Интернет-магазин",
    description: "Сайт с каталогом товаров, корзиной и оплатой онлайн",
    icon: ShoppingCart,
    criteria: 45,
    price: 9900,
    deadline: "5-7 дней"
  },
  {
    id: "corporate",
    name: "Корпоративный сайт",
    description: "Многостраничный сайт компании с разделами и формами",
    icon: Building2,
    criteria: 35,
    price: 7900,
    deadline: "3-5 дней"
  },
  {
    id: "medical",
    name: "Медицинский сайт",
    description: "Сайты клиник, врачей, медицинских услуг",
    icon: Heart,
    criteria: 55,
    price: 14900,
    deadline: "7-10 дней"
  },
  {
    id: "education",
    name: "Образовательный сайт",
    description: "Школы, курсы, онлайн-образование",
    icon: GraduationCap,
    criteria: 40,
    price: 8900,
    deadline: "4-6 дней"
  },
  {
    id: "government",
    name: "Государственный сайт",
    description: "Сайты госорганов и муниципальных учреждений",
    icon: Landmark,
    criteria: 60,
    price: 19900,
    deadline: "10-14 дней"
  },
  {
    id: "hr",
    name: "HR-портал",
    description: "Сайты с вакансиями и сбором резюме",
    icon: Users,
    criteria: 35,
    price: 7900,
    deadline: "3-5 дней"
  },
  {
    id: "b2b",
    name: "B2B-платформа",
    description: "Сайты для бизнес-клиентов с личными кабинетами",
    icon: Briefcase,
    criteria: 50,
    price: 12900,
    deadline: "7-10 дней"
  }
];

export default function FullAuditPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Полный аудит</Badge>
              <h1 className="text-4xl font-bold mb-4">
                Выберите тип вашего сайта
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Получите детальный аудит по 60+ критериям с рекомендациями по исправлению 
                и готовыми документами для соответствия ФЗ-152 и ФЗ-149
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {siteTypes.map((type) => (
                <Card key={type.id} className="hover-elevate transition-all" data-testid={`card-sitetype-${type.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-primary/10 rounded-md">
                        <type.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">{type.criteria} критериев</Badge>
                    </div>
                    <CardTitle className="mt-4">{type.name}</CardTitle>
                    <CardDescription>{type.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{type.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>PDF-отчёт</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">
                          {type.price.toLocaleString("ru-RU")} ₽
                        </div>
                        <Link href={`/payment?type=full-audit&siteType=${type.id}`}>
                          <Button data-testid={`button-order-${type.id}`}>
                            Заказать
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <div className="grid gap-8 md:grid-cols-2 items-center">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Что входит в полный аудит?</h2>
                      <ul className="space-y-3">
                        {[
                          "Проверка по 60+ критериям ФЗ-152 и ФЗ-149",
                          "Анализ политики конфиденциальности",
                          "Проверка форм сбора данных",
                          "Аудит cookie-баннера и согласий",
                          "Расчёт потенциальных штрафов",
                          "Готовые документы для исправления",
                          "Консультация с юристом",
                          "PDF-отчёт с рекомендациями"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-center">
                      <div className="text-6xl font-bold text-primary mb-2">60+</div>
                      <div className="text-lg text-muted-foreground">критериев проверки</div>
                      <Link href="/">
                        <Button variant="outline" className="mt-6" data-testid="button-free-check">
                          Сначала бесплатная проверка
                        </Button>
                      </Link>
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
