export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <div className="prose dark:prose-invert">
        <p>Use this site responsibly. No scraping. No abuse.</p>
        <h2>Acceptable Use</h2>
        <ul>
          <li>Do not abuse our API endpoints</li>
          <li>Do not scrape our website</li>
          <li>Respect rate limits</li>
        </ul>
        <h2>Content</h2>
        <p>All trends and data are sourced from public APIs and are subject to their respective terms of service.</p>
      </div>
    </div>
  );
}
