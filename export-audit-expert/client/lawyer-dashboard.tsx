import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Clock, 
  Scale,
  Eye,
  ExternalLink,
  MessageSquare
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
  revision: { label: "Требует доработки", variant: "destructive" },
  approved: { label: "Одобрен", variant: "outline" },
  delivered: { label: "Доставлен", variant: "outline" },
};

export default function LawyerDashboardPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("in_review");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/lawyer/documents"],
  });

  const { data: stats } = useQuery<{ inReview: number; approved: number; revision: number }>({
    queryKey: ["/api/lawyer/documents/stats"],
  });

  const { data: integrations } = useQuery<{
    consultantPlus: boolean;
    garant: boolean;
  }>({
    queryKey: ["/api/lawyer/integrations"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ documentId, decision, comment }: { documentId: number; decision: string; comment: string }) => {
      const response = await apiRequest("POST", `/api/lawyer/documents/${documentId}/review`, { decision, comment });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lawyer/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lawyer/documents/stats"] });
      setReviewDialogOpen(false);
      setSelectedDocument(null);
      setReviewComment("");
      toast({ title: "Решение сохранено", description: "Статус документа обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const filteredDocuments = documents.filter((doc) => {
    if (selectedTab === "all") return true;
    return doc.status === selectedTab;
  });

  const openReviewDialog = (doc: Document) => {
    setSelectedDocument(doc);
    setReviewComment("");
    setReviewDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Панель юриста</h1>
            <p className="text-muted-foreground">Проверка и утверждение документов</p>
          </div>
        </div>
        <div className="flex gap-2">
          {integrations?.consultantPlus && (
            <Button variant="outline" asChild>
              <a href="https://www.consultant.ru" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                КонсультантПлюс
              </a>
            </Button>
          )}
          {integrations?.garant && (
            <Button variant="outline" asChild>
              <a href="https://www.garant.ru" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Гарант
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Требуют доработки</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
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
          <CardTitle>Документы на проверку</CardTitle>
          <CardDescription>Документы от менеджеров, требующие юридической проверки</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="in_review">На проверке</TabsTrigger>
              <TabsTrigger value="revision">Доработка</TabsTrigger>
              <TabsTrigger value="approved">Одобрено</TabsTrigger>
              <TabsTrigger value="all">Все</TabsTrigger>
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
                        <Button size="sm" variant="outline" data-testid={`button-download-${doc.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {doc.status === "in_review" && (
                          <Button
                            size="sm"
                            onClick={() => openReviewDialog(doc)}
                            data-testid={`button-review-${doc.id}`}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Проверить
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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Проверка документа</DialogTitle>
            <DialogDescription>
              {selectedDocument?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea
                placeholder="Ваши замечания или подтверждение..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                data-testid="textarea-review-comment"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => selectedDocument && reviewMutation.mutate({
                documentId: selectedDocument.id,
                decision: "revision_needed",
                comment: reviewComment,
              })}
              disabled={reviewMutation.isPending}
              data-testid="button-revision-needed"
            >
              <XCircle className="h-4 w-4 mr-1" />
              На доработку
            </Button>
            <Button
              onClick={() => selectedDocument && reviewMutation.mutate({
                documentId: selectedDocument.id,
                decision: "approved",
                comment: reviewComment,
              })}
              disabled={reviewMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Одобрить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
