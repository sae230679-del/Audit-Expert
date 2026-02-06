import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Save,
  Loader2,
  Send,
  Sparkles,
  Settings,
  MessageCircle,
  Zap,
} from "lucide-react";

interface AiConsultantSettings {
  aiConsultantEnabled: boolean;
  aiConsultantProvider: string;
  aiConsultantSystemPrompt: string;
  aiConsultantWelcomeMessage: string;
  aiConsultantMaxTokens: number;
}

interface SiteSettings {
  gigachatEnabled?: boolean;
  yandexGptEnabled?: boolean;
  openaiEnabled?: boolean;
}

const providerLabels: Record<string, string> = {
  gigachat: "GigaChat (Сбер)",
  yandex: "YandexGPT",
  openai: "OpenAI",
};

export default function AdminAiConsultant() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AiConsultantSettings>({
    aiConsultantEnabled: false,
    aiConsultantProvider: "gigachat",
    aiConsultantSystemPrompt: "",
    aiConsultantWelcomeMessage: "",
    aiConsultantMaxTokens: 1024,
  });
  const [testQuestion, setTestQuestion] = useState("");
  const [testResponse, setTestResponse] = useState("");

  const { data: savedSettings, isLoading } = useQuery<AiConsultantSettings>({
    queryKey: ["/api/admin/ai-consultant/settings"],
  });

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: AiConsultantSettings) => {
      return apiRequest("PUT", "/api/admin/ai-consultant/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-consultant/settings"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/ai/chat", { question });
      return res.json();
    },
    onSuccess: (data: any) => {
      setTestResponse(data.answer || JSON.stringify(data, null, 2));
    },
    onError: () => {
      setTestResponse("Ошибка при отправке тестового вопроса. Проверьте настройки провайдера.");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const isProviderConfigured = (provider: string): boolean => {
    if (!siteSettings) return false;
    switch (provider) {
      case "gigachat":
        return !!siteSettings.gigachatEnabled;
      case "yandex":
        return !!siteSettings.yandexGptEnabled;
      case "openai":
        return !!siteSettings.openaiEnabled;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-ai-consultant">
            <Bot className="h-6 w-6 text-primary" />
            ИИ-Консультант
          </h1>
          <p className="text-muted-foreground">
            Настройки публичного ИИ-чата на сайте для консультаций пользователей
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Основные настройки
            </CardTitle>
            <CardDescription>Включение консультанта и выбор провайдера ИИ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Switch
                id="ai-consultant-enabled"
                checked={settings.aiConsultantEnabled}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, aiConsultantEnabled: checked }))
                }
                data-testid="switch-ai-consultant-enabled"
              />
              <Label htmlFor="ai-consultant-enabled" className="flex items-center gap-2">
                {settings.aiConsultantEnabled ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    Включить ИИ-консультант на сайте
                  </span>
                ) : (
                  <span className="text-muted-foreground">Включить ИИ-консультант на сайте</span>
                )}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Когда включено, ИИ-консультант отображается в меню сайта и доступен пользователям
            </p>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="ai-provider">Провайдер ИИ</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  value={settings.aiConsultantProvider}
                  onValueChange={(value) =>
                    setSettings((s) => ({ ...s, aiConsultantProvider: value }))
                  }
                >
                  <SelectTrigger className="w-[240px]" data-testid="select-ai-provider">
                    <SelectValue placeholder="Выберите провайдера" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gigachat" data-testid="select-item-gigachat">
                      GigaChat (Сбер)
                    </SelectItem>
                    <SelectItem value="yandex" data-testid="select-item-yandex">
                      YandexGPT
                    </SelectItem>
                    <SelectItem value="openai" data-testid="select-item-openai">
                      OpenAI
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isProviderConfigured(settings.aiConsultantProvider) ? (
                  <Badge className="bg-green-600 text-white" data-testid="badge-provider-status">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Настроен
                  </Badge>
                ) : (
                  <Badge variant="destructive" data-testid="badge-provider-status">
                    Не настроен
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Провайдер должен быть включён и настроен в разделе «Настройки ИИ»
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Системный промпт
            </CardTitle>
            <CardDescription>Инструкции для ИИ и приветственное сообщение</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">Системный промпт</Label>
              <Textarea
                id="system-prompt"
                value={settings.aiConsultantSystemPrompt}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, aiConsultantSystemPrompt: e.target.value }))
                }
                rows={8}
                className="font-mono text-sm"
                placeholder="Введите системную инструкцию для ИИ. Например: «Ты — консультант по вопросам защиты персональных данных и 152-ФЗ. Отвечай на русском языке, кратко и по существу.»"
                data-testid="textarea-system-prompt"
              />
              <p className="text-xs text-muted-foreground">
                Системная инструкция задаёт поведение и контекст для ИИ-консультанта
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="welcome-message">Приветственное сообщение</Label>
              <Input
                id="welcome-message"
                value={settings.aiConsultantWelcomeMessage}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, aiConsultantWelcomeMessage: e.target.value }))
                }
                placeholder="Здравствуйте! Я ИИ-консультант по 152-ФЗ. Задайте ваш вопрос."
                data-testid="input-welcome-message"
              />
              <p className="text-xs text-muted-foreground">
                Сообщение, которое увидит пользователь при открытии чата
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Максимальная длина ответа (токены)</Label>
              <Input
                id="max-tokens"
                type="number"
                value={settings.aiConsultantMaxTokens}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    aiConsultantMaxTokens: parseInt(e.target.value) || 1024,
                  }))
                }
                min={128}
                max={8192}
                data-testid="input-max-tokens"
              />
              <p className="text-xs text-muted-foreground">
                Максимальное количество токенов в ответе ИИ (128–8192)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              Тестирование
            </CardTitle>
            <CardDescription>Отправьте тестовый вопрос для проверки работы ИИ-консультанта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-question">Тестовый вопрос</Label>
              <div className="flex gap-2">
                <Input
                  id="test-question"
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="Введите вопрос для тестирования..."
                  data-testid="input-test-question"
                />
                <Button
                  onClick={() => testMutation.mutate(testQuestion)}
                  disabled={!testQuestion.trim() || testMutation.isPending}
                  data-testid="button-send-test"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Отправить тестовый вопрос
                </Button>
              </div>
            </div>

            {(testResponse || testMutation.isPending) && (
              <div className="space-y-2">
                <Label>Ответ ИИ</Label>
                <div
                  className="rounded-md border bg-muted/50 p-4 text-sm whitespace-pre-wrap min-h-[80px]"
                  data-testid="text-test-response"
                >
                  {testMutation.isPending ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Генерация ответа...
                    </div>
                  ) : (
                    testResponse
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
    </AdminLayout>
  );
}
