import type { Chiamata, Risultato } from "./tipi.js";
export type Opzioni = Readonly<{
    modalita?: "rapido" | "completo";
    chiama?: Chiamata;
    pagineExtra?: number;
    tempoMs?: number;
}>;
export declare function controlla(sito: string, opzioni?: Opzioni): Promise<Risultato>;
