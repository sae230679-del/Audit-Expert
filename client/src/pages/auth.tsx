import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role?: string;
  referralCode: string;
  bonusBalance: number;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    agreePrivacy: false,
    agreeConsent: false,
    agreeNewsletter: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/user-login", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка входа");
      }
      return response.json();
    },
    onSuccess: (data: { token: string; user: AuthUser }) => {
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast({ title: "Добро пожаловать!" });
      setLocation("/cabinet");
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Неверный логин или пароль", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string; referralCode?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка регистрации");
      }
      return response.json();
    },
    onSuccess: (data: { token: string; user: AuthUser }) => {
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast({ title: "Регистрация успешна!" });
      setLocation("/cabinet");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Попробуйте другие данные",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) return;
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.username || !registerData.email || !registerData.password) return;
    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }
    if (registerData.password.length < 6) {
      toast({ title: "Пароль должен быть минимум 6 символов", variant: "destructive" });
      return;
    }
    if (!registerData.agreePrivacy) {
      toast({ title: "Необходимо ознакомиться с политикой конфиденциальности", variant: "destructive" });
      return;
    }
    if (!registerData.agreeConsent) {
      toast({ title: "Необходимо дать согласие на обработку персональных данных", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      username: registerData.username,
      email: registerData.email,
      password: registerData.password,
      referralCode: registerData.referralCode || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Help152FZ</span>
          </Link>
          <CardTitle>Личный кабинет</CardTitle>
          <CardDescription>
            Войдите или создайте аккаунт для доступа к заказам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">
                <LogIn className="h-4 w-4 mr-2" />
                Вход
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">
                <UserPlus className="h-4 w-4 mr-2" />
                Регистрация
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Логин или Email</Label>
                  <Input
                    id="login-username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    placeholder="Ваш логин или email"
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Ваш пароль"
                      className="pr-12"
                      data-testid="input-login-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      data-testid="button-toggle-login-password"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Войти
                </Button>

                <div className="text-center">
                  <Link href="/reset-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                    Забыли пароль?
                  </Link>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">или войти через</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = "/api/auth/vk"}
                    data-testid="button-vk-login"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.364 1.259 2.178 1.816.616.422 1.084.33 1.084.33l2.178-.03s1.14-.07.6-.964c-.044-.073-.314-.659-1.616-1.862-1.362-1.26-1.18-1.056.46-3.235.999-1.328 1.399-2.14 1.274-2.487-.119-.332-.855-.244-.855-.244l-2.452.015s-.182-.025-.317.056c-.131.079-.216.262-.216.262s-.387 1.028-.903 1.903c-1.088 1.847-1.524 1.945-1.702 1.83-.414-.267-.31-1.075-.31-1.649 0-1.793.272-2.54-.528-2.735-.266-.065-.461-.107-1.14-.114-.872-.01-1.609.003-2.027.208-.278.137-.493.44-.362.457.161.022.526.098.72.362.25.341.24 1.11.24 1.11s.144 2.11-.335 2.371c-.329.18-.779-.187-1.746-1.868-.495-.86-.868-1.812-.868-1.812s-.072-.176-.2-.272c-.155-.115-.372-.151-.372-.151l-2.33.015s-.35.01-.478.162c-.114.136-.009.417-.009.417s1.82 4.258 3.882 6.403c1.89 1.966 4.034 1.837 4.034 1.837h.972z"/>
                    </svg>
                    VK
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = "/api/auth/yandex"}
                    data-testid="button-yandex-login"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.889 14.778h-2.111v-6.037L10.556 16.8H9.333V7.222h2.111v6.037L14.667 7.2h1.222v9.578z"/>
                    </svg>
                    Yandex
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Логин</Label>
                  <Input
                    id="reg-username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    placeholder="Придумайте логин"
                    data-testid="input-register-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="Ваш email"
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Минимум 6 символов"
                      className="pr-12"
                      data-testid="input-register-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      data-testid="button-toggle-register-password"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">Подтверждение пароля</Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      placeholder="Повторите пароль"
                      className="pr-12"
                      data-testid="input-register-confirm-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-referral">Реферальный код (необязательно)</Label>
                  <Input
                    id="reg-referral"
                    value={registerData.referralCode}
                    onChange={(e) => setRegisterData({ ...registerData, referralCode: e.target.value.toUpperCase() })}
                    placeholder="Код друга"
                    data-testid="input-register-referral"
                  />
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="reg-privacy"
                    checked={registerData.agreePrivacy}
                    onCheckedChange={(checked) => setRegisterData({ ...registerData, agreePrivacy: checked === true })}
                    data-testid="checkbox-register-privacy"
                  />
                  <Label htmlFor="reg-privacy" className="text-sm font-normal cursor-pointer">
                    Я ознакомлен с{" "}
                    <Link href="/privacy" className="text-primary underline">
                      политикой конфиденциальности
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="reg-consent"
                    checked={registerData.agreeConsent}
                    onCheckedChange={(checked) => setRegisterData({ ...registerData, agreeConsent: checked === true })}
                    data-testid="checkbox-register-consent"
                  />
                  <Label htmlFor="reg-consent" className="text-sm font-normal cursor-pointer">
                    Даю{" "}
                    <Link href="/consent" className="text-primary underline">
                      согласие на обработку персональных данных
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="reg-newsletter"
                    checked={registerData.agreeNewsletter}
                    onCheckedChange={(checked) => setRegisterData({ ...registerData, agreeNewsletter: checked === true })}
                    data-testid="checkbox-register-newsletter"
                  />
                  <Label htmlFor="reg-newsletter" className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Согласен на получение уведомлений об акциях (необязательно)
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Зарегистрироваться
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">или через соцсети</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = "/api/auth/vk"}
                    data-testid="button-vk-register"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.364 1.259 2.178 1.816.616.422 1.084.33 1.084.33l2.178-.03s1.14-.07.6-.964c-.044-.073-.314-.659-1.616-1.862-1.362-1.26-1.18-1.056.46-3.235.999-1.328 1.399-2.14 1.274-2.487-.119-.332-.855-.244-.855-.244l-2.452.015s-.182-.025-.317.056c-.131.079-.216.262-.216.262s-.387 1.028-.903 1.903c-1.088 1.847-1.524 1.945-1.702 1.83-.414-.267-.31-1.075-.31-1.649 0-1.793.272-2.54-.528-2.735-.266-.065-.461-.107-1.14-.114-.872-.01-1.609.003-2.027.208-.278.137-.493.44-.362.457.161.022.526.098.72.362.25.341.24 1.11.24 1.11s.144 2.11-.335 2.371c-.329.18-.779-.187-1.746-1.868-.495-.86-.868-1.812-.868-1.812s-.072-.176-.2-.272c-.155-.115-.372-.151-.372-.151l-2.33.015s-.35.01-.478.162c-.114.136-.009.417-.009.417s1.82 4.258 3.882 6.403c1.89 1.966 4.034 1.837 4.034 1.837h.972z"/>
                    </svg>
                    VK
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = "/api/auth/yandex"}
                    data-testid="button-yandex-register"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.889 14.778h-2.111v-6.037L10.556 16.8H9.333V7.222h2.111v6.037L14.667 7.2h1.222v9.578z"/>
                    </svg>
                    Yandex
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
