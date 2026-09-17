import { controlla } from "./controlla.js";

const LUCE = { bene: "🟢", male: "🔴", neutro: "🟡" } as const;

export async function main(argv: readonly string[]): Promise<number> {
  const sito = argv.find((a) => !a.startsWith("--"));
  if (!sito) {
    console.error("uso: controllo-ai <dominio|url> [--rapido] [--json] [--soluzioni]");
    return 2;
  }
  const r = await controlla(sito, { modalita: argv.includes("--rapido") ? "rapido" : "completo" });
  if (argv.includes("--json")) { console.log(JSON.stringify(r, null, 2)); return 0; }
  console.log(`${r.urlFinale} — ${r.punteggio} su 100 — ${r.giudizio}  (${(r.durataMs / 1000).toFixed(1)} s, ${r.modalita})\n`);
  for (const c of r.controlli) {
    console.log(`${LUCE[c.esito]} ${c.nome}\n   ${c.dettaglio}`);
    if (c.esito !== "bene") console.log(`   ${c.spiegazione}${argv.includes("--soluzioni") ? `\n   → ${c.comeRisolvere}` : ""}`);
  }
  const altre = r.pagine.slice(1).filter((p) => p.controlli.some((c) => c.esito !== "bene") || p.stato !== 200);
  if (altre.length) {
    console.log("\nAltre pagine con qualcosa da sistemare:");
    for (const p of altre) console.log(`  ${p.url}${p.stato !== 200 ? ` (HTTP ${p.stato})` : ""}: ${p.controlli.filter((c) => c.esito !== "bene").map((c) => `${LUCE[c.esito]} ${c.nome.toLowerCase()}`).join(", ") || "non leggibile"}`);
  }
  return 0;
}
