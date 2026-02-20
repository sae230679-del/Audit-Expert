import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Users, Wallet, Link as LinkIcon, FileText, CreditCard, Building, User, Briefcase, CheckCircle, Clock, XCircle, ArrowRight, ArrowLeft, Link2, MousePointer, TrendingUp, Pencil, Save, X } from "lucide-react";
import { Link } from "wouter";

type Referral = {
  id: number;
  referrerId: number;
  referralCode: string;
  earningsTotal: number;
  earningsPending: number;
  earningsPaid: number;
  referralsCount: number;
  status: string;
  createdAt: string;
};

type ReferralParticipant = {
  id: number;
  userId: number;
  participantType: "self_employed" | "ip" | "ooo";
  fullName: string;
  phone: string;
  birthDate: string | null;
  inn: string;
  status: "pending" | "approved" | "rejected";
  bankName: string | null;
  bik: string | null;
  bankAccount: string | null;
  corrAccount: string | null;
  offerAcceptedAt: string | null;
};

type ReferralPayout = {
  id: number;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt: string;
  processedAt: string | null;
};

type ReferralTransaction = {
  id: number;
  amount: number;
  description: string | null;
  createdAt: string;
};

type ReferralSettings = {
  percentReward: number;
  fixedReward: number;
  bonusReward: number;
  minPayoutAmount: number;
  isEnabled: boolean;
};

type CustomReferralLink = {
  id: number;
  userId: number;
  code: string;
  name: string;
  description: string | null;
  customPercent: number;
  earningsTotal: number;
  earningsPending: number;
  earningsPaid: number;
  referralsCount: number;
  clicksCount: number;
  isActive: boolean;
  createdAt: string;
};

type ReferralStatsResponse = {
  referral: Referral;
  transactions: ReferralTransaction[];
  payouts: ReferralPayout[];
  participant: ReferralParticipant | null;
  settings: ReferralSettings | null;
};

const participantTypeLabels: Record<string, string> = {
  self_employed: "Самозанятый",
  ip: "ИП",
  ooo: "ООО",
};

const payoutStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  processing: "В обработке",
  completed: "Выплачено",
  rejected: "Отклонено",
};

const payoutStatusColors: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  processing: "secondary",
  completed: "default",
  rejected: "destructive",
};

