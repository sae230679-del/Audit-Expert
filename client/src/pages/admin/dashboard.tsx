import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Package,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Eye,
  FileText,
  CheckCircle,
  Loader2,
  Globe,
  AlertTriangle,
  AlertCircle,
  Shield,
  BarChart3,
  Clock,
  Ticket,
} from "lucide-react";
import type { Order, ContactMessage } from "@shared/schema";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingMessages: number;
  todayChecks: number;
  paidReports: number;
  totalSites?: number;
  activeSubscriptions?: number;
  pendingAudits?: number;
  openTickets?: number;
  complianceOk?: number;
  complianceWarning?: number;
  complianceCritical?: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: recentMessages, isLoading: messagesLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  const defaultStats: DashboardStats = {
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingMessages: 0,
    todayChecks: 0,
    paidReports: 0,
    totalSites: 0,
    activeSubscriptions: 0,
    pendingAudits: 0,
    openTickets: 0,
    complianceOk: 0,
    complianceWarning: 0,
    complianceCritical: 0,
  };

  const currentStats = stats || defaultStats;

  const totalCompliance = (currentStats.complianceOk || 0) + (currentStats.complianceWarning || 0) + (currentStats.complianceCritical || 0);
  const complianceOkPercent = totalCompliance > 0 ? Math.round(((currentStats.complianceOk || 0) / totalCompliance) * 100) : 0;
  const complianceWarningPercent = totalCompliance > 0 ? Math.round(((currentStats.complianceWarning || 0) / totalCompliance) * 100) : 0;
  const complianceCriticalPercent = totalCompliance > 0 ? Math.round(((currentStats.complianceCritical || 0) / totalCompliance) * 100) : 0;

  const statCards = [
    {
      title: "Пользователей",
      value: currentStats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      testId: "text-admin-users",
    },
    {
      title: "Сайтов",
      value: currentStats.totalSites || 0,
      icon: Globe,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      testId: "text-admin-sites",
    },
    {
      title: "Заказов",
      value: currentStats.totalOrders,
      icon: Package,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      testId: "text-admin-orders",
    },
    {
      title: "Выручка",
      value: `${currentStats.totalRevenue.toLocaleString("ru-RU")} ₽`,
      icon: CreditCard,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      testId: "text-admin-revenue",
    },
    {
      title: "Активных подписок",
      value: currentStats.activeSubscriptions || 0,
      icon: Shield,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      testId: "text-admin-subscriptions",
    },
    {
      title: "Проверок сегодня",
      value: currentStats.todayChecks,
      icon: Eye,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      testId: "text-admin-checks",
    },
    {
      title: "Ожидающих аудитов",
      value: currentStats.pendingAudits || 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      testId: "text-admin-pending-audits",
    },
    {
      title: "Открытых тикетов",
      value: currentStats.openTickets || 0,
      icon: Ticket,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      testId: "text-admin-tickets",
    },
    {
      title: "Новых сообщений",
      value: currentStats.pendingMessages,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      testId: "text-admin-messages",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-admin-dashboard">Панель управления</h1>
          <p className="text-muted-foreground">Обзор статистики и мониторинга соответствия 149-ФЗ / 152-ФЗ</p>
        </div>
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Система работает
        </Badge>
      </div>

      {statsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${card.bgColor}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-semibold" data-testid={card.testId}>{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статус соответствия
                </CardTitle>
                <CardDescription>Распределение по статусам 149-ФЗ / 152-ФЗ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Соответствует</span>
                    </div>
                    <span className="font-medium">{currentStats.complianceOk || 0} ({complianceOkPercent}%)</span>
                  </div>
                  <Progress value={complianceOkPercent} className="h-2 bg-green-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span>Есть замечания</span>
                    </div>
                    <span className="font-medium">{currentStats.complianceWarning || 0} ({complianceWarningPercent}%)</span>
                  </div>
                  <Progress value={complianceWarningPercent} className="h-2 bg-yellow-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>Критические</span>
                    </div>
                    <span className="font-medium">{currentStats.complianceCritical || 0} ({complianceCriticalPercent}%)</span>
                  </div>
                  <Progress value={complianceCriticalPercent} className="h-2 bg-red-100" />
                </div>
                <div className="pt-2 text-sm text-muted-foreground text-center">
                  Всего проверенных сайтов: {totalCompliance}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Последние заказы
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !recentOrders?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Заказов пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between text-sm" data-testid={`row-admin-order-${order.id}`}>
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{order.siteUrl}</p>
                          <p className="text-muted-foreground text-xs">{order.email}</p>
                        </div>
                        <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                          {order.status === 'paid' ? 'Оплачен' : order.status === 'completed' ? 'Выполнен' : 'Ожидает'}
                        </Badge>
                      </div>
                    ))}
                    <Link href="/admin/payments" className="text-sm text-primary hover:underline block text-center pt-2" data-testid="link-all-orders">
                      Все заказы
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Последние сообщения
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !recentMessages?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Сообщений пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {recentMessages.filter(m => !m.isSpam).slice(0, 5).map((msg) => (
                      <div key={msg.id} className="flex items-center justify-between text-sm" data-testid={`row-admin-message-${msg.id}`}>
                        <div>
                          <p className="font-medium">{msg.name}</p>
                          <p className="text-muted-foreground text-xs truncate max-w-[150px]">{msg.message}</p>
                        </div>
                        {!msg.isRead && <Badge>Новое</Badge>}
                      </div>
                    ))}
                    <Link href="/admin/messages" className="text-sm text-primary hover:underline block text-center pt-2" data-testid="link-all-messages">
                      Все сообщения
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
