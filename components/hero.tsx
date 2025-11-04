import Link from "next/link";
export default function Hero() {
  return (
    <div className="mx-auto max-w-6xl text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
        Dragon power. Panda calm.
      </h1>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
        Experiments, products, and play from dragonandpanda.space
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link className="px-5 py-3 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors" href="/trends">View Trends</Link>
        <Link className="px-5 py-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" href="#newsletter">Get updates</Link>
      </div>
    </div>
  );
}
