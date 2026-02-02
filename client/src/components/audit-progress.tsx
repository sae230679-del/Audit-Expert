import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, XCircle, Globe, Search } from "lucide-react";

type CheckStatus = "pending" | "checking" | "ok" | "warning" | "critical";

interface CheckStep {
  id: number;
  name: string;
  description: string;
  status: CheckStatus;
}

const initialCheckSteps = [
  { id: 1, name: "HTTPS/SSL сертификат", description: "Проверка защищенного соединения" },
  { id: 2, name: "Политика конфиденциальности", description: "Поиск и анализ политики" },
  { id: 3, name: "Согласие на ПДн", description: "Проверка форм согласия" },
  { id: 4, name: "Cookie-баннер", description: "Анализ уведомления о cookies" },
  { id: 5, name: "Иностранные ресурсы", description: "Проверка внешних скриптов" },
  { id: 6, name: "Формы сбора данных", description: "Анализ полей форм" },
  { id: 7, name: "Контактная информация", description: "Поиск контактов оператора" },
  { id: 8, name: "Авторизация", description: "Проверка методов входа" },
  { id: 9, name: "Реестр Роскомнадзора", description: "Проверка регистрации оператора" },
];

interface AuditProgressProps {
  currentStep: number;
  progress: number;
  estimatedTime?: number;
  phase: "checking" | "auditing";
  siteUrl?: string;
}

function getRandomStatus(): "ok" | "warning" | "critical" {
  const rand = Math.random();
  if (rand < 0.5) return "ok";
  if (rand < 0.8) return "warning";
  return "critical";
}

interface TrafficLightShieldProps {
  activeColor: "red" | "yellow" | "green" | "cycling";
  isFlashing: boolean;
}

function TrafficLightShield({ activeColor, isFlashing }: TrafficLightShieldProps) {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [flashOn, setFlashOn] = useState(true);

  useEffect(() => {
    if (activeColor === "cycling") {
      const interval = setInterval(() => {
        setCycleIndex((prev) => (prev + 1) % 3);
      }, 350);
      return () => clearInterval(interval);
    }
  }, [activeColor]);

  useEffect(() => {
    if (isFlashing) {
      const interval = setInterval(() => {
        setFlashOn((prev) => !prev);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setFlashOn(true);
    }
  }, [isFlashing]);

  const getRedActive = () => {
    if (activeColor === "cycling") return cycleIndex === 0;
    if (activeColor === "red") return flashOn;
    return false;
  };

  const getYellowActive = () => {
    if (activeColor === "cycling") return cycleIndex === 1;
    if (activeColor === "yellow") return flashOn;
    return false;
  };

  const getGreenActive = () => {
    if (activeColor === "cycling") return cycleIndex === 2;
    if (activeColor === "green") return flashOn;
    return false;
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 120"
        className="w-20 h-24 md:w-28 md:h-32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50 5 L90 20 L90 55 C90 85 50 115 50 115 C50 115 10 85 10 55 L10 20 Z"
          className="fill-primary/10 stroke-primary"
          strokeWidth="3"
        />
        
        <rect
          x="35"
          y="22"
          width="30"
          height="76"
          rx="4"
          className="fill-gray-800 dark:fill-gray-900"
        />
        
        <circle
          cx="50"
          cy="38"
          r="9"
          className={`transition-all duration-150 ${
            getRedActive()
              ? "fill-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,1)]"
              : "fill-red-900/40"
          }`}
        />
        <circle
          cx="50"
          cy="60"
          r="9"
          className={`transition-all duration-150 ${
            getYellowActive()
              ? "fill-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,1)]"
              : "fill-yellow-900/40"
          }`}
        />
        <circle
          cx="50"
          cy="82"
          r="9"
          className={`transition-all duration-150 ${
            getGreenActive()
              ? "fill-green-500 drop-shadow-[0_0_16px_rgba(34,197,94,1)]"
              : "fill-green-900/40"
          }`}
        />
      </svg>
    </div>
  );
}

function SiteCheckingIndicator({ siteUrl }: { siteUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-3 md:gap-4">
      <div className="relative">
        <div className="p-3 md:p-5 rounded-full bg-primary/10 animate-pulse">
          <Globe className="h-10 w-10 md:h-14 md:w-14 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 p-1 md:p-1.5 rounded-full bg-background border-2 border-primary">
          <Search className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center px-2">
        <h3 className="text-sm md:text-lg font-semibold">Проверка доступности сайта</h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 break-all max-w-[280px] md:max-w-xs">
          {siteUrl}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
        <span>Подключаемся к сайту...</span>
      </div>
    </div>
  );
}

function StepStatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />;
    case "critical":
      return <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />;
    case "checking":
      return <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-primary animate-spin" />;
    default:
      return <div className="h-4 w-4 md:h-5 md:w-5 rounded-full border-2 border-muted-foreground/30" />;
  }
}

function getStepBgClass(status: CheckStatus, isCurrent: boolean): string {
  if (isCurrent) return "bg-primary/10 border border-primary/30";
  switch (status) {
    case "ok":
      return "bg-green-500/10 border border-green-500/20";
    case "warning":
      return "bg-yellow-500/10 border border-yellow-500/20";
    case "critical":
      return "bg-red-500/10 border border-red-500/20";
    default:
      return "bg-muted/30 opacity-60";
  }
}

