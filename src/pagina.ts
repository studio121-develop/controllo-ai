/**
 * Una pagina letta come la leggerebbe un'AI: cosa dice di sé nel <head>,
 * quanto testo ha davvero, se dice chi è e dove sta.
 */
import type { Controllo, Esito } from "./tipi.js";
import { SPIEGAZIONI, SOLUZIONI, PESI, FONTI } from "./testi.js";

export function controllo(chiave: string, nome: string, esito: Esito, dettaglio: string, pagina?: string): Controllo {
  const f = FONTI[chiave] ?? { base: "dedotto" as const, fonte: "" };
  return { chiave, nome, esito, dettaglio, spiegazione: SPIEGAZIONI[chiave] ?? "", comeRisolvere: SOLUZIONI[chiave] ?? "", peso: PESI[chiave] ?? 1, base: f.base, fonte: f.fonte, ...(pagina ? { pagina } : {}) };
}

/** Il contenuto di un meta, rispettando il tipo di virgolette usato (dentro può esserci l'apostrofo). */
export function meta(html: string, nome: string): string | null {
  const n = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prima = new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*content=("|')(.*?)\\1`, "i").exec(html);
  const dopo = new RegExp(`<meta[^>]+content=("|')(.*?)\\1[^>]*(?:name|property)=["']${n}["']`, "i").exec(html);
  return (prima?.[2] ?? dopo?.[2])?.replace(/\s+/g, " ").trim() || null;
}

export function titolo(html: string): string {
  return (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
}

/** Il testo che una persona vede: via script, style, nav, footer e tag. */
export function testoVisibile(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function parole(testo: string): number {
  return testo ? testo.split(/\s+/).filter((p) => /[a-zà-ú0-9]/i.test(p)).length : 0;
}

const TELEFONO = /(?:\+39[\s.-]?)?(?:0\d{1,3}[\s.-]?\d{5,8}|3\d{2}[\s.-]?\d{6,7})\b/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const INDIRIZZO = /\b(via|viale|piazza|corso|largo|vicolo|contrada|c\.da|strada|s\.s\.|ss)\s+[a-zà-ú.'\s]{3,40}\s*,?\s*\d{1,4}\b/i;
const CAP = /\b\d{5}\b\s+[A-ZÀ-Ú][a-zà-ú]+/;

export type ChiEDove = Readonly<{ telefono: boolean; email: boolean; indirizzo: boolean; cap: boolean }>;

export function chiEDove(html: string): ChiEDove {
  const testo = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { telefono: TELEFONO.test(testo) || /href=["']tel:/i.test(html), email: EMAIL.test(testo) || /href=["']mailto:/i.test(html), indirizzo: INDIRIZZO.test(testo), cap: CAP.test(testo) };
}

/** Le parole più comuni delle lingue vicine: un'euristica leggera per capire in che lingua è il testo. */
const SPIE: Record<string, readonly string[]> = {
  it: ["della", "delle", "degli", "che", "per", "con", "una", "anche", "sono", "nostri", "nostra"],
  en: ["the", "and", "with", "our", "your", "for", "that", "are", "this", "from"],
  de: ["und", "der", "die", "das", "mit", "für", "ist", "sie", "wir", "nicht"],
  fr: ["les", "des", "une", "pour", "avec", "nous", "vous", "est", "dans", "sur"],
  es: ["los", "las", "para", "con", "una", "nuestros", "está", "más", "por", "que"],
};
export function linguaDelTesto(testo: string): string | null {
  const conta = new Map<string, number>();
  for (const p of testo.toLowerCase().split(/\s+/)) conta.set(p, (conta.get(p) ?? 0) + 1);
  const punteggi = Object.entries(SPIE).map(([lingua, spie]) => [lingua, spie.reduce((a, s) => a + (conta.get(s) ?? 0), 0)] as const).sort((a, b) => b[1] - a[1]);
  const [prima, seconda] = punteggi;
  return prima && prima[1] >= 5 && (!seconda || prima[1] >= seconda[1] * 1.5) ? prima[0] : null;
}

export type Meta = Readonly<{
  titolo: string; descrizione: string | null; h1: readonly string[]; lang: string | null;
  noindex: boolean; canonical: string | null; og: { titolo: boolean; descrizione: boolean; immagine: boolean };
  refresh: boolean; parole: number; testo: string; chiEDove: ChiEDove; linguaTesto: string | null; jsLento: boolean;
}>;

export function leggiMeta(html: string): Meta {
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const robotsMeta = (meta(html, "robots") ?? "") + " " + (meta(html, "googlebot") ?? "");
  const testo = testoVisibile(html);
  const n = parole(testo);
  const corpo = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const jsLento = n < 40 && /<script/i.test(html) && (/id=["'](app|root|__next|__nuxt|svelte)["']/i.test(corpo) || corpo.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").trim().length < 200);
  return {
    titolo: titolo(html),
    descrizione: meta(html, "description"),
    h1,
    lang: /<html[^>]+lang=["']([a-zA-Z-]+)["']/i.exec(html)?.[1]?.toLowerCase() ?? null,
    noindex: /\bnoindex\b/i.test(robotsMeta),
    canonical: /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1] ?? /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i.exec(html)?.[1] ?? null,
    og: { titolo: !!meta(html, "og:title"), descrizione: !!meta(html, "og:description"), immagine: !!meta(html, "og:image") },
    refresh: /<meta[^>]+http-equiv=["']refresh["']/i.test(html),
    parole: n, testo, chiEDove: chiEDove(html), linguaTesto: linguaDelTesto(testo), jsLento,
  };
}

const TITOLI_VUOTI = /^(home|homepage|benvenuti|welcome|index|untitled|senza titolo|nuovo sito|sito web)$/i;
const DESCRIZIONI_VUOTE = /^(benvenut[oi] (nel|sul) (nostro )?sito|sito (web )?ufficiale|home ?page|descrizione|lorem ipsum)/i;

/** I controlli sulla pagina. `home` accende quelli che valgono solo per la principale. */
export function controllaPagina(html: string, url: string, xRobots: string | null, home: boolean): readonly Controllo[] {
  const m = leggiMeta(html);
  const dominio = new URL(url).hostname.replace(/^www\./, "");
  const c: Controllo[] = [];
  const dove = home ? undefined : url;

  const noindex = m.noindex || /\bnoindex\b/i.test(xRobots ?? "");
  c.push(controllo("noindex", "La pagina chiede di essere ignorata", noindex ? "male" : "bene", noindex ? `c'è un «noindex»${m.noindex ? " nella pagina" : ""}${/\bnoindex\b/i.test(xRobots ?? "") ? " nelle intestazioni del server" : ""}: Google e le AI la scartano` : "nessun «noindex»", dove));

  const t = m.titolo;
  const titoloGenerico = TITOLI_VUOTI.test(t);
  const titoloSoloNome = !titoloGenerico && (t.toLowerCase() === dominio || t.toLowerCase() === dominio.split(".")[0]);
  c.push(controllo("titolo", "La pagina ha un titolo chiaro", !t ? "male" : titoloGenerico || titoloSoloNome ? "male" : t.length < 15 || t.length > 70 ? "neutro" : "bene",
    !t ? "manca il titolo" : titoloGenerico ? `«${t}»: un titolo generico, non dice né chi sei né cosa fai` : titoloSoloNome ? `«${t}»: dice solo il nome, non cosa fai` : `«${t}»${t.length > 70 ? " (lungo: Google lo taglia)" : t.length < 15 ? " (corto)" : ""}`, dove));

  const d = m.descrizione;
  const descDebole = !!d && (DESCRIZIONI_VUOTE.test(d) || d.toLowerCase() === t.toLowerCase());
  c.push(controllo("descrizione", "C'è una descrizione di cosa fai", !d ? "male" : descDebole ? "male" : d.length < 50 || d.length > 170 ? "neutro" : "bene",
    !d ? "manca la descrizione" : descDebole ? `«${d.slice(0, 60)}…»: generica o uguale al titolo` : `${d.length} caratteri${d.length < 50 ? ": troppo corta" : d.length > 170 ? ": lunga, viene tagliata" : ""}`, dove));

  const h1Vuoti = m.h1.filter((x) => !x).length;
  c.push(controllo("h1", "Un titolo principale nella pagina", m.h1.length === 1 && !h1Vuoti ? "bene" : m.h1.length === 0 ? "male" : "neutro",
    m.h1.length === 1 && !h1Vuoti ? `«${m.h1[0]!.slice(0, 70)}»` : m.h1.length === 0 ? "nessuno" : h1Vuoti ? "c'è, ma è un'immagine senza testo" : `${m.h1.length} titoli principali: meglio uno`, dove));

  if (home) {
    c.push(controllo("lingua", "La lingua del sito è dichiarata", m.lang ? (m.linguaTesto && !m.lang.startsWith(m.linguaTesto) ? "neutro" : "bene") : "male",
      m.lang ? (m.linguaTesto && !m.lang.startsWith(m.linguaTesto) ? `dichiara «${m.lang}» ma il testo sembra in «${m.linguaTesto}»` : m.lang) : "non dichiarata"));
    c.push(controllo("testo", "C'è abbastanza testo da leggere", m.jsLento ? "male" : m.parole < 150 ? "neutro" : "bene",
      m.jsLento ? "la pagina si costruisce solo con programmi nel browser: alle AI arriva quasi vuota" : `${m.parole} parole${m.parole < 150 ? ": poche, le AI hanno poco da capire" : ""}`));
    const cd = m.chiEDove;
    const trovati = [cd.telefono && "telefono", cd.email && "email", cd.indirizzo && "indirizzo", cd.cap && "città"].filter(Boolean) as string[];
    c.push(controllo("contatti", "Dice chi sei e dove sei", trovati.length >= 2 ? "bene" : trovati.length === 1 ? "neutro" : "male",
      trovati.length ? `trovati: ${trovati.join(", ")}` : "nessun telefono, indirizzo o email nella pagina"));
    const canon = m.canonical ? (() => { try { return new URL(m.canonical!, url); } catch { return null; } })() : null;
    const altroDominio = canon && canon.hostname.replace(/^www\./, "") !== dominio;
    c.push(controllo("canonical", "La pagina indica il suo indirizzo ufficiale", !m.canonical ? "neutro" : altroDominio ? "male" : "bene",
      !m.canonical ? "non indicato: va bene, ma con www e senza www conviene dirlo" : altroDominio ? `punta a un altro sito (${canon!.hostname}): Google e le AI attribuiscono la pagina a quello` : "indicato"));
    const og = [m.og.titolo, m.og.descrizione, m.og.immagine].filter(Boolean).length;
    c.push(controllo("og", "Anteprima per condivisioni e assistenti", og === 3 ? "bene" : og > 0 ? "neutro" : "male", og === 3 ? "titolo, descrizione e immagine presenti" : og > 0 ? "incompleta: manca " + [!m.og.titolo && "il titolo", !m.og.descrizione && "la descrizione", !m.og.immagine && "l'immagine"].filter(Boolean).join(", ") : "assente"));
    if (m.refresh) c.push(controllo("refresh", "La pagina rimanda altrove da sola", "male", "c'è un rinvio automatico: le AI si fermano qui"));
  }
  return c;
}
