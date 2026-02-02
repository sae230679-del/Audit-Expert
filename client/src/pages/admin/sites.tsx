import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Globe,
  Loader2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Trash2,
  Mail,
  MailX,
  ShieldCheck,
  ShieldX,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { UserSite, SiteAudit } from "@shared/schema";

interface AdminSite extends UserSite {
  userEmail?: string;
}

export default function AdminSites() {
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<AdminSite | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [siteToDelete, setSiteToDelete] = useState<AdminSite | null>(null);

  const { data: sites, isLoading } = useQuery<AdminSite[]>({
    queryKey: ["/api/admin/sites"],
  });

  const { data: audits } = useQuery<SiteAudit[]>({
    queryKey: ["/api/admin/audits"],
  });

  const runAuditMutation = useMutation({
    mutationFn: async (siteId: string) => {
      return apiRequest("POST", `/api/admin/sites/${siteId}/audit`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audits"] });
      toast({ title: "Аудит запущен" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ siteId, data }: { siteId: string; data: Partial<AdminSite> }) => {
      return apiRequest("PATCH", `/api/admin/sites/${siteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sites"] });
      toast({ title: "Сайт обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления", variant: "destructive" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      return apiRequest("DELETE", `/api/admin/sites/${siteId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sites"] });
      toast({ title: "Сайт удалён" });
      setSiteToDelete(null);
      setSelectedSite(null);
    },
    onError: () => {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    },
  });

  const toggleVerified = (site: AdminSite) => {
    updateSiteMutation.mutate({
      siteId: site.id,
      data: { isVerified: !site.isVerified },
    });
  };

  const toggleMailing = (site: AdminSite) => {
    updateSiteMutation.mutate({
      siteId: site.id,
      data: { mailingEnabled: !site.mailingEnabled },
    });
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Соответствует</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Замечания</Badge>;
      case "critical":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Критично</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Не проверен</Badge>;
    }
  };

  const getSiteLatestAudit = (siteId: string) => {
    return audits?.filter(a => a.siteId === siteId).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
  };

  const getOverallStatus = (latestAudit: SiteAudit | undefined) => {
    if (!latestAudit) return null;
    if (latestAudit.law149Status === "critical" || latestAudit.law152Status === "critical") return "critical";
    if (latestAudit.law149Status === "warning" || latestAudit.law152Status === "warning") return "warning";
    if (latestAudit.law149Status === "ok" && latestAudit.law152Status === "ok") return "ok";
    return null;
  };

  const filteredSites = sites?.filter(site => {
    const matchesSearch = !searchQuery || 
      site.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    
    const latestAudit = getSiteLatestAudit(site.id);
    const overallStatus = getOverallStatus(latestAudit) || "pending";
    
    return matchesSearch && overallStatus === statusFilter;
  }) || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="heading-admin-sites">Сайты</h1>
          <p className="text-sm text-muted-foreground">Управление сайтами и аудитами</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <Input
          placeholder="Поиск по URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-xs"
          data-testid="input-search-sites"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-site-filter">
            <SelectValue placeholder="Фильтр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="ok">Соответствует</SelectItem>
            <SelectItem value="warning">Есть замечания</SelectItem>
            <SelectItem value="critical">Критические</SelectItem>
            <SelectItem value="pending">Не проверены</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !filteredSites.length ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Сайтов не найдено</p>
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
                      <TableHead>Сайт</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead className="text-center">Балл</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-center">Проверен</TableHead>
                      <TableHead className="text-center">Рассылка</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSites.map((site) => {
                      const latestAudit = getSiteLatestAudit(site.id);
                      return (
                        <TableRow key={site.id} data-testid={`row-site-${site.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{site.displayName || site.url}</p>
                                <a 
                                  href={site.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                                  data-testid={`link-site-external-${site.id}`}
                                >
                                  <span className="truncate max-w-[150px]">{site.url}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {site.userEmail || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${getScoreColor(latestAudit?.overallScore)}`}>
                              {latestAudit?.overallScore ?? "-"}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(getOverallStatus(latestAudit))}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={!!site.isVerified}
                              onCheckedChange={() => toggleVerified(site)}
                              disabled={updateSiteMutation.isPending}
                              data-testid={`switch-verified-${site.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={!!site.mailingEnabled}
                              onCheckedChange={() => toggleMailing(site)}
                              disabled={updateSiteMutation.isPending}
                              data-testid={`switch-mailing-${site.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedSite(site)}
                                data-testid={`button-view-site-${site.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => runAuditMutation.mutate(site.id)}
                                disabled={runAuditMutation.isPending}
                                data-testid={`button-audit-site-${site.id}`}
                              >
                                <RefreshCw className={`h-4 w-4 ${runAuditMutation.isPending ? "animate-spin" : ""}`} />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-more-${site.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
                                    onClick={() => setSiteToDelete(site)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить сайт
                                  </DropdownMenuItem>
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
            {filteredSites.map((site) => {
              const latestAudit = getSiteLatestAudit(site.id);
              return (
                <Card key={site.id} data-testid={`card-site-${site.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="font-medium truncate">{site.displayName || site.url}</p>
                        </div>
                        <a 
                          href={site.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mt-1"
                        >
                          <span className="truncate">{site.url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                      {getStatusBadge(getOverallStatus(latestAudit))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">Общий</p>
                        <p className={`font-bold ${getScoreColor(latestAudit?.overallScore)}`}>
                          {latestAudit?.overallScore ?? "-"}%
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">149-ФЗ</p>
                        <p className={`font-bold ${getScoreColor(latestAudit?.law149Score)}`}>
                          {latestAudit?.law149Score ?? "-"}%
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">152-ФЗ</p>
                        <p className={`font-bold ${getScoreColor(latestAudit?.law152Score)}`}>
                          {latestAudit?.law152Score ?? "-"}%
                        </p>
                      </div>
                    </div>

                    {site.userEmail && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Владелец: {site.userEmail}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedSite(site)}
                        data-testid={`button-view-site-mobile-${site.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Подробнее
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runAuditMutation.mutate(site.id)}
                        disabled={runAuditMutation.isPending}
                        data-testid={`button-audit-site-mobile-${site.id}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${runAuditMutation.isPending ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={!!selectedSite} onOpenChange={() => setSelectedSite(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{selectedSite?.displayName || selectedSite?.url}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSite && (
            <div className="space-y-4">
              {(() => {
                const latestAudit = getSiteLatestAudit(selectedSite.id);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <Card>
                        <CardContent className="p-3 sm:pt-4">
                          <p className="text-xs sm:text-sm text-muted-foreground">149-ФЗ</p>
                          <p className={`text-xl sm:text-2xl font-bold ${getScoreColor(latestAudit?.law149Score)}`}>
                            {latestAudit?.law149Score ?? "-"}%
                          </p>
                          <Progress value={latestAudit?.law149Score ?? 0} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 sm:pt-4">
                          <p className="text-xs sm:text-sm text-muted-foreground">152-ФЗ</p>
                          <p className={`text-xl sm:text-2xl font-bold ${getScoreColor(latestAudit?.law152Score)}`}>
                            {latestAudit?.law152Score ?? "-"}%
                          </p>
                          <Progress value={latestAudit?.law152Score ?? 0} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Владелец</p>
                        <p className="font-medium">{selectedSite.userEmail || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Последняя проверка</p>
                        <p className="font-medium">
                          {latestAudit?.createdAt 
                            ? new Date(latestAudit.createdAt).toLocaleDateString("ru-RU")
                            : "Не проводилась"
                          }
                        </p>
                      </div>
                    </div>

                    {latestAudit?.summary && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Сводка</p>
                        <p className="text-sm bg-muted p-3 rounded-md">{latestAudit.summary}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 py-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="verified-switch"
                          checked={!!selectedSite.isVerified}
                          onCheckedChange={() => toggleVerified(selectedSite)}
                          disabled={updateSiteMutation.isPending}
                        />
                        <Label htmlFor="verified-switch" className="text-sm">
                          {selectedSite.isVerified ? (
                            <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="h-4 w-4" />Проверен</span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground"><ShieldX className="h-4 w-4" />Не проверен</span>
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="mailing-switch"
                          checked={!!selectedSite.mailingEnabled}
                          onCheckedChange={() => toggleMailing(selectedSite)}
                          disabled={updateSiteMutation.isPending}
                        />
                        <Label htmlFor="mailing-switch" className="text-sm">
                          {selectedSite.mailingEnabled ? (
                            <span className="flex items-center gap-1 text-blue-600"><Mail className="h-4 w-4" />В рассылке</span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground"><MailX className="h-4 w-4" />Не в рассылке</span>
                          )}
                        </Label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={() => setSiteToDelete(selectedSite)}
                        data-testid="button-delete-site-dialog"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить сайт
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => runAuditMutation.mutate(selectedSite.id)}
                        disabled={runAuditMutation.isPending}
                        data-testid="button-run-audit-dialog"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${runAuditMutation.isPending ? "animate-spin" : ""}`} />
                        Запустить аудит
                      </Button>
                    </div>
                  </>
                );
              })()}
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
              onClick={() => siteToDelete && deleteSiteMutation.mutate(siteToDelete.id)}
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
    </div>
  );
}
