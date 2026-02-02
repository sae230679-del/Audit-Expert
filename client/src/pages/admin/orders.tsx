import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ShoppingCart,
  Loader2,
  Search,
  Eye,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  MoreVertical,
  Trash2,
  Mail,
  MailX,
  ShieldCheck,
  ShieldX,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Order, UserSite } from "@shared/schema";

interface OrderWithSite extends Order {
  site?: UserSite | null;
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithSite | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [siteToDelete, setSiteToDelete] = useState<{ url: string; orderId: string } | null>(null);
  const [contactsDialog, setContactsDialog] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: orders, isLoading } = useQuery<OrderWithSite[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: sites } = useQuery<UserSite[]>({
    queryKey: ["/api/admin/sites"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ siteId, data }: { siteId: string; data: { isVerified?: boolean; mailingEnabled?: boolean } }) => {
      return apiRequest("PATCH", `/api/admin/sites/${siteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Настройки сайта обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить настройки", variant: "destructive" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      return apiRequest("DELETE", `/api/admin/sites/${siteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Сайт удалён" });
      setSiteToDelete(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить сайт", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest("POST", "/api/admin/orders/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: `Удалено ${ids.length} заказов` });
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить заказы", variant: "destructive" });
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const findSiteByUrl = (url: string): UserSite | undefined => {
    if (!sites) return undefined;
    const normalizedUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return sites.find((s) => {
      const siteUrl = s.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return siteUrl === normalizedUrl || s.url === url;
    });
  };

  const toggleMailing = (site: UserSite) => {
    updateSiteMutation.mutate({
      siteId: site.id,
      data: { mailingEnabled: !site.mailingEnabled },
    });
  };

  const toggleVerified = (site: UserSite) => {
    updateSiteMutation.mutate({
      siteId: site.id,
      data: { isVerified: !site.isVerified },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Ожидание</Badge>;
      case "paid":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Оплачен</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />В работе</Badge>;
      case "completed":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Выполнен</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Отменён</Badge>;
      case "refunded":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Возврат</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderTypeBadge = (type: string) => {
    switch (type) {
      case "express":
        return <Badge variant="secondary">Экспресс</Badge>;
      case "package":
        return <Badge variant="outline">Пакет</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        order.siteUrl?.toLowerCase().includes(searchLower) ||
        order.email?.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower) ||
        order.customerName?.toLowerCase().includes(searchLower) ||
        order.customerPhone?.includes(searchQuery) ||
        order.customerCompany?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  }, [filteredOrders, selectedIds.size]);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, completed: 0, revenue: 0 };
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed" || o.status === "paid").length,
      revenue: orders
        .filter((o) => o.status === "completed" || o.status === "paid")
        .reduce((sum, o) => sum + (o.amount || 0), 0),
    };
  }, [orders]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="heading-admin-orders">Платежи</h1>
          <p className="text-sm text-muted-foreground">История заказов и платежей</p>
        </div>
        <Card className="sm:min-w-[140px]">
          <CardContent className="p-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Общая выручка</p>
              <p className="font-bold text-green-600" data-testid="text-total-revenue">{stats.revenue.toLocaleString()} ₽</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО, телефону, сайту, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">Ожидание</SelectItem>
            <SelectItem value="paid">Оплачен</SelectItem>
            <SelectItem value="processing">В работе</SelectItem>
            <SelectItem value="completed">Выполнен</SelectItem>
            <SelectItem value="cancelled">Отменён</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setShowBulkDeleteDialog(true)}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить ({selectedIds.size})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !filteredOrders.length ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Заказов не найдено</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Сайт</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const site = findSiteByUrl(order.siteUrl);
                      return (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(order.id)}
                              onCheckedChange={() => toggleSelect(order.id)}
                              data-testid={`checkbox-order-${order.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "-"}
                          </TableCell>
                          <TableCell>{getOrderTypeBadge(order.orderType)}</TableCell>
                          <TableCell>
                            <div className="max-w-[150px]">
                              <p className="text-sm font-medium truncate">{order.customerName || "-"}</p>
                              <p className="text-xs text-muted-foreground truncate">{order.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={order.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                            >
                              {order.siteUrl.replace(/^https?:\/\//, "")}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell className="font-semibold">{(order.amount || 0).toLocaleString()} ₽</TableCell>
                          <TableCell>{getStatusBadge(order.status || "pending")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedOrder({ ...order, site })}
                                data-testid={`button-view-order-${order.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-more-${order.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setContactsDialog(order)}>
                                    <User className="h-4 w-4 mr-2" />
                                    Просмотр контактов
                                  </DropdownMenuItem>
                                  {site && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => toggleVerified(site)}>
                                        {site.isVerified ? (
                                          <><ShieldX className="h-4 w-4 mr-2" />Снять проверку</>
                                        ) : (
                                          <><ShieldCheck className="h-4 w-4 mr-2" />Отметить проверенным</>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => toggleMailing(site)}>
                                        {site.mailingEnabled ? (
                                          <><MailX className="h-4 w-4 mr-2" />Убрать из рассылки</>
                                        ) : (
                                          <><Mail className="h-4 w-4 mr-2" />Добавить в рассылку</>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setSiteToDelete({ url: order.siteUrl, orderId: site.id })}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Удалить сайт
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => {
              const site = findSiteByUrl(order.siteUrl);
              return (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                        data-testid={`checkbox-order-mobile-${order.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <a
                              href={order.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-sm truncate block"
                            >
                              {order.siteUrl.replace(/^https?:\/\//, "")}
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : "-"}
                            </p>
                          </div>
                          {getStatusBadge(order.status || "pending")}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex items-center gap-1.5">
                        {getOrderTypeBadge(order.orderType)}
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        {(order.amount || 0).toLocaleString()} ₽
                      </div>
                      <div className="col-span-2 text-muted-foreground text-xs truncate">
                        {order.email}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedOrder({ ...order, site })}
                        data-testid={`button-view-order-mobile-${order.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Подробнее
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setContactsDialog(order)}>
                            <User className="h-4 w-4 mr-2" />
                            Контакты
                          </DropdownMenuItem>
                          {site && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleMailing(site)}>
                                {site.mailingEnabled ? (
                                  <><MailX className="h-4 w-4 mr-2" />Из рассылки</>
                                ) : (
                                  <><Mail className="h-4 w-4 mr-2" />В рассылку</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setSiteToDelete({ url: order.siteUrl, orderId: site.id })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить сайт
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Заказ #{selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Статус</p>
                  <Select
                    value={selectedOrder.status || "pending"}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({ id: selectedOrder.id, status: value });
                      setSelectedOrder({ ...selectedOrder, status: value });
                    }}
                  >
                    <SelectTrigger data-testid="select-order-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Ожидает</SelectItem>
                      <SelectItem value="paid">Оплачен</SelectItem>
                      <SelectItem value="processing">В работе</SelectItem>
                      <SelectItem value="completed">Выполнен</SelectItem>
                      <SelectItem value="cancelled">Отменён</SelectItem>
                      <SelectItem value="refunded">Возврат</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Сумма</p>
                  <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {(selectedOrder.amount || 0).toLocaleString()} ₽
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Сайт</p>
                  <a
                    href={selectedOrder.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-1 text-sm"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {selectedOrder.siteUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Клиент</p>
                  <p className="text-sm font-medium">{selectedOrder.customerName || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedOrder.email}
                  </p>
                </div>
                {selectedOrder.customerPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Телефон</p>
                    <p className="text-sm font-medium">{selectedOrder.customerPhone}</p>
                  </div>
                )}
                {selectedOrder.customerCompany && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Компания</p>
                    <p className="text-sm font-medium">{selectedOrder.customerCompany}</p>
                  </div>
                )}
                {selectedOrder.customerInn && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ИНН</p>
                    <p className="text-sm font-medium">{selectedOrder.customerInn}</p>
                  </div>
                )}
                {(selectedOrder.customerWhatsapp || selectedOrder.customerTelegram) && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Мессенджеры</p>
                    <div className="flex gap-3 text-sm">
                      {selectedOrder.customerWhatsapp && (
                        <a href={`https://wa.me/${selectedOrder.customerWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                          WhatsApp: {selectedOrder.customerWhatsapp}
                        </a>
                      )}
                      {selectedOrder.customerTelegram && (
                        <a href={`https://t.me/${selectedOrder.customerTelegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          Telegram: {selectedOrder.customerTelegram}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Тип</p>
                  {getOrderTypeBadge(selectedOrder.orderType)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Дата</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString("ru-RU") : "-"}
                  </p>
                </div>
              </div>

              {selectedOrder.auditResults !== null && selectedOrder.auditResults !== undefined && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Результаты экспресс-проверки
                  </p>
                  {selectedOrder.totalScore !== null && selectedOrder.totalScore !== undefined && (
                    <div className="mb-2">
                      <Badge variant={(selectedOrder.totalScore || 0) >= 70 ? "default" : (selectedOrder.totalScore || 0) >= 40 ? "secondary" : "destructive"}>
                        Оценка: {selectedOrder.totalScore}%
                      </Badge>
                    </div>
                  )}
                  <div className="text-xs space-y-1 max-h-40 overflow-y-auto bg-muted/50 p-2 rounded">
                    {Array.isArray(selectedOrder.auditResults) ? (
                      (selectedOrder.auditResults as Array<{passed?: boolean; criterionName?: string; criterion?: string}>).map((result, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                          )}
                          <span className={result.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                            {result.criterionName || result.criterion || `Критерий ${idx + 1}`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Данные аудита в нестандартном формате</p>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.site && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Управление сайтом</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="order-verified-switch"
                        checked={!!selectedOrder.site.isVerified}
                        onCheckedChange={() => toggleVerified(selectedOrder.site!)}
                        disabled={updateSiteMutation.isPending}
                      />
                      <Label htmlFor="order-verified-switch" className="text-sm">
                        {selectedOrder.site.isVerified ? (
                          <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="h-4 w-4" />Проверен</span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground"><ShieldX className="h-4 w-4" />Не проверен</span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="order-mailing-switch"
                        checked={!!selectedOrder.site.mailingEnabled}
                        onCheckedChange={() => toggleMailing(selectedOrder.site!)}
                        disabled={updateSiteMutation.isPending}
                      />
                      <Label htmlFor="order-mailing-switch" className="text-sm">
                        {selectedOrder.site.mailingEnabled ? (
                          <span className="flex items-center gap-1 text-blue-600"><Mail className="h-4 w-4" />В рассылке</span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground"><MailX className="h-4 w-4" />Не в рассылке</span>
                        )}
                      </Label>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSiteToDelete({ url: selectedOrder.siteUrl, orderId: selectedOrder.site!.id })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить сайт
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!contactsDialog} onOpenChange={() => setContactsDialog(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Контактные данные
            </DialogTitle>
          </DialogHeader>
          {contactsDialog && (
            <div className="space-y-4">
              {contactsDialog.customerName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ФИО</p>
                  <p className="font-medium">{contactsDialog.customerName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contactsDialog.email}`} className="text-blue-500 hover:underline">
                    {contactsDialog.email}
                  </a>
                </p>
              </div>
              {contactsDialog.customerPhone && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Телефон</p>
                  <p className="font-medium">
                    <a href={`tel:${contactsDialog.customerPhone}`} className="text-blue-500 hover:underline">
                      {contactsDialog.customerPhone}
                    </a>
                  </p>
                </div>
              )}
              {contactsDialog.customerWhatsapp && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                  <p className="font-medium">
                    <a href={`https://wa.me/${contactsDialog.customerWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                      {contactsDialog.customerWhatsapp}
                    </a>
                  </p>
                </div>
              )}
              {contactsDialog.customerTelegram && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telegram</p>
                  <p className="font-medium">
                    <a href={`https://t.me/${contactsDialog.customerTelegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {contactsDialog.customerTelegram}
                    </a>
                  </p>
                </div>
              )}
              {contactsDialog.customerCompany && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Компания</p>
                  <p className="font-medium">{contactsDialog.customerCompany}</p>
                </div>
              )}
              {contactsDialog.customerInn && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ИНН</p>
                  <p className="font-medium">{contactsDialog.customerInn}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Сайт</p>
                <p className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={contactsDialog.siteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {contactsDialog.siteUrl}
                  </a>
                </p>
              </div>
              {contactsDialog.userId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID пользователя</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{contactsDialog.userId}</code>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Дата заказа</p>
                <p className="text-sm">
                  {contactsDialog.createdAt ? new Date(contactsDialog.createdAt).toLocaleString("ru-RU") : "-"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!siteToDelete} onOpenChange={() => setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сайт?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сайт <strong>{siteToDelete?.url}</strong>?
              Это действие нельзя отменить. Все аудиты и данные по этому сайту будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => siteToDelete && deleteSiteMutation.mutate(siteToDelete.orderId)}
              disabled={deleteSiteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteSiteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранные заказы?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить <strong>{selectedIds.size}</strong> заказов?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Удалить {selectedIds.size} заказов
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
