import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, KeyRound, Mail, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = new URLSearchParams(window.location.search).get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const forgotMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      setForgotSuccess(true);
    },
    onError: () => {
      toast({ title: "Ошибка отправки запроса", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
    },
    onError: () => {
      toast({ title: "Ошибка сброса пароля. Ссылка могла устареть.", variant: "destructive" });
    },
  });

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotMutation.mutate({ email });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast({ title: "Пароли не совпадают", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Пароль должен быть минимум 6 символов", variant: "destructive" });
      return;
    }
    if (!token) return;
    resetMutation.mutate({ token, newPassword: password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold" data-testid="text-logo">Help152FZ</span>
          </Link>

          {!token ? (
            <>
              <CardTitle data-testid="text-forgot-title">Восстановление пароля</CardTitle>
              <CardDescription>
                Введите email, указанный при регистрации
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle data-testid="text-reset-title">Новый пароль</CardTitle>
              <CardDescription>
                Придумайте новый пароль для вашего аккаунта
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {!token ? (
            forgotSuccess ? (
              <div className="text-center space-y-4" data-testid="text-forgot-success">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-muted-foreground">
                  Если email зарегистрирован, вы получите письмо
                </p>
                <Link href="/auth">
                  <Button variant="outline" className="w-full" data-testid="link-back-to-auth">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Вернуться ко входу
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ваш email"
                      className="pl-10"
                      data-testid="input-forgot-email"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotMutation.isPending}
                  data-testid="button-forgot-submit"
                >
                  {forgotMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Отправить ссылку
                </Button>
                <Link href="/auth">
                  <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад ко входу
                  </Button>
                </Link>
              </form>
            )
          ) : (
            resetSuccess ? (
              <div className="text-center space-y-4" data-testid="text-reset-success">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium">Пароль успешно изменён</p>
                <Link href="/auth">
                  <Button className="w-full" data-testid="link-go-to-auth">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Перейти ко входу
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Новый пароль</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="pl-10 pr-12"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-new-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Подтверждение пароля</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторите пароль"
                      className="pl-10 pr-12"
                      data-testid="input-confirm-new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      data-testid="button-toggle-confirm-new-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-submit"
                >
                  {resetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Сменить пароль
                </Button>
              </form>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
