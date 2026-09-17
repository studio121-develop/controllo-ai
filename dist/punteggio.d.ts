/** Il punteggio: pesato, riproducibile, e il confronto fra due controlli. */
import type { Controllo, Differenza, Risultato } from "./tipi.js";
export declare function punteggio(controlli: readonly Controllo[]): number;
export declare function giudizio(p: number, bloccante: boolean): string;
/** Un controllo decisivo in rosso: il resto conta poco. */
export declare function bloccante(controlli: readonly Controllo[]): boolean;
/** Cosa è cambiato fra due controlli dello stesso sito. */
export declare function confronta(prima: Risultato | null, dopo: Risultato): readonly Differenza[];
