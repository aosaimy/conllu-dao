import { ConlluSentence } from "./sentence";
export declare class ConlluElement {
    _id: string;
    id: string;
    form: string;
    lemma: string;
    upostag: string;
    _xpostag: string;
    private issues;
    xpostag: string;
    head: string;
    deprel: string;
    deps: string;
    _miscs: {};
    misc: string;
    lineidx: string;
    line: string;
    isSeg: number;
    parent: ConlluElement | null;
    children: ConlluElement[];
    features: {
        key: string;
        value: string;
    }[];
    feats: string;
    sentence: ConlluSentence;
    analysis: ConlluElement[];
    constructor(fields: any, lineidx: any, line: any, sentence: any);
    setFeature(key: any, value: any): void;
    copy(from: any): void;
    getContext(span?: number): ConlluElement[];
    isSameAs(element: ConlluElement): boolean;
    copyMorphInfo(from: any): void;
    morphFeatsMissing(): any;
    changeWith(el: any): any;
    clone(): ConlluElement;
    toConllU(includeId?: boolean, includeChildren?: boolean): any;
    validateField(field: any, name?: string, allowSpace?: boolean): boolean;
    getForm(): string;
    validateId(id: any): boolean;
    validateForm(form: any): boolean;
    validateLemma(lemma: any): boolean;
    validateUpostag(upostag: any): boolean;
    validateXpostag(xpostag: any): boolean;
    validateFeats(feats: any): boolean;
    validateHead(head: any): boolean;
    validateDeprel(deprel: any): boolean;
    validateDeps(deps: any): boolean;
    validateMisc(misc: any): boolean;
    validHeadReference(elementById: any): boolean;
    isWord(): boolean;
    isMultiword: boolean;
    _isMultiword(): boolean;
    isEmptyNode(): boolean;
    rangeFrom(): number;
    rangeTo(): number;
    isToken(inRange: any): boolean;
    dependencies(skipHead?: boolean): string[][];
    validate(): string[];
    repair(log: any): boolean;
}