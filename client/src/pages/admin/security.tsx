import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Shield,
  Search,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Download,
  RefreshCw,
  Lock,
  ScrollText,
  Server,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityCheck {
  id: string;
  nameRu: string;
  status: "pass" | "fail" | "warn" | "info";
  value: string;
  descriptionRu: string;
  weight: number;
}

interface SecurityCategory {
  name: string;
  nameRu: string;
  score: number;
  maxScore: number;
  checks: SecurityCheck[];
}

interface SecurityRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  titleRu: string;
  descriptionRu: string;
  npaReference: string;
}

interface SecurityScanResult {
  url: string;
  timestamp: string;
  overallScore: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: SecurityCategory[];
  recommendations: SecurityRecommendation[];
  owaspMapping: Array<{ id: string; name: string; status: string }>;
  fstekMapping: Array<{ group: string; measure: string; status: string }>;
  gostMapping: Array<{ area: string; requirement: string; status: string }>;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogStats {
  totalToday: number;
  errorCount: number;
  securityCount: number;
  warnCount: number;
}

interface DocTemplate {
  id: string;
  name: string;
  description: string;
  npaBase: string;
}

interface IntegrationMeta {
  id: string;
  name: string;
  vendor: string;
  description: string;
  category: string;
}

interface BruteForceConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pass":
    case "compliant":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "fail":
    case "non_compliant":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "warn":
    case "partial":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-500 text-white",
    B: "bg-blue-500 text-white",
    C: "bg-yellow-500 text-black",
    D: "bg-orange-500 text-white",
    F: "bg-red-500 text-white",
  };
  return (
    <span className={cn("inline-flex items-center justify-center w-10 h-10 rounded-md text-lg font-bold", colors[grade] || "bg-muted")}>
      {grade}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };
  const labels: Record<string, string> = {
    critical: "Критический",
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
  };
  return <Badge variant="outline" className={cn("text-xs", variants[priority])}>{labels[priority]}</Badge>;
}

