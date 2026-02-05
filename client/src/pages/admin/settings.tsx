import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Building2, CreditCard, Mail, Phone, Key, Users, Percent, Gift, Wallet, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SiteSettings, ReferralSettings } from "@shared/schema";

export default function AdminSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<SiteSettings>>({});
  const [referralData, setReferralData] = useState<Partial<ReferralSettings>>({});

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: referralSettings, isLoading: referralLoading } = useQuery<ReferralSettings>({
    queryKey: ["/api/admin/referral-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (referralSettings) {
      setReferralData(referralSettings);
    }
  }, [referralSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const saveReferralMutation = useMutation({
    mutationFn: async (data: Partial<ReferralSettings>) => {
      return apiRequest("PATCH", "/api/admin/referral-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-settings"] });
      toast({ title: "Настройки реферальной программы сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleSaveReferral = () => {
    saveReferralMutation.mutate(referralData);
  };

  const updateField = (field: keyof SiteSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateReferralField = (field: keyof ReferralSettings, value: any) => {
    setReferralData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Настройки сайта</h1>
          <p className="text-muted-foreground">Реквизиты, контакты и платежи</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap">
          <TabsTrigger value="company">Компания</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
          <TabsTrigger value="bank">Банк</TabsTrigger>
          <TabsTrigger value="payment">YooKassa</TabsTrigger>
          <TabsTrigger value="prices">Цены</TabsTrigger>
          <TabsTrigger value="referral">Рефералы</TabsTrigger>
          <TabsTrigger value="pages">Страницы</TabsTrigger>
          <TabsTrigger value="oauth">OAuth</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Реквизиты компании
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип компании</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.companyType || ""}
                    onChange={(e) => updateField("companyType", e.target.value)}
                    data-testid="select-company-type"
                  >
                    <option value="">Выберите тип</option>
                    <option value="self_employed">Самозанятый</option>
                    <option value="ip">ИП</option>
                    <option value="ooo">ООО</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Название / ФИО</Label>
                  <Input
                    value={formData.companyName || ""}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="ИП Иванов Иван Иванович"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ИНН</Label>
                  <Input
                    value={formData.inn || ""}
                    onChange={(e) => updateField("inn", e.target.value)}
                    placeholder="123456789012"
                    data-testid="input-inn"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ОГРН / ОГРНИП</Label>
                  <Input
                    value={formData.ogrn || ""}
                    onChange={(e) => updateField("ogrn", e.target.value)}
                    placeholder="123456789012345"
                    data-testid="input-ogrn"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="г. Москва, ул. Примерная, д. 1"
                  data-testid="input-address"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Контактная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email (поддержка)</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="support@help152fz.ru"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (ответственный за ПДн)</Label>
                  <Input
                    type="email"
                    value={formData.privacyEmail || ""}
                    onChange={(e) => updateField("privacyEmail", e.target.value)}
                    placeholder="privacy@help152fz.ru"
                    data-testid="input-privacy-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={formData.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+7 (999) 999-99-99"
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telegram</Label>
                  <Input
                    value={formData.telegram || ""}
                    onChange={(e) => updateField("telegram", e.target.value)}
                    placeholder="https://t.me/help152fz"
                    data-testid="input-telegram"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VK</Label>
                  <Input
                    value={formData.vk || ""}
                    onChange={(e) => updateField("vk", e.target.value)}
                    placeholder="https://vk.com/help152fz"
                    data-testid="input-vk"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Банковские реквизиты
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Наименование банка</Label>
                  <Input
                    value={formData.bankName || ""}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="ПАО Сбербанк"
                    data-testid="input-bank-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>БИК</Label>
                  <Input
                    value={formData.bik || ""}
                    onChange={(e) => updateField("bik", e.target.value)}
                    placeholder="044525225"
                    data-testid="input-bik"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Расчетный счет</Label>
                  <Input
                    value={formData.bankAccount || ""}
                    onChange={(e) => updateField("bankAccount", e.target.value)}
                    placeholder="40802810000000000000"
                    data-testid="input-bank-account"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Корр. счет</Label>
                  <Input
                    value={formData.correspondentAccount || ""}
                    onChange={(e) => updateField("correspondentAccount", e.target.value)}
                    placeholder="30101810400000000225"
                    data-testid="input-correspondent-account"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Настройки YooKassa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Тестовый режим</p>
                  <p className="text-sm text-muted-foreground">
                    В тестовом режиме платежи не списываются
                  </p>
                </div>
                <Switch
                  checked={formData.yookassaTestMode ?? true}
                  onCheckedChange={(checked) => updateField("yookassaTestMode", checked)}
                  data-testid="switch-test-mode"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shop ID</Label>
                  <Input
                    value={formData.yookassaShopId || ""}
                    onChange={(e) => updateField("yookassaShopId", e.target.value)}
                    placeholder="Идентификатор магазина"
                    data-testid="input-shop-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Секретный ключ</Label>
                  <Input
                    type="password"
                    value={formData.yookassaSecretKey || ""}
                    onChange={(e) => updateField("yookassaSecretKey", e.target.value)}
                    placeholder="••••••••"
                    data-testid="input-secret-key"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Цены</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Цена экспресс-отчета (₽)</Label>
                <Input
                  type="number"
                  value={formData.expressReportPrice || 900}
                  onChange={(e) => updateField("expressReportPrice", Number(e.target.value))}
                  data-testid="input-express-price"
                />
                <p className="text-sm text-muted-foreground">
                  Цена полного отчета после бесплатной проверки
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Реферальная программа
              </CardTitle>
              <CardDescription>
                Настройки бонусов и комиссий для партнёрской программы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Реферальная программа активна</p>
                  <p className="text-sm text-muted-foreground">
                    Включить/выключить реферальную программу
                  </p>
                </div>
                <Switch
                  checked={referralData.isActive ?? true}
                  onCheckedChange={(checked) => updateReferralField("isActive", checked)}
                  data-testid="switch-referral-active"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Бонус рефереру (₽)
                  </Label>
                  <Input
                    type="number"
                    value={referralData.referrerBonus || 100}
                    onChange={(e) => updateReferralField("referrerBonus", Number(e.target.value))}
                    data-testid="input-referrer-bonus"
                  />
                  <p className="text-sm text-muted-foreground">
                    Сумма начисляемая пригласившему за каждого привлеченного пользователя
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Скидка приглашенному (%)
                  </Label>
                  <Input
                    type="number"
                    value={referralData.refereeDiscount || 10}
                    onChange={(e) => updateReferralField("refereeDiscount", Number(e.target.value))}
                    data-testid="input-referee-discount"
                  />
                  <p className="text-sm text-muted-foreground">
                    Скидка для нового пользователя, пришедшего по реферальной ссылке
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Комиссия с заказов (%)
                  </Label>
                  <Input
                    type="number"
                    value={referralData.commissionPercent || 20}
                    onChange={(e) => updateReferralField("commissionPercent", Number(e.target.value))}
                    data-testid="input-commission-percent"
                  />
                  <p className="text-sm text-muted-foreground">
                    Процент от заказов привлеченных пользователей, начисляемый рефереру
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Минимальная сумма для вывода (₽)
                  </Label>
                  <Input
                    type="number"
                    value={referralData.minPayoutAmount || 500}
                    onChange={(e) => updateReferralField("minPayoutAmount", Number(e.target.value))}
                    data-testid="input-min-payout"
                  />
                  <p className="text-sm text-muted-foreground">
                    Минимальная сумма для создания заявки на вывод средств
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={handleSaveReferral} 
                  disabled={saveReferralMutation.isPending}
                  data-testid="button-save-referral"
                >
                  {saveReferralMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Сохранить настройки реферальной программы
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Управление страницами</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Режим технических работ</p>
                    <p className="text-sm text-muted-foreground">
                      Сайт будет недоступен для посетителей. Показывается страница с сообщением о техработах.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.maintenanceMode ?? false}
                  onCheckedChange={(checked) => updateField("maintenanceMode", checked)}
                  data-testid="switch-maintenance-mode"
                />
              </div>
              {formData.maintenanceMode && (
                <div className="space-y-2">
                  <Label>Сообщение для посетителей</Label>
                  <Input
                    value={formData.maintenanceMessage || ""}
                    onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                    placeholder="Сайт временно недоступен. Ведутся технические работы."
                    data-testid="input-maintenance-message"
                  />
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Страница кейсов</p>
                  <p className="text-sm text-muted-foreground">
                    Показывать раздел с кейсами на сайте
                  </p>
                </div>
                <Switch
                  checked={formData.casesPageEnabled ?? true}
                  onCheckedChange={(checked) => updateField("casesPageEnabled", checked)}
                  data-testid="switch-cases-page"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Мониторинг — «В разработке»</p>
                  <p className="text-sm text-muted-foreground">
                    Показывать заглушку «В разработке» вместо оформления подписки на мониторинг
                  </p>
                </div>
                <Switch
                  checked={formData.monitoringComingSoon ?? true}
                  onCheckedChange={(checked) => updateField("monitoringComingSoon", checked)}
                  data-testid="switch-monitoring-coming-soon"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                OAuth авторизация
              </CardTitle>
              <CardDescription>
                Настройки входа через социальные сети (VK и Yandex)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">OAuth авторизация</p>
                  <p className="text-sm text-muted-foreground">
                    Включить вход через VK и Yandex
                  </p>
                </div>
                <Switch
                  checked={formData.oauthEnabled ?? false}
                  onCheckedChange={(checked) => updateField("oauthEnabled", checked)}
                  data-testid="switch-oauth-enabled"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.364 1.259 2.178 1.816.616.422 1.084.33 1.084.33l2.178-.03s1.14-.07.6-.964c-.044-.073-.314-.659-1.616-1.862-1.362-1.26-1.18-1.056.46-3.235.999-1.328 1.399-2.14 1.274-2.487-.119-.332-.855-.244-.855-.244l-2.452.015s-.182-.025-.317.056c-.131.079-.216.262-.216.262s-.387 1.028-.903 1.903c-1.088 1.847-1.524 1.945-1.702 1.83-.414-.267-.31-1.075-.31-1.649 0-1.793.272-2.54-.528-2.735-.266-.065-.461-.107-1.14-.114-.872-.01-1.609.003-2.027.208-.278.137-.493.44-.362.457.161.022.526.098.72.362.25.341.24 1.11.24 1.11s.144 2.11-.335 2.371c-.329.18-.779-.187-1.746-1.868-.495-.86-.868-1.812-.868-1.812s-.072-.176-.2-.272c-.155-.115-.372-.151-.372-.151l-2.33.015s-.35.01-.478.162c-.114.136-.009.417-.009.417s1.82 4.258 3.882 6.403c1.89 1.966 4.034 1.837 4.034 1.837h.972z"/>
                  </svg>
                  VKontakte
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>App ID</Label>
                    <Input
                      value={formData.vkAppId || ""}
                      onChange={(e) => updateField("vkAppId", e.target.value)}
                      placeholder="Идентификатор приложения VK"
                      data-testid="input-vk-app-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Защищенный ключ</Label>
                    <Input
                      type="password"
                      value={formData.vkAppSecret || ""}
                      onChange={(e) => updateField("vkAppSecret", e.target.value)}
                      placeholder="Секретный ключ приложения"
                      data-testid="input-vk-app-secret"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Создайте приложение на{" "}
                  <a href="https://vk.com/apps?act=manage" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    dev.vk.com
                  </a>
                  . URI переадресации: {window.location.origin}/api/auth/vk/callback
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.889 14.778h-2.111v-6.037L10.556 16.8H9.333V7.222h2.111v6.037L14.667 7.2h1.222v9.578z"/>
                  </svg>
                  Yandex
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      value={formData.yandexClientId || ""}
                      onChange={(e) => updateField("yandexClientId", e.target.value)}
                      placeholder="ID приложения Yandex"
                      data-testid="input-yandex-client-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      type="password"
                      value={formData.yandexClientSecret || ""}
                      onChange={(e) => updateField("yandexClientSecret", e.target.value)}
                      placeholder="Секретный ключ приложения"
                      data-testid="input-yandex-client-secret"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Создайте приложение на{" "}
                  <a href="https://oauth.yandex.ru/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    oauth.yandex.ru
                  </a>
                  . Callback URL: {window.location.origin}/api/auth/yandex/callback
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Уведомления в Telegram
              </CardTitle>
              <CardDescription>
                Получайте уведомления о заявках, оплатах и сообщениях в группу Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Включить уведомления</p>
                  <p className="text-sm text-muted-foreground">
                    Отправлять уведомления в Telegram при событиях
                  </p>
                </div>
                <Switch
                  checked={formData.telegramNotificationsEnabled || false}
                  onCheckedChange={(checked) => updateField("telegramNotificationsEnabled", checked)}
                  data-testid="switch-telegram-enabled"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <Input
                    type="password"
                    value={formData.telegramBotToken || ""}
                    onChange={(e) => updateField("telegramBotToken", e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    data-testid="input-telegram-bot-token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Получите токен у @BotFather в Telegram
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input
                    value={formData.telegramChatId || ""}
                    onChange={(e) => updateField("telegramChatId", e.target.value)}
                    placeholder="-1001234567890"
                    data-testid="input-telegram-chat-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID группы или канала (можно получить через @userinfobot)
                  </p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Уведомления отправляются при:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Заявка на экспресс-отчёт (900₽)</li>
                  <li>Заявка на полный аудит сайта</li>
                  <li>Сообщение с формы обратной связи</li>
                  <li>Регистрация по реферальной ссылке</li>
                  <li>Успешная оплата услуги</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