export function AuditProgress({ currentStep, progress, estimatedTime, phase, siteUrl }: AuditProgressProps) {
  const remainingSeconds = estimatedTime || Math.max(0, Math.round((100 - progress) / 10));
  
  const [stepStatuses, setStepStatuses] = useState<Record<number, "ok" | "warning" | "critical">>({});
  const [lastCompletedStatus, setLastCompletedStatus] = useState<"ok" | "warning" | "critical" | null>(null);

  useEffect(() => {
    if (phase === "auditing" && currentStep > 1) {
      const prevStep = currentStep - 1;
      if (!stepStatuses[prevStep]) {
        const status = getRandomStatus();
        setStepStatuses(prev => ({ ...prev, [prevStep]: status }));
        setLastCompletedStatus(status);
      }
    }
  }, [currentStep, phase]);

  useEffect(() => {
    if (progress >= 100) {
      const lastStep = initialCheckSteps.length;
      if (!stepStatuses[lastStep]) {
        const status = getRandomStatus();
        setStepStatuses(prev => ({ ...prev, [lastStep]: status }));
        setLastCompletedStatus(status);
      }
    }
  }, [progress]);

  const steps: CheckStep[] = useMemo(() => {
    return initialCheckSteps.map(step => {
      let status: CheckStatus = "pending";
      if (step.id < currentStep) {
        status = stepStatuses[step.id] || "ok";
      } else if (step.id === currentStep) {
        status = "checking";
      }
      return { ...step, status };
    });
  }, [currentStep, stepStatuses]);

  const getSemaphoreColor = (): "red" | "yellow" | "green" | "cycling" => {
    if (!lastCompletedStatus) return "cycling";
    switch (lastCompletedStatus) {
      case "critical": return "red";
      case "warning": return "yellow";
      case "ok": return "green";
    }
  };

  const getProgressBarColor = () => {
    const hasCritical = Object.values(stepStatuses).some(s => s === "critical");
    const hasWarning = Object.values(stepStatuses).some(s => s === "warning");
    
    if (hasCritical) return "bg-red-500";
    if (hasWarning) return "bg-yellow-500";
    if (Object.keys(stepStatuses).length === 0) return "bg-primary";
    return "bg-green-500";
  };

  const getStatusSummary = () => {
    const criticalCount = Object.values(stepStatuses).filter(s => s === "critical").length;
    const warningCount = Object.values(stepStatuses).filter(s => s === "warning").length;
    const okCount = Object.values(stepStatuses).filter(s => s === "ok").length;
    
    if (criticalCount > 0) {
      return { text: `Найдено критических: ${criticalCount}`, color: "text-red-500" };
    }
    if (warningCount > 0) {
      return { text: `Требуется внимание: ${warningCount}`, color: "text-yellow-600 dark:text-yellow-400" };
    }
    if (okCount > 0) {
      return { text: "Проблем не обнаружено", color: "text-green-500" };
    }
    return null;
  };

  if (phase === "checking") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4 md:p-8">
          <SiteCheckingIndicator siteUrl={siteUrl || ""} />
        </CardContent>
      </Card>
    );
  }

  const statusSummary = getStatusSummary();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-3 md:p-6">
        <div className="space-y-3 md:space-y-5">
          <div className="text-center space-y-2 md:space-y-3">
            <div className="flex justify-center">
              <TrafficLightShield 
                activeColor={getSemaphoreColor()} 
                isFlashing={lastCompletedStatus !== null}
              />
            </div>
            <div>
              <h3 className="text-sm md:text-lg font-semibold">Анализ сайта</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Проверяем соответствие 149-ФЗ и 152-ФЗ
              </p>
              {statusSummary && (
                <p className={`text-xs md:text-sm font-medium mt-1 ${statusSummary.color}`}>
                  {statusSummary.text}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Прогресс проверки</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2.5 md:h-3.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ease-out ${getProgressBarColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {remainingSeconds > 0 && progress < 100 && (
              <p className="text-[10px] md:text-xs text-muted-foreground text-center">
                Осталось ~{remainingSeconds} сек.
              </p>
            )}
          </div>

          <div className="space-y-1 md:space-y-1.5 max-h-[280px] md:max-h-none overflow-y-auto">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 md:gap-3 p-1.5 md:p-2.5 rounded-md transition-all duration-300 ${getStepBgClass(step.status, step.status === "checking")}`}
              >
                <div className="shrink-0">
                  <StepStatusIcon status={step.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] md:text-sm font-medium truncate">{step.name}</p>
                  {step.status === "checking" && (
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{step.description}</p>
                  )}
                </div>
                {step.status !== "pending" && step.status !== "checking" && (
                  <div className="shrink-0">
                    <span className={`text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded ${
                      step.status === "ok" ? "bg-green-500/20 text-green-600 dark:text-green-400" :
                      step.status === "warning" ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                      "bg-red-500/20 text-red-600 dark:text-red-400"
                    }`}>
                      {step.status === "ok" ? "OK" : step.status === "warning" ? "!" : "X"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
