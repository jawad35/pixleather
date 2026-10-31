import type { ReactNode } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BackToTop } from "./BackToTop";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WhatsAppModal } from "@/components/product/WhatsAppModal";
import { SearchDialog } from "@/components/SearchDialog";
import { Toaster } from "@/components/ui/sonner";

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <CartDrawer />
      <WhatsAppModal />
      <SearchDialog />
      <Toaster position="bottom-center" />
    </div>
  );
}
