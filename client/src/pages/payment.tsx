import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PaymentForm } from "@/components/payment-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Package } from "@shared/schema";

export default function PaymentPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const type = (params.get("type") || "express") as "express" | "package";
  const packageId = params.get("packageId");
  const siteUrl = params.get("url") || "";
  const email = params.get("email") || "";

  // Validate type parameter
  if (type !== "express" && type !== "package") {
    console.error("[PaymentPage] Invalid type:", type);
  }

  const [isPaid, setIsPaid] = useState(false);

  console.log("[PaymentPage] URL params:", { type, packageId, siteUrl, email });

  // Fetch package if type is package
  const { data: pkg, isLoading: isLoadingPackage } = useQuery<Package>({
    queryKey: ["/api/packages", packageId],
    enabled: type === "package" && !!packageId,
  });

  // Fetch express report price
  const { data: settings } = useQuery<{ expressReportPrice: number }>({
    queryKey: ["/api/settings/public"],
  });

  const amount = type === "express" ? (settings?.expressReportPrice || 900) : (pkg?.price || 0);

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("[PaymentPage] Sending payment request:", {
        ...data,
        orderType: type,
        packageId,
        siteUrl,
        amount,
      });
      const requestData: any = {
        ...data,
        orderType: type,
        siteUrl,
        amount,
      };
      // Only include packageId if it has a value (for package orders)
      if (packageId) {
        requestData.packageId = packageId;
      }
      const response = await apiRequest("POST", "/api/payment/create", requestData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("[PaymentPage] Payment response:", data);
      if (data.error) {
        let errorDesc = data.error;
        if (data.details) {
          errorDesc = data.details.map((d: any) => `${d.path}: ${d.message}`).join(", ");
        }
        toast({
          title: "Ошибка оплаты",
          description: errorDesc,
          variant: "destructive",
        });
      } else if (data.confirmationUrl) {
        // Redirect to YooKassa payment page
        window.location.href = data.confirmationUrl;
      } else {
        // For test mode, just show success
        setIsPaid(true);
      }
    },
    onError: (error: any) => {
      console.error("[PaymentPage] Payment error:", error);
      let errorDesc = error.message || "Попробуйте еще раз";
      
      // Extract detailed error info from API error
      if (error.data) {
        console.log("[PaymentPage] Error data:", error.data);
        if (error.data.details) {
          errorDesc = error.data.details.map((d: any) => `${d.path?.join?.('.') || d.path}: ${d.message}`).join(", ");
        } else if (error.data.error) {
          errorDesc = error.data.error;
        }
      }
      
      toast({
        title: "Ошибка при создании платежа",
        description: errorDesc,
        variant: "destructive",
      });
    },
  });

  const handlePaymentSubmit = (formData: any) => {
    console.log("[PaymentPage] handlePaymentSubmit called with:", formData);
    paymentMutation.mutate(formData);
  };

  if (isLoadingPackage && type === "package") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-16 md:py-24">
          <div className="max-w-lg mx-auto px-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Оплата успешна!</h2>
                    <p className="text-muted-foreground">
                      {type === "express"
                        ? "Полный отчет будет отправлен на вашу почту в течение нескольких минут."
                        : "Наши эксперты приступят к работе над вашим заказом. Мы свяжемся с вами в ближайшее время."}
                    </p>
                  </div>
                  {type === "package" && (
                    <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                      <p className="text-sm font-medium">Что будет дальше:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Эксперты проведут полный аудит вашего сайта</li>
                        <li>2. Подготовят подробный отчет с рекомендациями</li>
                        <li>3. Создадут полный пакет документов для внедрения</li>
                        <li>4. Отправят результаты на вашу почту</li>
                      </ul>
                    </div>
                  )}
                  <Button onClick={() => setLocation("/")} data-testid="button-back-home">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    На главную
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </div>

          <PaymentForm
            orderType={type}
            selectedPackage={pkg}
            siteUrl={siteUrl}
            amount={amount}
            onSubmit={handlePaymentSubmit}
            isLoading={paymentMutation.isPending}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
