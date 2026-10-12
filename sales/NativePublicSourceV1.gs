/* Bounded, distinct Google-native source contract. NOT the V8 browser profile.
 * No model/event URL, effect, writer, mail, scope, timer or installation entry point.
 * UrlFetchApp cannot attest/pin its actual connection IP. This explicitly accepted
 * profile is DNS-preflight HTTPS, not peer-IP attestation or the stricter proposal.
 */
var BackofficeNativePublicSourceV1 = (function makeProducer(registryLoader, trustedNativeReadProof) {
  'use strict';
  var PROFILE = 'GOOGLE_URLFETCH_PUBLIC_PRIMARY_DNS_PREFLIGHT_V1';
  var MATERIAL_PROFILE = 'UNAUTHENTICATED_RETAINED_RESPONSE_BYTES_REPLAY_V1';
  var NS = 'FERNAIN_NATIVE_SOURCE_CONTEXT_V1';
  var SHEET = '{{CONFIGURE_GOOGLE_ID_030}}';
  var REGISTRY = Object.freeze({EXAMPLE_ROLE_001:Object.freeze({
    row:10, leadId:'EXAMPLE-LEAD-001', product:'Jobs', person:'Casey Example',
    role:'President/CEO', email:'contact07@example.net',
    organization:'Example Community Association',
    organizationType:'COMMUNITY_ORGANIZATION', organizationKey:'example-community-association',
    staffUrl:'https://example.org/about-us/',
    workflowUrl:'https://business.example.org/jobs/',
    staffSection:'Leadership', personHeadingLevel:3, workflowHeading:'Opportunities',
    observation:'The sample source announces open opportunities.'
  })});
  var RANGES = ['Prospects!A1:AA1000','Prospects!A1001:AA2000',
    'Evidence!A1:Z1800','Evidence!A1801:Z3600','Evidence!A3601:Z5400',
    'Evidence!A5401:Z7200','Evidence!A7201:Z9000','Evidence!A9001:Z10000'];
  // Finite source capacity; policy/registry, parser, DNS and time budgets remain separate.
  var MAX_BYTES=524288, MAX_TEXT=524288, MAX_DNS_BYTES=8192, MAX_CHAIN=4;
  // Script-owned acceptance branch. Never an event, model or caller parameter.
  var REQUIRE_ACTUAL_PEER_IP = false;
  var RESEARCH_STATUSES=Object.freeze(['Held - source freshness review','Hold - current source qualification',
    'Qualified - source refresh hold','Hold - source refresh','Qualified - verification hold',
    'Held - current role unverified','Held - current email rendering','Held - current contact proof','Hold - identity refresh']);
  var loadedRegistry=null,registryMetadata=null,registryNativeReadProof=null;
  var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
  function fail(code){throw Error(code);}
  function need(ok,code){if(!ok)fail(code);}
  function sha(v){return BackofficeSalesEvidenceV1.sha256(typeof v==='string'?v:JSON.stringify(v));}
  function utc(v){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v))return NaN;
    var n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString()===v?n:NaN;}
  function fresh(v,n){var t=utc(v);return Number.isFinite(t)&&t<=n&&n-t<300000;}
  var INTERNAL_REASON_CODES=Object.freeze(["ACTUAL_CONNECTION_PUBLIC_IP_AND_PINNING_UNAVAILABLE","ALREADY_SENT_OR_SOURCE_STATUS_INELIGIBLE_HOLD","ASCII_NAME_HOLD","BOTH_NATIVE_DNS_HOSTS_HOLD","BOTH_PRIMARY_SOURCES_REQUIRED_HOLD","BOUND_REPLAY_CONTEXT_SECURITY_HOLD","BYTE_HASH_SERVICE_HOLD","CANONICAL_CELL_HOLD","CANONICAL_ORGANIZATION_DISPLAY_HOLD","CANONICAL_ORGANIZATION_FORMULA_DISPLAY_HOLD","CANONICAL_ROW_HOLD","CANONICAL_TAB_HOLD","CAPTURE_FETCH_OR_TIME_BOUND_HOLD","CAPTURE_FRESHNESS_HOLD","CLOCK_HOLD","CONTENT_LENGTH_AMBIGUOUS_HOLD","CONTENT_LENGTH_MISMATCH_HOLD","CONTENT_TYPE_AMBIGUOUS_HOLD","DENSE_ACCESSOR_FREE_BYTES_HOLD","DNS_ADDRESS_UNKNOWN_HOLD","DNS_AMBIGUOUS_CNAME_HOLD","DNS_ANSWER_HOLD","DNS_A_AAAA_CNAME_MISMATCH_HOLD","DNS_BINDING_INCOMPLETE_OR_LOOP_HOLD","DNS_CAPTURE_ORDER_BINDING_HOLD","DNS_CHANGED_DURING_CAPTURE_HOLD","DNS_CLOCK_OR_FRESHNESS_HOLD","DNS_CNAME_BOUND_HOLD","DNS_CNAME_LOOP_HOLD","DNS_CNAME_LOOP_OR_BOUND_HOLD","DNS_COMPLETE_A_AAAA_BINDING_HOLD","DNS_COMPLETE_RECORDS_HOLD","DNS_CONTENT_TYPE_HOLD","DNS_DUPLICATE_RECORD_HOLD","DNS_ECS_MISMATCH_HOLD","DNS_FRESHNESS_HOLD","DNS_INCOMPLETE_OR_STATUS_HOLD","DNS_NAME_HOLD","DNS_NONPUBLIC_OR_UNKNOWN_ADDRESS_HOLD","DNS_PARSED_PREIMAGE_HOLD","DNS_PROVENANCE_HOLD","DNS_QUERY_BINDING_HOLD","DNS_QUESTION_HOLD","DNS_QUESTION_MISMATCH_HOLD","DNS_RECORD_HOLD","DNS_RECORD_PREIMAGE_HOLD","DNS_RESPONSE_BYTES_PREIMAGE_HOLD","DNS_RESPONSE_OBJECT_HOLD","DNS_UNEXPECTED_SECTION_HOLD","DNS_UNKNOWN_FIELDS_HOLD","DNS_UNRELATED_ANSWER_HOLD","EMPTY_BYTES_HOLD","EXACT_COMPLETE_POLICY_RANGES_HOLD","EXACT_HTTPS_URL_HOLD","EXACT_STAFF_SECTION_HOLD","EXACT_UNIQUE_PERSON_HEADING_HOLD","EXACT_WITNESSED_MAILTO_HOLD","EXACT_WORKFLOW_HEADING_HOLD","EXACT_WORKFLOW_SEARCH_CONTROL_HOLD","EXACT_WORKFLOW_SELECT_HOLD","FULL_27_CELL_PREIMAGE_HOLD","FULL_CANONICAL_DATA_HOLD","FULL_CANONICAL_ROW_HOLD","FULL_CANONICAL_SHEETS_HOLD","FULL_NATIVE_CANONICAL_HOLD","FULL_NATIVE_POLICY_EVIDENCE_REQUIRED_HOLD","FULL_PACKET_ACCESSOR_FREE_OBJECT_HOLD","FULL_PACKET_COMPLEXITY_HOLD","FULL_PACKET_DENSE_ARRAY_HOLD","FULL_PACKET_NUMBER_HOLD","FULL_PACKET_SIZE_HOLD","FULL_POLICY_GMAIL_COVERAGE_HOLD","FULL_POLICY_PACKET_REQUIRED_HOLD","HIDDEN_OR_ACTIVE_EVIDENCE_HOLD","HTML_ATTRIBUTE_HOLD","HTML_BOUND_HOLD","HTML_COMMENT_HOLD","HTML_COMPLEXITY_HOLD","HTML_DOCTYPE_HOLD","HTML_DUPLICATE_ATTRIBUTE_HOLD","HTML_ENTITY_HOLD","HTML_RAW_BLOCK_HOLD","HTML_TAG_HOLD","HTML_UNCLOSED_TREE_HOLD","HTML_UNSUPPORTED_IMPLIED_OR_MISMATCHED_CLOSURE_HOLD","NATIVE_CAPTURE_ORDER_HOLD","NATIVE_CAPTURE_PROVENANCE_HOLD","NATIVE_DNS_FULL_BINDING_HOLD","NATIVE_FULL_POLICY_TARGET_OR_PREIMAGE_HOLD","NATIVE_RESPONSE_METHODS_HOLD","NATIVE_SERVICES_HOLD","NATIVE_SOURCE_CAPTURE_HOLD","NON_200_OR_REDIRECT_HOLD","PLAIN_TEXT_LAYOUT_NOT_REGISTERED_HOLD","POLICY_COVERAGE_HOLD","POLICY_EXISTING_CONVERSATION_HOLD","POLICY_GMAIL_IDS_HOLD","POLICY_NATIVE_READ_OR_FRESHNESS_HOLD","POLICY_ROW_HOLD","POLICY_VALUES_HOLD","POLICY_VALUES_MISSING_HOLD","POLICY_VALUE_HOLD","RAW_BYTES_TEXT_DIGEST_MISMATCH_HOLD","RAW_CELL_PREIMAGE_HOLD","REDIRECT_OR_PARTIAL_HEADERS_HOLD","REGISTRY_CANONICAL_IDENTITY_DUPLICATE_HOLD","REGISTRY_DEFINITION_HOLD","REGISTRY_SOURCE_PAIR_DISTINCT_HOLD","RESPONSE_HEADERS_HOLD","RETAINED_SOURCE_MATERIAL_HOLD","SCALAR_UTF8_HOLD","SCRIPT_OWNED_REGISTRY_DEFINITION_HOLD","SCRIPT_OWNED_REGISTRY_ENTRIES_HOLD","SCRIPT_OWNED_REGISTRY_HANDLE_HOLD","SCRIPT_OWNED_REGISTRY_LOADER_REQUIRED_HOLD","SCRIPT_OWNED_REGISTRY_LOAD_HOLD","SCRIPT_OWNED_REGISTRY_SCHEMA_HOLD","SCRIPT_OWNED_REGISTRY_STALE_HOLD","SIGNED_INTEGER_BYTES_HOLD","SOURCE_BINDING_HOLD","SOURCE_CANONICAL_IDENTITY_MISMATCH_HOLD","SOURCE_EXACT_SELECTION_PREIMAGE_HOLD","SOURCE_KIND_HOLD","SOURCE_KIND_MISMATCH_HOLD","SOURCE_MATERIAL_PROVENANCE_HOLD","SOURCE_RESPONSE_PREIMAGE_HOLD","SOURCE_TEXT_BOUND_HOLD","SOURCE_URL_REGISTRY_MISMATCH","SOURCE_UTF8_CONTENT_TYPE_HOLD","STAFF_BLOCK_BOUND_HOLD","STAFF_ROLE_MAIL_ATOMS_HOLD","STRICT_UTF8_HOLD","SUPPORTED_WORKFLOW_CONTAINER_HOLD","UNREGISTERED_CANONICAL_HANDLE_CANDIDATE_LOCAL_HOLD","DERIVED_SOURCE_LAYOUT_REPRODUCTION_HOLD","SOURCE_LAYOUT_DERIVATION_BOUND_HOLD","UNVERIFIED_SOURCE_LAYOUT_CANDIDATE_LOCAL_HOLD","UNVERIFIED_ORGANIZATION_CLASSIFICATION_CANDIDATE_LOCAL_HOLD","NATIVE_SOURCE_LAYOUT_DERIVATION_CANDIDATE_LOCAL_HOLD","UNEXPECTED_SOURCE_LAYOUT_DERIVATION_HOLD","WORKFLOW_CONTROL_CONTAINER_HOLD","WORKFLOW_FORM_DESTINATION_HOLD"]);
  function safeReason(error,fallback){try{var d=error&&typeof error==='object'&&Object.getOwnPropertyDescriptor(error,'message');
    return d&&own(d,'value')&&typeof d.value==='string'&&INTERNAL_REASON_CODES.includes(d.value)?d.value:fallback;}catch(ignored){return fallback;}}
  function hold(code,extra){var r={schema:NS,outcome:'HOLD',reason_code:code,
    record_authorized:false,effect_eligible:false,send_eligible:false,discovery_implemented:false};
    if(extra)r.evidence=extra;return r;}
  function registry(){return loadedRegistry||REGISTRY;}
  function key(k){need(typeof k==='string'&&own(registry(),k),'UNREGISTERED_CANONICAL_HANDLE_CANDIDATE_LOCAL_HOLD');return registry()[k];}
  function urlHost(u){var m=typeof u==='string'&&u.match(/^https:\/\/([a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,})\/([A-Za-z0-9._~\/-]*)$/);
    need(!!m&&!/^\d+(?:\.\d+){3}$/.test(m[1])&&!m[2].split('/').some(function(s){return s==='.'||s==='..';}), 'EXACT_HTTPS_URL_HOLD');return m[1];}
  function exactUrl(k,kind,u){var r=key(k);need(kind==='staff'||kind==='workflow','SOURCE_KIND_HOLD');
    need(u===r[kind==='staff'?'staffUrl':'workflowUrl'],'SOURCE_URL_REGISTRY_MISMATCH');return urlHost(u);}
  function dataObject(o,code){need(o!==null&&typeof o==='object'&&!Array.isArray(o)&&
    (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null)&&Object.getOwnPropertySymbols(o).length===0,code);
    Object.getOwnPropertyNames(o).forEach(function(k){var d=Object.getOwnPropertyDescriptor(o,k);
      need(d&&own(d,'value')&&d.enumerable&&!['__proto__','constructor','prototype'].includes(k),code);});return o;}
  function dense(a,max,code){need(Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&a.length<=max&&
    Object.getOwnPropertySymbols(a).length===0,code);var names=Object.getOwnPropertyNames(a);
    need(names.length===a.length+1&&names.includes('length'),code);
    for(var i=0;i<a.length;i++){var d=Object.getOwnPropertyDescriptor(a,String(i));need(d&&own(d,'value')&&d.enumerable,code);}return a;}
  function octets(input,max){dense(input,max,'DENSE_ACCESSOR_FREE_BYTES_HOLD');need(input.length>0,'EMPTY_BYTES_HOLD');
    var out=[];for(var i=0;i<input.length;i++){var v=Object.getOwnPropertyDescriptor(input,String(i)).value;
      need(Number.isInteger(v)&&v>=-128&&v<=255,'SIGNED_INTEGER_BYTES_HOLD');out.push(v<0?v+256:v);}return out;}
  function utf8(input,max){var b=octets(input,max||MAX_BYTES),out='';
    for(var i=0;i<b.length;i++){var c=b[i],n=c<128?0:c>=194&&c<=223?1:c>=224&&c<=239?2:c>=240&&c<=244?3:-1;
      need(n>=0&&i+n<b.length&&c!==0,'STRICT_UTF8_HOLD');var cp=n?c&((1<<(6-n))-1):c;
      for(var j=1;j<=n;j++){var z=b[i+j];need(z>=128&&z<=191,'STRICT_UTF8_HOLD');cp=cp*64+(z&63);}
      need(!(n===1&&cp<128||n===2&&(cp<2048||cp>=55296&&cp<=57343)||n===3&&(cp<65536||cp>1114111)),'STRICT_UTF8_HOLD');
      out+=String.fromCodePoint(cp);i+=n;}return {bytes:b,text:out};}
  function byteLength(s){var n=0;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c>=55296&&c<=56319){
      need(i+1<s.length&&s.charCodeAt(i+1)>=56320&&s.charCodeAt(i+1)<=57343,'SCALAR_UTF8_HOLD');i++;n+=4;
    }else{need(c<56320||c>57343,'SCALAR_UTF8_HOLD');n+=c<128?1:c<2048?2:3;}}return n;}
  // Conservative HTML encoding contract, not browser sniffing or the diagnostic regex.
  // WHATWG charset declaration: real head metadata, UTF-8 only, serialized fully
  // within the first 1024 bytes, no character references, unique across the document.
  // A UTF-8 BOM is sufficient without a declaration; conflicting declarations hold.
  function bareHtmlUtf8(material){var text=material.text,tree=htmlTree(text),decl=[],bom=material.bytes[0]===239&&material.bytes[1]===187&&material.bytes[2]===191;
    function space(node,root){var raw=text.slice(node.start,node.end);if(root&&bom&&node.start===0)raw=raw.slice(1);return /^[\t\n\f\r ]*$/.test(raw);}
    // htmlTree is lexical, not an HTML tree builder. Constrain this new branch
    // to syntax where comments, ASCII tag whitespace and head context agree.
    var rawNodes={};tree.nodes.forEach(function(v){if(['script','style','noscript','template'].includes(v.tag))rawNodes[v.start]=v;});
    for(var pos=0;pos<text.length;){
      if(text.slice(pos,pos+4)==='<!--'){var close=text.indexOf('-->',pos+4),comment=text.slice(pos+4,close);
        need(close>=0&&!/^(?:>|->)|--|<!-/.test(comment),'SOURCE_UTF8_CONTENT_TYPE_HOLD');pos=close+3;continue;}
      if(text[pos]!=='<'){var next=text.indexOf('<',pos);pos=next<0?text.length:next;continue;}
      var end=pos+1,quote='';for(;end<text.length;end++){var ch=text[end];if(quote){if(ch===quote)quote='';}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
      need(end<text.length&&!quote,'SOURCE_UTF8_CONTENT_TYPE_HOLD');var token=text.slice(pos,end+1);
      if(/^<!doctype/i.test(token))need(/^<!doctype[\t\n\f\r ]+html[\t\n\f\r ]*>$/i.test(token),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
      else need(!/[^\x09\x0a\x0c\x0d\x20-\x7e]/.test(token.replace(/"[^"]*"|'[^']*'/g,'""')),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
      var rawNode=rawNodes[pos];if(rawNode){
        need(new RegExp('^</'+rawNode.tag+'[\\t\\n\\f\\r ]*>$','i').test(text.slice(rawNode.closeStart,rawNode.end)),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
        if(rawNode.tag==='noscript'||rawNode.tag==='template')need(!/<meta(?:[\t\n\f\r ]|\/|>)/i.test(text.slice(rawNode.openEnd,rawNode.closeStart)),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
        pos=rawNode.end;
      }else pos=end+1;
    }
    tree.nodes.forEach(function(node){if(node.tag==='meta'&&(own(node.attrs,'charset')||
      (node.attrs['http-equiv']||'').toLowerCase()==='content-type'))decl.push(node);});
    need(decl.length<=1,'SOURCE_UTF8_CONTENT_TYPE_HOLD');
    if(decl.length){var node=decl[0],a=node.attrs,head=node.parent,html=head&&head.parent;
      var heads=tree.nodes.filter(function(v){return v.tag==='head';}),htmls=tree.nodes.filter(function(v){return v.tag==='html';}),bodies=tree.nodes.filter(function(v){return v.tag==='body';});
      need(head&&head.tag==='head'&&html&&html.tag==='html'&&html.parent===tree.root&&
        heads.length===1&&htmls.length===1&&bodies.length<=1&&(!bodies.length||bodies[0].parent===html&&bodies[0].start>=head.end)&&
        tree.root.children.every(function(v){return v===html||v.tag==='#text'&&space(v,true);})&&
        html.children.every(function(v){return v===head||v.tag==='body'||v.tag==='#text'&&space(v,false);})&&
        head.children.every(function(v){return v.tag==='#text'?space(v,false):
          (['base','link','meta','title','style','script'].includes(v.tag)||
            // The same inert head noscript style is safe with scripting on or off.
            v.tag==='noscript'&&Object.keys(v.attrs).length===0&&v.closeStart-v.openEnd<=4096&&
            /^[\t\n\f\r ]*<style[\t\n\f\r ]*>[^<>&]*<\/style[\t\n\f\r ]*>[\t\n\f\r ]*$/i.test(text.slice(v.openEnd,v.closeStart)))&&
          (['base','link','meta'].includes(v.tag)||!/\/\s*>$/.test(text.slice(v.start,v.openEnd)))&&
          (v.tag!=='title'||v.children.every(function(c){return c.tag==='#text';}));}), 'SOURCE_UTF8_CONTENT_TYPE_HOLD');
      // Void metadata permits XML-style trailing slash; nonvoid elements do not.
      need(tree.nodes.every(function(v){return v.start>node.start||v.tag==='#text'||['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(v.tag)||
        !/\/\s*>$/.test(text.slice(v.start,v.openEnd));}),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
      var raw=text.slice(node.start,node.openEnd),modern=own(a,'charset');
      // Independently parse this one declaration using HTML ASCII whitespace.
      // In an unquoted value the trailing slash is data, not XML-style closure.
      var tail=raw.slice(5,-1),parsed={},offset=0;
      while(offset<tail.length){var ws=tail.slice(offset).match(/^[\t\n\f\r ]+/);if(ws)offset+=ws[0].length;
        if(offset===tail.length)break;if(tail.slice(offset)==='/')break;
        need(!!ws,'SOURCE_UTF8_CONTENT_TYPE_HOLD');
        var attr=tail.slice(offset).match(/^([A-Za-z_:][A-Za-z0-9_.:-]*)(?:[\t\n\f\r ]*=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r "'`=<>]+)))?/);
        need(!!attr&&!own(parsed,attr[1].toLowerCase()),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
        parsed[attr[1].toLowerCase()]=attr[2]!==undefined?attr[2]:attr[3]!==undefined?attr[3]:attr[4]!==undefined?attr[4]:'';offset+=attr[0].length;
      }
      need(JSON.stringify(parsed)===JSON.stringify(a),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
      need(!tree.nodes.some(function(v){return v.tag==='script'&&v.start<node.start;})&&
        byteLength(text.slice(0,node.openEnd))<=1024&&!/[&\\]/.test(raw)&&
        !own(a,'name')&&!own(a,'itemprop')&&
        (modern?!own(a,'http-equiv')&&!own(a,'content')&&/^utf-8$/i.test(a.charset):
          own(a,'content')&&/^text\/html;[\t\n\f\r ]*charset=utf-8$/i.test(a.content)), 'SOURCE_UTF8_CONTENT_TYPE_HOLD');
    }
    need(decl.length===1||bom,'SOURCE_UTF8_CONTENT_TYPE_HOLD');return true;
  }
  function sourceType(type,material){var m=typeof type==='string'&&type.match(/^(text\/(?:html|plain))\s*;\s*charset\s*=\s*(?:utf-8|"utf-8")\s*$/i);
    if(m)return m[1].toLowerCase();need(typeof type==='string'&&/^text\/html\s*$/i.test(type),'SOURCE_UTF8_CONTENT_TYPE_HOLD');
    bareHtmlUtf8(material);return 'text/html';}
  function responseMaterial(response,kind,services){need(response&&typeof response.getResponseCode==='function'&&
    typeof response.getAllHeaders==='function'&&typeof response.getContent==='function','NATIVE_RESPONSE_METHODS_HOLD');
    need(response.getResponseCode()===200,'NON_200_OR_REDIRECT_HOLD');var h=dataObject(response.getAllHeaders(),'RESPONSE_HEADERS_HOLD'),keys=Object.keys(h);
    var ct=keys.filter(function(k){return k.toLowerCase()==='content-type';});need(ct.length===1&&typeof h[ct[0]]==='string','CONTENT_TYPE_AMBIGUOUS_HOLD');
    need(!keys.some(function(k){return k.toLowerCase()==='location'||k.toLowerCase()==='content-range';}),'REDIRECT_OR_PARTIAL_HEADERS_HOLD');
    var type=h[ct[0]],mime;
    if(kind==='dns'){need(/^(?:application\/json|application\/dns-json)(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(type),'DNS_CONTENT_TYPE_HOLD');mime='application/json';}
    else{var m=type.match(/^(text\/(?:html|plain))\s*;\s*charset\s*=\s*(?:utf-8|"utf-8")\s*$/i);
      if(!m){var observation={schema:'BackofficeNativeSourceMimeObservation/v1',mediaType:'OTHER',charset:'OTHER',parameterCount:null,strictUtf8:'UNKNOWN',byteContainer:'UNKNOWN',bytePrototype:'UNKNOWN',byteArrayLength:null,byteBound:'UNKNOWN',byteFailure:'NONE',bomKind:'UNKNOWN',prefixCharset:'UNKNOWN',prefixObservationOnly:true,bom:false,metaCharset:'UNKNOWN',rawSha256:null,byteLength:null,contentLengthFieldCount:null,contentLengthType:'UNKNOWN',contentLengthCanonical:false,contentLengthMatchesBytes:false,contentEncoding:'UNKNOWN',observationOnly:true,record_authorized:false,effect_eligible:false,send_eligible:false};
        try{var lengthKeys=keys.filter(function(k){return k.toLowerCase()==='content-length';}),encodingKeys=keys.filter(function(k){return k.toLowerCase()==='content-encoding';});observation.contentLengthFieldCount=lengthKeys.length<=8?lengthKeys.length:null;var lengthValue=lengthKeys.length===1?h[lengthKeys[0]]:null;observation.contentLengthType=lengthKeys.length===0?'NONE':lengthKeys.length!==1?'MULTIPLE':typeof lengthValue==='string'?'STRING':typeof lengthValue==='number'?'NUMBER':Array.isArray(lengthValue)?'ARRAY':'OTHER';observation.contentLengthCanonical=typeof lengthValue==='string'&&/^(?:0|[1-9]\d*)$/.test(lengthValue);var encoding=encodingKeys.length===1&&typeof h[encodingKeys[0]]==='string'?h[encodingKeys[0]].trim().toLowerCase():null;observation.contentEncoding=encodingKeys.length===0?'NONE':encodingKeys.length!==1?'MULTIPLE':encoding==='identity'?'IDENTITY':encoding==='gzip'?'GZIP':encoding==='br'?'BR':'OTHER';var pieces=type.split(';'),media=pieces[0].trim().toLowerCase();observation.mediaType=media==='text/html'?'HTML':media==='text/plain'?'PLAIN':'OTHER';observation.parameterCount=pieces.length<=8?pieces.length-1:null;
          var charsets=pieces.slice(1).filter(function(v){return /^\s*charset\s*=/i.test(v);});if(charsets.length===0)observation.charset='NONE';else if(charsets.length!==1)observation.charset='MULTIPLE';else{var charset=charsets[0].replace(/^\s*charset\s*=\s*/i,'').trim().replace(/^"([^"]*)"$/,'$1').toLowerCase();observation.charset=charset==='utf-8'?'UTF8':charset==='iso-8859-1'?'ISO_8859_1':charset==='windows-1252'?'WINDOWS_1252':'OTHER';}
          try{var diagnosticInput=response.getContent();observation.byteContainer=Array.isArray(diagnosticInput)?'ARRAY':'OTHER';if(Array.isArray(diagnosticInput)){var diagnosticProto=Object.getPrototypeOf(diagnosticInput);observation.bytePrototype=diagnosticProto===Array.prototype?'ARRAY':diagnosticProto===null?'NULL':'OTHER';var diagnosticLength=Object.getOwnPropertyDescriptor(diagnosticInput,'length');if(diagnosticLength&&Object.prototype.hasOwnProperty.call(diagnosticLength,'value')&&Number.isInteger(diagnosticLength.value)&&diagnosticLength.value>=0&&diagnosticLength.value<=4294967295){observation.byteArrayLength=diagnosticLength.value;observation.byteBound=diagnosticLength.value<=MAX_BYTES?'IN_BOUND':'OVER_BOUND';}}try{if(Array.isArray(diagnosticInput)&&observation.byteArrayLength!==null){var diagnosticPrefix=[],prefixLimit=Math.min(observation.byteArrayLength,1024);for(var prefixIndex=0;prefixIndex<prefixLimit;prefixIndex++){var prefixDescriptor=Object.getOwnPropertyDescriptor(diagnosticInput,String(prefixIndex));if(!prefixDescriptor||!Object.prototype.hasOwnProperty.call(prefixDescriptor,'value')||!Number.isInteger(prefixDescriptor.value)||prefixDescriptor.value< -128||prefixDescriptor.value>255)throw Error('PREFIX_SHAPE_HOLD');diagnosticPrefix.push(prefixDescriptor.value<0?prefixDescriptor.value+256:prefixDescriptor.value);}observation.bomKind=diagnosticPrefix[0]===239&&diagnosticPrefix[1]===187&&diagnosticPrefix[2]===191?'UTF8':diagnosticPrefix[0]===255&&diagnosticPrefix[1]===254?'UTF16LE':diagnosticPrefix[0]===254&&diagnosticPrefix[1]===255?'UTF16BE':'NONE';var prefixText=diagnosticPrefix.map(function(v){return String.fromCharCode(v);}).join(''),prefixTags=prefixText.match(/<meta\b[^>]{0,1024}>/gi)||[],prefixDeclarations=[];prefixTags.forEach(function(tag){var declaration=tag.match(/\bcharset\s*=\s*["']?([a-z0-9_-]+)/i);if(declaration)prefixDeclarations.push(declaration[1].toLowerCase());});observation.prefixCharset=prefixDeclarations.length===0?'NONE':prefixDeclarations.length>1?'MULTIPLE':prefixDeclarations[0]==='utf-8'?'UTF8':prefixDeclarations[0]==='iso-8859-1'?'ISO_8859_1':prefixDeclarations[0]==='windows-1252'?'WINDOWS_1252':'OTHER';}}catch(ignoredPrefix){}var diagnosticMaterial=utf8(diagnosticInput,MAX_BYTES);observation.strictUtf8='VALID';observation.bom=diagnosticMaterial.text.charCodeAt(0)===65279;observation.byteLength=diagnosticMaterial.bytes.length;observation.contentLengthMatchesBytes=observation.contentLengthCanonical&&Number(lengthValue)===diagnosticMaterial.bytes.length;
            var head=diagnosticMaterial.text.slice(0,32768),headEnd=head.toLowerCase().indexOf('</head>');if(headEnd>=0)head=head.slice(0,headEnd+7);
            var tags=head.match(/<meta\b[^>]{0,2048}>/gi)||[],declarations=[];tags.forEach(function(tag){var declaration=tag.match(/\bcharset\s*=\s*["']?([a-z0-9_-]+)/i);if(declaration)declarations.push(declaration[1].toLowerCase());});observation.metaCharset=declarations.length===0?'NONE':declarations.length>1?'MULTIPLE':declarations[0]==='utf-8'?'UTF8':'OTHER';
            try{var diagnosticHash=services.hashBytes(diagnosticMaterial.bytes.map(function(x){return x>127?x-256:x;}));if(typeof diagnosticHash==='string'&&/^[a-f0-9]{64}$/.test(diagnosticHash)&&diagnosticHash===sha(diagnosticMaterial.text))observation.rawSha256=diagnosticHash;}catch(ignoredHash){}
          }catch(ignoredBytes){observation.strictUtf8='HOLD';observation.byteFailure='OTHER';try{var byteFailureMessage=ignoredBytes&&typeof ignoredBytes==='object'?Object.getOwnPropertyDescriptor(ignoredBytes,'message'):null;var byteFailureValue=byteFailureMessage&&Object.prototype.hasOwnProperty.call(byteFailureMessage,'value')&&typeof byteFailureMessage.value==='string'?byteFailureMessage.value:'';var byteFailureMap={'DENSE_ACCESSOR_FREE_BYTES_HOLD':'SIZE_OR_SHAPE','EMPTY_BYTES_HOLD':'EMPTY','SIGNED_INTEGER_BYTES_HOLD':'SIGNED_INTEGER','STRICT_UTF8_HOLD':'UTF8'};observation.byteFailure=Object.prototype.hasOwnProperty.call(byteFailureMap,byteFailureValue)?byteFailureMap[byteFailureValue]:'OTHER';}catch(ignoredFailureClassification){}}
        }catch(ignoredType){}try{if(typeof Logger!=='undefined'&&Logger&&typeof Logger.log==='function')Logger.log('FERNAIN_NATIVE_SOURCE_MIME_V1:'+JSON.stringify(observation));}catch(ignoredLog){}
      }need(!!m||/^text\/html\s*$/i.test(type),'SOURCE_UTF8_CONTENT_TYPE_HOLD');mime=m?m[1].toLowerCase():'text/html';}
    var decoded=utf8(response.getContent(),kind==='dns'?MAX_DNS_BYTES:MAX_BYTES);
    need(decoded.text.length<=(kind==='dns'?MAX_DNS_BYTES:MAX_TEXT),'SOURCE_TEXT_BOUND_HOLD');
    if(kind!=='dns')need(sourceType(type,decoded)===mime,'SOURCE_UTF8_CONTENT_TYPE_HOLD');
    var lengths=keys.filter(function(k){return k.toLowerCase()==='content-length';});need(lengths.length<=1,'CONTENT_LENGTH_AMBIGUOUS_HOLD');
    if(lengths.length){var l=h[lengths[0]];need(typeof l==='string'&&/^(?:0|[1-9]\d*)$/.test(l)&&Number(l)===decoded.bytes.length,'CONTENT_LENGTH_MISMATCH_HOLD');}
    need(services&&typeof services.hashBytes==='function','BYTE_HASH_SERVICE_HOLD');
    var digest=services.hashBytes(decoded.bytes.map(function(x){return x>127?x-256:x;}));
    need(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest)&&digest===sha(decoded.text),'RAW_BYTES_TEXT_DIGEST_MISMATCH_HOLD');
    return {contentType:type,mimeType:mime,bytes:decoded.bytes,text:decoded.text,byteLength:decoded.bytes.length,sha256:digest};
  }
  function dnsName(s){need(typeof s==='string'&&s.length<=254,'DNS_NAME_HOLD');s=s.toLowerCase();if(s.endsWith('.'))s=s.slice(0,-1);
    need(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(s)&&
      !/(?:^|\.)(?:localhost|local|internal|home|test|invalid|example|onion)$/.test(s),'DNS_NAME_HOLD');return s;}
  function publicIPv4(s){if(typeof s!=='string'||! /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(s))return false;
    var p=s.split('.').map(Number);if(p.some(function(x){return x>255;}))return false;
    if(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||p[0]===100&&p[1]>=64&&p[1]<=127||
      p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&(
      p[1]===0||p[1]===2||p[1]===31&&p[2]===196||p[1]===52&&p[2]===193||p[1]===88&&p[2]===99||p[1]===168||p[1]===175&&p[2]===48)||
      p[0]===198&&(p[1]===18||p[1]===19||p[1]===51&&p[2]===100)||p[0]===203&&p[1]===0&&p[2]===113)return false;
    return true;}
  function ipv6(s){if(typeof s!=='string'||s.length>39||!/^[0-9a-f:]+$/i.test(s)||s.indexOf(':::')>=0)return null;
    var halves=s.toLowerCase().split('::');if(halves.length>2)return null;
    var left=halves[0]?halves[0].split(':'):[],right=halves.length===2&&halves[1]?halves[1].split(':'):[];
    if(left.concat(right).some(function(x){return !/^[0-9a-f]{1,4}$/.test(x);}))return null;
    var missing=8-left.length-right.length;if(halves.length===1?missing!==0:missing<1)return null;
    return left.concat(halves.length===2?Array(missing).fill('0'):[],right).map(function(x){return parseInt(x,16);});}
  function publicIPv6(s){var p=ipv6(s);return !!p&&p[0]>=0x2000&&p[0]<=0x3fff&&
    !(p[0]===0x2001&&(p[1]<0x0200||p[1]===0x0db8))&&p[0]!==0x2002&&
    !(p[0]===0x3fff&&p[1]<0x1000)&&!(p[0]===0x2620&&p[1]===0x004f&&p[2]===0x8000);}
  function addr(s,type){need(type===1?publicIPv4(s):publicIPv6(s),'DNS_NONPUBLIC_OR_UNKNOWN_ADDRESS_HOLD');
    return type===1?s:ipv6(s).map(function(x){return ('0000'+x.toString(16)).slice(-4);}).join(':');}
  function dnsSoa(record,terminal){dataObject(record,'DNS_RECORD_HOLD');
    need(Object.keys(record).sort().join('|')==='TTL|data|name|type'&&record.type===6&&Number.isInteger(record.TTL)&&record.TTL>0&&record.TTL<=86400,'DNS_RECORD_HOLD');
    var zone=dnsName(record.name),fields=typeof record.data==='string'?record.data.split(' '):[];
    need(terminal===zone||terminal.endsWith('.'+zone),'DNS_UNEXPECTED_SECTION_HOLD');
    need(fields.length===7&&fields.every(function(x){return x.length>0;}),'DNS_RECORD_HOLD');
    var mname=dnsName(fields[0]),rname=dnsName(fields[1]),numbers=[];
    for(var i=2;i<7;i++){need(/^(?:0|[1-9]\d{0,9})$/.test(fields[i])&&Number(fields[i])<=4294967295,'DNS_RECORD_HOLD');numbers.push(Number(fields[i]));}
    return {zone:zone,mname:mname,rname:rname,serial:numbers[0],refresh:numbers[1],retry:numbers[2],expire:numbers[3],minimum:numbers[4],ttl:record.TTL};
  }
  function dnsAnswer(raw,host,type){var p=BackofficeSalesEvidenceV1.strictJSON(raw);dataObject(p,'DNS_RESPONSE_OBJECT_HOLD');
    need(p.Status===0&&p.TC===false&&p.RD===true&&p.RA===true&&typeof p.AD==='boolean'&&typeof p.CD==='boolean','DNS_INCOMPLETE_OR_STATUS_HOLD');
    need(Object.keys(p).every(function(k){return ['Status','TC','RD','RA','AD','CD','Question','Answer','Authority','Additional','Comment','edns_client_subnet'].includes(k);}), 'DNS_UNKNOWN_FIELDS_HOLD');
    dense(p.Question,1,'DNS_QUESTION_HOLD');need(p.Question.length===1,'DNS_QUESTION_HOLD');dataObject(p.Question[0],'DNS_QUESTION_HOLD');
    need(Object.keys(p.Question[0]).sort().join('|')==='name|type'&&dnsName(p.Question[0].name)===host&&p.Question[0].type===type,'DNS_QUESTION_MISMATCH_HOLD');
    var authority=own(p,'Authority')?dense(p.Authority,1,'DNS_UNEXPECTED_SECTION_HOLD'):[];
    if(own(p,'Additional'))dense(p.Additional,0,'DNS_UNEXPECTED_SECTION_HOLD');
    if(own(p,'edns_client_subnet'))need(p.edns_client_subnet==='0.0.0.0/0','DNS_ECS_MISMATCH_HOLD');
    var answers=own(p,'Answer')?dense(p.Answer,32,'DNS_ANSWER_HOLD'):[];
    need(answers.length>0||authority.length===1,'DNS_ADDRESS_UNKNOWN_HOLD');var owners={},seen={};
    answers.forEach(function(r){dataObject(r,'DNS_RECORD_HOLD');need(Object.keys(r).sort().join('|')==='TTL|data|name|type'&&Number.isInteger(r.TTL)&&r.TTL>0&&r.TTL<=86400&&(r.type===5||r.type===type),'DNS_RECORD_HOLD');
      var n=dnsName(r.name),d=r.type===5?dnsName(r.data):addr(r.data,type),id=n+'|'+r.type+'|'+d;
      need(!seen[id],'DNS_DUPLICATE_RECORD_HOLD');seen[id]=true;if(!owners[n])owners[n]={cname:null,addresses:[]};
      if(r.type===5){need(owners[n].cname===null&&owners[n].addresses.length===0,'DNS_AMBIGUOUS_CNAME_HOLD');owners[n].cname=d;}
      else{need(owners[n].cname===null,'DNS_AMBIGUOUS_CNAME_HOLD');owners[n].addresses.push(d);}});
    var current=host,chain=[],addresses=[],walked={};
    while(true){need(!walked[current],'DNS_CNAME_LOOP_HOLD');walked[current]=true;chain.push(current);var o=owners[current];
      if(!o)break;if(o.cname!==null){need(chain.length<=MAX_CHAIN,'DNS_CNAME_BOUND_HOLD');current=o.cname;continue;}
      addresses=o.addresses.slice().sort();break;}
    need(Object.keys(owners).every(function(n){return walked[n];}),'DNS_UNRELATED_ANSWER_HOLD');
    var negative=null;if(authority.length){need(addresses.length===0,'DNS_UNEXPECTED_SECTION_HOLD');negative=dnsSoa(authority[0],current);}
    var ttls=answers.map(function(x){return x.TTL;});if(negative)ttls.push(Math.min(negative.ttl,negative.minimum));
    return {chain:chain,terminal:current,addresses:addresses,ad:p.AD,cd:p.CD,minTtl:Math.min.apply(null,ttls),nodata:negative!==null,negativeProof:negative};
  }
  function fetchOptions(dns){return {method:'get',validateHttpsCertificates:true,followRedirects:false,
    muteHttpExceptions:true,headers:{Accept:dns?'application/dns-json':'text/html, text/plain', 'Accept-Encoding':'identity'}};}
  function preflightHost(host,services){host=dnsName(host);need(services&&typeof services.fetch==='function'&&typeof services.clock==='function','NATIVE_SERVICES_HOLD');
    var start=services.clock(),n=utc(start);need(Number.isFinite(n),'CLOCK_HOLD');var records=[],byType=[];
    [1,28].forEach(function(type){var current=host,all=[],terminal=null,addresses=[],nodata=false,seen={},depth=0;
      while(true){need(!seen[current]&&depth<=MAX_CHAIN,'DNS_CNAME_LOOP_OR_BOUND_HOLD');seen[current]=true;
        var u='https://dns.google/resolve?name='+encodeURIComponent(current)+'&type='+type+'&edns_client_subnet=0.0.0.0%2F0';
        var material=responseMaterial(services.fetch(u,fetchOptions(true)),'dns',services),checked=services.clock();
        need(fresh(start,utc(checked))&&utc(checked)>=n,'DNS_CLOCK_OR_FRESHNESS_HOLD');var answer=dnsAnswer(material.text,current,type);
        records.push({url:u,type:type,queriedHost:current,capturedAtUtc:checked,responseBytes:material.bytes,responseSha256:material.sha256,parsed:answer});
        for(var i=0;i<answer.chain.length;i++){if(i===0&&all.length&&all[all.length-1]===answer.chain[i])continue;need(!all.includes(answer.chain[i]),'DNS_CNAME_LOOP_HOLD');all.push(answer.chain[i]);}
        need(all.length-1<=MAX_CHAIN,'DNS_CNAME_BOUND_HOLD');if(answer.addresses.length||answer.nodata===true){terminal=answer.terminal;addresses=answer.addresses;nodata=answer.nodata===true;break;}
        need(answer.terminal!==current,'DNS_ADDRESS_UNKNOWN_HOLD');current=answer.terminal;depth=all.length-1;}
      byType.push({type:type,chain:all,terminal:terminal,addresses:addresses,nodata:nodata});});
    need(byType.some(function(summary){return summary.addresses.length>0;}),'DNS_ADDRESS_UNKNOWN_HOLD');
    need(byType[0].terminal===byType[1].terminal&&JSON.stringify(byType[0].chain)===JSON.stringify(byType[1].chain),'DNS_A_AAAA_CNAME_MISMATCH_HOLD');
    var checked=services.clock();need(fresh(start,utc(checked)),'DNS_FRESHNESS_HOLD');return {host:host,resolver:'https://dns.google/resolve',
      capturedAtUtc:checked,records:records,addresses:byType,fullDnsSha256:sha(records),
      dnsPreflight:'ALL_A_AND_AAAA_PUBLIC_OR_VALIDATED_NODATA_V1',actualConnectionIp:'UNAVAILABLE_URLFETCH_API',
      ipPinning:'UNAVAILABLE_URLFETCH_API',dnssec:'AD_RECORDED_NOT_REQUIRED_NOT_AUTHENTICATED_ORIGIN_PROOF'};
  }
  function requiresLayoutDerivation(r){return r.staffSection===null||r.personHeadingLevel===null||r.workflowHeading===null||r.observation===null;}
  function verifiedPreparationDefinition(r){
    need(r.organizationType!==null,'UNVERIFIED_ORGANIZATION_CLASSIFICATION_CANDIDATE_LOCAL_HOLD');
    need(['COMMUNITY_ORGANIZATION','ASSOCIATION','PUBLICATION'].includes(r.organizationType)&&
      typeof r.person==='string'&&/^[\x20-\x7e]{1,150}$/.test(r.person)&&r.person.trim()===r.person&&r.person.split(' ').length>=2&&!/[<>]/.test(r.person)&&
      typeof r.role==='string'&&/^[\x20-\x7e]{1,150}$/.test(r.role)&&r.role.trim()===r.role&&!/[<>]/.test(r.role)&&mailEqual(r.email,r.email)&&
      r.email.split('@')[0].length<=64&&!/^\.|\.$|\.\./.test(r.email.split('@')[0]),'SCRIPT_OWNED_REGISTRY_DEFINITION_HOLD');
    var a=urlHost(r.staffUrl),b=urlHost(r.workflowUrl);need(a!==b||r.staffUrl!==r.workflowUrl,'REGISTRY_SOURCE_PAIR_DISTINCT_HOLD');
  }
  function nativeUnparsedMaterial(registryKey,kind,url,response,services){var r=key(registryKey);exactUrl(registryKey,kind,url);
    var material=responseMaterial(response,'source',services),at=services.clock();need(Number.isFinite(utc(at)),'CLOCK_HOLD');
    need(material.mimeType==='text/html','PLAIN_TEXT_LAYOUT_NOT_REGISTERED_HOLD');
    return {schema:NS,outcome:'NATIVE_API_BYTES_PARSED',profile:PROFILE,registryKey:registryKey,registrySha256:sha(r),
      kind:kind,url:url,capturedAtUtc:at,captureTimeBasis:'ACTUAL_NATIVE_API_CONTENT_READ_COMPLETION',contentType:material.contentType,
      responseBytes:material.bytes,responseUtf8:material.text,responseSha256:material.sha256,responseByteLength:material.byteLength,
      actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API',record_authorized:false,effect_eligible:false};}
  function capture(registryKey,services){try{var r=key(registryKey),derive=requiresLayoutDerivation(r);if(derive)verifiedPreparationDefinition(r);else verifiedSourceDefinition(r);var hosts=[urlHost(r.staffUrl),urlHost(r.workflowUrl)],dns=[],after=[],calls=0;
    var start=services.clock(),bounded={clock:services.clock,hashBytes:services.hashBytes,fetch:function(u,o){
      need(++calls<=42&&fresh(start,utc(services.clock())),'CAPTURE_FETCH_OR_TIME_BOUND_HOLD');return services.fetch(u,o);}};
    need(Number.isFinite(utc(start)),'CLOCK_HOLD');registryCurrent(utc(start));hosts.forEach(function(h){dns.push(preflightHost(h,bounded));});
    if(REQUIRE_ACTUAL_PEER_IP)return hold('ACTUAL_CONNECTION_PUBLIC_IP_AND_PINNING_UNAVAILABLE',{
      profile:PROFILE,registryKey:registryKey,registrySha256:sha(r),dns:dns,dnsSha256:sha(dns),
      targetFetchPerformed:false,actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API'});
    var materialReader=derive?nativeUnparsedMaterial:nativeMaterial,
      staff=materialReader(registryKey,'staff',r.staffUrl,bounded.fetch(r.staffUrl,fetchOptions(false)),bounded),
      workflow=materialReader(registryKey,'workflow',r.workflowUrl,bounded.fetch(r.workflowUrl,fetchOptions(false)),bounded),layout=null;
    if(derive){layout=deriveSourceLayoutFromRetainedBytes(registryKey,staff.responseBytes,workflow.responseBytes);
      need(layout.outcome==='SUPPORTED_RETAINED_LAYOUT_PREPARATION_ONLY','NATIVE_SOURCE_LAYOUT_DERIVATION_CANDIDATE_LOCAL_HOLD');verifiedSourceDefinition(layout.derivedDefinition);
      staff.facts=layout.staffFacts;staff.factsSha256=sha(staff.facts);workflow.facts=layout.workflowFacts;workflow.factsSha256=sha(workflow.facts);}
    hosts.forEach(function(h){after.push(preflightHost(h,bounded));});
    dns.forEach(function(d,i){need(sha(d.addresses)===sha(after[i].addresses),'DNS_CHANGED_DURING_CAPTURE_HOLD');});
    var checked=services.clock();need(fresh(start,utc(checked)),'CAPTURE_FRESHNESS_HOLD');
    var captured={schema:NS,outcome:'NATIVE_SOURCE_CAPTURED_PREPARATION_ONLY',profile:PROFILE,registryKey:registryKey,
      registrySha256:sha(r),staff:staff,workflow:workflow,dnsBefore:dns,dnsAfter:after,
      registryProof:registryProof(),
      dnsBeforeSha256:sha(dns),dnsAfterSha256:sha(after),capturedAtUtc:checked,
      provenance:{source:'GOOGLE_APPS_SCRIPT_URLFETCH_HTTPS_API_RESPONSE_BYTES_V1',
        certificateValidation:true,redirectFollowing:false,actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API',
        dnsPreflight:'A_AND_AAAA_COMPLETE_PUBLIC_OR_VALIDATED_NODATA_PRE_AND_POST',requireActualPeerIp:REQUIRE_ACTUAL_PEER_IP,
        rebindingLimitation:'PREFLIGHT_AND_POSTFLIGHT_DO_NOT_ATTEST_OR_PIN_ACTUAL_CONNECTION'},
      nativeSourceCaptured:true,policyEvaluated:false,record_authorized:false,effect_eligible:false,send_eligible:false};
    if(layout)captured.layoutPreparation=layout;return captured;
  }catch(e){return hold(safeReason(e,'NATIVE_SOURCE_CAPTURE_HOLD'));}}
  function captureRegistered(registryKey){return capture(registryKey,{clock:function(){return new Date().toISOString();},
    fetch:function(u,opts){return UrlFetchApp.fetch(u,opts);},hashBytes:function(b){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,b)
      .map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('');}});}
  function entities(s){return s.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi,function(_,v){var table={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if(own(table,v.toLowerCase()))return table[v.toLowerCase()];var n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);
    need(Number.isInteger(n)&&n>0&&n<=1114111&&!(n>=55296&&n<=57343),'HTML_ENTITY_HOLD');return String.fromCodePoint(n);});}
  function norm(s){return s.replace(/[\t\r\n ]+/g,' ').trim();}
  function asciiFold(s){need(typeof s==='string'&&/^[\x20-\x7e]+$/.test(s),'ASCII_NAME_HOLD');return s.replace(/[A-Z]/g,function(x){return x.toLowerCase();});}
  function mailEqual(a,b){var pattern=/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
    if(typeof a!=='string'||typeof b!=='string'||!pattern.test(a)||!pattern.test(b))return false;var x=a.split('@'),y=b.split('@');
    return x[0]===y[0]&&x[1].toLowerCase()===y[1].toLowerCase();}
  function attrs(raw){var a={},i=0;while(i<raw.length){var ws=raw.slice(i).match(/^\s+/);if(ws){i+=ws[0].length;continue;}
      var m=raw.slice(i).match(/^([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/);
      need(!!m,'HTML_ATTRIBUTE_HOLD');var k=m[1].toLowerCase();need(!own(a,k),'HTML_DUPLICATE_ATTRIBUTE_HOLD');
      a[k]=entities(m[2]!==undefined?m[2]:m[3]!==undefined?m[3]:m[4]!==undefined?m[4]:'');i+=m[0].length;}return a;}
  function htmlTree(text){need(typeof text==='string'&&text.length>0&&text.length<=MAX_TEXT,'HTML_BOUND_HOLD');
    var root={tag:'root',attrs:{},children:[],parent:null,start:0,openEnd:0,end:text.length,blocked:false},stack=[root],nodes=[],pos=0;
    var voids='area base br col embed hr img input link meta param source track wbr'.split(' '),rawTags=['script','style','noscript','template'];
    while(pos<text.length){need(nodes.length<12000&&stack.length<=48,'HTML_COMPLEXITY_HOLD');
      if(text.slice(pos,pos+4)==='<!--'){var ce=text.indexOf('-->',pos+4);need(ce>=0,'HTML_COMMENT_HOLD');pos=ce+3;continue;}
      if(/^<!doctype\s/i.test(text.slice(pos))){var de=text.indexOf('>',pos);need(de>=0,'HTML_DOCTYPE_HOLD');pos=de+1;continue;}
      if(text[pos]!=='<'){var next=text.indexOf('<',pos);if(next<0)next=text.length;var t={tag:'#text',text:entities(text.slice(pos,next)),start:pos,end:next,parent:stack[stack.length-1],blocked:stack[stack.length-1].blocked};
        t.parent.children.push(t);nodes.push(t);pos=next;continue;}
      var end=pos+1,quote='';for(;end<text.length;end++){var ch=text[end];if(quote){if(ch===quote)quote='';}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
      need(end<text.length&&!quote,'HTML_TAG_HOLD');var body=text.slice(pos+1,end),cm=body.match(/^\/([A-Za-z][A-Za-z0-9:-]*)\s*$/);
      if(cm){var closing=cm[1].toLowerCase(),top=stack[stack.length-1],listIndex=top.tag==='p'?stack.length-2:stack.length-1,
          list=stack[listIndex],normalList=listIndex>=3&&stack[1].tag==='html'&&stack[2].tag==='body'&&list.tag==='ul'&&
            Object.keys(list.attrs).length===0&&stack.slice(3,listIndex).every(function(n){return n.tag==='div'||n.tag==='article';});
        // WHATWG in-body recovery, limited to empty paragraphs in a static list.
        // No formatting adoption, text-bearing closure, table/select/foreign scope,
        // opening-tag inference or authority is added by this compatibility branch.
        if(closing==='p'&&normalList&&top===list&&list.children.length===0&&pos===list.openEnd){
          need(nodes.length+1<12000,'HTML_COMPLEXITY_HOLD');
          var empty={tag:'p',attrs:{},children:[],parent:list,start:pos,openEnd:pos,end:pos,blocked:list.blocked,implicitOpen:true};
          list.children.push(empty);nodes.push(empty);stack.push(empty);
        }else if(closing==='ul'&&normalList&&top.tag==='p'&&top.parent===list&&top.children.length===0&&
          Object.keys(top.attrs).length===0&&pos===top.openEnd){
          var implied=stack.pop();implied.closeStart=pos;implied.end=pos;implied.impliedEnd=true;
        }
        need(stack.length>1&&stack[stack.length-1].tag===closing,'HTML_UNSUPPORTED_IMPLIED_OR_MISMATCHED_CLOSURE_HOLD');
        var closed=stack.pop();closed.closeStart=pos;closed.end=end+1;pos=end+1;continue;}
      var om=body.match(/^([A-Za-z][A-Za-z0-9:-]*)([\s\S]*?)\/?$/);need(!!om,'HTML_TAG_HOLD');var tag=om[1].toLowerCase(),at=attrs(om[2]),parent=stack[stack.length-1];
      var hidden=own(at,'hidden')||own(at,'inert')||at['aria-hidden']==='true'||at['aria-hidden']==='TRUE'||
        /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$))/i.test(at.style||'')||
        /(?:^|\s)(?:hidden|sr-only|screen-reader-text|visually-hidden)(?:\s|$)/i.test(at.class||'');
      var node={tag:tag,attrs:at,children:[],parent:parent,start:pos,openEnd:end+1,end:end+1,blocked:parent.blocked||hidden||
        ['head','iframe','object','embed','svg','canvas'].includes(tag)||rawTags.includes(tag)};
      parent.children.push(node);nodes.push(node);pos=end+1;
      if(rawTags.includes(tag)){var re=new RegExp('</'+tag+'\\s*>','ig');re.lastIndex=pos;var rm=re.exec(text);need(!!rm,'HTML_RAW_BLOCK_HOLD');node.closeStart=rm.index;node.end=re.lastIndex;pos=re.lastIndex;continue;}
      if(!voids.includes(tag)&&!/\/\s*$/.test(body))stack.push(node);
    }need(stack.length===1,'HTML_UNCLOSED_TREE_HOLD');return {root:root,nodes:nodes};}
  // Do not invent separators between adjacent inline nodes. A name/role atom
  // retains its witnessed internal whitespace; only outer formatting is trimmed.
  function nodeText(n){if(n.blocked)return '';if(n.tag==='#text')return n.text;return n.children.map(nodeText).join('');}
  function textOf(n){return norm(nodeText(n));}
  function atomText(n){return nodeText(n).replace(/^[\t\r\n ]+|[\t\r\n ]+$/g,'');}
  function span(text,n){var raw=text.slice(n.start,n.end);return {startUtf16:n.start,endUtf16:n.end,
    startByte:byteLength(text.slice(0,n.start)),endByte:byteLength(text.slice(0,n.end)),raw:raw,rawSha256:sha(raw)};}
  function safeEvidence(n){var cur=n;while(cur&&cur.tag!=='root'){need(!cur.blocked&&!Object.keys(cur.attrs).some(function(k){return /^on/i.test(k);}), 'HIDDEN_OR_ACTIVE_EVIDENCE_HOLD');cur=cur.parent;}return n;}
  function staffFacts(text,r){var tree=htmlTree(text),heads=tree.nodes.filter(function(n){return !n.blocked&&/^h[1-6]$/.test(n.tag);});
    var sections=heads.filter(function(n){return n.tag==='h2'&&textOf(n)===r.staffSection;});need(sections.length===1,'EXACT_STAFF_SECTION_HOLD');
    var section=sections[0],sectionEnd=text.length;heads.forEach(function(h){if(h.start>section.start&&Number(h.tag[1])<=2)sectionEnd=Math.min(sectionEnd,h.start);});
    var named=heads.filter(function(n){return n.tag==='h'+r.personHeadingLevel&&n.start>=section.end&&n.start<sectionEnd&&
      /^[\x20-\x7e]+$/.test(atomText(n))&&asciiFold(atomText(n))===asciiFold(r.person);});need(named.length===1,'EXACT_UNIQUE_PERSON_HEADING_HOLD');
    var name=safeEvidence(named[0]),stop=sectionEnd;heads.forEach(function(h){if(h.start>name.start&&Number(h.tag[1])<=r.personHeadingLevel)stop=Math.min(stop,h.start);});
    need(stop-name.start<=4096,'STAFF_BLOCK_BOUND_HOLD');var inBlock=tree.nodes.filter(function(n){return !n.blocked&&n.start>=name.start&&n.end<=stop;});
    var roles=inBlock.filter(function(n){return ['p','span','div'].includes(n.tag)&&atomText(n)===r.role;});
    roles=roles.filter(function(n){return !roles.some(function(other){return other!==n&&other.start>n.start&&other.end<=n.end;});});
    var mails=inBlock.filter(function(n){return n.tag==='a'&&own(n.attrs,'href')&&/^mailto:/i.test(n.attrs.href);});
    need(roles.length===1&&mails.length===1,'STAFF_ROLE_MAIL_ATOMS_HOLD');safeEvidence(roles[0]);safeEvidence(mails[0]);
    need(mails[0].attrs.href.startsWith('mailto:')&&mailEqual(mails[0].attrs.href.slice(7),r.email),'EXACT_WITNESSED_MAILTO_HOLD');
    var observed=atomText(name),selection=r.person+'\n'+r.role+'\nmailto:'+r.email;
    return {person:r.person,observedName:observed,role:r.role,email:r.email,observedMailto:mails[0].attrs.href,
      nameNormalization:observed===r.person?'DIRECT_EXACT_V1':'WITNESSED_ASCII_NAME_CASE_ONLY_V1',
      emailNormalization:mails[0].attrs.href==='mailto:'+r.email?'DIRECT_EXACT_V1':'WITNESSED_DOMAIN_CASE_ONLY_V1',
      section:span(text,section),name:span(text,name),roleSpan:span(text,roles[0]),mailto:span(text,mails[0]),
      block:span(text,{start:name.start,end:stop}),selectionText:selection,selectionSha256:sha(selection),
      parser:'STATIC_STAFF_SECTION_EXACT_HEADING_ROLE_MAILTO_BOUNDARY_V1'};
  }
  function ancestor(n,predicate){while(n&&n.tag!=='root'){if(predicate(n))return n;n=n.parent;}return null;}
  function workflowFacts(text,r){var tree=htmlTree(text),heading=tree.nodes.filter(function(n){return !n.blocked&&/^h[1-6]$/.test(n.tag)&&textOf(n)===r.workflowHeading;});
    need(['Jobs Board','Opportunities'].includes(r.workflowHeading)&&heading.length===1,'EXACT_WORKFLOW_HEADING_HOLD');safeEvidence(heading[0]);
    var containers=tree.nodes.filter(function(n){return !n.blocked&&n.tag==='div'&&
      (/(?:^|\s)gzns(?:\s|$)/.test(n.attrs.class||'')||n.attrs.id==='gzns');});
    need(containers.length===1&&containers[0].start>=heading[0].end,'SUPPORTED_WORKFLOW_CONTAINER_HOLD');
    var wrapper=safeEvidence(containers[0]),idProfile=wrapper.attrs.id==='gzns'&&!/(?:^|\s)gzns(?:\s|$)/.test(wrapper.attrs.class||''),container=wrapper;
    if(idProfile){
      need(tree.nodes.filter(function(n){return n.attrs&&n.attrs.id==='gzns';}).length===1,'SUPPORTED_WORKFLOW_CONTAINER_HOLD');
      // A neutral p around this block is browser-closed before the div. Its
      // paragraph has no attributes, atoms or scope that could affect witnesses.
      var neutral=wrapper.parent&&wrapper.parent.tag==='p'?wrapper.parent:null;
      if(neutral)need(Object.keys(neutral.attrs).length===0&&neutral.children.every(function(n){return n===wrapper||
        n.tag==='#text'&&/^[\t\n\f\r ]*$/.test(n.text);}), 'WORKFLOW_CONTROL_CONTAINER_HOLD');
      for(var cur=wrapper.parent;cur;cur=cur.parent)need(cur===neutral||['div','article','body','html','root'].includes(cur.tag),'WORKFLOW_CONTROL_CONTAINER_HOLD');
      var body=ancestor(wrapper,function(n){return n.tag==='body';});need(body&&body.parent&&body.parent.tag==='html'&&
        body.parent.parent===tree.root,'WORKFLOW_CONTROL_CONTAINER_HOLD');
      var searchForms=tree.nodes.filter(function(n){return n.tag==='form'&&ancestor(n.parent,function(x){return x===wrapper;})===wrapper;});
      need(searchForms.length===1&&searchForms[0].attrs.id==='mn-jobs-searchcategory'&&
        /(?:^|\s)mn-form(?:\s|$)/.test(searchForms[0].attrs.class||'')&&
        tree.nodes.filter(function(n){return n.attrs&&n.attrs.id==='mn-jobs-searchcategory';}).length===1&&
        (searchForms[0].attrs.method||'').toLowerCase()==='get','WORKFLOW_CONTROL_CONTAINER_HOLD');
      container=safeEvidence(searchForms[0]);
    }
    // Keep the original 32768 limit on the exact evidence/control scope.
    need(container.end-container.start<=32768,'SUPPORTED_WORKFLOW_CONTAINER_HOLD');
    var controls=tree.nodes.filter(function(n){return !n.blocked&&n.start>container.start&&n.end<=container.end;});
    var selections=[];
    [['category-select','Search by Category'],['employer-select','Search by Employer']].forEach(function(pair){
      var hits=controls.filter(function(n){return n.tag==='select'&&n.attrs.id===pair[0]&&n.attrs['aria-label']===pair[1];});
      need(hits.length===1&&(!idProfile||tree.nodes.filter(function(n){return n.attrs&&n.attrs.id===pair[0];}).length===1),
        'EXACT_WORKFLOW_SELECT_HOLD');selections.push(safeEvidence(hits[0]));});
    var search=controls.filter(function(n){return n.tag==='button'&&textOf(n)==='Search'||n.tag==='input'&&n.attrs.type==='submit'&&n.attrs.value==='Search';});
    need(search.length===1,'EXACT_WORKFLOW_SEARCH_CONTROL_HOLD');safeEvidence(search[0]);
    if(idProfile)[heading[0]].concat(selections,search).forEach(function(n){strictDerivedAtom(tree,span(text,n),true);});
    var forms=idProfile?[container]:controls.filter(function(n){return n.tag==='form';});forms.forEach(function(n){
      var exactAction=n.attrs.action===r.workflowUrl||idProfile&&/\/jobs\/$/.test(r.workflowUrl)&&n.attrs.action===r.workflowUrl.slice(0,-1);
      need((exactAction||!idProfile&&(!own(n.attrs,'action')||n.attrs.action===''))&&
        (!own(n.attrs,'method')||n.attrs.method.toLowerCase()==='get'),'WORKFLOW_FORM_DESTINATION_HOLD');});
    need(selections.every(function(n){return ancestor(n,function(x){return x===container;})===container;}),'WORKFLOW_CONTROL_CONTAINER_HOLD');
    var selection=r.workflowHeading+'\nSearch by Category\nSearch by Employer\nSearch';
    return {workflow:'PUBLIC_JOB_BOARD',heading:r.workflowHeading,headingSpan:span(text,heading[0]),container:span(text,container),
      category:span(text,selections[0]),employer:span(text,selections[1]),search:span(text,search[0]),
      selectionText:selection,selectionSha256:sha(selection),parser:idProfile?'STATIC_GROWTHZONE_ID_WRAPPER_BOUNDED_GET_FORM_V1':'STATIC_GROWTHZONE_JOBSEARCH_EXACT_CONTROLS_V1',
      privateContract:'UNKNOWN',pricing:'UNKNOWN',employerIntake:'UNKNOWN'};
  }
  function strictDerivedAtom(tree,selectedSpan,rejectFormRouting){
    var nodes=tree.nodes.filter(function(n){return n.tag!=='#text'&&n.start>=selectedSpan.startUtf16&&n.end<=selectedSpan.endUtf16;});
    need(nodes.length>0,'HIDDEN_OR_ACTIVE_EVIDENCE_HOLD');nodes.forEach(function(n){safeEvidence(n);if(rejectFormRouting)need(!own(n.attrs,'form')&&!own(n.attrs,'formaction')&&!own(n.attrs,'formmethod'),'WORKFLOW_FORM_DESTINATION_HOLD');});
  }
  function strictDerivedWorkflowForms(tree,facts,url){
    [facts.headingSpan,facts.container,facts.category,facts.employer,facts.search].forEach(function(selectedSpan){
      var nodes=tree.nodes.filter(function(n){return n.tag!=='#text'&&n.start===selectedSpan.startUtf16&&n.end===selectedSpan.endUtf16;});
      need(nodes.length===1,'WORKFLOW_CONTROL_CONTAINER_HOLD');var node=nodes[0];while(node&&node.tag!=='root'){
        if(node.tag==='form'){
          var exactIdForm=facts.parser==='STATIC_GROWTHZONE_ID_WRAPPER_BOUNDED_GET_FORM_V1'&&
            node.attrs.id==='mn-jobs-searchcategory'&&node.start===facts.container.startUtf16&&node.end===facts.container.endUtf16,
            exactAction=node.attrs.action===url||exactIdForm&&/\/jobs\/$/.test(url)&&node.attrs.action===url.slice(0,-1);
          need((exactAction||!exactIdForm&&(!own(node.attrs,'action')||node.attrs.action===''))&&
            (!own(node.attrs,'method')||node.attrs.method.toLowerCase()==='get'),'WORKFLOW_FORM_DESTINATION_HOLD');
        }node=node.parent;}
    });
  }
  /* Source-only retained-byte preparation. This derives selectors, never identity,
   * current eligibility, transport freshness, authority or a purchasing claim. */
  function deriveSourceLayoutFromRetainedBytes(registryKey,staffBytes,workflowBytes){try{
    var base=key(registryKey),staff=utf8(staffBytes,MAX_BYTES),workflow=utf8(workflowBytes,MAX_BYTES);
    need(staff.text.length<=MAX_TEXT&&workflow.text.length<=MAX_TEXT,'SOURCE_TEXT_BOUND_HOLD');asciiFold(base.person);
    var staffTree=htmlTree(staff.text),heads=staffTree.nodes.filter(function(n){return !n.blocked&&/^h[1-6]$/.test(n.tag);}),
      sections=heads.filter(function(n){return n.tag==='h2';}),names=heads.filter(function(n){return /^[\x20-\x7e]+$/.test(atomText(n))&&asciiFold(atomText(n))===asciiFold(base.person);});
    need(sections.length<=64&&names.length<=16,'SOURCE_LAYOUT_DERIVATION_BOUND_HOLD');var matches=[];
    need(names.length===1&&names[0].tag==='h3','EXACT_UNIQUE_PERSON_HEADING_HOLD');
    sections.forEach(function(section){var end=staff.text.length;heads.forEach(function(h){if(h.start>section.start&&Number(h.tag[1])<=2)end=Math.min(end,h.start);});
      if(!names.some(function(n){return n.start>=section.end&&n.start<end;}))return;
      try{safeEvidence(section);var label=textOf(section);need(/^[\x20-\x7e]{1,100}$/.test(label),'EXACT_STAFF_SECTION_HOLD');
        var d={};Object.keys(base).forEach(function(k){d[k]=base[k];});d.staffSection=label;d.personHeadingLevel=3;
        if(base.staffSection!==null)need(base.staffSection===d.staffSection,'EXACT_STAFF_SECTION_HOLD');if(base.personHeadingLevel!==null)need(base.personHeadingLevel===3,'EXACT_UNIQUE_PERSON_HEADING_HOLD');
        var facts=staffFacts(staff.text,d);[facts.section,facts.name,facts.roleSpan,facts.mailto].forEach(function(span){strictDerivedAtom(staffTree,span);});matches.push({definition:d,facts:facts});
      }catch(unsupportedSection){/* A section is usable only after the old parser accepts it. */}
    });need(matches.length===1,'EXACT_UNIQUE_PERSON_HEADING_HOLD');var resolved=matches[0].definition;
    var workflowTree=htmlTree(workflow.text),allowed=workflowTree.nodes.filter(function(n){return !n.blocked&&/^h[1-6]$/.test(n.tag)&&['Opportunities','Jobs Board'].includes(textOf(n));});
    need(allowed.length===1,'EXACT_WORKFLOW_HEADING_HOLD');safeEvidence(allowed[0]);resolved.workflowHeading=textOf(allowed[0]);
    if(base.workflowHeading!==null)need(base.workflowHeading===resolved.workflowHeading,'EXACT_WORKFLOW_HEADING_HOLD');var career=workflowFacts(workflow.text,resolved);[career.headingSpan,career.category,career.employer,career.search].forEach(function(span){strictDerivedAtom(workflowTree,span,true);});strictDerivedWorkflowForms(workflowTree,career,resolved.workflowUrl);
    if(base.observation===null)resolved.observation='I noticed '+base.organization+'’s website provides a public '+resolved.workflowHeading+' page.';
    need(typeof resolved.observation==='string'&&resolved.observation.length<=300&&!/[\x00-\x1f<>]/.test(resolved.observation),'SOURCE_TEXT_BOUND_HOLD');
    var binding={schema:'FERNAIN_EXACT_RETAINED_SOURCE_LAYOUT_BINDING_V1',registryKey:registryKey,registrySha256:sha(base),
      staffResponseSha256:sha(staff.text),workflowResponseSha256:sha(workflow.text),staffByteLength:staff.bytes.length,workflowByteLength:workflow.bytes.length,
      staffSection:resolved.staffSection,personHeadingLevel:3,workflowHeading:resolved.workflowHeading,derivedDefinitionSha256:sha(resolved),
      staffFactsSha256:sha(matches[0].facts),workflowFactsSha256:sha(career)};
    return {schema:'FERNAIN_SOURCE_ONLY_DERIVED_LAYOUT_PREPARATION_V1',outcome:'SUPPORTED_RETAINED_LAYOUT_PREPARATION_ONLY',profile:MATERIAL_PROFILE,
      registryKey:registryKey,binding:binding,bindingSha256:sha(binding),derivedDefinition:resolved,staffFacts:matches[0].facts,workflowFacts:career,
      organizationClassificationComplete:resolved.organizationType!==null,liveProvenanceVerified:false,currentEligibilityEvaluated:false,
      sourceTextIsUntrustedData:true,modelAuthority:false,record_authorized:false,effect_eligible:false,send_eligible:false};
  }catch(e){return hold(safeReason(e,'RETAINED_SOURCE_MATERIAL_HOLD'));}}
  function reproduceSourceLayoutFromRetainedBytes(preparation,staffBytes,workflowBytes){try{
    var supplied=cloneData(preparation,250000),derived=deriveSourceLayoutFromRetainedBytes(supplied.registryKey,staffBytes,workflowBytes);
    need(derived.outcome==='SUPPORTED_RETAINED_LAYOUT_PREPARATION_ONLY'&&JSON.stringify(supplied)===JSON.stringify(derived),'DERIVED_SOURCE_LAYOUT_REPRODUCTION_HOLD');return derived;
  }catch(e){return hold(safeReason(e,'DERIVED_SOURCE_LAYOUT_REPRODUCTION_HOLD'));}}

  /* Pure replay. Caller-supplied responses NEVER prove live capture or DNS/peer IP. */
  function materialFromRetainedResponse(registryKey,kind,url,response,services){try{var r=key(registryKey);exactUrl(registryKey,kind,url);
    var material=responseMaterial(response,'source',services),at=services.clock();need(Number.isFinite(utc(at)),'CLOCK_HOLD');
    need(material.mimeType==='text/html','PLAIN_TEXT_LAYOUT_NOT_REGISTERED_HOLD');var facts=kind==='staff'?staffFacts(material.text,r):workflowFacts(material.text,r);
    return {schema:NS,outcome:'PARSED_RETAINED_MATERIAL_ONLY',profile:MATERIAL_PROFILE,prospectiveNativeProfile:PROFILE,
      registryKey:registryKey,registrySha256:sha(r),kind:kind,url:url,capturedAtUtc:at,
      captureTimeBasis:'REPLAY_PARSING_TIME_NOT_ORIGINAL_LIVE_RESPONSE_TIME',contentType:material.contentType,
      responseBytes:material.bytes,responseUtf8:material.text,responseSha256:material.sha256,responseByteLength:material.byteLength,
      facts:facts,factsSha256:sha(facts),actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API',
      liveProvenanceVerified:false,record_authorized:false,effect_eligible:false};
  }catch(e){return hold(safeReason(e,'RETAINED_SOURCE_MATERIAL_HOLD'));}}
  function nativeMaterial(registryKey,kind,url,response,services){var r=key(registryKey);exactUrl(registryKey,kind,url);
    var material=responseMaterial(response,'source',services),at=services.clock();need(Number.isFinite(utc(at)),'CLOCK_HOLD');
    need(material.mimeType==='text/html','PLAIN_TEXT_LAYOUT_NOT_REGISTERED_HOLD');var facts=kind==='staff'?staffFacts(material.text,r):workflowFacts(material.text,r);
    return {schema:NS,outcome:'NATIVE_API_BYTES_PARSED',profile:PROFILE,registryKey:registryKey,registrySha256:sha(r),
      kind:kind,url:url,capturedAtUtc:at,captureTimeBasis:'ACTUAL_NATIVE_API_CONTENT_READ_COMPLETION',contentType:material.contentType,
      responseBytes:material.bytes,responseUtf8:material.text,responseSha256:material.sha256,responseByteLength:material.byteLength,
      facts:facts,factsSha256:sha(facts),actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API',
      record_authorized:false,effect_eligible:false};}
  function cloneData(input,maxChars,sourcePacket){var count=0;function clone(v,depth,field){need(++count<=(sourcePacket?1500000:600000)&&depth<=32,'FULL_PACKET_COMPLEXITY_HOLD');
      if(v===null||typeof v==='boolean')return v;if(typeof v==='string'){byteLength(v);return v;}
      if(typeof v==='number'){need(Number.isFinite(v),'FULL_PACKET_NUMBER_HOLD');return v;}
      if(Array.isArray(v)){dense(v,sourcePacket&&field==='responseBytes'?MAX_BYTES:100000,'FULL_PACKET_DENSE_ARRAY_HOLD');return v.map(function(x){return clone(x,depth+1);});}
      dataObject(v,'FULL_PACKET_ACCESSOR_FREE_OBJECT_HOLD');var out={};Object.keys(v).forEach(function(k){out[k]=clone(Object.getOwnPropertyDescriptor(v,k).value,depth+1,k);});return out;}
    var out=clone(input,0);need(JSON.stringify(out).length<=maxChars,'FULL_PACKET_SIZE_HOLD');return out;}
  function verifiedSourceDefinition(d){
    need(d.staffSection!==null&&d.personHeadingLevel!==null&&d.workflowHeading!==null&&
      d.organizationType!==null&&d.observation!==null,'UNVERIFIED_SOURCE_LAYOUT_CANDIDATE_LOCAL_HOLD');
    var required=Object.keys(REGISTRY.EXAMPLE_ROLE_001).sort().join('|');
      need(Object.keys(d).sort().join('|')===required&&Number.isInteger(d.row)&&d.row>=6&&d.row<=2000&&d.product==='Jobs'&&
        typeof d.leadId==='string'&&/^[A-Za-z0-9._-]{1,100}$/.test(d.leadId)&&typeof d.person==='string'&&/^[\x20-\x7e]{1,150}$/.test(d.person)&&
        d.person.trim()===d.person&&d.person.split(' ').length>=2&&!/[<>]/.test(d.person)&&typeof d.role==='string'&&d.role.trim()===d.role&&
        /^[\x20-\x7e]{1,150}$/.test(d.role)&&!/[<>]/.test(d.role)&&mailEqual(d.email,d.email)&&d.email.length<=254&&
        d.email.split('@')[0].length<=64&&!/^\.|\.$|\.\./.test(d.email.split('@')[0])&&
        typeof d.organization==='string'&&d.organization.trim()===d.organization&&d.organization.length>0&&d.organization.length<=300&&
        !/[\x00-\x1f<>]/.test(d.organization)&&['COMMUNITY_ORGANIZATION','ASSOCIATION','PUBLICATION'].includes(d.organizationType)&&
        typeof d.organizationKey==='string'&&/^[a-z0-9-]{1,150}$/.test(d.organizationKey)&&typeof d.staffSection==='string'&&
        d.staffSection.trim()===d.staffSection&&/^[\x20-\x7e]{1,100}$/.test(d.staffSection)&&d.personHeadingLevel===3&&
        ['Jobs Board','Opportunities'].includes(d.workflowHeading)&&typeof d.observation==='string'&&d.observation.trim()===d.observation&&
        d.observation.length>0&&d.observation.length<=300&&!/[\x00-\x1f<>]/.test(d.observation),'SCRIPT_OWNED_REGISTRY_DEFINITION_HOLD');
      var a=urlHost(d.staffUrl),b=urlHost(d.workflowUrl);need(a!==b||d.staffUrl!==d.workflowUrl,'REGISTRY_SOURCE_PAIR_DISTINCT_HOLD');
  }
  function registryCurrent(n){if(registryMetadata&&registryMetadata.kind==='INDEPENDENT_SCRIPT_OWNED_NATIVE_REGISTRY_READ_V1')
    need(fresh(registryNativeReadProof?registryNativeReadProof.checkedAtUtc:registryMetadata.capturedAtUtc,n),'SCRIPT_OWNED_REGISTRY_STALE_HOLD');}
  function installRegistrySnapshot(loader){need(typeof loader==='function','SCRIPT_OWNED_REGISTRY_LOADER_REQUIRED_HOLD');
    var p=cloneData(loader(),1200000);need(Object.keys(p).sort().join('|')==='capturedAtUtc|entries|schema|sourceRef|version'&&
      p.schema==='FERNAIN_SCRIPT_OWNED_PRIMARY_SOURCE_REGISTRY_V1'&&Number.isFinite(utc(p.capturedAtUtc))&&typeof p.sourceRef==='string'&&
      p.sourceRef.length>0&&p.sourceRef.length<=300&&typeof p.version==='string'&&/^[A-Za-z0-9._-]{1,80}$/.test(p.version),'SCRIPT_OWNED_REGISTRY_SCHEMA_HOLD');
    if(trustedNativeReadProof!==undefined){var proof=cloneData(trustedNativeReadProof,1000);need(Object.keys(proof).sort().join('|')==='checkedAtUtc|fullRegistryReadSha256|schema'&&
      proof.schema==='FERNAIN_TRUSTED_NATIVE_REGISTRY_READ_V1'&&Number.isFinite(utc(proof.checkedAtUtc))&&proof.fullRegistryReadSha256===sha(p),'SCRIPT_OWNED_REGISTRY_SCHEMA_HOLD');registryNativeReadProof=Object.freeze(proof);}
    dense(p.entries,127,'SCRIPT_OWNED_REGISTRY_ENTRIES_HOLD');var config={};Object.keys(REGISTRY).forEach(function(k){config[k]=REGISTRY[k];});var seen={};
    var required=Object.keys(REGISTRY.EXAMPLE_ROLE_001).sort().join('|');
    p.entries.forEach(function(entry){need(entry&&Object.keys(entry).sort().join('|')==='definitionJson|handle'&&typeof entry.handle==='string'&&
      /^[A-Z][A-Z0-9_]{2,79}$/.test(entry.handle)&&!own(config,entry.handle)&&!seen[entry.handle],'SCRIPT_OWNED_REGISTRY_HANDLE_HOLD');seen[entry.handle]=true;
      var d=BackofficeSalesEvidenceV1.strictJSON(entry.definitionJson);dataObject(d,'REGISTRY_DEFINITION_HOLD');
      need(Object.keys(d).sort().join('|')===required&&Number.isInteger(d.row)&&d.row>=6&&d.row<=2000&&d.product==='Jobs'&&
        typeof d.leadId==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(d.leadId)&&typeof d.person==='string'&&d.person.trim()===d.person&&
        d.person.length>0&&d.person.length<=150&&!/[\x00-\x1f<>]/.test(d.person)&&typeof d.role==='string'&&d.role.trim()===d.role&&
        d.role.length>0&&d.role.length<=150&&!/[\x00-\x1f<>]/.test(d.role)&&mailEqual(d.email,d.email)&&d.email.length<=254&&
        typeof d.organization==='string'&&d.organization.trim()===d.organization&&d.organization.length>0&&d.organization.length<=300&&
        !/[\x00-\x1f<>]/.test(d.organization)&&typeof d.organizationKey==='string'&&/^[a-z0-9-]{1,150}$/.test(d.organizationKey)&&
        (d.organizationType===null||['COMMUNITY_ORGANIZATION','ASSOCIATION','PUBLICATION'].includes(d.organizationType))&&
        (d.staffSection===null||typeof d.staffSection==='string'&&d.staffSection.length>0&&d.staffSection.length<=100&&!/[\x00-\x1f<>]/.test(d.staffSection))&&
        (d.personHeadingLevel===null||d.personHeadingLevel===3)&&(d.workflowHeading===null||['Jobs Board','Opportunities'].includes(d.workflowHeading))&&
        (d.observation===null||typeof d.observation==='string'&&d.observation.length>0&&d.observation.length<=300&&!/[\x00-\x1f<>]/.test(d.observation))&&
        typeof d.staffUrl==='string'&&d.staffUrl.length>0&&d.staffUrl.length<=1000&&!/[\x00-\x20<>]/.test(d.staffUrl)&&
        typeof d.workflowUrl==='string'&&d.workflowUrl.length>0&&d.workflowUrl.length<=1000&&!/[\x00-\x20<>]/.test(d.workflowUrl),
        'SCRIPT_OWNED_REGISTRY_DEFINITION_HOLD');
      need(!Object.keys(config).some(function(k){return config[k].row===d.row||config[k].leadId===d.leadId||mailEqual(config[k].email,d.email);}),'REGISTRY_CANONICAL_IDENTITY_DUPLICATE_HOLD');
      var immutable={};Object.keys(d).forEach(function(k){immutable[k]=d[k];});config[entry.handle]=Object.freeze(immutable);});
    loadedRegistry=Object.freeze(config);registryMetadata=Object.freeze({kind:'INDEPENDENT_SCRIPT_OWNED_NATIVE_REGISTRY_READ_V1',
      sourceRef:p.sourceRef,version:p.version,capturedAtUtc:p.capturedAtUtc,fullRegistryReadSha256:sha(p),fullRegistrySnapshotSha256:sha(config)});
  }
  function registryProof(){return registryMetadata||{kind:'SEED_SCRIPT_CONSTANT_V1',sourceRef:'example-registry-binding.sample.json',
    version:'SEED_V1',capturedAtUtc:null,fullRegistryReadSha256:sha(REGISTRY),fullRegistrySnapshotSha256:sha(REGISTRY)};}
  function canonical(raw,r,n,mode){var x=cloneData(raw,65536),native=x&&x.result&&x.result.structuredContent;
    need(native&&x.result.isError===false&&fresh(x.capturedAtUtc,n)&&native.spreadsheetId===SHEET,'FULL_NATIVE_CANONICAL_HOLD');
    dense(native.sheets,1,'FULL_CANONICAL_SHEETS_HOLD');need(native.sheets.length===1,'FULL_CANONICAL_SHEETS_HOLD');var s=native.sheets[0];
    need(s.properties&&s.properties.title==='Prospects','CANONICAL_TAB_HOLD');dense(s.data,1,'FULL_CANONICAL_DATA_HOLD');need(s.data.length===1,'FULL_CANONICAL_DATA_HOLD');var d=s.data[0];
    need(d.startRow===r.row-1&&(d.startColumn===undefined||d.startColumn===0),'CANONICAL_ROW_HOLD');dense(d.rowData,1,'FULL_CANONICAL_ROW_HOLD');
    need(d.rowData.length===1,'FULL_CANONICAL_ROW_HOLD');var cells=d.rowData[0].values;dense(cells,27,'FULL_27_CELL_PREIMAGE_HOLD');need(cells.length===27,'FULL_27_CELL_PREIMAGE_HOLD');
    var headers=BackofficeSalesEvidenceV1.headers,preimages=cells.map(function(cell){dataObject(cell,'CANONICAL_CELL_HOLD');var p=cell.userEnteredValue===undefined?{}:cell.userEnteredValue;
      dataObject(p,'RAW_CELL_PREIMAGE_HOLD');var ks=Object.keys(p);need(ks.length===0||ks.length===1&&(
        (ks[0]==='stringValue'||ks[0]==='formulaValue')&&typeof p[ks[0]]==='string'||ks[0]==='numberValue'&&typeof p[ks[0]]==='number'&&Number.isFinite(p[ks[0]])||ks[0]==='boolValue'&&typeof p[ks[0]]==='boolean'),'RAW_CELL_PREIMAGE_HOLD');return p;});
    var organizationPreimage=preimages[headers.indexOf('Organization')],organizationDisplay=cells[headers.indexOf('Organization')].formattedValue;
    if(own(organizationPreimage,'formulaValue')){var formula=organizationPreimage.formulaValue,
      match=/^=HYPERLINK\(\s*"((?:[^"]|"")*)"\s*[,;]\s*"((?:[^"]|"")*)"\s*\)$/i.exec(formula);
      need(match&&/^https?:\/\/[^\s<>]+$/.test(match[1].replace(/""/g,'"'))&&match[2].replace(/""/g,'"')===r.organization&&
        organizationDisplay===r.organization,'CANONICAL_ORGANIZATION_FORMULA_DISPLAY_HOLD');
    }else need(organizationPreimage.stringValue===r.organization&&organizationDisplay===r.organization,'CANONICAL_ORGANIZATION_DISPLAY_HOLD');
    function value(h){var p=preimages[headers.indexOf(h)];return h==='Organization'?organizationDisplay:Object.keys(p).length===0?'':p.stringValue;}
    need(value('Organization')===r.organization&&value('Lead ID')===r.leadId&&value('Product')===r.product&&
      value('Published contact route')===r.person+'\n'+r.role+'\n'+r.email,'SOURCE_CANONICAL_IDENTITY_MISMATCH_HOLD');
    need((mode==='LEAD_QUALIFICATION'?RESEARCH_STATUSES.includes(value('Status')):value('Status')==='Qualified - not contacted')&&
      ['Contacted date','Sent from','Sent to','Sent at (UTC)','Message ID','Thread ID'].every(function(h){return value(h)==='';}),'ALREADY_SENT_OR_SOURCE_STATUS_INELIGIBLE_HOLD');
    return {raw:x,rawSha256:sha(x),snapshotSha256:sha(headers.map(function(h,i){return [h,preimages[i]];})),
      cellPreimages:preimages,cellSha256:preimages.map(sha),row:r.row,leadId:r.leadId,product:r.product,expectedStatus:value('Status'),
      organizationDisplayBinding:{method:'INDEPENDENT_CANONICAL_RAW_AND_DISPLAY_BINDING_V1',capturedAtUtc:x.capturedAtUtc,
        value:organizationDisplay,rawPreimageSha256:sha(organizationPreimage),retainedNativeEvidenceSha256:sha(x)}};
  }
  function policy(raw,r,n,canonicalRawSha256){var p=cloneData(raw,16777216);
    // Native runtime packets retain the full provider policy and an exact full
    // ledger commitment. The independent native adapter requires its current
    // full typed/display preimage before semantics. Digests/booleans confer no
    // policy or effect authority; this producer binds the complete packet.
    if(p&&(p.schema==='FERNAIN_NATIVE_FULL_POLICY_PACKET_V1'||p.schema==='FERNAIN_NATIVE_SEMANTIC_POLICY_PACKET_V2')){
      need(fresh(p.checkedAtUtc,n)&&p.target&&p.target.row===r.row&&p.target.leadId===r.leadId&&
        p.target.product===r.product&&p.target.email===r.email&&p.canonicalRawSha256===canonicalRawSha256,
        'NATIVE_FULL_POLICY_TARGET_OR_PREIMAGE_HOLD');
      need(p.ledgerPreimage&&p.nativeProviderPolicy&&typeof p.ledgerPreimage==='object'&&typeof p.nativeProviderPolicy==='object'&&
        Object.keys(p.ledgerPreimage).length>0&&Object.keys(p.nativeProviderPolicy).length>0,'FULL_NATIVE_POLICY_EVIDENCE_REQUIRED_HOLD');
      if(p.schema==='FERNAIN_NATIVE_SEMANTIC_POLICY_PACKET_V2')need(p.ledgerPreimage.schema==='BackofficeNativeSemanticLedgerDigestTransport/v2'&&p.ledgerPreimage.spreadsheetId===SHEET&&p.ledgerPreimage.modelAuthority===false&&p.ledgerPreimage.unreadArchivedPayloadsFreshlyHashed===false&&typeof p.ledgerPreimage.semanticSnapshotSha256==='string'&&/^[a-f0-9]{64}$/.test(p.ledgerPreimage.semanticSnapshotSha256),'FULL_NATIVE_POLICY_EVIDENCE_REQUIRED_HOLD');
      return {fullPacket:p,fullPacketSha256:sha(p),earliestCapturedAtUtc:p.checkedAtUtc,packetStructureVerified:true,
        exclusionsSuppressionDuplicates:'NOT_EVALUATED_IN_SOURCE_PRODUCER',semanticBooleansAreAuthority:false,
        requiredNextStep:'INDEPENDENT_NATIVE_FULL_POLICY_VALIDATOR'};
    }
    need(p&&Array.isArray(p.coverage)&&p.gmail,'FULL_POLICY_PACKET_REQUIRED_HOLD');
    dense(p.coverage,8,'POLICY_COVERAGE_HOLD');need(p.coverage.length===8,'POLICY_COVERAGE_HOLD');var times=[];
    p.coverage.forEach(function(x,i){need(x&&x.result&&x.result.isError===false&&fresh(x.capturedAtUtc,n),'POLICY_NATIVE_READ_OR_FRESHNESS_HOLD');
      var result=x.result.structuredContent;need(result&&result.range===RANGES[i]&&result.majorDimension==='ROWS','EXACT_COMPLETE_POLICY_RANGES_HOLD');
      // Connected Sheets represents verified entirely empty requested ranges as
      // values:null. This is distinct from missing or failed range coverage.
      need(own(result,'values'),'POLICY_VALUES_MISSING_HOLD');
      if(result.values!==null){dense(result.values,i<2?1000:i===7?1000:1800,'POLICY_VALUES_HOLD');result.values.forEach(function(row){dense(row,i<2?27:26,'POLICY_ROW_HOLD');
        row.forEach(function(v){need(typeof v==='string'||typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean','POLICY_VALUE_HOLD');});});}times.push(x.capturedAtUtc);});
    var g=p.gmail;need(g.result&&g.result.isError===false&&fresh(g.capturedAtUtc,n)&&g.result.structuredContent&&
      g.result.structuredContent.next_page_token===null&&typeof g.query==='string'&&g.query.startsWith('in:anywhere ')&&
      g.query.includes('"'+r.email+'"')&&g.query.includes('"'+r.person+'"')&&g.query.includes('"'+r.organization+'"'),'FULL_POLICY_GMAIL_COVERAGE_HOLD');
    dense(g.result.structuredContent.message_ids,1000,'POLICY_GMAIL_IDS_HOLD');
    need(g.result.structuredContent.message_ids.length===0,'POLICY_EXISTING_CONVERSATION_HOLD');times.push(g.capturedAtUtc);
    return {fullPacket:p,fullPacketSha256:sha(p),earliestCapturedAtUtc:new Date(Math.min.apply(null,times.map(utc))).toISOString(),
      packetStructureVerified:true,exclusionsSuppressionDuplicates:'NOT_EVALUATED_IN_SOURCE_PRODUCER',
      semanticBooleansAreAuthority:false,requiredNextStep:'INDEPENDENT_NATIVE_FULL_POLICY_VALIDATOR'};
  }
  function verifyMaterial(record,r,k,n,native,registeredDefinition){var p=cloneData(record,3000000,true);need((native?
    p.outcome==='NATIVE_API_BYTES_PARSED'&&p.profile===PROFILE&&p.captureTimeBasis==='ACTUAL_NATIVE_API_CONTENT_READ_COMPLETION':
    p.outcome==='PARSED_RETAINED_MATERIAL_ONLY'&&p.profile===MATERIAL_PROFILE&&p.prospectiveNativeProfile===PROFILE&&p.liveProvenanceVerified===false)&&
    p.registryKey===k&&p.registrySha256===sha(registeredDefinition||r)&&fresh(p.capturedAtUtc,n)&&
    (p.kind==='staff'||p.kind==='workflow')&&p.effect_eligible===false,'SOURCE_MATERIAL_PROVENANCE_HOLD');
    exactUrl(k,p.kind,p.url);var material=utf8(p.responseBytes);need(material.text===p.responseUtf8&&sha(material.text)===p.responseSha256&&
      p.responseByteLength===material.bytes.length&&sourceType(p.contentType,material)==='text/html','SOURCE_RESPONSE_PREIMAGE_HOLD');
    var facts=p.kind==='staff'?staffFacts(material.text,r):workflowFacts(material.text,r);
    need(sha(facts)===p.factsSha256&&JSON.stringify(facts)===JSON.stringify(p.facts),'SOURCE_EXACT_SELECTION_PREIMAGE_HOLD');return p;
  }
  function verifyDns(evidence,host,n){need(evidence&&evidence.host===host&&evidence.resolver==='https://dns.google/resolve'&&fresh(evidence.capturedAtUtc,n)&&
    evidence.actualConnectionIp==='UNAVAILABLE_URLFETCH_API'&&evidence.ipPinning==='UNAVAILABLE_URLFETCH_API','DNS_PROVENANCE_HOLD');
    dense(evidence.records,10,'DNS_COMPLETE_RECORDS_HOLD');need(evidence.records.length>=2&&sha(evidence.records)===evidence.fullDnsSha256,'DNS_RECORD_PREIMAGE_HOLD');
    var offset=0,summaries=[];[1,28].forEach(function(type){var current=host,chain=[],seen={},addresses=[],nodata=false,done=false;
      while(!done){need(offset<evidence.records.length&&!seen[current],'DNS_BINDING_INCOMPLETE_OR_LOOP_HOLD');seen[current]=true;var record=evidence.records[offset++];
        need(record.type===type&&record.queriedHost===current&&record.url==='https://dns.google/resolve?name='+encodeURIComponent(current)+
          '&type='+type+'&edns_client_subnet=0.0.0.0%2F0'&&fresh(record.capturedAtUtc,n),'DNS_QUERY_BINDING_HOLD');
        var material=utf8(record.responseBytes,MAX_DNS_BYTES);need(sha(material.text)===record.responseSha256,'DNS_RESPONSE_BYTES_PREIMAGE_HOLD');
        var answer=dnsAnswer(material.text,current,type);need(JSON.stringify(answer)===JSON.stringify(record.parsed),'DNS_PARSED_PREIMAGE_HOLD');
        answer.chain.forEach(function(name,index){if(index===0&&chain.length&&chain[chain.length-1]===name)return;need(!chain.includes(name),'DNS_CNAME_LOOP_HOLD');chain.push(name);});need(chain.length-1<=MAX_CHAIN,'DNS_CNAME_BOUND_HOLD');
        if(answer.addresses.length||answer.nodata===true){addresses=answer.addresses;nodata=answer.nodata===true;done=true;}else{need(answer.terminal!==current,'DNS_ADDRESS_UNKNOWN_HOLD');current=answer.terminal;}}
      summaries.push({type:type,chain:chain,terminal:chain[chain.length-1],addresses:addresses,nodata:nodata});});
    need(summaries.some(function(summary){return summary.addresses.length>0;}),'DNS_ADDRESS_UNKNOWN_HOLD');
    need(offset===evidence.records.length&&sha(summaries)===sha(evidence.addresses)&&summaries[0].terminal===summaries[1].terminal&&
      sha(summaries[0].chain)===sha(summaries[1].chain),'DNS_COMPLETE_A_AAAA_BINDING_HOLD');return true;
  }
  function bindMode(bundle,fullCanonicalPreimage,fullPolicyPacket,nowUtc,mode){try{var n=utc(nowUtc);need(Number.isFinite(n),'CLOCK_HOLD');registryCurrent(n);
    var b=cloneData(bundle,6000000,true),registeredDefinition=key(b.registryKey),r=registeredDefinition;need(b.staff&&b.workflow,'BOTH_PRIMARY_SOURCES_REQUIRED_HOLD');
    var native=b.outcome==='NATIVE_SOURCE_CAPTURED_PREPARATION_ONLY',layout=null;
    if(requiresLayoutDerivation(registeredDefinition)){verifiedPreparationDefinition(registeredDefinition);need(native&&b.layoutPreparation,'NATIVE_SOURCE_LAYOUT_DERIVATION_CANDIDATE_LOCAL_HOLD');
      layout=reproduceSourceLayoutFromRetainedBytes(b.layoutPreparation,b.staff.responseBytes,b.workflow.responseBytes);need(layout.outcome==='SUPPORTED_RETAINED_LAYOUT_PREPARATION_ONLY','DERIVED_SOURCE_LAYOUT_REPRODUCTION_HOLD');r=layout.derivedDefinition;
    }else need(!own(b,'layoutPreparation'),'UNEXPECTED_SOURCE_LAYOUT_DERIVATION_HOLD');verifiedSourceDefinition(r);
    if(native){need(b.profile===PROFILE&&b.registrySha256===sha(registeredDefinition)&&sha(b.registryProof)===sha(registryProof())&&fresh(b.capturedAtUtc,n)&&b.provenance&&
      b.provenance.source==='GOOGLE_APPS_SCRIPT_URLFETCH_HTTPS_API_RESPONSE_BYTES_V1'&&b.provenance.certificateValidation===true&&
      b.provenance.redirectFollowing===false&&b.provenance.actualConnectionIp==='UNKNOWN'&&
      b.provenance.ipPinning==='UNAVAILABLE_URLFETCH_API'&&b.provenance.requireActualPeerIp===false,'NATIVE_CAPTURE_PROVENANCE_HOLD');
      dense(b.dnsBefore,2,'BOTH_NATIVE_DNS_HOSTS_HOLD');dense(b.dnsAfter,2,'BOTH_NATIVE_DNS_HOSTS_HOLD');
      need(b.dnsBefore.length===2&&b.dnsAfter.length===2&&sha(b.dnsBefore)===b.dnsBeforeSha256&&sha(b.dnsAfter)===b.dnsAfterSha256,'NATIVE_DNS_FULL_BINDING_HOLD');
      [urlHost(r.staffUrl),urlHost(r.workflowUrl)].forEach(function(host,i){verifyDns(b.dnsBefore[i],host,n);verifyDns(b.dnsAfter[i],host,n);
        need(sha(b.dnsBefore[i].addresses)===sha(b.dnsAfter[i].addresses),'DNS_CHANGED_DURING_CAPTURE_HOLD');
        need(utc(b.dnsBefore[i].capturedAtUtc)<=utc(b.staff.capturedAtUtc)&&
          utc(b.workflow.capturedAtUtc)<=utc(b.dnsAfter[i].capturedAtUtc)&&utc(b.dnsAfter[i].capturedAtUtc)<=utc(b.capturedAtUtc),'DNS_CAPTURE_ORDER_BINDING_HOLD');});
      need(utc(b.staff.capturedAtUtc)<=utc(b.workflow.capturedAtUtc),'NATIVE_CAPTURE_ORDER_HOLD');}
    var staff=verifyMaterial(b.staff,r,b.registryKey,n,native,registeredDefinition),workflow=verifyMaterial(b.workflow,r,b.registryKey,n,native,registeredDefinition);
    need(staff.kind==='staff'&&workflow.kind==='workflow','SOURCE_KIND_MISMATCH_HOLD');var c=canonical(fullCanonicalPreimage,r,n,mode),p=policy(fullPolicyPacket,r,n,c.rawSha256);
    var candidate={lead_id:r.leadId,organization:r.organization,organization_type:r.organizationType,organization_key:r.organizationKey,
      person:r.person,first:r.person.split(' ')[0],current_role:r.role,email:r.email,workflow:'PUBLIC_JOB_BOARD',observation:r.observation};
    var binding={method:'FULL_PREIMAGE_STATIC_NATIVE_SOURCE_BINDING_NO_LIVE_AUTHORITY_V1',registrySha256:sha(registeredDefinition),
      sourceBundleSha256:sha(b),canonicalRawSha256:c.rawSha256,canonicalSnapshotSha256:c.snapshotSha256,
      canonicalCellSha256:c.cellSha256,fullPolicyPacketSha256:p.fullPacketSha256,candidateSha256:sha(candidate),
      operationMode:mode,expectedCanonicalStatus:c.expectedStatus,registryProof:registryProof(),organizationDisplayBinding:c.organizationDisplayBinding};
    if(layout){binding.derivedSourceLayoutSha256=layout.bindingSha256;binding.derivedDefinitionSha256=sha(r);}
    return {schema:NS,outcome:native?'BOUND_NATIVE_SOURCE_CONTEXT_POLICY_PENDING':'BOUND_REPLAY_CONTEXT_SECURITY_HOLD',
      reason_code:native?'EXPLICIT_NATIVE_PROFILE_SOURCE_BOUND_NO_EFFECT_AUTHORITY':'NATIVE_TRANSPORT_AND_LIVE_PROVENANCE_UNVERIFIED',
      profile:PROFILE,materialProfile:native?PROFILE:MATERIAL_PROFILE,source_context:{candidate:candidate,row:r.row,leadId:r.leadId,product:r.product,
        staffSelection:staff.facts.selectionText,workflowSelection:workflow.facts.selectionText,staffUrl:r.staffUrl,workflowUrl:r.workflowUrl,
        fullBindingSha256:sha(binding),binding:binding,sourceTextIsUntrustedData:true,modelReferencesAdvisory:true,
        semanticFactsIndependentlyParsed:true,liveCaptureVerified:native,policyExclusionsIndependentlyEvaluated:false,
        transportProfile:PROFILE,actualConnectionIp:'UNKNOWN',ipPinning:'UNAVAILABLE_URLFETCH_API',
        currentCandidateVerification:native?'CURRENT_EXACT_REGISTERED_CANDIDATE_SOURCE_VERIFIED_POLICY_PENDING':'STATIC_REPLAY_ONLY_NOT_CURRENT_ELIGIBILITY',
        operationMode:mode,expectedCanonicalStatus:c.expectedStatus,sourceRefs:[r.staffUrl,r.workflowUrl],
        researchQualificationImplemented:mode==='LEAD_QUALIFICATION',newLeadDiscoveryImplemented:false},
      evidence:{registryKey:b.registryKey,staff:staff,workflow:workflow,fullCanonicalPreimage:c.raw,
        fullCanonicalPreimageSha256:c.rawSha256,fullPolicyPacket:p.fullPacket,fullPolicyPacketSha256:p.fullPacketSha256,
        policy:p,binding:binding,bindingSha256:sha(binding)},
      sourceVerificationPassed:native,nativeProfileContract:'DISTINCT_ACCEPTED_DNS_PREFLIGHT_HTTPS_NOT_ACTUAL_PEER_IP_ATTESTATION',
      v8Compatibility:'REJECTS_DISTINCT_PROFILE_AS_DESIGNED_DO_NOT_RELABEL_AS_BROWSER',
      researchQualificationImplemented:mode==='LEAD_QUALIFICATION',
      record_authorized:false,effect_eligible:false,send_eligible:false,discovery_implemented:false};
  }catch(e){return hold(safeReason(e,'SOURCE_BINDING_HOLD'));}}
  function bind(bundle,fullCanonicalPreimage,fullPolicyPacket,nowUtc){return bindMode(bundle,fullCanonicalPreimage,fullPolicyPacket,nowUtc,'CURRENT_QUALIFIED_CANDIDATE');}
  function bindResearch(bundle,fullCanonicalPreimage,fullPolicyPacket,nowUtc){return bindMode(bundle,fullCanonicalPreimage,fullPolicyPacket,nowUtc,'LEAD_QUALIFICATION');}
  if(registryLoader!==undefined)installRegistrySnapshot(registryLoader);
  return Object.freeze({profile:PROFILE,materialProfile:MATERIAL_PROFILE,namespace:NS,
    capture:capture,captureRegistered:captureRegistered,preflightHost:preflightHost,
    materialFromRetainedResponse:materialFromRetainedResponse,bind:bind,bindResearch:bindResearch,
    createWithScriptOwnedRegistry:function(loader,readProof){try{return makeProducer(loader,readProof);}catch(e){return hold(safeReason(e,'SCRIPT_OWNED_REGISTRY_LOAD_HOLD'));}},
    registrationStatus:function(k){try{var r=key(k),derive=requiresLayoutDerivation(r);if(derive)verifiedPreparationDefinition(r);else verifiedSourceDefinition(r);return {registered:true,preparationSupported:true,requiresNativeLayoutDerivation:derive,reasonCode:derive?'SOURCE_ONLY_LAYOUT_REQUIRES_LIVE_DERIVATION':'SOURCE_PROFILE_REQUIRES_LIVE_REVALIDATION'};}
      catch(e){return {registered:true,preparationSupported:false,requiresNativeLayoutDerivation:false,reasonCode:safeReason(e,'SCRIPT_OWNED_REGISTRY_DEFINITION_HOLD')};}},
    registryManifest:function(){return cloneData(registry(),1200000);},registryProof:registryProof,
    pure:Object.freeze({octets:octets,utf8:utf8,publicIPv4:publicIPv4,publicIPv6:publicIPv6,dnsAnswer:dnsAnswer,
      deriveSourceLayoutFromRetainedBytes:deriveSourceLayoutFromRetainedBytes,reproduceSourceLayoutFromRetainedBytes:reproduceSourceLayoutFromRetainedBytes,
      exactUrl:exactUrl,staffFacts:staffFacts,workflowFacts:workflowFacts,responseMaterial:responseMaterial})});
}());
if(typeof module!=='undefined'&&module.exports)module.exports=BackofficeNativePublicSourceV1;
