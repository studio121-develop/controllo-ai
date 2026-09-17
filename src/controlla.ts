/**
 * Il controllo completo di un sito. Non lancia mai: ogni guasto diventa un
 * controllo con la causa scritta. Tempo massimo totale ~30 secondi.
 */
import { esaminaLlms } from "./llms.js";
import { controllaPagina, controllo } from "./pagina.js";
import { bloccante, giudizio, punteggio } from "./punteggio.js";
import { type Lettura, leggi, origineDa, sembraInManutenzione, sembraSfidaAntiBot } from "./rete.js";
import { MOTORI, ROBOT_CHE_RISPONDONO, ROBOT_CHE_SI_ADDESTRANO, ROBOT_GOOGLE_AI, analizzaRobots, robotBloccati } from "./robots.js";
import { controllaDatiStrutturati } from "./schema.js";
import { linkInterni, paginePresentazione, scegliPagine, sitemapIndice, urlDaSitemap } from "./sitemap.js";
import type { Chiamata, Controllo, PaginaControllata, Risultato } from "./tipi.js";

export type Opzioni = Readonly<{ modalita?: "rapido" | "completo"; chiama?: Chiamata; pagineExtra?: number; tempoMs?: number }>;

function daRaggiungibilita(home: Lettura, origine: string): Controllo[] {
  const c: Controllo[] = [];
  if (home.errore) return [controllo("raggiungibile", "La pagina principale risponde", "male", home.errore)];
  if (sembraSfidaAntiBot(home)) return [controllo("antibot", "Il sito lascia entrare i programmi", "male", `il server risponde con una verifica anti-bot (HTTP ${home.stato})`)];
  if (home.stato >= 500) return [controllo("raggiungibile", "La pagina principale risponde", "male", `errore del server (HTTP ${home.stato})`)];
  if (home.stato === 404 || home.stato === 410) return [controllo("raggiungibile", "La pagina principale risponde", "male", `la pagina principale non esiste (HTTP ${home.stato})`)];
  if (home.stato === 401 || home.stato === 403) return [controllo("raggiungibile", "La pagina principale risponde", "male", `accesso negato (HTTP ${home.stato}): sito protetto da password o bloccato`)];
  if (home.stato !== 200) return [controllo("raggiungibile", "La pagina principale risponde", "neutro", `risposta inattesa (HTTP ${home.stato})`)];
  if (sembraInManutenzione(home.corpo)) return [controllo("raggiungibile", "La pagina principale risponde", "male", "pagina di manutenzione o «in costruzione»")];
  c.push(controllo("raggiungibile", "La pagina principale risponde", "bene", `HTTP 200 in ${(home.tempoMs / 1000).toFixed(1)} s`));
  const dominioIniziale = new URL(origine).hostname.replace(/^www\./, "");
  const dominioFinale = new URL(home.urlFinale).hostname.replace(/^www\./, "");
  if (dominioFinale !== dominioIniziale) c.push(controllo("redirect", "L'indirizzo arriva dove deve", "neutro", `rimanda a un altro dominio: ${new URL(home.urlFinale).hostname}`));
  else if (home.redirect.length > 2) c.push(controllo("redirect", "L'indirizzo arriva dove deve", "neutro", `${home.redirect.length} reindirizzamenti in fila prima della pagina`));
  else c.push(controllo("redirect", "L'indirizzo arriva dove deve", "bene", home.redirect.length ? `arriva a ${home.urlFinale} con ${home.redirect.length === 1 ? "un reindirizzamento" : "due reindirizzamenti"}` : "risponde subito"));
  return c;
}

function daRobots(robots: Lettura): { controlli: Controllo[]; sitemap: readonly string[] } {
  if (robots.stato !== 200) return { controlli: [controllo("robots", "Le AI possono leggere il sito", "bene", "nessun robots.txt: tutti i programmi possono leggere tutto")], sitemap: [] };
  const r = analizzaRobots(robots.corpo);
  const rispondono = robotBloccati(r, ROBOT_CHE_RISPONDONO);
  const addestrano = robotBloccati(r, ROBOT_CHE_SI_ADDESTRANO);
  const motori = robotBloccati(r, MOTORI);
  const googleAi = robotBloccati(r, ROBOT_GOOGLE_AI);
  const c: Controllo[] = [];
  if (motori.length) c.push(controllo("motori", "Google e Bing possono leggere il sito", "male", `bloccati: ${motori.join(", ")}`));
  c.push(controllo("robots", "Le AI possono leggere il sito", rispondono.length ? "male" : "bene",
    rispondono.length ? `bloccati i programmi che rispondono alle domande: ${rispondono.join(", ")}` : addestrano.length ? `le AI che rispondono possono entrare; restano fuori solo quelle che si addestrano (${addestrano.join(", ")}), per scelta` : "tutte le AI possono entrare"));
  if (googleAi.length) c.push(controllo("googleai", "Gemini e le risposte AI di Google", "neutro", "Google-Extended è bloccato: scelta legittima, ma il sito non compare nelle risposte di Gemini"));
  return { controlli: c, sitemap: r.sitemap };
}

