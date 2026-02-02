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
import { Plus, Pencil, Trash2, Loader2, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Package } from "@shared/schema";

export default function AdminPackages() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Пакеты услуг</h1>
          <p className="text-muted-foreground">Управление пакетами аудита</p>
        </div>
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? "Редактирование пакета" : "Новый пакет"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                  placeholder="Краткое описание пакета"
                  className="resize-none"
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
                <div className="flex items-center justify-between">
                  <Label>Что входит в пакет</Label>
                  <Button variant="outline" size="sm" onClick={addFeature} type="button">
                    <Plus className="h-3 w-3 mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="Полный аудит сайта"
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
                <div className="flex items-center justify-between">
                  <Label>Критерии проверки</Label>
                  <Button variant="outline" size="sm" onClick={addCriterion} type="button">
                    <Plus className="h-3 w-3 mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.criteria.map((criterion, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={criterion}
                        onChange={(e) => updateCriterion(index, e.target.value)}
                        placeholder="HTTPS/SSL сертификат"
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !packages?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Пакетов пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={!pkg.isActive ? "opacity-60" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  </div>
                  {!pkg.isActive && <Badge variant="secondary">Скрыт</Badge>}
                </div>
                <p className="text-2xl font-bold mb-2">
                  {pkg.price.toLocaleString("ru-RU")} руб.
                </p>
                {pkg.deadline && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    <span>{pkg.deadline}</span>
                  </div>
                )}
                {pkg.features && pkg.features.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Услуги:</p>
                    <ul className="space-y-1 text-sm">
                      {pkg.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-muted-foreground">•</span> {f}
                        </li>
                      ))}
                      {pkg.features.length > 3 && (
                        <li className="text-muted-foreground">и еще {pkg.features.length - 3}...</li>
                      )}
                    </ul>
                  </div>
                )}
                {pkg.criteria && pkg.criteria.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Критерии:</p>
                    <ul className="space-y-1 text-sm">
                      {pkg.criteria.slice(0, 2).map((c, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                      {pkg.criteria.length > 2 && (
                        <li className="text-muted-foreground">и еще {pkg.criteria.length - 2}...</li>
                      )}
                    </ul>
                  </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(pkg.id)}
                    data-testid={`button-delete-package-${pkg.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
