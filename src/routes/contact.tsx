import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { SITE } from "@/lib/config";
import { contactMessage, openWhatsApp } from "@/lib/whatsapp";
import { openEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ContactForm {
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
}

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `Contact ${SITE.name}` },
      { name: "description", content: "Get in touch for custom orders, wholesale enquiries and support. We reply fast on WhatsApp." },
      { property: "og:title", content: `Contact ${SITE.name}` },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactForm>();
  const onSubmit = (data: ContactForm) => openWhatsApp(contactMessage(data));
  const onEmail = handleSubmit((data) => openEmail(data.subject || `Enquiry from ${data.name}`, contactMessage(data)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get in touch</span>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Let's talk craft</h1>
        <p className="mt-3 text-muted-foreground">Custom orders, wholesale, or just a question — send us a message and we'll reply on WhatsApp.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          {[
            { icon: MapPin, label: "Visit", value: SITE.address },
            { icon: Phone, label: "Call", value: SITE.phone },
            { icon: Mail, label: "Email", value: SITE.email },
            { icon: Clock, label: "Hours", value: "Mon–Sat, 9am – 7pm" },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><c.icon size={20} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="mt-0.5 font-medium">{c.value}</p>
              </div>
            </div>
          ))}
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Our location"
              src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.address)}&output=embed`}
              className="h-56 w-full"
              loading="lazy"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name", { required: true })} className="mt-1.5 rounded-xl" placeholder="Your name" />
              {errors.name && <p className="mt-1 text-xs text-destructive">Name is required</p>}
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" {...register("phone", { required: true })} className="mt-1.5 rounded-xl" placeholder="Phone number" />
              {errors.phone && <p className="mt-1 text-xs text-destructive">Phone is required</p>}
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} className="mt-1.5 rounded-xl" placeholder="you@example.com" />
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register("subject")} className="mt-1.5 rounded-xl" placeholder="How can we help?" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" rows={5} {...register("message", { required: true })} className="mt-1.5 rounded-xl" placeholder="Tell us about your order or question..." />
              {errors.message && <p className="mt-1 text-xs text-destructive">Message is required</p>}
            </div>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]">
            <FaWhatsapp size={18} /> Send via WhatsApp
          </Button>
          <Button type="button" onClick={onEmail} size="lg" variant="outline" className="mt-3 w-full gap-2 rounded-xl">
            <Mail size={18} /> Send via Email
          </Button>
        </form>
      </div>
    </div>
  );
}
