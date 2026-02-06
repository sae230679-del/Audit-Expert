import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Shield, Wrench } from "lucide-react";
import Home from "@/pages/home";
import PaymentPage from "@/pages/payment";
import DocumentPage from "@/pages/document";
import CasesPage from "@/pages/cases";
import AuthPage from "@/pages/auth";
import AuthCallback from "@/pages/auth-callback";
import CabinetPage from "@/pages/cabinet";
import SiteDetailPage from "@/pages/site-detail";
import FullAuditPage from "@/pages/full-audit";
import ToolsPage from "@/pages/tools";
import GuidePage from "@/pages/guide";
import AiChatPage from "@/pages/ai-chat";
import ResetPasswordPage from "@/pages/reset-password";
import AdminIndex from "@/pages/admin/index";
import NotFound from "@/pages/not-found";
import { ExternalWidgets } from "@/components/external-widgets";

function MaintenancePage({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Wrench className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Технические работы</h1>
          <p className="text-muted-foreground">
            {message || "Сайт временно недоступен. Мы проводим технические работы для улучшения сервиса."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Help152FZ.ru</span>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cases" component={CasesPage} />
      <Route path="/full-audit" component={FullAuditPage} />
      <Route path="/tools" component={ToolsPage} />
      <Route path="/guide" component={GuidePage} />
      <Route path="/ai-chat" component={AiChatPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/cabinet" component={CabinetPage} />
      <Route path="/cabinet/sites/:id" component={SiteDetailPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/privacy" component={DocumentPage} />
      <Route path="/policy" component={DocumentPage} />
      <Route path="/terms" component={DocumentPage} />
      <Route path="/cookies" component={DocumentPage} />
      <Route path="/consent" component={DocumentPage} />
      <Route path="/admin" component={AdminIndex} />
      <Route path="/admin/:rest*" component={AdminIndex} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface PublicSettings {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

function AppContent() {
  const [location] = useLocation();
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings/public"],
  });

  const isAdminRoute = location === "/admin" || location.startsWith("/admin/");
  const isAuthRoute = location === "/auth" || location.startsWith("/auth/");
  const isAllowedInMaintenance = isAdminRoute || isAuthRoute;
  
  if (settings?.maintenanceMode && !isAllowedInMaintenance) {
    return <MaintenancePage message={settings.maintenanceMessage} />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="help152fz-theme">
        <TooltipProvider>
          <Toaster />
          <ExternalWidgets />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
