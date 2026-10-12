// Example source adapter contract. Replace sample sheet and tab bindings during setup.
// No snapshot business values are embedded in client HTML.
function file_(label,id,gid,category) {
  return {label:label,url:'https://docs.google.com/spreadsheets/d/'+id+'/edit#gid='+gid,category:category};
}
function grids_(id,tabs,ranges) {
  const meta=Sheets.Spreadsheets.get(id,{fields:'properties.timeZone,sheets.properties'});
  tabs.forEach(function(t){if(!meta.sheets.some(function(s){return s.properties.sheetId===t.id&&s.properties.title===t.name;}))throw new Error('SOURCE_SCHEMA_INVALID');});
  const values=Sheets.Spreadsheets.Values.batchGet(id,{ranges:ranges,valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'SERIAL_NUMBER'}).valueRanges||[];
  if(values.length!==ranges.length)throw new Error('SOURCE_SCHEMA_INVALID');
  return {values:values.map(function(v){return v.values||[];}),timezone:meta.properties&&meta.properties.timeZone,metadata:meta};
}
function countMetric_(key,label,literal,scope) {
  if(typeof literal!=='number'||!Number.isInteger(literal)||literal<0)throw new Error('SOURCE_VALUE_INVALID');
  return {key:key,label:label,value:literal,sourceLiteral:literal,state:'recorded',scope:scope};
}
function label_(value,meaning) {if(typeof value!=='string'||!meaning.test(value))throw new Error('SOURCE_LABEL_CHANGED');return value;}
function funnelMetric_(key,label,value) {
  if(value===''||value===null||value===undefined||value==='Unknown')return {key:key,label:label,state:'not_recorded',value:null,sourceLiteral:value===undefined?null:value,display:'Not yet recorded in pipeline',scope:'Saved Project Atlas pipeline; absence is not zero.'};
  if(typeof value==='string'&&/^≥\s*\d+$/.test(value))return {key:key,label:label,state:'lower_bound',value:Number(value.replace(/[^0-9]/g,'')),sourceLiteral:value,scope:'Recorded lower bound, not an exact total.'};
  return countMetric_(key,label,value,'Recorded Project Atlas pipeline outcome; scoped to the saved ledger.');
}
function successfulSource_(checkedAt,metrics,extra) {
  return Object.assign({state:'verified',checkedAt:checkedAt,updatedAt:null,updatedAtState:'not_recorded',metrics:metrics,attention:[],changes:[],files:[]},extra||{});
}
function readSalesDashboard_(c,checkedAt) {
  try {
    const ranges=["'Dashboard'!A5:K11","'Reply Insights'!A5:K11","'Reply Insights'!A100:A1100","'Reply Insights'!O100:O1100"];
    const g=grids_(c.spreadsheetId,[{id:901,name:'Dashboard'},{id:902,name:'Reply Insights'}],ranges).values;
    const at=function(grid,row,col){return grid[row]&&grid[row][col];};
    const d=g[0],r=g[1],metrics=[];
    const defs=[['qualified','Qualified',0,/qualif/i],['sends','Recorded sends',3,/send|sent|introduc/i],['human_contacts','Human reply contacts',6,/human|repl/i],['holds','Unsent holds',9,/hold|held/i]];
    defs.forEach(function(x){const sourceLabel=label_(at(d,0,x[2]),x[3]);const m=countMetric_(x[0],x[1],at(d,1,x[2]),'Saved Project Atlas contact ledger; recorded sends do not prove delivery.');m.sourceLabel=sourceLabel;metrics.push(m);});
    const compound=String(at(d,5,0)||'').match(/^(\d+) contacts\s+•\s+(\d+) organizations$/);
    if(!compound)throw new Error('SOURCE_COUNT_FORMAT_CHANGED');
    metrics.push(countMetric_('contacts','Saved contacts',Number(compound[1]),'Prospect contacts, not customers.'));
    metrics.push(countMetric_('organizations','Saved organizations',Number(compound[2]),'Prospect organizations, not customer organizations.'));
    const replyDefs=[['human_threads','Reviewed human threads',0,/human|thread/i],['complaints','Human complaints',3,/hostil|complaint/i],['interest','Expressed interest',6,/interest/i],['review_queue','New / changed for review',9,/new|chang|review/i]];
    replyDefs.forEach(function(x){const sourceLabel=label_(at(r,0,x[2]),x[3]);const m=countMetric_(x[0],x[1],at(r,1,x[2]),'Human-reviewed saved threads; excludes automated delivery notices.');m.sourceLabel=sourceLabel;metrics.push(m);});
    const funnel=[['introduced','Introduced',0,/introduc|sent/i],['replied','Human replies',2,/human|repl/i],['interested','Interested',4,/interest/i],['conversations','Conversations',6,/convers/i],['demos','Demos',8,/demo/i],['customers','Customers',10,/customer/i]];
    const funnelMetrics=funnel.map(function(x){const sourceLabel=label_(at(r,5,x[2]),x[3]);const m=funnelMetric_(x[0],x[1],at(r,6,x[2]));m.sourceLabel=sourceLabel;return m;});
    const ids=g[2],times=g[3];label_(at(ids,0,0),/^Thread ID$/i);label_(at(times,0,0),/^Reviewed UTC$/);
    if(ids.length>=1001||times.length>=1001)throw new Error('REVIEW_RANGE_CAPACITY');
    const seen=Object.create(null);let reviewedAt=null;
    for(let i=1;i<Math.max(ids.length,times.length);i++){
      const id=String(at(ids,i,0)||'').trim(),v=at(times,i,0);
      if(!id){if(v!==undefined&&v!=='')throw new Error('REVIEW_ID_MISSING');continue;}
      if(seen[id])throw new Error('REVIEW_ID_DUPLICATE');seen[id]=true;
      const t=utcTimestamp_(v);if(!reviewedAt||t>reviewedAt)reviewedAt=t;
    }
    const holds=metrics.find(function(m){return m.key==='holds';}).value;
    const queue=metrics.find(function(m){return m.key==='review_queue';}).value;
    return successfulSource_(checkedAt,metrics,{title:'Sales & Customers',question:'How is sales progressing?',
      summary:holds+' unsent held routes; '+queue+' new or changed items await agent review.',
      reviewedAt:reviewedAt,reviewMeaning:'Latest recorded human classification review; separate from this saved-ledger read.',
      funnel:funnelMetrics,attention:[{title:'Unsent holds',detail:holds+' saved routes are held. No automatic resend or resumption is implied.'},{title:'Agent review status',detail:queue+' saved items require review against their recorded snapshots.'}],
      files:[file_('Sales Dashboard',c.spreadsheetId,901,'Sales records'),file_('Reply Insights',c.spreadsheetId,902,'Review evidence'),file_('Campaign Evidence',c.spreadsheetId,903,'Review evidence')]});
  }catch(e){return sourceError_(e,checkedAt);}
}
function financeMissing_(key,label,literal,scope) {
  if(literal===''||literal===null||literal===undefined||String(literal).toLowerCase()==='n.a.')
    return {key:key,label:label,state:'not_recorded',value:null,sourceLiteral:literal===undefined?null:literal,display:'Not reconciled',scope:scope};
  // A newly numeric total needs its reporting period and reconciliation reviewed.
  return {key:key,label:label,state:'verification_failed',value:null,sourceLiteral:literal,display:'Reconciliation review required',scope:'Source changed; a numeric cell alone does not establish a reconciled company total.'};
}
function ownerReportTime_(literal) {
  if(typeof literal!=='string')throw new Error('SOURCE_TIMESTAMP_INVALID');
  const match=literal.match(/\b(\d{4}-\d\d-\d\d) (\d\d:\d\d(?::\d\d)?) UTC\b/);
  if(!match)throw new Error('SOURCE_TIMESTAMP_INVALID');
  return utcTimestamp_(match[1]+'T'+match[2]+(match[2].length===5?':00':'')+'Z');
}
function providerCreditMetric_(key,label,row,provider) {
  label_(row[0],provider);label_(row[2],/^USD (service|provider) credits$/i);
  const reportedAt=ownerReportTime_(row[4]),raw=row[3];
  if(raw!==''&&raw!==null&&raw!==undefined&&(typeof raw!=='number'||!Number.isFinite(raw)||raw<0))throw new Error('SOURCE_VALUE_INVALID');
  const missing=raw===''||raw===null||raw===undefined;
  const expiry=typeof row[5]==='string'&&/^\d{4}-\d\d-\d\d$/.test(row[5])&&
    Number.isFinite(Date.parse(row[5]+'T00:00:00Z'))&&new Date(row[5]+'T00:00:00Z').toISOString().slice(0,10)===row[5]?row[5]:null;
  let scope='Owner-reported source record; provider balance/eligibility not independently verified. '+
    (expiry?'Reported expiry '+expiry+'. ':'Expiry not verified. ')+
    'Provider-specific noncash credit; not cash, revenue or shared runway.';
  if(key==='stripe_credit') {
    if(typeof row[1]!=='number'||!Number.isFinite(row[1])||row[1]<0)throw new Error('SOURCE_VALUE_INVALID');
    scope='Displayed funding USD '+row[1].toLocaleString('en-US')+'. '+scope+' Eligible fees/coverage unverified; no blanket free-year assumption.';
  }
  return {key:key,label:label,state:missing?'not_recorded':'reported',value:missing?null:raw,
    sourceLiteral:raw===undefined?null:raw,display:missing?'Credit balance not recorded':'USD '+raw.toLocaleString('en-US')+' credits',
    observedDate:reportedAt,reportedAt:reportedAt,reportSourceLiteral:row[4],expiryLiteral:row[5]===undefined?null:row[5],
    scope:scope};
}
function readFinanceDashboard_(c,checkedAt) {
  try {
    const reads=grids_(c.spreadsheetId,[{id:904,name:'Company Overview'},{id:905,name:'Credits and Benefits'}],
      ["'Company Overview'!A5:D16","'Credits and Benefits'!A4:H6","'Credits and Benefits'!A11:H11"]).values;
    const g=reads[0],credits=reads[1],stripe=reads[2][0]||[];
    const row=function(n){return g[n-5]||[];};
    label_(row(5)[0],/cash/i);label_(row(7)[0],/revenue/i);label_(row(10)[0],/cost|burn|expense/i);label_(row(14)[0],/runway/i);
    const raw=row(5)[1];
    const cash={key:'reported_cash',label:'Last reported operating cash',state:'verification_failed',value:null,sourceLiteral:raw===undefined?null:raw,display:'Report needs verification',scope:'Not a current bank balance.'};
    const metrics=[cash,{key:'current_cash',label:'Current operating balance',state:'stale',value:null,display:'Current balance not verified',sourceLiteral:raw===undefined?null:raw,scope:'Historical founder cash report cannot establish current balance or unpaid commitments.'},financeMissing_('revenue','Monthly product revenue',row(7)[1],'Common reporting month and collections are not reconciled.'),financeMissing_('cost','Monthly company cost',row(10)[1],'Partial tooling planning amounts are not total burn.'),financeMissing_('runway','Cash runway',row(14)[1],'Do not divide historic cash by an incomplete planning subtotal.')];
    const creditHeaders=['Provider / benefit','Original award','Unit','Latest observed / reported balance','Balance source date','Expiry / term','Evidence status','Budget treatment / next check'];
    if(!credits[0]||!creditHeaders.every(function(h,i){return credits[0][i]===h;}))throw new Error('SOURCE_SCHEMA_INVALID');
    const providerCredits=[providerCreditMetric_('neon_credit','Neon service credit balance',credits[1]||[],/^Neon Startup Program$/),
      providerCreditMetric_('aws_credit','AWS service credit balance',credits[2]||[],/^AWS Activate$/),
      providerCreditMetric_('stripe_credit','Stripe Startups credit balance',stripe,/^Stripe Startups Credit$/)];
    providerCredits.forEach(function(m){metrics.push(m);});
    const charge=row(16);label_(charge[0],/^Owner-reported charge status$/);
    if(typeof charge[1]!=='string'||!charge[1].trim())throw new Error('SOURCE_VALUE_INVALID');
    const chargeAt=ownerReportTime_(charge[2]);
    metrics.push({key:'owner_charge_report',label:'Owner-reported charge status',state:'reported',value:charge[1],display:charge[1],sourceLiteral:charge[1],observedDate:chargeAt,
      scope:'Dated owner statement; scope not independently reconciled. Does not establish zero usage or unbilled accrual, or erase historical provider charges.'});
    const reportTimes=providerCredits.map(function(m){return m.reportedAt;}).concat([chargeAt]).sort();
    return successfulSource_(checkedAt,metrics,{title:'Finance',question:'What can we substantiate about cash, cost and runway?',summary:'Provider-specific credits are noncash. Current balance and period totals still need reconciliation.',
      contextAsOf:reportTimes[reportTimes.length-1],contextMode:'Latest recorded owner report; not provider/bank reconciliation or source read time.',
      attention:[{title:'Reconcile cash and commitments',detail:'Current bank balance and unpaid commitments have not been established in these records.'},{title:'Close the reporting period',detail:'Reconcile revenue, collections and full operating costs before relying on runway.'}],
      files:[file_('Company Overview',c.spreadsheetId,904,'Finance review'),file_('Credits and Benefits',c.spreadsheetId,905,'Provider-specific credits'),file_('Project Forecasts',c.spreadsheetId,906,'Planning and controls')]});
  }catch(e){return sourceError_(e,checkedAt);}
}
function campaignEvidenceTime_(detail) {
  const match=String(detail||'').match(/\bChecked\s+(?:UTC\s+)?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\b/i);
  if(!match)throw new Error('SOURCE_TIMESTAMP_INVALID');
  return utcTimestamp_(match[1]);
}
function campaignDisposition_(rows) {
  let current=null,guard=null,lastAt=null,lastHold=null;const holds={},seen={};
  const unknown=function(row,reason){current={state:'unverified',row:row,reason:reason};guard=null;};
  rows.forEach(function(r,i){
    const id=String(r[0]||''),type=String(r[2]||''),detail=String(r[3]||''),row=20+i;
    const direct=/^CAMPAIGN-/.test(id),preflight=/^OUTREACH-.*-PREFLIGHT$/.test(id)||/^CAMPAIGN-GUARD-/.test(id);
    if(!direct&&!preflight)return; // Recipient holds, sent receipts and quoted diagnosis are not global disposition.
    if(seen[id]){unknown(row,'Duplicate campaign evidence ID.');return;}seen[id]=true;
    let at;try{at=campaignEvidenceTime_(detail);}catch(_){unknown(row,'Campaign evidence time is missing or invalid.');return;}
    if(lastAt&&at<lastAt){unknown(row,'Campaign evidence chronology needs reconciliation.');return;}lastAt=at;
    if(/^CAMPAIGN-HOLD-/.test(id)){
      holds[id]={row:row,at:at};lastHold=id;
      if(/^Historical\b.*\bsuperseded\b/i.test(type)){
        if(current&&current.id===id)unknown(row,'Superseded hold has no verified replacement.');return;
      }
      if(!/^(?:Active\s+)?campaign[- ]wide\s+HOLD\b/i.test(type)){unknown(row,'Campaign hold disposition is ambiguous.');return;}
      current={state:'hold',id:id,row:row,at:at,type:type};guard=null;return;
    }
    if(/^CAMPAIGN-RELEASE-/.test(id)){
      const supersedes=detail.match(/Explicitly supersedes the campaign[- ]wide HOLD\s+(CAMPAIGN-HOLD-[A-Za-z0-9_-]+)/i);
      const owner=detail.match(/Owner decision\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\b/i);
      let ownerAt;try{ownerAt=owner&&utcTimestamp_(owner[1]);}catch(_){}
      const hold=supersedes&&holds[supersedes[1]];
      if(!/^Owner-authorized bounded new-contact resume$/i.test(type)||!hold||supersedes[1]!==lastHold||hold.row>=row||!ownerAt||ownerAt<hold.at||ownerAt>at||
        (current&&(current.state==='unverified'||(current.state==='hold'&&current.id!==supersedes[1])))||
        !/explicit authority for existing new-contact outreach only/i.test(detail)||!/suppress|excluded/i.test(detail)||!/quota|rolling60min/i.test(detail)){
        unknown(row,'A complete owner-authorized bounded superseding release could not be verified.');return;
      }
      current={state:'release',id:id,row:row,at:at,type:type};guard=null;return;
    }
    if(preflight){
      if(/^(?:Active\s+)?campaign[- ]wide\s+HOLD\b|^Preflight blocked\b|^Actual (?:provider|account).*restriction\b/i.test(type)){
        current={state:'hold',id:id,row:row,at:at,type:type};guard=null;return;
      }
      // A canonical preflight corroborates the exact release, without requiring one prose phrase.
      const ids=detail.match(/\bCAMPAIGN-RELEASE-[A-Za-z0-9_-]+\b/g)||[];
      const rowRefs=(detail.match(/\brelease\s*(?:Evidence\s*)?\d+\b/ig)||[]).map(function(ref){return Number(ref.replace(/^\D+/,''));});
      const reference=current&&current.state==='release'&&(ids.indexOf(current.id)>=0||rowRefs.indexOf(current.row)>=0);
      const conflict=reference&&(ids.some(function(ref){return ref!==current.id;})||rowRefs.some(function(ref){return ref!==current.row;}));
      const uncertain=/\b(?:preflight|guard|release|disposition)\s+(?:result\s+)?(?:unknown|unverified|unavailable|unclear|ambiguous|conflicting)\b/i.test(type+' '+detail)||
        /(?:^|[.!?]\s+|\n)(?:a\s+)?(?:current|new|active)\s+(?:global|campaign[- ]wide)\s+HOLD\b/i.test(detail);
      if(!reference||conflict||uncertain||!/suppress|excluded/i.test(detail)||!/quota|rolling60min|rollinghour/i.test(detail)){
        unknown(row,'Later campaign guard does not verify the current disposition.');return;
      }
      guard={row:row,at:at};return;
    }
    unknown(row,'Unrecognized campaign-wide disposition needs reconciliation.');
  });
  return {current:current||{state:'unverified',reason:'No current campaign disposition is recorded.'},guard:guard};
}
function readOperationsDashboard_(c,checkedAt) {
  try {
    const g=grids_(c.spreadsheetId,[{id:903,name:'Evidence'}],["'Evidence'!A5:G5","'Evidence'!A20:G250"]);
    const headers=['Lead ID','Organization','Evidence type','Detail','Source link','Source URL','Checked'];
    if(!g.values[0][0]||!headers.every(function(h,i){return g.values[0][0][i]===h;}))throw new Error('SOURCE_SCHEMA_INVALID');
    const rows=g.values[1],tab=g.metadata.sheets.find(function(s){return s.properties.sheetId===903;});
    const capacity=tab.properties.gridProperties&&tab.properties.gridProperties.rowCount;
    const report=campaignDisposition_(rows);
    if(!Number.isInteger(capacity)||capacity>250||rows.length>=232)report.current={state:'unverified',reason:'Campaign evidence exceeds the verified read boundary.'};
    const current=report.current,hold=current.state==='hold',released=current.state==='release';
    const recordUrl=function(row){return 'https://docs.google.com/spreadsheets/d/'+c.spreadsheetId+'/edit#gid=903&range=A'+row+':G'+row;};
    const signing=rows[1]&&rows[1][2],receiver=rows[1]&&rows[1][3];label_(signing,/dkim|sign/i);
    const scope='Recipient/organization suppressions, source and quota guards remain required. Provider quota, receiver outcomes and present send readiness are not verified by this portal.';
    const metric={key:'campaign',label:'Campaign sending',state:hold||released?'recorded':'verification_failed',value:hold?'HOLD':released?'BOUNDED_RELEASE':null,
      display:hold?'Sales emails paused':released?current.type:'Campaign disposition needs verification',sourceLiteral:current.type||null,
      observedDate:current.at||null,sourceCheckedAt:checkedAt,sourceUrl:current.row?recordUrl(current.row):null,scope:scope+(current.reason?' '+current.reason:'')};
    const files=[file_('Campaign Evidence',c.spreadsheetId,903,'Deliverability'),file_('Reply Insights',c.spreadsheetId,902,'Human review')];
    if(current.row)files.push({label:'Current campaign disposition',url:recordUrl(current.row),category:'Campaign authority'});
    if(report.guard&&released)files.push({label:'Latest campaign guard',url:recordUrl(report.guard.row),category:'Source and suppression guards'});
    return successfulSource_(checkedAt,[metric,{key:'signing',label:'Recorded signing evidence',state:'recorded',value:signing,sourceLiteral:signing,sourceUrl:recordUrl(21),scope:'Prior-time diagnosis; does not establish current receiving-server authentication or campaign disposition.'},
      {key:'receiver',label:'Receiver verification',state:'unknown',value:null,display:'Not verified by this view',sourceLiteral:receiver||null,sourceUrl:recordUrl(21),scope:'Recipient authentication cannot be established from signing status alone.'}],
      {title:'Operations',question:'What is happening with sales email?',summary:released?'Owner-approved bounded new-contact resume is recorded. Recipient suppressions and live source/quota guards remain required.':hold?'Sales emails paused under the current campaign-wide hold.':'Current campaign disposition could not be verified.',
      contextAsOf:released&&report.guard?report.guard.at:current.at||null,contextMode:'Recorded campaign disposition and later guard evidence; separate from this portal read time.',
      attention:[{title:released?'Bounded resume; recipient suppressions retained':hold?'Sales emails paused':'Campaign disposition unavailable',detail:metric.scope}],files:files});
  }catch(e){return sourceError_(e,checkedAt);}
}
function readProductReport_(c,checkedAt) {
  try {
    if(!validSource_(c)||c.sheetId!==907)return {state:'not_configured',checkedAt:checkedAt};
    const rows=grids_(c.spreadsheetId,[{id:907,name:'Project Portfolio'}],["'Project Portfolio'!A4:N7"]).values[0];
    const headers=['Project','Product / beneficiary','Bounded outcome','Baseline / EVM state','BAC','PV','EV','AC','Missing to enable EVM','Source record'];
    if(!rows[0]||!headers.every(function(h,i){return rows[0][i]===h;}))throw new Error('SOURCE_SCHEMA_INVALID');
    const extension=['DeliveryStatus','EvidenceURL','EvidenceUTC','SourceCheckedUTC'];
    const hasExtension=extension.some(function(_h,i){return rows[0][i+10]!==undefined&&rows[0][i+10]!=='';});
    if(hasExtension&&!extension.every(function(h,i){return rows[0][i+10]===h;}))throw new Error('SOURCE_SCHEMA_INVALID');
    const metrics=[],files=[file_('Project Portfolio',c.spreadsheetId,907,'Derived reporting projection')];let evidenceAt=null;
    [['jobs','Project Atlas','Project Atlas'],['project_cedar','Cedar','Project Cedar'],['project_ember','Project Ember','Project Ember']].forEach(function(def,i){
      const row=rows[i+1]||[];if(row[0]!==def[2])throw new Error('SOURCE_LABEL_CHANGED');
      const m={key:def[0]+'_delivery',label:def[1],state:'not_recorded',value:null,display:'Status not recorded',
        sourceUrl:sourceUrl_(c)+'&range=K'+(i+5)+':N'+(i+5),scope:'No maintained delivery report is recorded. This does not establish readiness.'};
      const delivery=row.slice(10,14),present=delivery.filter(function(v){return v!==undefined&&v!==null&&v!=='';}).length;
      if(present){
        try {
          if(!hasExtension||present!==4||typeof row[10]!=='string'||!row[10].trim()||row[10].length>2000||!safeSourceUrl_(row[11]))throw new Error('SOURCE_VALUE_INVALID');
          const evidenceUTC=utcTimestamp_(row[12]),sourceCheckedUTC=utcTimestamp_(row[13]);
          if(sourceCheckedUTC<evidenceUTC)throw new Error('SOURCE_TIMESTAMP_INVALID');
          Object.assign(m,{state:'reported',value:row[10],display:row[10],observedDate:evidenceUTC,
            evidenceAt:evidenceUTC,sourceCheckedAt:sourceCheckedUTC,evidenceUrl:row[11],
            scope:'Derived reporting projection. The linked engineering evidence is authoritative. Evidence time and source check time are separate; this view does not establish installed verification.'});
          if(!evidenceAt||evidenceUTC>evidenceAt)evidenceAt=evidenceUTC;
          files.push({label:def[1]+' engineering evidence',url:row[11],category:'Engineering evidence'});
        }catch(_){Object.assign(m,{state:'verification_failed',display:'Status record needs verification',scope:'Delivery status, evidence URL and explicit UTC evidence/check times must all be valid.'});}
      }
      metrics.push(m);
    });
    return successfulSource_(checkedAt,metrics,{title:'Products & Engineering',question:'What is the latest recorded delivery status?',
      summary:'Latest maintained delivery reports for Project Atlas, Cedar and Project Ember.',contextAsOf:evidenceAt,
      contextMode:'Latest recorded evidence date. Portal polling does not establish new engineering or installed acceptance.',
      files:files,attention:metrics.filter(function(m){return m.state==='verification_failed';}).map(function(m){return {title:m.label+' status unavailable',detail:m.scope};})});
  }catch(e){return sourceError_(e,checkedAt);}
}