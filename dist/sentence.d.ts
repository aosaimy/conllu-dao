import { ConlluElement } from "./element";
import { ConlluDocument } from "./document";
export declare class ConlluSentence {
    _id: number;
    id: string | number;
    document: ConlluDocument;
    elements: ConlluElement[];
    comments: any[];
    baseOffset: number;
    private issues;
    tag: string;
    error: boolean;
    constructor(sentenceId: any, elements: ConlluElement[] | undefined, comments: never[] | undefined, document: any);
    refix(keepParentRelations?: boolean): this;
    getText(): string;
    toConllU(lines?: string[]): string[];
    setBaseOffset(baseOffset: any): void;
    dependencies(): string[][];
    words(includeEmpty: boolean): ConlluElement[];
    multiwords(): ConlluElement[];
    tokens(): ConlluElement[];
    bratWords(includeEmpty: any): ConlluElement[];
    bratTokens(): ConlluElement[];
    bratText(includeEmpty: any): string;
    bratSpans(includeEmpty: any): any[][];
    bratAttributes(includeEmpty: any): any[];
    bratRelations(includeEmpty: any): any[];
    bratComments(includeEmpty: any): any[];
    bratStyles(includeEmpty: any): any[][];
    bratLabel(): null;
    toBrat(includeEmpty: any): {
        'text': string;
        'entities': any[][];
        'attributes': any[];
        'relations': any[];
        'comments': any[];
        'styles': any[][];
        'sentlabels': null[];
    };
    elementById(): {};
    addError(issue: any, element: any): void;
    validate(): string[];
    validateParentAndChildren(): void;
    validateUniqueIds(): boolean;
    validateWordSequence(): boolean;
    validateMultiwordSequence(): boolean;
    validateEmptyNodeSequence(): boolean;
    validateReferences(): boolean;
    repair(log: any): boolean;
    repairUniqueIds(log: any): boolean;
    repairWordSequence(log: any): boolean;
    repairMultiwordSequence(log: any): boolean;
    repairEmptyNodeSequence(log: any): boolean;
    repairReferences(log: any): boolean;
    joinNextSentence(): void;
    newSentenceAt(cond: any): ConlluSentence;
}
