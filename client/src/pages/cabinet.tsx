import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Shield,
  LogOut,
  Package,
  Users,
  Gift,
  Copy,
  Loader2,
  ShoppingBag,
  Wallet,
  Home,
  User,
  Bell,
  CreditCard,
  Check,
  X,
  Clock,
  ChevronRight,
  Phone,
  Mail,
  Building,
  Globe,
  MessageCircle,
  Send,
  Settings,
  Plus,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  FileText,
  Eye,
  Star,
  Download,
} from "lucide-react";
import { SiWhatsapp, SiTelegram, SiVk } from "react-icons/si";
import type { Order, Package as PackageType, Notification, Commission, Payout, UserSubscription, UserSite, SiteAudit } from "@shared/schema";
import NotificationSettings from "@/pages/cabinet/notification-settings";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role?: string;
  referralCode: string;
  bonusBalance: number;
  balance: number;
  fullName?: string;
  phone?: string;
  whatsapp?: string;
  telegramHandle?: string;
  vkProfile?: string;
  organizationInn?: string;
  siteUrl?: string;
}

interface ReferralData {
  referrals: Array<{
    id: string;
    referredId: string;
    status: string;
    commissionEarned: number;
    createdAt: string;
  }>;
  commissionPercent: number;
  totalReferrals: number;
  paidReferrals: number;
  totalEarned: number;
  pendingEarned: number;
}

interface PayoutData {
  payouts: Payout[];
  balance: number;
  minPayoutAmount: number;
}

interface CommissionData {
  commissions: Commission[];
  balance: number;
}

