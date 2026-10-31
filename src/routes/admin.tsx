import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, Users, FolderTree, BookOpen, Mail, Star, BarChart3 } from "lucide-react";
import { ProductsAdmin } from "@/components/admin/ProductsAdmin";
import { StoriesAdmin } from "@/components/admin/StoriesAdmin";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Dashboard" }] }),
  component: AdminPage,
});

type Tab = "overview" | "products" | "categories" | "stories" | "reviews" | "users" | "subscribers" | "analytics";

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin access</h1>
          <p className="mt-2 text-muted-foreground">Please sign in to continue.</p>
          <Button asChild className="mt-4 rounded-xl"><Link to="/auth" search={{ redirect: "/admin" }}>Sign In</Link></Button>
        </div>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Not authorized</h1>
          <p className="mt-2 text-muted-foreground">Your account doesn't have admin access.</p>
        </div>
      </div>
    );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "stories", label: "Stories", icon: BookOpen },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "users", label: "Users", icon: Users },
    { id: "subscribers", label: "Subscribers", icon: Mail },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Admin Dashboard</h1>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === "overview" && <Overview />}
        {tab === "products" && <ProductsAdmin />}
        {tab === "categories" && <CategoriesAdmin />}
        {tab === "stories" && <StoriesAdmin />}
        {tab === "reviews" && <Reviews />}
        {tab === "users" && <UsersAdmin />}
        {tab === "subscribers" && <Subscribers />}
        {tab === "analytics" && <AnalyticsDashboard />}
      </div>
    </div>
  );
}

function useCount(table: string) {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table as any).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function Overview() {
  const products = useCount("products");
  const categories = useCount("categories");
  const stories = useCount("stories");
  const reviews = useCount("reviews");
  const subs = useCount("newsletter_subscribers");
  const users = useCount("profiles");
  const cards = [
    { label: "Products", value: products.data, icon: Package },
    { label: "Categories", value: categories.data, icon: FolderTree },
    { label: "Stories", value: stories.data, icon: BookOpen },
    { label: "Reviews", value: reviews.data, icon: Star },
    { label: "Users", value: users.data, icon: Users },
    { label: "Subscribers", value: subs.data, icon: Mail },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <c.icon className="text-primary" size={22} />
          <p className="mt-3 text-3xl font-semibold">{c.value ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, product:products(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const del = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };
  const q = search.trim().toLowerCase();
  const rows = (data as any[]).filter((r) => !q || r.name.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q) || (r.product?.name ?? "").toLowerCase().includes(q));
  return (
    <div className="space-y-3">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews…" className="max-w-xs rounded-xl border border-input bg-background px-3 py-2 text-sm" />
      {rows.map((r: any) => (
        <div key={r.id} className="flex items-start justify-between rounded-2xl border border-border p-4">
          <div>
            <p className="font-medium">{r.name} — {r.rating}★ <span className="text-xs text-muted-foreground">on {r.product?.name ?? "—"}</span></p>
            <p className="text-sm text-muted-foreground">{r.comment}</p>
          </div>
          <button onClick={() => del(r.id)} className="text-sm text-destructive hover:underline">Delete</button>
        </div>
      ))}
      {!rows.length && <p className="text-muted-foreground">No reviews found.</p>}
    </div>
  );
}

function Subscribers() {
  const { data = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => (await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-2">
      {data.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border p-3 text-sm">
          <span>{s.email}</span>
          <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
        </div>
      ))}
      {!data.length && <p className="text-muted-foreground">No subscribers yet.</p>}
    </div>
  );
}