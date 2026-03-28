import { prisma } from "@/lib/prisma";
import ContactClient from "./ContactClient";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["whatsapp_number", "contact_email"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  return (
    <ContactClient
      whatsappNumber={map["whatsapp_number"] ?? "919404643510"}
      contactEmail={map["contact_email"] ?? "rachnajain2103@gmail.com"}
    />
  );
}
