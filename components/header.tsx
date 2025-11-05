import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-50">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold tracking-tight">🐉 Dragon & 🐼 Panda</Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/search" className="hover:underline font-medium">Search</Link>
          <Link href="/trends" className="hover:underline">Trends</Link>
          <Link href="/knowledge" className="hover:underline">Knowledge</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </nav>
      </div>
    </header>
  );
}
