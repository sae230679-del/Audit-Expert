import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Key,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GigaChatSettings {
  enabled: boolean;
  credentials: string;
  model: string;
  isPersonal: boolean;
  promptTemplate: string;
  maxTokens: number;
  lastTestAt: string | null;
  lastTestStatus: "success" | "error" | null;
}

const defaultPromptTemplate = `Проанализируй сайт на соответствие Федеральному закону №152-ФЗ "О персональных данных".

Проверь следующие критерии:
1. Наличие политики конфиденциальности
2. Согласие на обработку персональных данных
3. Cookie-уведомление
4. Безопасность передачи данных (HTTPS)
5. Условия хранения и удаления данных
6. Наличие ИНН/реквизитов оператора

Верни JSON ответ в формате:
{
  "score": число от 0 до 100,
  "findings": [
    {
      "category": "название категории",
      "status": "ok|warning|critical",
      "description": "описание",
      "recommendation": "рекомендация"
    }
  ],
  "summary": "краткий вывод"
}`;

export default function AdminGigaChat() {
  const { toast } = useToast();
  const [showCredentials, setShowCredentials] = useState(false);
  const [settings, setSettings] = useState<GigaChatSettings>({
    enabled: false,
    credentials: "",
    model: "GigaChat",
    isPersonal: true,
    promptTemplate: defaultPromptTemplate,
    maxTokens: 2000,
    lastTestAt: null,
    lastTestStatus: null,
  });

  const { data: savedSettings, isLoading } = useQuery<GigaChatSettings>({
    queryKey: ["/api/admin/settings/gigachat"],
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        ...savedSettings,
        promptTemplate: savedSettings.promptTemplate || defaultPromptTemplate,
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: GigaChatSettings) => {
      return apiRequest("POST", "/api/admin/settings/gigachat", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/gigachat"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/settings/gigachat/test", { credentials: settings.credentials, isPersonal: settings.isPersonal });
    },
    onSuccess: () => {
      toast({ title: "Подключение успешно", description: "GigaChat API работает корректно" });
      setSettings((s) => ({ ...s, lastTestAt: new Date().toISOString(), lastTestStatus: "success" }));
    },
    onError: () => {
      toast({ title: "Ошибка подключения", description: "Проверьте ключ авторизации", variant: "destructive" });
      setSettings((s) => ({ ...s, lastTestAt: new Date().toISOString(), lastTestStatus: "error" }));
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2" data-testid="heading-gigachat">
            <Sparkles className="h-6 w-6 text-primary" />
            GigaChat AI
          </h1>
          <p className="text-sm text-muted-foreground">Настройка интеграции с GigaChat от Сбера для AI-анализа сайтов</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          GigaChat используется для углублённого анализа сайтов на соответствие 152-ФЗ. 
          Получите ключ авторизации на{" "}
          <a 
            href="https://developers.sber.ru/studio/workspaces" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            developers.sber.ru
          </a>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="h-5 w-5" />
              Авторизация
            </CardTitle>
            <CardDescription>Ключ для доступа к GigaChat API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="gigachat-enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, enabled: checked }))}
                data-testid="switch-gigachat-enabled"
              />
              <Label htmlFor="gigachat-enabled" className="flex items-center gap-2">
                {settings.enabled ? (
                  <span className="text-green-600 flex items-center gap-1"><Zap className="h-4 w-4" />Включено</span>
                ) : (
                  <span className="text-muted-foreground">Отключено</span>
                )}
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">Ключ авторизации (Authorization Key)</Label>
              <div className="relative">
                <Input
                  id="credentials"
                  type={showCredentials ? "text" : "password"}
                  value={settings.credentials}
                  onChange={(e) => setSettings((s) => ({ ...s, credentials: e.target.value }))}
                  placeholder="Введите ключ авторизации..."
                  className="pr-10 font-mono text-sm"
                  data-testid="input-credentials"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Base64-кодированная строка Client ID:Secret</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is-personal"
                checked={settings.isPersonal}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, isPersonal: checked }))}
                data-testid="switch-personal"
              />
              <Label htmlFor="is-personal" className="text-sm">
                Персональный доступ (GIGACHAT_API_PERS)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Модель</Label>
              <Input
                id="model"
                value={settings.model}
                onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                placeholder="GigaChat"
                data-testid="input-model"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={!settings.credentials || testMutation.isPending}
                className="flex-1"
                data-testid="button-test-connection"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Проверить подключение
              </Button>
            </div>

            {settings.lastTestStatus && (
              <div className="flex items-center gap-2 text-sm">
                {settings.lastTestStatus === "success" ? (
                  <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Подключено</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ошибка</Badge>
                )}
                {settings.lastTestAt && (
                  <span className="text-muted-foreground text-xs">
                    {new Date(settings.lastTestAt).toLocaleString("ru-RU")}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Параметры анализа
            </CardTitle>
            <CardDescription>Настройки для AI-проверки сайтов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Максимум токенов</Label>
              <Input
                id="max-tokens"
                type="number"
                value={settings.maxTokens}
                onChange={(e) => setSettings((s) => ({ ...s, maxTokens: parseInt(e.target.value) || 2000 }))}
                min={100}
                max={8000}
                data-testid="input-max-tokens"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-template">Шаблон промпта</Label>
              <Textarea
                id="prompt-template"
                value={settings.promptTemplate}
                onChange={(e) => setSettings((s) => ({ ...s, promptTemplate: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
                data-testid="textarea-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Шаблон запроса для анализа сайтов. Используйте переменные: {"{url}"}, {"{content}"}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings((s) => ({ ...s, promptTemplate: defaultPromptTemplate }))}
              data-testid="button-reset-prompt"
            >
              Сбросить на стандартный
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}
