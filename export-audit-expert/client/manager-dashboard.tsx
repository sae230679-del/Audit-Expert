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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileEdit,
  Users,
  Briefcase,
  Eye
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  documentType: string;
  status: string;
  clientUserId: number | null;
  assignedManagerId: number | null;
  assignedLawyerId: number | null;
  createdAt: string;
  updatedAt: string;
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
  in_review: { label: "На проверке", variant: "default" },
  revision: { label: "Доработка", variant: "destructive" },
  approved: { label: "Одобрен", variant: "outline" },
  delivered: { label: "Доставлен", variant: "outline" },
};

export default function ManagerDashboardPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  const [newDoc, setNewDoc] = useState({
    title: "",
    documentType: "privacy_policy",
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/manager/documents"],
  });

  const { data: stats } = useQuery<{ draft: number; inReview: number; revision: number; approved: number }>({
    queryKey: ["/api/manager/documents/stats"],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: typeof newDoc) => {
      const response = await apiRequest("POST", "/api/manager/documents", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/documents/stats"] });
      setCreateDialogOpen(false);
      setNewDoc({ title: "", documentType: "privacy_policy" });
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

  const filteredDocuments = documents.filter((doc) => {
    if (selectedTab === "all") return true;
    return doc.status === selectedTab;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Панель менеджера</h1>
            <p className="text-muted-foreground">Управление документами и заявками</p>
          </div>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-document">
              <Plus className="h-4 w-4 mr-2" />
              Создать документ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый документ</DialogTitle>
              <DialogDescription>Создайте новый документ для клиента</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название документа</Label>
                <Input
                  placeholder="Например: Политика обработки ПДн для ООО Рога и Копыта"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  data-testid="input-doc-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип документа</Label>
                <Select
                  value={newDoc.documentType}
                  onValueChange={(v) => setNewDoc({ ...newDoc, documentType: v })}
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
            <DialogFooter>
              <Button
                onClick={() => createDocumentMutation.mutate(newDoc)}
                disabled={!newDoc.title || createDocumentMutation.isPending}
                data-testid="button-submit-document"
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Черновики</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.draft || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">На проверке</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inReview || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">На доработке</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revision || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="draft">Черновики</TabsTrigger>
              <TabsTrigger value="in_review">На проверке</TabsTrigger>
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
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`document-row-${doc.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusLabels[doc.status]?.variant || "secondary"}>
                        {statusLabels[doc.status]?.label || doc.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" data-testid={`button-view-${doc.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" data-testid={`button-upload-${doc.id}`}>
                          <Upload className="h-4 w-4" />
                        </Button>
                        {doc.status === "draft" && (
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