export default function CabinetPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState("sites");
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [selectedSite, setSelectedSite] = useState<UserSite | null>(null);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("userToken");
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  };

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setLocation("/auth");
      return;
    }
    
    fetchWithAuth("/api/auth/me")
      .then((data) => {
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
        setLocation("/auth");
      });
  }, [setLocation]);

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/user/orders"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/orders"),
  });

  const { data: packages } = useQuery<PackageType[]>({
    queryKey: ["/api/packages"],
  });

  const { data: referralData, isLoading: referralsLoading } = useQuery<ReferralData>({
    queryKey: ["/api/user/referrals"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/referrals"),
  });

  const { data: payoutData, isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery<PayoutData>({
    queryKey: ["/api/user/payouts"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/payouts"),
  });

  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/user/notifications"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/notifications"),
  });

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery<UserSubscription>({
    queryKey: ["/api/user/subscriptions"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/subscriptions"),
  });

  const { data: userSites, isLoading: sitesLoading, refetch: refetchSites } = useQuery<UserSite[]>({
    queryKey: ["/api/user/sites"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/sites"),
  });

  const { data: userAudits, isLoading: auditsLoading } = useQuery<SiteAudit[]>({
    queryKey: ["/api/user/audits"],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/api/user/audits"),
  });

  const addSiteMutation = useMutation({
    mutationFn: async (url: string) => {
      const token = localStorage.getItem("userToken");
      const response = await fetch("/api/user/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to add site");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Сайт добавлен" });
      setShowAddSiteDialog(false);
      setNewSiteUrl("");
      refetchSites();
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const token = localStorage.getItem("userToken");
      const response = await fetch(`/api/user/sites/${siteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete site");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Сайт удален" });
      refetchSites();
    },
    onError: () => {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    },
  });

  const profileForm = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      whatsapp: "",
      telegramHandle: "",
      vkProfile: "",
      organizationInn: "",
      siteUrl: "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        telegramHandle: user.telegramHandle || "",
        vkProfile: user.vkProfile || "",
        organizationInn: user.organizationInn || "",
        siteUrl: user.siteUrl || "",
      });
    }
  }, [user, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("userToken");
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Профиль обновлен" });
      const updatedUser = { ...user, ...data };
      setUser(updatedUser as UserInfo);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const payoutForm = useForm({
    defaultValues: {
      amount: 0,
      paymentMethod: "card",
      paymentDetails: "",
    },
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("userToken");
      const response = await fetch("/api/user/payouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create payout");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Заявка на вывод отправлена" });
      payoutForm.reset();
      refetchPayouts();
      refetchNotifications();
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("userToken");
      await fetch(`/api/user/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => refetchNotifications(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("userToken");
      await fetch("/api/user/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => refetchNotifications(),
  });

  const updateSubscriptionsMutation = useMutation({
    mutationFn: async (data: Partial<UserSubscription>) => {
      const token = localStorage.getItem("userToken");
      const response = await fetch("/api/user/subscriptions", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Настройки уведомлений сохранены" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    toast({ title: "Вы вышли из системы" });
    setLocation("/");
  };

  const copyReferralLink = () => {
    if (!user?.referralCode) return;
    const link = `${window.location.origin}/auth?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Реферальная ссылка скопирована" });
  };

  const copyReferralCode = () => {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode);
    toast({ title: "Код скопирован" });
  };

  const getPackageName = (packageId: string | null) => {
    if (!packageId || !packages) return "Не указан";
    const pkg = packages.find((p) => p.id === packageId);
    return pkg?.name || "Не указан";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Ожидает</Badge>;
      case "paid":
        return <Badge className="bg-green-600 text-white dark:bg-green-700"><Check className="h-3 w-3 mr-1" />Оплачен</Badge>;
      case "completed":
        return <Badge className="bg-blue-600 text-white dark:bg-blue-700"><Check className="h-3 w-3 mr-1" />Выполнен</Badge>;
      case "cancelled":
      case "rejected":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Отменен</Badge>;
      case "credited":
        return <Badge className="bg-green-600 text-white dark:bg-green-700"><Check className="h-3 w-3 mr-1" />Зачислено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Help152FZ</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.username}
            </span>
            {(user.role === 'admin' || user.role === 'superadmin') && (
              <Link href="/admin">
                <Button variant="outline" size="sm" data-testid="link-admin">
                  Админ-панель
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Личный кабинет</h1>
          <p className="text-sm md:text-base text-muted-foreground">Мониторинг соответствия требованиям 149-ФЗ и 152-ФЗ</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Globe className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Сайтов</p>
                  <p className="text-lg md:text-xl font-bold" data-testid="text-sites-count">{userSites?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Аудитов</p>
                  <p className="text-lg md:text-xl font-bold" data-testid="text-audits-count">{userAudits?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Рефералов</p>
                  <p className="text-lg md:text-xl font-bold">{referralData?.totalReferrals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Wallet className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Баланс</p>
                  <p className="text-lg md:text-xl font-bold">{payoutData?.balance || 0} ₽</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <TabsList className="inline-flex w-auto min-w-full md:flex md:flex-wrap">
              <TabsTrigger value="sites" data-testid="tab-sites" className="text-xs md:text-sm">
                <Globe className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Мои сайты</span>
              </TabsTrigger>
              <TabsTrigger value="profile" data-testid="tab-profile" className="text-xs md:text-sm">
                <User className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Профиль</span>
              </TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders" className="text-xs md:text-sm">
                <Package className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Заказы</span>
              </TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports" className="text-xs md:text-sm">
                <FileText className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Отчёты</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="text-xs md:text-sm">
                <CreditCard className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Подписки</span>
              </TabsTrigger>
              <TabsTrigger value="referral" data-testid="tab-referral" className="text-xs md:text-sm">
                <Users className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Рефералы</span>
              </TabsTrigger>
              <TabsTrigger value="payouts" data-testid="tab-payouts" className="text-xs md:text-sm">
                <Wallet className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Выплаты</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications" className="relative text-xs md:text-sm">
                <Bell className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Уведомления</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center text-[10px] md:text-xs">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notify-settings" data-testid="tab-notify-settings" className="text-xs md:text-sm">
                <Settings className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Настройки</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sites">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Мои сайты</CardTitle>
                    <CardDescription>Мониторинг соответствия требованиям 149-ФЗ и 152-ФЗ</CardDescription>
                  </div>
                  <Dialog open={showAddSiteDialog} onOpenChange={setShowAddSiteDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-site">
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить сайт
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить новый сайт</DialogTitle>
                        <DialogDescription>
                          Введите адрес сайта для мониторинга
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="site-url">URL сайта</Label>
                          <Input
                            id="site-url"
                            placeholder="https://example.com"
                            value={newSiteUrl}
                            onChange={(e) => setNewSiteUrl(e.target.value)}
                            data-testid="input-new-site-url"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddSiteDialog(false)}
                        >
                          Отмена
                        </Button>
                        <Button
                          onClick={() => addSiteMutation.mutate(newSiteUrl)}
                          disabled={!newSiteUrl || addSiteMutation.isPending}
                          data-testid="button-confirm-add-site"
                        >
                          {addSiteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Добавить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {sitesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : !userSites || userSites.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Нет добавленных сайтов</h3>
                    <p className="text-muted-foreground mb-4">
                      Добавьте свой первый сайт для мониторинга соответствия
                    </p>
                    <Button onClick={() => setShowAddSiteDialog(true)} data-testid="button-add-first-site">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить сайт
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userSites.map((site) => {
                      const latestAudit = userAudits?.find(a => a.siteId === site.id);
                      const getStatusColor = (score: number | null | undefined) => {
                        if (score === null || score === undefined) return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
                        if (score >= 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
                        if (score >= 50) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
                        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
                      };
                      const getStatusIcon = (score: number | null | undefined) => {
                        if (score === null || score === undefined) return <Clock className="h-5 w-5" />;
                        if (score >= 80) return <CheckCircle2 className="h-5 w-5" />;
                        if (score >= 50) return <AlertTriangle className="h-5 w-5" />;
                        return <AlertCircle className="h-5 w-5" />;
                      };
                      
                      return (
                        <Card key={site.id} className="overflow-visible" data-testid={`card-site-${site.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-full ${getStatusColor(latestAudit?.overallScore)}`}>
                                  {getStatusIcon(latestAudit?.overallScore)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium truncate">{site.displayName || site.url}</h3>
                                    <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground" data-testid={`link-site-url-${site.id}`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">{site.url}</p>
                                  
                                  {latestAudit ? (
                                    <div className="mt-3 grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                          <span>149-ФЗ</span>
                                          <span className="font-medium">{latestAudit.law149Score ?? 0}%</span>
                                        </div>
                                        <Progress value={latestAudit.law149Score ?? 0} className="h-2" />
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                          <span>152-ФЗ</span>
                                          <span className="font-medium">{latestAudit.law152Score ?? 0}%</span>
                                        </div>
                                        <Progress value={latestAudit.law152Score ?? 0} className="h-2" />
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground mt-2">Аудит не проводился</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {latestAudit && (
                                  <Badge variant="outline">
                                    Общий балл: {latestAudit.overallScore ?? 0}%
                                  </Badge>
                                )}
                                <Link href={`/cabinet/sites/${site.id}`}>
                                  <Button variant="outline" size="sm" data-testid={`button-view-site-${site.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Подробнее
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteSiteMutation.mutate(site.id)}
                                  disabled={deleteSiteMutation.isPending}
                                  data-testid={`button-delete-site-${site.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Мой профиль</CardTitle>
                <CardDescription>Редактирование персональных данных</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ФИО</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input {...field} placeholder="Иванов Иван Иванович" className="pl-10" data-testid="input-fullname" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input {...field} placeholder="+7 (999) 123-45-67" className="pl-10" data-testid="input-phone" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2">
                        <Separator className="my-4" />
                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Мессенджеры
                        </h3>
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <SiWhatsapp className="h-4 w-4 text-green-500" />
                              WhatsApp
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+7 (999) 123-45-67" data-testid="input-whatsapp" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="telegramHandle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <SiTelegram className="h-4 w-4 text-blue-500" />
                              Telegram
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="@username" data-testid="input-telegram" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="vkProfile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <SiVk className="h-4 w-4 text-blue-600" />
                              VK
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="vk.com/username" data-testid="input-vk" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2">
                        <Separator className="my-4" />
                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Организация
                        </h3>
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="organizationInn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ИНН организации</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input {...field} placeholder="1234567890" className="pl-10" data-testid="input-inn" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="siteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL сайта</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input {...field} placeholder="https://example.com" className="pl-10" data-testid="input-site-url" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                        {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </Form>

                <Separator className="my-8" />

                <div>
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Настройки уведомлений
                  </h3>
                  {subscriptionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : subscriptions && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Новости по email</Label>
                          <p className="text-sm text-muted-foreground">Получать новости и обновления</p>
                        </div>
                        <Switch
                          checked={subscriptions.emailNews ?? true}
                          onCheckedChange={(checked) => updateSubscriptionsMutation.mutate({ emailNews: checked })}
                          data-testid="switch-email-news"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Рекламные рассылки</Label>
                          <p className="text-sm text-muted-foreground">Акции и специальные предложения</p>
                        </div>
                        <Switch
                          checked={subscriptions.emailPromo ?? true}
                          onCheckedChange={(checked) => updateSubscriptionsMutation.mutate({ emailPromo: checked })}
                          data-testid="switch-email-promo"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Push-уведомления</Label>
                          <p className="text-sm text-muted-foreground">Уведомления в приложении</p>
                        </div>
                        <Switch
                          checked={subscriptions.inAppNotifications ?? true}
                          onCheckedChange={(checked) => updateSubscriptionsMutation.mutate({ inAppNotifications: checked })}
                          data-testid="switch-push"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>История заказов</CardTitle>
                <CardDescription>Ваши заказы и отчеты об аудите</CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !orders?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">У вас пока нет заказов</p>
                    <Link href="/">
                      <Button data-testid="button-go-home">
                        <Home className="h-4 w-4 mr-2" />
                        Заказать аудит
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-md flex-wrap"
                        data-testid={`order-row-${order.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{getPackageName(order.packageId)}</span>
                            {getStatusBadge(order.status || "pending")}
                          </div>
                          <p className="text-sm text-muted-foreground">{order.siteUrl}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "Дата не указана"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{order.amount} ₽</p>
                          {order.discountAmount && order.discountAmount > 0 && (
                            <p className="text-xs text-green-600">Скидка: -{order.discountAmount} ₽</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Экспресс-проверки с PDF отчётом</CardTitle>
                  <CardDescription>Скачайте PDF отчёт с результатами проверки и суммами штрафов</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : !orders || orders.filter(o => o.orderType === "express" && o.auditResults).length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Нет экспресс-проверок</h3>
                      <p className="text-muted-foreground mb-4">
                        Пройдите экспресс-проверку на главной странице, авторизовавшись перед проверкой
                      </p>
                      <Link href="/">
                        <Button data-testid="button-go-to-check">
                          Пройти проверку
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders
                        .filter(o => o.orderType === "express" && o.auditResults)
                        .map((order) => {
                          const getScoreColor = (score: number | null | undefined) => {
                            if (score === null || score === undefined) return "text-muted-foreground";
                            if (score >= 70) return "text-green-600";
                            if (score >= 40) return "text-yellow-600";
                            return "text-red-600";
                          };
                          
                          const handleDownloadPdf = async () => {
                            try {
                              const token = localStorage.getItem("userToken");
                              const response = await fetch(`/api/user/orders/${order.id}/pdf`, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              });
                              
                              if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || "Ошибка скачивания");
                              }
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `audit-report-${order.id.substring(0, 8)}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              
                              toast({ title: "PDF отчёт скачан" });
                            } catch (error: any) {
                              toast({ 
                                title: error.message || "Ошибка скачивания отчёта", 
                                variant: "destructive" 
                              });
                            }
                          };
                          
                          return (
                            <Card key={order.id} className="hover-elevate" data-testid={`card-express-report-${order.id}`}>
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={`p-3 rounded-full shrink-0 ${
                                      (order.totalScore || 0) >= 70 ? "bg-green-100 dark:bg-green-900/30" :
                                      (order.totalScore || 0) >= 40 ? "bg-yellow-100 dark:bg-yellow-900/30" :
                                      "bg-red-100 dark:bg-red-900/30"
                                    }`}>
                                      <Shield className={`h-5 w-5 ${getScoreColor(order.totalScore)}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{order.siteUrl}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {order.createdAt
                                          ? new Date(order.createdAt).toLocaleDateString("ru-RU", {
                                              day: "numeric",
                                              month: "long",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "Дата не указана"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className={`text-xl font-bold ${getScoreColor(order.totalScore)}`}>
                                        {order.totalScore ?? "-"}%
                                      </p>
                                      <p className="text-xs text-muted-foreground">Соответствие</p>
                                    </div>
                                    <Button 
                                      onClick={handleDownloadPdf}
                                      data-testid={`button-download-pdf-${order.id}`}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Скачать PDF
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>Все отчёты аудитов</CardTitle>
                      <CardDescription>История аудитов всех ваших сайтов</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="all" data-testid="select-report-filter">
                        <SelectTrigger className="w-[180px]" data-testid="trigger-report-filter">
                          <SelectValue placeholder="Фильтр по статусу" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="completed">Завершённые</SelectItem>
                          <SelectItem value="pending">В обработке</SelectItem>
                          <SelectItem value="failed">С ошибками</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {auditsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : !userAudits || userAudits.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Нет отчётов</h3>
                      <p className="text-muted-foreground mb-4">
                        Добавьте сайт и запустите проверку для получения отчёта
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium text-sm">Дата</th>
                            <th className="text-left py-3 px-2 font-medium text-sm">Сайт</th>
                            <th className="text-center py-3 px-2 font-medium text-sm">Общий балл</th>
                            <th className="text-center py-3 px-2 font-medium text-sm">149-ФЗ</th>
                            <th className="text-center py-3 px-2 font-medium text-sm">152-ФЗ</th>
                            <th className="text-center py-3 px-2 font-medium text-sm">Статус</th>
                            <th className="text-right py-3 px-2 font-medium text-sm">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userAudits.map((audit) => {
                            const site = userSites?.find(s => s.id === audit.siteId);
                            const getScoreColor = (score: number | null | undefined) => {
                              if (score === null || score === undefined) return "text-muted-foreground";
                              if (score >= 80) return "text-green-600";
                              if (score >= 50) return "text-yellow-600";
                              return "text-red-600";
                            };
                            return (
                              <tr key={audit.id} className="border-b last:border-0" data-testid={`row-audit-${audit.id}`}>
                                <td className="py-3 px-2 text-sm">
                                  {audit.createdAt ? new Date(audit.createdAt).toLocaleDateString("ru-RU") : "-"}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate max-w-[200px]">
                                      {site?.displayName || site?.url || "-"}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`font-bold ${getScoreColor(audit.overallScore)}`}>
                                    {audit.overallScore ?? "-"}%
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={getScoreColor(audit.law149Score)}>
                                    {audit.law149Score ?? "-"}%
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={getScoreColor(audit.law152Score)}>
                                    {audit.law152Score ?? "-"}%
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <Badge variant={audit.status === "completed" ? "default" : audit.status === "failed" ? "destructive" : "secondary"}>
                                    {audit.status === "completed" ? "Завершён" : audit.status === "failed" ? "Ошибка" : "В обработке"}
                                  </Badge>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <Link href={`/cabinet/sites/${audit.siteId}`}>
                                    <Button variant="ghost" size="sm" data-testid={`button-view-audit-${audit.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>Подписки на мониторинг</CardTitle>
                      <CardDescription>Управление активными подписками на мониторинг сайтов</CardDescription>
                    </div>
                    <Link href="/payment">
                      <Button data-testid="button-new-subscription">
                        <Plus className="h-4 w-4 mr-2" />
                        Оформить подписку
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {!userSites || userSites.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Нет сайтов для мониторинга</h3>
                      <p className="text-muted-foreground mb-4">
                        Сначала добавьте сайт для проверки
                      </p>
                      <Button onClick={() => setActiveTab("sites")} data-testid="button-go-to-sites">
                        Перейти к сайтам
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userSites.map((site) => (
                        <Card key={site.id} data-testid={`card-subscription-${site.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${site.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                                  <Globe className={`h-5 w-5 ${site.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                                </div>
                                <div>
                                  <h4 className="font-medium">{site.displayName || site.url}</h4>
                                  <p className="text-sm text-muted-foreground">{site.url}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={site.isActive ? "default" : "secondary"}>
                                      {site.isActive ? "Активна" : "Не активна"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link href={`/cabinet/sites/${site.id}`}>
                                  <Button variant="outline" size="sm" data-testid={`button-manage-subscription-${site.id}`}>
                                    Управление
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Тарифные планы</CardTitle>
                  <CardDescription>Выберите подходящий план мониторинга</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg space-y-3">
                      <h4 className="font-semibold">Базовый</h4>
                      <p className="text-2xl font-bold">990 ₽<span className="text-sm font-normal text-muted-foreground">/мес</span></p>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />1 сайт</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Еженедельные проверки</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Email-уведомления</li>
                      </ul>
                      <Link href="/payment?plan=basic" className="block">
                        <Button variant="outline" className="w-full" data-testid="button-plan-basic">Выбрать</Button>
                      </Link>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3 border-primary relative">
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Популярный</Badge>
                      <h4 className="font-semibold">Стандарт</h4>
                      <p className="text-2xl font-bold">1 990 ₽<span className="text-sm font-normal text-muted-foreground">/мес</span></p>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />До 5 сайтов</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Ежедневные проверки</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Telegram-уведомления</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Приоритетная поддержка</li>
                      </ul>
                      <Link href="/payment?plan=standard" className="block">
                        <Button className="w-full" data-testid="button-plan-standard">Выбрать</Button>
                      </Link>
                    </div>
                    <div className="p-4 border rounded-lg space-y-3">
                      <h4 className="font-semibold">Премиум</h4>
                      <p className="text-2xl font-bold">4 990 ₽<span className="text-sm font-normal text-muted-foreground">/мес</span></p>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Неограничено сайтов</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Мониторинг 24/7</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />API-доступ</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Персональный менеджер</li>
                      </ul>
                      <Link href="/payment?plan=premium" className="block">
                        <Button variant="outline" className="w-full" data-testid="button-plan-premium">Выбрать</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="referral">
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Всего рефералов</p>
                      <p className="text-xl font-bold" data-testid="text-total-referrals">{referralData?.totalReferrals || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Заработано</p>
                      <p className="text-xl font-bold text-green-600" data-testid="text-total-earned">{referralData?.totalEarned || 0} ₽</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ожидает</p>
                      <p className="text-xl font-bold" data-testid="text-pending-earned">{referralData?.pendingEarned || 0} ₽</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Star className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ваш процент</p>
                      <p className="text-xl font-bold" data-testid="text-commission-percent">{referralData?.commissionPercent || 20}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Реферальная программа</CardTitle>
                  <CardDescription>Приглашайте друзей и зарабатывайте {referralData?.commissionPercent || 20}% с каждой оплаты</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      Как это работает
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                        <p>Поделитесь реферальной ссылкой с друзьями</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                        <p>Друг регистрируется по вашей ссылке</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</div>
                        <p>Получаете {referralData?.commissionPercent || 20}% от каждой оплаты реферала</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Ваш реферальный код</Label>
                      <div className="flex gap-2">
                        <Input value={user.referralCode} readOnly className="font-mono" data-testid="input-referral-code" />
                        <Button variant="outline" onClick={copyReferralCode} data-testid="button-copy-code">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Реферальная ссылка</Label>
                      <div className="flex gap-2">
                        <Input
                          value={`${window.location.origin}/auth?ref=${user.referralCode}`}
                          readOnly
                          className="text-sm"
                          data-testid="input-referral-link"
                        />
                        <Button variant="outline" onClick={copyReferralLink} data-testid="button-copy-link">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Мои рефералы</CardTitle>
                  <CardDescription>Привлеченные пользователи</CardDescription>
                </CardHeader>
                <CardContent>
                  {referralsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !referralData?.referrals.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>У вас пока нет рефералов</p>
                      <p className="text-sm mt-2">Поделитесь ссылкой с друзьями!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referralData.referrals.map((ref) => (
                        <div key={ref.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="text-sm font-medium">Реферал #{ref.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ref.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(ref.status)}
                            {ref.commissionEarned > 0 && (
                              <p className="text-sm font-medium text-green-600 mt-1">+{ref.commissionEarned} ₽</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Запрос на вывод</CardTitle>
                  <CardDescription>
                    Доступный баланс: <span className="font-bold text-primary">{payoutData?.balance || 0} ₽</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(payoutData?.balance || 0) < (payoutData?.minPayoutAmount || 500) ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Минимальная сумма вывода: {payoutData?.minPayoutAmount || 500} ₽</p>
                      <p className="text-sm mt-2">Привлекайте рефералов для увеличения баланса</p>
                    </div>
                  ) : (
                    <Form {...payoutForm}>
                      <form onSubmit={payoutForm.handleSubmit((data) => createPayoutMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={payoutForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Сумма вывода (₽)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  min={payoutData?.minPayoutAmount || 500}
                                  max={payoutData?.balance || 0}
                                  data-testid="input-payout-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={payoutForm.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Способ вывода</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-payout-method">
                                    <SelectValue placeholder="Выберите способ" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="card">Банковская карта</SelectItem>
                                  <SelectItem value="yoomoney">ЮMoney</SelectItem>
                                  <SelectItem value="qiwi">QIWI</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={payoutForm.control}
                          name="paymentDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Реквизиты</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Номер карты или кошелька" data-testid="input-payout-details" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button type="submit" className="w-full" disabled={createPayoutMutation.isPending} data-testid="button-request-payout">
                          {createPayoutMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Запросить вывод
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>История выплат</CardTitle>
                  <CardDescription>Ваши запросы на вывод средств</CardDescription>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !payoutData?.payouts.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>История выплат пуста</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payoutData.payouts.map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="text-sm font-medium">{payout.amount} ₽</p>
                            <p className="text-xs text-muted-foreground">
                              {payout.paymentMethod === 'card' ? 'Карта' : payout.paymentMethod}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payout.createdAt!).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          {getStatusBadge(payout.status || "pending")}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Уведомления</CardTitle>
                    <CardDescription>Ваши системные уведомления</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Прочитать все
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !notifications?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет уведомлений</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-md cursor-pointer transition-colors ${
                          notification.isRead ? "bg-muted/30" : "bg-muted/70"
                        }`}
                        onClick={() => !notification.isRead && markNotificationReadMutation.mutate(notification.id)}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className={`p-2 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                          notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                          notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <Bell className={`h-4 w-4 ${
                            notification.type === 'success' ? 'text-green-600' :
                            notification.type === 'error' ? 'text-red-600' :
                            notification.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${!notification.isRead ? '' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt!).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notify-settings">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
