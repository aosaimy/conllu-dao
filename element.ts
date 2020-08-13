import {ConlluSentence} from './sentence';
import {Util} from './util';
import {ConlluDocument} from './document';

export class ConlluElement {
    get id(){
        return this._id;
    }
    set id(args){
        this._id = args;
        this.isMultiword = this._isMultiword();
    }
    get xpostag(){
        return this._xpostag;
    }
    set xpostag(argv){
        if (this.isMultiword){
            this._xpostag = '_';
            return;
        }
        this._xpostag = this.sentence.document.mapTagToXpostag(argv);
        this.upostag = this.sentence.document.mapTagToUpostag(this._xpostag, this.upostag);
        if (this.sentence.document.config.mapTagToXpostag === false) {
            return;
        }
        // remove feats
        const tag = this.sentence.document.config.alltags.find(x => x.tag === this._xpostag);
        if (!tag) {
             return;
         }
         else if (Array.isArray(tag.features)){
           this.features = this.features.filter(x => tag.features.indexOf(x.key) >= 0);
           // this.features = tag.features.map(x=>this.features.find(y=>y.key==x)||x).map(x=>typeof x =="string" ?{key:x,value:"_"}:x)
           // console.log(this.features)
         }

    }
    set misc(args) {
        this._miscs = {};
        if (args === undefined) {
            return;
        }
        if (args === '_') {
            return;
        }
        args.split('|').forEach(text => {
            const arr = text.split('=');
            this._miscs[arr[0]] = arr[1];
        });
    }
    get misc() {
        return Object.keys(this._miscs).map(key => {
            return this._miscs[key] ? key + '=' + this._miscs[key] : undefined;
        }).filter(x => x !== undefined).sort().join('|') || '_';
    }

    set feats(args) {
        this.features = [];
        if (args === undefined) {
            return;
        }
        if (args === '_') {
            return;
        }
        // args.split("|").forEach(text => {
        //     var arr = text.split("=")
        //     this.features.push({key:arr[0],value:arr[1]})
        // })
        const featarr = args.split('|');
        for (const feat of featarr) {
            const m = feat.match(Util.featureRegex);
            if (!m) {
                continue;
            }
            const name = m[1];
            const valuestr = m[2];
            const values = valuestr.split(',');
            for (const value of values) {
                const m2 = value.match(Util.featureValueRegex);
                if (!m2) {
                    continue;
                }
                this.features.push({key: name, value});
            }
        }
    }
    get feats() {
        return this.features.map(v => {
            return v.key + '=' + v.value;
        }).sort().join('|') || '_';
    }

    // represents CoNLL-U word or multiword token
    constructor(fields: string[], lineidx: string, line: string, sentence: ConlluSentence) {
        this.sentence = sentence;
        this.id = fields[0];
        this.form = fields[1];
        this.lemma = fields[2];
        this.upostag = fields[3];
        this.feats = fields[5];
        this.xpostag = fields[4];
        this.head = fields[6];
        this.deprel = fields[7];
        this.deps = fields[8];
        this.misc = fields[9];
        this.lineidx = lineidx;
        this.line = line;
    }





















    /*
     * ConllU.Element: represents CoNLL-U word or multiword token
     */
    _id = '';
    form = '';
    lemma = '';
    upostag = '';
    _xpostag = '';
    private issues: string[] = [];
    // private feats : string = "";
    head = '';
    deprel = '';
    deps = '';
    _miscs: any = {};
    lineidx = '';
    line = '';
    isSeg = -1;
    parent: ConlluElement|null = null;
    children: ConlluElement[] = [];
    features: {key: string, value: string}[] = [];
    sentence: ConlluSentence;
    analysis: ConlluElement[] = [] ;
    isMultiword = false;

