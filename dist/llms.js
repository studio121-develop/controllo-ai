export function esaminaLlms(l) {
    if (l.stato !== 200 || !l.corpo.trim())
        return { presente: false, valido: false, motivo: "assente: facoltativo, ma aiuta le AI a capire il sito", link: [] };
    const corpo = l.corpo.trim();
    if (/^\s*<!doctype|^\s*<html/i.test(corpo) || /text\/html/i.test(l.intestazioni["content-type"] ?? "") && corpo.startsWith("<"))
        return { presente: true, valido: false, motivo: "risponde una pagina HTML (di solito la 404 travestita da 200), non un file di testo", link: [] };
    const titolo = /^#\s+\S/m.test(corpo);
    const frase = /^>\s+\S|^[A-Za-zÀ-ú][^\n]{40,}$/m.test(corpo);
    const link = [...corpo.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
    if (!titolo)
        return { presente: true, valido: false, motivo: "presente, ma senza il titolo «# Nome» in cima: le AI non sanno di chi è", link };
    if (!frase)
        return { presente: true, valido: false, motivo: "presente, ma senza una frase che dica cosa fate", link };
    if (link.length === 0)
        return { presente: true, valido: false, motivo: "presente, ma senza link alle pagine principali", link };
    return { presente: true, valido: true, motivo: `presente e ben fatto (${link.length} ${link.length === 1 ? "link" : "link"})`, link };
}
