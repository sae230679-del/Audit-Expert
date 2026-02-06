import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Shield, FileText, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Package } from "@shared/schema";
import { PACKAGE_TEMPLATES } from "@/lib/package-templates";

const defaultPackages: Package[] = PACKAGE_TEMPLATES.map((t, i) => ({
  id: String(i + 1),
  name: t.name,
  description: t.description,
  price: t.price,
  features: t.features,
  criteria: t.criteria,
  deadline: t.deadline,
  icon: null,
  sortOrder: t.sortOrder,
  isActive: true,
}));

interface PackagesSectionProps {
  packages?: Package[];
  onSelectPackage: (pkg: Package) => void;
}

export function PackagesSection({ packages = defaultPackages, onSelectPackage }: PackagesSectionProps) {
  const activePackages = packages.filter((p) => p.isActive).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  return (
    <section id="packages" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="text-packages-heading">Пакеты услуг</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Выберите подходящий пакет для вашего типа сайта. Эксперты подготовят подробный отчёт и полный комплект документов для внедрения.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePackages.map((pkg, index) => {
            const isPopular = index === 2;
            const isExpanded = expandedPkg === pkg.id;
            const featuresCount = pkg.features?.length || 0;
            const criteriaCount = pkg.criteria?.length || 0;
            const serviceItems = pkg.features?.slice(0, 4) || [];
            const documentItems = pkg.features?.slice(4) || [];

            return (
              <Card
                key={pkg.id}
                className={`relative hover-elevate flex flex-col ${
                  isPopular ? "border-primary/50 shadow-lg" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Популярный
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 space-y-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold">
                      {pkg.price.toLocaleString("ru-RU")}
                    </span>
                    <span className="text-muted-foreground ml-1 text-lg">&#8381;</span>
                  </div>

                  {pkg.deadline && (
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{pkg.deadline}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4">
                    {criteriaCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span>{criteriaCount} критериев</span>
                      </div>
                    )}
                    {featuresCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>{featuresCount} позиций</span>
                      </div>
                    )}
                  </div>

                  {serviceItems.length > 0 && (
                    <ul className="space-y-2 flex-1">
                      {serviceItems.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {documentItems.length > 0 && !isExpanded && (
                        <li className="text-sm text-muted-foreground pl-6">
                          + {documentItems.length} документов в комплекте
                        </li>
                      )}
                    </ul>
                  )}

                  {isExpanded && (
                    <div className="space-y-3 border-t pt-3">
                      {documentItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Документы в комплекте:
                          </p>
                          <ul className="space-y-1.5">
                            {documentItems.map((doc, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <span>{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {pkg.criteria && pkg.criteria.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Критерии проверки:
                          </p>
                          <ul className="space-y-1.5">
                            {pkg.criteria.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Shield className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {(documentItems.length > 0 || (pkg.criteria && pkg.criteria.length > 0)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                      data-testid={`button-details-${pkg.id}`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Свернуть
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Подробнее
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => onSelectPackage(pkg)}
                    data-testid={`button-package-${pkg.id}`}
                  >
                    Заказать
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
