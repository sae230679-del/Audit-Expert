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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Trash2, Eye, AlertTriangle, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ContactMessage } from "@shared/schema";

export default function AdminMessages() {
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/messages/${id}`, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
    },
  });

  const markSpamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/messages/${id}`, { isSpam: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "Отмечено как спам" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/messages/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "Сообщение удалено" });
    },
  });

  const handleView = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markReadMutation.mutate(message.id);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = messages?.filter((m) => !m.isRead && !m.isSpam).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Сообщения</h1>
          <p className="text-muted-foreground">
            Обратная связь с сайта
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} новых
              </Badge>
            )}
          </p>
        </div>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сообщение</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Имя</Label>
                  <p className="font-medium">{selectedMessage.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Дата</Label>
                  <p className="font-medium">{formatDate(selectedMessage.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedMessage.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Телефон</Label>
                  <p className="font-medium">{selectedMessage.phone || "-"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Сообщение</Label>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `mailto:${selectedMessage.email}`;
                  }}
                  data-testid="button-reply"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Ответить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    markSpamMutation.mutate(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  data-testid="button-mark-spam"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Спам
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  data-testid="button-delete-message"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !messages?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Сообщений пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages
            .filter((m) => !m.isSpam)
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            })
            .map((message) => (
              <Card
                key={message.id}
                className={`hover-elevate cursor-pointer ${!message.isRead ? "border-primary/50" : ""}`}
                onClick={() => handleView(message)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${!message.isRead ? "text-primary" : ""}`}>
                          {message.name}
                        </span>
                        {!message.isRead && (
                          <Badge variant="default" className="text-xs">Новое</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.email}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {message.message}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDate(message.createdAt)}
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
