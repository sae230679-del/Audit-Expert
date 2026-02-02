import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Users, 
  Eye, 
  Clock, 
  FileText, 
  TrendingUp, 
  Monitor, 
  Smartphone, 
  Globe, 
  BarChart3,
  LineChart,
  Activity,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface AnalyticsMetrics {
  totalVisits: number;
  uniqueVisitors: number;
  totalPageViews: number;
  avgSessionDurationSeconds: number;
  newUsers: number;
  expressChecks: number;
  expressReportOrders: number;
  fullAuditOrders: number;
}

interface OverviewResponse {
  metrics: AnalyticsMetrics;
}

interface PageStats {
  pagePath: string;
  views: number;
  uniqueVisitors: number;
  avgDuration: number;
  avgScrollDepth: number;
}

interface PagesResponse {
  pages: PageStats[];
}

interface ExpressCheck {
  id: string;
  websiteUrl: string;
  websiteUrlNormalized?: string;
  email?: string;
  phone?: string;
  inn?: string;
  scorePercent: number | null;
  createdAt: string;
}

interface WebsiteStats {
  websiteUrl: string;
  checksCount: number;
  avgScore: number;
}

interface ExpressChecksResponse {
  total: number;
  checks: ExpressCheck[];
  byWebsite: WebsiteStats[];
}

interface ConversionItem {
  status: string;
  count: number;
  revenue: number;
}

interface ConversionsResponse {
  expressReports: ConversionItem[];
  fullAudits?: ConversionItem[];
  totalPaidPayments?: number;
}

interface TimelineItem {
  period: string;
  visits: number;
  uniqueVisitors: number;
}

interface TimelineResponse {
  visits: TimelineItem[];
}

interface DeviceStats {
  name: string;
  value: number;
}

interface DevicesResponse {
  byDevice: DeviceStats[];
  byBrowser: DeviceStats[];
  byOS: DeviceStats[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}м ${secs}с`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}ч ${remainingMins}м`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ru-RU").format(num);
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<string>("week");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<OverviewResponse>({
    queryKey: [`/api/admin/analytics/overview?period=${period}`],
  });

  const { data: pages, isLoading: pagesLoading } = useQuery<PagesResponse>({
    queryKey: [`/api/admin/analytics/pages?period=${period}&limit=20`],
    enabled: activeTab === "pages",
  });

  const { data: expressChecks, isLoading: expressLoading } = useQuery<ExpressChecksResponse>({
    queryKey: [`/api/admin/analytics/express-checks?period=${period}&limit=50`],
    enabled: activeTab === "express",
  });

