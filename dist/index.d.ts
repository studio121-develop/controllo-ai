/**
 * controllo-ai — il sito è leggibile dalle AI?
 *
 * Sette controlli, tutti da leggere in parole semplici:
 *  robots       le AI che RISPONDONO alle domande possono entrare? (chi si addestra può restare fuori: è una scelta)
 *  llms         c'è un llms.txt?
 *  titolo       la pagina ha un titolo chiaro?
 *  descrizione  c'è una meta description?
 *  h1           c'è un titolo principale, uno solo?
 *  schema       ci sono dati strutturati con la scheda dell'attività?
 *  lingua       la lingua è dichiarata?
 *
 * Nessuna dipendenza. La funzione di rete si può iniettare (test, altri ambienti).
 */
export type Esito = "bene" | "male" | "neutro";
export type Controllo = Readonly<{
    chiave: string;
    nome: string;
    esito: Esito;
    dettaglio: string;
    spiegazione: string;
}>;
export type Risultato = Readonly<{
    url: string;
    punteggio: number;
    giudizio: string;
    controlli: readonly Controllo[];
    controllatoIl: string;
}>;
export type Chiamata = (url: string, init?: RequestInit) => Promise<Response>;
export declare const ROBOT_CHE_RISPONDONO: readonly ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot", "Claude-User", "ChatGPT-User"];
export declare const ROBOT_CHE_SI_ADDESTRANO: readonly ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Bytespider", "Applebot-Extended"];
export declare const SPIEGAZIONI: Record<string, string>;
/** I robot bloccati (Disallow: /) fra quelli indicati, guardando i blocchi User-agent per nome. */
export declare function robotBloccati(robots: string, robotDaControllare: readonly string[]): readonly string[];
/** Il contenuto di un meta, rispettando il tipo di virgolette usato (dentro può esserci l'apostrofo). */
export declare function meta(html: string, nome: string): string | null;
/** I tipi dichiarati nei blocchi JSON-LD, anche quando @type è una lista o gli oggetti stanno in @graph. */
export declare function tipiJsonLd(html: string): readonly string[];
export declare function analizzaHome(html: string): readonly Controllo[];
export declare function giudizio(punteggio: number): string;
/** Il controllo completo di un sito. `sito` può essere un dominio o un URL. */
export declare function controlla(sito: string, chiama?: Chiamata): Promise<Risultato>;
