import { controlla } from "./index.js";
const LUCE = { bene: "🟢", male: "🔴", neutro: "🟡" };
export async function main(argv) {
    const sito = argv.find((a) => !a.startsWith("--"));
    if (!sito) {
        console.error("uso: controllo-ai <dominio|url> [--json]");
        return 2;
    }
    const r = await controlla(sito);
    if (argv.includes("--json")) {
        console.log(JSON.stringify(r, null, 2));
        return 0;
    }
    console.log(`${r.url} — ${r.punteggio} su 100 — ${r.giudizio}\n`);
    for (const c of r.controlli)
        console.log(`${LUCE[c.esito]} ${c.nome}\n   ${c.dettaglio}${c.esito !== "bene" ? `\n   ${c.spiegazione}` : ""}`);
    return 0;
}
