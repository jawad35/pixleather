import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Mail } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCart, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { cartMessage, openWhatsApp } from "@/lib/whatsapp";
import { openEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart" }, { name: "robots", content: "noindex" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQuantity, remove } = useCart();
  const total = cartTotal(items);
  const [customer, setCustomer] = useState({ name: "", phone: "", city: "" });

  if (items.length === 0) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 text-center">
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-muted-foreground"><ShoppingBag size={32} /></div>
          <h1 className="mt-6 font-display text-3xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Browse our handmade collection and add something special.</p>
          <Button asChild size="lg" className="mt-6 rounded-full px-8"><Link to="/products">Start Shopping</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Shopping Cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {items.map((i) => (
            <div key={`${i.id}-${i.color}-${i.size}-${i.variant}`} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <img src={i.image} alt={i.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/products/$slug" params={{ slug: i.slug }} className="font-display font-semibold hover:text-primary">{i.name}</Link>
                  <button aria-label="Remove" onClick={() => remove(i.id, i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={17} /></button>
                </div>
                <p className="text-xs text-muted-foreground">{[i.variant, i.color, i.size].filter(Boolean).join(" / ")}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-border">
                    <button aria-label="Decrease" onClick={() => setQuantity(i.id, i.quantity - 1, i)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm">{i.quantity}</span>
                    <button aria-label="Increase" onClick={() => setQuantity(i.id, i.quantity + 1, i)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><Plus size={14} /></button>
                  </div>
                  <span className="font-display font-semibold">{formatPrice(i.price * i.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-3xl border border-border bg-card p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-semibold">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>Calculated on WhatsApp</span></div>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4">
            <span className="font-display text-lg font-semibold">Total</span>
            <span className="font-display text-lg font-semibold">{formatPrice(total)}</span>
          </div>

          <div className="mt-6 space-y-3">
            <Input placeholder="Your name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="rounded-xl" />
            <Input placeholder="Phone number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="rounded-xl" />
            <Input placeholder="City" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} className="rounded-xl" />
          </div>

          <Button
            size="lg"
            onClick={() => openWhatsApp(cartMessage(items, total, customer))}
            className="mt-5 w-full gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]"
          >
            <FaWhatsapp size={18} /> Checkout on WhatsApp
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => openEmail("New Order", cartMessage(items, total, customer))}
            className="mt-3 w-full gap-2 rounded-xl"
          >
            <Mail size={18} /> Checkout via Email
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">No online payment — confirm your order directly with us on WhatsApp or email.</p>
        </div>
      </div>
    </div>
  );
}
