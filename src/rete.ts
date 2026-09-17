/**
 * La rete, con tutto quello che può andare storto: redirect seguiti a mano
 * (per vedere anelli e cambi di dominio), tempo massimo, pagine enormi,
 * codifiche strane. Non lancia mai: restituisce sempre una Lettura.
 */
import type { Chiamata } from "./tipi.js";

export type Lettura = Readonly<{
  urlRichiesto: string;
  urlFinale: string;
  stato: number;
  corpo: string;
  intestazioni: Readonly<Record<string, string>>;
  redirect: readonly string[];
  errore: string | null;
  tempoMs: number;
}>;

export const TEMPO_MASSIMO_MS = 8_000;
const CORPO_MASSIMO = 1_500_000;
const REDIRECT_MASSIMI = 6;
const UA = "Mozilla/5.0 (compatible; controllo-ai/2.0; +https://github.com/studio121-develop/controllo-ai)";

export const chiamataReale: Chiamata = (url, init) => fetch(url, init);

function decodifica(buffer: ArrayBuffer, tipo: string): string {
  const m = /charset=([\w-]+)/i.exec(tipo);
  const charset = (m?.[1] ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset === "iso-8859-1" ? "windows-1252" : charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export async function leggi(url: string, chiama: Chiamata = chiamataReale, tempoMs = TEMPO_MASSIMO_MS): Promise<Lettura> {
  const inizio = Date.now();
  const redirect: string[] = [];
  let corrente = url;
  for (let passo = 0; passo <= REDIRECT_MASSIMI; passo++) {
    let r: Response;
    try {
      r = await chiama(corrente, { redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain,*/*;q=0.8", "Accept-Language": "it,en;q=0.5" }, signal: AbortSignal.timeout(tempoMs) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const errore = /abort|timeout/i.test(msg) ? `nessuna risposta entro ${tempoMs / 1000} secondi` : /certificate|CERT|SSL|TLS/i.test(msg) ? "certificato di sicurezza non valido" : /ENOTFOUND|getaddrinfo/i.test(msg) ? "dominio inesistente" : /ECONNREFUSED/i.test(msg) ? "connessione rifiutata" : `errore di rete: ${msg}`;
      return { urlRichiesto: url, urlFinale: corrente, stato: 0, corpo: "", intestazioni: {}, redirect, errore, tempoMs: Date.now() - inizio };
    }
    const intestazioni: Record<string, string> = {};
    r.headers.forEach((v, k) => { intestazioni[k.toLowerCase()] = v; });
    if (r.status >= 300 && r.status < 400 && intestazioni.location) {
      const prossimo = new URL(intestazioni.location, corrente).toString();
      if (redirect.includes(prossimo) || prossimo === corrente || prossimo === url) {
        return { urlRichiesto: url, urlFinale: corrente, stato: r.status, corpo: "", intestazioni, redirect, errore: "i reindirizzamenti girano in tondo", tempoMs: Date.now() - inizio };
      }
      redirect.push(prossimo);
      corrente = prossimo;
      continue;
    }
    let corpo = "";
    try {
      const buffer = await r.arrayBuffer();
      corpo = decodifica(buffer.slice(0, CORPO_MASSIMO), intestazioni["content-type"] ?? "");
    } catch {
      corpo = "";
    }
    return { urlRichiesto: url, urlFinale: corrente, stato: r.status, corpo, intestazioni, redirect, errore: null, tempoMs: Date.now() - inizio };
  }
  return { urlRichiesto: url, urlFinale: corrente, stato: 0, corpo: "", intestazioni: {}, redirect, errore: `più di ${REDIRECT_MASSIMI} reindirizzamenti`, tempoMs: Date.now() - inizio };
}

/** Normalizza ciò che scrive l'utente in un'origine https. */
export function origineDa(sito: string): string {
  const pulito = sito.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  return `https://${pulito}`;
}

/** Il sito blocca i programmi (Cloudflare, WAF): pagina di sfida invece del contenuto. */
export function sembraSfidaAntiBot(l: Lettura): boolean {
  if (l.stato === 403 || l.stato === 503 || l.stato === 429) {
    return /cloudflare|just a moment|attention required|verifica che sei|access denied|captcha|ddos-guard|sucuri/i.test(l.corpo) || !!l.intestazioni["cf-mitigated"] || /cloudflare/i.test(l.intestazioni.server ?? "");
  }
  return /<title>\s*(just a moment|attention required|un momento)/i.test(l.corpo);
}

export function sembraInManutenzione(html: string): boolean {
  return /<title>[^<]*(manutenzione|maintenance|coming soon|in costruzione|under construction)[^<]*<\/title>/i.test(html);
}
