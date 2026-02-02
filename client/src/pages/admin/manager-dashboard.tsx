import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileEdit,
  Briefcase,
  Eye,
  Search,
  Building2,
  Loader2
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  documentType: string;
  status: string;
  clientUserId: number | null;
  assignedManagerId: number | null;
  assignedLawyerId: number | null;
  clientCompanyName: string | null;
  clientInn: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewDocumentForm {
  title: string;
  documentType: string;
  clientCompanyName: string;
  clientCompanyType: string;
  clientInn: string;
  clientOgrn: string;
  clientKpp: string;
  clientAddress: string;
  clientDirectorName: string;
  clientDirectorPosition: string;
  clientPhone: string;
  clientEmail: string;
  managerNotes: string;
}

const documentTypeLabels: Record<string, string> = {
  privacy_policy: "Политика обработки ПДн",
  consent_form: "Согласие на обработку ПДн",
  cookie_policy: "Cookie-политика",
  cookie_banner: "Cookie-баннер",
  user_agreement: "Пользовательское соглашение",
  offer: "Оферта",
  terms_of_service: "Условия использования",
  confidentiality: "Политика конфиденциальности",
  other: "Прочее",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Черновик", variant: "secondary" },
  in_progress: { label: "В работе", variant: "default" },
  pending_review: { label: "На проверке", variant: "default" },
  revision: { label: "Доработка", variant: "destructive" },
  approved: { label: "Одобрен", variant: "outline" },
  delivered: { label: "Доставлен", variant: "outline" },
};

const emptyForm: NewDocumentForm = {
  title: "",
  documentType: "privacy_policy",
  clientCompanyName: "",
  clientCompanyType: "",
  clientInn: "",
  clientOgrn: "",
  clientKpp: "",
  clientAddress: "",
  clientDirectorName: "",
  clientDirectorPosition: "",
  clientPhone: "",
  clientEmail: "",
  managerNotes: "",
};

