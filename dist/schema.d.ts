/**
 * Dati strutturati letti per davvero: JSON-LD (anche @type in lista e @graph),
 * microdata (itemtype/itemprop), e la scheda dell'attività validata campo per campo.
 */
import type { Controllo } from "./tipi.js";
export type Nodo = Readonly<Record<string, unknown>>;
export type DatiStrutturati = Readonly<{
    nodi: readonly Nodo[];
    tipi: readonly string[];
    blocchiRotti: number;
    microdata: readonly string[];
}>;
export declare function tipiDi(n: Nodo): readonly string[];
export declare function leggiDatiStrutturati(html: string): DatiStrutturati;
/** I campi che contano nella scheda dell'attività, e quali mancano. */
export declare function campiAttivita(n: Nodo): {
    presenti: string[];
    mancanti: string[];
};
export declare function controllaDatiStrutturati(html: string): readonly Controllo[];
