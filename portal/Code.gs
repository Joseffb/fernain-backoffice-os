// Read-only Google-managed view. No doPost, writes, triggers, tokens or shared cache.
function authorize_(config) {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const effective = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!email || email !== effective || email.split('@')[1] !== config.domain ||
      config.audience.indexOf(email) < 0) throw new Error('PORTAL_ACCESS_DENIED');
  return email;
}

function portalScopes_() {
  return ['https://example.org/auth/userinfo.email', 'https://example.org/auth/spreadsheets.readonly'];
}

// Run from the Apps Script IDE when initial/granular consent is missing.
// Missing consent intentionally ends execution in Google's native prompt.
function authorizePortal() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, portalScopes_());
  authorize_(portalConfig_());
  return {state:'authorized'};
}

function doGet() {
  try { authorize_(portalConfig_()); }
  catch (_) { return HtmlService.createHtmlOutput('<h1>Access denied</h1><p>Use an authorized Google Workspace account.</p>'); }
  // Default Google framing policy: validate native Sites embedding before deployment.
  // Do not silently switch to ALLOWALL, which permits arbitrary sites to frame it.
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Backoffice Company Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getPortalSnapshot() {
  const config = portalConfig_();
  const checkedAt = new Date().toISOString();
  let email;
  try { email = authorize_(config); }
  catch (_) { return {state:'denied', checkedAt:checkedAt}; }
  const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL, portalScopes_());
  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED)
    return {state:'authorization_required', checkedAt:checkedAt, authorizationUrl:authInfo.getAuthorizationUrl()};
  const sources = {};
  const permitted = function(key) {return (config.departmentAudience[key]||[]).indexOf(email)>=0;};
  const denied = function(){return {state:'denied',checkedAt:checkedAt};};
  sources.executive=permitted('executive')?readExecutive_(config.executive,checkedAt):denied();
  sources.sales=permitted('sales')?readSalesDashboard_(config.sales,checkedAt):denied();
  sources.finance=permitted('finance')?readFinanceDashboard_(config.finance,checkedAt):denied();
  sources.operations=permitted('operations')?readOperationsDashboard_(config.sales,checkedAt):denied();
  // Dated private report, served only while Owner can still read the private register.
  sources.products=!permitted('products')?denied():sources.executive.state==='verified'?readProductReport_(checkedAt):
    (sources.executive.state==='verification_failed'?{state:'verification_failed',checkedAt:checkedAt}:denied());
  return {state:'ok', checkedAt:checkedAt, viewer:email, pollMs:config.pollMs,
    staleAfterMs:config.staleAfterMs, sources:sources, departments:[]};
}

