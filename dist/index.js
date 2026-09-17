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
/* Due famiglie: chi RISPONDE (porta citazioni e visite) e chi si ADDESTRA (non porta nessuno). */
export const ROBOT_CHE_RISPONDONO = ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot", "Claude-User", "ChatGPT-User"];
export const ROBOT_CHE_SI_ADDESTRANO = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Bytespider", "Applebot-Extended"];
const TIPI_ATTIVITA = /^(Organization|LocalBusiness|ProfessionalService|Store|Restaurant|Dentist|Attorney|Hotel|MedicalBusiness|AutoRepair|HomeAndConstructionBusiness|FoodEstablishment|LodgingBusiness|Corporation|.*Business|.*Store|.*Service)$/;
export const SPIEGAZIONI = {
    robots: "Se il sito chiude la porta ai programmi che rispondono alle domande, ChatGPT e simili non possono leggerlo e non ti citano.",
    llms: "Un file che riassume alle AI chi sei e cosa fai. Non obbligatorio, ma aiuta.",
    titolo: "Il titolo della pagina è la prima cosa che le AI e Google leggono.",
    descrizione: "Due righe che dicono cosa fai: senza, le AI devono indovinare.",
    h1: "Un titolo principale chiaro dice subito di cosa parla la pagina.",
    schema: "Una scheda invisibile con nome, indirizzo e attività, scritta nel modo che le AI capiscono.",
    lingua: "Dichiarare la lingua del sito evita risposte in lingue sbagliate.",
    home: "La pagina principale deve rispondere, altrimenti nessuno legge niente.",
};
function controllo(chiave, nome, esito, dettaglio) {
    return { chiave, nome, esito, dettaglio, spiegazione: SPIEGAZIONI[chiave] ?? "" };
}
/** I robot bloccati (Disallow: /) fra quelli indicati, guardando i blocchi User-agent per nome. */
export function robotBloccati(robots, robotDaControllare) {
    const blocchi = robots.split(/\n(?=\s*user-agent:)/i);
    return robotDaControllare.filter((robot) => blocchi.some((b) => {
        const righe = b.split("\n").map((r) => r.trim().toLowerCase());
        const perQuesto = righe.some((r) => r.replace(/\s+/g, "") === `user-agent:${robot.toLowerCase()}`);
        return perQuesto && righe.some((r) => /^disallow:\s*\/\s*$/.test(r));
    }));
}
/** Il contenuto di un meta, rispettando il tipo di virgolette usato (dentro può esserci l'apostrofo). */
export function meta(html, nome) {
    const prima = new RegExp(`<meta[^>]+(?:name|property)=["']${nome}["'][^>]*content=("|')(.*?)\\1`, "i").exec(html);
    const dopo = new RegExp(`<meta[^>]+content=("|')(.*?)\\1[^>]*(?:name|property)=["']${nome}["']`, "i").exec(html);
    return (prima?.[2] ?? dopo?.[2])?.trim() || null;
}
/** I tipi dichiarati nei blocchi JSON-LD, anche quando @type è una lista o gli oggetti stanno in @graph. */
export function tipiJsonLd(html) {
    const tipi = [];
    const raccogli = (nodo) => {
        if (Array.isArray(nodo))
            return nodo.forEach(raccogli);
        if (!nodo || typeof nodo !== "object")
            return;
        const o = nodo;
        const t = o["@type"];
        if (typeof t === "string")
            tipi.push(t);
        if (Array.isArray(t))
            t.forEach((x) => typeof x === "string" && tipi.push(x));
        if (o["@graph"])
            raccogli(o["@graph"]);
    };
    for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            raccogli(JSON.parse(m[1] ?? ""));
        }
        catch { /* blocco malformato: si ignora */ }
    }
    return tipi;
}
export function analizzaHome(html) {
    const titolo = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
    const descrizione = meta(html, "description");
    const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
    const tipi = tipiJsonLd(html);
    const attivita = tipi.find((t) => TIPI_ATTIVITA.test(t)) ?? null;
    const lang = /<html[^>]+lang=["']([a-zA-Z-]+)["']/i.exec(html)?.[1] ?? null;
    return [
        controllo("titolo", "La pagina ha un titolo chiaro", titolo.length >= 15 && titolo.length <= 70 ? "bene" : titolo ? "neutro" : "male", titolo ? `«${titolo}»${titolo.length > 70 ? " (lungo: Google lo taglia)" : titolo.length < 15 ? " (corto)" : ""}` : "manca il titolo"),
        controllo("descrizione", "C'è una descrizione di cosa fai", descrizione && descrizione.length >= 50 ? "bene" : descrizione ? "neutro" : "male", descrizione ? `${descrizione.length} caratteri${descrizione.length < 50 ? ": troppo corta" : ""}` : "manca la descrizione"),
        controllo("h1", "Un titolo principale nella pagina", h1 === 1 ? "bene" : h1 === 0 ? "male" : "neutro", h1 === 1 ? "uno, come deve essere" : h1 === 0 ? "nessuno" : `${h1} titoli principali: meglio uno`),
        controllo("schema", "Dati strutturati sull'attività", attivita ? "bene" : tipi.length ? "neutro" : "male", attivita ? `presenti (${attivita})` : tipi.length ? `presenti (${[...new Set(tipi)].slice(0, 3).join(", ")}), ma senza la scheda dell'attività` : "assenti: le AI non trovano nome, indirizzo e cosa fai in forma leggibile"),
        controllo("lingua", "La lingua della pagina è dichiarata", lang ? "bene" : "male", lang ?? "non dichiarata"),
    ];
}
async function testo(chiama, url) {
    try {
        const r = await chiama(url, { headers: { "User-Agent": "controllo-ai/1.0 (Studio 121)" }, signal: AbortSignal.timeout(15_000), redirect: "follow" });
        return { stato: r.status, corpo: r.ok ? (await r.text()).slice(0, 500_000) : "" };
    }
    catch {
        return { stato: 0, corpo: "" };
    }
}
export function giudizio(punteggio) {
    return punteggio >= 85 ? "Le AI leggono bene il tuo sito." : punteggio >= 60 ? "Le AI leggono il tuo sito, ma qualcosa manca." : "Le AI fanno fatica a capire il tuo sito.";
}
/** Il controllo completo di un sito. `sito` può essere un dominio o un URL. */
export async function controlla(sito, chiama = (u, i) => fetch(u, i)) {
    const base = `https://${sito.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`;
    const [home, robots, llms] = await Promise.all([testo(chiama, `${base}/`), testo(chiama, `${base}/robots.txt`), testo(chiama, `${base}/llms.txt`)]);
    const bloccatiRispondono = robotBloccati(robots.corpo, ROBOT_CHE_RISPONDONO);
    const bloccatiAddestrano = robotBloccati(robots.corpo, ROBOT_CHE_SI_ADDESTRANO);
    const dettaglioRobots = robots.stato !== 200
        ? "file robots.txt assente: le AI leggono tutto"
        : bloccatiRispondono.length
            ? `bloccati i programmi che rispondono alle domande: ${bloccatiRispondono.join(", ")}`
            : bloccatiAddestrano.length
                ? `le AI che rispondono possono entrare; restano fuori solo quelle che si addestrano (${bloccatiAddestrano.join(", ")}), per scelta`
                : "tutte le AI possono entrare";
    const controlli = [
        controllo("robots", "Le AI possono leggere il sito", robots.stato === 200 ? (bloccatiRispondono.length ? "male" : "bene") : "neutro", dettaglioRobots),
        controllo("llms", "C'è una guida per le AI (llms.txt)", llms.stato === 200 && llms.corpo.length > 50 ? "bene" : "neutro", llms.stato === 200 ? "presente" : "assente: facoltativa, ma aiuta le AI a capire il sito"),
        ...(home.corpo ? analizzaHome(home.corpo) : [controllo("home", "La pagina principale risponde", "male", `non raggiungibile (HTTP ${home.stato})`)]),
    ];
    const bene = controlli.filter((c) => c.esito === "bene").length;
    const punteggio = Math.round((bene / controlli.length) * 100);
    return { url: base, punteggio, giudizio: giudizio(punteggio), controlli, controllatoIl: new Date().toISOString() };
}
