import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <LogoMark size={48} />
      <h1 className="mt-5 text-3xl font-bold">Nothing here</h1>
      <p className="mt-2 text-muted">This page or event doesn&apos;t exist, or you don&apos;t have access.</p>
      <Link href="/" className="mt-6 rounded-xl bg-leaf px-5 py-3 font-semibold text-ink">Back home</Link>
    </main>
  );
}
