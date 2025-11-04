import Hero from "@/components/hero";
import FeatureCards from "@/components/feature-cards";
import NewsletterForm from "@/components/newsletter-form";

export default function Page() {
  return (
    <section className="px-4 md:px-8 py-12 space-y-16">
      <Hero />
      <FeatureCards />
      <div className="max-w-xl mx-auto"><NewsletterForm /></div>
    </section>
  );
}
