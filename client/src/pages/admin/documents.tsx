import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, FileText, Shield, Cookie, ScrollText } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SiteSettings } from "@shared/schema";

export default function AdminDocuments() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    privacyPolicy: "",
    termsOfService: "",
    cookiePolicy: "",
    consentText: "",
    offerText: "",
  });

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        privacyPolicy: settings.privacyPolicy || "",
        termsOfService: settings.termsOfService || "",
        cookiePolicy: settings.cookiePolicy || "",
        consentText: settings.consentText || "",
        offerText: settings.offerText || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Документы сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Документы</h1>
          <p className="text-muted-foreground">
            Политики, согласия и правовые документы
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-documents">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить все
        </Button>
      </div>

      <Tabs defaultValue="privacy">
        <TabsList className="flex-wrap">
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            Политика конфиденциальности
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Пользовательское соглашение
          </TabsTrigger>
          <TabsTrigger value="cookies" className="gap-2">
            <Cookie className="h-4 w-4" />
            Политика cookies
          </TabsTrigger>
          <TabsTrigger value="consent" className="gap-2">
            <FileText className="h-4 w-4" />
            Согласие на ПДн
          </TabsTrigger>
          <TabsTrigger value="offer" className="gap-2">
            <FileText className="h-4 w-4" />
            Договор-оферта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privacy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Политика конфиденциальности</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.privacyPolicy}
                onChange={(e) =>
                  setFormData({ ...formData, privacyPolicy: e.target.value })
                }
                placeholder="Введите текст политики конфиденциальности..."
                className="min-h-[400px] resize-y font-mono text-sm"
                data-testid="textarea-privacy"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Пользовательское соглашение</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.termsOfService}
                onChange={(e) =>
                  setFormData({ ...formData, termsOfService: e.target.value })
                }
                placeholder="Введите текст пользовательского соглашения..."
                className="min-h-[400px] resize-y font-mono text-sm"
                data-testid="textarea-terms"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cookies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Политика использования cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.cookiePolicy}
                onChange={(e) =>
                  setFormData({ ...formData, cookiePolicy: e.target.value })
                }
                placeholder="Введите текст политики cookies..."
                className="min-h-[400px] resize-y font-mono text-sm"
                data-testid="textarea-cookies"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Согласие на обработку ПДн</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.consentText}
                onChange={(e) =>
                  setFormData({ ...formData, consentText: e.target.value })
                }
                placeholder="Введите текст согласия на обработку персональных данных..."
                className="min-h-[400px] resize-y font-mono text-sm"
                data-testid="textarea-consent"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Договор-оферта</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.offerText}
                onChange={(e) =>
                  setFormData({ ...formData, offerText: e.target.value })
                }
                placeholder="Введите текст договора-оферты..."
                className="min-h-[400px] resize-y font-mono text-sm"
                data-testid="textarea-offer"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
