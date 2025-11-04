const features = [
  { title: "Fast", body: "Edge-rendered, serverless-first." },
  { title: "Secure", body: "Strict headers, CSP, rate limits." },
  { title: "Accessible", body: "Keyboard and screen-reader friendly." }
];
export default function FeatureCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {features.map((f) => (
        <div key={f.title} className="rounded-2xl border p-6">
          <h3 className="font-semibold text-lg">{f.title}</h3>
          <p className="text-sm opacity-80 mt-2">{f.body}</p>
        </div>
      ))}
    </div>
  );
}