    setFeature(key, value){
        const i = this.features.findIndex(x => x.key === key);
        if (i >= 0) {
            if (value) {
                this.features[i].value = value;
            }
            else {
                this.features.splice(i, 1);
            }
        }
        else {
            this.features.push({key, value});
        }
    }
    copy(from){
        this.form = from.form;
        this.lemma = from.lemma;
        this.upostag = from.upostag;
        this.xpostag = from.xpostag;
        this.feats = from.feats;
        this.head = from.head;
        this.deprel = from.deprel;
        this.deps = from.deps;
        this.misc = from.misc;
     }
     getContext(span: number= 2): ConlluElement[] {
       const elems: ConlluElement[] = this.sentence.tokens();
       // var eindex = elems.findIndex(e=>e==(this.parent || this))
       const eindex = elems.indexOf(this.parent || this);
       return elems.filter((e, i) => i >= eindex - span  && i <= eindex + span);
    }


     isSameAs(element: ConlluElement): boolean{
       return this.children.length === element.children.length &&
       this.children.filter((c, i) => !c.isSameAs(element.children[i])).length === 0 &&
       this.form === element.form &&
       // this.lemma == element.lemma &&
       this.upostag === element.upostag &&
       this.xpostag === element.xpostag &&
       this.feats === element.feats &&
       this.head === element.head &&
       this.deprel === element.deprel &&
       this.deps === element.deps;
     }
    copyMorphInfo(from){
        this.upostag = from.upostag;
        this.xpostag = from.xpostag;
        this.feats = from.feats;
        this.head = from.head;
        this.deprel = from.deprel;
        this.deps = from.deps;
        this.misc = from.misc;
     }
     morphFeatsMissing(){
         const tag = this.sentence.document.config.alltags.find(x => x.tag === this.xpostag);
         if (!tag){
             // Util.reportError("tag was not found!", this.xpostag)
             return [];
         }
         else if (!tag.features){
             Util.reportError('tag has no list of possible morph feats!' + this.xpostag);
             return [];
         }
         else {
             return tag.features.filter(x => !this.features.find(y => y.key === x));
 }
     }
    changeWith(el){
        if (el.parent){
            Util.reportError('ERROR: changeWith cannot be used with a child element');
            el = el.parent;
        }
        // parent vs. parent
        // var i = this.sentence.elements.findIndex(x=>x==this)
        const i = this.sentence.elements.indexOf(this);
        // if(el.isMultiword){
              // Array.prototype.splice.apply(this.sentence.elements,[i,1,el].concat(el.children))
        const c = el.clone();
          // c now has elements where first is parent and rest is children
          // var parent = c[0]
        c.analysis = this.analysis;
        c.sentence = this.sentence;
        c.children.forEach(e => {
              e.sentence = this.sentence;
              // e._miscs["FROM_MA"]=true
          });
          // console.log(c.sentence.validate(),this.children.length);
          // console.log([i,1+this.children.length].concat([c,...c.children]))
        const x = [];
        this.sentence.elements.splice(i,
            1 + (this.parent ? this.parent.children.length : this.children.length),
            ...[c, ...c.children] as ConlluElement[]
        );
        this.sentence.refix(true);
        if (c.isMultiword) {
              return c.children[0];
          }
          else {
              return c;
          }
    }
    clone(){
        const e = new ConlluElement([this.id, this.form,
        this.lemma,
        this.upostag,
        this.xpostag,
        this.feats,
        this.head,
        this.deprel,
        this.deps,
        this.misc], this.lineidx, this.line, this.sentence);
        e.isMultiword = this.isMultiword;
        e.analysis = this.analysis;
        e.sentence = this.sentence;
        e.children = this.children.map(ee => {
            const eee = ee.clone();
            eee.parent = e;
            return eee;
        });
        return e;
    }
    // cloneParent  (){
    //     var all = []
    //     var parent = this.clone()
    //     return [parent].concat(this.children.map(e=>{
    //         e.parent = parent;
    //         return e.clone()
    //     }))
    // }
    toConllU(includeId= true, includeChildren= true) {
      if (includeChildren){
        if (this.isMultiword){
          return [this, ...this.children].map(e => e.toConllU(includeId, false)).join('\n');
        }
        else { return this.toConllU(includeId, false); }
      }
      const line = [includeId ? this.id : '',
        this.form,
        this.lemma,
        this.upostag,
        this.xpostag,
        this.feats,
        this.head,
        this.deprel,
        this.deps,
        includeId ? this.misc : ''];
      return line.join('\t');
    }
    // constraints that hold for all fields
    validateField(field, name= 'field',
                  allowSpace= false) {

        if (field === undefined) {
            this.issues.push('invalid ' + name);
            return false;
        } else if (field.length === 0) {
            this.issues.push(name + ' must not be empty: "' + field + '"');
            return false;
        } else if (Util.hasSpace(field) && !allowSpace) {
            this.issues.push(name + ' must not contain space: "' + field + '"');
            return false;
        } else {
            return true;
        }
    }
    getForm() {
    // console.log(elem)
    if (!this.parent) {
      return this.form;
    }

    const prev: ConlluElement = this.parent.children[this.isSeg - 1];
    const prevStr = prev ? prev.form.replace(/[ًٌٍَُِّْ۟]*$/, '').substr(-1) : '';

    const next: ConlluElement = this.parent.children[this.isSeg + 1];
    const nextStr  = next ? next.form.charAt(0) : '';

    let meLast = this.form.replace(/[ًٌٍَُِّْ۟]*$/, '');
    meLast = meLast.charAt(meLast.length - 1);
    const meFirst = this.form.charAt(0);

    if (-this.parent.isSeg === this.isSeg + 1) {
      return (Util.isTatweel(prevStr, meFirst) ? 'ـ' : '') + this.form;
    }
    else if (this.isSeg === 0) {
      return this.form + (Util.isTatweel(meLast, nextStr) ? 'ـ' : '');
 }
    else {
      return (Util.isTatweel(prevStr, meFirst) ? 'ـ' : '') +
        this.form
        + (Util.isTatweel(meLast, nextStr) ? 'ـ' : '');
 }
  }

