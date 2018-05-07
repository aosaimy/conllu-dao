"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
class ConlluSentence {
    constructor(sentenceId, elements = [], comments = [], document) {
        /*
         * ConllU.ConlluSentence: represents CoNLL-U sentence
         */
        this._id = 0;
        this.elements = [];
        this.comments = [];
        this.baseOffset = 0;
        this.issues = [];
        this.tag = "";
        this.error = false;
        this.id = sentenceId;
        this.document = document;
        this.comments = comments;
        this.baseOffset = 0;
        this.elements = elements;
        this.elements.forEach(e => {
            e.sentence = this;
        });
        // this.refix()
    }
    get id() {
        return "S" + this._id;
    }
    set id(str) {
        if (typeof str == "string")
            this._id = parseInt(str.replace(/[^0-9]/g, ""));
        else
            this._id = str;
    }
    ;
    refix(keepParentRelations = false) {
        // Fix the id, isSeg, parent, children according to the ID values.
        // Needed after editing elements of one sentence.
        // param: keepParentRelations: when true will respect parent relation. Only Id, children and isSeg is updated.
        var from = -1, to = -2;
        var parent;
        var counter = 1;
        this.elements.forEach(e => {
            if (e.isMultiword) {
                if (!keepParentRelations) {
                    // isSeg is updated later
                    from = parseInt(e.id.split("-")[0]);
                    to = parseInt(e.id.split("-")[1]);
                    e.isSeg = -(to - from) - 1;
                    parent = e;
                }
                e.parent = null;
                e.children.length = 0;
            }
            else {
                e.id = "" + counter++;
                if (!keepParentRelations) {
                    if (parseInt(e.id) >= from && parseInt(e.id) <= to) {
                        e.isSeg = parseInt(e.id) - from;
                        e.parent = parent;
                        if (!e.parent) {
                            console.error(e.sentence.elements.map(e => e.toConllU(true, false)));
                        }
                        else {
                            e.parent.children.push(e);
                            e.parent.id = e.parent.children[0].id + "-" + (parseInt(e.parent.children[0].id) + e.parent.children.length - 1);
                        }
                    }
                }
                else if (e.parent) {
                    e.parent.children.push(e);
                    e.isSeg = parseInt(e.id) - parseInt(e.parent.children[0].id);
                    e.parent.isSeg = -(parseInt(e.parent.children[e.parent.children.length - 1].id) - parseInt(e.parent.children[0].id)) - 1;
                    //TODO
                    // if(-e.parent.isSeg != e.parent.children.length)
                    // console.error("Not the same",-e.parent.isSeg, e.parent.children.length, e.parent.toConllU())
                    e.parent.id = e.parent.children[0].id + "-" + (parseInt(e.parent.children[0].id) + e.parent.children.length - 1);
                }
                else {
                    // console.error("Should never be here",e)
                }
            }
            // return e
        }); //.filter(e=>e!=null);
        return this;
    }
    getText() {
        return this.tokens().map(e => e.form).join(" ");
    }
    toConllU(lines = []) {
        for (let com of this.comments) {
            lines.push(com);
        }
        for (let elem of this.tokens()) {
            lines.push(elem.toConllU());
        }
        return lines;
    }
    // set offset of first character in sentence (for standoff
    // generation)
    setBaseOffset(baseOffset) {
        this.baseOffset = baseOffset;
    }
    dependencies() {
        var dependencies = [];
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            dependencies = dependencies.concat(element.dependencies());
        }
        return dependencies;
    }
    ;
    words(includeEmpty) {
        return this.elements.filter(function (e) {
            return (e.isWord() || (includeEmpty && e.isEmptyNode()));
        });
    }
    ;
    multiwords() {
        return this.elements.filter(e => e.isMultiword);
    }
    ;
    tokens() {
        // extract token sequence by omitting word IDs that are
        // included in a multiword token range.
        var multiwords = this.multiwords();
        var inRange = {};
        for (let i = 0; i < multiwords.length; i++) {
            var mw = multiwords[i];
            for (let j = mw.rangeFrom(); j <= mw.rangeTo(); j++) {
                inRange[j] = true;
            }
        }
        return this.elements.filter(function (e) {
            return e.isToken(inRange);
        });
    }
    ;
    // return words with possible modifications for visualization with
    // brat
    bratWords(includeEmpty) {
        var words = this.words(includeEmpty);
        for (let i = 0; i < words.length; i++) {
            if (util_1.Util.isRtl(words[i].form)) {
                words[i] = util_1.Util.deepCopy(words[i]);
                words[i].form = util_1.Util.rtlFix(words[i].form);
            }
        }
        return words;
    }
    ;
    // return tokens with possible modifications for visualization
    // with brat
    bratTokens() {
        var tokens = this.tokens();
        for (let i = 0; i < tokens.length; i++) {
            tokens[i] = util_1.Util.deepCopy(tokens[i]);
            tokens[i].form = util_1.Util.rtlFix(tokens[i].form);
        }
        return tokens;
    }
    ;
    // return the text of the sentence for visualization with brat
    bratText(includeEmpty) {
        var words = this.bratWords(includeEmpty);
        var tokens = this.bratTokens();
        var wordText = words.map(function (w) { return w.form; }).join(' ');
        var tokenText = tokens.map(function (w) { return w.form; }).join(' ');
        var combinedText = wordText;
        if (wordText != tokenText) {
            combinedText += '\n' + tokenText;
        }
        return combinedText;
    }
    ;
    // return the annotated text spans of the sentence for visualization
    // with brat.
    bratSpans(includeEmpty) {
        var spans = [], offset = this.baseOffset;
        // create an annotation for each word
        var words = this.bratWords(includeEmpty);
        for (let i = 0; i < words.length; i++) {
            var length = words[i].form.length;
            spans.push([this.id + '-T' + words[i].id, words[i].upostag,
                [[offset, offset + length]]]);
            offset += length + 1;
        }
        return spans;
    }
    // return attributes of sentence annotations for visualization
    // with brat.
    bratAttributes(includeEmpty) {
        var words = this.words(includeEmpty);
        // create attributes for word features
        var attributes = [], aidseq = 1;
        for (let i = 0; i < words.length; i++) {
            var word = words[i], tid = this.id + '-T' + word.id;
            var nameVals = word.features;
            for (let j = 0; j < nameVals.length; j++) {
                var name = nameVals[j].key, value = nameVals[j].value;
                attributes.push([this.id + '-A' + aidseq++, name, tid, value]);
            }
        }
        return attributes;
    }
    ;
    // return relations for sentence dependencies for visualization
    // with brat.
    bratRelations(includeEmpty) {
        var dependencies = this.dependencies();
        var relations = [];
        for (let i = 0; i < dependencies.length; i++) {
            var dep = dependencies[i];
            relations.push([this.id + '-R' + i, dep[2],
                [['arg1', this.id + '-T' + dep[1]],
                    ['arg2', this.id + '-T' + dep[0]]]]);
        }
        return relations;
    }
    ;
    // return comments (notes) on sentence annotations for
    // visualization with brat.
    bratComments(includeEmpty) {
        var words = this.words(includeEmpty);
        // TODO: better visualization for LEMMA, XPOSTAG, and MISC.
        var comments = [];
        for (let i = 0; i < words.length; i++) {
            var word = words[i], tid = this.id + '-T' + word.id, label = 'AnnotatorNotes';
            comments.push([tid, label, 'Lemma: ' + word.lemma]);
            if (word.xpostag !== '_') {
                comments.push([tid, label, 'Xpostag: ' + word.xpostag]);
            }
            if (word.misc !== '_') {
                comments.push([tid, label, 'Misc: ' + word.misc]);
            }
        }
        return comments;
    }
    ;
    // Return styles on sentence annotations for visualization with
    // brat. Note: this feature is an extension of both the CoNLL-U
    // comment format and the basic brat data format.
    bratStyles(includeEmpty) {
        var styles = [], wildcards = [];
        for (let i = 0; i < this.comments.length; i++) {
            var comment = this.comments[i];
            var m = comment.match(/^(\#\s*visual-style\s+)(.*)/);
            if (!m) {
                continue;
            }
            var styleSpec = m[2];
            // Attempt to parse as a visual style specification. The
            // expected format is "REF<SPACE>STYLE", where REF
            // is either a single ID (for a span), a space-separated
            // ID1 ID2 TYPE triple (for a relation), or a special
            // wildcard value like "arcs", and STYLE is either
            // a colon-separated key-value pair or a color.
            m = styleSpec.match(/^([^\t]+)\s+(\S+)\s*$/);
            if (!m) {
                // TODO: avoid console.log
                console.warn('warning: failed to parse: "' + comment + '"');
                continue;
            }
            var reference = m[1], style = m[2];
            // split style into key and value, adding a key to
            // color-only styles as needed for the reference type.
            var key, value;
            m = style.match(/^(\S+):(\S+)$/);
            if (m) {
                key = m[1];
                value = m[2];
            }
            else {
                value = style;
                if (reference === 'arcs' || reference.indexOf(' ') !== -1) {
                    key = 'color';
                }
                else {
                    key = 'bgColor';
                }
            }
            // store wildcards for separate later processing
            if (reference.match(/^(nodes|arcs)$/)) {
                wildcards.push([reference, key, value]);
                continue;
            }
            // adjust every ID in reference for brat
            if (reference.indexOf(' ') === -1) {
                reference = this.id + '-T' + reference;
            }
            else {
                reference = reference.split(' ');
                reference[0] = this.id + '-T' + reference[0];
                reference[1] = this.id + '-T' + reference[1];
            }
            styles.push([reference, key, value]);
        }
        // for expanding wildcards, first determine which words / arcs
        // styles have already been set, and then add the style to
        // everything that hasn't.
        var setStyle = {};
        for (let i = 0; i < styles.length; i++) {
            setStyle[styles[i][0] + styles[i][1]] = true;
        }
        for (let i = 0; i < wildcards.length; i++) {
            let reference = wildcards[i][0], key = wildcards[i][1], value = wildcards[i][2];
            if (reference === 'nodes') {
                var words = this.words(includeEmpty);
                for (let j = 0; j < words.length; j++) {
                    var r = this.id + '-T' + words[j].id;
                    if (!setStyle[r.concat(key)]) {
                        styles.push([r, key, value]);
                        setStyle[r.concat(key)] = true;
                    }
                }
            }
            else if (reference === 'arcs') {
                var deps = this.dependencies();
                for (let j = 0; j < deps.length; j++) {
                    var rr = [this.id + '-T' + deps[j][1],
                        this.id + '-T' + deps[j][0],
                        deps[j][2]];
                    if (!setStyle[rr.concat([key]).join("")]) {
                        styles.push([rr, key, value]);
                        setStyle[rr.concat([key]).join("")] = true;
                    }
                }
            }
            else {
                util_1.Util.reportError('internal error');
            }
        }
        return styles;
    }
    ;
    // Return label of sentence for visualization with brat, or null
    // if not defined. Note: this feature is an extension of both the
    // CoNLL-U comment format and the basic brat data format.
    bratLabel() {
        var label = null;
        for (let i = 0; i < this.comments.length; i++) {
            var comment = this.comments[i];
            var m = comment.match(/^(\#\s*sentence-label\b)(.*)/);
            if (!m) {
                continue;
            }
            label = m[2].trim();
        }
        return label;
    }
    ;
    // Return representation of sentence in brat embedded format (see
    // http://brat.nlplab.org/embed.html).
    // If includeEmpty is truthy, include empty nodes in the representation.
    // Note: "styles" is an extension, not part of the basic format.
    toBrat(includeEmpty) {
        var text = this.bratText(includeEmpty);
        var spans = this.bratSpans(includeEmpty);
        var attributes = this.bratAttributes(includeEmpty);
        var relations = this.bratRelations(includeEmpty);
        var comments = this.bratComments(includeEmpty);
        var styles = this.bratStyles(includeEmpty);
        var labels = [this.bratLabel()];
        return {
            'text': text,
            'entities': spans,
            'attributes': attributes,
            'relations': relations,
            'comments': comments,
            'styles': styles,
            'sentlabels': labels,
        };
    }
    ;
    elementById() {
        var elementById = {};
        for (let i = 0; i < this.elements.length; i++) {
            elementById[this.elements[i].id] = this.elements[i];
        }
        return elementById;
    }
    ;
    addError(issue, element) {
        this.issues.push('line ' + (element.lineidx + 1) + ': ' + issue + ' ("' + element.line + '")');
    }
    // Check validity of the sentence. Return list of strings
    // representing issues found in validation (empty list if none).
    validate() {
        this.issues = [];
        this.validateUniqueIds();
        this.validateWordSequence();
        this.validateMultiwordSequence();
        this.validateEmptyNodeSequence();
        this.validateReferences();
        this.validateParentAndChildren();
        return this.issues;
    }
    ;
    validateParentAndChildren() {
        var initialIssueCount = this.issues.length;
        for (let e of this.elements) {
            if (e.isMultiword && e.id.split("-").length != 2)
                this.addError('isMultiword but id is not a range."' + e.id + '"', e);
            if (!e.isMultiword && e.id.split("-").length != 1)
                this.addError('is not a Multiword but id is not a single integer."' + e.id + '"', e);
            if (e.isMultiword && e.children.length == 0)
                this.addError('isMultiword but zero children."' + e.id + '"', e);
            if (e.isMultiword && e.children.filter(ee => ee.parent != e).length > 0)
                this.addError('isMultiword and children are not pointing to parent."' + e.id + '"', e);
        }
    }
    // Check for presence of ID duplicates
    validateUniqueIds() {
        var initialIssueCount = this.issues.length;
        var elementById = {};
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (elementById[element.id] !== undefined) {
                this.addError('non-unique ID "' + element.id + '"', element);
            }
            elementById[element.id] = element;
        }
        return this.issues.length === initialIssueCount;
    }
    ;
    // Check validity of word ID sequence (should be 1,2,3,...)
    validateWordSequence() {
        var initialIssueCount = this.issues.length;
        var expectedId = 1;
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (element.isMultiword || element.isEmptyNode()) {
                continue; // only check simple word sequence here
            }
            if (parseInt(element.id, 10) !== expectedId) {
                this.addError('word IDs should be 1,2,3,..., ' +
                    'expected ' + expectedId + ', got ' + element.id, element);
            }
            expectedId = parseInt(element.id, 10) + 1;
        }
        return this.issues.length === initialIssueCount;
    }
    ;
    // Check that multiword token ranges are valid
    validateMultiwordSequence() {
        var initialIssueCount = this.issues.length;
        var expectedId = 1;
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (element.isMultiword && element.rangeFrom() !== expectedId) {
                this.addError('multiword tokens must appear before ' +
                    'first word in their range', element);
            }
            else {
                expectedId = parseInt(element.id, 10) + 1;
            }
        }
        return this.issues.length === initialIssueCount;
    }
    ;
    validateEmptyNodeSequence() {
        var initialIssueCount = this.issues.length;
        var previousWordId = '0'; // TODO check https://github.com/UniversalDependencies/docs/this.issues/382
        var nextEmptyNodeId = 1;
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (element.isWord()) {
                previousWordId = element.id;
                nextEmptyNodeId = 1;
            }
            else if (element.isEmptyNode()) {
                var expectedId = previousWordId + '.' + nextEmptyNodeId;
                if (element.id !== expectedId) {
                    this.addError('empty node IDs should be *.1, *.2, ... ' +
                        'expected ' + expectedId + ', got ' + element.id, element);
                }
                nextEmptyNodeId++;
            }
        }
        return this.issues.length === initialIssueCount;
    }
    // Check validity of ID references in HEAD and DEPS.
    validateReferences() {
        var initialIssueCount = this.issues.length;
        var elementById = this.elementById();
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            // validate HEAD
            if (!element.validHeadReference(elementById)) {
                this.addError('HEAD is not valid ID: "' + element.head + '"', element);
            }
            // validate DEPS
            var elemDeps = element.dependencies(true);
            for (let j = 0; j < elemDeps.length; j++) {
                var head = elemDeps[j][1];
                if (head !== '0' && elementById[head] === undefined) {
                    this.addError('invalid ID "' + head + '" in DEPS', element);
                }
            }
        }
        return this.issues.length === initialIssueCount;
    }
    ;
    repair(log) {
        log = (log !== undefined ? log : util_1.Util.nullLogger);
        if (!this.validateUniqueIds()) {
            this.repairUniqueIds(log);
        }
        if (!this.validateWordSequence()) {
            this.repairWordSequence(log);
        }
        if (!this.validateMultiwordSequence()) {
            this.repairMultiwordSequence(log);
        }
        if (!this.validateEmptyNodeSequence()) {
            this.repairEmptyNodeSequence(log);
        }
        if (!this.validateReferences()) {
            this.repairReferences(log);
        }
        var issues = this.validate();
        return issues.length === 0;
    }
    ;
    repairUniqueIds(log) {
        log = (log !== undefined ? log : util_1.Util.nullLogger);
        var elementById = {}, filtered = [];
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            if (elementById[element.id] === undefined) {
                elementById[element.id] = element;
                filtered.push(element);
            }
            else {
                log('repair: remove element with duplicate ID "' + element.id + '"');
            }
        }
        this.elements = filtered;
        return true;
    }
    ;
    repairWordSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairWordSequence()');
        return true;
    }
    ;
    repairMultiwordSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairMultiwordSequence()');
        return true;
    }
    ;
    repairEmptyNodeSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairEmptyNodeSequence()');
        return true;
    }
    ;
    repairReferences(log) {
        log = (log !== undefined ? log : util_1.Util.nullLogger);
        var elementById = this.elementById();
        for (let i = 0; i < this.elements.length; i++) {
            var element = this.elements[i];
            // repair HEAD if not valid
            if (!element.validHeadReference(elementById)) {
                log('repair: blanking invalid HEAD');
                element.head = "";
            }
            // repair DEPS if not valid
            if (element.deps === '_') {
                continue;
            }
            var deparr = element.deps.split('|'), filtered = [];
            for (let j = 0; j < deparr.length; j++) {
                var dep = deparr[j];
                var m = dep.match(util_1.Util.dependencyRegex);
                if (m) {
                    var head = m[1], deprel = m[2];
                    if (head === '0' || elementById[head] !== undefined) {
                        filtered.push(dep);
                    }
                    else {
                        log('repair: removing invalid ID from DEPS');
                        this.error = true;
                    }
                }
                else {
                    util_1.Util.reportError('internal error: repairReferences(): ' +
                        'invalid DEPS');
                }
            }
            if (filtered.length === 0) {
                element.deps = '_';
            }
            else {
                element.deps = filtered.join('|');
            }
        }
        return true;
    }
    ;
}
exports.ConlluSentence = ConlluSentence;
//# sourceMappingURL=sentence.js.map