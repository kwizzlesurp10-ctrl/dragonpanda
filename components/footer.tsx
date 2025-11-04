export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 text-sm flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Dragon & Panda. All rights reserved.</p>
        <p className="opacity-70">Built on Next.js • Deployed to Vercel</p>
      </div>
    </footer>
  );
}
