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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Wand2,
  PackagePlus,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Package } from "@shared/schema";
import { PACKAGE_TEMPLATES, type PackageTemplate } from "@/lib/package-templates";

export default function AdminPackages() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    features: [""],
    criteria: [""],
    deadline: "",
    isActive: true,
  });

  const { data: packages, isLoading } = useQuery<Package[]>({
    queryKey: ["/api/admin/packages"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/packages/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingPackage ? "Пакет обновлен" : "Пакет создан" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/packages/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Пакет удален" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/packages/seed", {
        templates: PACKAGE_TEMPLATES,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Все шаблоны пакетов созданы", description: `Создано ${PACKAGE_TEMPLATES.length} пакетов` });
    },
    onError: () => {
      toast({ title: "Ошибка создания шаблонов", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      features: [""],
      criteria: [""],
      deadline: "",
      isActive: true,
    });
    setEditingPackage(null);
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      features: pkg.features?.length ? pkg.features : [""],
      criteria: pkg.criteria?.length ? pkg.criteria : [""],
      deadline: pkg.deadline || "",
      isActive: pkg.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price) return;
    const cleanFeatures = formData.features.filter((f) => f.trim());
    const cleanCriteria = formData.criteria.filter((c) => c.trim());
    saveMutation.mutate({
      ...formData,
      features: cleanFeatures,
      criteria: cleanCriteria,
      id: editingPackage?.id,
    });
  };

  const applyTemplate = (templateName: string) => {
    const template = PACKAGE_TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        price: template.price,
        features: [...template.features],
        criteria: [...template.criteria],
        deadline: template.deadline,
        isActive: true,
      });
    }
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures.length ? newFeatures : [""] });
  };

  const addCriterion = () => {
    setFormData({ ...formData, criteria: [...formData.criteria, ""] });
  };

  const updateCriterion = (index: number, value: string) => {
    const newCriteria = [...formData.criteria];
    newCriteria[index] = value;
    setFormData({ ...formData, criteria: newCriteria });
  };

  const removeCriterion = (index: number) => {
    const newCriteria = formData.criteria.filter((_, i) => i !== index);
    setFormData({ ...formData, criteria: newCriteria.length ? newCriteria : [""] });
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-packages-title">Пакеты услуг</h1>
          <p className="text-muted-foreground">Управление пакетами аудита</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(!packages || packages.length === 0) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-seed-packages" disabled={seedMutation.isPending}>
                  {seedMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Заполнить шаблонами
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Создать все пакеты из шаблонов?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Будет создано {PACKAGE_TEMPLATES.length} пакетов с предзаполненными данными:
                    критерии проверки, документы, описания. Вам останется только отредактировать
                    цены и сроки под ваши условия.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => seedMutation.mutate()} data-testid="button-confirm-seed">
                    Создать все пакеты
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-package">
                <Plus className="h-4 w-4 mr-2" />
                Добавить пакет
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? "Редактирование пакета" : "Новый пакет"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!editingPackage && (
                  <div className="space-y-2">
                    <Label>Выбрать шаблон</Label>
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Заполнить из шаблона..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGE_TEMPLATES.map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Шаблон заполнит все поля значениями по умолчанию. Вы сможете отредактировать их.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Лендинг"
                    data-testid="input-package-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Подробное описание пакета для пользователя"
                    className="resize-none min-h-[100px]"
                    data-testid="input-package-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Цена (руб.)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      data-testid="input-package-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Сроки выполнения</Label>
                    <Input
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      placeholder="1-3 рабочих дня"
                      data-testid="input-package-deadline"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label>Что входит в пакет</Label>
                      <Badge variant="secondary">{formData.features.filter(f => f.trim()).length}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={addFeature} type="button">
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{index + 1}.</span>
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          placeholder="Название услуги или документа"
                          data-testid={`input-feature-${index}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Label>Критерии проверки</Label>
                      <Badge variant="secondary">{formData.criteria.filter(c => c.trim()).length}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={addCriterion} type="button">
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {formData.criteria.map((criterion, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{index + 1}.</span>
                        <Input
                          value={criterion}
                          onChange={(e) => updateCriterion(index, e.target.value)}
                          placeholder="Критерий проверки"
                          data-testid={`input-criterion-${index}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCriterion(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Активен</Label>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    data-testid="switch-package-active"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-package"
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
      ) : !packages?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PackagePlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Пакетов пока нет</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте все 9 пакетов из готовых шаблонов одним нажатием
            </p>
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-empty"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Заполнить шаблонами ({PACKAGE_TEMPLATES.length} пакетов)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const isExpanded = expandedCards.has(pkg.id);
            const featuresCount = pkg.features?.length || 0;
            const criteriaCount = pkg.criteria?.length || 0;
            return (
              <Card key={pkg.id} className={!pkg.isActive ? "opacity-60" : ""} data-testid={`card-package-${pkg.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{pkg.name}</h3>
                        {!pkg.isActive && <Badge variant="secondary">Скрыт</Badge>}
                      </div>
                      <p className="text-2xl font-bold mt-1">
                        {pkg.price.toLocaleString("ru-RU")} <span className="text-base font-normal text-muted-foreground">руб.</span>
                      </p>
                    </div>
                  </div>

                  {pkg.deadline && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{pkg.deadline}</span>
                    </div>
                  )}

                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pkg.description}</p>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    {featuresCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-muted-foreground">Услуг: <span className="font-medium text-foreground">{featuresCount}</span></span>
                      </div>
                    )}
                    {criteriaCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Shield className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-muted-foreground">Критериев: <span className="font-medium text-foreground">{criteriaCount}</span></span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 mb-3">
                      {pkg.features && pkg.features.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Что входит в пакет:
                          </p>
                          <ul className="space-y-1 text-sm">
                            {pkg.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {pkg.criteria && pkg.criteria.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Критерии проверки:
                          </p>
                          <ul className="space-y-1 text-sm">
                            {pkg.criteria.map((c, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {(featuresCount > 0 || criteriaCount > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-3"
                      onClick={() => toggleCardExpand(pkg.id)}
                      data-testid={`button-expand-${pkg.id}`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Свернуть
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Подробнее
                        </>
                      )}
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(pkg)}
                      data-testid={`button-edit-package-${pkg.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Редактировать
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-package-${pkg.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить пакет «{pkg.name}»?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Пакет будет удалён из системы.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(pkg.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
