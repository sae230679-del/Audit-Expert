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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Pencil, Trash2, Loader2, Database, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { GuideSection, GuideTopic, GuideArticle } from "@shared/schema";

export default function AdminGuide() {
  const { toast } = useToast();

  const { data: settings } = useQuery<{ guideEnabled: boolean }>({
    queryKey: ["/api/settings"],
  });

  const toggleGuideMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PUT", "/api/admin/integrations/settings", { guideEnabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Настройки обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления настроек", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Справочник
          </h1>
          <p className="text-muted-foreground">Управление разделами, темами и статьями справочника</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Справочник на сайте</p>
              <p className="text-sm text-muted-foreground">Включить или выключить раздел справочника для пользователей</p>
            </div>
            <Switch
              checked={settings?.guideEnabled ?? false}
              onCheckedChange={(checked) => toggleGuideMutation.mutate(checked)}
              disabled={toggleGuideMutation.isPending}
              data-testid="switch-guide-enabled"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections" data-testid="tab-sections">Разделы</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics">Темы</TabsTrigger>
          <TabsTrigger value="articles" data-testid="tab-articles">Статьи</TabsTrigger>
        </TabsList>
        <TabsContent value="sections">
          <SectionsTab />
        </TabsContent>
        <TabsContent value="topics">
          <TopicsTab />
        </TabsContent>
        <TabsContent value="articles">
          <ArticlesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideSection | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    sortOrder: 0,
    isVisible: true,
  });

  const { data: sections, isLoading } = useQuery<GuideSection[]>({
    queryKey: ["/api/admin/guide/sections"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: number }) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/guide/sections/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/guide/sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/sections"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingItem ? "Раздел обновлен" : "Раздел добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/guide/sections/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/sections"] });
      toast({ title: "Раздел удален" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/guide/seed", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/topics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/articles"] });
      toast({ title: "Справочник заполнен шаблонами" });
    },
    onError: () => {
      toast({ title: "Справочник уже содержит данные", description: "Удалите существующие перед заполнением шаблонами", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", slug: "", description: "", sortOrder: 0, isVisible: true });
    setEditingItem(null);
  };

  const handleEdit = (item: GuideSection) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      description: item.description || "",
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.slug) return;
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div />
        <div className="flex items-center gap-2 flex-wrap">
          {!sections?.length && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-guide"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Заполнить шаблонами
            </Button>
          )}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-section">
                <Plus className="h-4 w-4 mr-2" />
                Добавить раздел
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Редактирование раздела" : "Новый раздел"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Название раздела"
                    data-testid="input-section-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="section-slug"
                    data-testid="input-section-slug"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Описание раздела"
                    className="min-h-[80px] resize-none"
                    data-testid="input-section-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Порядок сортировки</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    data-testid="input-section-order"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Видимый</Label>
                  <Switch
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                    data-testid="switch-section-visible"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-section"
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !sections?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Разделов пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <Card key={item.id} className={!item.isVisible ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant="outline">{item.slug}</Badge>
                        {!item.isVisible && (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Скрыт
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-section-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-section-${item.id}`}
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

function TopicsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideTopic | null>(null);
  const [filterSectionId, setFilterSectionId] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    sectionId: 0,
    sortOrder: 0,
    isPublished: true,
  });

  const { data: sections } = useQuery<GuideSection[]>({
    queryKey: ["/api/admin/guide/sections"],
  });

  const { data: topics, isLoading } = useQuery<GuideTopic[]>({
    queryKey: ["/api/admin/guide/topics", filterSectionId !== "all" ? `?sectionId=${filterSectionId}` : ""],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: number }) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/guide/topics/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/guide/topics", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/topics"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingItem ? "Тема обновлена" : "Тема добавлена" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/guide/topics/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/topics"] });
      toast({ title: "Тема удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", slug: "", description: "", sectionId: 0, sortOrder: 0, isPublished: true });
    setEditingItem(null);
  };

  const handleEdit = (item: GuideTopic) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      description: item.description || "",
      sectionId: item.sectionId,
      sortOrder: item.sortOrder,
      isPublished: item.isPublished,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.slug || !formData.sectionId) return;
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  const getSectionTitle = (sectionId: number) => {
    return sections?.find((s) => s.id === sectionId)?.title || `Раздел #${sectionId}`;
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="w-64">
          <Select value={filterSectionId} onValueChange={setFilterSectionId}>
            <SelectTrigger data-testid="select-filter-section">
              <SelectValue placeholder="Все разделы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все разделы</SelectItem>
              {sections?.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-topic">
              <Plus className="h-4 w-4 mr-2" />
              Добавить тему
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Редактирование темы" : "Новая тема"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название темы"
                  data-testid="input-topic-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="topic-slug"
                  data-testid="input-topic-slug"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание темы"
                  className="min-h-[80px] resize-none"
                  data-testid="input-topic-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Раздел</Label>
                <Select
                  value={formData.sectionId ? String(formData.sectionId) : ""}
                  onValueChange={(val) => setFormData({ ...formData, sectionId: Number(val) })}
                >
                  <SelectTrigger data-testid="select-topic-section">
                    <SelectValue placeholder="Выберите раздел" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Порядок сортировки</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  data-testid="input-topic-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Опубликована</Label>
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                  data-testid="switch-topic-published"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-topic"
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
      ) : !topics?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Тем пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <Card key={item.id} className={!item.isPublished ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant="outline">{item.slug}</Badge>
                        {!item.isPublished && (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Черновик
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getSectionTitle(item.sectionId)}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-topic-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-topic-${item.id}`}
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

function ArticlesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideArticle | null>(null);
  const [filterTopicId, setFilterTopicId] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    summary: "",
    topicId: null as number | null,
    status: "draft" as "draft" | "published" | "archived",
    bodyBaseMd: "",
    lawTags: "",
    topicTags: "",
  });

  const { data: topics } = useQuery<GuideTopic[]>({
    queryKey: ["/api/admin/guide/topics"],
  });

  const { data: articles, isLoading } = useQuery<GuideArticle[]>({
    queryKey: ["/api/admin/guide/articles", filterTopicId !== "all" ? `?topicId=${filterTopicId}` : ""],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        title: data.title,
        slug: data.slug,
        summary: data.summary || null,
        topicId: data.topicId || null,
        status: data.status,
        bodyBaseMd: data.bodyBaseMd || null,
        lawTags: data.lawTags ? data.lawTags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        topicTags: data.topicTags ? data.topicTags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      };
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/guide/articles/${data.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/guide/articles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/articles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingItem ? "Статья обновлена" : "Статья добавлена" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/guide/articles/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guide/articles"] });
      toast({ title: "Статья удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", slug: "", summary: "", topicId: null, status: "draft", bodyBaseMd: "", lawTags: "", topicTags: "" });
    setEditingItem(null);
  };

  const handleEdit = (item: GuideArticle) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      summary: item.summary || "",
      topicId: item.topicId,
      status: item.status,
      bodyBaseMd: item.bodyBaseMd || "",
      lawTags: (item.lawTags || []).join(", "),
      topicTags: (item.topicTags || []).join(", "),
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.slug) return;
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  const getTopicTitle = (topicId: number | null) => {
    if (!topicId) return "Без темы";
    return topics?.find((t) => t.id === topicId)?.title || `Тема #${topicId}`;
  };

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    published: "Опубликована",
    archived: "Архив",
  };

  const statusVariants: Record<string, "secondary" | "default" | "outline"> = {
    draft: "secondary",
    published: "default",
    archived: "outline",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="w-64">
          <Select value={filterTopicId} onValueChange={setFilterTopicId}>
            <SelectTrigger data-testid="select-filter-topic">
              <SelectValue placeholder="Все темы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все темы</SelectItem>
              {topics?.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-article">
              <Plus className="h-4 w-4 mr-2" />
              Добавить статью
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Редактирование статьи" : "Новая статья"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название статьи"
                  data-testid="input-article-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="article-slug"
                  data-testid="input-article-slug"
                />
              </div>
              <div className="space-y-2">
                <Label>Краткое описание</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Краткое описание статьи"
                  className="min-h-[60px] resize-none"
                  data-testid="input-article-summary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тема</Label>
                  <Select
                    value={formData.topicId ? String(formData.topicId) : "none"}
                    onValueChange={(val) => setFormData({ ...formData, topicId: val === "none" ? null : Number(val) })}
                  >
                    <SelectTrigger data-testid="select-article-topic">
                      <SelectValue placeholder="Выберите тему" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без темы</SelectItem>
                      {topics?.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val as "draft" | "published" | "archived" })}
                  >
                    <SelectTrigger data-testid="select-article-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Черновик</SelectItem>
                      <SelectItem value="published">Опубликована</SelectItem>
                      <SelectItem value="archived">Архив</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Содержание (Markdown)</Label>
                <Textarea
                  value={formData.bodyBaseMd}
                  onChange={(e) => setFormData({ ...formData, bodyBaseMd: e.target.value })}
                  placeholder="Основное содержание статьи в формате Markdown..."
                  className="min-h-[200px]"
                  data-testid="input-article-body"
                />
              </div>
              <div className="space-y-2">
                <Label>Теги законов (через запятую)</Label>
                <Input
                  value={formData.lawTags}
                  onChange={(e) => setFormData({ ...formData, lawTags: e.target.value })}
                  placeholder="152-ФЗ, GDPR, 149-ФЗ"
                  data-testid="input-article-law-tags"
                />
              </div>
              <div className="space-y-2">
                <Label>Тематические теги (через запятую)</Label>
                <Input
                  value={formData.topicTags}
                  onChange={(e) => setFormData({ ...formData, topicTags: e.target.value })}
                  placeholder="персональные данные, согласие, обработка"
                  data-testid="input-article-topic-tags"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-article"
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
      ) : !articles?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Статей пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((item) => (
            <Card key={item.id} className={item.status === "archived" ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant={statusVariants[item.status]}>
                        {item.status === "published" && <Eye className="h-3 w-3 mr-1" />}
                        {item.status === "draft" && <EyeOff className="h-3 w-3 mr-1" />}
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getTopicTitle(item.topicId)}
                    </p>
                    {item.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.summary}</p>
                    )}
                    {((item.lawTags && item.lawTags.length > 0) || (item.topicTags && item.topicTags.length > 0)) && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {item.lawTags?.map((tag, i) => (
                          <Badge key={`law-${i}`} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {item.topicTags?.map((tag, i) => (
                          <Badge key={`topic-${i}`} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-article-${item.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      data-testid={`button-delete-article-${item.id}`}
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
