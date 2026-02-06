import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Shield, User, LogOut, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PublicSettings {
  casesPageEnabled?: boolean;
  aiConsultantEnabled?: boolean;
  guideEnabled?: boolean;
  [key: string]: any;
}

interface MenuItem {
  label: string;
  href: string;
  icon?: any;
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings/public"],
  });

  const currentUser = useMemo(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }, []);

  const isLoggedIn = !!currentUser;
  const isAdminOrSuperadmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const menuItems: MenuItem[] = [
    { label: "Проверка", href: "#check" },
    { label: "Услуги", href: "#packages" },
    ...(settings?.casesPageEnabled !== false ? [{ label: "Кейсы", href: "/cases" }] : []),
    { label: "FAQ", href: "#faq" },
    ...(settings?.guideEnabled ? [{ label: "Справочник", href: "/guide", icon: BookOpen }] : []),
    ...(settings?.aiConsultantEnabled ? [{ label: "ИИ-Консультант", href: "/ai-chat", icon: Sparkles }] : []),
    { label: "Контакты", href: "#contacts" },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      if (location !== "/") {
        window.location.href = "/" + href;
      } else {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
      setIsOpen(false);
    } else {
      window.location.href = href;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex h-16 md:h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-semibold text-lg md:text-xl">Help152FZ</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-sm font-medium text-muted-foreground transition-colors hover-elevate px-2 py-1 rounded-md"
                data-testid={`link-${item.label.toLowerCase()}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-user-menu">
                    <User className="h-4 w-4 mr-2" />
                    {currentUser?.name || currentUser?.email || "Аккаунт"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/cabinet" className="cursor-pointer" data-testid="link-cabinet">
                      Личный кабинет
                    </Link>
                  </DropdownMenuItem>
                  {isAdminOrSuperadmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer" data-testid="link-admin">
                          Админ-панель
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button variant="default" size="sm" data-testid="button-login">
                  Войти
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="button-mobile-menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="flex flex-col p-4 gap-2">
            {menuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className="text-sm font-medium text-muted-foreground py-2 px-4 rounded-md hover-elevate text-left"
              >
                {item.label}
              </button>
            ))}
            <div className="border-t mt-2 pt-2">
              {isLoggedIn ? (
                <>
                  <Link href="/cabinet">
                    <button className="text-sm font-medium py-2 px-4 rounded-md hover-elevate text-left w-full">
                      Личный кабинет
                    </button>
                  </Link>
                  {isAdminOrSuperadmin && (
                    <Link href="/admin">
                      <button className="text-sm font-medium py-2 px-4 rounded-md hover-elevate text-left w-full">
                        Админ-панель
                      </button>
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="text-sm font-medium text-destructive py-2 px-4 rounded-md hover-elevate text-left w-full"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link href="/auth">
                  <button className="text-sm font-medium py-2 px-4 rounded-md hover-elevate text-left w-full">
                    Войти / Регистрация
                  </button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
