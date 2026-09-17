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
export declare const TEMPO_MASSIMO_MS = 8000;
export declare const chiamataReale: Chiamata;
export declare function leggi(url: string, chiama?: Chiamata, tempoMs?: number): Promise<Lettura>;
/** Normalizza ciò che scrive l'utente in un'origine https. */
export declare function origineDa(sito: string): string;
/** Il sito blocca i programmi (Cloudflare, WAF): pagina di sfida invece del contenuto. */
export declare function sembraSfidaAntiBot(l: Lettura): boolean;
export declare function sembraInManutenzione(html: string): boolean;
