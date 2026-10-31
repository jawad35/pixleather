import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, Menu, X, User, LayoutDashboard, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { SITE } from "@/lib/config";
import { useCart, cartCount } from "@/store/cart";
import { useUI } from "@/store/ui";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.png";

const NAV = [
  { label: "Shop", to: "/products" as const },
  { label: "Categories", to: "/categories" as const },
  { label: "Stories", to: "/stories" as const },
  { label: "About", to: "/about" as const },
  { label: "Contact", to: "/contact" as const },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mega, setMega] = useState(false);
  const [acct, setAcct] = useState(false);
  const count = useCart((s) => cartCount(s.items));
  const openCart = useCart((s) => s.open);
  const openSearch = useUI((s) => s.openSearch);
  const { user, isAdmin, profile, signOut } = useAuth();

  const { data: cats = [] } = useQuery({ queryKey: ["nav-categories"], queryFn: api.getCategories });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "glass shadow-soft" : "bg-background"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <button aria-label="Menu" onClick={() => setMobile(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary">
            <Menu size={20} />
          </button>
        </div>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logo} alt={`${SITE.name} logo`} className="h-9 w-9 object-contain" />
          <span className="hidden font-display text-xl font-semibold tracking-tight sm:block">{SITE.name}</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
            <Link to="/products" className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
              Shop
            </Link>
            {mega && cats.length > 0 && (
              <div className="absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-3">
                <div className="grid grid-cols-3 gap-1 rounded-3xl border border-border bg-popover p-4 shadow-lift">
                  {cats.map((c) => (
                    <Link
                      key={c.slug}
                      to="/products"
                      search={{ category: c.name }}
                      className="rounded-2xl p-3 transition-colors hover:bg-secondary"
                    >
                      <p className="font-display text-sm font-semibold">{c.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.subcategories.slice(0, 3).join(" • ")}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {NAV.slice(1).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button aria-label="Search" onClick={openSearch} className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary">
            <Search size={20} />
          </button>

          <div className="relative" onMouseEnter={() => setAcct(true)} onMouseLeave={() => setAcct(false)}>
            {user ? (
              <button aria-label="Account" className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary">
                <User size={20} />
              </button>
            ) : (
              <Link to="/auth" aria-label="Sign in" className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary">
                <User size={20} />
              </Link>
            )}
            {user && acct && (
              <div className="absolute right-0 top-full z-50 w-56 pt-2">
                <div className="rounded-2xl border border-border bg-popover p-2 shadow-lift">
                  <p className="px-3 py-2 text-sm">
                    <span className="block font-medium">{profile?.first_name ?? "Account"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{profile?.email}</span>
                  </p>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-secondary">
                      <LayoutDashboard size={16} /> Admin Dashboard
                    </Link>
                  )}
                  <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-secondary">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button aria-label="Cart" onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>

      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] animate-fade-up bg-background p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{SITE.name}</span>
              <button aria-label="Close" onClick={() => setMobile(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setMobile(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-secondary">
                  {n.label}
                </Link>
              ))}
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobile(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-secondary">
                      Admin Dashboard
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setMobile(false); }} className="rounded-xl px-3 py-3 text-left text-base font-medium hover:bg-secondary">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMobile(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-secondary">
                  Sign In
                </Link>
              )}
            </div>
            <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
            <div className="mt-2 flex flex-col gap-1">
              {cats.map((c) => (
                <Link key={c.slug} to="/products" search={{ category: c.name }} onClick={() => setMobile(false)} className="rounded-xl px-3 py-2 text-sm hover:bg-secondary">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
