import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Activity,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  User,
  ExternalLink,
} from "lucide-react";

interface ExpressCheckDetail {
  id: number;
  token: string;
  websiteUrl: string;
  status: string;
  scorePercent: number | null;
  severity: string | null;
  passedCount: number | null;
  warningCount: number | null;
  failedCount: number | null;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  fullReportPurchased: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSeverityBadge(severity: string | null, score: number | null) {
  if (!severity || score === null) {
    return <Badge variant="secondary">Ожидание</Badge>;
  }
  if (severity === "low" || score >= 80) {
    return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Низкий риск</Badge>;
  }
  if (severity === "medium" || score >= 50) {
    return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">Средний риск</Badge>;
  }
  return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">Высокий риск</Badge>;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "processing":
      return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function AnalyticsExpressPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: checks, isLoading, error } = useQuery<ExpressCheckDetail[]>({
    queryKey: ["/api/admin/analytics/express-checks-detail"],
  });

  const filteredChecks = checks?.filter(check => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      check.websiteUrl.toLowerCase().includes(query) ||
      (check.userEmail && check.userEmail.toLowerCase().includes(query)) ||
      (check.userName && check.userName.toLowerCase().includes(query))
    );
  });

  const totalChecks = checks?.length || 0;
  const completedChecks = checks?.filter(c => c.status === "completed").length || 0;
  const purchasedReports = checks?.filter(c => c.fullReportPurchased).length || 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="default" data-testid="button-back-analytics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Activity className="h-6 w-6 text-blue-600" />
              Экспресс-проверки
            </h1>
            <p className="text-muted-foreground text-sm">Все проверки с информацией о пользователях</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего проверок</p>
                <p className="text-2xl font-bold">{totalChecks}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Завершено</p>
                <p className="text-2xl font-bold text-green-600">{completedChecks}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Куплено отчётов</p>
                <p className="text-2xl font-bold text-orange-600">{purchasedReports}</p>
              </div>
              <ExternalLink className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Все экспресс-проверки</CardTitle>
              <CardDescription>Сайт, результат, кто проверял и статус покупки</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по URL, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-checks"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              Ошибка загрузки данных
            </div>
          ) : filteredChecks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Проверки не найдены" : "Нет данных"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сайт</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                    <TableHead className="text-center">Результат</TableHead>
                    <TableHead className="text-center">Отчёт</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecks?.map((check) => (
                    <TableRow key={check.id} data-testid={`row-check-${check.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{check.websiteUrl}</p>
                            <p className="text-xs text-muted-foreground">ID: {check.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {check.userId ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm">{check.userName || check.userEmail}</p>
                              {check.userName && (
                                <p className="text-xs text-muted-foreground">{check.userEmail}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Гость</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(check.status)}
                          <span className="text-sm capitalize">{check.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {check.scorePercent !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold">{check.scorePercent}%</span>
                            {getSeverityBadge(check.severity, check.scorePercent)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {check.fullReportPurchased ? (
                          <Badge className="bg-green-500/10 text-green-600">Куплен</Badge>
                        ) : (
                          <Badge variant="secondary">Нет</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(check.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
