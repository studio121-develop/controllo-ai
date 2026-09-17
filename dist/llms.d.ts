/** llms.txt: presente non basta. Deve essere Markdown vero, con un titolo, una frase e link che rispondono. */
import type { Lettura } from "./rete.js";
export type EsameLlms = Readonly<{
    presente: boolean;
    valido: boolean;
    motivo: string;
    link: readonly string[];
}>;
export declare function esaminaLlms(l: Lettura): EsameLlms;
