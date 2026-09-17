# controllo-ai

Il sito è leggibile dalle AI? Sette controlli semplici, un semaforo per riga, un punteggio su 100 e un giudizio in parole. Nessuna dipendenza. Fatto da Studio 121.

Controlla: robots.txt (le AI che rispondono alle domande possono entrare? chi si addestra può restare fuori, è una scelta), llms.txt, titolo, meta description, titolo principale, dati strutturati con la scheda dell'attività, lingua dichiarata.

## Tre modi di usarlo, una sola manutenzione

```bash
# 1. riga di comando
npx github:studio121-develop/controllo-ai studio121.it
npx github:studio121-develop/controllo-ai studio121.it --json

# 2. da un progetto Node
npm install github:studio121-develop/controllo-ai
```
```ts
import { controlla } from "@studio121/controllo-ai";
const r = await controlla("studio121.it");   // { punteggio, giudizio, controlli: [{ chiave, nome, esito, dettaglio, spiegazione }] }
```
```
# 3. servizio web (dopo il deploy su Vercel)
GET https://controllo-ai.vercel.app/api/controlla?url=studio121.it
```

Chi lo usa da Claude Code trova le istruzioni in `SKILL.md`.

## Sviluppo

```bash
npm install && npm run verifica     # typecheck, test, build in dist/
```
`dist/` è versionata: chi installa da GitHub non deve compilare. Dopo ogni modifica a `src/`: `npm run build` e commit anche di `dist/`.
