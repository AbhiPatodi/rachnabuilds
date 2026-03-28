import { prisma } from "@/lib/prisma";
import ContactClient from "./ContactClient";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["whatsapp_number", "contact_email"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const whatsappNumber = map["whatsapp_number"] ?? "919404643510";

  return (
    <>
      <SiteNav whatsappNumber={whatsappNumber} />
      <ContactClient
        whatsappNumber={whatsappNumber}
        contactEmail={map["contact_email"] ?? "rachnajain2103@gmail.com"}
      />
      <SiteFooter />
    </>
  );
}
