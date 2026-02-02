import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import { Link } from "wouter";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card className="p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Мы используем cookies для аналитики и улучшения работы сайта.{" "}
              <Link href="/cookies" className="underline">
                Подробнее
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleAccept} data-testid="button-accept-cookies">
                Согласен
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                data-testid="button-decline-cookies"
              >
                Отклонить
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
