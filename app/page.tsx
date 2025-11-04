import Hero from "@/components/hero";
import FeatureCards from "@/components/feature-cards";
import NewsletterForm from "@/components/newsletter-form";
import KnowledgeStats from "@/components/knowledge-stats";

export default function Page() {
  return (
    <section className="px-4 md:px-8 py-12 space-y-16">
      <Hero />
      <FeatureCards />
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Knowledge Base Statistics</h2>
        <KnowledgeStats />
      </div>
      <div className="max-w-xl mx-auto"><NewsletterForm /></div>
    </section>
  );
}
