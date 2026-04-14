import { DashboardProvider, useDashboard } from '@/lib/dashboardContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SearchBar from '@/components/dashboard/SearchBar';
import BookmarkGrid from '@/components/dashboard/BookmarkGrid';
import NewsSection from '@/components/dashboard/NewsSection';
import SettingsPanel from '@/components/dashboard/SettingsPanel';

function DashboardContent() {
  const { settings, searchFocused } = useDashboard();

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${searchFocused ? 'search-focus-active' : ''}`}>
      {/* Background wallpaper */}
      <div
        className="dashboard-bg fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url(${settings.wallpaper})` }}
      />
      <div className="dashboard-bg fixed inset-0 bg-black/20" />

      {/* Content: Clock → Greeting → Weather → Search → Speed Dial → News */}
      <div className="relative z-10 max-w-2xl mx-auto pb-24 flex flex-col items-center"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <DashboardHeader />
        <div className="w-full">
          <SearchBar />
          <BookmarkGrid />
          <NewsSection />
        </div>
      </div>

      <SettingsPanel />
    </div>
  );
}

export default function Index() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
