import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Users, Wallet, Percent, Banknote, Gift, CheckCircle, XCircle, Clock, FileText,
  BarChart3, Link2, Plus, Edit, Trash2, Eye, Copy, TrendingUp, MousePointer
} from "lucide-react";

type ReferralSettings = {
  id: number;
  percentReward: number;
  fixedReward: number;
  bonusReward: number;
  minPayoutAmount: number;
  isEnabled: boolean;
  offerText: string | null;
  updatedAt: string;
};

type ReferralParticipant = {
  id: number;
  userId: number;
  participantType: "self_employed" | "ip" | "ooo";
  fullName: string;
  phone: string;
  birthDate: string | null;
  inn: string;
  statusConfirmation: string | null;
  companyName: string | null;
  ogrn: string | null;
  kpp: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  bankName: string | null;
  bik: string | null;
  bankAccount: string | null;
  corrAccount: string | null;
  offerAcceptedAt: string | null;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  customPercentReward: number | null;
  createdAt: string;
};

type ReferralPayout = {
  id: number;
  userId: number;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  paymentDetails: string | null;
  adminNotes: string | null;
  processedById: number | null;
  createdAt: string;
  processedAt: string | null;
};

type CustomReferralLink = {
  id: number;
  userId: number;
  code: string;
  name: string;
  description: string | null;
  customPercent: number;
  earningsTotal: number;
  earningsPending: number;
  earningsPaid: number;
  referralsCount: number;
  clicksCount: number;
  isActive: boolean;
  createdById: number;
  createdAt: string;
};

type ReferralStatItem = {
  user: { id: number; name: string; email: string };
  participant: ReferralParticipant | null;
  referral: { id: number; referralCode: string; earningsTotal: number; referralsCount: number } | null;
  customLinks: CustomReferralLink[];
  totalEarnings: number;
  pendingPayouts: number;
  referralsCount: number;
};

const participantTypeLabels: Record<string, string> = {
  self_employed: "Самозанятый",
  ip: "ИП",
  ooo: "ООО",
};

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  approved: "Одобрен",
  rejected: "Отклонён",
  processing: "Обработка",
  completed: "Выполнено",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  processing: "secondary",
  completed: "default",
};

