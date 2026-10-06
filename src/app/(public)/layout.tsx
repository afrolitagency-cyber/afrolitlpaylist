import { Suspense } from "react";
import { getNav } from "@/lib/nav";
import { getActiveTheme, getIdentity } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";
import { ConsentBanner } from "@/components/public/ConsentBanner";
import { ConsentLink } from "@/components/public/ConsentLink";
import { GoogleAnalytics } from "@/components/public/GoogleAnalytics";

/** The active template wraps every public page. Switching it in admin changes
 *  the whole site on the next revalidation — no redeploy. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [themeKey, nav, identity] = await Promise.all([getActiveTheme(), getNav(), getIdentity()]);
  const { Header, Footer } = await loadTheme(themeKey);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
      <Header nav={nav} identity={identity} />
      <main id="main">{children}</main>
      <Footer nav={nav} identity={identity} />
      <ConsentLink />
      {/* useSearchParams in a statically generated route needs a boundary, or
          the build fails with "useSearchParams() should be wrapped in a
          suspense boundary". */}
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      <ConsentBanner />
    </>
  );
}
