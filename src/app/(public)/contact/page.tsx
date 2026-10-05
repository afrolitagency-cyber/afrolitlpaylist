import { ContactForm } from "@/components/public/ContactForm";
import { getIdentity } from "@/lib/settings";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const identity = await getIdentity();
  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Contact Us</h1>
      <p className="mb-7 max-w-xl text-(--sub-text)">
        Submissions, press enquiries, event listings or anything else — send it here and it lands in the
        {" "}{identity.name} inbox.
      </p>
      <ContactForm />
    </div>
  );
}
