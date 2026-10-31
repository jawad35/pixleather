import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Shield } from "lucide-react";
import { adminSetUserActive, adminSetUserRole } from "@/lib/admin.functions";

const PAGE_SIZE = 15;

export function UsersAdmin() {
  const qc = useQueryClient();
  const setActive = useServerFn(adminSetUserActive);
  const setRole = useServerFn(adminSetUserRole);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: adminIds = [] } = useQuery({
    queryKey: ["admin-role-ids"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id").eq("role", "admin")).data?.map((r: any) => r.user_id) ?? [],
  });

  const filters = { search, roleFilter, statusFilter, page };
  const { data, isFetching } = useQuery({
    queryKey: ["admin-users", filters, adminIds],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("profiles").select("id,first_name,last_name,email,created_at,disabled", { count: "exact" });
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`);
      }
      if (statusFilter === "active") q = q.eq("disabled", false);
      if (statusFilter === "disabled") q = q.eq("disabled", true);
      if (roleFilter === "admin" && adminIds.length) q = q.in("id", adminIds);
      if (roleFilter === "admin" && !adminIds.length) return { rows: [], count: 0 };
      if (roleFilter === "user" && adminIds.length) q = q.not("id", "in", `(${adminIds.join(",")})`);
      q = q.order("created_at", { ascending: false });
      const from = page * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAdmin = (id: string) => adminIds.includes(id);

  const toggleActive = async (id: string, currentlyDisabled: boolean) => {
    setBusyId(id);
    try {
      await setActive({ data: { userId: id, active: currentlyDisabled } });
      toast.success(currentlyDisabled ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  };
  const toggleRole = async (id: string) => {
    setBusyId(id);
    try {
      await setRole({ data: { userId: id, admin: !isAdmin(id) } });
      toast.success(isAdmin(id) ? "Admin revoked" : "Made admin");
      qc.invalidateQueries({ queryKey: ["admin-role-ids"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Deactivated</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left"><tr>
            <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {rows.map((u: any) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${isAdmin(u.id) ? "bg-primary/10 text-primary" : "bg-secondary"}`}>
                    {isAdmin(u.id) ? <ShieldCheck size={12} /> : <Shield size={12} />} {isAdmin(u.id) ? "Admin" : "User"}
                  </span>
                </td>
                <td className="p-3">{u.disabled ? <span className="text-destructive">Deactivated</span> : <span className="text-green-600">Active</span>}</td>
                <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button disabled={busyId === u.id} onClick={() => toggleRole(u.id)} className="text-primary hover:underline disabled:opacity-50">
                      {isAdmin(u.id) ? "Revoke admin" : "Make admin"}
                    </button>
                    <button disabled={busyId === u.id} onClick={() => toggleActive(u.id, u.disabled)} className="text-destructive hover:underline disabled:opacity-50">
                      {u.disabled ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{isFetching ? "Loading…" : "No users found."}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pages} • {total} users</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
