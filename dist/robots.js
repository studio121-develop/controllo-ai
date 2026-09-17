/**
 * robots.txt letto come lo leggono i robot: gruppi con più User-agent,
 * Allow che riapre, blocco * per chi non ha il suo, commenti, \r\n,
 * maiuscole miste. E i robot delle AI divisi in famiglie, con la data
 * dell'elenco: va rivisto ogni tre mesi.
 */
export const ELENCO_ROBOT_AGGIORNATO_IL = "2026-09-17";
/** Chi RISPONDE alle domande delle persone: porta citazioni e visite. Bloccarlo è un problema. */
export const ROBOT_CHE_RISPONDONO = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "YouBot", "MistralAI-User"];
/** Chi si ADDESTRA sui testi: non porta nessuno. Bloccarlo è una scelta. */
export const ROBOT_CHE_SI_ADDESTRANO = ["GPTBot", "ClaudeBot", "CCBot", "Bytespider", "Applebot-Extended", "omgili", "Diffbot", "cohere-ai", "anthropic-ai", "Meta-ExternalFetcher"];
/** Google-Extended: governa Gemini e le risposte AI di Google con fonti. A metà strada: bloccarlo costa visibilità su Gemini. */
export const ROBOT_GOOGLE_AI = ["Google-Extended"];
/** I motori classici, che oggi alimentano anche le risposte AI (AI Overview, Copilot). Bloccarli è grave. */
export const MOTORI = ["Googlebot", "Bingbot"];
export function analizzaRobots(testo) {
    const gruppi = [];
    const sitemap = [];
    let agenti = [];
    let regole = [];
    let inRegole = false;
    let righeNonCapite = 0;
    const chiudi = () => { if (agenti.length)
        gruppi.push({ agenti, regole }); agenti = []; regole = []; inRegole = false; };
    for (const grezza of testo.split(/\r?\n/)) {
        const riga = grezza.replace(/#.*$/, "").trim();
        if (!riga)
            continue;
        const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(riga);
        if (!m) {
            righeNonCapite++;
            continue;
        }
        const campo = m[1].toLowerCase();
        const valore = m[2].trim();
        if (campo === "user-agent") {
            if (inRegole)
                chiudi();
            agenti.push(valore.toLowerCase());
        }
        else if (campo === "allow" || campo === "disallow") {
            inRegole = true;
            if (agenti.length)
                regole.push({ tipo: campo, percorso: valore });
        }
        else if (campo === "sitemap") {
            sitemap.push(valore);
        }
        else if (!["crawl-delay", "host", "noindex", "clean-param"].includes(campo)) {
            righeNonCapite++;
        }
    }
    chiudi();
    return { gruppi, sitemap, righeNonCapite };
}
function gruppoPer(robots, agente) {
    const nome = agente.toLowerCase();
    /* il gruppo più specifico: nome intero, poi prefisso, poi * */
    const esatto = robots.gruppi.find((g) => g.agenti.includes(nome));
    if (esatto)
        return esatto;
    const prefisso = robots.gruppi.find((g) => g.agenti.some((a) => a !== "*" && (nome.startsWith(a) || a.startsWith(nome))));
    if (prefisso)
        return prefisso;
    return robots.gruppi.find((g) => g.agenti.includes("*")) ?? null;
}
function corrisponde(percorso, regola) {
    if (regola === "")
        return false;
    const ancorata = regola.endsWith("$");
    const pulita = ancorata ? regola.slice(0, -1) : regola;
    const re = new RegExp("^" + pulita.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (ancorata ? "$" : ""));
    return re.test(percorso);
}
/** Il percorso è permesso a questo robot? Regola più lunga vince; a parità vince Allow (come Google). */
export function permesso(robots, agente, percorso = "/") {
    const g = gruppoPer(robots, agente);
    if (!g)
        return true;
    let migliore = null;
    for (const r of g.regole) {
        if (!corrisponde(percorso, r.percorso))
            continue;
        if (!migliore || r.percorso.length > migliore.percorso.length || (r.percorso.length === migliore.percorso.length && r.tipo === "allow"))
            migliore = r;
    }
    return !migliore || migliore.tipo === "allow";
}
/** Fra i robot indicati, quelli a cui la home è vietata. */
export function robotBloccati(robots, elenco, percorso = "/") {
    return elenco.filter((r) => !permesso(robots, r, percorso));
}
