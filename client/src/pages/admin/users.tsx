import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Crown,
  User as UserIcon,
  Search,
  Mail,
  Wallet,
  Globe,
  Calendar,
  Info,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    role: "user",
  });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = currentUser?.role === "superadmin";

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      return apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setNewUser({ username: "", password: "", email: "", role: "user" });
      setShowPassword(false);
      toast({ title: "Пользователь создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания пользователя", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedUser(null);
      toast({ title: "Пользователь удален" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Роль обновлена" });
    },
    onError: () => {
      toast({ title: "Ошибка обновления роли", variant: "destructive" });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password) return;
    createMutation.mutate(newUser);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Badge className="gap-1"><Crown className="h-3 w-3" />Супер-админ</Badge>;
      case "admin":
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Админ</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><UserIcon className="h-3 w-3" />Пользователь</Badge>;
    }
  };

  const stats = useMemo(() => {
    if (!users) return { total: 0, admins: 0, users: 0 };
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
      users: users.filter((u) => u.role === "user" || !u.role).length,
    };
  }, [users]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="heading-admin-users">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Управление пользователями системы</p>
        </div>
        {isSuperAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" data-testid="button-add-user">
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Новый пользователь</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    data-testid="input-new-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Пароль</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Роль</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Пользователь</SelectItem>
                      <SelectItem value="admin">Админ сайта</SelectItem>
                      <SelectItem value="superadmin">Супер-админ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateUser}
                  disabled={createMutation.isPending}
                  data-testid="button-create-user"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Создать"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Всего</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-total-users">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Админы</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-total-admins">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <UserIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Пользователи</p>
                <p className="text-lg md:text-xl font-bold" data-testid="text-total-regular-users">{stats.users}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по логину или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-role-filter">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="user">Пользователи</SelectItem>
            <SelectItem value="admin">Админы</SelectItem>
            <SelectItem value="superadmin">Супер-админы</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !filteredUsers.length ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Пользователей не найдено</p>
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
                      <TableHead>Логин</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Баланс</TableHead>
                      <TableHead>Реф. код</TableHead>
                      <TableHead>Дата рег.</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Действия</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell className="text-sm">{user.email || "-"}</TableCell>
                        <TableCell>
                          {isSuperAdmin && user.id !== currentUser?.id ? (
                            <Select
                              value={user.role || "user"}
                              onValueChange={(value) => updateRoleMutation.mutate({ id: user.id, role: value })}
                            >
                              <SelectTrigger className="w-36" data-testid={`select-role-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Пользователь</SelectItem>
                                <SelectItem value="admin">Админ</SelectItem>
                                <SelectItem value="superadmin">Супер-админ</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getRoleBadge(user.role || "user")
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.bonusBalance || 0} ₽</span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.referralCode || "-"}</code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ru-RU") : "-"}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedUser(user)}
                                data-testid={`button-view-user-${user.id}`}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              {user.id !== currentUser?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMutation.mutate(user.id)}
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="lg:hidden space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email || "Нет email"}</p>
                    </div>
                    {getRoleBadge(user.role || "user")}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                      <span>{user.bonusBalance || 0} ₽</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ru-RU") : "-"}</span>
                    </div>
                  </div>

                  {user.referralCode && (
                    <div className="mb-3">
                      <code className="text-xs bg-muted px-2 py-1 rounded block text-center">
                        Реф. код: {user.referralCode}
                      </code>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedUser(user)}
                        data-testid={`button-view-user-mobile-${user.id}`}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        Подробнее
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(user.id)}
                          data-testid={`button-delete-user-mobile-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedUser.email || "Не указан"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Роль</p>
                  {getRoleBadge(selectedUser.role || "user")}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Бонусный баланс</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {selectedUser.bonusBalance || 0} ₽
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Телефон</p>
                  <p className="text-sm font-medium">{selectedUser.phone || "Не указан"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Реферальный код</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedUser.referralCode || "-"}</code>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Дата регистрации</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString("ru-RU") : "-"}
                  </p>
                </div>
              </div>

              {isSuperAdmin && selectedUser.id !== currentUser?.id && (
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Изменить роль</Label>
                    <Select
                      value={selectedUser.role || "user"}
                      onValueChange={(value) => {
                        updateRoleMutation.mutate({ id: selectedUser.id, role: value });
                        setSelectedUser({ ...selectedUser, role: value });
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-role-dialog">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Пользователь</SelectItem>
                        <SelectItem value="admin">Админ</SelectItem>
                        <SelectItem value="superadmin">Супер-админ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => deleteMutation.mutate(selectedUser.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-user-dialog"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить пользователя
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
