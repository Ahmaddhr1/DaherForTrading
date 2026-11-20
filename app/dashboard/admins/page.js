"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Trash2,
  Crown,
  UserRound,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton-patterns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMPTY_CREATE_FORM = { adminname: "", email: "", password: "", role: "employee" };

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [resetTarget, setResetTarget] = useState(null); // { _id, adminname } | null
  const [resetPassword, setResetPassword] = useState("");
  const [emailTarget, setEmailTarget] = useState(null); // { _id, adminname, email } | null
  const [emailValue, setEmailValue] = useState("");

  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => (await axios.get("/api/admin")).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] });

  const createMutation = useMutation({
    mutationFn: async (payload) => (await axios.post("/api/admin/create", payload)).data,
    onSuccess: () => {
      toast.success("Admin created successfully");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Failed to create admin"),
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await axios.patch(`/api/admin/${id}`, payload)).data,
    onSuccess: (data) => {
      toast.success(data.message || "Admin updated");
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update admin"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await axios.delete(`/api/admin/${id}`)).data,
    onSuccess: () => {
      toast.success("Admin deleted");
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete admin"),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.adminname.trim() || !createForm.password) {
      toast.error("Username and password are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      toast.error("A valid email is required - it's where their login code gets sent");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleEditEmail = (e) => {
    e.preventDefault();
    if (emailValue.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      toast.error("Enter a valid email, or leave it blank to turn off the login code");
      return;
    }
    patchMutation.mutate(
      { id: emailTarget._id, email: emailValue.trim() },
      { onSuccess: () => setEmailTarget(null) }
    );
  };

  const handleToggleRole = (admin) => {
    const nextRole = admin.role === "owner" ? "employee" : "owner";
    if (
      !window.confirm(
        `Change ${admin.adminname}'s role to "${nextRole}"? This takes effect the next time they log in.`
      )
    )
      return;
    patchMutation.mutate({ id: admin._id, role: nextRole });
  };

  const handleToggleActive = (admin) => {
    const nextActive = !admin.active;
    if (
      !nextActive &&
      !window.confirm(
        `Deactivate ${admin.adminname}? They won't be able to log in anymore (an existing session stays valid until it expires).`
      )
    )
      return;
    patchMutation.mutate({ id: admin._id, active: nextActive });
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (admin) => {
    setDeleteTarget(admin);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    patchMutation.mutate(
      { id: resetTarget._id, newPassword: resetPassword },
      {
        onSuccess: () => {
          setResetTarget(null);
          setResetPassword("");
        },
      }
    );
  };

  const admins = data?.admins || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">Admins</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate">
                Manage who can log in and what they can do
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Admin</span>
          </Button>
        </div>

        {isLoading && <TableSkeleton rows={4} />}

        {error && !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center text-red-600">
              Failed to load admins.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email / Login Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const isSelf = admin._id === me?.id;
                    return (
                      <TableRow key={admin._id}>
                        <TableCell className="font-medium">
                          {admin.adminname}
                          {isSelf && <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">(you)</span>}
                        </TableCell>
                        <TableCell>
                          {admin.email ? (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{admin.email}</span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500 italic">No code (direct login)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {admin.role === "owner" ? (
                              <Crown className="h-3 w-3 text-amber-600" />
                            ) : (
                              <UserRound className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            )}
                            {admin.role === "owner" ? "Owner" : "Employee"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              admin.active
                                ? "text-green-700 border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20"
                                : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950"
                            }
                          >
                            {admin.active ? "Active" : "Deactivated"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleRole(admin)}>
                                  {admin.role === "owner" ? (
                                    <>
                                      <UserRound className="h-4 w-4" /> Make Employee
                                    </>
                                  ) : (
                                    <>
                                      <Crown className="h-4 w-4" /> Make Owner
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setResetTarget(admin);
                                    setResetPassword("");
                                  }}
                                >
                                  <KeyRound className="h-4 w-4" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEmailTarget(admin);
                                    setEmailValue(admin.email || "");
                                  }}
                                >
                                  <Mail className="h-4 w-4" /> Edit Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(admin)}>
                                  {admin.active ? (
                                    <>
                                      <ShieldOff className="h-4 w-4" /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-4 w-4" /> Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDelete(admin)}
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Admin */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Admin"
        description="Create a new login for this dashboard"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-adminname">Username</Label>
            <Input
              id="new-adminname"
              value={createForm.adminname}
              onChange={(e) => setCreateForm((f) => ({ ...f, adminname: e.target.value }))}
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">A login code is sent here every time they sign in</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">At least 8 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">Role</Label>
            <select
              id="new-role"
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="employee">Employee - day-to-day access only</option>
              <option value="owner">Owner - full access</option>
            </select>
          </div>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Creating...
              </span>
            ) : (
              "Create Admin"
            )}
          </Button>
        </form>
      </Modal>

      {/* Reset Password */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
        description={resetTarget ? `Set a new password for ${resetTarget.adminname}` : ""}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">At least 8 characters</p>
          </div>
          <Button
            type="submit"
            disabled={patchMutation.isPending}
            className="w-full"
          >
            {patchMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : (
              "Set New Password"
            )}
          </Button>
        </form>
      </Modal>

      {/* Edit Email */}
      <Modal
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        title="Edit Email"
        description={emailTarget ? `Login code address for ${emailTarget.adminname}` : ""}
      >
        <form onSubmit={handleEditEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              autoComplete="off"
              placeholder="Leave blank to disable the login code"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leaving this blank lets {emailTarget?.adminname} log in with just a password again.
            </p>
          </div>
          <Button type="submit" disabled={patchMutation.isPending} className="w-full">
            {patchMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : (
              "Save Email"
            )}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete admin?"
        description={`Permanently delete ${deleteTarget?.adminname}? This can't be undone.`}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
