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
import { Plus, Pencil, Trash2, Loader2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Case } from "@shared/schema";

export default function AdminCases() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Case | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    siteType: "",
    description: "",
    beforeScore: 0,
    afterScore: 0,
    issues: [] as string[],
    solutions: [] as string[],
    testimonial: "",
    clientName: "",
    sortOrder: 0,
    isActive: true,
  });
  const [issueInput, setIssueInput] = useState("");
  const [solutionInput, setSolutionInput] = useState("");

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/admin/cases"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/cases/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/cases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingItem ? "Кейс обновлен" : "Кейс добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/cases/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Кейс удален" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      siteType: "",
      description: "",
      beforeScore: 0,
      afterScore: 0,
      issues: [],
      solutions: [],
      testimonial: "",
      clientName: "",
      sortOrder: 0,
      isActive: true,
    });
    setEditingItem(null);
    setIssueInput("");
    setSolutionInput("");
  };

  const handleEdit = (item: Case) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      siteType: item.siteType,
      description: item.description,
      beforeScore: item.beforeScore,
      afterScore: item.afterScore,
      issues: item.issues || [],
      solutions: item.solutions || [],
      testimonial: item.testimonial || "",
      clientName: item.clientName || "",
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.siteType || !formData.description) return;
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  const addIssue = () => {
    if (issueInput.trim()) {
      setFormData({ ...formData, issues: [...formData.issues, issueInput.trim()] });
      setIssueInput("");
    }
  };

  const removeIssue = (idx: number) => {
    setFormData({ ...formData, issues: formData.issues.filter((_, i) => i !== idx) });
  };

  const addSolution = () => {
    if (solutionInput.trim()) {
      setFormData({ ...formData, solutions: [...formData.solutions, solutionInput.trim()] });
      setSolutionInput("");
    }
  };

  const removeSolution = (idx: number) => {
    setFormData({ ...formData, solutions: formData.solutions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Кейсы</h1>
          <p className="text-muted-foreground">Управление успешными кейсами</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-case">
              <Plus className="h-4 w-4 mr-2" />
              Добавить кейс
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Редактирование кейса" : "Новый кейс"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Интернет-магазин электроники"
                    data-testid="input-case-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип сайта</Label>
                  <Input
                    value={formData.siteType}
                    onChange={(e) => setFormData({ ...formData, siteType: e.target.value })}
                    placeholder="E-commerce"
                    data-testid="input-case-sitetype"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Провели комплексный аудит..."
                  data-testid="input-case-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Оценка до (%)</Label>
                  <Input
                    type="number"
                    value={formData.beforeScore}
                    onChange={(e) => setFormData({ ...formData, beforeScore: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    data-testid="input-case-beforescore"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Оценка после (%)</Label>
                  <Input
                    type="number"
                    value={formData.afterScore}
                    onChange={(e) => setFormData({ ...formData, afterScore: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    data-testid="input-case-afterscore"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Выявленные проблемы</Label>
                <div className="flex gap-2">
                  <Input
                    value={issueInput}
                    onChange={(e) => setIssueInput(e.target.value)}
                    placeholder="Добавить проблему"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIssue())}
                    data-testid="input-case-issue"
                  />
                  <Button type="button" onClick={addIssue} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.issues.map((issue, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeIssue(idx)}
                    >
                      {issue} x
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Решения</Label>
                <div className="flex gap-2">
                  <Input
                    value={solutionInput}
                    onChange={(e) => setSolutionInput(e.target.value)}
                    placeholder="Добавить решение"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSolution())}
                    data-testid="input-case-solution"
                  />
                  <Button type="button" onClick={addSolution} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.solutions.map((solution, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeSolution(idx)}
                    >
                      {solution} x
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название клиента (опционально)</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ООО Компания"
                  data-testid="input-case-clientname"
                />
              </div>

              <div className="space-y-2">
                <Label>Отзыв клиента (опционально)</Label>
                <Textarea
                  value={formData.testimonial}
                  onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
                  placeholder="Благодаря аудиту мы..."
                  data-testid="input-case-testimonial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Порядок сортировки</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-case-sortorder"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    data-testid="switch-case-active"
                  />
                  <Label>Активен</Label>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="button-save-case"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Сохранить изменения" : "Добавить кейс"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : cases && cases.length > 0 ? (
        <div className="grid gap-4">
          {cases
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((item) => {
              const improvement = item.afterScore - item.beforeScore;
              return (
                <Card key={item.id} data-testid={`case-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-medium">{item.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {item.siteType}
                          </Badge>
                          {improvement > 0 && (
                            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{improvement}%
                            </Badge>
                          )}
                          {!item.isActive && (
                            <Badge variant="outline" className="text-xs">Скрыт</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            До: <span className="text-red-600 dark:text-red-400">{item.beforeScore}%</span>
                          </span>
                          <span className="text-muted-foreground">
                            После: <span className="text-green-600 dark:text-green-400">{item.afterScore}%</span>
                          </span>
                          {item.clientName && (
                            <span className="text-muted-foreground">
                              Клиент: {item.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-case-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-delete-case-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет добавленных кейсов
          </CardContent>
        </Card>
      )}
    </div>
  );
}
