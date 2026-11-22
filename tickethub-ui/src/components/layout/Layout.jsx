import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import Skeleton from '../ui/Skeleton';

// Pages with their own full-bleed header sit under the translucent navbar instead of below it.
const isBleed = (p) => p === '/' || /^\/movies\/[^/]+$/.test(p);
// Pages with their own sticky action bar hide the tab bar to avoid two bars stacking.
const hideTabs = (p) => /^\/(book|checkout)\//.test(p);

export default function Layout() {
  const { pathname } = useLocation();
  const bleed = isBleed(pathname);
  const tabs = !hideTabs(pathname);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-[100] rounded-lg bg-gold px-4 py-2 font-bold text-obsidian focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Navbar overlay={bleed} />
      <main id="main" className={`flex-1 ${bleed ? '' : 'pt-16'} ${tabs ? 'pb-20 md:pb-0' : ''}`}>
        <Suspense
          fallback={
            <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-10 sm:px-8">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-64 w-full rounded-panel" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {tabs && <BottomNav />}
    </div>
  );
}
