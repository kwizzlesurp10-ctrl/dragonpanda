export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert">
        <p>We keep data collection minimal. Contact-only email is stored if you opt in.</p>
        <h2>Data Collection</h2>
        <p>We collect the following information:</p>
        <ul>
          <li>Email addresses (if you subscribe to our newsletter)</li>
          <li>Anonymous analytics data</li>
          <li>Publicly available trends from X and GitHub</li>
        </ul>
        <h2>Data Storage</h2>
        <p>All data is stored securely in our Supabase database with row-level security enabled.</p>
      </div>
    </div>
  );
}
