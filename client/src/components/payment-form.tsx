import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, Loader2, Ticket, Check, X } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Package } from "@shared/schema";

const paymentFormSchema = z.object({
  name: z.string().min(2, "Введите ваше имя"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().min(10, "Введите корректный телефон"),
  company: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  inn: z.string().optional(),
  agreePrivacy: z.boolean().refine((val) => val === true, "Необходимо ознакомиться с политикой"),
  agreeConsent: z.boolean().refine((val) => val === true, "Необходимо дать согласие"),
  agreeOffer: z.boolean().refine((val) => val === true, "Необходимо принять оферту"),
  agreeNewsletter: z.boolean().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PromoCodeInfo {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  description?: string;
}

interface PaymentFormProps {
  orderType: "express" | "package";
  selectedPackage?: Package;
  siteUrl?: string;
  amount: number;
  onSubmit: (data: PaymentFormData & { promoCodeId?: string; discountAmount?: number }) => void;
  isLoading?: boolean;
}

export function PaymentForm({
  orderType,
  selectedPackage,
  siteUrl,
  amount,
  onSubmit,
  isLoading,
}: PaymentFormProps) {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeLoading, setPromoCodeLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeInfo | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      whatsapp: "",
      telegram: "",
      inn: "",
      agreePrivacy: false,
      agreeConsent: false,
      agreeOffer: false,
      agreeNewsletter: false,
    },
  });

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoCodeLoading(true);
    try {
      const response = await apiRequest("POST", "/api/promo-codes/validate", {
        code: promoCode.toUpperCase(),
        orderAmount: amount,
      });
      const data = await response.json();
      
      if (data.valid) {
        setAppliedPromo(data.promoCode);
        setDiscountAmount(data.discountAmount);
        toast({ title: "Промокод применен" });
      } else {
        toast({ title: data.error || "Промокод недействителен", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка проверки промокода", variant: "destructive" });
    } finally {
      setPromoCodeLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setPromoCode("");
  };

  const finalAmount = Math.max(0, amount - discountAmount);

  const handleFormSubmit = (data: PaymentFormData) => {
    console.log("[PaymentForm] Submitting form data:", data);
    onSubmit({
      ...data,
      promoCodeId: appliedPromo?.id,
      discountAmount: discountAmount,
    });
  };

  // Debug: log form errors
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log("[PaymentForm] Validation errors:", formErrors);
  }

  const title =
    orderType === "express"
      ? "Полный отчет проверки"
      : `Пакет "${selectedPackage?.name}"`;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {siteUrl && (
          <p className="text-sm text-muted-foreground break-all">{siteUrl}</p>
        )}
        <div className="mt-4">
          {discountAmount > 0 ? (
            <div className="space-y-1">
              <span className="text-lg text-muted-foreground line-through">
                {amount.toLocaleString("ru-RU")} ₽
              </span>
              <div>
                <span className="text-3xl font-bold text-green-600">
                  {finalAmount.toLocaleString("ru-RU")}
                </span>
                <span className="text-muted-foreground ml-1">₽</span>
              </div>
              <Badge variant="secondary" className="text-green-600">
                Скидка: -{discountAmount.toLocaleString("ru-RU")} ₽
              </Badge>
            </div>
          ) : (
            <>
              <span className="text-3xl font-bold">
                {amount.toLocaleString("ru-RU")}
              </span>
              <span className="text-muted-foreground ml-1">₽</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ФИО</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Иванов Иван Иванович"
                      {...field}
                      data-testid="input-payment-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      data-testid="input-payment-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+7 (999) 999-99-99"
                      {...field}
                      data-testid="input-payment-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Компания (необязательно)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ООО Компания"
                      {...field}
                      data-testid="input-payment-company"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ИНН компании (необязательно)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      {...field}
                      data-testid="input-payment-inn"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp (необязательно)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+79001234567"
                        {...field}
                        data-testid="input-payment-whatsapp"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telegram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram (необязательно)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@username"
                        {...field}
                        data-testid="input-payment-telegram"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Промокод</FormLabel>
              {appliedPromo ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                  <Check className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <span className="font-mono font-medium">{appliedPromo.code}</span>
                    {appliedPromo.description && (
                      <p className="text-xs text-muted-foreground">{appliedPromo.description}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemovePromo}
                    data-testid="button-remove-promo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Введите промокод"
                    data-testid="input-promo-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={promoCodeLoading || !promoCode.trim()}
                    data-testid="button-apply-promo"
                  >
                    {promoCodeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ticket className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="agreePrivacy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-payment-privacy"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Я ознакомлен с{" "}
                      <Link href="/privacy" className="text-primary underline">
                        политикой конфиденциальности
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-payment-consent"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Даю{" "}
                      <Link href="/consent" className="text-primary underline">
                        согласие на обработку персональных данных
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeOffer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-payment-offer"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Я принимаю условия{" "}
                      <Link href="/offer" className="text-primary underline">
                        договора-оферты
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeNewsletter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-payment-newsletter"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal text-muted-foreground">
                      Согласен на получение уведомлений об акциях и новостях (необязательно)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
                data-testid="button-pay"
                onClick={() => {
                  const errors = form.formState.errors;
                  if (Object.keys(errors).length > 0) {
                    const errorMessages: string[] = [];
                    if (errors.name) errorMessages.push("ФИО");
                    if (errors.email) errorMessages.push("Email");
                    if (errors.phone) errorMessages.push("Телефон");
                    if (errors.agreePrivacy) errorMessages.push("Политика конфиденциальности");
                    if (errors.agreeConsent) errorMessages.push("Согласие на обработку");
                    if (errors.agreeOffer) errorMessages.push("Договор-оферта");
                    if (errorMessages.length > 0) {
                      toast({
                        title: "Заполните обязательные поля",
                        description: errorMessages.join(", "),
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Оплатить {finalAmount.toLocaleString("ru-RU")} ₽
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Безопасная оплата через YooKassa</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="px-2 py-1 bg-muted rounded text-xs">СБП</div>
                <div className="px-2 py-1 bg-muted rounded text-xs">ЮMoney</div>
                <div className="px-2 py-1 bg-muted rounded text-xs">Карта</div>
                <div className="px-2 py-1 bg-muted rounded text-xs">Tinkoff Pay</div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
