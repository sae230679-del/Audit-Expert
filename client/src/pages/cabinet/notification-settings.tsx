import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Smartphone, Loader2, Save } from "lucide-react";

interface NotificationPreferences {
  emailOrders: boolean;
  emailPayments: boolean;
  emailReferrals: boolean;
  emailAuditReports: boolean;
  emailPasswordReset: boolean;
  emailNews: boolean;
  emailPromo: boolean;
  inAppNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailOrders: true,
  emailPayments: true,
  emailReferrals: true,
  emailAuditReports: true,
  emailPasswordReset: true,
  emailNews: true,
  emailPromo: true,
  inAppNotifications: true,
};

export default function NotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationPreferences>(defaultPreferences);

  const { data, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/user/subscriptions"],
  });

  useEffect(() => {
    if (data) {
      setSettings({ ...defaultPreferences, ...data });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const response = await apiRequest("PATCH", "/api/user/subscriptions", prefs);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения настроек", variant: "destructive" });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-settings" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold" data-testid="text-notification-settings-title">
          Настройки уведомлений
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailOrders" className="flex-1 cursor-pointer">
              Уведомления о заказах
            </Label>
            <Switch
              id="emailOrders"
              checked={settings.emailOrders}
              onCheckedChange={() => handleToggle("emailOrders")}
              data-testid="switch-emailOrders"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailPayments" className="flex-1 cursor-pointer">
              Уведомления об оплатах
            </Label>
            <Switch
              id="emailPayments"
              checked={settings.emailPayments}
              onCheckedChange={() => handleToggle("emailPayments")}
              data-testid="switch-emailPayments"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailReferrals" className="flex-1 cursor-pointer">
              Реферальная программа
            </Label>
            <Switch
              id="emailReferrals"
              checked={settings.emailReferrals}
              onCheckedChange={() => handleToggle("emailReferrals")}
              data-testid="switch-emailReferrals"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailAuditReports" className="flex-1 cursor-pointer">
              Отчёты аудита
            </Label>
            <Switch
              id="emailAuditReports"
              checked={settings.emailAuditReports}
              onCheckedChange={() => handleToggle("emailAuditReports")}
              data-testid="switch-emailAuditReports"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailPasswordReset" className="flex-1 cursor-pointer">
              Восстановление пароля
            </Label>
            <Switch
              id="emailPasswordReset"
              checked={settings.emailPasswordReset}
              onCheckedChange={() => handleToggle("emailPasswordReset")}
              data-testid="switch-emailPasswordReset"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailNews" className="flex-1 cursor-pointer">
              Новости и обновления
            </Label>
            <Switch
              id="emailNews"
              checked={settings.emailNews}
              onCheckedChange={() => handleToggle("emailNews")}
              data-testid="switch-emailNews"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="emailPromo" className="flex-1 cursor-pointer">
              Промо-акции
            </Label>
            <Switch
              id="emailPromo"
              checked={settings.emailPromo}
              onCheckedChange={() => handleToggle("emailPromo")}
              data-testid="switch-emailPromo"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Уведомления в приложении
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="inAppNotifications" className="flex-1 cursor-pointer">
              Уведомления в личном кабинете
            </Label>
            <Switch
              id="inAppNotifications"
              checked={settings.inAppNotifications}
              onCheckedChange={() => handleToggle("inAppNotifications")}
              data-testid="switch-inAppNotifications"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-notifications"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}
