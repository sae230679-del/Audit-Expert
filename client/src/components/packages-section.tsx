import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import type { Package } from "@shared/schema";

const defaultPackages: Package[] = [
  {
    id: "1",
    name: "Лендинг",
    description: "Базовая проверка одностраничного сайта",
    price: 3900,
    features: ["Аудит по всем критериям", "Полный пакет документов", "Рекомендации", "Email поддержка 30 дней"],
    icon: "link",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "2",
    name: "Сайт-визитка",
    description: "Расширенная проверка небольшого сайта",
    price: 4900,
    features: ["Аудит по всем критериям", "Полный пакет документов", "Детальные рекомендации", "Email поддержка 30 дней"],
    icon: "building",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "3",
    name: "Корпоративный сайт",
    description: "Полный аудит корпоративного ресурса",
    price: 9900,
    features: ["Глубокий аудит", "Полный пакет документов", "План внедрения", "Приоритетная поддержка"],
    icon: "building-2",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "4",
    name: "Интернет-магазин",
    description: "Проверка с анализом платежных данных",
    price: 14900,
    features: ["Аудит платежей и ПДн", "Полный пакет документов", "Анализ e-commerce", "Приоритетная поддержка"],
    icon: "shopping-cart",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "5",
    name: "Медицинский сайт",
    description: "Строгий аудит медицинских данных",
    price: 17500,
    features: ["Аудит мед. данных", "Специальные политики", "Требования Минздрава", "VIP поддержка"],
    icon: "heart-pulse",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "6",
    name: "Корпоративный портал",
    description: "Максимальный аудит крупного ресурса",
    price: 19900,
    features: ["Полный enterprise-аудит", "Полный пакет документов", "Консультация эксперта", "VIP поддержка 90 дней"],
    icon: "globe",
    sortOrder: 6,
    isActive: true,
  },
];

interface PackagesSectionProps {
  packages?: Package[];
  onSelectPackage: (pkg: Package) => void;
}

export function PackagesSection({ packages = defaultPackages, onSelectPackage }: PackagesSectionProps) {
  const activePackages = packages.filter((p) => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <section id="packages" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">Пакеты услуг</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Выберите подходящий пакет для вашего типа сайта. Эксперты подготовят подробный отчет и полный комплект документов для внедрения.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePackages.map((pkg, index) => (
            <Card
              key={pkg.id}
              className={`relative hover-elevate ${
                index === 2 ? "border-primary/50 shadow-lg" : ""
              }`}
            >
              {index === 2 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Популярный
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-bold">
                    {pkg.price.toLocaleString("ru-RU")}
                  </span>
                  <span className="text-muted-foreground ml-1">₽</span>
                </div>

                <ul className="space-y-3">
                  {pkg.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={index === 2 ? "default" : "outline"}
                  onClick={() => onSelectPackage(pkg)}
                  data-testid={`button-package-${pkg.id}`}
                >
                  Заказать
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
