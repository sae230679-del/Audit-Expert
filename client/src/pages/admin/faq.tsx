import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FaqItem } from "@shared/schema";

export default function AdminFaq() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data: faqItems, isLoading } = useQuery<FaqItem[]>({
    queryKey: ["/api/admin/faq"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/faq/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/faq", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faq"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingItem ? "Вопрос обновлен" : "Вопрос добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/faq/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faq"] });
      toast({ title: "Вопрос удален" });
    },
  });

  const resetForm = () => {
    setFormData({ question: "", answer: "", sortOrder: 0, isActive: true });
    setEditingItem(null);
  };

  const handleEdit = (item: FaqItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.question || !formData.answer) return;
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">FAQ</h1>
          <p className="text-muted-foreground">Управление часто задаваемыми вопросами</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-faq">
              <Plus className="h-4 w-4 mr-2" />
              Добавить вопрос
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Редактирование вопроса" : "Новый вопрос"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Вопрос</Label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Как долго занимает проверка?"
                  data-testid="input-faq-question"
                />
              </div>
              <div className="space-y-2">
                <Label>Ответ</Label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Бесплатная экспресс-проверка занимает около 30 секунд..."
                  className="min-h-[120px] resize-none"
                  data-testid="input-faq-answer"
                />
              </div>
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  data-testid="input-faq-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Активен</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-faq-active"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-faq"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Сохранить"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !faqItems?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Вопросов пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {faqItems
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((item) => (
              <Card key={item.id} className={!item.isActive ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{item.question}</h3>
                        {!item.isActive && <Badge variant="secondary">Скрыт</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.answer}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-faq-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-faq-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
