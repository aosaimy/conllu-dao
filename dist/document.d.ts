import { ConlluSentence } from "./sentence";
import { ConlluElement } from "./element";
export declare class ConlluDocument {
    sentences: ConlluSentence[];
    config: {
        alltags: any;
        debug?: boolean;
        mapTagToXpostag?: boolean;
        mapTagToUpostag?: boolean;
    };
    id: string;
    error: boolean;
    strict: boolean;
    private issues;
    logger: (str: string) => void;
    constructor(config: any, id?: string);
    getInfo(): any;
    mapTagToXpostag(from: any): any;
    fixSentenceIds(): void;
    mapTagToUpostag(from: any, from_ud: any): any;
    reset(): void;
    getElement(ref: any): ConlluElement | null;
    getElementLine(element: ConlluElement, sentence: ConlluSentence): number;
    log(message: any): void;
    logError(message: any): void;
    toConllU(): string;
    parse(input: any, logger?: (s: string) => void, strict?: boolean): this;
    validate(): string[];
    find(creteria: any): any;
    toBrat(logger: any, includeEmpty: any): {};
}
