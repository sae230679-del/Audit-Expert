import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Send, CheckCircle2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const contactFormSchema = z.object({
  name: z.string().min(2, "Введите ваше имя"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
  message: z.string().min(10, "Сообщение должно содержать минимум 10 символов"),
  captchaAnswer: z.string().min(1, "Введите ответ"),
  honeypot: z.string().max(0, ""),
  agreePrivacy: z.boolean().refine(val => val === true, "Необходимо ознакомиться с политикой"),
  agreeConsent: z.boolean().refine(val => val === true, "Необходимо дать согласие"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  return {
    question: `${num1} + ${num2} = ?`,
    answer: num1 + num2,
  };
}

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const { toast } = useToast();

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      captchaAnswer: "",
      honeypot: "",
      agreePrivacy: false,
      agreeConsent: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const { honeypot, captchaAnswer, ...cleanData } = data;
      return apiRequest("POST", "/api/contact", {
        ...cleanData,
        captchaAnswer,
        captchaExpected: captcha.answer,
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
    },
    onError: (error: Error) => {
      refreshCaptcha();
      form.setValue("captchaAnswer", "");
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    if (data.honeypot) {
      return;
    }
    mutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Сообщение отправлено</h3>
            <p className="text-muted-foreground">
              Мы свяжемся с вами в течение 24 часов
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubmitted(false);
                refreshCaptcha();
              }}
              data-testid="button-send-another"
            >
              Отправить еще сообщение
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Связаться с нами</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ваше имя</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Иван Иванов"
                      {...field}
                      data-testid="input-contact-name"
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
                      data-testid="input-contact-email"
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
                  <FormLabel>Телефон (необязательно)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+7 (999) 999-99-99"
                      {...field}
                      data-testid="input-contact-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сообщение</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Опишите ваш вопрос..."
                      className="min-h-[100px] resize-none"
                      {...field}
                      data-testid="input-contact-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="captchaAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Проверка: {captcha.question}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={refreshCaptcha}
                      data-testid="button-refresh-captcha"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ответ"
                      {...field}
                      data-testid="input-contact-captcha"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <input
              type="text"
              {...form.register("honeypot")}
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <FormField
              control={form.control}
              name="agreePrivacy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-contact-privacy"
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
                      data-testid="checkbox-contact-consent"
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

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
              data-testid="button-submit-contact"
            >
              {mutation.isPending ? (
                "Отправка..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Отправить сообщение
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
