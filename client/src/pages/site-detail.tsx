import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ArrowLeft,
  Globe,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  AlertOctagon,
  CreditCard,
  Loader2,
  Download,
  Calendar,
  Eye,
  Construction,
} from "lucide-react";
import type { UserSite, SiteAudit, AuditFinding } from "@shared/schema";

interface AuditWithFindings extends SiteAudit {
  findings?: AuditFinding[];
  site?: UserSite;
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const fetchWithAuth = async (url: string) => {
    const token = localStorage.getItem("userToken");
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  };

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setLocation("/auth");
    }
  }, [setLocation]);

  const { data: site, isLoading: siteLoading } = useQuery<UserSite>({
    queryKey: ["/api/user/sites", id],
    enabled: !!id,
    queryFn: () => fetchWithAuth(`/api/user/sites/${id}`),
  });

  const { data: audits, isLoading: auditsLoading } = useQuery<SiteAudit[]>({
    queryKey: ["/api/user/sites", id, "audits"],
    enabled: !!id,
    queryFn: () => fetchWithAuth(`/api/user/sites/${id}/audits`),
  });

  const { data: publicSettings } = useQuery<{ monitoringComingSoon?: boolean }>({
    queryKey: ["/api/settings/public"],
  });

  const latestAudit = audits?.[0];

  const getStatusColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (score >= 50) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  };

  const getStatusIcon = (score: number | null | undefined) => {
    if (score === null || score === undefined) return <Clock className="h-6 w-6" />;
    if (score >= 80) return <CheckCircle2 className="h-6 w-6" />;
    if (score >= 50) return <AlertTriangle className="h-6 w-6" />;
    return <AlertCircle className="h-6 w-6" />;
  };

  const getStatusText = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "Ожидает проверки";
    if (score >= 80) return "Соответствует";
    if (score >= 50) return "Частичное соответствие";
    return "Не соответствует";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Критический</Badge>;
      case "high":
        return <Badge className="bg-orange-600 text-white">Высокий</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600 text-white">Средний</Badge>;
      case "low":
        return <Badge variant="secondary">Низкий</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (siteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Сайт не найден</p>
            <Link href="/cabinet">
              <Button variant="ghost" className="mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться в кабинет
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4 flex-wrap">
          <Link href="/cabinet">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">Help152FZ</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-full ${getStatusColor(latestAudit?.overallScore)}`}>
                  {getStatusIcon(latestAudit?.overallScore)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{site.displayName || site.url}</h1>
                    <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground" data-testid="link-site-url-detail">
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                  <p className="text-muted-foreground">{site.url}</p>
                  <Badge variant="outline" className="mt-2">
                    {getStatusText(latestAudit?.overallScore)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center w-full md:w-auto">
                <div>
                  <p className="text-2xl font-bold">{latestAudit?.overallScore ?? "—"}%</p>
                  <p className="text-xs text-muted-foreground">Общий балл</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAudit?.law149Score ?? "—"}%</p>
                  <p className="text-xs text-muted-foreground">149-ФЗ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestAudit?.law152Score ?? "—"}%</p>
                  <p className="text-xs text-muted-foreground">152-ФЗ</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Eye className="h-4 w-4 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <FileText className="h-4 w-4 mr-2" />
              Отчёты
            </TabsTrigger>
            <TabsTrigger value="violations" data-testid="tab-violations">
              <AlertOctagon className="h-4 w-4 mr-2" />
              Нарушения
            </TabsTrigger>
            <TabsTrigger value="subscription" data-testid="tab-subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Подписка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Соответствие 149-ФЗ</CardTitle>
                  <CardDescription>Закон об информации</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold">{latestAudit?.law149Score ?? 0}%</span>
                      <Badge variant="outline">{getStatusText(latestAudit?.law149Score)}</Badge>
                    </div>
                    <Progress value={latestAudit?.law149Score ?? 0} className="h-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Статус: {latestAudit?.law149Status === "ok" ? "Соответствует" : latestAudit?.law149Status === "warning" ? "Есть замечания" : latestAudit?.law149Status === "critical" ? "Критические нарушения" : "Не проверено"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Соответствие 152-ФЗ</CardTitle>
                  <CardDescription>Закон о персональных данных</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold">{latestAudit?.law152Score ?? 0}%</span>
                      <Badge variant="outline">{getStatusText(latestAudit?.law152Score)}</Badge>
                    </div>
                    <Progress value={latestAudit?.law152Score ?? 0} className="h-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Статус: {latestAudit?.law152Status === "ok" ? "Соответствует" : latestAudit?.law152Status === "warning" ? "Есть замечания" : latestAudit?.law152Status === "critical" ? "Критические нарушения" : "Не проверено"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {latestAudit && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Последний аудит</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(latestAudit.createdAt!).toLocaleDateString("ru-RU")}</span>
                    </div>
                    <Badge variant="outline">{latestAudit.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {!latestAudit && (
              <Card className="mt-6">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Аудит не проводился</h3>
                  <p className="text-muted-foreground mb-4">
                    Закажите проверку сайта на соответствие требованиям законодательства
                  </p>
                  <Link href="/payment">
                    <Button data-testid="button-order-audit">Заказать аудит</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>История отчётов</CardTitle>
                <CardDescription>Все проведённые аудиты сайта</CardDescription>
              </CardHeader>
              <CardContent>
                {auditsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : !audits || audits.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Нет доступных отчётов</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {audits.map((audit) => (
                      <Card key={audit.id} data-testid={`card-audit-${audit.id}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${getStatusColor(audit.overallScore)}`}>
                                {getStatusIcon(audit.overallScore)}
                              </div>
                              <div>
                                <p className="font-medium">
                                  Аудит от {new Date(audit.createdAt!).toLocaleDateString("ru-RU")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Общий балл: {audit.overallScore}% | 149-ФЗ: {audit.law149Score ?? 0}% | 152-ФЗ: {audit.law152Score ?? 0}%
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{audit.status}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle>Нарушения</CardTitle>
                <CardDescription>Список обнаруженных нарушений требований законодательства</CardDescription>
              </CardHeader>
              <CardContent>
                {!latestAudit ? (
                  <div className="text-center py-8">
                    <AlertOctagon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Аудит не проводился</p>
                  </div>
                ) : latestAudit.law149Status === "ok" && latestAudit.law152Status === "ok" ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">Нарушения не обнаружены</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={`p-4 rounded-lg ${latestAudit.law149Status === "critical" ? "bg-red-100 dark:bg-red-900/30" : latestAudit.law149Status === "warning" ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                        <h4 className="font-medium mb-1">149-ФЗ</h4>
                        <p className="text-sm text-muted-foreground">
                          {latestAudit.law149Status === "critical" ? "Критические нарушения" : latestAudit.law149Status === "warning" ? "Есть замечания" : "Соответствует"}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${latestAudit.law152Status === "critical" ? "bg-red-100 dark:bg-red-900/30" : latestAudit.law152Status === "warning" ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                        <h4 className="font-medium mb-1">152-ФЗ</h4>
                        <p className="text-sm text-muted-foreground">
                          {latestAudit.law152Status === "critical" ? "Критические нарушения" : latestAudit.law152Status === "warning" ? "Есть замечания" : "Соответствует"}
                        </p>
                      </div>
                    </div>
                    {latestAudit.summary && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Сводка</h4>
                        <p className="text-sm text-muted-foreground">{latestAudit.summary}</p>
                      </div>
                    )}
                    {latestAudit.recommendations && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Рекомендации</h4>
                        <p className="text-sm text-muted-foreground">{latestAudit.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Подписка на мониторинг</CardTitle>
                <CardDescription>Настройте регулярную проверку соответствия</CardDescription>
              </CardHeader>
              <CardContent>
                {publicSettings?.monitoringComingSoon !== false ? (
                  <div className="text-center py-8">
                    <Construction className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="text-lg font-medium">В разработке</h3>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Подписка не активна</h3>
                    <p className="text-muted-foreground mb-4">
                      Оформите подписку для автоматической проверки сайта
                    </p>
                    <Link href="/payment">
                      <Button data-testid="button-subscribe">Оформить подписку</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
