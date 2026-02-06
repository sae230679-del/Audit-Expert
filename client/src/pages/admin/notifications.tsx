import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  MessageSquare,
  Bell,
  Eye,
  EyeOff,
  Loader2,
  Settings,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpEncryption: string;
  telegramNotificationsEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  telegramGroupDescription: string;
  notifyEmailRegistration: boolean;
  notifyEmailOrder: boolean;
  notifyEmailPayment: boolean;
  notifyEmailReferral: boolean;
  notifyEmailExpressReport: boolean;
  notifyEmailPasswordReset: boolean;
  notifyTgRegistration: boolean;
  notifyTgOrder: boolean;
  notifyTgPayment: boolean;
  notifyTgReferral: boolean;
  notifyTgExpressReport: boolean;
}

const defaultSettings: NotificationSettings = {
  smtpEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFromName: "",
  smtpFromEmail: "",
  smtpEncryption: "tls",
  telegramNotificationsEnabled: false,
  telegramBotToken: "",
  telegramChatId: "",
  telegramGroupDescription: "",
  notifyEmailRegistration: true,
  notifyEmailOrder: true,
  notifyEmailPayment: true,
  notifyEmailReferral: true,
  notifyEmailExpressReport: true,
  notifyEmailPasswordReset: true,
  notifyTgRegistration: true,
  notifyTgOrder: true,
  notifyTgPayment: true,
  notifyTgReferral: true,
  notifyTgExpressReport: true,
};

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  "data-testid": testId,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono text-sm"
        data-testid={testId}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Скрыть" : "Показать"}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<NotificationSettings>(defaultSettings);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testConnectionLoading, setTestConnectionLoading] = useState(false);
  const [testTelegramLoading, setTestTelegramLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/admin/notifications/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({ ...defaultSettings, ...settings });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      return apiRequest("PUT", "/api/admin/notifications/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/settings"] });
      toast({ title: "Настройки уведомлений сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения настроек", variant: "destructive" });
    },
  });

  const updateField = (field: keyof NotificationSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handle401 = (result: any) => {
    if (result?.code === "TOKEN_EXPIRED" || result?.code === "INVALID_TOKEN" || result?.code === "NO_TOKEN") {
      toast({ title: "Сессия истекла", description: "Войдите в систему заново", variant: "destructive" });
      localStorage.removeItem("adminToken");
      setTimeout(() => { window.location.href = "/admin"; }, 1500);
      return true;
    }
    return false;
  };

  const handleTestConnection = async () => {
    setTestConnectionLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/notifications/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (res.status === 401) {
        if (handle401(result)) return;
        setTestResult({ type: "connection", success: false, message: "Сессия истекла. Войдите заново." });
        toast({ title: "Сессия истекла", description: "Войдите в систему заново", variant: "destructive" });
        return;
      }
      const msg = result.message || result.error || (result.success ? "Подключение успешно" : "Ошибка подключения");
      setTestResult({ type: "connection", success: result.success, message: msg });
      toast({
        title: result.success ? "Подключение успешно" : "Ошибка подключения",
        description: result.success ? undefined : msg,
        variant: result.success ? "default" : "destructive",
      });
    } catch {
      setTestResult({ type: "connection", success: false, message: "Ошибка сетевого запроса" });
      toast({ title: "Ошибка сетевого запроса", variant: "destructive" });
    } finally {
      setTestConnectionLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast({ title: "Введите email для тестового письма", variant: "destructive" });
      return;
    }
    setTestEmailLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/notifications/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ email: testEmailAddress, ...formData }),
      });
      const result = await res.json();
      if (res.status === 401) {
        if (handle401(result)) return;
        setTestResult({ type: "email", success: false, message: "Сессия истекла. Войдите заново." });
        return;
      }
      const emailMsg = result.message || result.error || (result.success ? "Письмо отправлено" : "Ошибка отправки");
      setTestResult({ type: "email", success: result.success, message: emailMsg });
      toast({
        title: result.success ? "Тестовое письмо отправлено" : "Ошибка отправки",
        description: result.success ? undefined : emailMsg,
        variant: result.success ? "default" : "destructive",
      });
    } catch {
      setTestResult({ type: "email", success: false, message: "Ошибка сетевого запроса" });
      toast({ title: "Ошибка сетевого запроса", variant: "destructive" });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestTelegramLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/notifications/test-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({
          botToken: formData.telegramBotToken,
          chatId: formData.telegramChatId,
        }),
      });
      const result = await res.json();
      if (res.status === 401) {
        if (handle401(result)) return;
        setTestResult({ type: "telegram", success: false, message: "Сессия истекла. Войдите заново." });
        return;
      }
      const tgMsg = result.message || result.error || (result.success ? "Тест пройден" : "Ошибка теста");
      setTestResult({ type: "telegram", success: result.success, message: tgMsg });
      toast({
        title: result.success ? "Telegram тест пройден" : "Ошибка теста Telegram",
        description: result.success ? undefined : tgMsg,
        variant: result.success ? "default" : "destructive",
      });
    } catch {
      setTestResult({ type: "telegram", success: false, message: "Ошибка сетевого запроса" });
      toast({ title: "Ошибка сетевого запроса", variant: "destructive" });
    } finally {
      setTestTelegramLoading(false);
    }
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
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="heading-notifications">
            <Bell className="h-6 w-6" />
            Настройки уведомлений
          </h1>
          <p className="text-muted-foreground">Email, Telegram и типы уведомлений</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-notifications">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Settings className="h-4 w-4 mr-2" />
          )}
          Сохранить
        </Button>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="flex-wrap">
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="h-4 w-4 mr-2" />
            Почтовый сервер
          </TabsTrigger>
          <TabsTrigger value="telegram" data-testid="tab-telegram">
            <MessageSquare className="h-4 w-4 mr-2" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="toggles" data-testid="tab-toggles">
            <Bell className="h-4 w-4 mr-2" />
            Настройки уведомлений
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Почтовый сервер (SMTP)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Включить email уведомления</p>
                  <p className="text-sm text-muted-foreground">
                    Отправлять уведомления по электронной почте
                  </p>
                </div>
                <Switch
                  checked={formData.smtpEnabled}
                  onCheckedChange={(checked) => updateField("smtpEnabled", checked)}
                  data-testid="switch-smtp-enabled"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP сервер</Label>
                  <Input
                    id="smtp-host"
                    value={formData.smtpHost}
                    onChange={(e) => updateField("smtpHost", e.target.value)}
                    placeholder="smtp.mail.ru"
                    data-testid="input-smtp-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Порт</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => updateField("smtpPort", Number(e.target.value))}
                    placeholder="587"
                    data-testid="input-smtp-port"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Логин</Label>
                  <Input
                    id="smtp-user"
                    value={formData.smtpUser}
                    onChange={(e) => updateField("smtpUser", e.target.value)}
                    placeholder="user@mail.ru"
                    data-testid="input-smtp-user"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Пароль</Label>
                  <PasswordField
                    id="smtp-password"
                    value={formData.smtpPassword}
                    onChange={(val) => updateField("smtpPassword", val)}
                    placeholder="Пароль SMTP"
                    data-testid="input-smtp-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name">Имя отправителя</Label>
                  <Input
                    id="smtp-from-name"
                    value={formData.smtpFromName}
                    onChange={(e) => updateField("smtpFromName", e.target.value)}
                    placeholder="Help152FZ"
                    data-testid="input-smtp-from-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email">Email отправителя</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    value={formData.smtpFromEmail}
                    onChange={(e) => updateField("smtpFromEmail", e.target.value)}
                    placeholder="noreply@help152fz.ru"
                    data-testid="input-smtp-from-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-encryption">Шифрование</Label>
                  <Select
                    value={formData.smtpEncryption}
                    onValueChange={(value) => updateField("smtpEncryption", value)}
                  >
                    <SelectTrigger id="smtp-encryption" data-testid="select-smtp-encryption">
                      <SelectValue placeholder="Выберите тип шифрования" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без шифрования</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionLoading}
                    data-testid="button-test-connection"
                  >
                    {testConnectionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Проверить подключение
                  </Button>
                  {testResult?.type === "connection" && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      testResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {testResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {testResult.message}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label htmlFor="test-email">Тестовое письмо</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="test@example.com"
                      data-testid="input-test-email"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSendTestEmail}
                    disabled={testEmailLoading || !testEmailAddress}
                    data-testid="button-send-test-email"
                  >
                    {testEmailLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить тестовое письмо
                  </Button>
                  {testResult?.type === "email" && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      testResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {testResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Telegram уведомления
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Включить Telegram уведомления</p>
                  <p className="text-sm text-muted-foreground">
                    Отправлять уведомления в Telegram группу или чат
                  </p>
                </div>
                <Switch
                  checked={formData.telegramNotificationsEnabled}
                  onCheckedChange={(checked) => updateField("telegramNotificationsEnabled", checked)}
                  data-testid="switch-telegram-enabled"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-bot-token">Токен бота</Label>
                  <PasswordField
                    id="telegram-bot-token"
                    value={formData.telegramBotToken}
                    onChange={(val) => updateField("telegramBotToken", val)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    data-testid="input-telegram-bot-token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Получите токен у @BotFather в Telegram
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id">ID группы/чата</Label>
                  <Input
                    id="telegram-chat-id"
                    value={formData.telegramChatId}
                    onChange={(e) => updateField("telegramChatId", e.target.value)}
                    placeholder="-1001234567890"
                    data-testid="input-telegram-chat-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID группы или канала (можно получить через @userinfobot)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram-group-description">Описание группы</Label>
                <Textarea
                  id="telegram-group-description"
                  value={formData.telegramGroupDescription}
                  onChange={(e) => updateField("telegramGroupDescription", e.target.value)}
                  placeholder="Описание группы для уведомлений..."
                  className="min-h-[100px] resize-none"
                  data-testid="textarea-telegram-group-description"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestTelegram}
                    disabled={testTelegramLoading}
                    data-testid="button-test-telegram"
                  >
                    {testTelegramLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Тестировать
                  </Button>
                  {testResult?.type === "telegram" && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      testResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {testResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toggles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-registration">Регистрация пользователя</Label>
                  <Switch
                    id="notify-email-registration"
                    checked={formData.notifyEmailRegistration}
                    onCheckedChange={(checked) => updateField("notifyEmailRegistration", checked)}
                    data-testid="switch-notify-email-registration"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-order">Новый заказ</Label>
                  <Switch
                    id="notify-email-order"
                    checked={formData.notifyEmailOrder}
                    onCheckedChange={(checked) => updateField("notifyEmailOrder", checked)}
                    data-testid="switch-notify-email-order"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-payment">Оплата</Label>
                  <Switch
                    id="notify-email-payment"
                    checked={formData.notifyEmailPayment}
                    onCheckedChange={(checked) => updateField("notifyEmailPayment", checked)}
                    data-testid="switch-notify-email-payment"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-referral">Реферальная программа</Label>
                  <Switch
                    id="notify-email-referral"
                    checked={formData.notifyEmailReferral}
                    onCheckedChange={(checked) => updateField("notifyEmailReferral", checked)}
                    data-testid="switch-notify-email-referral"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-express">Экспресс-отчёт</Label>
                  <Switch
                    id="notify-email-express"
                    checked={formData.notifyEmailExpressReport}
                    onCheckedChange={(checked) => updateField("notifyEmailExpressReport", checked)}
                    data-testid="switch-notify-email-express-report"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-email-password">Восстановление пароля</Label>
                  <Switch
                    id="notify-email-password"
                    checked={formData.notifyEmailPasswordReset}
                    onCheckedChange={(checked) => updateField("notifyEmailPasswordReset", checked)}
                    data-testid="switch-notify-email-password-reset"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Telegram уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tg-registration">Регистрация пользователя</Label>
                  <Switch
                    id="notify-tg-registration"
                    checked={formData.notifyTgRegistration}
                    onCheckedChange={(checked) => updateField("notifyTgRegistration", checked)}
                    data-testid="switch-notify-tg-registration"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tg-order">Новый заказ</Label>
                  <Switch
                    id="notify-tg-order"
                    checked={formData.notifyTgOrder}
                    onCheckedChange={(checked) => updateField("notifyTgOrder", checked)}
                    data-testid="switch-notify-tg-order"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tg-payment">Оплата</Label>
                  <Switch
                    id="notify-tg-payment"
                    checked={formData.notifyTgPayment}
                    onCheckedChange={(checked) => updateField("notifyTgPayment", checked)}
                    data-testid="switch-notify-tg-payment"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tg-referral">Реферальная программа</Label>
                  <Switch
                    id="notify-tg-referral"
                    checked={formData.notifyTgReferral}
                    onCheckedChange={(checked) => updateField("notifyTgReferral", checked)}
                    data-testid="switch-notify-tg-referral"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-tg-express">Экспресс-отчёт</Label>
                  <Switch
                    id="notify-tg-express"
                    checked={formData.notifyTgExpressReport}
                    onCheckedChange={(checked) => updateField("notifyTgExpressReport", checked)}
                    data-testid="switch-notify-tg-express-report"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
