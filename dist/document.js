"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sentence_1 = require("./sentence");
const element_1 = require("./element");
const util_1 = require("./util");
class ConlluDocument {
    // constructor(config, public events: Events=null) {
    constructor(config, id = "") {
        /*
         * ConllU.ConlluDocument: represents CoNLL-U document
         */
        this.sentences = [];
        this.config = { alltags: [] };
        this.id = "";
        this.error = false;
        this.strict = false;
        this.issues = [];
        this.logger = (s) => { };
        if (!config)
            console.error("No config JSON is supplied!");
        this.config = config;
        this.reset();
        this.id = id;
    }
    mapTagToXpostag(from) {
        var f = this.config.alltags.find(x => x.tag == from || x.mapFrom.indexOf(from) >= 0);
        if (f)
            return f.tag;
        util_1.Util.reportError("tag is not mapped to Xpostag: " + from);
        return from;
    }
    fixSentenceIds() {
        this.sentences.forEach((s, i) => {
            // console.log(s)
            let id_i = s.comments.findIndex(c => {
                return c.indexOf("# sent_id") == 0;
            });
            if (id_i >= 0)
                s.comments[id_i] = "# sent_id = " + (i + 1);
            else
                s.comments.push("# sent_id = " + (i + 1));
            s.id = 'S' + (i + 1);
            let text_i = s.comments.findIndex(c => {
                return c.indexOf("# text") == 0;
            });
            if (text_i >= 0)
                s.comments[text_i] = "# text = " + s.getText();
            else
                s.comments.push("# text = " + s.getText());
        });
    }
    mapTagToUpostag(from, from_ud) {
        var f = this.config.alltags.find(x => x.tag == from);
        if (f)
            return f.mapToConllU;
        util_1.Util.reportError("tag is not mapped to Upostag: " + from);
        return from_ud;
    }
    reset() {
        this.sentences = [];
        this.error = false;
        this.logger = function (s) { };
        this.strict = false; // pick heuristically
    }
    ;
    getElement(ref) {
        if (!ref)
            return null;
        ref = ref.split(":");
        let sent = this.sentences.find(x => x.id == ref[0]);
        if (!sent)
            return null;
        let elem = sent.elements.find(x => x.id == ref[1]);
        if (!elem)
            return null;
        // this.events.publish('highlight:change', elem)
        if (elem.isMultiword)
            elem = elem.children[0];
        return elem;
    }
    getElementLine(element, sentence) {
        var counter = 1;
        var result = 0;
        this.sentences.forEach(s => {
            s.elements.forEach(e => {
                if (s.id == sentence.id && e.id == element.id) {
                    result = counter;
                }
                counter++;
            });
            counter++;
        });
        return result;
    }
    log(message) {
        this.logger(message);
    }
    ;
    logError(message) {
        this.log('error: ' + message);
        this.error = true;
    }
    ;
    toConllU() {
        var lines = [];
        for (let sent of this.sentences) {
            sent.toConllU(lines);
            lines.push("");
        }
        return lines.join("\n");
    }
    /* Parse CoNLL-U format, return ConlluDocument.
     * (see http://universaldependencies.github.io/docs/format.html)
     *
     * CoNLL-U files contain three types of lines:
     * 1.  Word lines
     * 2.  Blank lines marking sentence boundaries
     * 3.  Comment lines starting with a hash ("#")
     *
     * Each word line has the following format
     * 1.  ID: Word index, integer starting at 1 for each new sentence;
     *     may be a range for tokens with multiple words; may be a decimal
     *     number for empty nodes.
     * 2.  FORM: Word form or punctuation symbol.
     * 3.  LEMMA: Lemma or stem of word form.
     * 4.  UPOSTAG: Universal part-of-speech tag.
     * 5.  XPOSTAG: Language-specific part-of-speech tag; underscore
     *     if not available.
     * 6.  FEATS: List of morphological features from the Universal
     *     feature inventory or from a defined language-specific extension;
     *      underscore if not available.
     * 7.  HEAD: Head of the current token, which is either a value of ID
     *     or zero (0).
     * 8.  DEPREL: Universal Stanford dependency relation to the HEAD
     *     (root iff HEAD = 0) or a defined language-specific subtype
     *     of one.
     * 9.  DEPS: List of secondary dependencies (head-deprel pairs).
     * 10. MISC: Any other annotation.
     */
    parse(input, logger, strict) {
        // discard previous state, if any
        this.reset();
        if (logger !== undefined) {
            this.logger = logger;
        }
        if (strict !== undefined) {
            this.strict = strict;
        }
        // TODO: handle other newline formats
        var lines = input.split('\n');
        if (!this.strict) {
            this.strict = util_1.Util.selectParsingMode(input, this.logger);
        }
        // select splitter to use for dividing the lines into fields.
        var splitter = util_1.Util.selectFieldSplitter(input, this.logger, this.strict);
        var //elements = [],
        // comments = [],
        beforeConlluSentence = true;
        var sId = 'S' + (this.sentences.length + 1);
        var currentSentence = new sentence_1.ConlluSentence(sId, [], [], this); //, currentSentence.elements, currentSentence.comments);
        for (let idx = 0; idx < lines.length; idx++) {
            var line = lines[idx], that = this;
            var logLineError = function (message) {
                that.logError('line ' + (idx + 1) + ': ' + message + ' ("' + line + '")');
                that.error = true;
            };
            if (util_1.Util.isComment(line)) {
                if (beforeConlluSentence) {
                    currentSentence.comments.push(line);
                }
                else {
                    logLineError('comments must precede sentence, ignoring');
                }
                continue;
            }
            // non-comment, assume inside sentence until terminated by
            // blank line
            beforeConlluSentence = false;
            var fields = splitter(line);
            if (fields.length === 0) {
                // empty line, terminates sentence
                if (currentSentence.elements.length !== 0 || currentSentence.comments.length !== 0) {
                    currentSentence.refix();
                    this.sentences.push(currentSentence);
                    let sId = 'S' + (this.sentences.length + 1);
                    currentSentence = new sentence_1.ConlluSentence(sId, [], [], this); //, currentSentence.elements, currentSentence.comments);
                    // this.sentences.push(sentence);
                }
                else {
                    if (this.config.debug)
                        logLineError('empty sentence, ignoring');
                }
                // reset
                // elements = [];
                // comments = [];
                beforeConlluSentence = true;
                continue;
            }
            if (fields.length !== 10) {
                logLineError('expected 10 fields, got ' + fields.length);
                util_1.Util.repairFields(fields, this.logger);
            }
            var element = new element_1.ConlluElement(fields, idx, line, currentSentence);
            let issues = element.validate();
            issues.forEach(v => logLineError(v));
            if (issues.length !== 0) {
                if (!element.repair(this.logger)) {
                    logLineError('repair failed, discarding line');
                    continue; // failed, ignore line
                }
            }
            let ar = element.id.split("-");
            if (ar[0] != ar[1])
                currentSentence.elements.push(element);
        }
        // If elements is non-empty, last sentence ended without its
        // expected terminating empty line. Process, but warn if strict.
        // if (elements.length !== 0) {
        //     if (this.strict) {
        //         this.logError('missing blank line after last sentence');
        //     }
        //     var sId = 'S' + (this.sentences.length + 1);
        //     var sentence = new ConlluSentence(sId, elements, comments);
        //     sentence.document = this;
        //     this.sentences.push(sentence);
        //     // reset
        //     elements = [];
        //     comments = [];
        //     beforeConlluSentence = true;
        // }
        // If comments is non-empty, there were comments after the
        // terminating empty line. Warn and discard.
        if (currentSentence.comments.length !== 0 && currentSentence.elements.length == 0) {
            this.logError('comments may not occur after last sentence, ' +
                'ignoring');
        }
        else {
            currentSentence.refix();
            this.sentences.push(currentSentence);
        }
        for (let i = 0; i < this.sentences.length; i++) {
            var sentence = this.sentences[i];
            let issues = sentence.validate();
            issues.forEach(v => this.logError(v));
            if (issues.length !== 0) {
                if (!sentence.repair(this.logger)) {
                    this.logError('repair failed, discarding sentence');
                    continue;
                }
            }
        }
        // console.log(this)
        return this;
    }
    validate() {
        this.sentences.forEach(s => s.validate());
    }
    find(creteria) {
        var regExps = ["form", "lemma"]
            .filter(prop => creteria[prop] !== "" && creteria[prop].split("/").length == 3)
            .map(prop => {
            let s = creteria[prop];
            creteria[prop] = "";
            return { "prop": prop, "regexp": new RegExp(s.split("/")[1]) };
        });
        return [].concat.apply([], this.sentences.map(sent => {
            return sent.elements.filter(elem => {
                if (regExps.filter(r => !r.regexp.test(elem[r.prop])).length > 0)
                    return false;
                if (creteria.form !== "" && elem.form != creteria.form && elem.form.replace(/[ًٌٍَُِّْ]/g, "") != creteria.form) {
                    return false;
                }
                if (creteria.xpos !== "" && elem.xpostag != creteria.xpos)
                    return false;
                if (creteria.upos !== "" && elem.upostag != creteria.upos)
                    return false;
                if (creteria.feats !== "" && elem.feats.indexOf(creteria.feats) < 0)
                    return false;
                if (creteria.misc !== "" && elem.misc.indexOf(creteria.misc) < 0)
                    return false;
                return true;
            });
        }));
    }
    toBrat(logger, includeEmpty) {
        if (logger !== undefined) {
            this.logger = logger;
        }
        if (includeEmpty === undefined) {
            includeEmpty = false; // hide empty nodes by default
        }
        // merge brat data over all sentences
        var mergedBratData = {}, textOffset = 0;
        var categories = [
            'entities',
            'attributes',
            'relations',
            'comments',
            'styles',
            'sentlabels'
        ];
        for (let i = 0; i < categories.length; i++) {
            mergedBratData[categories[i]] = [];
        }
        mergedBratData['text'] = '';
        for (let i = 0; i < this.sentences.length; i++) {
            var sentence = this.sentences[i];
            var issues = sentence.validate();
            for (let j = 0; j < issues.length; j++) {
                this.logError(issues[j]);
            }
            if (issues.length !== 0) {
                if (!sentence.repair(this.logger)) {
                    this.logError('repair failed, discarding sentence');
                    continue;
                }
            }
            sentence.setBaseOffset(textOffset !== 0 ? textOffset + 1 : 0);
            var bratData = sentence.toBrat(includeEmpty);
            // merge
            if (mergedBratData['text'].length !== 0) {
                mergedBratData['text'] += '\n';
                textOffset += 1;
            }
            mergedBratData['text'] += bratData['text'];
            textOffset += bratData['text'].length;
            for (let j = 0; j < categories.length; j++) {
                var c = categories[j];
                mergedBratData[c] = mergedBratData[c].concat(bratData[c]);
            }
        }
        // to avoid brat breakage on error, don't send empty text
        if (mergedBratData['text'].length === 0) {
            mergedBratData['text'] = '<EMPTY>';
        }
        mergedBratData['error'] = this.error;
        return mergedBratData;
    }
    ;
}
exports.ConlluDocument = ConlluDocument;
//# sourceMappingURL=document.js.map