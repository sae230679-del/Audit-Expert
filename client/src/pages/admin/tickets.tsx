import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket as TicketIcon,
  Loader2,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Ticket, TicketMessage } from "@shared/schema";

interface TicketWithMessages extends Ticket {
  messages?: TicketMessage[];
}

export default function AdminTickets() {
  const { toast } = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/admin/tickets"],
  });

  const { data: ticketDetails, isLoading: isLoadingDetails } = useQuery<TicketWithMessages>({
    queryKey: ["/api/admin/tickets", selectedTicketId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/tickets/${selectedTicketId}`);
      if (!response.ok) throw new Error("Failed to fetch ticket");
      return response.json();
    },
    enabled: !!selectedTicketId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return apiRequest("POST", `/api/admin/tickets/${id}/reply`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets", selectedTicketId] });
      setReply("");
      toast({ title: "Ответ отправлен" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Открыт</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />В работе</Badge>;
      case "resolved":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Решён</Badge>;
      case "closed":
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Закрыт</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
      case "urgent":
        return <Badge variant="destructive">Высокий</Badge>;
      case "normal":
        return <Badge className="bg-yellow-500">Средний</Badge>;
      case "low":
        return <Badge variant="outline">Низкий</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "general": return "Общее";
      case "audit": return "Аудит";
      case "payment": return "Оплата";
      case "technical": return "Техническое";
      case "complaint": return "Жалоба";
      default: return type;
    }
  };

  const filteredTickets = tickets?.filter(t => 
    statusFilter === "all" || t.status === statusFilter
  ) || [];

  const closeDialog = () => {
    setSelectedTicketId(null);
    setReply("");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="heading-admin-tickets">Обращения</h1>
          <p className="text-sm text-muted-foreground">Управление тикетами поддержки</p>
        </div>
        <div className="w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-ticket-filter">
              <SelectValue placeholder="Фильтр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="open">Открытые</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="resolved">Решённые</SelectItem>
              <SelectItem value="closed">Закрытые</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !filteredTickets.length ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Обращений не найдено</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Тема</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Приоритет</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono text-sm">#{ticket.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(ticket.type || "general")}</Badge>
                        </TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority || "normal")}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status || "open")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("ru-RU") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            data-testid={`button-view-ticket-${ticket.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Открыть
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        #{ticket.id.slice(0, 8)} | {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("ru-RU") : "-"}
                      </p>
                    </div>
                    {getStatusBadge(ticket.status || "open")}
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline">{getTypeLabel(ticket.type || "general")}</Badge>
                    {getPriorityBadge(ticket.priority || "normal")}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    data-testid={`button-view-ticket-mobile-${ticket.id}`}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Открыть
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!selectedTicketId} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TicketIcon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Обращение #{selectedTicketId?.slice(0, 8)}</span>
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : ticketDetails && (
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Статус</p>
                  <Select
                    value={ticketDetails.status || "open"}
                    onValueChange={(value) => updateStatusMutation.mutate({ id: ticketDetails.id, status: value })}
                  >
                    <SelectTrigger data-testid="select-update-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Открыт</SelectItem>
                      <SelectItem value="in_progress">В работе</SelectItem>
                      <SelectItem value="resolved">Решён</SelectItem>
                      <SelectItem value="closed">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Приоритет / Тип</p>
                  <div className="min-h-9 flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(ticketDetails.priority || "normal")}
                    <Badge variant="outline">{getTypeLabel(ticketDetails.type || "general")}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Тема</p>
                <p className="font-medium">{ticketDetails.subject}</p>
              </div>

              <div className="flex-1 min-h-0">
                <p className="text-muted-foreground text-sm mb-2">Переписка</p>
                <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                  {ticketDetails.messages && ticketDetails.messages.length > 0 ? (
                    <div className="space-y-3">
                      {ticketDetails.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-md ${
                            msg.senderRole === "user"
                              ? "bg-background border"
                              : "bg-primary/10 border border-primary/20"
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                            {msg.senderRole === "user" ? (
                              <User className="h-3 w-3" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                            <span>{msg.senderRole === "user" ? "Пользователь" : "Администратор"}</span>
                            <span>|</span>
                            <span>
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleString("ru-RU") : "-"}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Сообщений пока нет
                    </p>
                  )}
                </ScrollArea>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Ответить</p>
                <Textarea
                  placeholder="Введите ответ..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  data-testid="textarea-reply"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => replyMutation.mutate({ id: ticketDetails.id, message: reply })}
                    disabled={!reply.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Отправить
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
