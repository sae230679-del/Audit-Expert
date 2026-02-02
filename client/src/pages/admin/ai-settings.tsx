import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Bot, 
  Settings, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Shield,
  Sparkles,
  Zap,
  Key,
  Globe,
  Server,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

interface AISettings {
  defaultAiProvider: string;
  gigachatEnabled: boolean;
  gigachatCredentials: string;
  gigachatScope: string;
  gigachatModel: string;
  yandexGptEnabled: boolean;
  yandexGptApiKey: string;
  yandexGptFolderId: string;
  yandexGptModel: string;
  openaiEnabled: boolean;
  openaiApiKey: string;
  openaiProxyUrl: string;
  openaiProxyEnabled: boolean;
  openaiModel: string;
}

function ProviderCard({ 
  title, 
  description, 
  icon: Icon, 
  color,
  enabled,
  onToggle,
  isDefault,
  onSetDefault,
  onTest,
  testLoading,
  testResult,
  children,
  docs,
}: {
  title: string;
  description: string;
  icon: any;
  color: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isDefault: boolean;
  onSetDefault: () => void;
  onTest: () => void;
  testLoading: boolean;
  testResult: { success: boolean; message: string } | null;
  children: React.ReactNode;
  docs: Array<{ title: string; url: string }>;
}) {
  return (
    <Card className={cn("transition-all", enabled ? "border-primary/50" : "opacity-70")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", color)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
                {enabled && isDefault && (
                  <Badge variant="secondary" className="text-xs">По умолчанию</Badge>
                )}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Switch 
            checked={enabled} 
            onCheckedChange={onToggle}
            data-testid={`switch-${title.toLowerCase().replace(/\s/g, '-')}-enable`}
          />
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          {children}
          
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onTest}
              disabled={testLoading}
              data-testid={`button-test-${title.toLowerCase().replace(/\s/g, '-')}`}
            >
              {testLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Тест подключения
            </Button>
            
            {!isDefault && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={onSetDefault}
                data-testid={`button-default-${title.toLowerCase().replace(/\s/g, '-')}`}
              >
                Использовать по умолчанию
              </Button>
            )}
            
            {testResult && (
              <div className={cn(
                "flex items-center gap-2 text-sm",
                testResult.success ? "text-green-600" : "text-red-600"
              )}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="docs">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Документация и настройка
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {docs.map((doc, i) => (
                    <a 
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {doc.title}
                    </a>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}

export default function AISettingsPage() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["/api/admin/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<AISettings>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const handleTestConnection = async (provider: string) => {
    setTestLoading(prev => ({ ...prev, [provider]: true }));
    setTestResults(prev => ({ ...prev, [provider]: null }));
    
    try {
      const res = await fetch(`/api/admin/ai/test/${provider}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      const result = await res.json();
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Ошибка запроса" } }));
    } finally {
      setTestLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    updateSettings.mutate({ [key]: value });
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-red-500" />
            Настройки ИИ-провайдеров
          </h1>
          <p className="text-muted-foreground">
            Настройте нейросети для генерации документов и ответов
          </p>
        </div>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Важно: Все API ключи хранятся в зашифрованном виде
              </p>
              <p className="text-muted-foreground">
                Перед использованием проверьте подключение с помощью кнопки "Тест подключения"
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="providers">Провайдеры</TabsTrigger>
            <TabsTrigger value="prompts">Промпты</TabsTrigger>
            <TabsTrigger value="usage">Использование</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <ProviderCard
              title="GigaChat"
              description="Российская нейросеть от Сбербанка"
              icon={Shield}
              color="bg-green-600"
              enabled={settings?.gigachatEnabled || false}
              onToggle={(enabled) => handleSettingChange("gigachatEnabled", enabled)}
              isDefault={settings?.defaultAiProvider === "gigachat"}
              onSetDefault={() => handleSettingChange("defaultAiProvider", "gigachat")}
              onTest={() => handleTestConnection("gigachat")}
              testLoading={testLoading.gigachat || false}
              testResult={testResults.gigachat || null}
              docs={[
                { title: "Документация GigaChat API", url: "https://developers.sber.ru/docs/ru/gigachat/api/overview" },
                { title: "Получение API ключа", url: "https://developers.sber.ru/docs/ru/gigachat/api/integration" },
                { title: "Тарифы", url: "https://developers.sber.ru/docs/ru/gigachat/api/tariffs" },
              ]}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gigachat-credentials">Authorization Key</Label>
                  <Input
                    id="gigachat-credentials"
                    type="password"
                    placeholder="Base64 encoded credentials"
                    value={settings?.gigachatCredentials || ""}
                    onChange={(e) => handleSettingChange("gigachatCredentials", e.target.value)}
                    data-testid="input-gigachat-credentials"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ключ показывается один раз при создании проекта
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gigachat-scope">Scope (тип доступа)</Label>
                  <Select
                    value={settings?.gigachatScope || "GIGACHAT_API_PERS"}
                    onValueChange={(value) => handleSettingChange("gigachatScope", value)}
                  >
                    <SelectTrigger id="gigachat-scope" data-testid="select-gigachat-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GIGACHAT_API_PERS">Физлица (бесплатный лимит)</SelectItem>
                      <SelectItem value="GIGACHAT_API_CORP">Юрлица (pay-as-you-go)</SelectItem>
                      <SelectItem value="GIGACHAT_API_B2B">B2B (пакеты)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gigachat-model">Модель</Label>
                  <Select
                    value={settings?.gigachatModel || "GigaChat"}
                    onValueChange={(value) => handleSettingChange("gigachatModel", value)}
                  >
                    <SelectTrigger id="gigachat-model" data-testid="select-gigachat-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GigaChat">GigaChat (стандартный)</SelectItem>
                      <SelectItem value="GigaChat-Pro">GigaChat Pro</SelectItem>
                      <SelectItem value="GigaChat-Max">GigaChat Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ProviderCard>

            <ProviderCard
              title="Yandex GPT"
              description="Нейросеть от Яндекса для русского языка"
              icon={Globe}
              color="bg-yellow-500"
              enabled={settings?.yandexGptEnabled || false}
              onToggle={(enabled) => handleSettingChange("yandexGptEnabled", enabled)}
              isDefault={settings?.defaultAiProvider === "yandex"}
              onSetDefault={() => handleSettingChange("defaultAiProvider", "yandex")}
              onTest={() => handleTestConnection("yandex")}
              testLoading={testLoading.yandex || false}
              testResult={testResults.yandex || null}
              docs={[
                { title: "Документация Yandex GPT", url: "https://yandex.cloud/en/docs/foundation-models/" },
                { title: "Быстрый старт", url: "https://yandex.cloud/en/docs/foundation-models/quickstart/yandexgpt" },
                { title: "Получение API ключа", url: "https://yandex.cloud/en/docs/iam/concepts/authorization/api-key" },
              ]}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="yandex-api-key">API Key</Label>
                  <Input
                    id="yandex-api-key"
                    type="password"
                    placeholder="AQVNxxx..."
                    value={settings?.yandexGptApiKey || ""}
                    onChange={(e) => handleSettingChange("yandexGptApiKey", e.target.value)}
                    data-testid="input-yandex-api-key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yandex-folder-id">Folder ID</Label>
                  <Input
                    id="yandex-folder-id"
                    placeholder="b1gxxx..."
                    value={settings?.yandexGptFolderId || ""}
                    onChange={(e) => handleSettingChange("yandexGptFolderId", e.target.value)}
                    data-testid="input-yandex-folder-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID каталога в Yandex Cloud
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yandex-model">Модель</Label>
                  <Select
                    value={settings?.yandexGptModel || "yandexgpt/latest"}
                    onValueChange={(value) => handleSettingChange("yandexGptModel", value)}
                  >
                    <SelectTrigger id="yandex-model" data-testid="select-yandex-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yandexgpt/latest">YandexGPT (последняя)</SelectItem>
                      <SelectItem value="yandexgpt-lite/latest">YandexGPT Lite (быстрый)</SelectItem>
                      <SelectItem value="yandexgpt/rc">YandexGPT RC (эксперимент)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ProviderCard>

            <ProviderCard
              title="OpenAI"
              description="GPT модели через прокси или напрямую"
              icon={Sparkles}
              color="bg-purple-600"
              enabled={settings?.openaiEnabled || false}
              onToggle={(enabled) => handleSettingChange("openaiEnabled", enabled)}
              isDefault={settings?.defaultAiProvider === "openai"}
              onSetDefault={() => handleSettingChange("defaultAiProvider", "openai")}
              onTest={() => handleTestConnection("openai")}
              testLoading={testLoading.openai || false}
              testResult={testResults.openai || null}
              docs={[
                { title: "Документация OpenAI API", url: "https://platform.openai.com/docs" },
                { title: "Получение API ключа", url: "https://platform.openai.com/api-keys" },
                { title: "Модели", url: "https://platform.openai.com/docs/models" },
              ]}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openai-api-key">API Key</Label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    placeholder="sk-xxx..."
                    value={settings?.openaiApiKey || ""}
                    onChange={(e) => handleSettingChange("openaiApiKey", e.target.value)}
                    data-testid="input-openai-api-key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Модель</Label>
                  <Select
                    value={settings?.openaiModel || "gpt-4"}
                    onValueChange={(value) => handleSettingChange("openaiModel", value)}
                  >
                    <SelectTrigger id="openai-model" data-testid="select-openai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="openai-proxy">Прокси-сервер</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="openai-proxy-enabled" className="text-sm text-muted-foreground">
                        Использовать прокси
                      </Label>
                      <Switch
                        id="openai-proxy-enabled"
                        checked={settings?.openaiProxyEnabled || false}
                        onCheckedChange={(checked) => handleSettingChange("openaiProxyEnabled", checked)}
                        data-testid="switch-openai-proxy"
                      />
                    </div>
                  </div>
                  <Input
                    id="openai-proxy"
                    placeholder="http://user:pass@host:port или socks5://host:port"
                    value={settings?.openaiProxyUrl || ""}
                    onChange={(e) => handleSettingChange("openaiProxyUrl", e.target.value)}
                    disabled={!settings?.openaiProxyEnabled}
                    data-testid="input-openai-proxy"
                  />
                  <p className="text-xs text-muted-foreground">
                    Используйте прокси, если OpenAI заблокирован в вашем регионе
                  </p>
                </div>
              </div>
            </ProviderCard>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Библиотека промптов</CardTitle>
                <CardDescription>
                  Управление шаблонами запросов для ИИ-генерации документов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Перейдите в раздел <a href="/admin/prompts" className="text-primary hover:underline">Библиотека промптов</a> для управления шаблонами.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Статистика использования</CardTitle>
                <CardDescription>
                  Отслеживание запросов и токенов по провайдерам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Статистика будет доступна после первых запросов к ИИ
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
