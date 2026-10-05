import { getNav } from "@/lib/nav";
import { getActiveTheme, getIdentity } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";

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
    </>
  );
}
