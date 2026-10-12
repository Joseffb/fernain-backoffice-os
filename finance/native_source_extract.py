"""Bounded connected Docs text, native UTF-16 mapping and exact revision proof.
No remote IO, OCR or financial inference. Unknown/nontext/suggested content holds.
"""
import hashlib,json,sys
from finance_docs_claim import unwrap as unwrap_document,require,canonical
MIME='application/vnd.google-apps.document'
MAX_CHARS=20000
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def inspect(x):
    doc=unwrap_document(x['document']);require(doc.get('documentId')==x['document_id'],'wrong native source ID')
    require(set(doc)<= {'documentId','title','revisionId','suggestionsViewMode','documentStyle','namedStyles','body','tabs','url','document_url','headers','footers','footnotes','lists','namedRanges','inlineObjects','positionedObjects','suggestedDocumentStyleChanges','suggestedNamedStylesChanges'},'unknown/partial native source response')
    rev=doc.get('revisionId');require(type(rev) is str and rev and rev==rev.strip(),'native source revision missing')
    require(doc.get('suggestionsViewMode')=='SUGGESTIONS_INLINE','complete inline suggestion view required')
    require(len(canonical(doc).encode())<=2097152,'native response exceeds bound')
    def suggestions(v):
        if type(v) is dict:
            for k,item in v.items():
                if (k.startswith('suggested') or k.startswith('suggestion')) and k!='suggestionsViewMode':require(item in (None,{},[]),'native suggestions require review')
                suggestions(item)
        elif type(v) is list:
            for item in v:suggestions(item)
    suggestions(doc)
    return doc,rev,sha(canonical(doc))
