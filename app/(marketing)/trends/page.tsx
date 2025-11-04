import TrendsDashboard from '@/components/trends-dashboard';

export const metadata = {
  title: 'Live Trends',
  description: 'Real-time trends from X and GitHub, updated automatically',
};

export default function TrendsPage() {
  return (
    <div className="px-4 md:px-8 py-12 max-w-7xl mx-auto">
      <TrendsDashboard />
    </div>
  );
}
