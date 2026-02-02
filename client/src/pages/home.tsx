import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { AuditForm } from "@/components/audit-form";
import { AuditProgress } from "@/components/audit-progress";
import { AuditResults } from "@/components/audit-results";
import { CriteriaSection } from "@/components/criteria-section";
import { PackagesSection } from "@/components/packages-section";
import { FaqSection } from "@/components/faq-section";
import { CasesSection } from "@/components/cases-section";
import { ContactForm } from "@/components/contact-form";
import { CookieBanner } from "@/components/cookie-banner";
import { InnInputModal } from "@/components/inn-input-modal";
import type { AuditFormData, AuditResults as AuditResultsType, Package } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ViewState = "form" | "checking" | "progress" | "results";

export default function Home() {
  const [, setLocation] = useLocation();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [auditResults, setAuditResults] = useState<AuditResultsType | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [showInnModal, setShowInnModal] = useState(false);
  const [innNotFound, setInnNotFound] = useState(false);
  const [innVerifying, setInnVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    setIsAuthenticated(!!token);
  }, []);

  // Fetch packages from API
  const { data: packages } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  // Audit mutation
  const auditMutation = useMutation({
    mutationFn: async (data: AuditFormData) => {
      const response = await apiRequest("POST", "/api/audit/check", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAuditResults(data);
      setViewState("results");
      
      if (data.innNotFound) {
        setInnNotFound(true);
        setTimeout(() => setShowInnModal(true), 1500);
      }
    },
    onError: (error: any) => {
      // Get error message from ApiError or fallback
      const errorMessage = error.data?.error || error.message || "Не удалось выполнить проверку сайта";
      
      toast({
        title: "Ошибка проверки",
        description: errorMessage,
        variant: "destructive",
      });
      setViewState("form");
    },
  });

  // Site check mutation (separate from audit)
  const siteCheckMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/audit/check-site", { url });
      return response.json();
    },
    onSuccess: () => {
      setViewState("progress");
    },
    onError: (error: any) => {
      const errorMessage = error.data?.error || error.message || "Сайт не найден или недоступен";
      toast({
        title: "Сайт недоступен",
        description: errorMessage,
        variant: "destructive",
      });
      setViewState("form");
    },
  });

  // Site checking phase
  useEffect(() => {
    if (viewState !== "checking") return;

    siteCheckMutation.mutate(currentUrl);
  }, [viewState]);

  // Simulate progress animation
  useEffect(() => {
    if (viewState !== "progress") return;

    const totalSteps = 9;
    const stepDuration = 1000;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (totalSteps * 10);
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, stepDuration / 10);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    const timeout = setTimeout(() => {
      auditMutation.mutate({
        siteUrl: currentUrl,
        email: currentEmail,
        siteType: "corporate",
        agreePrivacy: true,
        consent: true,
      });
    }, stepDuration * totalSteps);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [viewState]);

  const handleAuditSubmit = (data: AuditFormData) => {
    setCurrentUrl(data.siteUrl);
    setCurrentEmail(data.email);
    setViewState("checking");
    setCurrentStep(1);
    setProgress(0);
  };

  const handleBuyReport = () => {
    setLocation(`/payment?type=express&url=${encodeURIComponent(currentUrl)}&email=${encodeURIComponent(currentEmail)}`);
  };

  const handleSelectPackage = (pkg?: Package) => {
    if (pkg) {
      setLocation(`/payment?type=package&packageId=${pkg.id}&url=${encodeURIComponent(currentUrl)}&email=${encodeURIComponent(currentEmail)}`);
    } else {
      const element = document.getElementById("packages");
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNewCheck = () => {
    setViewState("form");
    setAuditResults(null);
    setCurrentUrl("");
    setCurrentEmail("");
    setInnNotFound(false);
  };

  const handleInnSubmit = async (inn: string) => {
    setInnVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/audit/verify-inn", {
        inn,
        siteUrl: currentUrl,
      });
      const data = await response.json();
      
      setShowInnModal(false);
      setInnNotFound(false);
      
      if (data.found) {
        toast({
          title: "ИНН проверен",
          description: `Оператор "${data.operatorName}" найден в реестре Роскомнадзора`,
        });
      } else {
        toast({
          title: "Оператор не найден",
          description: "ИНН не найден в реестре операторов персональных данных",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка проверки",
        description: error.message || "Не удалось проверить ИНН",
        variant: "destructive",
      });
    } finally {
      setInnVerifying(false);
    }
  };

  const handleCheckLater = () => {
    setShowInnModal(false);
    toast({
      title: "Проверка отложена",
      description: "Вы можете проверить ИНН позже в личном кабинете",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {viewState === "form" && (
          <>
            <HeroSection />
            <section id="check" className="pb-16 md:pb-24">
              <div className="max-w-7xl mx-auto px-4 md:px-8">
                <AuditForm onSubmit={handleAuditSubmit} isLoading={auditMutation.isPending} />
              </div>
            </section>
            <CriteriaSection />
          </>
        )}

        {viewState === "checking" && (
          <section className="py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <AuditProgress currentStep={0} progress={0} phase="checking" siteUrl={currentUrl} />
            </div>
          </section>
        )}

        {viewState === "progress" && (
          <section className="py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <AuditProgress currentStep={currentStep} progress={progress} phase="auditing" siteUrl={currentUrl} />
            </div>
          </section>
        )}

        {viewState === "results" && auditResults && (
          <section className="py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <AuditResults
                results={auditResults}
                siteUrl={currentUrl}
                onBuyReport={handleBuyReport}
                onSelectPackage={() => handleSelectPackage()}
                isAuthenticated={isAuthenticated}
              />
              <div className="text-center mt-8">
                <button
                  onClick={handleNewCheck}
                  className="text-primary underline text-sm"
                  data-testid="button-new-check"
                >
                  Проверить другой сайт
                </button>
              </div>
            </div>
          </section>
        )}

        <PackagesSection
          packages={packages}
          onSelectPackage={handleSelectPackage}
        />

        <FaqSection />

        <CasesSection />

        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">
                Остались вопросы?
              </h2>
              <p className="text-muted-foreground">
                Свяжитесь с нами и получите консультацию
              </p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
      <CookieBanner />
      
      <InnInputModal
        open={showInnModal}
        onOpenChange={setShowInnModal}
        siteUrl={currentUrl}
        onSubmitInn={handleInnSubmit}
        onCheckLater={handleCheckLater}
        isLoading={innVerifying}
      />
    </div>
  );
}
