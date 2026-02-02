import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Users, Percent, Wallet, CreditCard, UserCheck, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ReferralSettings, Payout, User } from "@shared/schema";

export default function AdminReferrals() {
  const { toast } = useToast();
  const [referralData, setReferralData] = useState<Partial<ReferralSettings>>({
    commissionPercent: 20,
    minPayoutAmount: 500,
    referrerBonus: 100,
    refereeDiscount: 10,
  });

  const { data: referralSettings, isLoading: referralLoading } = useQuery<ReferralSettings>({
    queryKey: ["/api/admin/referral-settings"],
  });

  const { data: pendingPayouts } = useQuery<Payout[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  useEffect(() => {
    if (referralSettings) {
      setReferralData(referralSettings);
    }
  }, [referralSettings]);

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

  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/payouts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "Статус выплаты обновлен" });
    },
  });

  const handleSaveReferral = () => {
    saveReferralMutation.mutate(referralData);
  };

  const usersWithReferrals = allUsers?.filter(u => u.referralCode) || [];
  const totalReferrers = usersWithReferrals.length;
  const pendingPayoutsCount = pendingPayouts?.filter(p => p.status === 'pending').length || 0;
  const totalPayoutsAmount = pendingPayouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  if (referralLoading) {
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
          <h1 className="text-2xl font-semibold">Реферальная программа</h1>
          <p className="text-muted-foreground">Управление комиссиями, бонусами и выплатами</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Участников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrers}</div>
            <p className="text-xs text-muted-foreground">пользователей с реф. кодом</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Комиссия</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralData.commissionPercent}%</div>
            <p className="text-xs text-muted-foreground">от суммы заказа</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ожидают выплаты</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayoutsCount}</div>
            <p className="text-xs text-muted-foreground">заявок</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">К выплате</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayoutsAmount} ₽</div>
            <p className="text-xs text-muted-foreground">ожидает подтверждения</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Настройки программы
            </CardTitle>
            <CardDescription>
              Параметры реферальной системы
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Комиссия реферера (%)
                </Label>
                <Input
                  type="number"
                  value={referralData.commissionPercent || 20}
                  onChange={(e) => setReferralData((prev) => ({ ...prev, commissionPercent: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  data-testid="input-commission-percent"
                />
                <p className="text-xs text-muted-foreground">
                  % от заказа приглашенного
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Мин. сумма вывода (₽)
                </Label>
                <Input
                  type="number"
                  value={referralData.minPayoutAmount || 500}
                  onChange={(e) => setReferralData((prev) => ({ ...prev, minPayoutAmount: Number(e.target.value) }))}
                  min={0}
                  data-testid="input-min-payout"
                />
                <p className="text-xs text-muted-foreground">
                  Минимум для вывода
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Бонус рефереру (₽)
                </Label>
                <Input
                  type="number"
                  value={referralData.referrerBonus || 100}
                  onChange={(e) => setReferralData((prev) => ({ ...prev, referrerBonus: Number(e.target.value) }))}
                  min={0}
                  data-testid="input-referrer-bonus"
                />
                <p className="text-xs text-muted-foreground">
                  За каждого приглашенного
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Скидка приглашенному (%)
                </Label>
                <Input
                  type="number"
                  value={referralData.refereeDiscount || 10}
                  onChange={(e) => setReferralData((prev) => ({ ...prev, refereeDiscount: Number(e.target.value) }))}
                  min={0}
                  max={100}
                  data-testid="input-referee-discount"
                />
                <p className="text-xs text-muted-foreground">
                  Скидка на первый заказ
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveReferral}
              disabled={saveReferralMutation.isPending}
              className="w-full"
              data-testid="button-save-referral"
            >
              {saveReferralMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Сохранить настройки
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Заявки на выплату
            </CardTitle>
            <CardDescription>
              Ожидающие подтверждения
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingPayouts?.filter(p => p.status === 'pending').length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет ожидающих заявок</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingPayouts.filter(p => p.status === 'pending').map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-medium">{payout.amount} ₽</p>
                      <p className="text-xs text-muted-foreground">
                        {payout.paymentMethod === 'card' ? 'Карта' : payout.paymentMethod}: {payout.paymentDetails}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payout.createdAt && new Date(payout.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                        onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: 'completed' })}
                        disabled={updatePayoutMutation.isPending}
                        data-testid={`button-approve-${payout.id}`}
                      >
                        Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600"
                        onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: 'rejected' })}
                        disabled={updatePayoutMutation.isPending}
                        data-testid={`button-reject-${payout.id}`}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Участники программы
          </CardTitle>
          <CardDescription>
            Пользователи с реферальными кодами
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!usersWithReferrals.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет участников</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Пользователь</th>
                    <th className="text-left py-2 font-medium">Email</th>
                    <th className="text-left py-2 font-medium">Реф. код</th>
                    <th className="text-right py-2 font-medium">Баланс</th>
                  </tr>
                </thead>
                <tbody>
                  {usersWithReferrals.slice(0, 20).map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2">{user.username}</td>
                      <td className="py-2 text-muted-foreground">{user.email}</td>
                      <td className="py-2 font-mono text-xs">{user.referralCode}</td>
                      <td className="py-2 text-right">{user.bonusBalance || 0} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
