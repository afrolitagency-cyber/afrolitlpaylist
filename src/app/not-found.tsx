import Link from "next/link";
import { Brand } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <div className="mb-6 flex justify-center"><Brand size={44} /></div>
        <h1 className="text-4xl font-black">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-(--sub-text)">
          That link may be old, or the page has moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white">Back home</Link>
          <Link href="/search" className="rounded border border-(--border-strong) px-5 py-3 text-sm font-bold">Search the site</Link>
        </div>
      </div>
    </main>
  );
}
