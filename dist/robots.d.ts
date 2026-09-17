/**
 * robots.txt letto come lo leggono i robot: gruppi con più User-agent,
 * Allow che riapre, blocco * per chi non ha il suo, commenti, \r\n,
 * maiuscole miste. E i robot delle AI divisi in famiglie, con la data
 * dell'elenco: va rivisto ogni tre mesi.
 */
export declare const ELENCO_ROBOT_AGGIORNATO_IL = "2026-09-17";
/** Chi RISPONDE alle domande delle persone: porta citazioni e visite. Bloccarlo è un problema. */
export declare const ROBOT_CHE_RISPONDONO: readonly ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "YouBot", "MistralAI-User"];
/** Chi si ADDESTRA sui testi: non porta nessuno. Bloccarlo è una scelta. */
export declare const ROBOT_CHE_SI_ADDESTRANO: readonly ["GPTBot", "ClaudeBot", "CCBot", "Bytespider", "Applebot-Extended", "omgili", "Diffbot", "cohere-ai", "anthropic-ai", "Meta-ExternalFetcher"];
/** Google-Extended: governa Gemini e le risposte AI di Google con fonti. A metà strada: bloccarlo costa visibilità su Gemini. */
export declare const ROBOT_GOOGLE_AI: readonly ["Google-Extended"];
/** I motori classici, che oggi alimentano anche le risposte AI (AI Overview, Copilot). Bloccarli è grave. */
export declare const MOTORI: readonly ["Googlebot", "Bingbot"];
type Regola = Readonly<{
    tipo: "allow" | "disallow";
    percorso: string;
}>;
type Gruppo = Readonly<{
    agenti: readonly string[];
    regole: readonly Regola[];
}>;
export type Robots = Readonly<{
    gruppi: readonly Gruppo[];
    sitemap: readonly string[];
    righeNonCapite: number;
}>;
export declare function analizzaRobots(testo: string): Robots;
/** Il percorso è permesso a questo robot? Regola più lunga vince; a parità vince Allow (come Google). */
export declare function permesso(robots: Robots, agente: string, percorso?: string): boolean;
/** Fra i robot indicati, quelli a cui la home è vietata. */
export declare function robotBloccati(robots: Robots, elenco: readonly string[], percorso?: string): readonly string[];
export {};
