import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Mail } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { cartMessage, openWhatsApp } from "@/lib/whatsapp";
import { openEmail } from "@/lib/email";

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, remove } = useCart();
  const total = cartTotal(items);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="font-display text-xl">Your Cart ({items.length})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-muted-foreground">
              <ShoppingBag size={26} />
            </div>
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild onClick={close} className="rounded-xl">
              <Link to="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.map((i) => (
                <div key={`${i.id}-${i.color}-${i.size}-${i.variant}`} className="flex gap-3">
                  <img src={i.image} alt={i.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{i.name}</p>
                      <button aria-label="Remove" onClick={() => remove(i.id, i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{[i.variant, i.color, i.size].filter(Boolean).join(" / ")}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-border">
                        <button aria-label="Decrease" onClick={() => setQuantity(i.id, i.quantity - 1, i)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary">
                          <Minus size={13} />
                        </button>
                        <span className="w-5 text-center text-sm">{i.quantity}</span>
                        <button aria-label="Increase" onClick={() => setQuantity(i.id, i.quantity + 1, i)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary">
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-lg font-semibold">{formatPrice(total)}</span>
              </div>
              <Button
                onClick={() => openWhatsApp(cartMessage(items, total))}
                className="w-full gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]"
              >
                <FaWhatsapp size={18} /> Checkout on WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => openEmail("New Order", cartMessage(items, total))}
                className="w-full gap-2 rounded-xl"
              >
                <Mail size={18} /> Checkout via Email
              </Button>
              <Button asChild variant="outline" onClick={close} className="w-full rounded-xl">
                <Link to="/cart">View Full Cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
