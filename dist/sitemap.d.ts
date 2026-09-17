/** La mappa del sito e le pagine collegate dalla home: da dove prendere le altre pagine da controllare. */
export declare function urlDaSitemap(xml: string, limite?: number): readonly string[];
export declare function sitemapIndice(xml: string): boolean;
export declare const ALIAS_HOME: RegExp;
/** I link interni della home, in ordine di apparizione, senza doppioni né file. */
export declare function linkInterni(html: string, base: string, limite?: number): readonly string[];
/** Le pagine «chi siamo» e «contatti», cercate per nome nei link o nel testo dei link. */
export declare function paginePresentazione(html: string, base: string): {
    chiSiamo: string | null;
    contatti: string | null;
};
/** Le pagine da controllare oltre alla home: prima dalla sitemap (le più corte, di solito le sezioni), poi dai link. */
export declare function scegliPagine(daSitemap: readonly string[], daLink: readonly string[], home: string, quante?: number): readonly string[];
