import { ConlluSentence } from "./sentence";
import { ConlluElement } from "./element";
export declare class ConlluDocument {
    sentences: ConlluSentence[];
    config: {
        alltags: any;
        debug?: boolean;
    };
    id: string;
    error: boolean;
    strict: boolean;
    private issues;
    logger: (str: string) => void;
    constructor(config: any, id?: string);
    mapTagToXpostag(from: any): any;
    fixSentenceIds(): void;
    mapTagToUpostag(from: any, from_ud: any): any;
    reset(): void;
    getElement(ref: any): ConlluElement | null;
    getElementLine(element: ConlluElement, sentence: ConlluSentence): number;
    log(message: any): void;
    logError(message: any): void;
    toConllU(): string;
    parse(input: any, logger: any, strict: any): this;
    validate(): void;
    find(creteria: any): any;
    toBrat(logger: any, includeEmpty: any): {};
}
