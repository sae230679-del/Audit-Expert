import { useLocation, Link } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  HelpCircle,
  MessageSquare,
  Settings,
  FileText,
  CreditCard,
  Shield,
  ShieldCheck,
  LogOut,
  Briefcase,
  Ticket,
  Crown,
  Share2,
  Globe,
  Mail,
  Sparkles,
  BookOpen,
  BarChart3,
  ClipboardList,
  Scale,
  Bot,
  Wallet,
  Home,
  Bell,
  Puzzle,
} from "lucide-react";

type RoleColor = "blue" | "green" | "purple" | "orange" | "red";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  notificationKey?: string;
  roles?: string[];
}

interface MenuSection {
  label: string;
  color: RoleColor;
  roles: string[];
  items: MenuItem[];
}

const colorClasses: Record<RoleColor, { active: string; badge: string; dot: string }> = {
  blue: {
    active: "data-[active=true]:bg-blue-500/20 data-[active=true]:text-blue-600 dark:data-[active=true]:text-blue-400",
    badge: "bg-blue-500",
    dot: "bg-blue-500",
  },
  green: {
    active: "data-[active=true]:bg-emerald-500/20 data-[active=true]:text-emerald-600 dark:data-[active=true]:text-emerald-400",
    badge: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  purple: {
    active: "data-[active=true]:bg-purple-500/20 data-[active=true]:text-purple-600 dark:data-[active=true]:text-purple-400",
    badge: "bg-purple-500",
    dot: "bg-purple-500",
  },
  orange: {
    active: "data-[active=true]:bg-orange-500/20 data-[active=true]:text-orange-600 dark:data-[active=true]:text-orange-400",
    badge: "bg-orange-500",
    dot: "bg-orange-500",
  },
  red: {
    active: "data-[active=true]:bg-red-500/20 data-[active=true]:text-red-600 dark:data-[active=true]:text-red-400",
    badge: "bg-red-500",
    dot: "bg-red-500",
  },
};

const menuSections: MenuSection[] = [
  {
    label: "Панель управления",
    color: "blue",
    roles: ["user", "manager", "lawyer", "admin", "superadmin"],
    items: [
      { title: "Обзор", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Менеджер",
    color: "green",
    roles: ["manager", "admin", "superadmin"],
    items: [
      { title: "Панель менеджера", url: "/admin/manager", icon: ClipboardList },
      { title: "Сообщения", url: "/admin/messages", icon: Mail, notificationKey: "messages" },
      { title: "Заказы", url: "/admin/orders", icon: CreditCard, notificationKey: "orders" },
      { title: "Документы", url: "/admin/settings", icon: FileText },
    ],
  },
  {
    label: "Юрист",
    color: "purple",
    roles: ["lawyer", "admin", "superadmin"],
    items: [
      { title: "Панель юриста", url: "/admin/lawyer", icon: Scale },
    ],
  },
  {
    label: "Администрирование",
    color: "orange",
    roles: ["admin", "superadmin"],
    items: [
      { title: "Пользователи", url: "/admin/users", icon: Users },
      { title: "Все сайты", url: "/admin/sites", icon: Globe },
      { title: "Обращения", url: "/admin/tickets", icon: MessageSquare, notificationKey: "tickets" },
      { title: "Пакеты услуг", url: "/admin/packages", icon: Package },
      { title: "Кейсы", url: "/admin/cases", icon: Briefcase },
      { title: "FAQ", url: "/admin/faq", icon: HelpCircle },
      { title: "Справочник", url: "/admin/guide", icon: BookOpen },
    ],
  },
  {
    label: "Суперадмин",
    color: "red",
    roles: ["superadmin"],
    items: [
      { title: "Аналитика", url: "/admin/analytics", icon: BarChart3 },
      { title: "Настройки ИИ", url: "/admin/ai-settings", icon: Bot },
      { title: "ИИ-Консультант", url: "/admin/ai-consultant", icon: Sparkles },
      { title: "Промокоды", url: "/admin/promo-codes", icon: Ticket },
      { title: "Рефералы", url: "/admin/referrals", icon: Share2 },
      { title: "Платежи", url: "/admin/payments", icon: Wallet },
      { title: "Уведомления", url: "/admin/notifications", icon: Bell },
      { title: "Интеграции", url: "/admin/integrations", icon: Puzzle },
      { title: "Безопасность", url: "/admin/security", icon: ShieldCheck },
      { title: "Настройки сайта", url: "/admin/settings", icon: Settings },
    ],
  },
];

interface NotificationCounts {
  messages: number;
  orders: number;
  documents: number;
  tickets: number;
  lawyerReview: number;
  expressAudits: number;
}

function BlinkingBadge({ count, color }: { count: number; color: RoleColor }) {
  if (count === 0) return null;
  
  return (
    <span className="relative flex h-5 min-w-5 items-center justify-center">
      <span className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        colorClasses[color].dot
      )} />
      <Badge className={cn(
        "relative text-xs text-white",
        colorClasses[color].badge
      )}>
        {count > 99 ? "99+" : count}
      </Badge>
    </span>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  
  const userRole = currentUser?.role || "user";
  const isSuperAdmin = userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  
  const { data: notifications } = useQuery<NotificationCounts>({
    queryKey: ["/api/admin/notifications/counts"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const visibleSections = useMemo(() => {
    return menuSections.filter(section => section.roles.includes(userRole));
  }, [userRole]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    setLocation("/auth");
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case "superadmin":
        return <Badge className={cn("gap-1 text-xs text-white", colorClasses.red.badge)}><Crown className="h-3 w-3" />SA</Badge>;
      case "admin":
        return <Badge className={cn("gap-1 text-xs text-white", colorClasses.orange.badge)}>Админ</Badge>;
      case "lawyer":
        return <Badge className={cn("gap-1 text-xs text-white", colorClasses.purple.badge)}>Юрист</Badge>;
      case "manager":
        return <Badge className={cn("gap-1 text-xs text-white", colorClasses.green.badge)}>Менеджер</Badge>;
      default:
        return <Badge className={cn("gap-1 text-xs text-white", colorClasses.blue.badge)}>Клиент</Badge>;
    }
  };

  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sm">Аудит Эксперт</span>
              </Link>
              {getRoleBadge()}
            </div>
          </SidebarHeader>
          <SidebarContent>
            {visibleSections.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    colorClasses[section.color].dot
                  )} />
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const notificationCount = item.notificationKey && notifications
                        ? (notifications as any)[item.notificationKey] || 0
                        : 0;
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === item.url}
                            className={colorClasses[section.color].active}
                          >
                            <Link href={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span className="flex-1">{item.title}</span>
                              <BlinkingBadge count={notificationCount} color={section.color} />
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выход
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-view-site">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-3 md:px-4 py-3 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {currentUser?.fullName || currentUser?.username || "Пользователь"}
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
