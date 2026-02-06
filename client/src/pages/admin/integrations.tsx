import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Code2,
  Save,
  Loader2,
  BarChart3,
  Search,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface IntegrationSettings {
  yandexMetrikaEnabled: boolean;
  yandexMetrikaId: string;
  yandexWebmasterEnabled: boolean;
  yandexWebmasterCode: string;
  onlineConsultantEnabled: boolean;
  onlineConsultantName: string;
  onlineConsultantCode: string;
  marquizEnabled: boolean;
  marquizCode: string;
  hintsEnabled: boolean;
}

const defaultSettings: IntegrationSettings = {
  yandexMetrikaEnabled: false,
  yandexMetrikaId: "",
  yandexWebmasterEnabled: false,
  yandexWebmasterCode: "",
  onlineConsultantEnabled: false,
  onlineConsultantName: "",
  onlineConsultantCode: "",
  marquizEnabled: false,
  marquizCode: "",
  hintsEnabled: true,
};

export default function AdminIntegrations() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<IntegrationSettings>(defaultSettings);

  const { data: settings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/admin/integrations/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({ ...defaultSettings, ...settings });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: IntegrationSettings) => {
      return apiRequest("PUT", "/api/admin/integrations/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations/settings"] });
      toast({ title: "Настройки интеграций сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения настроек", variant: "destructive" });
    },
  });

  const updateField = (field: keyof IntegrationSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="heading-integrations">
            <Code2 className="h-6 w-6" />
            Интеграции и виджеты
          </h1>
          <p className="text-muted-foreground">Подключение внешних сервисов и виджетов</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-integrations">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-lg">Яндекс Метрика</CardTitle>
            </div>
            <Badge variant={formData.yandexMetrikaEnabled ? "default" : "secondary"} data-testid="badge-yandex-metrika-status">
              {formData.yandexMetrikaEnabled ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Включена</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Отключена</>
              )}
            </Badge>
          </div>
          <CardDescription>Счётчик для аналитики посещаемости сайта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="yandex-metrika-enabled">Включить Яндекс Метрику</Label>
            <Switch
              id="yandex-metrika-enabled"
              checked={formData.yandexMetrikaEnabled}
              onCheckedChange={(checked) => updateField("yandexMetrikaEnabled", checked)}
              data-testid="switch-yandex-metrika-enabled"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yandex-metrika-id">ID счётчика</Label>
            <Input
              id="yandex-metrika-id"
              value={formData.yandexMetrikaId}
              onChange={(e) => updateField("yandexMetrikaId", e.target.value)}
              placeholder="12345678"
              data-testid="input-yandex-metrika-id"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <CardTitle className="text-lg">Яндекс Вебмастер</CardTitle>
          </div>
          <CardDescription>Мета-тег подтверждения владения сайтом</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="yandex-webmaster-enabled">Включить верификацию</Label>
            <Switch
              id="yandex-webmaster-enabled"
              checked={formData.yandexWebmasterEnabled}
              onCheckedChange={(checked) => updateField("yandexWebmasterEnabled", checked)}
              data-testid="switch-yandex-webmaster-enabled"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yandex-webmaster-code">Код верификации</Label>
            <Input
              id="yandex-webmaster-code"
              value={formData.yandexWebmasterCode}
              onChange={(e) => updateField("yandexWebmasterCode", e.target.value)}
              placeholder="Введите код верификации..."
              data-testid="input-yandex-webmaster-code"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle className="text-lg">Онлайн-консультант</CardTitle>
          </div>
          <CardDescription>Виджет онлайн-чата для общения с посетителями</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="online-consultant-enabled">Включить виджет</Label>
            <Switch
              id="online-consultant-enabled"
              checked={formData.onlineConsultantEnabled}
              onCheckedChange={(checked) => updateField("onlineConsultantEnabled", checked)}
              data-testid="switch-online-consultant-enabled"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="online-consultant-name">Название сервиса</Label>
            <Input
              id="online-consultant-name"
              value={formData.onlineConsultantName}
              onChange={(e) => updateField("onlineConsultantName", e.target.value)}
              placeholder="Jivo, Tawk.to, Carrot quest..."
              data-testid="input-online-consultant-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="online-consultant-code">Код виджета</Label>
            <Textarea
              id="online-consultant-code"
              value={formData.onlineConsultantCode}
              onChange={(e) => updateField("onlineConsultantCode", e.target.value)}
              placeholder="Вставьте код виджета..."
              rows={4}
              className="font-mono text-sm"
              data-testid="textarea-online-consultant-code"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <CardTitle className="text-lg">Marquiz</CardTitle>
          </div>
          <CardDescription>Виджет квизов и опросов для сбора лидов</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="marquiz-enabled">Включить Marquiz</Label>
            <Switch
              id="marquiz-enabled"
              checked={formData.marquizEnabled}
              onCheckedChange={(checked) => updateField("marquizEnabled", checked)}
              data-testid="switch-marquiz-enabled"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marquiz-code">Код Marquiz</Label>
            <Textarea
              id="marquiz-code"
              value={formData.marquizCode}
              onChange={(e) => updateField("marquizCode", e.target.value)}
              placeholder="Вставьте код квиза..."
              rows={4}
              className="font-mono text-sm"
              data-testid="textarea-marquiz-code"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle className="text-lg">Подсказки на сайте</CardTitle>
          </div>
          <CardDescription>Контекстные подсказки при заполнении форм</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="hints-enabled">Показывать подсказки</Label>
            <Switch
              id="hints-enabled"
              checked={formData.hintsEnabled}
              onCheckedChange={(checked) => updateField("hintsEnabled", checked)}
              data-testid="switch-hints-enabled"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-integrations-bottom">
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
