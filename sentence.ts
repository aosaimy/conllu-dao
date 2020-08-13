import {ConlluElement} from './element';
import {Util} from './util';
import {ConlluDocument} from './document';

export class ConlluSentence {

    /*
     * ConllU.ConlluSentence: represents CoNLL-U sentence
     */
     _id = 0;
    get id(){
      return 'S' + this._id;
    }
    set id(str: string|number){
      if (typeof str  === 'string') {
          this._id = parseInt(str.replace(/[^0-9]/g, ''), 10);
      }
      else {
          this._id = str;
      }
    }
    document: ConlluDocument;
    elements: ConlluElement[] = [];
    comments: any[] = [];
    baseOffset = 0;
    private issues: string[] = [];
    tag = '';
    error = false;

    constructor(sentenceId, elements: ConlluElement[] = [], comments = [], document) {
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

    refix(keepParentRelations= false){
      // Fix the id, isSeg, parent, children according to the ID values.
      // Needed after editing elements of one sentence.
      // param: keepParentRelations: when true will respect parent relation. Only Id, children and isSeg is updated.
        let from = -1;
        let to = -2;
        let parent: ConlluElement;

        let counter = 1;
        this.elements.forEach(e => {
          if (e.isMultiword) {
              if (!keepParentRelations){
                // isSeg is updated later
                from = parseInt(e.id.split('-')[0], 10);
                to = parseInt(e.id.split('-')[1], 10);
                e.isSeg = -(to - from) - 1;
                parent = e;
              }
              e.parent = null;
              e.children.length = 0;
          }
          else{
              e.id = '' + counter++;
              if (!keepParentRelations){
               if (parseInt(e.id, 10) >= from && parseInt(e.id, 10) <= to) {
                  e.isSeg = parseInt(e.id, 10) - from;
                  e.parent = parent;
                  if (!e.parent){
                    console.error(e.sentence.elements.map(ee => ee.toConllU(true, false)));
                }
                  else{
                      e.parent.children.push(e);
                      e.parent.id = e.parent.children[0].id + '-' + (parseInt(e.parent.children[0].id, 10) + e.parent.children.length - 1);
                  }
                }
              }
              else if (e.parent){
                e.parent.children.push(e);

                e.isSeg = parseInt(e.id, 10) - parseInt(e.parent.children[0].id, 10);
                e.parent.isSeg = - ( parseInt(e.parent.children[e.parent.children.length - 1].id, 10) -
                                 parseInt(e.parent.children[0].id, 10)) - 1;

                // TODO
                // if(-e.parent.isSeg != e.parent.children.length)
                  // console.error("Not the same",-e.parent.isSeg, e.parent.children.length, e.parent.toConllU())

                e.parent.id = e.parent.children[0].id + '-' + (parseInt(e.parent.children[0].id, 10) + e.parent.children.length - 1);
              }
              else{
                  // console.error("Should never be here",e)
              }
          }
          // return e
        }); // .filter(e=>e!=null);
        return this;
    }
    getText(){
        return this.tokens().map(e => e.form).join(' ');
    }

    toConllU(lines: string[]= []) {
        for (const com of this.comments) {
            lines.push(com);
        }
        for (const elem of this.tokens()) {
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
        let dependencies: string[][] = [];

        for (const element of this.elements) {
            dependencies = dependencies.concat(element.dependencies());
        }

        return dependencies;
    }

    words(includeEmpty: boolean): ConlluElement[] {
        return this.elements.filter((e) => {
            return (e.isWord() || (includeEmpty && e.isEmptyNode()));
        });
    }

    multiwords() {
        return this.elements.filter(e => e.isMultiword);
    }

    tokens(): ConlluElement[] {
        // extract token sequence by omitting word IDs that are
        // included in a multiword token range.
        const multiwords = this.multiwords();
        const inRange = {};
        for (const mw of multiwords) {
            for (let j = mw.rangeFrom(); j <= mw.rangeTo(); j++) {
                inRange[j] = true;
            }
        }
        return this.elements.filter((e) => {
            return e.isToken(inRange);
        });
    }

    // return words with possible modifications for visualization with
    // brat
    bratWords(includeEmpty) {
        const words = this.words(includeEmpty);

        words.forEach((word, i) => {
            if (Util.isRtl(word.form)) {
                words[i] = Util.deepCopy(word);
                words[i].form = Util.rtlFix(words[i].form);
            }
        });

        return words;
    }

    // return tokens with possible modifications for visualization
    // with brat
    bratTokens() {
        const tokens = this.tokens();

        tokens.forEach((token, i) => {
            tokens[i] = Util.deepCopy(token);
            tokens[i].form = Util.rtlFix(tokens[i].form);
        });

        return tokens;
    }

    // return the text of the sentence for visualization with brat
    bratText(includeEmpty) {
        const words = this.bratWords(includeEmpty);
        const tokens = this.bratTokens();

        const wordText = words.map((w) => w.form).join(' ');
        const tokenText = tokens.map((w) => w.form).join(' ');

        let combinedText = wordText;
        if (wordText !== tokenText) {
            combinedText += '\n' + tokenText;
        }

        return combinedText;
    }

    // return the annotated text spans of the sentence for visualization
    // with brat.
    bratSpans(includeEmpty) {
        const spans: any[][] = [];
        let offset = this.baseOffset;

        // create an annotation for each word
        const words = this.bratWords(includeEmpty);
        for (const word of words) {
            const length = word.form.length;
            spans.push([this.id + '-T' + word.id, word.upostag,
            [[offset, offset + length]]]);
            offset += length + 1;
        }

        return spans;
    }

    // return attributes of sentence annotations for visualization
    // with brat.
    bratAttributes(includeEmpty) {
        const words = this.words(includeEmpty);

        // create attributes for word features
        const attributes: any[] = [];
        let aidseq = 1;
        for (const word of words) {
            const tid = this.id + '-T' + word.id;
            const nameVals = word.features;
            for (const nameVal of nameVals) {
                const name = nameVal.key;
                const value = nameVal.value;
                attributes.push([this.id + '-A' + aidseq++, name, tid, value]);
            }
        }

        return attributes;
    }

    // return relations for sentence dependencies for visualization
    // with brat.
    bratRelations(includeEmpty) {
        const dependencies = this.dependencies();
        const relations: any[] = [];

        dependencies.forEach((dep, i) => {
            relations.push([this.id + '-R' + i, dep[2],
            [['arg1', this.id + '-T' + dep[1]],
            ['arg2', this.id + '-T' + dep[0]]]]);
        });

        return relations;
    }

    // return comments (notes) on sentence annotations for
    // visualization with brat.
    bratComments(includeEmpty) {
        const words = this.words(includeEmpty);

        // TODO: better visualization for LEMMA, XPOSTAG, and MISC.
        const comments: any[] = [];
        for (const word of words) {
            const tid = this.id + '-T' + word.id;
            const label = 'AnnotatorNotes';
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

    // Return styles on sentence annotations for visualization with
    // brat. Note: this feature is an extension of both the CoNLL-U
    // comment format and the basic brat data format.
    bratStyles(includeEmpty) {
        const styles: any[][] = [];
        const wildcards: string[][] = [];

        for (const comment of this.comments) {
            let m = comment.match(/^(\#\s*visual-style\s+)(.*)/);
            if (!m) {
                continue;
            }
            const styleSpec = m[2];

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
            let reference = m[1];
            const style = m[2];

            // split style into key and value, adding a key to
            // color-only styles as needed for the reference type.
            let key;
            let value;
            m = style.match(/^(\S+):(\S+)$/);
            if (m) {
                key = m[1];
                value = m[2];
            } else {
                value = style;
                if (reference === 'arcs' || reference.indexOf(' ') !== -1) {
                    key = 'color';
                } else {
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
            } else {
                reference = reference.split(' ');
                reference[0] = this.id + '-T' + reference[0];
                reference[1] = this.id + '-T' + reference[1];
            }

            styles.push([reference, key, value]);
        }

        // for expanding wildcards, first determine which words / arcs
        // styles have already been set, and then add the style to
        // everything that hasn't.
        const setStyle: any = {};
        for (const  style of styles) {
            setStyle[style[0] + style[1]] = true;
        }
        for (const  wildcard of wildcards) {
            const reference = wildcard[0];
            const key = wildcard[1];
            const value = wildcard[2];
            if (reference === 'nodes') {
                const words = this.words(includeEmpty);
                for (const  word of words) {
                    const r = this.id + '-T' + word.id;
                    if (!setStyle[r.concat(key)]) {
                        styles.push([r, key, value]);
                        setStyle[r.concat(key)] = true;
                    }
                }
            } else if (reference === 'arcs') {
                const deps = this.dependencies();
                for (const  dep of deps) {
                    const rr = [this.id + '-T' + dep[1],
                    this.id + '-T' + dep[0],
                    dep[2]];
                    if (!setStyle[rr.concat([key]).join('')]) {
                        styles.push([rr, key, value]);
                        setStyle[rr.concat([key]).join('')] = true;
                    }
                }
            } else {
                Util.reportError('internal error');
            }
        }

        return styles;
    }

    // Return label of sentence for visualization with brat, or null
    // if not defined. Note: this feature is an extension of both the
    // CoNLL-U comment format and the basic brat data format.
    bratLabel() {
        let label = null;

        for (const comment of this.comments) {

            const m = comment.match(/^(\#\s*sentence-label\b)(.*)/);
            if (!m) {
                continue;
            }
            label = m[2].trim();
        }
        return label;
    }

    // Return representation of sentence in brat embedded format (see
    // http://brat.nlplab.org/embed.html).
    // If includeEmpty is truthy, include empty nodes in the representation.
    // Note: "styles" is an extension, not part of the basic format.
    toBrat(includeEmpty) {
        const text = this.bratText(includeEmpty);
        const spans = this.bratSpans(includeEmpty);
        const attributes = this.bratAttributes(includeEmpty);
        const relations = this.bratRelations(includeEmpty);
        const comments = this.bratComments(includeEmpty);
        const styles = this.bratStyles(includeEmpty);
        const labels = [this.bratLabel()];

        return {
            text,
            entities: spans,
            attributes,
            relations,
            comments,
            styles,
            sentlabels: labels,
        };
    }

    elementById() {
        const elementById = {};

        for (const element of this.elements) {
            elementById[element.id] = element;
        }

        return elementById;
    }

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

    validateParentAndChildren(){
        const initialIssueCount = this.issues.length;
        for (const e of this.elements){
            if (e.isMultiword && e.id.split('-').length !== 2) {
                this.addError('isMultiword but id is not a range."' + e.id + '"',
                    e);
            }
            if (!e.isMultiword && e.id.split('-').length !== 1) {
                this.addError('is not a Multiword but id is not a single integer."' + e.id + '"',
                    e);
            }
            if (e.isMultiword && e.children.length === 0) {
                this.addError('isMultiword but zero children."' + e.id + '"',
                    e);
            }
            if (e.isMultiword && e.children.filter(ee => ee.parent !== e).length > 0) {
                this.addError('isMultiword and children are not pointing to parent."' + e.id + '"',
                    e);
            }
        }
    }
    // Check for presence of ID duplicates
    validateUniqueIds() {
        const initialIssueCount = this.issues.length;
        const elementById = {};

        for (const element of this.elements) {
            if (elementById[element.id] !== undefined) {
                this.addError('non-unique ID "' + element.id + '"',
                    element);
            }
            elementById[element.id] = element;
        }

        return this.issues.length === initialIssueCount;
    }

    // Check validity of word ID sequence (should be 1,2,3,...)
    validateWordSequence() {

        const initialIssueCount = this.issues.length;
        let expectedId = 1;

        for (const element of this.elements) {

            if (element.isMultiword || element.isEmptyNode()) {
                continue; // only check simple word sequence here
            }

            if (parseInt(element.id, 10) !== expectedId) {
                this.addError('word IDs should be 1,2,3,..., ' +
                    'expected ' + expectedId + ', got ' + element.id,
                    element);
            }
            expectedId = parseInt(element.id, 10) + 1;
        }

        return this.issues.length === initialIssueCount;
    }

    // Check that multiword token ranges are valid
    validateMultiwordSequence() {

        const initialIssueCount = this.issues.length;
        let expectedId = 1;

        for (const element of this.elements) {

            if (element.isMultiword && element.rangeFrom() !== expectedId) {
                this.addError('multiword tokens must appear before ' +
                    'first word in their range',
                    element);
            } else {
                expectedId = parseInt(element.id, 10) + 1;
            }
        }

        return this.issues.length === initialIssueCount;
    }

    validateEmptyNodeSequence() {

        const initialIssueCount = this.issues.length;
        let previousWordId = '0';    // TODO check https://github.com/UniversalDependencies/docs/this.issues/382
        let nextEmptyNodeId = 1;

        for (const element of this.elements) {

            if (element.isWord()) {
                previousWordId = element.id;
                nextEmptyNodeId = 1;
            } else if (element.isEmptyNode()) {
                const expectedId = previousWordId + '.' + nextEmptyNodeId;
                if (element.id !== expectedId) {
                    this.addError('empty node IDs should be *.1, *.2, ... ' +
                        'expected ' + expectedId + ', got ' + element.id,
                        element);
                }
                nextEmptyNodeId++;
            }
        }

        return this.issues.length === initialIssueCount;
    }

    // Check validity of ID references in HEAD and DEPS.
    validateReferences() {

        const initialIssueCount = this.issues.length;
        const elementById = this.elementById();

        for (const element of this.elements) {

            // validate HEAD
            if (!element.validHeadReference(elementById)) {
                this.addError('HEAD is not valid ID: "' + element.head + '"',
                    element);
            }

            // validate DEPS
            const elemDeps = element.dependencies(true);
            for (const elemDep of elemDeps) {
                const head = elemDep[1];
                if (head !== '0' && elementById[head] === undefined) {
                    this.addError('invalid ID "' + head + '" in DEPS',
                        element);
                }
            }
        }

        return this.issues.length === initialIssueCount;
    }

    repair(log) {
        log = (log !== undefined ? log : Util.nullLogger);

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

        const issues = this.validate();
        return issues.length === 0;
    }

    repairUniqueIds(log) {
        log = (log !== undefined ? log : Util.nullLogger);

        const elementById = {};
        const filtered: ConlluElement[] = [];

        for (const element of this.elements) {
            if (elementById[element.id] === undefined) {
                elementById[element.id] = element;
                filtered.push(element);
            } else {
                log('repair: remove element with duplicate ID "' + element.id + '"');
            }
        }
        this.elements = filtered;

        return true;
    }

    repairWordSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairWordSequence()');
        return true;
    }

    repairMultiwordSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairMultiwordSequence()');
        return true;
    }

    repairEmptyNodeSequence(log) {
        log('TODO: implement ConllU.ConlluSentence.repairEmptyNodeSequence()');
        return true;
    }

    repairReferences(log) {
        log = (log !== undefined ? log : Util.nullLogger);

        const elementById = this.elementById();

        for (const element of this.elements) {

            // repair HEAD if not valid
            if (!element.validHeadReference(elementById)) {
                log('repair: blanking invalid HEAD');
                element.head = '';
            }

            // repair DEPS if not valid
            if (element.deps === '_') {
                continue;
            }
            const deparr = element.deps.split('|');
            const filtered: string[] = [];
            for (const dep of deparr) {
                const m = dep.match(Util.dependencyRegex);
                if (m) {
                    const head = m[1];
                    const deprel = m[2];
                    if (head === '0' || elementById[head] !== undefined) {
                        filtered.push(dep);
                    } else {
                        log('repair: removing invalid ID from DEPS');
                        this.error = true;
                    }
                } else {
                    Util.reportError('internal error: repairReferences(): ' +
                        'invalid DEPS');
                }
            }
            if (filtered.length === 0) {
                element.deps = '_';
            } else {
                element.deps = filtered.join('|');
            }
        }
        return true;
    }

  joinNextSentence(){
    const sindex = this.document.sentences.indexOf(this);
    if (!this.document.sentences[sindex + 1]) {
    return;
    }
    const after = this.document.sentences[sindex + 1].elements;

    after.forEach(e => e.sentence = this);

    this.elements = this.elements.concat(after);
    this.document.sentences.splice(sindex + 1, 1);
    this.refix(true);

    this.document.fixSentenceIds();
}
  newSentenceAt(cond){
    const sindex = this.document.sentences.indexOf(this);
    let eindex = -1;
    let element: ConlluElement;
    if (Number.isInteger(cond)){
        eindex = cond;
        element = this.elements[eindex];
    }
    else if (cond instanceof ConlluElement){
        eindex = this.elements.findIndex(x => x === cond);
        element = cond;
    }
    else {
        throw new Error('first argument should be either index of element or the element object');
    }

    // fix if multiword
    if (element.isMultiword){
        // console.log(element, element.children.slice(-1)[0])
        element = element.children.slice(-1)[0];
        eindex = this.elements.findIndex(x => x === element);
    }

    // check if last segment
    if (this.elements[eindex + 1]
      && element.parent != null
      && element.parent === this.elements[eindex + 1].parent){
      // TODO show warning
      throw new Error('Warning: chosen element is not the last segment of a word');
    }

    const before = this.elements.slice(0, eindex + 1);
    const after = this.elements.slice(eindex + 1);
    if (after.length === 0) {
        // no sentence can be formed on no elements
        throw new Error('No sentence can be formed on no elements');
    }
    else {
      // sentence should be splitted
      this.elements = before;

      // re count the second sentence
      let counter = 1;
      after.forEach(e => {
        if (!e.isMultiword) {
          e.id = '' + counter++;
        }
        else {
          const arr = e.id.split('-');
          e.id = counter + '-' + (counter + parseInt(arr[1], 10) - parseInt(arr[0], 10));
        }
      });
      const sent = new ConlluSentence('new', after, [], this.document);
      this.document.sentences.splice(sindex + 1, 0, sent);
      this.document.fixSentenceIds();
      return sent;
      // console.log(this.doc)
    }
  }
}
