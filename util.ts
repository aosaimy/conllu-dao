import {ConlluSentence}  from "./sentence"
import {ConlluElement} from "./element"
import {ConlluDocument} from "./document"

export class Util {
    static repairFields = function(fields, logger) {
        if (logger === undefined) {
            logger = Util.nullLogger;
        }
        if (fields.length > 10) {
            logger('repair: discarding fields > 10');
            fields = fields.slice(0, 10);
        } else {
            logger('repair: filling in empty ("_") for missing fields');
            for (let m = 0; m < 10 - fields.length; m++) {
                fields.push('_');
            }
        }
    };

    static strictFieldSplitter = function(line) {
        // strict CoNLL format parsing: only split on TAB, no extra space.
        if (line.length === 0) {
            return [];
        } else {
            return line.split('\t');
        }
    }

    static looseFieldSplitter = function(line) {
        // loose CoNLL format parsing: split on any space sequence, trim
        // surrounding space.
        line = line.trim();
        if (line.length === 0) {
            return [];
        } else {
            return line.split(/\s+/);
        }
    }

    static selectParsingMode = function(conll, log) {
        // return whether to use strict mode parsing

        // very simple heuristic: any TABs in the input trigger
        // strict parsing, loose only if none present.
        if (conll.indexOf('\t') !== -1) {
            // log('note: TAB found, parsing CoNLL-U in strict mode.')
            return true;
        } else {
            log('note: no TAB found, parsing CoNLL-U in loose mode.')
            return false;
        }
    };

    static selectFieldSplitter = function(conll, log, strict) {
        // return function to use for dividing lines into fields.
        if (strict) {
            return Util.strictFieldSplitter;
        } else {
            return Util.looseFieldSplitter;
        }
    };

    static isComment = function(line) {
        return line.length !== 0 && line[0] === '#';
    };

    static hasSpace = function(s) {
        return !!s.match(/\s/);
    };

    static nullLogger = function(message) {
        return null;
    }

    /*
     * Return true iff given string only contains characters from a
     * right-to-left Unicode block and is not empty.
     */
    static isRtl = function(s) {
        // range from http://stackoverflow.com/a/14824756
        return !!s.match(/^[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]+$/);
    };

    /*
     * Return given token with possible modifications to accommodate
     * issues in brat rendering of right-to-left text
     * (https://github.com/UniversalDependencies/docs/issues/52)
     */
    static rtlFix = function(s) {
        var prefix = '\u02D1',
            suffix = '\u02D1';
        if (Util.isRtl(s)) {
            s = prefix + s + suffix;
        }
        return s;
    };

    /*
     * Return a deep copy of the given object. Note: not particularly
     * efficient, and all fields must be serializable for this to work
     * correctly.
     */
    static deepCopy = function(o) {
        return JSON.parse(JSON.stringify(o));
    };

    static isTatweel(first, second) {
      if (!first || !second)
        return false
      if (first == "ـ" && second == "ـ")
        return false
      if ("دذاءؤرىةإأآو_".indexOf(first) >= 0)
        return false
      else if ("ء_".indexOf(second) >= 0)
        return false
      else {
        return true
      }
    }
    /*
     * Regular expressions for various parts of the format.
     * See https://github.com/UniversalDependencies/docs/issues/33
     */

    // match single (feature, value[s]) pair in FEATS
    static featureRegex = /^([A-Z0-9][a-zA-Z0-9]*(?:\[[a-z0-9]+\])?)=(_|[A-Z0-9][a-zA-Z0-9]*(?:,[A-Z0-9][a-zA-Z0-9]*)*)$/;

    // match single feature value in FEATS
    static featureValueRegex = /^([A-Z0-9][a-zA-Z0-9]*|_)$/;

    // match single (head, deprel) pair in DEPS
    static dependencyRegex = /^(\d+(?:\.\d+)?):(.*)$/;

    static errors : string[] = []
    static reportError(error){
      if(Util.errors.indexOf(error)<0){
        console.error(error)
        Util.errors.push(error)
      }
    }

}