def extract(x):
    doc,rev,digest=inspect(x);parts=[];mapping=[];cursor=0;tab_ids=set();steps=0
    def add(text,tab,section,start=None,end=None):
        nonlocal cursor
        if not text:return
        require(len(mapping)<200,'native source mapping exceeds bounded invoice scope')
        require(type(text) is str and '\x00' not in text,'invalid native text')
        n=len(text);require(cursor+n<=MAX_CHARS,'native source text exceeds bound')
        row={'start_char':cursor,'end_char':cursor+n,'tab_id':tab,'section':section,'kind':'text_run' if start is not None else 'structural_separator','text_sha256':sha(text)}
        if start is not None:row.update(native_start_utf16=start,native_end_utf16=end)
        mapping.append(row);parts.append(text);cursor+=n
    def sections(content,tab,section,depth=0,cell=False):
        nonlocal steps
        require(depth<=8 and type(content) is list,'native content depth/type unsupported')
        prior=0
        for node in content:
            steps+=1;require(steps<=4000 and type(node) is dict,'native content capacity/type')
            start=node.get('startIndex',0);end=node.get('endIndex');require(type(start) is int and type(end) is int and prior<=start<end,'native content indices overlap/invalid');prior=end
            kinds=set(node)&{'paragraph','table','sectionBreak'};require(len(kinds)==1 and set(node)<=kinds|{'startIndex','endIndex'},'unknown/nontext native content')
            if 'sectionBreak' in node:continue
            if 'paragraph' in node:
                p=node['paragraph'];require(type(p) is dict and set(p)<= {'elements','paragraphStyle','bullet','positionedObjectIds'} and not p.get('positionedObjectIds'),'native paragraph unsupported/nontext')
                elements=p.get('elements');require(type(elements) is list and elements,'native paragraph incomplete');run_end=start
                for run in elements:
                    require(type(run) is dict and set(run)<= {'startIndex','endIndex','textRun'} and 'textRun' in run,'native nontext paragraph element')
                    t=run['textRun'];require(type(t) is dict and set(t)<= {'content','textStyle'} and type(t.get('content')) is str,'native text run incomplete')
                    rs,re=run.get('startIndex'),run.get('endIndex');text=t['content'];require(type(rs) is int and type(re) is int and rs==run_end and re-rs==len(text.encode('utf-16-le'))//2 and re<=end,'native UTF-16 text indices mismatch');run_end=re
                    require(not t.get('textStyle',{}).get('strikethrough'),'struck financial text requires review')
                    # A table-cell's final paragraph newline is replaced by a
                    # structural column separator. Literal text stays mapped.
                    if cell and node is content[-1] and re==end and text.endswith('\n'):text=text[:-1]
                    add(text,tab,section,rs,rs+len(text.encode('utf-16-le'))//2)
                require(run_end==end,'native paragraph text incomplete')
            else:
                table=node['table'];require(type(table) is dict and set(table)<= {'rows','columns','tableRows','tableStyle'} and type(table.get('tableRows')) is list,'native table unsupported')
                rows=table['tableRows'];require(type(table.get('rows')) is int and table['rows']==len(rows) and 0<len(rows)<=100,'native table rows incomplete')
                for ri,row in enumerate(rows):
                    require(type(row) is dict and set(row)<= {'startIndex','endIndex','tableCells','tableRowStyle'},'native table row unsupported')
                    cells=row.get('tableCells');require(type(cells) is list and 0<len(cells)<=20 and table.get('columns')==len(cells),'native table cells incomplete/merged')
                    for ci,c in enumerate(cells):
                        require(type(c) is dict and set(c)<= {'startIndex','endIndex','content','tableCellStyle'},'native table cell unsupported')
                        style=c.get('tableCellStyle',{});require(style.get('rowSpan',1)==1 and style.get('columnSpan',1)==1,'merged native table requires review')
                        sections(c.get('content'),tab,section+':row'+str(ri)+':cell'+str(ci),depth+1,True)
                        if ci<len(cells)-1:add('\t',tab,section)
                    add('\n',tab,section)
    def read_tabs(tabs,depth=0):
        require(type(tabs) is list and bool(tabs) and depth<=4,'native tabs incomplete')
        for tab in tabs:
            require(type(tab) is dict,'native tab unsupported')
            flat='tabId' in tab;props=tab if flat else tab.get('tabProperties',{});tid=props.get('tabId');require(type(tid) is str and tid and tid not in tab_ids and len(tab_ids)<10,'native tab identity/capacity');tab_ids.add(tid)
            obj=tab if flat else tab.get('documentTab');require(type(obj) is dict and type(obj.get('body')) is dict,'native tab body missing')
            allowed={'body','headers','footers','footnotes','documentStyle','suggestedDocumentStyleChanges','namedStyles','suggestedNamedStylesChanges','lists','namedRanges','inlineObjects','positionedObjects'}
            if not flat:require(set(tab)<= {'tabProperties','documentTab','childTabs'} and set(obj)<=allowed,'unknown native tab content')
            else:
                require(set(tab)<=allowed|{'tabId','title','parentTabId','index','nestingLevel','iconEmoji','documentId','document_url','childTabs','dropdownDefinitions'},'unknown flattened native tab content')
                require(tab.get('dropdownDefinitions') is None,'native dropdown content requires review')
                require(tab.get('documentId',doc['documentId'])==doc['documentId'],'flattened native source identity mismatch')
            for key in ['inlineObjects','positionedObjects','footnotes']:require(obj.get(key) in (None,{},[]),'native object/footnote requires review')
            add('\n' if cursor else '',tid,'tab_boundary')
            require(set(obj['body'])=={'content'},'native body incomplete');sections(obj['body']['content'],tid,'body')
            for kind in ['headers','footers']:
                entries=obj.get(kind) or {};require(type(entries) is dict and len(entries)<=20,'native auxiliary content incomplete')
                for key,item in sorted(entries.items()):
                    require(type(item) is dict and set(item)<= {'content','headerId','footerId'} and 'content' in item,'native auxiliary content unsupported');add('\n',tid,kind+':'+key);sections(item['content'],tid,kind+':'+key)
            if tab.get('childTabs'):read_tabs(tab['childTabs'],depth+1)
    require(doc.get('body') is None,'mixed/legacy native body requires review')
    for key in ['headers','footers','footnotes','inlineObjects','positionedObjects']:require(doc.get(key) in (None,{},[]),'mixed root native auxiliary content')
    read_tabs(doc.get('tabs'));text=''.join(parts);require(text.strip(),'native source empty/unreadable')
    return {'source_text':text,'source_read':{'complete':True,'sha256':sha(text),'source_text_sha256':sha(text),'format':MIME,'source_revision_id':rev,'native_snapshot_sha256':digest,'extraction_method':'complete connected native text runs; explicit tab/table separators; no inference','offset_unit':'Python Unicode codepoints; native mapping indices UTF-16','text_mapping':mapping,'ocr_status':'not_performed'}}
def run(x):
    if x.get('operation')=='snapshot':
        _,rev,digest=inspect(x);return {'revision_id':rev,'sha256':digest}
    return extract(x)
if __name__=='__main__':
    try:print(json.dumps(run(json.load(sys.stdin)),ensure_ascii=False))
    except Exception as e:print(json.dumps({'held':True,'code':str(e)}));sys.exit(3)
