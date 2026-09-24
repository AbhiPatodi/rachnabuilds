import { NextRequest, NextResponse, after } from "next/server";
import { rateLimitIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/webpush";
import { notifyNewLead } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitIp(req, "contact", 5, 3600_000))) {
      return NextResponse.json({ error: "Too many messages — please try again later." }, { status: 429 });
    }
    const body = await req.json();
    const { name, email, phone, service, budget, message } = body;
    if (String(name ?? "").length > 120 || String(email ?? "").length > 200 || String(message ?? "").length > 5000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await prisma.contactLead.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim()?.slice(0, 40) || null,
        service: service?.trim()?.slice(0, 80) || null,
        budget: budget?.trim()?.slice(0, 80) || null,
        message: message.trim(),
      },
    });

    after(async () => {
    await sendPushToAll('New Lead!', `${name.trim().slice(0, 80)} (${email.trim().slice(0, 80)}) submitted a contact form`, '/admin/leads').catch(() => {});

    await notifyNewLead({
      source: 'Contact Form',
      fields: [
        { label: 'Name',    value: name.trim() },
        { label: 'Email',   value: email.trim().toLowerCase() },
        ...(phone?.trim()   ? [{ label: 'Phone',   value: phone.trim() }]   : []),
        ...(service?.trim() ? [{ label: 'Service', value: service.trim() }] : []),
        ...(budget?.trim()  ? [{ label: 'Budget',  value: budget.trim() }]  : []),
      ],
      message: message.trim(),
    }).catch(() => {});
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact/route] Error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