async function leggiSitemap(origine: string, dichiarate: readonly string[], chiama: Chiamata, tempoMs: number): Promise<{ controllo: Controllo; url: readonly string[] }> {
  const candidati = dichiarate.length ? dichiarate : [`${origine}/sitemap.xml`, `${origine}/sitemap_index.xml`];
  for (const u of candidati.slice(0, 3)) {
    const l = await leggi(u, chiama, tempoMs);
    if (l.stato !== 200 || !/<(urlset|sitemapindex)/i.test(l.corpo)) continue;
    let url = urlDaSitemap(l.corpo);
    if (sitemapIndice(l.corpo)) {
      const figlia = await leggi(url[0] ?? "", chiama, tempoMs);
      url = figlia.stato === 200 ? urlDaSitemap(figlia.corpo) : [];
    }
    return { controllo: controllo("sitemap", "C'è la mappa del sito", "bene", `${dichiarate.length ? "dichiarata nel robots.txt" : "trovata"}: ${url.length}${url.length >= 50 ? "+" : ""} pagine`), url };
  }
  return { controllo: controllo("sitemap", "C'è la mappa del sito", "neutro", "non trovata"), url: [] };
}

export async function controlla(sito: string, opzioni: Opzioni = {}): Promise<Risultato> {
  const inizio = Date.now();
  const chiama = opzioni.chiama ?? ((u: string, i?: RequestInit) => fetch(u, i));
  const modalita = opzioni.modalita ?? "completo";
  const tempoMs = opzioni.tempoMs ?? 8_000;
  const origine = origineDa(sito);
  const controlli: Controllo[] = [];
  const pagine: PaginaControllata[] = [];

  const [home, robots, llms] = await Promise.all([leggi(`${origine}/`, chiama, tempoMs), leggi(`${origine}/robots.txt`, chiama, tempoMs), leggi(`${origine}/llms.txt`, chiama, tempoMs)]);
  const ragg = daRaggiungibilita(home, origine);
  controlli.push(...ragg);
  const homeOk = ragg[0]!.chiave === "raggiungibile" && ragg[0]!.esito !== "male";
  const rb = daRobots(robots);
  controlli.push(...rb.controlli);

  if (homeOk) {
    const urlHome = home.urlFinale;
    controlli.push(...controllaPagina(home.corpo, urlHome, home.intestazioni["x-robots-tag"] ?? null, true));
    controlli.push(...controllaDatiStrutturati(home.corpo));
    const pres = paginePresentazione(home.corpo, urlHome);
    controlli.push(controllo("chisiamo", "Si trovano «chi siamo» e «contatti»", pres.chiSiamo && pres.contatti ? "bene" : pres.chiSiamo || pres.contatti ? "neutro" : "male",
      pres.chiSiamo && pres.contatti ? "entrambe linkate dalla pagina principale" : pres.chiSiamo ? "c'è «chi siamo», manca «contatti»" : pres.contatti ? "c'è «contatti», manca «chi siamo»" : "nessuna delle due è linkata dalla pagina principale"));
    pagine.push({ url: urlHome, stato: home.stato, controlli: controlli.filter((c) => !c.pagina) });
  }
  const l = esaminaLlms(llms);
  controlli.push(controllo("llms", "C'è una guida per le AI (llms.txt)", l.valido ? "bene" : "neutro", l.motivo));

  if (homeOk && modalita === "completo") {
    const sm = await leggiSitemap(origine, rb.sitemap, chiama, tempoMs);
    controlli.push(sm.controllo);
    const altre = scegliPagine(sm.url, linkInterni(home.corpo, home.urlFinale), home.urlFinale, opzioni.pagineExtra ?? 5);
    const letture = await Promise.all(altre.map((u) => leggi(u, chiama, tempoMs)));
    let problemi = 0;
    const viste = new Set<string>([home.urlFinale.replace(/\/$/, "")]);
    for (const lp of letture) {
      /* Una pagina che rimanda alla home (o a una già vista) non è una pagina: si salta. */
      const finale = lp.urlFinale.replace(/\/$/, "");
      /* Stesso indirizzo già visto, o stesso contenuto della home con un altro indirizzo: non è un'altra pagina. */
      if (lp.stato === 200 && (viste.has(finale) || lp.corpo === home.corpo)) continue;
      viste.add(finale);
      if (lp.stato !== 200 || !lp.corpo) { pagine.push({ url: lp.urlRichiesto, stato: lp.stato, controlli: [] }); problemi++; continue; }
      const cp = controllaPagina(lp.corpo, lp.urlFinale, lp.intestazioni["x-robots-tag"] ?? null, false);
      pagine.push({ url: lp.urlFinale, stato: lp.stato, controlli: cp });
      if (cp.some((c) => c.esito === "male")) problemi++;
    }
    const controllate = pagine.length - 1;
    if (controllate > 0) controlli.push(controllo("pagine", "Le altre pagine importanti sono in ordine", problemi === 0 ? "bene" : problemi < controllate ? "neutro" : "male",
      problemi === 0 ? `${controllate} pagine controllate, tutte a posto` : `${problemi} su ${controllate} pagine con titolo, descrizione o titolo principale mancanti, o non raggiungibili`));
  }

  const p = punteggio(controlli);
  return { url: origine, urlFinale: home.urlFinale || origine, punteggio: p, giudizio: giudizio(p, bloccante(controlli)), controlli, pagine, controllatoIl: new Date().toISOString(), durataMs: Date.now() - inizio, modalita };
}
