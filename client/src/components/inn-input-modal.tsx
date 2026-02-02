import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Building2, Clock, Search, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InnInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteUrl: string;
  onSubmitInn: (inn: string) => void;
  onCheckLater: () => void;
  isLoading?: boolean;
}

function validateInn(inn: string): { valid: boolean; error?: string } {
  const cleanInn = inn.replace(/\D/g, "");
  
  if (!cleanInn) {
    return { valid: false, error: "Введите ИНН" };
  }
  
  if (cleanInn.length !== 10 && cleanInn.length !== 12) {
    return { valid: false, error: "ИНН должен содержать 10 или 12 цифр" };
  }
  
  return { valid: true };
}

export function InnInputModal({
  open,
  onOpenChange,
  siteUrl,
  onSubmitInn,
  onCheckLater,
  isLoading = false,
}: InnInputModalProps) {
  const [inn, setInn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleInnChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 12);
    setInn(cleanValue);
    if (touched) {
      const validation = validateInn(cleanValue);
      setError(validation.error || null);
    }
  };

  const handleSubmit = () => {
    setTouched(true);
    const validation = validateInn(inn);
    if (!validation.valid) {
      setError(validation.error || "Некорректный ИНН");
      return;
    }
    setError(null);
    onSubmitInn(inn);
  };

  const handleCheckLater = () => {
    onCheckLater();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-yellow-500/10">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center">ИНН не найден автоматически</DialogTitle>
          <DialogDescription className="text-center">
            Для проверки регистрации в реестре Роскомнадзора необходим ИНН оператора персональных данных
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Проверяемый сайт: <strong className="break-all">{siteUrl}</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="inn-input">ИНН организации или ИП</Label>
            <div className="relative">
              <Input
                id="inn-input"
                data-testid="input-inn"
                type="text"
                inputMode="numeric"
                placeholder="Введите 10 или 12 цифр"
                value={inn}
                onChange={(e) => handleInnChange(e.target.value)}
                onBlur={() => setTouched(true)}
                className={error ? "border-red-500 pr-10" : "pr-10"}
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {inn.length === 10 || inn.length === 12 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : inn.length > 0 ? (
                  <span className="text-xs text-muted-foreground">{inn.length}/10</span>
                ) : null}
              </div>
            </div>
            {error && touched && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Где найти ИНН:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>На странице "Контакты" сайта</li>
              <li>В подвале (footer) сайта</li>
              <li>В политике конфиденциальности</li>
              <li>В договоре-оферте</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCheckLater}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-1"
            data-testid="button-check-later"
          >
            <Clock className="mr-2 h-4 w-4" />
            Проверю позже
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !inn}
            className="w-full sm:w-auto order-1 sm:order-2"
            data-testid="button-submit-inn"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверяем...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Проверить в реестре
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
