const VALORE = { bene: 1, neutro: 0.5, male: 0 };
export function punteggio(controlli) {
    const pesoTotale = controlli.reduce((a, c) => a + c.peso, 0);
    if (pesoTotale === 0)
        return 0;
    return Math.round((controlli.reduce((a, c) => a + VALORE[c.esito] * c.peso, 0) / pesoTotale) * 100);
}
export function giudizio(p, bloccante) {
    if (bloccante)
        return "Le AI non riescono a leggere il tuo sito.";
    if (p >= 85)
        return "Le AI leggono bene il tuo sito.";
    if (p >= 60)
        return "Le AI leggono il tuo sito, ma qualcosa manca.";
    return "Le AI fanno fatica a capire il tuo sito.";
}
/** Un controllo decisivo in rosso: il resto conta poco. */
export function bloccante(controlli) {
    return controlli.some((c) => c.peso === 3 && c.esito === "male" && ["raggiungibile", "antibot", "motori", "noindex", "robots"].includes(c.chiave) && !c.pagina);
}
const ORDINE = { male: 0, neutro: 1, bene: 2 };
/** Cosa è cambiato fra due controlli dello stesso sito. */
export function confronta(prima, dopo) {
    const a = new Map((prima?.controlli ?? []).filter((c) => !c.pagina).map((c) => [c.chiave, c]));
    const b = new Map(dopo.controlli.filter((c) => !c.pagina).map((c) => [c.chiave, c]));
    const diff = [];
    for (const [chiave, c] of b) {
        const p = a.get(chiave);
        if (!p) {
            if (prima)
                diff.push({ chiave, nome: c.nome, prima: null, dopo: c.esito, verso: "nuovo" });
            continue;
        }
        if (p.esito !== c.esito)
            diff.push({ chiave, nome: c.nome, prima: p.esito, dopo: c.esito, verso: ORDINE[c.esito] > ORDINE[p.esito] ? "meglio" : "peggio" });
    }
    for (const [chiave, p] of a)
        if (!b.has(chiave))
            diff.push({ chiave, nome: p.nome, prima: p.esito, dopo: null, verso: "sparito" });
    return diff;
}