    validateId(id) {

        if (!this.validateField(id, 'ID')) {
            return false;
        } else if (id.match(/^\d+$/)) {
            if (id === '0') {
                this.issues.push('ID indices must start from 1: "' + id + '"');
                return false;
            } else {
                return true;
            }
        } else if (id.match(/^(\d+)-(\d+)$/)) {
            const m = id.match(/^(\d+)-(\d+)$/);
            if (!m) {
                Util.reportError('internal error');
                return false;
            }
            const start = parseInt(m[1], 10);
            const end = parseInt(m[2], 10);
            if (end < start) {
                this.issues.push('ID ranges must have start <= end: "' + id + '"');
                return false;
            } else {
                return true;
            }
        } else if (id.match(/^(\d+)\.(\d+)$/)) {
            const m = id.match(/^(\d+)\.(\d+)$/);
            if (!m) {
                Util.reportError('internal error');
                return false;
            }
            const iPart = parseInt(m[1], 10);
            const fPart = parseInt(m[2], 10);
            if (iPart === 0 || fPart === 0) {
                this.issues.push('ID indices must start from 1: "' + id + '"');
                return false;
            } else {
                return true;
            }
        } else {
            this.issues.push('ID must be integer, range, or decimal: "' + id + '"');
            return false;
        }
    }
    validateForm(form) {
        return this.validateField(form, 'FORM', true);
    }
    validateLemma(lemma) {
        return this.validateField(lemma, 'LEMMA', true);
    }
    validateUpostag(upostag) {
        return this.validateField(upostag, 'UPOSTAG');
    }
    validateXpostag(xpostag) {
        return this.validateField(xpostag, 'XPOSTAG');
    }
    validateFeats(feats) {

        if (!this.validateField(feats, 'FEATS')) {
            return false;
        } else if (feats === '_') {
            return true;
        }
        const initialIssueCount = this.issues.length;
        const featarr = feats.split('|');
        const featmap = {};
        let prevName = '';
        for (const feat of featarr) {
            const m = feat.match(Util.featureRegex);
            if (!m) {
                // TODO more descriptive issue
                this.issues.push('invalid FEATS entry: "' + feat + '"');
                continue;
            }
            const name = m[1];
            const valuestr = m[2];
            if (prevName !== '' &&
                name.toLowerCase() < prevName.toLowerCase()) {
                this.issues.push('features must be ordered alphabetically ' +
                    '(case-insensitive): "' + name + '" < "' + prevName + '"');
                const noIssue = false;
            }
            prevName = name;
            const values = valuestr.split(',');
            const valuemap = {};
            const validValues: string[] = [];
            for (const value of values) {
                const m2 = value.match(Util.featureValueRegex);
                if (!m2) {
                    this.issues.push('invalid FEATS value: "' + value + '"');
                    continue;
                }
                if (valuemap[value] !== undefined) {
                    this.issues.push('duplicate feature value: "' + value + '"');
                    continue;
                }
                valuemap[value] = true;
                validValues.push(value);
            }
            if (featmap[name] !== undefined) {
                this.issues.push('duplicate feature name: "' + name + '"');
                continue;
            }
            if (validValues.length !== 0) {
                featmap[name] = validValues;
            }
        }
        return this.issues.length === initialIssueCount;
    }
    validateHead(head) {

        // TODO: consider checking that DEPREL is "root" iff HEAD is 0.

        if (head === null) {
            return true; // exceptional case for ConlluElement.repair()
        } else if (!this.validateField(head, 'HEAD')) {
            return false;
        } else if (this.isEmptyNode() && head === '_') {
            return true; // underscore permitted for empty nodes.
        } else if (head === '_') {
            return true; // AboBander Only
        } else if (!head.match(/^\d+$/)) {
            this.issues.push('HEAD must be an ID or zero: "' + head + '"');
            return false;
        } else {
            return true;
        }
    }
    validateDeprel(deprel) {

        if (!this.validateField(deprel, 'DEPREL')) {
            return false;
        } else {
            return true;
        }
    }
    validateDeps(deps) {

        // TODO: consider checking that deprel is "root" iff head is 0.

        if (!this.validateField(deps, 'DEPS')) {
            return false;
        } else if (deps === '_') {
            return true;
        }
        const deparr = deps.split('|');
        let prevHead = null;
        // TODO: don't short-circuit on first error
        for (const dep of deparr) {
            const m = dep.match(/^(\d+(?:\.\d+)?):(\S+)$/);
            if (!m) {
                // TODO more descriptive issue
                this.issues.push('invalid DEPS: "' + deps + '"');
                return false;
            }
            const head = m[1];
            const deprel = m[2];
            if (prevHead !== null &&
                parseFloat(head) < parseFloat(prevHead)) {
                this.issues.push('DEPS must be ordered by head index');
                return false;
            }
            prevHead = head;
        }
        return true;
    }
    validateMisc(misc) {

        if (!this.validateField(misc, 'MISC')) {
            return false;
        } else {
            return true;
        }
    }
    validHeadReference(elementById) {
        return (this.head === '_' || this.head === null || this.head === '0' ||
            elementById[this.head] !== undefined);
    }
    isWord() {
        // word iff ID is an integer
        return !!this.id.match(/^\d+$/);
    }    _isMultiword() {
        return !!this.id.match(/^\d+-\d+$/);
    }
    isEmptyNode() {
        return !!this.id.match(/^\d+\.\d+$/);
    }
    rangeFrom() {
        const val = this.id.match(/^(\d+)-\d+$/);
        if (val) {
            return parseInt(val[1], 10);
        }
        return -1;
    }
    rangeTo() {
        const val = this.id.match(/^\d+-(\d+)$/);
        if (val) {
            return parseInt(val[1], 10);
        }
        return -1;
    }
    isToken(inRange) {
        // token iff multiword or not included in a multiword range
        return this.isMultiword || !inRange[this.id];
    }
    // return list of (DEPENDENT, HEAD, DEPREL) lists
    dependencies(skipHead= false): string[][]{

        const elemDeps: string[][] = [];
        if (!skipHead && this.head !== '_' && this.head !== null) {
            elemDeps.push([this.id, this.head, this.deprel]);
        }
        if (this.deps !== '_') {
            const deparr = this.deps.split('|');
            for (const dep of deparr) {
                const m = dep.match(Util.dependencyRegex);
                if (m) {
                    elemDeps.push([this.id, m[1], m[2]]);
                } else {
                    Util.reportError('internal error: dependencies(): invalid DEPS ' +
                        this.deps);
                }
            }
        }
        return elemDeps;
    }