function safeSourceUrl_(value) {
  return typeof value === 'string' && /^https:\/\/(docs\.google\.com|drive\.google\.com|mail\.google\.com|github\.com|sites\.google\.com|chatgpt\.com)\//.test(value);
}
function sourceUrl_(c) {
  return 'https://docs.google.com/spreadsheets/d/'+c.spreadsheetId+'/edit?gid='+c.sheetId+'#gid='+c.sheetId;
}
function validSource_(c) {
  return c && /^[A-Za-z0-9_-]+$/.test(c.spreadsheetId) && Number.isInteger(c.sheetId) && c.sheetId >= 0;
}
function readRanges_(c, ranges) {
  // Server config supplies all IDs and ranges. Google checks current user's Sheet ACL.
  const metadata = Sheets.Spreadsheets.get(c.spreadsheetId, {fields:'properties.timeZone,sheets.properties'});
  const tab = metadata.sheets.find(function(s){return s.properties.sheetId === c.sheetId;});
  if (!tab) throw new Error('SOURCE_SCHEMA_INVALID');
  const prefix = "'"+tab.properties.title.replace(/'/g,"''")+"'!";
  const plain = tab.properties.title+'!';
  if (!ranges.every(function(r){return r.startsWith(prefix)||r.startsWith(plain);})) throw new Error('SOURCE_SCHEMA_INVALID');
  const values = Sheets.Spreadsheets.Values.batchGet(c.spreadsheetId, {
    ranges:ranges, valueRenderOption:'UNFORMATTED_VALUE', dateTimeRenderOption:'SERIAL_NUMBER'
  }).valueRanges || [];
  return {valueRanges:values,timeZone:metadata.properties&&metadata.properties.timeZone};
}
function sourceError_(e, checkedAt) {
  const code = Number(e && (e.code || (e.details && e.details.code)));
  const msg = String(e && e.message || '');
  const denied = [401,403,404].indexOf(code)>=0 || /permission|access denied|not authorized|not found|does not have access|unauthenticated/i.test(msg);
  return {state:denied?'denied':'verification_failed', checkedAt:checkedAt,
    reason:denied?'Source access could not be established.':'Source verification failed.'};
}
function readExecutive_(c, checkedAt) {
  const fields=['ActionID','State','RequestedAction','FounderReason','Owner','Workstream','Urgency','NeededByUTC','EvidenceURL','EvidenceSummary','EvidenceUTC','AuthoritySource','SubmittedBy','EnteredUTC','ReconciledUTC','LifecycleReason','RelatedActionID','ExitUTC','ExitEvidence'];
  if (!validSource_(c) || c.range!=='Actions!A1:S1000' || c.capacity!==1000)
    return {state:'not_configured',checkedAt:checkedAt};
  try {
    const read = readRanges_(c,[c.range]);
    const rows = read.valueRanges[0] && read.valueRanges[0].values || [];
    const headers = rows[0] || [];
    if(rows.length>=c.capacity || headers.length!==fields.length || !fields.every(function(f,i){return headers[i]===f;}))throw new Error('SOURCE_SCHEMA_INVALID');
    const seen=Object.create(null);let latest=null;const actions=[];
    rows.slice(1).filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).forEach(function(r){
      const dateFields=['NeededByUTC','EvidenceUTC','EnteredUTC','ReconciledUTC','ExitUTC'];
      const a={};fields.forEach(function(k,i){a[k]=dateFields.indexOf(k)>=0&&typeof r[i]==='number'?r[i]:String(r[i]===undefined||r[i]===null?'':r[i]).trim();});
      if(!a.ActionID || seen[a.ActionID])throw new Error('SOURCE_SCHEMA_INVALID');seen[a.ActionID]=true;
      if(['PROPOSED','ADMITTED','WAITING','DONE','DISMISSED','SUPERSEDED'].indexOf(a.State)<0)throw new Error('SOURCE_SCHEMA_INVALID');
      ['EnteredUTC','ReconciledUTC','ExitUTC'].forEach(function(k){if(a[k]!==''){const t=registerTimestamp_(a[k],read.timeZone);if(!latest||t>latest)latest=t;}});
      if(['ADMITTED','WAITING'].indexOf(a.State)<0)return;
      if(!a.RequestedAction||!a.FounderReason||!a.EvidenceURL||!safeSourceUrl_(a.EvidenceURL))throw new Error('SOURCE_SCHEMA_INVALID');
      const updatedAt=a.ReconciledUTC!==''?a.ReconciledUTC:a.EnteredUTC;
      actions.push({id:a.ActionID,title:a.RequestedAction,founderReason:a.FounderReason,status:a.State,
        priority:a.Urgency,due:a.NeededByUTC!==''?registerTimestamp_(a.NeededByUTC,read.timeZone,true):'',
        sourceUrl:a.EvidenceURL,updatedAt:updatedAt!==''?registerTimestamp_(updatedAt,read.timeZone):null,
        evidenceAt:a.EvidenceUTC!==''?registerTimestamp_(a.EvidenceUTC,read.timeZone):null});
    });
    return {state:'verified',checkedAt:checkedAt,updatedAt:latest,
      updatedAtState:latest?'recorded':'not_recorded',url:sourceUrl_(c),actions:actions,
      title:'Executive',question:'Which decisions need founder attention?',
      summary:actions.length+' admitted or waiting founder actions.',
      metrics:[{key:'active',label:'Founder attention items',state:'recorded',value:actions.length,scope:'Only ADMITTED or WAITING records.'},
        {key:'admitted',label:'Admitted',state:'recorded',value:actions.filter(function(a){return a.status==='ADMITTED';}).length,scope:'Admitted queue only.'},
        {key:'waiting',label:'Waiting',state:'recorded',value:actions.filter(function(a){return a.status==='WAITING';}).length,scope:'Waiting queue only.'}],
      attention:actions.map(function(a){return {title:a.title,detail:a.founderReason};}),changes:[],
      files:[file_('Founder Action Register',c.spreadsheetId,c.sheetId,'Decisions'),file_('Action Lifecycle Events',c.spreadsheetId,908,'Lifecycle evidence'),file_('Register Contract',c.spreadsheetId,909,'Governance')]};
  }catch(e){return sourceError_(e,checkedAt);}
}
function registerTimestamp_(value,timeZone,allowFuture) {
  if(typeof value==='number') {
    // Native serials are workbook wall time. This verified binding is UTC.
    // Fail closed if its timezone changes; never use browser/script timezone.
    if(!Number.isFinite(value)||['Etc/UTC','UTC'].indexOf(timeZone)<0)throw new Error('SOURCE_TIMESTAMP_INVALID');
    const milliseconds=Math.round((value-25569)*86400000);
    if(!Number.isSafeInteger(milliseconds)||!Number.isFinite(new Date(milliseconds).getTime()))throw new Error('SOURCE_TIMESTAMP_INVALID');
    return utcTimestamp_(new Date(milliseconds).toISOString(),allowFuture);
  }
  return utcTimestamp_(value,allowFuture);
}
function utcTimestamp_(value, allowFuture) {
  if(typeof value!=='string'||!/(?:Z|\+00:00)$/.test(value)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('SOURCE_TIMESTAMP_INVALID');
  if(!allowFuture&&Date.parse(value)>Date.now()+60000)throw new Error('SOURCE_TIMESTAMP_INVALID');
  return new Date(value).toISOString();
}