/* Backoffice purpose-specific recording guard and trace, v1.
 * Plain JavaScript: Apps Script V8 compatible; CommonJS export is test-only.
 * No network, mail, credential, scheduling or deployment capabilities.
 * Host policy and adapter MUST be trusted code, never Gemini output.
 */
var BackofficeGuard = (function () {
  'use strict';
  var VERSION = 'fernain.trace.v1';
  var OUTCOMES = ['model_prepared', 'prepared', 'recorded', 'duplicate_noop', 'blocked', 'failed', 'effect_uncertain'];
  var ACTIONS = ['record.create_private', 'record.update_private'];
  var FORBIDDEN = /send|reply|draft|forward|notify|webhook|fetch|invoke|call.?flow/i;
  var NATIVE = ['gmail.email_received','gemini.decide','gemini.extract','gemini.ask','gemini.summarize','control.check_if','sheets.get','sheets.add_row','sheets.update_rows','docs.create','docs.append'];
  function fail(code) { var e = new Error(code); e.code = code; throw e; }
  function errorCode(e, fallback) { return e && typeof e.code==='string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(e.code) ? e.code : fallback; }
  function obj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function exact(x, keys, code) {
    if (!obj(x) || Object.keys(x).some(function (k) { return keys.indexOf(k) < 0; })) fail(code);
  }
  function str(x) { return typeof x === 'string' && x.length > 0 && x.length <= 512; }
  function time(x) { return typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x) && !isNaN(Date.parse(x)); }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function requiredPolicy(p) {
    if (!obj(p) || !str(p.department) || !str(p.version) || !str(p.flow_id) || !Array.isArray(p.graph) || !p.graph.length || !Array.isArray(p.destinations) || !p.destinations.length || !Array.isArray(p.actions) || !p.actions.length) fail('POLICY_INVALID');
    if (p.actions.some(function (x) { return ACTIONS.indexOf(x) < 0; })) fail('ACTION_NOT_RECORD_ONLY');
    p.graph.forEach(function (n) {
      exact(n, ['id', 'type', 'target_id', 'source_binding'], 'GRAPH_NODE_INVALID');
      if (!str(n.id) || !str(n.type) || FORBIDDEN.test(n.type) || NATIVE.indexOf(n.type)<0 || !Array.isArray(p.native_step_allowlist) || p.native_step_allowlist.indexOf(n.type) < 0) fail('GRAPH_ACTION_BLOCKED');
      if (/^(docs\.|sheets\.(add_row|update_rows))/.test(n.type) && !str(n.target_id)) fail('GRAPH_DESTINATION_UNBOUND');
      if (/^(gmail\.|gemini\.)/.test(n.type) && !str(n.source_binding)) fail('GRAPH_SOURCE_UNBOUND');
      if (n.target_id && p.destinations.indexOf(n.target_id) < 0) fail('GRAPH_DESTINATION_BLOCKED');
    });
  }
  function assertGraph(p, observed, now) {
    requiredPolicy(p);
    exact(observed, ['flow_id', 'observed_at', 'nodes'], 'GRAPH_OBSERVATION_INVALID');
    if (observed.flow_id !== p.flow_id || !time(observed.observed_at) || !equal(observed.nodes, p.graph)) fail('GRAPH_DRIFT');
    if (!time(now) || !Number.isInteger(p.max_observation_age_ms) || p.max_observation_age_ms<1 || p.max_observation_age_ms>600000 || Date.parse(now)<Date.parse(observed.observed_at) || Date.parse(now)-Date.parse(observed.observed_at)>p.max_observation_age_ms) fail('GRAPH_OBSERVATION_STALE');
    return true;
  }
  function validateOutput(p, output) {
    exact(output, Object.keys(p.output_fields || {}), 'OUTPUT_EXTRA_FIELD');
    Object.keys(p.output_fields || {}).forEach(function (key) {
      var rule = p.output_fields[key], v = output[key];
      if (rule.type === 'boolean' && typeof v !== 'boolean') fail('OUTPUT_TYPE');
      if (rule.type === 'enum' && (!Array.isArray(rule.values) || rule.values.indexOf(v) < 0)) fail('OUTPUT_ENUM');
      if (rule.type !== 'boolean' && rule.type !== 'enum') fail('OUTPUT_POLICY_INVALID');
    });
    return true;
  }
  function validateRequest(p, r) {
    exact(r, ['request_id', 'mode', 'action', 'source', 'destination_id', 'model_output'], 'REQUEST_EXTRA_FIELD');
    exact(r.source, ['system', 'id', 'version'], 'SOURCE_EXTRA_FIELD');
    if (!str(r.request_id) || ['synthetic', 'live'].indexOf(r.mode) < 0 || p.modes.indexOf(r.mode) < 0) fail('REQUEST_SCOPE');
    if (p.actions.indexOf(r.action) < 0 || ACTIONS.indexOf(r.action) < 0) fail('ACTION_BLOCKED');
    if (p.destinations.indexOf(r.destination_id) < 0) fail('DESTINATION_BLOCKED');
    if (!str(r.source.system) || !str(r.source.id) || !str(r.source.version)) fail('SOURCE_UNBOUND');
    validateOutput(p, r.model_output);
    return true;
  }
  function validateTrace(t) {
    exact(t, ['schema_version', 'trace_id', 'department', 'request_id', 'source', 'execution', 'mode', 'started_at', 'finished_at', 'outcome', 'effects', 'guard', 'intervention', 'error', 'department_fields'], 'TRACE_EXTRA_FIELD');
    if (t.schema_version !== VERSION || !str(t.trace_id) || !str(t.department) || !str(t.request_id) || !time(t.started_at) || !time(t.finished_at) || Date.parse(t.finished_at) < Date.parse(t.started_at) || OUTCOMES.indexOf(t.outcome) < 0 || ['synthetic','live'].indexOf(t.mode) < 0) fail('TRACE_INVALID');
    exact(t.source, ['system', 'id', 'version'], 'TRACE_SOURCE');
    if (!str(t.source.system) || !str(t.source.id) || !str(t.source.version)) fail('TRACE_SOURCE');
    exact(t.execution, ['platform','flow_id','run_id','model_observed'], 'TRACE_EXECUTION');
    if (!str(t.execution.platform) || !str(t.execution.flow_id) || (t.execution.run_id !== null && !str(t.execution.run_id)) || (t.execution.model_observed !== null && !str(t.execution.model_observed))) fail('TRACE_EXECUTION');
    exact(t.guard, ['policy_version','allowed_actions','source_bound','destination_bound','no_send','dedup_status'], 'TRACE_GUARD');
    if (!str(t.guard.policy_version) || !Array.isArray(t.guard.allowed_actions) || t.guard.allowed_actions.some(function(x){return ACTIONS.indexOf(x)<0;}) || typeof t.guard.source_bound !== 'boolean' || typeof t.guard.destination_bound !== 'boolean' || typeof t.guard.no_send !== 'boolean' || ['claimed','duplicate','blocked','unknown'].indexOf(t.guard.dedup_status)<0) fail('TRACE_GUARD');
    exact(t.intervention, ['required','reason'], 'TRACE_INTERVENTION');
    if (typeof t.intervention.required !== 'boolean' || (t.intervention.reason !== null && !str(t.intervention.reason))) fail('TRACE_INTERVENTION');
    if (t.error !== null) { exact(t.error,['code','retry_safe'],'TRACE_ERROR'); if (!str(t.error.code) || typeof t.error.retry_safe !== 'boolean') fail('TRACE_ERROR'); }
    if (!Array.isArray(t.effects)) fail('TRACE_EFFECTS');
    t.effects.forEach(function(e) { exact(e,['kind','target_id','receipt_id','verified_at'],'TRACE_EFFECT'); if (ACTIONS.indexOf(e.kind)<0 || !str(e.target_id) || !str(e.receipt_id) || !time(e.verified_at)) fail('TRACE_EFFECT'); });
    if (t.effects.some(function(e){return t.guard.allowed_actions.indexOf(e.kind)<0;})) fail('TRACE_EFFECT_NOT_ALLOWED');
    exact(t.department_fields, ['matter_id','queue_id','row_number','source_mime','review_state','source_sha256','output_sha256','action_key'], 'TRACE_DEPARTMENT_FIELDS');
    Object.keys(t.department_fields).forEach(function(k){var v=t.department_fields[k];if(v!==null && !(k==='row_number' && Number.isInteger(v) && v>0) && !str(v))fail('TRACE_DEPARTMENT_VALUE');});
    if (['prepared','recorded'].indexOf(t.outcome)>=0 && (!t.effects.length || !t.guard.source_bound || !t.guard.destination_bound || !t.guard.no_send || t.guard.dedup_status!=='claimed' || t.error!==null)) fail('TRACE_FALSE_COMPLETION');
    if (t.outcome==='duplicate_noop' && (t.effects.length || t.guard.dedup_status!=='duplicate')) fail('TRACE_FALSE_DUPLICATE');
    if (t.outcome==='effect_uncertain' && (!t.error || t.error.retry_safe!==false)) fail('TRACE_UNCERTAINTY');
    if (t.outcome==='model_prepared' && (t.effects.length || !t.guard.source_bound || !t.guard.no_send || !str(t.execution.model_observed) || !/^[a-f0-9]{64}$/.test(t.department_fields.output_sha256||'') || t.error!==null)) fail('TRACE_MODEL_PREPARATION');
    return true;
  }
  /* Adapter owns existing lock/CAS and canonical records. No new claim store here.
   * claim must validate exact request/source/version/destination under its existing
   * ownership protocol. writePrivate is invoked at most once; never retried.
   * verifyEffect must independently compare exact payload/source/destination.
   */
  async function execute(p, observed, request, adapter, context) {
    var initialNow=adapter.now();
    assertGraph(p, observed, initialNow); validateRequest(p, request);
    exact(context,['trace_id','started_at','platform','run_id','model_observed'],'CONTEXT_INVALID');
    if (!time(context.started_at) || Date.parse(context.started_at)>Date.parse(initialNow) || !str(context.trace_id) || !str(context.platform) || (context.run_id!==null && !str(context.run_id)) || (context.model_observed!==null && !str(context.model_observed))) fail('CONTEXT_INVALID');
    var r = JSON.parse(JSON.stringify(request));
    var trace = {schema_version:VERSION,trace_id:context.trace_id,department:p.department,request_id:r.request_id,source:r.source,execution:{platform:context.platform,flow_id:p.flow_id,run_id:context.run_id||null,model_observed:context.model_observed||null},mode:r.mode,started_at:context.started_at,finished_at:null,outcome:'blocked',effects:[],guard:{policy_version:p.version,allowed_actions:p.actions.slice(),source_bound:false,destination_bound:true,no_send:true,dedup_status:'unknown'},intervention:{required:false,reason:null},error:null,department_fields:{}};
    var attempted=false, claimed=false, knownEffect=null;
    try {
      var claim=await adapter.claim(r);
      if (!claim || !equal(claim.binding,{request_id:r.request_id,source:r.source,destination_id:r.destination_id,mode:r.mode,action:r.action,policy_version:p.version,model_output:r.model_output})) fail('CLAIM_BINDING');
      if (claim.state==='duplicate') { trace.outcome='duplicate_noop'; trace.guard.dedup_status='duplicate'; }
      else {
        if (claim.state!=='claimed' || !str(claim.token)) fail('CLAIM_NOT_EXCLUSIVE');
        claimed=true; trace.guard.dedup_status='claimed';
        if (await adapter.verifySource(r.source)!==true) fail('SOURCE_DRIFT');
        trace.guard.source_bound=true;
        if (typeof adapter.observeGraph!=='function') fail('GRAPH_REOBSERVATION_REQUIRED');
        var latestGraph=await adapter.observeGraph();
        assertGraph(p,latestGraph,adapter.now());
        attempted=true;
        var effect=await adapter.writePrivate(r,claim.token);
        if (!effect || !str(effect.receipt_id) || effect.target_id!==r.destination_id || effect.kind!==r.action) fail('EFFECT_UNVERIFIED');
        knownEffect={kind:r.action,target_id:r.destination_id,receipt_id:effect.receipt_id};
        if (await adapter.verifyEffect(r,effect)!==true) fail('EFFECT_UNVERIFIED');
        effect={kind:r.action,target_id:r.destination_id,receipt_id:effect.receipt_id,verified_at:adapter.now()};
        trace.effects=[effect]; trace.outcome='recorded';
      }
    } catch (e) {
      trace.outcome=attempted?'effect_uncertain':(claimed?'failed':'blocked');
      trace.error={code:errorCode(e,'ADAPTER_FAILURE'),retry_safe:false};
      trace.intervention={required:true,reason:attempted?'Reconcile the existing claim and exact effect; never blindly retry.':'Resolve guard or source failure under existing owner protocol.'};
    }
    try { trace.finished_at=adapter.now(); validateTrace(trace); }
    catch (e) {
      trace.outcome=attempted?'effect_uncertain':'failed';
      trace.error={code:errorCode(e,'TRACE_VALIDATION_FAILURE'),retry_safe:false};
      trace.intervention={required:true,reason:'Retain this failure envelope and reconcile the existing claim/effect; never retry the write blindly.'};
      return {status:'trace_validation_failed',retry_safe:false,effect_attempted:attempted,known_effect:knownEffect,trace:trace};
    }
    try { await adapter.recordTrace(trace); }
    catch (e) { return {status:'trace_persistence_failed',retry_safe:false,effect_attempted:attempted,known_effect:knownEffect,trace:trace}; }
    return {status:trace.outcome,retry_safe:false,effect_attempted:attempted,known_effect:knownEffect,trace:trace};
  }
  return Object.freeze({VERSION:VERSION,assertGraph:assertGraph,validateRequest:validateRequest,validateOutput:validateOutput,validateTrace:validateTrace,execute:execute});
}());
if (typeof module !== 'undefined' && module.exports) module.exports = BackofficeGuard;