function ScannerTab() {
  const [scanUrl, setScanUrl] = useState("");
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const { toast } = useToast();

  const scanMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/admin/security/scan", { url });
      return res.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      toast({ title: "Сканирование завершено", description: `Оценка: ${data.grade} (${data.overallScore}/${data.maxScore})` });
    },
    onError: () => {
      toast({ title: "Ошибка сканирования", description: "Не удалось выполнить сканирование", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Сканер безопасности
          </CardTitle>
          <CardDescription>Анализ безопасности веб-сайта: заголовки, TLS, CSP, cookies, CORS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="https://example.com"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              className="flex-1 min-w-[250px]"
              data-testid="input-scan-url"
            />
            <Button
              onClick={() => scanMutation.mutate(scanUrl)}
              disabled={!scanUrl.trim() || scanMutation.isPending}
              data-testid="button-start-scan"
            >
              {scanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Сканировать
            </Button>
          </div>
        </CardContent>
      </Card>

      {scanResult && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Результаты: {scanResult.url}</CardTitle>
                  <CardDescription>{new Date(scanResult.timestamp).toLocaleString("ru-RU")}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{scanResult.overallScore}/{scanResult.maxScore}</div>
                    <div className="text-sm text-muted-foreground">баллов</div>
                  </div>
                  <GradeBadge grade={scanResult.grade} />
                </div>
              </div>
            </CardHeader>
          </Card>

          {scanResult.categories.map((cat) => (
            <Card key={cat.name}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">{cat.nameRu}</CardTitle>
                  <Badge variant="outline">{cat.score}/{cat.maxScore}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cat.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-3 p-3 rounded-md border">
                      <StatusIcon status={check.status} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{check.nameRu}</div>
                        <div className="text-xs text-muted-foreground mt-1">{check.descriptionRu}</div>
                        <div className="text-xs mt-1 font-mono break-all">{check.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {scanResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Рекомендации</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-md border">
                      <PriorityBadge priority={rec.priority} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{rec.titleRu}</div>
                        <div className="text-xs text-muted-foreground mt-1">{rec.descriptionRu}</div>
                        <div className="text-xs text-muted-foreground mt-1 italic">{rec.npaReference}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">OWASP Top 10</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanResult.owaspMapping.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{m.id}: {m.name}</span>
                      <StatusIcon status={m.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ФСТЭК</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanResult.fstekMapping.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{m.group}: {m.measure}</span>
                      <StatusIcon status={m.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ГОСТ Р 57580</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanResult.gostMapping.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{m.area}: {m.requirement}</span>
                      <StatusIcon status={m.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function LogsTab() {
  const [logType, setLogType] = useState("all");
  const [logLimit, setLogLimit] = useState("50");

  const { data: stats, isLoading: statsLoading } = useQuery<LogStats>({
    queryKey: ["/api/admin/security/logs/stats"],
  });

  const { data: logs, isLoading: logsLoading, error: logsError, refetch } = useQuery<LogEntry[]>({
    queryKey: ["/api/admin/security/logs", logType, logLimit],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/security/logs?type=${logType}&limit=${logLimit}`);
      if (!res.ok) throw new Error("Ошибка загрузки логов");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.totalToday || 0}</div>
            <div className="text-xs text-muted-foreground">Всего за сегодня</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{statsLoading ? "..." : stats?.errorCount || 0}</div>
            <div className="text-xs text-muted-foreground">Ошибки</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-500">{statsLoading ? "..." : stats?.securityCount || 0}</div>
            <div className="text-xs text-muted-foreground">Безопасность</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{statsLoading ? "..." : stats?.warnCount || 0}</div>
            <div className="text-xs text-muted-foreground">Предупреждения</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Журнал событий
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="w-[150px]" data-testid="select-log-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все логи</SelectItem>
                  <SelectItem value="security">Безопасность</SelectItem>
                  <SelectItem value="error">Ошибки</SelectItem>
                </SelectContent>
              </Select>
              <Select value={logLimit} onValueChange={setLogLimit}>
                <SelectTrigger className="w-[100px]" data-testid="select-log-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-logs" aria-label="Обновить логи">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logsError ? (
            <div className="text-center py-8 text-destructive">Ошибка загрузки логов</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Логи отсутствуют</div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-auto">
              {logs.map((log, i) => {
                const levelColor: Record<string, string> = {
                  error: "text-red-500",
                  warn: "text-yellow-500",
                  security: "text-purple-500",
                  info: "text-blue-500",
                  debug: "text-muted-foreground",
                };
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded text-xs font-mono border-b last:border-b-0">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString("ru-RU") : ""}
                    </span>
                    <span className={cn("uppercase font-bold w-[65px] shrink-0", levelColor[log.level] || "text-muted-foreground")}>
                      {log.level}
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocGeneratorTab() {
  const [framework, setFramework] = useState("");
  const [orgName, setOrgName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [docScanUrl, setDocScanUrl] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);
  const { toast } = useToast();

  const { data: templates, isLoading: templatesLoading } = useQuery<DocTemplate[]>({
    queryKey: ["/api/admin/security/doc-templates"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/security/doc-generate", {
        framework,
        organizationName: orgName,
        systemName,
        scanUrl: docScanUrl || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedDoc(data);
      toast({ title: "Документ сгенерирован" });
    },
    onError: () => {
      toast({ title: "Ошибка генерации", variant: "destructive" });
    },
  });

  const handleDownload = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedDoc.title || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Генератор документов безопасности
          </CardTitle>
          <CardDescription>Создание регуляторных документов на основе шаблонов НПА</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-template">Шаблон документа</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger id="doc-template" data-testid="select-doc-template">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <SelectItem value="_loading">Загрузка...</SelectItem>
                  ) : (
                    templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {framework && templates && (
                <p className="text-xs text-muted-foreground">
                  {templates.find((t) => t.id === framework)?.description}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-scan-url">URL для сканирования (необязательно)</Label>
              <Input
                id="doc-scan-url"
                placeholder="https://example.com"
                value={docScanUrl}
                onChange={(e) => setDocScanUrl(e.target.value)}
                data-testid="input-doc-scan-url"
              />
              <p className="text-xs text-muted-foreground">Если указан, результаты сканирования будут добавлены в документ</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-org-name">Название организации</Label>
              <Input
                id="doc-org-name"
                placeholder='ООО "Компания"'
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-system-name">Название системы</Label>
              <Input
                id="doc-system-name"
                placeholder="Информационная система ПДн"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                data-testid="input-system-name"
              />
            </div>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!framework || !orgName || !systemName || generateMutation.isPending}
            data-testid="button-generate-doc"
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Сгенерировать
          </Button>
        </CardContent>
      </Card>

      {generatedDoc && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">{generatedDoc.title}</CardTitle>
                <CardDescription>НПА: {generatedDoc.npaBase}</CardDescription>
              </div>
              <Button variant="outline" onClick={handleDownload} data-testid="button-download-doc">
                <Download className="h-4 w-4 mr-2" />
                Скачать .md
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none max-h-[400px] overflow-auto p-4 rounded-md border bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs">{generatedDoc.content}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IntegrationsTab() {
  const [selectedIntegration, setSelectedIntegration] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const { data: integrations, isLoading } = useQuery<IntegrationMeta[]>({
    queryKey: ["/api/admin/security/integrations"],
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/security/integrations/check", {
        integrationId: selectedIntegration,
        apiUrl,
        apiKey,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Подключено" : "Не подключено",
        description: data.message || (data.connected ? "Интеграция активна" : "Проверьте параметры подключения"),
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({ title: "Ошибка проверки", variant: "destructive" });
    },
  });

  const configMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/security/integrations/config", {
        integrationId: selectedIntegration,
        apiUrl,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([data.config], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siem-config-${selectedIntegration}.conf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Конфигурация сгенерирована" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            ИБ-интеграции
          </CardTitle>
          <CardDescription>Подключение средств защиты информации (SIEM, WAF, Сканеры)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations?.map((integ) => (
                <div
                  key={integ.id}
                  className={cn(
                    "p-4 rounded-md border cursor-pointer transition-colors",
                    selectedIntegration === integ.id ? "border-primary bg-primary/5" : "hover-elevate"
                  )}
                  onClick={() => setSelectedIntegration(integ.id)}
                  data-testid={`card-integration-${integ.id}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{integ.name}</span>
                    <Badge variant="outline" className="text-xs">{integ.category}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{integ.vendor}</div>
                  <div className="text-xs text-muted-foreground mt-1">{integ.description}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedIntegration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Настройка: {integrations?.find((i) => i.id === selectedIntegration)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="integ-api-url">URL API</Label>
                <Input
                  id="integ-api-url"
                  placeholder="https://api.example.com"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  data-testid="input-integration-api-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="integ-api-key">API Key</Label>
                <Input
                  id="integ-api-key"
                  type="password"
                  placeholder="Ключ API"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-integration-api-key"
                />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => checkMutation.mutate()}
                disabled={!apiUrl || !apiKey || checkMutation.isPending}
                data-testid="button-check-integration"
              >
                {checkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                Проверить подключение
              </Button>
              <Button
                variant="outline"
                onClick={() => configMutation.mutate()}
                disabled={!apiUrl || configMutation.isPending}
                data-testid="button-generate-config"
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать конфигурацию
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BruteForceTab() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<BruteForceConfig>({
    queryKey: ["/api/admin/security/brute-force/config"],
  });

  const [maxAttempts, setMaxAttempts] = useState("");
  const [windowMinutes, setWindowMinutes] = useState("");
  const [lockoutMinutes, setLockoutMinutes] = useState("");

  const isInitialized = config && !maxAttempts && !windowMinutes && !lockoutMinutes;
  const displayMaxAttempts = maxAttempts || String(config?.maxAttempts || 5);
  const displayWindowMinutes = windowMinutes || String(config?.windowMinutes || 15);
  const displayLockoutMinutes = lockoutMinutes || String(config?.lockoutMinutes || 15);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/security/brute-force/config", {
        maxAttempts: parseInt(displayMaxAttempts),
        windowMinutes: parseInt(displayWindowMinutes),
        lockoutMinutes: parseInt(displayLockoutMinutes),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/brute-force/config"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Защита от перебора паролей
          </CardTitle>
          <CardDescription>Настройка ограничений на количество попыток входа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bf-max-attempts">Максимум попыток</Label>
              <Input
                id="bf-max-attempts"
                type="number"
                min={1}
                max={20}
                value={displayMaxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                data-testid="input-max-attempts"
              />
              <p className="text-xs text-muted-foreground">Количество неудачных попыток до блокировки</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-window">Окно отслеживания (мин)</Label>
              <Input
                id="bf-window"
                type="number"
                min={1}
                max={60}
                value={displayWindowMinutes}
                onChange={(e) => setWindowMinutes(e.target.value)}
                data-testid="input-window-minutes"
              />
              <p className="text-xs text-muted-foreground">Период, в течение которого считаются попытки</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-lockout">Длительность блокировки (мин)</Label>
              <Input
                id="bf-lockout"
                type="number"
                min={1}
                max={120}
                value={displayLockoutMinutes}
                onChange={(e) => setLockoutMinutes(e.target.value)}
                data-testid="input-lockout-minutes"
              />
              <p className="text-xs text-muted-foreground">Время блокировки после превышения лимита</p>
            </div>
          </div>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            data-testid="button-save-brute-force"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Сохранить
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSecurity() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Безопасность
        </h1>
        <p className="text-muted-foreground">Сканер, логи, документы, интеграции ИБ</p>
      </div>

      <Tabs defaultValue="scanner" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="scanner" data-testid="tab-scanner">
            <Search className="h-4 w-4 mr-1" />
            Сканер
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <ScrollText className="h-4 w-4 mr-1" />
            Логи
          </TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs">
            <FileText className="h-4 w-4 mr-1" />
            Документы
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Server className="h-4 w-4 mr-1" />
            ИБ-интеграции
          </TabsTrigger>
          <TabsTrigger value="brute-force" data-testid="tab-brute-force">
            <Lock className="h-4 w-4 mr-1" />
            Brute-force
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          <ScannerTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
        <TabsContent value="docs">
          <DocGeneratorTab />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="brute-force">
          <BruteForceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
