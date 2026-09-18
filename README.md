# controllo-ai

> **Beta, in fase di validazione.** Strumento interno di Studio 121. I controlli poggiano su fonti pubbliche dei produttori (OpenAI, Anthropic, Google, Bing, Perplexity) dove esistono, e su buone pratiche dove non esistono: ogni controllo dichiara quale delle due (`base`). Il punteggio è un'indicazione, non una certificazione: nessuna AI pubblica come sceglie cosa citare. Le fonti sono verificate alla data indicata in `src/testi.ts` e possono cambiare.

Il sito è leggibile dalle AI? Venti controlli, un semaforo per riga, un punteggio pesato su 100, un giudizio in parole, e per ogni controllo una spiegazione per chi non è tecnico e una soluzione per chi cura il sito. Nessuna dipendenza. Fatto da Studio 121.

Cosa controlla:
- **Raggiungibilità**: risposta della home, timeout, dominio inesistente, certificato, pagina di manutenzione, sfida anti-bot (Cloudflare e simili), redirect (catene, anelli, cambio di dominio).
- **robots.txt** letto come lo leggono i robot (gruppi, Allow che riapre, blocco `*`, jolly): tre famiglie di robot AI (chi risponde, chi si addestra, Google-Extended) più Googlebot e Bingbot.
- **noindex** nella pagina e nelle intestazioni del server.
- **Pagina principale**: titolo (non solo il nome), descrizione (non generica), un solo h1 testuale, lingua dichiarata e coerente col testo, quantità di testo, sito solo JavaScript, chi sei e dove sei (telefono, email, indirizzo, città), canonical (anche su altro dominio), Open Graph, meta refresh.
- **Dati strutturati**: JSON-LD (anche `@type` in lista e `@graph`) e microdata; scheda dell'attività validata campo per campo; blocchi malformati segnalati; FAQ.
- **llms.txt** valido, non solo presente (titolo, frase, link, non una 404 travestita).
- **Sitemap** e le pagine importanti collegate (fino a 5): titolo, descrizione, h1, noindex, 404. Le pagine legali e quelle che rimandano alla home sono escluse.
- **Si capisce chi c'è dietro**: una pagina che lo racconta (con qualunque nome), oppure i dati dell'attività in home o nella scheda strutturata.

Ogni controllo dichiara su cosa poggia (`base`): **documentato** quando una fonte pubblica del produttore (OpenAI, Anthropic, Google, Bing, Perplexity) lo lega a come le AI leggono o citano; **dedotto** quando è una buona pratica senza fonte diretta (llms.txt, FAQ, Open Graph, h1). I dedotti pesano 1 e nel report sono «consigliati», mai «mancanti». Le fonti sono in `src/testi.ts` (`FONTI`), verificate il 18 settembre 2026.

Modalità `rapido` (solo home, ~1 s) e `completo` (con sitemap e altre pagine, 2-10 s). Non lancia mai: ogni guasto è un controllo con la causa. `confronta(prima, dopo)` dice cosa è cambiato fra due controlli.

## Tre modi di usarlo, una sola manutenzione

```bash
# 1. riga di comando
npx github:studio121-develop/controllo-ai studio121.it
npx github:studio121-develop/controllo-ai studio121.it --json
npx github:studio121-develop/controllo-ai studio121.it --rapido --soluzioni

# 2. da un progetto Node
npm install github:studio121-develop/controllo-ai
```
```ts
import { controlla } from "@studio121/controllo-ai";
const r = await controlla("studio121.it", { modalita: "completo" });
// { punteggio, giudizio, controlli: [{ chiave, nome, esito, dettaglio, spiegazione, comeRisolvere, peso, pagina? }], pagine: [...] }
```
```
# 3. servizio web (dopo il deploy su Vercel)
GET https://studio121-tools.vercel.app/api/controllo-ai/controlla?url=studio121.it[&modalita=rapido]   # in futuro tools.studio121.it
```

Chi lo usa da Claude Code trova le istruzioni in `SKILL.md`.

Su Vercel il progetto si chiama `studio121-tools`: ospita questo e gli strumenti futuri, ognuno sotto `/api/<nome-strumento>/`.

## Sviluppo

```bash
npm install && npm run verifica     # typecheck, test, build in dist/
```
`dist/` è versionata: chi installa da GitHub non deve compilare. Dopo ogni modifica a `src/`: `npm run build` e commit anche di `dist/`.

## Manutenzione

- L'elenco dei robot AI è in `src/robots.ts` con la data (`ELENCO_ROBOT_AGGIORNATO_IL`): rivederlo ogni tre mesi.
- Ogni regola ha un test del caso legittimo (es. bloccare chi si addestra) per non produrre falsi rossi.
- Batteria su siti veri prima di ogni versione: `node bin/controllo-ai.js <dominio>` su un sito statico, uno WordPress, uno multilingua, uno dietro Cloudflare.
