import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { auditFormSchema, type AuditFormData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Search, Shield } from "lucide-react";
import { Link } from "wouter";

const siteTypes = [
  { value: "landing", label: "Лендинг" },
  { value: "business_card", label: "Сайт-визитка" },
  { value: "corporate", label: "Корпоративный сайт" },
  { value: "ecommerce", label: "Интернет-магазин" },
  { value: "medical", label: "Медицинский сайт" },
  { value: "children", label: "Детские услуги" },
  { value: "forum", label: "Форум/соц.сеть" },
  { value: "portal", label: "Корпоративный портал" },
  { value: "other", label: "Другой формат" },
];

interface AuditFormProps {
  onSubmit: (data: AuditFormData) => void;
  isLoading?: boolean;
}

export function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const form = useForm<AuditFormData>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      siteUrl: "",
      email: "",
      siteType: "",
      agreePrivacy: false,
      consent: false,
    },
  });

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl md:text-2xl font-semibold">
          Бесплатная проверка сайта
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Получите мгновенный аудит по 9 критериям соответствия 149-ФЗ и 152-ФЗ
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="siteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL сайта</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com или www.example.com"
                      {...field}
                      data-testid="input-site-url"
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
                  <FormLabel>Email для получения отчета</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="siteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип сайта</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-site-type">
                        <SelectValue placeholder="Выберите тип сайта" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {siteTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
                      data-testid="checkbox-privacy"
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
              name="consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-consent"
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
              size="lg"
              disabled={isLoading}
              data-testid="button-start-check"
            >
              <Search className="mr-2 h-5 w-5" />
              {isLoading ? "Проверка..." : "Начать бесплатную проверку"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
