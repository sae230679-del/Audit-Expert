import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  Shield,
  Download,
  User,
} from "lucide-react";
import { Link } from "wouter";
import type { AuditResults as AuditResultsType, AuditCriterion } from "@shared/schema";

interface AuditResultsProps {
  results: AuditResultsType;
  siteUrl: string;
  onBuyReport: () => void;
  onSelectPackage: () => void;
  isAuthenticated?: boolean;
}

function StatusIcon({ status }: { status: AuditCriterion["status"] }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />;
    case "fail":
      return <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />;
  }
}

function StatusBadge({ status }: { status: AuditCriterion["status"] }) {
  switch (status) {
    case "pass":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs whitespace-nowrap">
          <span className="hidden sm:inline">Соответствует</span>
          <span className="sm:hidden">OK</span>
        </Badge>
      );
    case "warning":
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs whitespace-nowrap">
          <span className="hidden sm:inline">Частично</span>
          <span className="sm:hidden">!</span>
        </Badge>
      );
    case "fail":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs whitespace-nowrap">
          <span className="hidden sm:inline">Не соответствует</span>
          <span className="sm:hidden">X</span>
        </Badge>
      );
  }
}

function getScoreStatus(score: number): { status: "critical" | "average" | "good"; label: string; description: string } {
  if (score < 30) {
    return {
      status: "critical",
      label: "Критические нарушения",
      description: "Все критично, нужно исправлять немедленно"
    };
  }
  if (score < 80) {
    return {
      status: "average",
      label: "Требуется вмешательство",
      description: "Требуются исправления на сайте"
    };
  }
  return {
    status: "good",
    label: "Рекомендации по улучшению",
    description: "Сайт соответствует основным требованиям"
  };
}

function OverallScoreBadge({ score }: { score: number }) {
  const { status, label } = getScoreStatus(score);
  
  switch (status) {
    case "good":
      return (
        <Badge className="bg-green-500 text-white text-sm px-3 py-1">
          {label}
        </Badge>
      );
    case "average":
      return (
        <Badge className="bg-yellow-500 text-white text-sm px-3 py-1">
          {label}
        </Badge>
      );
    case "critical":
      return (
        <Badge className="bg-red-500 text-white text-sm px-3 py-1">
          {label}
        </Badge>
      );
  }
}

export function AuditResults({
  results,
  siteUrl,
  onBuyReport,
  onSelectPackage,
  isAuthenticated = false,
}: AuditResultsProps) {
  const { status, description } = getScoreStatus(results.totalScore);
  
  const scoreColor =
    status === "good"
      ? "text-green-500"
      : status === "average"
      ? "text-yellow-500"
      : "text-red-500";

  const progressColor =
    status === "good"
      ? "bg-green-500"
      : status === "average"
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0">
      <Card>
        <CardHeader className="text-center pb-2 md:pb-4 px-4 md:px-6">
          <div className="flex justify-center mb-2 md:mb-4">
            <div className="p-2 md:p-3 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-lg md:text-2xl">Результаты проверки</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground break-all px-2">{siteUrl}</p>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <div className="relative w-24 h-24 md:w-32 md:h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 56}
                  strokeDashoffset={2 * Math.PI * 56 * (1 - results.totalScore / 100)}
                  className={scoreColor}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl md:text-3xl font-bold ${scoreColor}`}>
                  {results.totalScore}
                </span>
              </div>
            </div>
            <OverallScoreBadge score={results.totalScore} />
            <p className="text-xs md:text-sm text-muted-foreground text-center mt-1 md:mt-2">{description}</p>
          </div>

          <div className="space-y-2 md:space-y-3">
            {results.criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center justify-between gap-2 md:gap-4 p-2 md:p-3 bg-muted/30 rounded-md"
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    <StatusIcon status={criterion.status} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs md:text-sm font-medium truncate">{criterion.name}</span>
                    {criterion.status !== "pass" && criterion.penalty && (
                      <span className="text-[10px] md:text-xs text-red-500 font-medium">
                        Штраф: {criterion.penalty}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={criterion.status} />
                </div>
              </div>
            ))}
          </div>

          {isAuthenticated ? (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Скачать PDF отчет</p>
                    <p className="text-xs text-muted-foreground">Отчет сохранен в вашем личном кабинете</p>
                  </div>
                </div>
                <Link href="/cabinet">
                  <Button data-testid="button-go-to-cabinet-pdf">
                    Перейти в кабинет
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-muted/50 border border-muted rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Хотите скачать отчет в PDF?</p>
                    <p className="text-xs text-muted-foreground">Войдите или зарегистрируйтесь для доступа к отчетам</p>
                  </div>
                </div>
                <Link href="/auth">
                  <Button variant="outline" data-testid="button-login-for-pdf">
                    Войти
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-4 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 w-fit">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm md:text-base">Полный отчет</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Подробный анализ всех нарушений, штрафов и рекомендаций
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
                  <span className="text-xl md:text-2xl font-bold">900 ₽</span>
                  <Button onClick={onBuyReport} data-testid="button-buy-report" className="w-full sm:w-auto">
                    Купить отчет
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4 md:pt-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 w-fit">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-sm md:text-base">Полный аудит</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Эксперты подготовят отчет и полный комплект документов
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
                  <span className="text-base md:text-lg font-medium text-muted-foreground">
                    от 3 900 ₽
                  </span>
                  <Button variant="outline" onClick={onSelectPackage} data-testid="button-select-package" className="w-full sm:w-auto">
                    Выбрать пакет
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
