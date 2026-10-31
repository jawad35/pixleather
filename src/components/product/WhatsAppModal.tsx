import { FaWhatsapp } from "react-icons/fa";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUI } from "@/store/ui";
import { img } from "@/lib/images";
import { formatPrice } from "@/lib/format";
import { singleProductMessage, openWhatsApp } from "@/lib/whatsapp";
import { openEmail } from "@/lib/email";

export function WhatsAppModal() {
  const payload = useUI((s) => s.whatsAppPayload);
  const close = useUI((s) => s.closeWhatsAppModal);
  const product = payload?.product;

  return (
    <Dialog open={!!payload} onOpenChange={(o) => !o && close()}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Send this order on WhatsApp?</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="flex gap-4 rounded-2xl bg-secondary p-4">
            <img src={img(product.gallery[0])} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {[payload?.line?.variant, payload?.line?.color, payload?.line?.size].filter(Boolean).join(" / ")}
              </p>
              <p className="mt-1 text-sm">
                {formatPrice(product.price)} × {payload?.line?.quantity ?? 1}
              </p>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          We'll open WhatsApp with your order details pre-filled. Just hit send and our team will confirm.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={close} className="rounded-xl">Cancel</Button>
          <Button
            className="gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]"
            onClick={() => {
              if (product) {
                openWhatsApp(
                  singleProductMessage(
                    {
                      name: product.name,
                      price: product.price,
                      quantity: payload?.line?.quantity ?? 1,
                      variant: payload?.line?.variant,
                      color: payload?.line?.color,
                      size: payload?.line?.size,
                      material: product.material,
                    },
                    payload?.link ?? (typeof window !== "undefined" ? window.location.href : ""),
                  ),
                );
              }
              close();
            }}
          >
            <FaWhatsapp size={18} /> Yes, Continue
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => {
              if (product) {
                const msg = singleProductMessage(
                  {
                    name: product.name,
                    price: product.price,
                    quantity: payload?.line?.quantity ?? 1,
                    variant: payload?.line?.variant,
                    color: payload?.line?.color,
                    size: payload?.line?.size,
                    material: product.material,
                  },
                  payload?.link ?? (typeof window !== "undefined" ? window.location.href : ""),
                );
                openEmail(`Order enquiry: ${product.name}`, msg);
              }
              close();
            }}
          >
            <Mail size={18} /> Order via Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