export default function ManagerDashboardPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [newDoc, setNewDoc] = useState<NewDocumentForm>({ ...emptyForm });
  const [isLookingUp, setIsLookingUp] = useState(false);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/manager/documents"],
  });

  const { data: stats } = useQuery<{ draft: number; inReview: number; revision: number; approved: number }>({
    queryKey: ["/api/manager/documents/stats"],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: NewDocumentForm) => {
      const response = await apiRequest("POST", "/api/manager/documents", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents/stats"] });
      setCreateDialogOpen(false);
      setNewDoc({ ...emptyForm });
      toast({ title: "Документ создан", description: "Новый документ добавлен в систему" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const sendToReviewMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("POST", `/api/manager/documents/${documentId}/send-to-review`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents/stats"] });
      toast({ title: "Отправлено", description: "Документ отправлен на проверку юристу" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const sendBatchToReviewMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const promises = documentIds.map(id => 
        apiRequest("POST", `/api/manager/documents/${id}/send-to-review`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents/stats"] });
      setSelectedDocs([]);
      toast({ title: "Отправлено", description: `${selectedDocs.length} документов отправлено на проверку` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const lookupInn = async () => {
    if (!newDoc.clientInn || newDoc.clientInn.length < 10) {
      toast({ title: "Ошибка", description: "Введите корректный ИНН (10 или 12 цифр)", variant: "destructive" });
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await apiRequest("POST", "/api/inn/lookup", { inn: newDoc.clientInn });
      const data = await response.json();
      
      if (data.found) {
        setNewDoc(prev => ({
          ...prev,
          clientCompanyName: data.companyName || prev.clientCompanyName,
          clientCompanyType: data.companyType || prev.clientCompanyType,
          clientOgrn: data.ogrn || prev.clientOgrn,
          clientKpp: data.kpp || prev.clientKpp,
          clientAddress: data.address || prev.clientAddress,
          clientDirectorName: data.director || prev.clientDirectorName,
          clientDirectorPosition: data.directorPosition || prev.clientDirectorPosition,
        }));
        toast({ title: "Найдено", description: `Данные для ${data.companyName} загружены` });
      } else {
        toast({ title: "Не найдено", description: data.message || "Компания не найдена по ИНН", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ 
        title: "Ошибка", 
        description: "Не удалось получить данные. Введите реквизиты вручную.", 
        variant: "destructive" 
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const updateField = (field: keyof NewDocumentForm, value: string) => {
    setNewDoc(prev => ({ ...prev, [field]: value }));
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    if (selectedTab === "all") return true;
    return doc.status === selectedTab;
  });

  const sendableDocs = filteredDocuments.filter(d => d.status === "draft" || d.status === "revision");
  const canBatchSend = selectedDocs.length > 0 && selectedDocs.every(id => 
    sendableDocs.some(doc => doc.id === id)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Панель менеджера</h1>
            <p className="text-muted-foreground">Управление документами и заявками</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canBatchSend && (
            <Button 
              variant="outline"
              onClick={() => sendBatchToReviewMutation.mutate(selectedDocs)}
              disabled={sendBatchToReviewMutation.isPending}
              data-testid="button-batch-send"
            >
              <Send className="h-4 w-4 mr-2" />
              Отправить пакетом ({selectedDocs.length})
            </Button>
          )}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-document">
                <Plus className="h-4 w-4 mr-2" />
                Создать документ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Новый документ</DialogTitle>
                <DialogDescription>Создайте новый документ для клиента</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Название документа *</Label>
                    <Input
                      placeholder="Например: Политика обработки ПДн для ООО Рога и Копыта"
                      value={newDoc.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      data-testid="input-doc-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип документа *</Label>
                    <Select
                      value={newDoc.documentType}
                      onValueChange={(v) => updateField("documentType", v)}
                    >
                      <SelectTrigger data-testid="select-doc-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(documentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5" />
                    <h3 className="font-medium">Реквизиты клиента</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>ИНН</Label>
                        <Input
                          placeholder="1234567890"
                          value={newDoc.clientInn}
                          onChange={(e) => updateField("clientInn", e.target.value.replace(/\D/g, "").slice(0, 12))}
                          data-testid="input-client-inn"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={lookupInn}
                          disabled={isLookingUp || !newDoc.clientInn}
                          data-testid="button-lookup-inn"
                        >
                          {isLookingUp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          <span className="ml-2">Найти</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Тип организации</Label>
                        <Select
                          value={newDoc.clientCompanyType}
                          onValueChange={(v) => updateField("clientCompanyType", v)}
                        >
                          <SelectTrigger data-testid="select-company-type">
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ИП">ИП</SelectItem>
                            <SelectItem value="ООО">ООО</SelectItem>
                            <SelectItem value="АО">АО</SelectItem>
                            <SelectItem value="ПАО">ПАО</SelectItem>
                            <SelectItem value="НКО">НКО</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Наименование организации</Label>
                        <Input
                          placeholder="ООО Рога и Копыта"
                          value={newDoc.clientCompanyName}
                          onChange={(e) => updateField("clientCompanyName", e.target.value)}
                          data-testid="input-company-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ОГРН / ОГРНИП</Label>
                        <Input
                          placeholder="1234567890123"
                          value={newDoc.clientOgrn}
                          onChange={(e) => updateField("clientOgrn", e.target.value.replace(/\D/g, "").slice(0, 15))}
                          data-testid="input-ogrn"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>КПП</Label>
                        <Input
                          placeholder="123456789"
                          value={newDoc.clientKpp}
                          onChange={(e) => updateField("clientKpp", e.target.value.replace(/\D/g, "").slice(0, 9))}
                          data-testid="input-kpp"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Юридический адрес</Label>
                      <Input
                        placeholder="г. Москва, ул. Примерная, д. 1"
                        value={newDoc.clientAddress}
                        onChange={(e) => updateField("clientAddress", e.target.value)}
                        data-testid="input-address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ФИО руководителя</Label>
                        <Input
                          placeholder="Иванов Иван Иванович"
                          value={newDoc.clientDirectorName}
                          onChange={(e) => updateField("clientDirectorName", e.target.value)}
                          data-testid="input-director-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Должность руководителя</Label>
                        <Input
                          placeholder="Генеральный директор"
                          value={newDoc.clientDirectorPosition}
                          onChange={(e) => updateField("clientDirectorPosition", e.target.value)}
                          data-testid="input-director-position"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Телефон</Label>
                        <Input
                          placeholder="+7 (999) 123-45-67"
                          value={newDoc.clientPhone}
                          onChange={(e) => updateField("clientPhone", e.target.value)}
                          data-testid="input-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="info@company.ru"
                          value={newDoc.clientEmail}
                          onChange={(e) => updateField("clientEmail", e.target.value)}
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Заметки менеджера</Label>
                      <Textarea
                        placeholder="Дополнительная информация о клиенте или документе..."
                        value={newDoc.managerNotes}
                        onChange={(e) => updateField("managerNotes", e.target.value)}
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={() => createDocumentMutation.mutate(newDoc)}
                  disabled={!newDoc.title || createDocumentMutation.isPending}
                  data-testid="button-submit-document"
                >
                  {createDocumentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Черновики</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.draft || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">На проверке</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inReview || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">На доработке</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revision || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Одобрено</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Документы</CardTitle>
          <CardDescription>Список всех документов в работе</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="draft">Черновики</TabsTrigger>
              <TabsTrigger value="pending_review">На проверке</TabsTrigger>
              <TabsTrigger value="revision">Доработка</TabsTrigger>
              <TabsTrigger value="approved">Одобрено</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Загрузка...</p>
              ) : filteredDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Нет документов</p>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border gap-4"
                    data-testid={`document-row-${doc.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {(doc.status === "draft" || doc.status === "revision") && (
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          data-testid={`checkbox-doc-${doc.id}`}
                        />
                      )}
                      <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                          {doc.clientCompanyName && ` - ${doc.clientCompanyName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant={statusLabels[doc.status]?.variant || "secondary"}>
                        {statusLabels[doc.status]?.label || doc.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" data-testid={`button-view-${doc.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" data-testid={`button-upload-${doc.id}`}>
                          <Upload className="h-4 w-4" />
                        </Button>
                        {(doc.status === "draft" || doc.status === "revision") && (
                          <Button
                            size="sm"
                            onClick={() => sendToReviewMutation.mutate(doc.id)}
                            disabled={sendToReviewMutation.isPending}
                            data-testid={`button-send-review-${doc.id}`}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            На проверку
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
