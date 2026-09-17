/**
 * controllo-ai — il sito è leggibile dalle AI?
 * Punto d'ingresso: `controlla(sito, opzioni)` più i pezzi riusabili.
 */
export { controlla, type Opzioni } from "./controlla.js";
export { confronta, punteggio, giudizio } from "./punteggio.js";
export { analizzaRobots, permesso, robotBloccati, ROBOT_CHE_RISPONDONO, ROBOT_CHE_SI_ADDESTRANO, ROBOT_GOOGLE_AI, MOTORI, ELENCO_ROBOT_AGGIORNATO_IL } from "./robots.js";
export { controllaPagina, leggiMeta, meta, testoVisibile } from "./pagina.js";
export { controllaDatiStrutturati, leggiDatiStrutturati, campiAttivita } from "./schema.js";
export { esaminaLlms } from "./llms.js";
export { leggi, origineDa } from "./rete.js";
export { SPIEGAZIONI, SOLUZIONI, PESI } from "./testi.js";
export type { Controllo, Risultato, Differenza, Esito, Peso, PaginaControllata, Chiamata } from "./tipi.js";
