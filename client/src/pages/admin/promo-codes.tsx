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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Percent, Banknote, Calendar, Hash, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PromoCode } from "@shared/schema";

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    maxUses: null as number | null,
    expiresAt: "",
    minOrderAmount: null as number | null,
    isActive: true,
  });

  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promo-codes"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        maxUses: data.maxUses || null,
        minOrderAmount: data.minOrderAmount || null,
      };
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/promo-codes/${data.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/promo-codes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingPromo ? "Промокод обновлен" : "Промокод создан" });
    },
    onError: () => {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/promo-codes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({ title: "Промокод удален" });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "percent",
      discountValue: 10,
      maxUses: null,
      expiresAt: "",
      minOrderAmount: null,
      isActive: true,
    });
    setEditingPromo(null);
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || "",
      discountType: promo.discountType as "percent" | "fixed",
      discountValue: promo.discountValue,
      maxUses: promo.maxUses,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().slice(0, 16) : "",
      minOrderAmount: promo.minOrderAmount,
      isActive: promo.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.discountValue) return;
    saveMutation.mutate({
      ...formData,
      id: editingPromo?.id,
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Код скопирован" });
  };

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isExhausted = (promo: PromoCode) => {
    if (!promo.maxUses) return false;
    return (promo.currentUses || 0) >= promo.maxUses;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Промокоды</h1>
          <p className="text-muted-foreground">Управление скидочными промокодами</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-promo">
              <Plus className="h-4 w-4 mr-2" />
              Добавить промокод
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? "Редактировать промокод" : "Новый промокод"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Код</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PROMO2024"
                    data-testid="input-promo-code"
                  />
                  <Button type="button" variant="outline" onClick={generateCode} data-testid="button-generate-code">
                    Сгенерировать
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Новогодняя скидка"
                  data-testid="input-promo-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип скидки</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value) => setFormData({ ...formData, discountType: value as "percent" | "fixed" })}
                  >
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Процент (%)</SelectItem>
                      <SelectItem value="fixed">Фиксированная (руб)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Размер скидки</Label>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={formData.discountType === "percent" ? 100 : undefined}
                    data-testid="input-discount-value"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Макс. использований</Label>
                  <Input
                    type="number"
                    value={formData.maxUses ?? ""}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Без ограничений"
                    min={1}
                    data-testid="input-max-uses"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Мин. сумма заказа</Label>
                  <Input
                    type="number"
                    value={formData.minOrderAmount ?? ""}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Без ограничений"
                    min={0}
                    data-testid="input-min-order"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Срок действия до</Label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  data-testid="input-expires-at"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Активен</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-is-active"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.code}
                className="w-full"
                data-testid="button-save-promo"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingPromo ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !promoCodes?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Промокодов пока нет. Создайте первый промокод.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promoCodes.map((promo) => (
            <Card key={promo.id} data-testid={`promo-card-${promo.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-lg font-mono font-bold bg-muted px-2 py-1 rounded">
                        {promo.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(promo.code)}
                        data-testid={`button-copy-${promo.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!promo.isActive && (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                      {isExpired(promo.expiresAt) && (
                        <Badge variant="destructive">Истек</Badge>
                      )}
                      {isExhausted(promo) && (
                        <Badge variant="destructive">Исчерпан</Badge>
                      )}
                    </div>

                    {promo.description && (
                      <p className="text-sm text-muted-foreground">{promo.description}</p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <div className="flex items-center gap-1">
                        {promo.discountType === "percent" ? (
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">
                          {promo.discountType === "percent"
                            ? `${promo.discountValue}%`
                            : `${promo.discountValue} руб.`}
                        </span>
                      </div>

                      {promo.maxUses && (
                        <div className="flex items-center gap-1">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>{promo.currentUses || 0} / {promo.maxUses}</span>
                        </div>
                      )}

                      {promo.expiresAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(promo.expiresAt).toLocaleDateString("ru-RU")}</span>
                        </div>
                      )}

                      {promo.minOrderAmount && (
                        <span className="text-muted-foreground">
                          от {promo.minOrderAmount} руб.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(promo)}
                      data-testid={`button-edit-${promo.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(promo.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${promo.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
