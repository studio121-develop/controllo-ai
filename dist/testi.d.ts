/** Le parole del controllo: perché conta (per chi non è tecnico), cosa fare (per chi cura il sito), quanto pesa. */
import type { Peso } from "./tipi.js";
export declare const SPIEGAZIONI: Record<string, string>;
export declare const SOLUZIONI: Record<string, string>;
/** Data dell'ultima verifica delle fonti. */
export declare const FONTI_VERIFICATE_IL = "2026-09-18";
/** Su cosa poggia ogni controllo. «documentato» = fonte pubblica del produttore; «dedotto» = buona pratica, nessuna AI dichiara di usarla. */
export declare const FONTI: Record<string, {
    base: "documentato" | "dedotto";
    fonte: string;
}>;
export declare const PESI: Record<string, Peso>;
