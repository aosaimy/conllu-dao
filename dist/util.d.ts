export declare class Util {
    static repairFields: (fields: any, logger: any) => void;
    static strictFieldSplitter: (line: any) => any;
    static looseFieldSplitter: (line: any) => any;
    static selectParsingMode: (conll: any, log: any) => boolean;
    static selectFieldSplitter: (conll: any, log: any, strict: any) => (line: any) => any;
    static isComment: (line: any) => boolean;
    static hasSpace: (s: any) => boolean;
    static nullLogger: (message: any) => null;
    static isRtl: (s: any) => boolean;
    static rtlFix: (s: any) => any;
    static deepCopy: (o: any) => any;
    static isTatweel(first: any, second: any): boolean;
    static featureRegex: RegExp;
    static featureValueRegex: RegExp;
    static dependencyRegex: RegExp;
    static errors: string[];
    static reportError(error: any): void;
}