export default function SuperAdminReferralSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [editPercentOpen, setEditPercentOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ReferralStatItem | null>(null);
  const [newLinkData, setNewLinkData] = useState({
    userId: 0,
    code: "",
    name: "",
    description: "",
    customPercent: 10,
  });
  const [newPercent, setNewPercent] = useState<number | null>(null);

  const { data: settings, isLoading: isLoadingSettings } = useQuery<ReferralSettings>({
    queryKey: ["/api/admin/referral/settings"],
  });

  const { data: participants, isLoading: isLoadingParticipants } = useQuery<ReferralParticipant[]>({
    queryKey: ["/api/admin/referral/participants"],
  });

  const { data: payouts, isLoading: isLoadingPayouts } = useQuery<ReferralPayout[]>({
    queryKey: ["/api/admin/referral/payouts"],
  });

  const { data: allStats, isLoading: isLoadingStats } = useQuery<ReferralStatItem[]>({
    queryKey: ["/api/admin/referral/all-stats"],
  });

  const { data: customLinks, isLoading: isLoadingLinks } = useQuery<CustomReferralLink[]>({
    queryKey: ["/api/admin/referral/custom-links"],
  });

  const [formData, setFormData] = useState({
    percentReward: 10,
    fixedReward: 0,
    bonusReward: 0,
    minPayoutAmount: 1000,
    isEnabled: true,
    offerText: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        percentReward: settings.percentReward,
        fixedReward: settings.fixedReward,
        bonusReward: settings.bonusReward,
        minPayoutAmount: settings.minPayoutAmount,
        isEnabled: settings.isEnabled,
        offerText: settings.offerText || "",
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PATCH", "/api/admin/referral/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/settings"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/referral/participants/${id}`, { status, adminNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      toast({ title: "Статус участника обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/referral/payouts/${id}`, { status, adminNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      toast({ title: "Статус выплаты обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const updatePercentMutation = useMutation({
    mutationFn: async ({ userId, customPercentReward }: { userId: number; customPercentReward: number | null }) => {
      const response = await apiRequest("PATCH", `/api/admin/referral/participants/${userId}/percent`, { customPercentReward });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      toast({ title: "Персональный процент обновлён" });
      setEditPercentOpen(false);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить процент", variant: "destructive" });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: typeof newLinkData) => {
      const response = await apiRequest("POST", "/api/admin/referral/custom-links", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/custom-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      toast({ title: "Ссылка создана" });
      setCreateLinkOpen(false);
      setNewLinkData({ userId: 0, code: "", name: "", description: "", customPercent: 10 });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать ссылку", variant: "destructive" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/referral/custom-links/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/custom-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      toast({ title: "Ссылка удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить ссылку", variant: "destructive" });
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/referral/participants/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/all-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/custom-links"] });
      toast({ title: "Участник удалён", description: "Участник и все его именные ссылки удалены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить участника", variant: "destructive" });
    },
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/referral/custom-links/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral/custom-links"] });
      toast({ title: "Статус ссылки обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", variant: "destructive" });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано в буфер обмена" });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoadingSettings) {
    return (
      <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          Реферальная программа
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Управление настройками, участниками, статистикой и именными ссылками
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5 gap-1">
            <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs sm:text-sm px-2 sm:px-4">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats" className="text-xs sm:text-sm px-2 sm:px-4">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Статистика</span>
            </TabsTrigger>
            <TabsTrigger value="links" data-testid="tab-links" className="text-xs sm:text-sm px-2 sm:px-4">
              <Link2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ссылки ({customLinks?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="participants" data-testid="tab-participants" className="text-xs sm:text-sm px-2 sm:px-4">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Заявки ({participants?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts" className="text-xs sm:text-sm px-2 sm:px-4">
              <Wallet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Выплаты ({payouts?.filter(p => p.status === "pending").length || 0})</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>Настройте вознаграждения и условия программы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Программа активна</Label>
                  <p className="text-sm text-muted-foreground">Включить/выключить реферальную программу</p>
                </div>
                <Switch
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                  data-testid="switch-enabled"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Процент от покупок (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.percentReward}
                    onChange={(e) => setFormData({ ...formData, percentReward: parseInt(e.target.value) || 0 })}
                    data-testid="input-percent-reward"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">Процент от суммы покупки приглашённого</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Фиксированная выплата (руб)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.fixedReward}
                    onChange={(e) => setFormData({ ...formData, fixedReward: parseInt(e.target.value) || 0 })}
                    data-testid="input-fixed-reward"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Бонусное вознаграждение (руб)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.bonusReward}
                    onChange={(e) => setFormData({ ...formData, bonusReward: parseInt(e.target.value) || 0 })}
                    data-testid="input-bonus-reward"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Минимальная сумма вывода (руб)
                  </Label>
                  <Input
                    type="number"
                    min={100}
                    value={formData.minPayoutAmount}
                    onChange={(e) => setFormData({ ...formData, minPayoutAmount: parseInt(e.target.value) || 1000 })}
                    data-testid="input-min-payout"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Текст договора-оферты
                </Label>
                <Textarea
                  value={formData.offerText}
                  onChange={(e) => setFormData({ ...formData, offerText: e.target.value })}
                  placeholder="Введите текст договора-оферты реферальной программы..."
                  className="min-h-[150px] sm:min-h-[200px]"
                  data-testid="textarea-offer"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Статистика участников
              </CardTitle>
              <CardDescription>Полная информация о рефералах, заработке и выплатах</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-48" />
              ) : allStats && allStats.length > 0 ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Участник</TableHead>
                          <TableHead className="text-center">Рефералы</TableHead>
                          <TableHead className="text-center">Заработано</TableHead>
                          <TableHead className="text-center">На выводе</TableHead>
                          <TableHead className="text-center">Процент</TableHead>
                          <TableHead className="text-center">Ссылки</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allStats.map((stat) => (
                          <TableRow key={stat.user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{stat.user.name}</div>
                                <div className="text-sm text-muted-foreground">{stat.user.email}</div>
                                {stat.participant && (
                                  <Badge variant={statusColors[stat.participant.status]} className="mt-1">
                                    {statusLabels[stat.participant.status]}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{stat.referralsCount}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-medium">{formatMoney(stat.totalEarnings)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={stat.pendingPayouts > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                                {formatMoney(stat.pendingPayouts)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {stat.participant?.customPercentReward !== null && stat.participant?.customPercentReward !== undefined
                                  ? `${stat.participant.customPercentReward}%`
                                  : `${settings?.percentReward || 10}%`}
                                {stat.participant?.customPercentReward !== null && stat.participant?.customPercentReward !== undefined && (
                                  <span className="ml-1 text-xs">(перс.)</span>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{stat.customLinks.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(stat);
                                    setNewPercent(stat.participant?.customPercentReward ?? null);
                                    setEditPercentOpen(true);
                                  }}
                                  title="Изменить процент"
                                  data-testid={`button-edit-percent-${stat.user.id}`}
                                >
                                  <Percent className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setNewLinkData({ ...newLinkData, userId: stat.user.id });
                                    setCreateLinkOpen(true);
                                  }}
                                  title="Создать ссылку"
                                  data-testid={`button-create-link-${stat.user.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {allStats.map((stat) => (
                      <Card key={stat.user.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{stat.user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{stat.user.email}</p>
                              {stat.participant && (
                                <Badge variant={statusColors[stat.participant.status]} className="mt-1 text-xs">
                                  {statusLabels[stat.participant.status]}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(stat);
                                  setNewPercent(stat.participant?.customPercentReward ?? null);
                                  setEditPercentOpen(true);
                                }}
                                data-testid={`button-edit-percent-mobile-${stat.user.id}`}
                              >
                                <Percent className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setNewLinkData({ ...newLinkData, userId: stat.user.id });
                                  setCreateLinkOpen(true);
                                }}
                                data-testid={`button-create-link-mobile-${stat.user.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-muted/30 rounded-md">
                              <p className="text-[10px] text-muted-foreground">Рефералы</p>
                              <p className="text-sm font-bold">{stat.referralsCount}</p>
                            </div>
                            <div className="p-2 bg-muted/30 rounded-md">
                              <p className="text-[10px] text-muted-foreground">Заработок</p>
                              <p className="text-sm font-bold text-green-600">{formatMoney(stat.totalEarnings)}</p>
                            </div>
                            <div className="p-2 bg-muted/30 rounded-md">
                              <p className="text-[10px] text-muted-foreground">Процент</p>
                              <p className="text-sm font-bold">
                                {stat.participant?.customPercentReward ?? settings?.percentReward ?? 10}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет участников реферальной программы</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Links Tab */}
        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Именные ссылки
                </CardTitle>
                <CardDescription>Персональные реферальные ссылки с индивидуальными процентами</CardDescription>
              </div>
              <Button onClick={() => setCreateLinkOpen(true)} data-testid="button-create-link">
                <Plus className="h-4 w-4 mr-2" />
                Создать ссылку
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingLinks ? (
                <Skeleton className="h-48" />
              ) : customLinks && customLinks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ссылка</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead className="text-center">Процент</TableHead>
                        <TableHead className="text-center">Клики</TableHead>
                        <TableHead className="text-center">Рефералы</TableHead>
                        <TableHead className="text-center">Заработок</TableHead>
                        <TableHead className="text-center">Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">{link.code}</code>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => copyToClipboard(`${window.location.origin}/r/${link.code}`)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{link.name}</div>
                              {link.description && (
                                <div className="text-xs text-muted-foreground">{link.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{link.customPercent}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <MousePointer className="h-3 w-3 text-muted-foreground" />
                              {link.clicksCount}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {link.referralsCount}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-medium">
                            {formatMoney(link.earningsTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={link.isActive}
                              onCheckedChange={(checked) => toggleLinkMutation.mutate({ id: link.id, isActive: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Именные ссылки не созданы</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCreateLinkOpen(true)}>
                    Создать первую ссылку
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на участие</CardTitle>
              <CardDescription>Одобряйте или отклоняйте заявки участников</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingParticipants ? (
                <Skeleton className="h-48" />
              ) : participants && participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Участник</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>ИНН</TableHead>
                        <TableHead>Контакты</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{participant.fullName}</div>
                              {participant.companyName && (
                                <div className="text-sm text-muted-foreground">{participant.companyName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {participantTypeLabels[participant.participantType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{participant.inn}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{participant.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[participant.status]}>
                              {statusLabels[participant.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {participant.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => updateParticipantMutation.mutate({ id: participant.id, status: "approved" })}
                                    data-testid={`button-approve-${participant.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateParticipantMutation.mutate({ id: participant.id, status: "rejected" })}
                                    data-testid={`button-reject-${participant.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-delete-participant-${participant.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Вы уверены, что хотите удалить участника <strong>{participant.fullName}</strong>?
                                      Это также удалит все его именные реферальные ссылки. Это действие нельзя отменить.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteParticipantMutation.mutate(participant.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Заявки на участие отсутствуют</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на выплату</CardTitle>
              <CardDescription>Обрабатывайте заявки на вывод средств</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPayouts ? (
                <Skeleton className="h-48" />
              ) : payouts && payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Реквизиты</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => {
                        let details: any = {};
                        try {
                          details = payout.paymentDetails ? JSON.parse(payout.paymentDetails) : {};
                        } catch {}
                        
                        return (
                          <TableRow key={payout.id}>
                            <TableCell className="font-medium text-lg">
                              {formatMoney(payout.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {details.bankName && <div>{details.bankName}</div>}
                                {details.bankAccount && (
                                  <div className="text-muted-foreground font-mono text-xs">{details.bankAccount}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(payout.createdAt).toLocaleDateString("ru-RU")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColors[payout.status]}>
                                {statusLabels[payout.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {payout.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "processing" })}
                                    >
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "completed" })}
                                      data-testid={`button-complete-${payout.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "rejected" })}
                                      data-testid={`button-reject-payout-${payout.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {payout.status === "processing" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "completed" })}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updatePayoutMutation.mutate({ id: payout.id, status: "rejected" })}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Заявки на выплату отсутствуют</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Link Dialog */}
      <Dialog open={createLinkOpen} onOpenChange={setCreateLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать именную ссылку</DialogTitle>
            <DialogDescription>
              Создайте персональную реферальную ссылку с индивидуальным процентом
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Участник</Label>
              <Select
                value={newLinkData.userId ? newLinkData.userId.toString() : ""}
                onValueChange={(val) => setNewLinkData({ ...newLinkData, userId: parseInt(val) || 0 })}
              >
                <SelectTrigger data-testid="select-link-user">
                  <SelectValue placeholder="Выберите участника" />
                </SelectTrigger>
                <SelectContent>
                  {allStats?.map((stat) => (
                    <SelectItem key={stat.user.id} value={stat.user.id.toString()}>
                      {stat.user.name || stat.user.email} (ID: {stat.user.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Код ссылки</Label>
              <Input
                value={newLinkData.code}
                onChange={(e) => setNewLinkData({ ...newLinkData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                placeholder="MYCODE123"
                data-testid="input-link-code"
              />
              <p className="text-xs text-muted-foreground">Только латинские буквы, цифры, дефис и подчёркивание</p>
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={newLinkData.name}
                onChange={(e) => setNewLinkData({ ...newLinkData, name: e.target.value })}
                placeholder="Название для пользователя"
                data-testid="input-link-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание (необязательно)</Label>
              <Textarea
                value={newLinkData.description}
                onChange={(e) => setNewLinkData({ ...newLinkData, description: e.target.value })}
                placeholder="Описание ссылки..."
              />
            </div>
            <div className="space-y-2">
              <Label>Процент вознаграждения (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newLinkData.customPercent}
                onChange={(e) => setNewLinkData({ ...newLinkData, customPercent: parseInt(e.target.value) || 10 })}
                data-testid="input-link-percent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateLinkOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createLinkMutation.mutate(newLinkData)}
              disabled={createLinkMutation.isPending || !newLinkData.userId || !newLinkData.code || !newLinkData.name}
              data-testid="button-submit-link"
            >
              {createLinkMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Percent Dialog */}
      <Dialog open={editPercentOpen} onOpenChange={setEditPercentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить персональный процент</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>Изменить процент для {selectedUser.user.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Персональный процент (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newPercent ?? ""}
                onChange={(e) => setNewPercent(e.target.value ? parseInt(e.target.value) : null)}
                placeholder={`Стандартный: ${settings?.percentReward || 10}%`}
                data-testid="input-custom-percent"
              />
              <p className="text-xs text-muted-foreground">
                Оставьте пустым для использования стандартного процента ({settings?.percentReward || 10}%)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPercentOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updatePercentMutation.mutate({
                    userId: selectedUser.user.id,
                    customPercentReward: newPercent,
                  });
                }
              }}
              disabled={updatePercentMutation.isPending}
              data-testid="button-save-percent"
            >
              {updatePercentMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
