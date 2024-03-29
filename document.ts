import { ConlluSentence } from './sentence';
import { ConlluElement } from './element';
import { Util } from './util';

export class ConlluDocument {


    /*
     * ConllU.ConlluDocument: represents CoNLL-U document
     */
    sentences: ConlluSentence[] = [];
    config: { alltags: any, debug?: boolean, mapTagToXpostag?: boolean, mapTagToUpostag?: boolean } = {
        alltags: [],
        mapTagToXpostag: false,
        mapTagToUpostag: false,
    };
    id = '';
    error = false;
    strict = false;
    private issues: string[] = [];
    logger: (str: string) => void = (s: string) => { };
    // constructor(config, public events: Events=null) {
    constructor(config, id = '') {
        if (!config) {
            console.error('No config JSON is supplied!');
        }
        // this.config = config
        this.reset();
        this.id = id;
    }
    getInfo() {
        const obj: any = {};
        obj.sent_no = this.sentences.length;
        obj.elem_no = this.sentences.map(s => s.elements.length).reduce((p, c) => p += c, 0);
        obj.tokens_no = this.sentences.map(s => s.tokens().length).reduce((p, c) => p += c, 0);
        obj.elem_no = this.sentences.map(s => s.elements.filter(el => el.isMultiword).length).reduce((p, c) => p += c, 0);
        return obj;
    }
    mapTagToXpostag(from) {
        if (this.config.mapTagToXpostag === false) {
            return from;
        }
        const f = this.config.alltags.find(x => x.tag === from || x.mapFrom.indexOf(from) >= 0);
        if (f) {
            return f.tag;
        }
        Util.reportError('tag is not mapped to Xpostag: ' + from);
        return from;
    }

    fixSentenceIds() {
        this.sentences.forEach((s, i) => {
            // console.log(s)
            const idIndex = s.comments.findIndex(c => c.indexOf('# sent_id') === 0);
            if (idIndex >= 0) {
                s.comments[idIndex] = '# sent_id = ' + (i + 1);
            }
            else {
                s.comments.push('# sent_id = ' + (i + 1));
            }
            s.id = 'S' + (i + 1);

            const textIndex = s.comments.findIndex(c => c.indexOf('# text') === 0);
            if (textIndex >= 0) {
                s.comments[textIndex] = '# text = ' + s.getText();
            }
            else {
                s.comments.push('# text = ' + s.getText());
            }
        });
    }


    mapTagToUpostag(from, fromUd) {
        if (this.config.mapTagToUpostag === false) {
            return fromUd;
        }
        const f = this.config.alltags.find(x => x.tag === from);
        if (f) {
            return f.mapToConllU;
        }
        Util.reportError('tag is not mapped to Upostag: ' + from);
        return fromUd;
    }

    reset() {
        this.sentences = [];
        this.error = false;
        this.logger = (s) => { /* no-op */ };
        this.strict = false; // pick heuristically
    }

    getElement(ref): ConlluElement | null {
        if (!ref) {
            return null;
        }
        ref = ref.split(':');
        const sent = this.sentences.find(x => x.id === ref[0]);
        if (!sent) {
            return null;
        }
        let elem = sent.elements.find(x => x.id === ref[1]);
        if (!elem) {
            return null;
        }
        // this.events.publish('highlight:change', elem)
        if (elem.isMultiword) {
            elem = elem.children[0];
        }
        return elem;
    }

