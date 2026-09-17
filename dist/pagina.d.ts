/**
 * Una pagina letta come la leggerebbe un'AI: cosa dice di sé nel <head>,
 * quanto testo ha davvero, se dice chi è e dove sta.
 */
import type { Controllo, Esito } from "./tipi.js";
export declare function controllo(chiave: string, nome: string, esito: Esito, dettaglio: string, pagina?: string): Controllo;
/** Il contenuto di un meta, rispettando il tipo di virgolette usato (dentro può esserci l'apostrofo). */
export declare function meta(html: string, nome: string): string | null;
export declare function titolo(html: string): string;
/** Il testo che una persona vede: via script, style, nav, footer e tag. */
export declare function testoVisibile(html: string): string;
export declare function parole(testo: string): number;
export type ChiEDove = Readonly<{
    telefono: boolean;
    email: boolean;
    indirizzo: boolean;
    cap: boolean;
}>;
export declare function chiEDove(html: string): ChiEDove;
export declare function linguaDelTesto(testo: string): string | null;
export type Meta = Readonly<{
    titolo: string;
    descrizione: string | null;
    h1: readonly string[];
    lang: string | null;
    noindex: boolean;
    canonical: string | null;
    og: {
        titolo: boolean;
        descrizione: boolean;
        immagine: boolean;
    };
    refresh: boolean;
    parole: number;
    testo: string;
    chiEDove: ChiEDove;
    linguaTesto: string | null;
    jsLento: boolean;
}>;
export declare function leggiMeta(html: string): Meta;
/** I controlli sulla pagina. `home` accende quelli che valgono solo per la principale. */
export declare function controllaPagina(html: string, url: string, xRobots: string | null, home: boolean): readonly Controllo[];