  const { data: conversions, isLoading: conversionsLoading } = useQuery<ConversionsResponse>({
    queryKey: [`/api/admin/analytics/conversions?period=${period}`],
    enabled: activeTab === "conversions",
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery<TimelineResponse>({
    queryKey: [`/api/admin/analytics/timeline?period=${period}&groupBy=day`],
    enabled: activeTab === "overview",
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<DevicesResponse>({
    queryKey: [`/api/admin/analytics/devices?period=${period}`],
    enabled: activeTab === "devices",
  });

  const metrics = overview?.metrics;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="default" className="min-h-[44px] touch-manipulation" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Аналитика</h1>
            <p className="text-muted-foreground text-sm">Статистика посещений и конверсий</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]" data-testid="select-period">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Сегодня</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchOverview()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="pages" data-testid="tab-pages">
            <FileText className="h-4 w-4 mr-2" />
            Страницы
          </TabsTrigger>
          <TabsTrigger value="express" data-testid="tab-express">
            <Activity className="h-4 w-4 mr-2" />
            Проверки
          </TabsTrigger>
          <TabsTrigger value="conversions" data-testid="tab-conversions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Конверсии
          </TabsTrigger>
          <TabsTrigger value="devices" data-testid="tab-devices">
            <Monitor className="h-4 w-4 mr-2" />
            Устройства
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Посещения</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold" data-testid="metric-visits">{formatNumber(metrics?.totalVisits || 0)}</p>
                    )}
                  </div>
                  <Eye className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Уник. посетители</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold" data-testid="metric-unique">{formatNumber(metrics?.uniqueVisitors || 0)}</p>
                    )}
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Просмотры страниц</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold" data-testid="metric-pageviews">{formatNumber(metrics?.totalPageViews || 0)}</p>
                    )}
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ср. время на сайте</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold" data-testid="metric-duration">{formatDuration(metrics?.avgSessionDurationSeconds || 0)}</p>
                    )}
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/analytics/users">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Новые пользователи</p>
                      {overviewLoading ? (
                        <Skeleton className="h-8 w-20 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-green-600" data-testid="metric-new-users">{formatNumber(metrics?.newUsers || 0)}</p>
                      )}
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    Подробнее <ExternalLink className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/analytics/express">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Экспресс-проверки</p>
                      {overviewLoading ? (
                        <Skeleton className="h-8 w-20 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-blue-600" data-testid="metric-express">{formatNumber(metrics?.expressChecks || 0)}</p>
                      )}
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    Подробнее <ExternalLink className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/orders">
              <Card className="cursor-pointer hover-elevate transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Отчёты 900₽</p>
                      {overviewLoading ? (
                        <Skeleton className="h-8 w-20 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold text-orange-600" data-testid="metric-reports">{formatNumber(metrics?.expressReportOrders || 0)}</p>
                      )}
                    </div>
                    <FileText className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    Подробнее <ExternalLink className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Полные аудиты</p>
                    {overviewLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-purple-600" data-testid="metric-audits">{formatNumber(metrics?.fullAuditOrders || 0)}</p>
                    )}
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Посещения по дням
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : timeline?.visits?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeline.visits}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Посещения" />
                    <Area type="monotone" dataKey="uniqueVisitors" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Уникальные" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Нет данных за выбранный период
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Популярные страницы</CardTitle>
              <CardDescription>Топ-20 самых посещаемых страниц</CardDescription>
            </CardHeader>
            <CardContent>
              {pagesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : pages?.pages?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Страница</TableHead>
                      <TableHead className="text-right">Просмотры</TableHead>
                      <TableHead className="text-right">Уникальные</TableHead>
                      <TableHead className="text-right">Ср. время</TableHead>
                      <TableHead className="text-right">Скролл</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.pages.map((page: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm max-w-[300px] truncate">
                          {page.pagePath}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(page.views)}</TableCell>
                        <TableCell className="text-right">{formatNumber(page.uniqueVisitors)}</TableCell>
                        <TableCell className="text-right">{formatDuration(page.avgDuration)}</TableCell>
                        <TableCell className="text-right">{page.avgScrollDepth}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Нет данных за выбранный период
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="express" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Топ проверяемых сайтов</CardTitle>
                <CardDescription>Сайты с наибольшим количеством проверок</CardDescription>
              </CardHeader>
              <CardContent>
                {expressLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : expressChecks?.byWebsite?.length > 0 ? (
                  <div className="space-y-3">
                    {expressChecks.byWebsite.slice(0, 10).map((site: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-sm truncate">{site.websiteUrl || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary">{site.checksCount} пр.</Badge>
                          <Badge variant={site.avgScore >= 70 ? "default" : site.avgScore >= 40 ? "secondary" : "destructive"}>
                            {site.avgScore}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Статистика проверок</CardTitle>
                <CardDescription>Всего за период: {formatNumber(expressChecks?.total || 0)}</CardDescription>
              </CardHeader>
              <CardContent>
                {expressLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-muted-foreground">Всего проверок</p>
                        <p className="text-2xl font-bold text-blue-600">{formatNumber(expressChecks?.total || 0)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm text-muted-foreground">Уникальных сайтов</p>
                        <p className="text-2xl font-bold text-green-600">{formatNumber(expressChecks?.byWebsite?.length || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Последние проверки</CardTitle>
              <CardDescription>Детальная информация о проверках</CardDescription>
            </CardHeader>
            <CardContent>
              {expressLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : expressChecks?.checks?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Сайт</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>ИНН</TableHead>
                        <TableHead className="text-right">Оценка</TableHead>
                        <TableHead>Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expressChecks.checks.slice(0, 20).map((check: any) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate">
                            <a href={check.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                              {check.websiteUrlNormalized || check.websiteUrl}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="text-sm">{check.email || "—"}</TableCell>
                          <TableCell className="text-sm">{check.phone || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{check.inn || "—"}</TableCell>
                          <TableCell className="text-right">
                            {check.scorePercent !== null ? (
                              <Badge variant={check.scorePercent >= 70 ? "default" : check.scorePercent >= 40 ? "secondary" : "destructive"}>
                                {check.scorePercent}%
                              </Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(check.createdAt).toLocaleString("ru-RU")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Нет данных за выбранный период
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Отчёты 900₽</CardTitle>
              </CardHeader>
              <CardContent>
                {conversionsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-2">
                    {conversions?.expressReports?.map((r: any) => (
                      <div key={r.status} className="flex justify-between items-center">
                        <Badge variant={r.status === "completed" ? "default" : r.status === "paid" ? "secondary" : "outline"}>
                          {r.status}
                        </Badge>
                        <div className="text-right">
                          <span className="font-bold">{r.count}</span>
                          {r.revenue > 0 && <span className="text-muted-foreground text-sm ml-2">({formatNumber(r.revenue)}₽)</span>}
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Нет данных</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Полные аудиты</CardTitle>
              </CardHeader>
              <CardContent>
                {conversionsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-2">
                    {conversions?.fullAudits?.map((a: any) => (
                      <div key={a.status} className="flex justify-between items-center">
                        <Badge variant={a.status === "completed" ? "default" : a.status === "in_progress" ? "secondary" : "outline"}>
                          {a.status}
                        </Badge>
                        <span className="font-bold">{a.count}</span>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Нет данных</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Оплаченные платежи</CardTitle>
              </CardHeader>
              <CardContent>
                {conversionsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Количество:</span>
                      <span className="font-bold">{conversions?.totalPaidPayments?.count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Сумма:</span>
                      <span className="font-bold text-green-600">{formatNumber(conversions?.totalPaidPayments?.revenue || 0)} ₽</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Устройства
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : devices?.byDevice?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={devices.byDevice.filter((d: any) => d.deviceType)}
                        dataKey="count"
                        nameKey="deviceType"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name || "Другое"} ${(percent * 100).toFixed(0)}%`}
                      >
                        {devices.byDevice.map((_: any, idx: number) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Браузеры
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : devices?.byBrowser?.length > 0 ? (
                  <div className="space-y-2">
                    {devices.byBrowser.slice(0, 5).map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{b.browser || "Другой"}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${(b.count / devices.byBrowser[0].count) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }} 
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{b.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Операционные системы
                </CardTitle>
              </CardHeader>
              <CardContent>
                {devicesLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : devices?.byOS?.length > 0 ? (
                  <div className="space-y-2">
                    {devices.byOS.slice(0, 5).map((o: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{o.os || "Другая"}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${(o.count / devices.byOS[0].count) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length]
                              }} 
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{o.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
