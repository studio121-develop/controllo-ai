/** La mappa del sito e le pagine collegate dalla home: da dove prendere le altre pagine da controllare. */

export function urlDaSitemap(xml: string, limite = 50): readonly string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!).slice(0, limite);
}

export function sitemapIndice(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

const NON_PAGINE = /\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js|xml|json|woff2?)(\?|$)|\/(feed|wp-json|wp-admin|tag|category|author|page)\/|\?(s|replytocom)=|#/i;
/* Le pagine legali e di servizio non sono «importanti» per chi cerca l'attività. */
const PAGINE_DI_SERVIZIO = /privacy|cookie|terms|termini|condizioni|legal|note-legali|disclaimer|login|carrello|cart|checkout|account|wp-login|sitemap|grazie|thank|404|search|cerca/i;
/* Altri indirizzi della pagina principale: non sono pagine diverse. */
export const ALIAS_HOME = /^\/(index|home|default)(\.(html?|php|aspx?))?\/?$/i;

/** I link interni della home, in ordine di apparizione, senza doppioni né file. */
export function linkInterni(html: string, base: string, limite = 40): readonly string[] {
  const origine = new URL(base);
  const visti = new Set<string>();
  const esito: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    let u: URL;
    try { u = new URL(m[1]!, base); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== origine.hostname.replace(/^www\./, "")) continue;
    if (!/^https?:$/.test(u.protocol) || NON_PAGINE.test(u.pathname + u.search)) continue;
    u.hash = ""; u.search = "";
    const chiave = u.toString().replace(/\/$/, "");
    if (chiave === origine.toString().replace(/\/$/, "") || visti.has(chiave)) continue;
    visti.add(chiave);
    esito.push(u.toString());
    if (esito.length >= limite) break;
  }
  return esito;
}

/** Le pagine «chi siamo» e «contatti», cercate per nome nei link o nel testo dei link. */
export function paginePresentazione(html: string, base: string): { chiSiamo: string | null; contatti: string | null } {
  const trova = (re: RegExp): string | null => {
    for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = m[1]!; const testo = m[2]!.replace(/<[^>]+>/g, " ");
      if (re.test(href) || re.test(testo)) { try { return new URL(href, base).toString(); } catch { return null; } }
    }
    return null;
  };
  return { chiSiamo: trova(/chi[-_ ]?siamo|about|la[-_ ]nostra[-_ ]storia|storia|azienda|lo[-_ ]studio|il[-_ ]molino|la[-_ ]famiglia|chi[-_ ]sono|filosofia|tradizione|da[-_ ]dove[-_ ]veniamo|il[-_ ]team|la[-_ ]squadra/i), contatti: trova(/contatt|contact|parliamone|dove[-_ ]siamo|prenota/i) };
}

/** Le pagine da controllare oltre alla home: prima dalla sitemap (le più corte, di solito le sezioni), poi dai link. */
export function scegliPagine(daSitemap: readonly string[], daLink: readonly string[], home: string, quante = 5): readonly string[] {
  const norm = (u: string) => u.replace(/\/$/, "");
  const h = norm(home);
  const candidate = [...daSitemap, ...daLink].filter((u) => norm(u) !== h && !NON_PAGINE.test(u) && !PAGINE_DI_SERVIZIO.test(new URL(u).pathname) && !ALIAS_HOME.test(new URL(u).pathname));
  const perChiave = new Map<string, string>();
  for (const u of candidate) if (!perChiave.has(norm(u))) perChiave.set(norm(u), u); // la sitemap vince sui link
  const uniche = [...perChiave.values()];
  return uniche.sort((a, b) => a.split("/").length - b.split("/").length || a.length - b.length).slice(0, quante);
}
