import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FaInstagram, FaFacebookF, FaPinterestP, FaWhatsapp, FaTiktok } from "react-icons/fa";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/config";
import categories from "@/data/categories.json";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";


const cats = (categories as Category[]).sort((a, b) => a.order - b.order);

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "You're already subscribed!" : error.message);
      return;
    }
    toast.success("Thanks for subscribing!");
    setEmail("");
  };
  return (
    <form onSubmit={submit} className="mt-4 flex gap-2">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="rounded-xl bg-background" />
      <Button type="submit" disabled={busy} className="rounded-xl">{busy ? "…" : "Join"}</Button>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt={`${SITE.name} logo`} className="h-9 w-9 object-contain" />
              <span className="font-display text-xl font-semibold">{SITE.name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Premium handmade products crafted with passion. 100% handmade, premium materials, worldwide quality.
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { icon: FaInstagram, href: SITE.social.instagram },
                { icon: FaFacebookF, href: SITE.social.facebook },
                { icon: FaTiktok, href: SITE.social.tiktok },
                { icon: FaPinterestP, href: SITE.social.pinterest },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold">Quick Links</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {[
                { label: "Shop All", to: "/products" as const },
                { label: "Categories", to: "/categories" as const },
                { label: "Our Stories", to: "/stories" as const },
                { label: "About Us", to: "/about" as const },
                { label: "Contact", to: "/contact" as const },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-primary">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold">Categories</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {cats.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link to="/products" search={{ category: c.name }} className="transition-colors hover:text-primary">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold">Stay in the loop</h4>
            <p className="mt-4 text-sm text-muted-foreground">Get early access to new drops & exclusive offers.</p>
            <NewsletterForm />
            <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin size={15} className="text-primary" /> {SITE.address}</li>
              <li className="flex items-center gap-2"><Phone size={15} className="text-primary" /> {SITE.phone}</li>
              <li className="flex items-center gap-2"><Mail size={15} className="text-primary" /> {SITE.email}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Handcrafted with care • Made for the world</p>
        </div>
      </div>

      <a
        href={`https://wa.me/${SITE.whatsapp}`}
        target="_blank"
        rel="noopener"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-110"
      >
        <FaWhatsapp size={26} />
      </a>
    </footer>
  );
}