    getElementLine(element: ConlluElement, sentence: ConlluSentence) {
        let counter = 1;

        let result = 0;
        this.sentences.forEach(s => {
            s.elements.forEach(e => {
                if (s.id === sentence.id && e.id === element.id) {
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

    logError(message) {
        this.log('error: ' + message);
        this.error = true;
    }

    toConllU() {
        const lines: string[] = [];
        for (const sent of this.sentences) {
            sent.toConllU(lines);
            lines.push('');
        }
        return lines.join('\n');
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
    parse(input, logger = (s: string) => { }, strict = false) {
        // discard previous state, if any
        this.reset();

        // TODO: handle other newline formats
        const lines = input.split('\n');

        if (!this.strict) {
            this.strict = Util.selectParsingMode(input, this.logger);
        }

        // select splitter to use for dividing the lines into fields.
        const splitter = Util.selectFieldSplitter(input, this.logger, this.strict);

        let // elements = [],
            // comments = [],
            beforeConlluSentence = true;

        const sId = 'S' + (this.sentences.length + 1);
        let currentSentence = new ConlluSentence(sId, [], [], this); // , currentSentence.elements, currentSentence.comments);

        const that = this;
        for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx];
            const logLineError = (message) => {
                that.logError('line ' + (idx + 1) + ': ' + message + ' ("' + line + '")');
                that.error = true;
            };


            if (Util.isComment(line)) {
                if (beforeConlluSentence) {
                    currentSentence.comments.push(line);
                } else {
                    logLineError('comments must precede sentence, ignoring');
                }
                continue;
            }

            // non-comment, assume inside sentence until terminated by
            // blank line
            beforeConlluSentence = false;

            const fields = splitter(line);

            if (fields.length === 0) {
                // empty line, terminates sentence
                if (currentSentence.elements.length !== 0 || currentSentence.comments.length !== 0) {
                    currentSentence.refix();
                    this.sentences.push(currentSentence);
                    const sId2 = 'S' + (this.sentences.length + 1);
                    currentSentence = new ConlluSentence(sId2, [], [], this); // , currentSentence.elements, currentSentence.comments);
                    // this.sentences.push(sentence);
                } else {
                    if (this.config.debug) {
                        logLineError('empty sentence, ignoring');
                    }
                }
                // reset
                // elements = [];
                // comments = [];
                beforeConlluSentence = true;
                continue;
            }

            if (fields.length !== 10) {
                logLineError('expected 10 fields, got ' + fields.length);
                Util.repairFields(fields, this.logger);
            }

            const element = new ConlluElement(fields, '' + idx, line, currentSentence);

            const issues = element.validate();
            issues.forEach(v => logLineError(v));
            if (issues.length !== 0) {
                if (!element.repair(this.logger)) {
                    logLineError('repair failed, discarding line');
                    continue; // failed, ignore line
                }
            }
            const ar = element.id.split('-');
            if (ar[0] !== ar[1]) {
                currentSentence.elements.push(element);
            }
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
        if (currentSentence.comments.length !== 0 && currentSentence.elements.length === 0) {
            this.logError('comments may not occur after last sentence, ' +
                'ignoring');
        }
        else {
            currentSentence.refix();
            this.sentences.push(currentSentence);
        }

        this.sentences.forEach(sentence => {
            const issues = sentence.validate();
            issues.forEach(v => this.logError(v));
            if (issues.length !== 0) {
                if (!sentence.repair(this.logger)) {
                    this.logError('repair failed, discarding sentence');
                    return;
                }
            }
        });
        // console.log(this)
        return this;
    }
    validate() {
        const issues: string[] = [];
        issues.concat(...this.sentences.map(s => s.validate()));
        this.sentences.map(s => issues.concat(...s.elements.map(e => e.validate())));
        console.log('my issues', issues);
        return issues;
    }
    find(creteria) {
        const regExps: { prop: string, regexp: RegExp }[] = ['form', 'lemma']
            .filter(prop => creteria[prop] !== '' && creteria[prop].split('/').length === 3)
            .map(prop => {
                const s = creteria[prop];
                creteria[prop] = '';
                return { prop, regexp: new RegExp(s.split('/')[1]) };
            });
        return ([] as ConlluElement[]).concat.apply([], this.sentences.map(sent => {
            return sent.elements.filter(elem => {
                if (regExps.filter(r => !r.regexp.test(elem[r.prop])).length > 0) {
                    return false;
                }
                if (creteria.form !== '' && elem.form !== creteria.form && elem.form.replace(/[ًٌٍَُِّْ]/g, '') !== creteria.form) {
                    return false;
                }
                if (creteria.xpos !== '' && elem.xpostag !== creteria.xpos) {
                    return false;
                }
                if (creteria.upos !== '' && elem.upostag !== creteria.upos) {
                    return false;
                }
                if (creteria.feats !== '' && elem.feats.indexOf(creteria.feats) < 0) {
                    return false;
                }
                if (creteria.misc !== '' && elem.misc.indexOf(creteria.misc) < 0) {
                    return false;
                }
                return true;
            });
        }));
    }
    toBrat(logger, includeEmpty) {
        if (logger !== undefined) {
            this.logger = logger;
        }
        if (includeEmpty === undefined) {
            includeEmpty = false;    // hide empty nodes by default
        }

        // merge brat data over all sentences
        const mergedBratData = {
            text: '',
            error: false
        };
        let textOffset = 0;
        const categories = [
            'entities',
            'attributes',
            'relations',
            'comments',
            'styles',
            'sentlabels'
        ];
        categories.forEach(x => {
            mergedBratData[x] = [];
        });
        mergedBratData.text = '';
        this.sentences.forEach(sentence => {

            const issues = sentence.validate();

            issues.forEach(x => this.logError(x));

            if (issues.length !== 0) {
                if (!sentence.repair(this.logger)) {
                    this.logError('repair failed, discarding sentence');
                    return;
                }
            }
            sentence.setBaseOffset(textOffset !== 0 ? textOffset + 1 : 0);
            const bratData = sentence.toBrat(includeEmpty);

            // merge
            if (mergedBratData.text.length !== 0) {
                mergedBratData.text += '\n';
                textOffset += 1;
            }
            mergedBratData.text += bratData.text;
            textOffset += bratData.text.length;
            categories.forEach(c => {
                mergedBratData[c] = mergedBratData[c].concat(bratData[c]);
            });
        });

        // to avoid brat breakage on error, don't send empty text
        if (mergedBratData.text.length === 0) {
            mergedBratData.text = '<EMPTY>';
        }

        mergedBratData.error = this.error;

        return mergedBratData;
    }
}