    // Check validity of the element. Return list of strings
    // representing issues found in validation (empty list if none).
    validate() {
        const issues: string[] = [];

        this.validateId(this.id);
        this.validateForm(this.form);

        // multiword tokens (elements with range IDs) are (locally) valid
        // iff all remaining fields (3-10) contain just an underscore.
        if (this.isMultiword) {
            if (this.lemma !== '_' ||
                this.upostag !== '_' ||
                this.xpostag !== '_' ||
                this.feats !== '_' ||
                this.head !== '_' ||
                this.deprel !== '_' ||
                this.deps !== '_' // ||
                // this.misc != '_'
                ) {
                this.issues.push('non-underscore field for multiword token');
            }
            return issues;
        }
        // if we're here, not a multiword token.

        this.validateLemma(this.lemma);
        this.validateUpostag(this.upostag);
        this.validateXpostag(this.xpostag);
        this.validateFeats(this.feats);
        this.validateHead(this.head);
        this.validateDeprel(this.deprel);
        this.validateDeps(this.deps);
        this.validateMisc(this.misc);

        return issues;
    }
    // Attempt to repair a non-valid element. Return true iff the
    // element is valid following repair, false otherwise.
    repair(log) {
        log = (log !== undefined ? log : Util.nullLogger);

        if (!this.validateId(this.id)) {
            return false; // can't be helped
        }

        if (!this.validateForm(this.form)) {
            log('repair: blanking invalid FORM');
            this.form = '<ERROR>';
        }

        if (this.isMultiword) {
            // valid as long as everything is blank
            this.lemma = '_';
            this.upostag = '_';
            this.xpostag = '_';
            this.feats = '_';
            this.head = '_';
            this.deprel = '_';
            this.deps = '_';
            // this.misc = '_';
            return true;
        }
        // if we're here, not a multiword token.

        if (!this.validateLemma(this.lemma)) {
            log('repair: blanking invalid LEMMA');
            this.lemma = '<ERROR>';
        }

        if (!this.validateUpostag(this.upostag)) {
            log('repair: blanking invalid UPOSTAG');
            this.upostag = '_'; // TODO: not valid
        }

        if (!this.validateXpostag(this.xpostag)) {
            log('repair: blanking invalid XPOSTAG');
            this.xpostag = '_';
        }

        if (!this.validateFeats(this.feats)) {
            log('repair: blanking invalid FEATS ' + this.toConllU(false));
            this.feats = '_';
        }

        if (!this.validateHead(this.head)) {
            log('repair: blanking invalid HEAD');
            this.head = ''; // note: exceptional case
        }

        if (!this.validateDeprel(this.deprel)) {
            log('repair: blanking invalid DEPREL');
            this.deprel = '_'; // TODO: not valid
        }

        if (!this.validateDeps(this.deps)) {
            log('repair: blanking invalid DEPS');
            this.deps = '_';
        }

        if (!this.validateMisc(this.misc)) {
            log('repair: blanking invalid MISC');
            this.misc = '_';
        }

        const issues = this.validate();
        return issues.length === 0;
    }
    /*
     * Miscellaneous support functions.
     */

}