export default function ReferralPage() {
  const { toast } = useToast();
  const [showRegistration, setShowRegistration] = useState(false);
  const [participantType, setParticipantType] = useState<"self_employed" | "ip" | "ooo">("self_employed");
  const [offerScrolled, setOfferScrolled] = useState(false);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const offerScrollRef = useRef<HTMLDivElement>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDetailsData, setEditDetailsData] = useState({
    bankName: "",
    bik: "",
    bankAccount: "",
    corrAccount: "",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    birthDate: "",
    inn: "",
    statusConfirmation: "",
    companyName: "",
    ogrn: "",
    kpp: "",
    legalAddress: "",
    actualAddress: "",
    bankName: "",
    bik: "",
    bankAccount: "",
    corrAccount: "",
  });

  const { data: stats, isLoading, refetch } = useQuery<ReferralStatsResponse>({
    queryKey: ["/api/referral/stats"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const { data: offerData } = useQuery<{ offerText: string | null }>({
    queryKey: ["/api/referral/offer"],
  });

  const { data: customLinks } = useQuery<CustomReferralLink[]>({
    queryKey: ["/api/referral/custom-links"],
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/referral/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      setShowRegistration(false);
      toast({ title: "Заявка отправлена", description: "Ваша заявка на участие в реферальной программе отправлена на рассмотрение" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось зарегистрироваться", variant: "destructive" });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/referral/payout", { amount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      toast({ title: "Заявка создана", description: "Заявка на выплату отправлена" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось создать заявку", variant: "destructive" });
    },
  });

  const updatePaymentDetailsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/referral/payment-details", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      setIsEditingDetails(false);
      toast({ title: "Реквизиты обновлены", description: "Банковские реквизиты успешно сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить реквизиты", variant: "destructive" });
    },
  });

  const startEditingDetails = () => {
    if (stats?.participant) {
      setEditDetailsData({
        bankName: stats.participant.bankName || "",
        bik: stats.participant.bik || "",
        bankAccount: stats.participant.bankAccount || "",
        corrAccount: stats.participant.corrAccount || "",
      });
      setIsEditingDetails(true);
    }
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
  };

  const saveDetails = () => {
    // Trim all string values to remove extra spaces (fixes mobile autocomplete issues)
    const trimmedData = Object.fromEntries(
      Object.entries(editDetailsData).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    );
    updatePaymentDetailsMutation.mutate(trimmedData);
  };

  const handleOfferScroll = () => {
    if (offerScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = offerScrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setOfferScrolled(true);
      }
    }
  };

  const handleRegister = () => {
    if (!offerAccepted) {
      toast({ title: "Ошибка", description: "Необходимо принять условия оферты", variant: "destructive" });
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.inn) {
      toast({ title: "Ошибка", description: "Заполните все обязательные поля (ФИО, телефон, ИНН)", variant: "destructive" });
      return;
    }

    if (participantType === "ooo") {
      if (!formData.companyName || !formData.ogrn || !formData.kpp || !formData.legalAddress) {
        toast({ title: "Ошибка", description: "Для ООО необходимо заполнить: наименование организации, ОГРН, КПП и юридический адрес", variant: "destructive" });
        return;
      }
    }

    // Trim all string values to remove extra spaces (fixes mobile autocomplete issues)
    const trimmedFormData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    );

    registerMutation.mutate({
      participantType,
      ...trimmedFormData,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано", description: "Реферальная ссылка скопирована в буфер обмена" });
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="default" className="min-h-[44px] text-sm sm:text-base touch-manipulation" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              На главную
            </Button>
          </Link>
        </div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const referral = stats?.referral;
  const participant = stats?.participant;
  const settings = stats?.settings;
  const transactions = stats?.transactions || [];
  const payouts = stats?.payouts || [];

  const referralLink = referral ? `${window.location.origin}?ref=${referral.referralCode}` : "";
  const canRequestPayout = participant?.status === "approved" && (referral?.earningsPending || 0) >= (settings?.minPayoutAmount || 1000);

  if (!participant && !showRegistration) {
    return (
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="default" className="min-h-[44px] text-sm sm:text-base touch-manipulation" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              На главную
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Реферальная программа</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Зарабатывайте, приглашая новых клиентов
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Станьте участником
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Для участия необходимо зарегистрироваться как самозанятый, ИП или ООО
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="hover-elevate cursor-pointer" onClick={() => { setParticipantType("self_employed"); setShowRegistration(true); }}>
                <CardContent className="p-4 sm:pt-6 text-center flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 sm:mx-auto sm:mb-2 text-primary flex-shrink-0" />
                  <div className="text-left sm:text-center">
                    <h3 className="font-semibold text-sm sm:text-base">Самозанятый</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground sm:mt-1">Физическое лицо с НПД</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer" onClick={() => { setParticipantType("ip"); setShowRegistration(true); }}>
                <CardContent className="p-4 sm:pt-6 text-center flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                  <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 sm:mx-auto sm:mb-2 text-primary flex-shrink-0" />
                  <div className="text-left sm:text-center">
                    <h3 className="font-semibold text-sm sm:text-base">ИП</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground sm:mt-1">Индивидуальный предприниматель</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer" onClick={() => { setParticipantType("ooo"); setShowRegistration(true); }}>
                <CardContent className="p-4 sm:pt-6 text-center flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0">
                  <Building className="h-8 w-8 sm:h-10 sm:w-10 sm:mx-auto sm:mb-2 text-primary flex-shrink-0" />
                  <div className="text-left sm:text-center">
                    <h3 className="font-semibold text-sm sm:text-base">ООО</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground sm:mt-1">Юридическое лицо</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {settings && (
              <div className="bg-muted p-3 sm:p-4 rounded-md">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Условия программы:</h4>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  {settings.percentReward > 0 && (
                    <li>Получайте {settings.percentReward}% от каждой покупки приглашённого клиента</li>
                  )}
                  {settings.fixedReward > 0 && (
                    <li>Фиксированная выплата {settings.fixedReward.toLocaleString("ru-RU")} ₽ за каждого клиента</li>
                  )}
                  {settings.bonusReward > 0 && (
                    <li>Бонус {settings.bonusReward.toLocaleString("ru-RU")} ₽ при регистрации</li>
                  )}
                  <li>Минимальная сумма для вывода: {settings.minPayoutAmount.toLocaleString("ru-RU")} ₽</li>
                </ul>
              </div>
            )}

            {offerData?.offerText && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Условия оферты
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <ScrollArea className="h-40 sm:h-48 rounded-md border p-2 sm:p-3">
                    <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                      {offerData.offerText}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ознакомьтесь с условиями перед регистрацией
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showRegistration) {
    return (
      <div className="container max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="default" className="min-h-[44px] text-sm sm:text-base touch-manipulation" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              На главную
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Регистрация в программе</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Заполните данные как {participantTypeLabels[participantType]}
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Личные данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-sm">ФИО *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  autoComplete="name"
                  data-testid="input-full-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Телефон *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  inputMode="tel"
                  type="tel"
                  data-testid="input-phone"
                />
              </div>
              {(participantType === "self_employed" || participantType === "ip") && (
                <div className="space-y-2">
                  <Label>Дата рождения</Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    data-testid="input-birth-date"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm">ИНН *</Label>
                <Input
                  value={formData.inn}
                  onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                  placeholder={participantType === "ooo" ? "10 цифр" : "12 цифр"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  data-testid="input-inn"
                />
              </div>
            </div>

            {(participantType === "self_employed" || participantType === "ip") && (
              <div className="space-y-2">
                <Label>Подтверждение статуса</Label>
                <Textarea
                  value={formData.statusConfirmation}
                  onChange={(e) => setFormData({ ...formData, statusConfirmation: e.target.value })}
                  placeholder="Ссылка на справку о статусе или номер документа"
                  data-testid="input-status-confirmation"
                />
              </div>
            )}

            {participantType === "ooo" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm">Наименование организации *</Label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder='ООО "Компания"'
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">ОГРН *</Label>
                    <Input
                      value={formData.ogrn}
                      onChange={(e) => setFormData({ ...formData, ogrn: e.target.value })}
                      placeholder="13 цифр"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={15}
                      data-testid="input-ogrn"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">КПП *</Label>
                    <Input
                      value={formData.kpp}
                      onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                      placeholder="9 цифр"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={9}
                      data-testid="input-kpp"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Юридический адрес *</Label>
                  <Textarea
                    value={formData.legalAddress}
                    onChange={(e) => setFormData({ ...formData, legalAddress: e.target.value })}
                    placeholder="Полный юридический адрес"
                    className="min-h-[80px]"
                    data-testid="input-legal-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Фактический адрес</Label>
                  <Textarea
                    value={formData.actualAddress}
                    onChange={(e) => setFormData({ ...formData, actualAddress: e.target.value })}
                    placeholder="Фактический адрес (если отличается)"
                    className="min-h-[80px]"
                    data-testid="input-actual-address"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Банковские реквизиты</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Для выплаты вознаграждений</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Наименование банка</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Название банка"
                  autoComplete="off"
                  data-testid="input-bank-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">БИК</Label>
                <Input
                  value={formData.bik}
                  onChange={(e) => setFormData({ ...formData, bik: e.target.value })}
                  placeholder="9 цифр"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={9}
                  data-testid="input-bik"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Расчётный счёт</Label>
                <Input
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="20 цифр"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  data-testid="input-bank-account"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Корр. счёт</Label>
                <Input
                  value={formData.corrAccount}
                  onChange={(e) => setFormData({ ...formData, corrAccount: e.target.value })}
                  placeholder="20 цифр"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  data-testid="input-corr-account"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Договор-оферта
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Прочитайте и примите условия участия в программе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <ScrollArea
              className="h-48 sm:h-64 border rounded-md p-3 sm:p-4"
              ref={offerScrollRef}
              onScrollCapture={handleOfferScroll}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert text-xs sm:text-sm">
                {offerData?.offerText ? (
                  <div dangerouslySetInnerHTML={{ __html: offerData.offerText.replace(/\n/g, '<br/>') }} />
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-sm sm:text-base font-semibold">ДОГОВОР-ОФЕРТА</h3>
                    <h4 className="text-xs sm:text-sm font-medium">о реферальной программе</h4>
                    <p>1. Настоящий договор-оферта определяет условия участия в реферальной программе help152fz.ru.</p>
                    <p>2. Участник реферальной программы получает вознаграждение за привлечение новых клиентов.</p>
                    <p>3. Размер вознаграждения определяется действующими условиями программы.</p>
                    <p>4. Выплата вознаграждения осуществляется на банковские реквизиты участника.</p>
                    <p>5. Минимальная сумма для заказа выплаты составляет {settings?.minPayoutAmount || 1000} рублей.</p>
                    <p>6. Участник обязуется предоставить достоверные данные для регистрации.</p>
                    <p>7. Организатор вправе отказать в выплате при нарушении условий программы.</p>
                    <p>8. Условия программы могут быть изменены организатором в одностороннем порядке.</p>
                    <p className="text-muted-foreground mt-4">Прокрутите документ до конца, чтобы принять условия.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-start sm:items-center space-x-2">
              <Checkbox
                id="offer-accept"
                checked={offerAccepted}
                onCheckedChange={(checked) => setOfferAccepted(!!checked)}
                disabled={!offerScrolled}
                className="mt-0.5 sm:mt-0"
                data-testid="checkbox-offer-accept"
              />
              <Label
                htmlFor="offer-accept"
                className={`text-xs sm:text-sm ${!offerScrolled ? "text-muted-foreground" : ""}`}
              >
                Я ознакомился с условиями договора-оферты и принимаю их
                {!offerScrolled && " (прокрутите документ до конца)"}
              </Label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => setShowRegistration(false)}
                className="w-full sm:w-auto"
                data-testid="button-cancel"
              >
                Отмена
              </Button>
              <Button
                onClick={handleRegister}
                disabled={!offerAccepted || registerMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-submit"
              >
                {registerMutation.isPending ? "Отправка..." : "Подать заявку"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="mb-4">
        <Link href="/">
          <Button variant="ghost" size="default" className="min-h-[44px] text-sm sm:text-base touch-manipulation" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            На главную
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Реферальная программа</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Приглашайте друзей и получайте бонусы за каждую их покупку
        </p>
      </div>

      {participant?.status === "pending" && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-start sm:items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Заявка на рассмотрении</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Ваша заявка проверяется администратором. После одобрения вы получите уведомление на email.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {participant?.status === "approved" && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Вы участник реферальной программы!</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Ваша заявка одобрена. Делитесь ссылкой и зарабатывайте на каждой покупке.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {participant?.status === "rejected" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-start sm:items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Заявка отклонена</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Свяжитесь с поддержкой для уточнения причин</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-1 sm:pb-2 p-3 sm:p-6">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-sm sm:text-lg">Приглашено</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <span className="text-2xl sm:text-3xl font-bold" data-testid="text-referrals-count">
              {referral?.referralsCount || 0}
            </span>
            <span className="text-muted-foreground ml-1 text-xs sm:text-base">чел.</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-1 sm:pb-2 p-3 sm:p-6">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-sm sm:text-lg">Заработано</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <span className="text-2xl sm:text-3xl font-bold" data-testid="text-total-earnings">
              {(referral?.earningsTotal || 0).toLocaleString("ru-RU")}
            </span>
            <span className="text-muted-foreground ml-1 text-xs sm:text-base">₽</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-1 sm:pb-2 p-3 sm:p-6">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            <CardTitle className="text-sm sm:text-lg">К выводу</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <span className="text-2xl sm:text-3xl font-bold text-yellow-600" data-testid="text-pending-earnings">
              {(referral?.earningsPending || 0).toLocaleString("ru-RU")}
            </span>
            <span className="text-muted-foreground ml-1 text-xs sm:text-base">₽</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-1 sm:pb-2 p-3 sm:p-6">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <CardTitle className="text-sm sm:text-lg">Выплачено</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <span className="text-2xl sm:text-3xl font-bold text-green-600" data-testid="text-paid-earnings">
              {(referral?.earningsPaid || 0).toLocaleString("ru-RU")}
            </span>
            <span className="text-muted-foreground ml-1 text-xs sm:text-base">₽</span>
          </CardContent>
        </Card>
      </div>

      {participant?.status === "approved" && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Ваша реферальная ссылка
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Поделитесь этой ссылкой с друзьями. Вы получите {settings?.percentReward || 10}% от каждой их покупки.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-xs sm:text-sm"
                data-testid="input-referral-link"
              />
              <Button
                onClick={() => copyToClipboard(referralLink)}
                variant="outline"
                size="icon"
                data-testid="button-copy-link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-sm">Ваш код:</span>
              <Badge variant="outline" className="text-xs sm:text-sm" data-testid="text-referral-code">
                {referral?.referralCode}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(referral?.referralCode || "")}
                data-testid="button-copy-code"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="payouts">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 gap-1">
            <TabsTrigger value="payouts" data-testid="tab-payouts" className="text-xs sm:text-sm px-2 sm:px-4">
              <CreditCard className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Выплаты</span>
            </TabsTrigger>
            <TabsTrigger value="custom-links" data-testid="tab-custom-links" className="text-xs sm:text-sm px-2 sm:px-4">
              <Link2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Ссылки ({customLinks?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="text-xs sm:text-sm px-2 sm:px-4">
              <Wallet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details" className="text-xs sm:text-sm px-2 sm:px-4">
              <Building className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Реквизиты</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Заказать выплату</CardTitle>
              <CardDescription>
                Минимальная сумма: {settings?.minPayoutAmount?.toLocaleString("ru-RU") || "1 000"} ₽
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canRequestPayout ? (
                <div className="flex gap-4 items-center">
                  <div>
                    <p className="text-2xl font-bold">{referral?.earningsPending?.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-sm text-muted-foreground">доступно к выводу</p>
                  </div>
                  <Button
                    onClick={() => payoutMutation.mutate(referral?.earningsPending || 0)}
                    disabled={payoutMutation.isPending}
                    data-testid="button-request-payout"
                  >
                    {payoutMutation.isPending ? "Создание..." : "Заказать выплату"}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {participant?.status !== "approved"
                    ? "Дождитесь одобрения вашей заявки на участие"
                    : `Накопите минимум ${settings?.minPayoutAmount?.toLocaleString("ru-RU") || "1 000"} ₽ для заказа выплаты`}
                </p>
              )}
            </CardContent>
          </Card>

          {payouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">История выплат</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>{new Date(payout.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                          <TableCell className="font-medium">{payout.amount.toLocaleString("ru-RU")} ₽</TableCell>
                          <TableCell>
                            <Badge variant={payoutStatusColors[payout.status]}>
                              {payoutStatusLabels[payout.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="sm:hidden space-y-3">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="p-3 bg-muted/30 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{payout.amount.toLocaleString("ru-RU")} ₽</p>
                        <p className="text-xs text-muted-foreground">{new Date(payout.createdAt).toLocaleDateString("ru-RU")}</p>
                      </div>
                      <Badge variant={payoutStatusColors[payout.status]} className="text-xs">
                        {payoutStatusLabels[payout.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom-links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Персональные ссылки
              </CardTitle>
              <CardDescription>
                Отслеживайте эффективность каждой ссылки отдельно
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customLinks && customLinks.length > 0 ? (
                <div className="space-y-4">
                  {customLinks.map((link) => (
                    <Card key={link.id} className={!link.isActive ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-sm sm:text-base">{link.name}</h4>
                              <Badge variant={link.isActive ? "default" : "secondary"} className="text-xs">
                                {link.isActive ? "Активна" : "Неактивна"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {link.customPercent}%
                              </Badge>
                            </div>
                            {link.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{link.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Input
                            value={`${window.location.origin}?ref=${link.code}`}
                            readOnly
                            className="font-mono text-xs flex-1"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(`${window.location.origin}?ref=${link.code}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-center">
                          <div className="p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <MousePointer className="h-3 w-3" />
                              Клики
                            </div>
                            <p className="text-sm sm:text-lg font-bold">{link.clicksCount}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              Рефералы
                            </div>
                            <p className="text-sm sm:text-lg font-bold">{link.referralsCount}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              Всего
                            </div>
                            <p className="text-sm sm:text-lg font-bold text-green-600">{link.earningsTotal.toLocaleString("ru-RU")} ₽</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Ожидает
                            </div>
                            <p className="text-sm sm:text-lg font-bold">{link.earningsPending.toLocaleString("ru-RU")} ₽</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded-md col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle className="h-3 w-3" />
                              Выплачено
                            </div>
                            <p className="text-sm sm:text-lg font-bold">{link.earningsPaid.toLocaleString("ru-RU")} ₽</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">У вас пока нет персональных ссылок</p>
                  <p className="text-xs mt-1">Администратор может создать именные ссылки для вашего аккаунта</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">История начислений</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Описание</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{new Date(tx.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                            <TableCell className="font-medium text-green-600">+{tx.amount.toLocaleString("ru-RU")} ₽</TableCell>
                            <TableCell className="text-muted-foreground">{tx.description || "Реферальное вознаграждение"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-green-600">+{tx.amount.toLocaleString("ru-RU")} ₽</p>
                          <span className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ru-RU")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tx.description || "Реферальное вознаграждение"}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Начислений пока нет. Приглашайте клиентов по вашей ссылке!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base sm:text-lg">Ваши реквизиты</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Данные для выплаты вознаграждений</CardDescription>
                </div>
                {participant?.status === "approved" && !isEditingDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditingDetails}
                    data-testid="button-edit-details"
                    className="text-xs sm:text-sm"
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Редактировать
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Тип участника</Label>
                  <p className="font-medium text-sm sm:text-base">{participantTypeLabels[participant?.participantType || "self_employed"]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">ИНН</Label>
                  <p className="font-medium font-mono text-sm sm:text-base">{participant?.inn}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">ФИО</Label>
                  <p className="font-medium text-sm sm:text-base">{participant?.fullName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs sm:text-sm">Телефон</Label>
                  <p className="font-medium text-sm sm:text-base">{participant?.phone}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm sm:text-base">Банковские реквизиты</h4>
                  {isEditingDetails && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditingDetails}
                        data-testid="button-cancel-edit"
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveDetails}
                        disabled={updatePaymentDetailsMutation.isPending}
                        data-testid="button-save-details"
                        className="text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {updatePaymentDetailsMutation.isPending ? "..." : "Сохранить"}
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Название банка</Label>
                      <Input
                        value={editDetailsData.bankName}
                        onChange={(e) => setEditDetailsData({ ...editDetailsData, bankName: e.target.value })}
                        placeholder="Сбербанк"
                        className="text-sm"
                        style={{ fontSize: '16px' }}
                        data-testid="input-edit-bank-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">БИК</Label>
                      <Input
                        value={editDetailsData.bik}
                        onChange={(e) => setEditDetailsData({ ...editDetailsData, bik: e.target.value })}
                        placeholder="044525225"
                        inputMode="numeric"
                        className="text-sm font-mono"
                        style={{ fontSize: '16px' }}
                        data-testid="input-edit-bik"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Расчётный счёт</Label>
                      <Input
                        value={editDetailsData.bankAccount}
                        onChange={(e) => setEditDetailsData({ ...editDetailsData, bankAccount: e.target.value })}
                        placeholder="40802810000000000000"
                        inputMode="numeric"
                        className="text-sm font-mono"
                        style={{ fontSize: '16px' }}
                        data-testid="input-edit-bank-account"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Корр. счёт</Label>
                      <Input
                        value={editDetailsData.corrAccount}
                        onChange={(e) => setEditDetailsData({ ...editDetailsData, corrAccount: e.target.value })}
                        placeholder="30101810400000000225"
                        inputMode="numeric"
                        className="text-sm font-mono"
                        style={{ fontSize: '16px' }}
                        data-testid="input-edit-corr-account"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs sm:text-sm">Банк</Label>
                      <p className="font-medium text-sm sm:text-base">{participant?.bankName || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs sm:text-sm">БИК</Label>
                      <p className="font-medium font-mono text-sm sm:text-base">{participant?.bik || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs sm:text-sm">Расчётный счёт</Label>
                      <p className="font-medium font-mono text-sm sm:text-base break-all">{participant?.bankAccount || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs sm:text-sm">Корр. счёт</Label>
                      <p className="font-medium font-mono text-sm sm:text-base break-all">{participant?.corrAccount || "—"}</p>
                    </div>
                  </div>
                )}

                {participant?.status !== "approved" && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-3 bg-muted p-3 rounded-md">
                    Редактирование реквизитов доступно после одобрения вашей заявки администратором.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
