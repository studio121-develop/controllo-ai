import { controllo } from "./pagina.js";
const TIPI_ATTIVITA = /^(Organization|LocalBusiness|ProfessionalService|Store|Restaurant|Dentist|Attorney|Hotel|Corporation|NGO|EducationalOrganization|MedicalOrganization|.*Business|.*Store|.*Service|.*Shop|.*Agency|.*Salon|.*Clinic)$/;
function nodiDa(valore, raccolti) {
    if (Array.isArray(valore))
        return valore.forEach((v) => nodiDa(v, raccolti));
    if (!valore || typeof valore !== "object")
        return;
    const o = valore;
    if (o["@type"])
        raccolti.push(o);
    if (o["@graph"])
        nodiDa(o["@graph"], raccolti);
    for (const [k, v] of Object.entries(o))
        if (k !== "@graph" && v && typeof v === "object")
            nodiDa(v, raccolti);
}
export function tipiDi(n) {
    const t = n["@type"];
    return typeof t === "string" ? [t] : Array.isArray(t) ? t.filter((x) => typeof x === "string") : [];
}
export function leggiDatiStrutturati(html) {
    const nodi = [];
    let blocchiRotti = 0;
    for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            nodiDa(JSON.parse((m[1] ?? "").trim()), nodi);
        }
        catch {
            blocchiRotti++;
        }
    }
    const microdata = [...html.matchAll(/itemtype=["']https?:\/\/schema\.org\/([A-Za-z]+)["']/gi)].map((m) => m[1]);
    return { nodi, tipi: nodi.flatMap(tipiDi), blocchiRotti, microdata };
}
function testoDi(v) {
    if (typeof v === "string" && v.trim())
        return v.trim();
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v;
        for (const k of ["name", "@id", "streetAddress", "addressLocality"])
            if (typeof o[k] === "string" && o[k].trim())
                return o[k];
    }
    return null;
}
/** I campi che contano nella scheda dell'attività, e quali mancano. */
export function campiAttivita(n) {
    const indirizzo = n.address && typeof n.address === "object" ? n.address : null;
    const citta = indirizzo ? testoDi(indirizzo.addressLocality) : typeof n.address === "string" ? n.address : null;
    const voci = [
        ["nome", !!testoDi(n.name)],
        ["indirizzo", !!indirizzo && !!testoDi(indirizzo.streetAddress)],
        ["città", !!citta],
        ["telefono", !!testoDi(n.telephone)],
        ["sito", !!testoDi(n.url)],
        ["profili social o scheda Google (sameAs)", Array.isArray(n.sameAs) ? n.sameAs.length > 0 : !!testoDi(n.sameAs)],
    ];
    return { presenti: voci.filter(([, ok]) => ok).map(([k]) => k), mancanti: voci.filter(([, ok]) => !ok).map(([k]) => k) };
}
export function controllaDatiStrutturati(html) {
    const d = leggiDatiStrutturati(html);
    const attivita = d.nodi.find((n) => tipiDi(n).some((t) => TIPI_ATTIVITA.test(t))) ?? null;
    const tipoAttivita = attivita ? tipiDi(attivita).find((t) => TIPI_ATTIVITA.test(t)) ?? null : null;
    const microAttivita = d.microdata.find((t) => TIPI_ATTIVITA.test(t)) ?? null;
    const c = [];
    if (attivita) {
        c.push(controllo("schema", "Dati strutturati sull'attività", "bene", `presenti (${tipoAttivita})${d.blocchiRotti ? `, ma ${d.blocchiRotti} ${d.blocchiRotti === 1 ? "blocco è" : "blocchi sono"} scritto male e viene ignorato` : ""}`));
        const campi = campiAttivita(attivita);
        c.push(controllo("schemaCampi", "La scheda dell'attività è completa", campi.mancanti.length === 0 ? "bene" : campi.mancanti.length <= 2 ? "neutro" : "male", campi.mancanti.length === 0 ? `nome, indirizzo, città, telefono, sito e profili: tutto presente` : `manca: ${campi.mancanti.join(", ")}`));
    }
    else if (microAttivita) {
        c.push(controllo("schema", "Dati strutturati sull'attività", "neutro", `presenti come microdata (${microAttivita}): funzionano, ma il formato JSON-LD è quello che le AI leggono meglio`));
    }
    else if (d.tipi.length || d.microdata.length) {
        c.push(controllo("schema", "Dati strutturati sull'attività", "neutro", `presenti (${[...new Set([...d.tipi, ...d.microdata])].slice(0, 3).join(", ")}), ma senza la scheda dell'attività`));
    }
    else {
        c.push(controllo("schema", "Dati strutturati sull'attività", "male", d.blocchiRotti ? `${d.blocchiRotti} ${d.blocchiRotti === 1 ? "blocco presente ma scritto male" : "blocchi presenti ma scritti male"}: vengono ignorati` : "assenti: le AI non trovano nome, indirizzo e cosa fai in forma leggibile"));
    }
    return c;
}
/** Domande e risposte in una pagina: col markup FAQPage (qualunque nome abbia la pagina) o almeno tre titoli che sono domande. */
export function domandeERisposte(html) {
    const d = leggiDatiStrutturati(html);
    const markup = d.tipi.includes("FAQPage") || d.microdata.includes("FAQPage");
    const titoli = [...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
    return { markup, titoliDomanda: titoli.filter((t) => /\?\s*$/.test(t) && t.length > 8).length };
}
