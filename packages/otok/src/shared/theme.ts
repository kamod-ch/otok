export const THEME_STORAGE_KEY = "theme";

export function resolveDarkModeFromCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/(?:^|;\s*)theme=(dark|light)(?:;|$)/i);
  if (match?.[1]?.toLowerCase() === "dark") return true;
  return false;
}

export const themeBootstrapScript = `<script>(function(){try{var d=document.documentElement,t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){var m=document.cookie.match(/(?:^|;\\s*)theme=(dark|light)(?:;|$)/i);t=m?m[1]:null}if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");else d.classList.remove("dark")}catch(e){}})();</script>`;

export const themeColorSchemeStyle = `<style>html{color-scheme:light}html.dark{color-scheme:dark}</style>`;
