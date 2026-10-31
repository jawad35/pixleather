import { SITE } from "./config";
import { formatPrice } from "./format";
import type { CartItem } from "@/store/cart";

export interface OrderLine {
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  color?: string;
  size?: string;
  material?: string;
}

function buildUrl(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  if (typeof window !== "undefined") window.open(buildUrl(message), "_blank", "noopener");
}

export function singleProductMessage(line: OrderLine, link: string): string {
  const parts = [
    "Hello 👋",
    "",
    "I want to order:",
    "",
    `Product: ${line.name}`,
    `Price: ${formatPrice(line.price)}`,
    `Quantity: ${line.quantity}`,
  ];
  if (line.variant) parts.push(`Variant: ${line.variant}`);
  if (line.color) parts.push(`Color: ${line.color}`);
  if (line.size) parts.push(`Size: ${line.size}`);
  if (line.material) parts.push(`Material: ${line.material}`);
  parts.push("", `Product Link: ${link}`, "", "Thank you.");
  return parts.join("\n");
}

export function cartMessage(items: CartItem[], total: number, customer?: { name?: string; phone?: string; city?: string }): string {
  const parts = ["Hello 👋", "", "I want to order:", ""];
  items.forEach((i, idx) => {
    const extra = [i.variant, i.color, i.size].filter(Boolean).join(" / ");
    parts.push(`${idx + 1}. ${i.name}${extra ? ` (${extra})` : ""}`);
    parts.push(`   Qty: ${i.quantity} × ${formatPrice(i.price)} = ${formatPrice(i.price * i.quantity)}`);
  });
  parts.push("", `Total: ${formatPrice(total)}`);
  if (customer?.name || customer?.phone || customer?.city) {
    parts.push("", "Customer Details:");
    if (customer.name) parts.push(`Name: ${customer.name}`);
    if (customer.phone) parts.push(`Phone: ${customer.phone}`);
    if (customer.city) parts.push(`City: ${customer.city}`);
  }
  parts.push("", "Thank you.");
  return parts.join("\n");
}

export function contactMessage(f: { name: string; phone: string; email?: string; subject?: string; message: string }): string {
  return [
    "Hello 👋",
    "",
    "New enquiry from the website:",
    "",
    `Name: ${f.name}`,
    `Phone: ${f.phone}`,
    f.email ? `Email: ${f.email}` : "",
    f.subject ? `Subject: ${f.subject}` : "",
    "",
    "Message:",
    f.message,
    "",
    "Thank you.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
