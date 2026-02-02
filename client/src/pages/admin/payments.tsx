import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import type { Order } from "@shared/schema";

export default function AdminPayments() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Оплачен
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Выполнен
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Ожидание
          </Badge>
        );
    }
  };

  const totalRevenue =
    orders?.filter((o) => o.status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Платежи</h1>
          <p className="text-muted-foreground">История заказов и платежей</p>
        </div>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Общая выручка</p>
              <p className="font-semibold">{totalRevenue.toLocaleString("ru-RU")} ₽</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !orders?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Заказов пока нет
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сайт</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders
                  .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                  })
                  .map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {order.orderType === "express" ? "Экспресс" : "Пакет"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {order.siteUrl}
                      </TableCell>
                      <TableCell>{order.email}</TableCell>
                      <TableCell className="font-medium">
                        {(order.amount || 0).toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
