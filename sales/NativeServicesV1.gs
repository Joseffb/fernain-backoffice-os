/*
 * Apps Script V8 transport companion. Loading this file has no effects.
 * Advanced Gmail v1 and Sheets v4 services must be installed independently.
 * Read-only sendAs.list and getVacation accept the proposed gmail.modify scope.
 * https://developers.google.com/path/to/workspace-resource
 * https://developers.google.com/path/to/workspace-resource
 * No settings write or additional settings scope is requested.
 * The caller owns independent policy, source/owner authority, sole-writer
 * cutover, no-resend journaling, and the decision to invoke any mutation.
 * A ScriptLock coordinates only this project: it is not a Sheets CAS primitive
 * and cannot prevent writes from another project, browser, or API client.
 */
function fernainNativePublic0259CaseConfigurationV1(){
 return {journalPropertyPrefix:'{{CONFIGURE_PRIVATE_0259_JOURNAL_PROPERTY_PREFIX}}',operationId:'{{CONFIGURE_PRIVATE_0259_OPERATION_ID}}',planSha256:'{{CONFIGURE_PRIVATE_0259_PLAN_SHA256}}',originalRootSha256:'{{CONFIGURE_PRIVATE_0259_ROOT_SHA256}}',originalControlSha256:'{{CONFIGURE_PRIVATE_0259_CONTROL_SHA256}}',configSha256:'{{CONFIGURE_PRIVATE_0259_CONFIG_SHA256}}',helperSourceSha256:'{{CONFIGURE_PRIVATE_0259_HELPER_SHA256}}',originalSourceExpiresAtUtc:'{{CONFIGURE_PRIVATE_0259_SOURCE_EXPIRY_UTC}}',releaseId:'{{CONFIGURE_PRIVATE_0259_RELEASE_ID}}',reviewedJsonSha256:'{{CONFIGURE_PRIVATE_0259_ACK_JSON_SHA256}}',promotedRootSha256:'{{CONFIGURE_PRIVATE_0259_PROMOTED_ROOT_SHA256}}',promotedControlSha256:'{{CONFIGURE_PRIVATE_0259_PROMOTED_CONTROL_SHA256}}',dispositionId:'{{CONFIGURE_PRIVATE_0259_DISPOSITION_ID}}'};
}
function fernainNativePublic0259CaseConfiguredV1(c){
 if(!c||typeof c!=='object'||typeof c.journalPropertyPrefix!=='string'||!/^[A-Z0-9_]{8,120}:$/.test(c.journalPropertyPrefix)||/CONFIGURE|EXAMPLE|SAMPLE/.test(c.journalPropertyPrefix))return false;
 var hashes=['planSha256','originalRootSha256','originalControlSha256','configSha256','helperSourceSha256','reviewedJsonSha256','promotedRootSha256','promotedControlSha256'];
 if(!hashes.every(function(k){return typeof c[k]==='string'&&/^[a-f0-9]{64}$/.test(c[k])&&!/^([a-f0-9])\1{63}$/.test(c[k]);}))return false;
 return typeof c.operationId==='string'&&!/CONFIGURE|EXAMPLE|SAMPLE|PLACEHOLDER/i.test(c.operationId)&&/^FERNAIN-ARCHIVE-MUTATION-[A-Za-z0-9_-]{16,100}$/.test(c.operationId)&&
  typeof c.originalSourceExpiresAtUtc==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(c.originalSourceExpiresAtUtc)&&Number.isFinite(Date.parse(c.originalSourceExpiresAtUtc))&&
  typeof c.releaseId==='string'&&!/CONFIGURE|EXAMPLE|SAMPLE|PLACEHOLDER/i.test(c.releaseId)&&/^[A-Za-z0-9_-]{1,100}$/.test(c.releaseId)&&typeof c.dispositionId==='string'&&!/CONFIGURE|EXAMPLE|SAMPLE|PLACEHOLDER/i.test(c.dispositionId)&&/^[A-Za-z0-9_-]{1,80}$/.test(c.dispositionId);
}
function fernainNativeServices(actionBudget) {
  'use strict';
  var servicesEntryMs=Date.now(),outerDeadline=null,meterFinalizationActive=false;
  if(actionBudget!==undefined){hold(actionBudget&&Object.getPrototypeOf(actionBudget)===Object.prototype&&Object.keys(actionBudget).sort().join('|')==='cleanupReserveMs|entryAtMs|operation|totalMs'&&actionBudget.operation==='CAPTURE_PUBLIC_SOURCE'&&Number.isSafeInteger(actionBudget.entryAtMs)&&actionBudget.entryAtMs<=servicesEntryMs&&servicesEntryMs-actionBudget.entryAtMs<110000&&actionBudget.totalMs===110000&&actionBudget.cleanupReserveMs===5000,'private Capture entry budget invalid');outerDeadline=actionBudget.entryAtMs+110000;}
  var workbook = '{{CONFIGURE_GOOGLE_ID_030}}';
  var sheets = {
    Prospects: { id: 901, width: 27, last: 'AA' },
    Evidence: { id: 903, width: 26, last: 'Z' }
  };
  var accountAddress = 'operator@example.com';
  var fromAddress = 'Backoffice Backoffice Owner <operator@example.com>';
  var labelId = 'Label_5';
  var scriptLock = LockService.getScriptLock();
  var rawProperties = PropertiesService.getScriptProperties(), authorityFrame=Object.create(null),authorityFrameEpoch=0, mergedArchiveReceipt=null,sourceMetadataTailReceipt=null, preflightTransportEpoch=0, preflightPropertyReadEpoch=0, dispositionGateCache=null, terminalBankDigest=null, closedTerminalScope=null, closedTerminalMembers=new WeakSet(), terminalEventTickets=new WeakMap(), terminalDerivedOrigins=new WeakMap(), closedTerminalBoundaryEpoch=0, lastGuardedSourceEvent=null, terminalCompletionPlans=null;
  function discardAuthorityFrame(){sourceMetadataTailReceipt=null;authorityFrame=Object.create(null);authorityFrameEpoch++;if(sourceMetadataProofActive){sourceMetadataProofEvent=null;completionProof=null;}if(retentionReadActive){retentionReadEvent=null;completionProof=null;}}
  function discardActualBoundary(){closeTerminalScope();terminalBankDigest=null;preflightTransportEpoch++;discardAuthorityFrame();terminalOrphanEvent=null;terminalOrphanAck=null;terminalProofReceipt=null;mergedArchiveReceipt=null;nativeSendBudgetError=null;}
  function nativeBoundary(fn){discardActualBoundary();try{return fn();}finally{discardActualBoundary();}}
  var properties={getProperty:function(k){var allowed=k==='FERNAIN_NATIVE_ARCHIVE_ROOT_V2'||k==='FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'||k==='FERNAIN_NATIVE_RUNTIME_CONFIG_V1'||k==='FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1';if(!allowed||!lockHeld||!budgetExplicitlyStarted){closeTerminalScope();terminalBankDigest=null;preflightPropertyReadEpoch++;return rawProperties.getProperty(k);}hold(nativeLockHeld(),'synchronous authority frame held lock changed');var signature=lockEpoch+'|'+budgetStarted+'|'+canonicalMutationEpoch+'|'+authorityFrameEpoch,prior=authorityFrame[k];if(prior&&prior.signature===signature)return prior.raw;terminalBankDigest=null;preflightPropertyReadEpoch++;var raw;try{raw=rawProperties.getProperty(k);closedTerminalProperty(k,raw);}catch(error){closeTerminalScope();throw error;}authorityFrame[k]={signature:signature,raw:raw};return raw;},getProperties:function(){closeTerminalScope();terminalBankDigest=null;preflightPropertyReadEpoch++;return rawProperties.getProperties();},setProperty:function(k,v){dispositionGateCache=null;discardActualBoundary();try{return rawProperties.setProperty(k,v);}finally{discardActualBoundary();}},deleteProperty:function(k){dispositionGateCache=null;discardActualBoundary();try{return rawProperties.deleteProperty(k);}finally{discardActualBoundary();}}};
  var lockHeld = false, lockEpoch = 0, readBundleEpoch = null;
  var projectId = ScriptApp.getScriptId();
  var budgetStarted = Date.now(), budgetLimit = 110000, budgetDeadline = budgetStarted + budgetLimit;
  var budgetExplicitlyStarted = false;
  var lastSnapshotCapacity = null;
  var canonicalUnionActive=false,canonicalUnionCapture=null,canonicalUnionReceipt=null,canonicalAllocationRows=null;
  // Exact small UTF-8 strings only, within this fresh Services action. Native
  // SHA-256 remains the authority for every miss; changed bytes always miss.
  var shaCache = new Map(), shaCacheBytes = 0;
  var lockStats = { nativeLockChecks: 0, nativeLockMs: 0 };
  var shaStats = { shaCalls: 0, cacheHits: 0, nativeHashCalls: 0, nativeHashMs: 0,
    uncachedLargeCalls: 0, capacitySkippedCalls: 0 };
  var shaCacheMaxKeyBytes = 8192, shaCacheMaxEntries = 2048, shaCacheMaxBytes = 2097152;

  function hold(condition, reason) {
    if (!condition) {
      var error = new Error('HOLD: ' + reason);
      error.code = 'CURRENT_SALES_VALIDATION_HOLD';
      throw error;
    }
  }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function integer(value, min, max) {
    return Number.isSafeInteger(value) && value >= min && (max === undefined || value <= max);
  }
  function safeData(value, name) {
    var count = 0;
    function inspect(item, depth) {
      count++;
      hold(depth <= 100 && count <= 2000000, name + ' native data exceeds structural budget');
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
      if (typeof item === 'number') { hold(Number.isFinite(item), name + ' native number is non-finite'); return; }
      hold(item !== undefined && typeof item === 'object', name + ' native data contains unsupported values');
      hold(Object.getOwnPropertySymbols(item).length === 0, name + ' native data contains symbol fields');
      if (Array.isArray(item)) {
        for (var index = 0; index < item.length; index++) hold(own(item, index), name + ' native array is sparse');
      }
      Object.getOwnPropertyNames(item).forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(item, key);
        hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
        if (Array.isArray(item) && key === 'length') return;
        inspect(descriptor.value, depth + 1);
      });
    }
    inspect(value, 0);
    return value;
  }
  function copy(value) {
    safeData(value, 'copy');
    function clone(item) {
      if (item === null || typeof item !== 'object') return item;
      if (Array.isArray(item)) return item.map(clone);
      var result = {};
      Object.keys(item).forEach(function (key) {
        Object.defineProperty(result, key, { value: clone(Object.getOwnPropertyDescriptor(item, key).value),
          enumerable: true, writable: true, configurable: true });
      });
      return result;
    }
    return clone(value);
  }
  function required(object, keys, name) {
    hold(record(object) && keys.every(function (key) { return own(object, key); }), name + ' own native fields missing');
  }
  function optional(object, key, name) {
    hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
    return own(object, key) ? object[key] : undefined;
  }
  function stamp() { return new Date(Date.now()).toISOString(); }
  function startBudget(limitMs) {
    discardMetadataPlan();discardActualBoundary();hold(!ownedSheetsMeter,'new action cannot adopt an existing meter ownership');
    terminalProofReceipt=null; lastSnapshotCapacity = null; semanticCapacity=null; archiveReadset=null; archiveMetadataCache=undefined; archiveCellCapacity=null; archiveCanonicalMeta=null; actionReadBytes={raw:0,projected:0,ranges:0,fixedGetAttempts:0,retryWaitMs:0};
    if (limitMs === undefined) limitMs = 110000;
    hold(integer(limitMs, 1, 110000) && !budgetExplicitlyStarted, 'one bounded run budget required');
    budgetStarted = Date.now(); dispositionGateCache=null; budgetDeadline = outerDeadline===null?budgetStarted+limitMs:Math.min(budgetStarted+limitMs,outerDeadline-5000);budgetLimit=budgetDeadline-budgetStarted;hold(budgetLimit>0,'Capture body reserve exhausted before start');
    shaCache = new Map(); shaCacheBytes = 0;
    sheetsReadStats = { attempts: 0, sdkAttempts: 0, httpsAttempts: 0, waitMs: 0, internalMeterWriteAttempts: 0 };
    lockStats = { nativeLockChecks: 0, nativeLockMs: 0 };
    shaStats = { shaCalls: 0, cacheHits: 0, nativeHashCalls: 0, nativeHashMs: 0,
      uncachedLargeCalls: 0, capacitySkippedCalls: 0 };
    budgetExplicitlyStarted = true;
    return { startedAt: budgetStarted, deadline: budgetDeadline, limitMs: budgetLimit };
  }
  // Transport reservation is the sole bookkeeping write permitted during an
  // immutable read bundle. It carries no canonical/source/recipient authority.
  // All pipeline Sheets GET entry points use this persistent same-project pace;
  // failed SDK/HTTP attempts and numeric429 retries consume their reservation.
  var sheetsReadKey = 'FERNAIN_NATIVE_SHEETS_GET_PACE_V1';
  var sheetsReadIntervalMs = 1251; // <=48 starts in any rolling60s; 20% headroom.
  var sheetsReadStats = { attempts: 0, sdkAttempts: 0, httpsAttempts: 0, waitMs: 0, internalMeterWriteAttempts: 0 };
  var ownedSheetsMeter=null;
  function meterHold(condition,reason){if(!condition&&ownedSheetsMeter)ownedSheetsMeter.poison=true;hold(condition,reason);}
  function ownedMeterCurrent(){return ownedSheetsMeter&&lockHeld&&nativeLockHeld()&&ownedSheetsMeter.lockEpoch===lockEpoch&&ownedSheetsMeter.actionEpoch===budgetStarted&&!ownedSheetsMeter.poison;}
  function reserveSheetsGet(transport){
    discardActualBoundary();meterHold(transport==='SDK'||transport==='HTTPS','fixed Sheets GET transport required');meterHold(lockHeld&&nativeLockHeld(),'Sheets GET reservation held lock required');checkBudget(1000);var epoch=lockEpoch,prior=null,initial=ownedSheetsMeter===null,before;
    if(initial){before=properties.getProperty(sheetsReadKey);if(before!==null){try{prior=JSON.parse(before);}catch(_){meterHold(false,'Sheets GET reservation timestamp corrupt; KEEP');}meterHold(record(prior)&&Object.keys(prior).sort().join('|')==='atMs|schema|state'&&prior.schema==='BackofficeNativeSheetsGetPace/v1'&&prior.state==='COMPLETE'&&integer(prior.atMs,1000000000000,9999999999999),'Sheets GET reservation unsettled/corrupt; KEEP');meterHold(prior.atMs<=Date.now(),'Sheets GET reservation future timestamp; KEEP');}}
    else {meterHold(ownedMeterCurrent()&&!ownedSheetsMeter.inFlight&&ownedSheetsMeter.dispatches>0,'owned Sheets GET reservation unsettled/poisoned; KEEP');before=ownedSheetsMeter.raw;prior={atMs:ownedSheetsMeter.lastCompletionMs};}
    var waitMs=prior===null?0:Math.max(0,prior.atMs+sheetsReadIntervalMs-Date.now());meterHold(waitMs<=sheetsReadIntervalMs,'Sheets GET reservation clock changed; KEEP');if(waitMs){meterHold(checkBudget(1000)>waitMs+1000,'Sheets GET reservation exceeds action deadline');meterHold(typeof Utilities.sleep==='function','bounded Sheets GET pacing unavailable');nativeBoundary(function(){return nativeBoundary(function(){return Utilities.sleep(waitMs);});});sheetsReadStats.waitMs+=waitMs;}
    checkBudget(1000);meterHold(lockHeld&&nativeLockHeld()&&lockEpoch===epoch,'Sheets GET reservation held lock changed');meterHold(properties.getProperty(sheetsReadKey)===before,'Sheets GET reservation fresh PRE preimage changed; KEEP');var at=Date.now();meterHold(prior===null||at>=prior.atMs+sheetsReadIntervalMs,'Sheets GET reservation clock/sleep changed; KEEP');meterHold(integer(at,1000000000000,9999999999999),'Sheets GET reservation timestamp invalid');
    if(initial){var reserved=JSON.stringify({schema:'BackofficeNativeSheetsGetPace/v1',state:'RESERVED',atMs:at});ownedSheetsMeter={raw:reserved,lockEpoch:epoch,actionEpoch:budgetStarted,lastCompletionMs:null,dispatches:0,inFlight:false,poison:true};sheetsReadStats.meterFinalizationPending=true;sheetsReadStats.internalMeterWriteAttempts++;properties.setProperty(sheetsReadKey,reserved);meterHold(lockHeld&&nativeLockHeld()&&lockEpoch===epoch&&properties.getProperty(sheetsReadKey)===reserved,'Sheets GET initial reservation acknowledgment uncertain; KEEP');ownedSheetsMeter.poison=false;sheetsReadStats.meterSamplingStage='BEFORE_LOCK_FINALIZER';}
    meterHold(ownedMeterCurrent(),'owned Sheets GET reservation authority changed');ownedSheetsMeter.inFlight=true;return {raw:ownedSheetsMeter.raw,epoch:epoch,actionEpoch:budgetStarted,waitMs:waitMs,startedAtMs:at,dispatched:false};
  }
  function completeSheetsGet(reservation,error){
    var at=Date.now(),message=error&&typeof error==='object'&&Object.getOwnPropertyDescriptor(error,'message');message=message&&own(message,'value')&&typeof message.value==='string'?message.value:'';
    try{hold(reservation.dispatched===true&&ownedMeterCurrent()&&ownedSheetsMeter.inFlight&&reservation.raw===ownedSheetsMeter.raw&&reservation.epoch===lockEpoch&&reservation.actionEpoch===budgetStarted,'owned Sheets GET completion ownership changed; KEEP');hold(properties.getProperty(sheetsReadKey)===reservation.raw,'owned Sheets GET POST reservation changed; KEEP');hold(at>=reservation.startedAtMs&&at<=(outerDeadline===null?budgetDeadline:outerDeadline)&&!/timeout|timed out/i.test(message),'Sheets GET completion unsettled/timeout/clock changed; KEEP');ownedSheetsMeter.dispatches++;ownedSheetsMeter.lastCompletionMs=at;ownedSheetsMeter.inFlight=false;}
    catch(e){if(ownedSheetsMeter){ownedSheetsMeter.poison=true;ownedSheetsMeter.inFlight=false;}throw e;}
  }
  function finalizeSheetsMeter(){
    if(!ownedSheetsMeter)return;var observationStage='ENTRY_BUDGET';meterFinalizationActive=true;try{checkMeterBudget('FINALIZER_ENTRY');var m=ownedSheetsMeter;observationStage='OWNED_COMPLETION';hold(ownedMeterCurrent()&&!m.inFlight&&m.dispatches>0&&integer(m.lastCompletionMs,1000000000000,9999999999999)&&Date.now()>=m.lastCompletionMs,'owned Sheets GET finalization unsettled; KEEP');observationStage='FINAL_CAS_PREIMAGE';hold(properties.getProperty(sheetsReadKey)===m.raw,'owned Sheets GET final CAS preimage changed; KEEP');var completed=JSON.stringify({schema:'BackofficeNativeSheetsGetPace/v1',state:'COMPLETE',atMs:m.lastCompletionMs});observationStage='PRE_COMPLETE_BUDGET';checkMeterBudget('FINALIZER_PRE_COMPLETE');sheetsReadStats.internalMeterWriteAttempts++;observationStage='COMPLETE_WRITE';properties.setProperty(sheetsReadKey,completed);observationStage='POST_COMPLETE_BUDGET';checkMeterBudget('FINALIZER_POST_COMPLETE');observationStage='COMPLETE_ACK';hold(lockHeld&&nativeLockHeld()&&m.lockEpoch===lockEpoch&&m.actionEpoch===budgetStarted&&properties.getProperty(sheetsReadKey)===completed,'Sheets GET final completion acknowledgment uncertain; KEEP');sheetsReadStats.meterFinalizationPending=false;sheetsReadStats.meterFinalized=true;sheetsReadStats.meterSamplingStage='AFTER_LOCK_FINALIZER';ownedSheetsMeter=null;}catch(error){var finalizerObservation=proofObservation('SHEETS_METER_FINALIZATION',[]);finalizerObservation.stage=observationStage;proofEmit(finalizerObservation,'THREW');throw error;}finally{meterFinalizationActive=false;}
  }
  function logSheetsDispatch(transport,at,reservation) {
    try { Logger.log('FERNAIN_SHEETS_GET_PACE_V1:' + JSON.stringify({schema:'BackofficeNativeSheetsGetPace/v1',
      attempt:sheetsReadStats.attempts,transport:transport,atMs:at,waitMs:reservation.waitMs,totalWaitMs:sheetsReadStats.waitMs,
      intervalMs:sheetsReadIntervalMs,rolling60Maximum:48,elapsedMs:at-budgetStarted})); } catch (_) {}
  }
  function sheetsFetch(url, options) {
    hold(typeof url === 'string' && url.indexOf('https://sheets.googleapis.com/v4/spreadsheets/' + workbook + '?') === 0 && options && options.method === 'get', 'fixed canonical Sheets GET endpoint required');
    var reservation = reserveSheetsGet('HTTPS'),at,error;
    try { options.timeoutSeconds=Math.min(110,Math.floor(checkBudget(1000)/1000));sheetsReadStats.attempts++;sheetsReadStats.httpsAttempts++;actionReadBytes.fixedGetAttempts++;at=Date.now();reservation.dispatched=true;return nativeBoundary(function(){return UrlFetchApp.fetch(url, options);}); }
    catch(e){error=e;throw e;}
    finally { try { completeSheetsGet(reservation,error); } finally { if(at!==undefined)logSheetsDispatch('HTTPS',at,reservation); } }
  }
  function sheetsGet(id, options) {
    hold(id === workbook, 'fixed canonical Sheets GET workbook required');
    var reservation = reserveSheetsGet('SDK'),at,error;
    try { checkBudget(1000);sheetsReadStats.attempts++;sheetsReadStats.sdkAttempts++;at=Date.now();reservation.dispatched=true;return nativeBoundary(function(){return Sheets.Spreadsheets.get(id, options);}); }
    catch(e){error=e;throw e;}
    finally { try { completeSheetsGet(reservation,error); } finally { if(at!==undefined)logSheetsDispatch('SDK',at,reservation); } }
  }
  function checkBudget(minRemainingMs,observationBoundary){hold(!meterFinalizationActive,'meter-only finalization forbids business calls');return checkBudgetAt(budgetDeadline,minRemainingMs,observationBoundary);}
  function checkMeterBudget(boundary){return checkBudgetAt(outerDeadline===null?budgetDeadline:outerDeadline,0,boundary);}
  function checkBudgetAt(deadline,minRemainingMs,observationBoundary) {
    if (minRemainingMs === undefined) minRemainingMs = 0;
    var bounded=integer(minRemainingMs, 0, 110000),boundary=['FINALIZER_ENTRY','FINALIZER_PRE_COMPLETE','FINALIZER_POST_COMPLETE'].indexOf(observationBoundary)>=0?observationBoundary:'CHECK_BUDGET';
    if(!bounded){var invalid=proofObservation(boundary,['boundedMinimum','remainingExceedsMinimum']);proofCheck(invalid,'boundedMinimum',bounded);proofEmit(invalid,'PREDICATE_FALSE');}
    hold(bounded, 'bounded remaining-time requirement needed');
    var remaining = deadline - Date.now(),enough=remaining > minRemainingMs;
    if(!enough){var expired=proofObservation(boundary,['boundedMinimum','remainingExceedsMinimum']);proofCheck(expired,'boundedMinimum',bounded);proofCheck(expired,'remainingExceedsMinimum',enough);proofNumber(expired,'actualRemainingMs',remaining);proofNumber(expired,'actualMinimumMs',minRemainingMs);proofEmit(expired,'PREDICATE_FALSE');}
    hold(enough, 'native run budget exhausted or insufficient remaining time');
    return remaining;
  }
  function utf8(text) {
    hold(typeof text === 'string', 'UTF-8 text required');
    // Blob conversion may replace an unpaired surrogate. Reject it before a
    // send so the native receipt can preserve the exact approved Unicode text.
    try { encodeURIComponent(text); } catch (_) { hold(false, 'well-formed Unicode text required'); }
    return Utilities.newBlob(text, 'text/plain').getBytes();
  }
  function utf8Length(text) {
    hold(typeof text === 'string', 'UTF-8 text required');
    var bytes = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code < 128) bytes++;
      else if (code < 2048) bytes += 2;
      else if (code >= 55296 && code <= 56319) {
        hold(i + 1 < text.length, 'well-formed Unicode text required');
        var next = text.charCodeAt(i + 1);
        hold(next >= 56320 && next <= 57343, 'well-formed Unicode text required');
        bytes += 4; i++;
      } else {
        hold(code < 56320 || code > 57343, 'well-formed Unicode text required');
        bytes += 3;
      }
    }
    return bytes;
  }
  function sha(text) {
    hold(typeof text === 'string', 'UTF-8 text required');
    try { encodeURIComponent(text); } catch (_) { hold(false, 'well-formed Unicode text required'); }
    shaStats.shaCalls++;
    // String equality is exact. Do not key by digest, object identity, row, or
    // admission status, and do not cache large source/snapshot hash inputs.
    if (budgetExplicitlyStarted && text.length <= shaCacheMaxKeyBytes && shaCache.has(text)) { shaStats.cacheHits++; return shaCache.get(text); }
    var keyBytes = 0, cacheable = budgetExplicitlyStarted && text.length <= shaCacheMaxKeyBytes;
    if (cacheable) {
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c < 128) keyBytes++;
        else if (c < 2048) keyBytes += 2;
        else if (c >= 55296 && c <= 56319) { i++; keyBytes += 4; }
        else keyBytes += 3;
        if (keyBytes > shaCacheMaxKeyBytes) { cacheable = false; break; }
      }
    }
    if (!cacheable && budgetExplicitlyStarted) shaStats.uncachedLargeCalls++;
    var started = Date.now(), bytes;
    shaStats.nativeHashCalls++;
    try { bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8); }
    finally { shaStats.nativeHashMs += Date.now() - started; }
    var digest = bytes.map(function (byte) { return ((byte + 256) % 256).toString(16).padStart(2, '0'); }).join('');
    if (cacheable) {
      if (shaCache.size < shaCacheMaxEntries && shaCacheBytes + keyBytes <= shaCacheMaxBytes) {
        shaCache.set(text, digest); shaCacheBytes += keyBytes;
      } else shaStats.capacitySkippedCalls++;
    }
    return digest;
  }
  function nativeLockHeld() {
    var started = Date.now(); lockStats.nativeLockChecks++;
    try { var held = scriptLock.hasLock(); if (held !== true) {terminalBankDigest = null;var owned=!!closedTerminalScope;closeTerminalScope();if(owned)hold(false,'closed terminal held lock changed');} return held; }
    catch (error) { closeTerminalScope();terminalBankDigest = null; throw error; }
    finally { lockStats.nativeLockMs += Date.now() - started; }
  }
  function shaMetrics() {
    return { schema: 'BackofficeNativeActionShaMetrics/v1', shaCalls: shaStats.shaCalls,
      cacheHits: shaStats.cacheHits, nativeHashCalls: shaStats.nativeHashCalls,
      nativeHashMs: shaStats.nativeHashMs, uncachedLargeCalls: shaStats.uncachedLargeCalls,
      capacitySkippedCalls: shaStats.capacitySkippedCalls, cacheEntries: shaCache.size,
      cacheKeyBytes: shaCacheBytes, maxKeyBytes: shaCacheMaxKeyBytes,
      maxEntries: shaCacheMaxEntries, maxTotalKeyBytes: shaCacheMaxBytes,
      nativeLockChecks: lockStats.nativeLockChecks, nativeLockMs: lockStats.nativeLockMs,
      scope: 'FRESH_SERVICES_ACTION_EXACT_UTF8_STRING', persistent: false };
  }
  function base64(text) { return Utilities.base64Encode(utf8(text)); }
  function isThenable(value) {
    if (value === null || typeof value !== 'object' && typeof value !== 'function') return false;
    var current = value, depth = 0;
    while (current) {
      var descriptor = Object.getOwnPropertyDescriptor(current, 'then');
      if (descriptor) {
        hold(own(descriptor, 'value'), 'native thenable accessor prohibited');
        return typeof descriptor.value === 'function';
      }
      current = Object.getPrototypeOf(current); depth++;
      hold(depth <= 100, 'native prototype depth exceeds budget');
    }
    return false;
  }
  function nativeObject(value, name) {
    checkBudget();
    safeData(value, name);
    checkBudget();
    hold(record(value) && !isThenable(value), name + ' synchronous native result missing');
    hold(!optional(value, 'error', name) && !optional(value, 'isError', name), name + ' native error');
    return value;
  }
  function validId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(id); }

  // Typed rows use only the native ExtendedValue union; {} means blank. Never
  // replace formulas with their calculated/display value or coerce numbers.
  function typed(value) {
    hold(record(value), 'native typed cell union required');
    var keys = Object.keys(value);
    if (keys.length === 0) return {};
    hold(keys.length === 1, 'native typed cell union has multiple fields');
    var key = keys[0], item = value[key];
    hold((key === 'stringValue' || key === 'formulaValue') && typeof item === 'string' ||
      key === 'numberValue' && typeof item === 'number' && Number.isFinite(item) ||
      key === 'boolValue' && typeof item === 'boolean', 'unsupported native typed cell union');
    var result = {}; result[key] = item; return result;
  }
  function wholeRow(row, width) {
    hold(Array.isArray(row) && row.length === width, 'complete typed row preimage required');
    var normalized = [];
    for (var index = 0; index < width; index++) {
      hold(own(row, index), 'sparse typed row preimage prohibited');
      normalized.push(typed(row[index]));
    }
    return normalized;
  }
  function sameRows(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  function sheetInfo(name, width) {
    hold(own(sheets, name) && (width === undefined || sheets[name].width === width),
      'canonical physical sheet/width required');
    return sheets[name];
  }
  // Fixed SDK DTO semantic projection, not a raw HTTP/body representation.
  // Unknown SDK data fields are omitted; own accessors, symbols, error signals,
  // required-field omissions and ambiguous arrays still fail closed.
  function metadataDto(value) {
    var name = 'Sheets metadata', count = 0;
    function inspect(object) {
      var keys = Object.getOwnPropertyNames(object);
      count += keys.length + 1;
      hold(count <= 2000000, name + ' native data exceeds structural budget');
      hold(Object.getOwnPropertySymbols(object).length === 0, name + ' native data contains symbol fields');
      keys.forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(object, key);
        hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
      });
      ['error', 'isError'].forEach(function (key) {
        hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
        if (own(object, key)) {
          var signal = Object.getOwnPropertyDescriptor(object, key).value;
          safeData(signal, name);
          hold(!signal, name + ' native error');
        }
      });
      return keys;
    }
    function fields(object, keys, label) {
      required(object, keys, label);
      inspect(object);
    }
    function scalar(object, key) {
      return safeData(Object.getOwnPropertyDescriptor(object, key).value, name);
    }
    hold(record(value) && !isThenable(value), name + ' synchronous native result missing');
    fields(value, ['spreadsheetId', 'sheets'], 'canonical workbook');
    var entries = Object.getOwnPropertyDescriptor(value, 'sheets').value;
    hold(Array.isArray(entries), 'canonical workbook identity missing');
    var keys = inspect(entries), length = Object.getOwnPropertyDescriptor(entries, 'length').value;
    hold(integer(length, 0, 2000000), name + ' native data exceeds structural budget');
    hold(keys.length === length + 1, name + ' native array is sparse');
    var result = { spreadsheetId: scalar(value, 'spreadsheetId'), sheets: [] };
    for (var index = 0; index < length; index++) {
      hold(own(entries, index), name + ' native array is sparse');
      var entry = Object.getOwnPropertyDescriptor(entries, index).value;
      fields(entry, ['properties'], 'native metadata sheet');
      var p = Object.getOwnPropertyDescriptor(entry, 'properties').value;
      fields(p, ['sheetId', 'title', 'gridProperties'], 'native metadata properties');
      var g = Object.getOwnPropertyDescriptor(p, 'gridProperties').value;
      var title = scalar(p, 'title'), label = typeof title === 'string' && own(sheets, title) ? title : 'native metadata';
      fields(g, ['rowCount', 'columnCount'], label + ' grid');
      result.sheets.push({ properties: { sheetId: scalar(p, 'sheetId'), title: title,
        gridProperties: { rowCount: scalar(g, 'rowCount'), columnCount: scalar(g, 'columnCount') } } });
    }
    ['error', 'isError'].forEach(function (key) {
      if (own(value, key)) result[key] = Object.getOwnPropertyDescriptor(value, key).value;
    });
    return result;
  }
  var metadataPlan=null,structurePlanEpoch=0;
  function discardMetadataPlan(){metadataPlan=null;archiveWorkbookMetadata=null;archiveCanonicalMeta=null;archiveMetadataCache=undefined;archiveCellCapacity=null;}
  function metadataProjection(result) {

    required(result, ['spreadsheetId', 'sheets'], 'canonical workbook');
    hold(result.spreadsheetId === workbook && Array.isArray(result.sheets), 'canonical workbook identity missing');
    result.sheets.forEach(function (entry) {
      required(entry, ['properties'], 'native metadata sheet');
      required(entry.properties, ['sheetId', 'title'], 'native metadata properties');
    });
    var found = {};
    Object.keys(sheets).forEach(function (name) {
      var matches = result.sheets.filter(function (entry) {
        return record(entry) && record(entry.properties) && entry.properties.title === name;
      });
      hold(matches.length === 1, name + ' physical sheet identity ambiguous');
      required(matches[0], ['properties'], name + ' sheet');
      var p = matches[0].properties;
      required(p, ['sheetId', 'title', 'gridProperties'], name + ' properties');
      var g = p.gridProperties, expected = sheets[name];
      required(g, ['rowCount', 'columnCount'], name + ' grid');
      hold(p.sheetId === expected.id && record(g) && integer(g.rowCount, 5) &&
        integer(g.columnCount, expected.width), name + ' physical bounds/gid mismatch');
      found[name] = { sheetId: p.sheetId, rowCount: g.rowCount, columnCount: g.columnCount, width: expected.width };
    });
    return found;
  }
  function rememberMetadataPlan(result){var found=metadataProjection(result);archiveWorkbookMetadata=result;if(lockHeld&&budgetExplicitlyStarted)metadataPlan={lockEpoch:lockEpoch,actionStarted:budgetStarted,structureEpoch:structurePlanEpoch,canonical:copy(found),workbook:copy(result)};return found;}
  function metadata(){checkBudget(1000);if(metadataPlan&&lockHeld&&nativeLockHeld()&&metadataPlan.lockEpoch===lockEpoch&&metadataPlan.actionStarted===budgetStarted&&metadataPlan.structureEpoch===structurePlanEpoch){archiveWorkbookMetadata=copy(metadataPlan.workbook);return copy(metadataPlan.canonical);}var result=nativeObject(metadataDto(sheetsGet(workbook,{fields:'spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))'})),'Sheets metadata');return rememberMetadataPlan(result);}

  // Fixed SDK typed-GET semantic DTO; never a raw HTTP/body representation.
  // Every own ExtendedValue key is retained for the unchanged union validator.
  function typedGetDto(value, includeGridProperties, structuralBudget) {
    var name = 'Sheets typed chunk', count = structuralBudget === undefined ? 0 : structuralBudget.count;
    hold(structuralBudget === undefined || record(structuralBudget) && integer(count, 0, 2000000), name + ' native data exceeds structural budget');
    function checked(item, node, key) {
      try { return safeData(item, name); } catch (error) {
        var code = error && typeof error === 'object' && Object.getOwnPropertyDescriptor(error, 'code');
        if (code && own(code, 'value') && code.value === 'CURRENT_SALES_VALIDATION_HOLD') {
          var kind = item === null ? 'NULL' : Array.isArray(item) ? 'ARRAY' :
            { undefined: 'UNDEFINED', function: 'FUNCTION', symbol: 'SYMBOL', object: 'OBJECT',
              string: 'STRING', number: 'NUMBER', boolean: 'BOOLEAN' }[typeof item] || 'UNKNOWN';
          Object.defineProperty(error, 'nativeTypedDtoDiagnostic', { value: {
            node: ['WORKBOOK', 'PROPERTIES', 'GRID', 'ROW', 'CELL', 'UNION', 'ARRAY', 'UNKNOWN'].indexOf(node) >= 0 ? node : 'UNKNOWN',
            field: ['spreadsheetId', 'sheets', 'properties', 'sheetId', 'title', 'data', 'startRow', 'startColumn',
              'rowData', 'values', 'userEnteredValue', 'formattedValue', 'stringValue', 'numberValue', 'boolValue',
              'formulaValue', 'errorValue', 'OTHER'].indexOf(key) >= 0 ? key : 'OTHER', type: kind
          } });
        }
        throw error;
      }
    }
    function inspect(object, node) {
      var keys = Object.getOwnPropertyNames(object);
      count += keys.length + 1;
      if (structuralBudget !== undefined) structuralBudget.count = count;
      hold(count <= 2000000, name + ' native data exceeds structural budget');
      hold(Object.getOwnPropertySymbols(object).length === 0, name + ' native data contains symbol fields');
      keys.forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(object, key);
        hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
      });
      ['error', 'isError'].forEach(function (key) {
        hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
        if (own(object, key)) {
          var signal = Object.getOwnPropertyDescriptor(object, key).value;
          checked(signal, node, key);
          hold(!signal, name + ' native error');
        }
      });
      return keys;
    }
    function fields(object, keys, label, node) {
      required(object, keys, label);
      inspect(object, node);
    }
    function data(object, key) { return Object.getOwnPropertyDescriptor(object, key).value; }
    function scalar(object, key, node) { return checked(data(object, key), node, key); }
    function present(object, key) {
      hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
      return own(object, key);
    }
    function array(items, reason, project) {
      hold(Array.isArray(items), reason);
      var keys = inspect(items, 'ARRAY'), length = data(items, 'length'), result = [];
      hold(integer(length, 0, 2000000), name + ' native data exceeds structural budget');
      hold(keys.length === length + 1, name + ' native array is sparse');
      for (var index = 0; index < length; index++) {
        hold(own(items, index), name + ' native array is sparse');
        result.push(project(data(items, index)));
      }
      return result;
    }
    function union(item) {
      hold(record(item), 'native typed cell union required');
      var keys = inspect(item, 'UNION'), result = {};
      ['stringValue', 'numberValue', 'boolValue', 'formulaValue', 'errorValue'].forEach(function (key) { present(item, key); });
      keys.forEach(function (key) {
        if (['stringValue', 'numberValue', 'boolValue', 'formulaValue', 'errorValue'].indexOf(key) < 0 &&
          key !== 'error' && key !== 'isError' && typeof data(item, key) === 'function') return;
        Object.defineProperty(result, key, { value: scalar(item, key, 'UNION'), enumerable: true,
          writable: true, configurable: true });
      });
      return result;
    }
    function cell(item) {
      hold(record(item), 'native CellData invalid'); inspect(item, 'CELL');
      var result = {};
      if (present(item, 'userEnteredValue')) result.userEnteredValue = union(data(item, 'userEnteredValue'));
      if (present(item, 'formattedValue')) result.formattedValue = scalar(item, 'formattedValue', 'CELL');
      return result;
    }
    function row(item) {
      hold(record(item), 'native RowData invalid'); inspect(item, 'ROW');
      var result = {};
      if (present(item, 'values')) result.values = array(data(item, 'values'), 'native typed chunk width invalid', cell);
      return result;
    }
    function grid(item) {
      hold(record(item), 'native typed chunk coordinates mismatch'); inspect(item, 'GRID');
      var result = {};
      ['startRow', 'startColumn'].forEach(function (key) { if (present(item, key)) result[key] = scalar(item, key, 'GRID'); });
      if (present(item, 'rowData')) result.rowData = array(data(item, 'rowData'), 'native typed chunk rows incomplete/invalid', row);
      return result;
    }
    hold(record(value) && !isThenable(value), name + ' synchronous native result missing');
    fields(value, ['spreadsheetId', 'sheets'], 'native typed chunk', 'WORKBOOK');
    var result = { spreadsheetId: scalar(value, 'spreadsheetId', 'WORKBOOK'), sheets: array(data(value, 'sheets'),
      'native typed chunk workbook/coverage mismatch', function (item) {
        fields(item, ['properties', 'data'], 'native typed sheet', 'UNKNOWN');
        var p = data(item, 'properties');
        fields(p, ['sheetId', 'title'], 'native typed sheet properties', 'PROPERTIES');
        var properties = { sheetId: scalar(p, 'sheetId', 'PROPERTIES'), title: scalar(p, 'title', 'PROPERTIES') };
        if (includeGridProperties === true) {
          required(p, ['gridProperties'], 'native snapshot properties');
          var g = data(p, 'gridProperties');
          fields(g, ['rowCount', 'columnCount'], 'native snapshot grid bounds', 'PROPERTIES');
          properties.gridProperties = { rowCount: scalar(g, 'rowCount', 'PROPERTIES'),
            columnCount: scalar(g, 'columnCount', 'PROPERTIES') };
        }
        return { properties: properties,
          data: array(data(item, 'data'), 'native typed chunk physical sheet mismatch', grid) };
      }) };
    ['error', 'isError'].forEach(function (key) { if (own(value, key)) result[key] = data(value, key); });
    return result;
  }
  function readBlock(name, first, last, retainNative) {
    var info = sheetInfo(name), width = info.width,bundled=bundleCapture(name,first,last,0,width);if(bundled){if(retainNative===true){hold(bundled.nativeRaw,'read bundle exact legacy canonical DTO missing');return {rows:bundled.rows,displayRows:bundled.displayRows,checkedAt:bundled.checkedAt,nativeRaw:bundled.nativeRaw};}return bundled;}
    hold(integer(first, 1) && integer(last, first) && last - first < 500, 'bounded 500-row native chunk required');
    checkBudget(1000);
    var checkedAt = stamp();
    var result = nativeObject(typedGetDto(sheetsGet(workbook, {
      ranges: ["'" + name + "'!A" + first + ':' + info.last + last, "'" + (name === 'Prospects' ? 'Evidence' : 'Prospects') + "'!A1:A1"],
      includeGridData: true,
      fields: 'spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(userEnteredValue,formattedValue))))'
    }), true), 'Sheets typed chunk');
    required(result, ['spreadsheetId', 'sheets'], 'native typed chunk');
    hold(result.spreadsheetId === workbook && Array.isArray(result.sheets) && result.sheets.length === 2,
      'native typed chunk workbook/coverage mismatch');
    Object.keys(sheets).forEach(function(requiredName){var matches=result.sheets.filter(function(s){return s.properties.title===requiredName;});hold(matches.length===1,'canonical physical sheet identity ambiguous');var p=matches[0].properties,g=p.gridProperties;hold(p.sheetId===sheets[requiredName].id&&record(g)&&integer(g.rowCount,5)&&integer(g.columnCount,sheets[requiredName].width),'canonical physical bounds/gid mismatch');});
    var sheet = result.sheets.filter(function(s){return s.properties.title===name;})[0];
    required(sheet, ['properties', 'data'], 'native typed sheet');
    required(sheet.properties, ['sheetId', 'title'], 'native typed sheet properties');
    hold(record(sheet) && record(sheet.properties) && sheet.properties.sheetId === info.id &&
      sheet.properties.title === name && Array.isArray(sheet.data) && sheet.data.length === 1,
      'native typed chunk physical sheet mismatch');
    var bounds = sheet.properties.gridProperties;
    hold(record(bounds) && integer(bounds.rowCount, 5) && integer(bounds.columnCount, width) &&
      last <= bounds.rowCount, 'native typed chunk physical bounds/gid mismatch');
    var capture = decodeBlock(name, first, last, sheet.data[0], checkedAt);
    if (retainNative === true) { capture.nativeRaw = copy({spreadsheetId:result.spreadsheetId,sheets:[sheet]}); delete capture.nativeRaw.sheets[0].properties.gridProperties; }
    return capture;
  }
  function decodeBlock(name, first, last, grid, checkedAt) {
    var width = sheetInfo(name).width, count = last - first + 1;
    hold(integer(first, 1) && integer(last, first) && count <= 500, 'bounded 500-row native chunk required');
    hold(record(grid) && (optional(grid, 'startRow', 'native grid') === undefined ? 0 : grid.startRow) === first - 1 &&
      (optional(grid, 'startColumn', 'native grid') === undefined ? 0 : grid.startColumn) === 0,
      'native typed chunk coordinates mismatch');
    var rows = optional(grid, 'rowData', 'native grid') === undefined ? [] : grid.rowData;
    hold(Array.isArray(rows) && rows.length <= count, 'native typed chunk rows incomplete/invalid');
    var raw = [], display = [];
    for (var r = 0; r < count; r++) {
      var data = rows[r];
      hold(data === undefined || record(data), 'native RowData invalid');
      var cells = data && optional(data, 'values', 'native RowData') !== undefined ? data.values : [];
      hold(Array.isArray(cells) && cells.length <= width, 'native typed chunk width invalid');
      var row = [], shown = [];
      for (var c = 0; c < width; c++) {
        var cell = cells[c];
        hold(cell === undefined || record(cell), 'native CellData invalid');
        row.push(cell && optional(cell, 'userEnteredValue', 'native cell') !== undefined ? typed(cell.userEnteredValue) : {});
        var text = cell && optional(cell, 'formattedValue', 'native cell') !== undefined ? cell.formattedValue : '';
        hold(typeof text === 'string', 'native formatted cell must be a string');
        shown.push(text);
      }
      raw.push(row); display.push(shown);
    }
    return { rows: raw, displayRows: display, checkedAt: checkedAt };
  }
  // Count the decoded JSON text's exact UTF-8 size without allocating a Blob.
  // This measures decoded input, not HTTP wire bytes or the Apps Script heap.
  function snapshotUtf8ByteLength(text) {
    hold(typeof text === 'string' && text.length <= 32 * 1024 * 1024, 'native typed snapshot response window exceeds bound');
    var total = 0, nextBudgetCheck = 0;
    for (var i = 0; i < text.length; i++) {
      if (i >= nextBudgetCheck) { checkBudget(); nextBudgetCheck = i + 16384; }
      var c = text.charCodeAt(i);
      if (c < 128) total++;
      else if (c < 2048) total += 2;
      else if (c >= 55296 && c <= 56319) {
        var next = text.charCodeAt(++i);
        hold(next >= 56320 && next <= 57343, 'native typed snapshot response Unicode invalid');
        total += 4;
      } else { hold(c < 56320 || c > 57343, 'native typed snapshot response Unicode invalid'); total += 3; }
    }
    return total;
  }
  function fullSnapshotDiagnostic(cfg) {
    lastSnapshotCapacity = null;
    safeData(cfg, 'snapshot configuration');
    hold(record(cfg), 'independent snapshot configuration required');
    var expected = {
      Prospects: wholeRow(cfg.prospectsHeaders, 27),
      Evidence: wholeRow(cfg.evidenceHeaders, 26)
    };
    Logger.log('FERNAIN_SNAPSHOT_PHASE:META_BEGIN');
    var checkedAt = stamp(), meta = metadata(), result = {}, ranges = [], plans = {}, physicalRows = 0;
    var orderedPlans = [], structuralBudget = { count: 0 }, payloadUtf8Bytes = 0, jsonPayloadUtf8Bytes = 0, maxRawWindowUtf8Bytes = 0, maxProjectedWindowUtf8Bytes = 0;
    Logger.log('FERNAIN_SNAPSHOT_PHASE:META_RETURN');
    Object.keys(sheets).forEach(function (name) {
      var count = meta[name].rowCount;
      physicalRows += count;
      hold(physicalRows <= 12000, 'native full physical snapshot exceeds 12000-row bound');
      plans[name] = [];
      for (var start = 1; start <= count; start += 500) {
        var last = Math.min(start + 499, count);
        var plan = { name: name, first: start, last: last };
        plans[name].push(plan); orderedPlans.push(plan);
        ranges.push("'" + name + "'!A" + start + ':' + sheets[name].last + last);
        hold(ranges.length <= 24, 'native full physical snapshot exceeds 24-range bound');
      }
    });
    var windowCount = Math.ceil(orderedPlans.length / 4), capturedPlans = {};
    Object.keys(sheets).forEach(function (name) {
      result[name] = { sheetId: sheets[name].id, rowCount: meta[name].rowCount, width: sheets[name].width,
        rows: [], displayRows: [] };
    });
    function captureWindow(windowIndex) {
      var windowPlans = [], windowRanges = [], windowNames = [];
      for (var planIndex = windowIndex; planIndex < orderedPlans.length; planIndex += windowCount) {
        windowPlans.push(orderedPlans[planIndex]); windowRanges.push(ranges[planIndex]);
      }
      hold(windowPlans.length >= 1 && windowPlans.length <= 4, 'bounded four-range native snapshot window required');
      windowPlans.forEach(function (plan) { if (windowNames.indexOf(plan.name) < 0) windowNames.push(plan.name); });
      checkBudget(1000);
      Logger.log('FERNAIN_SNAPSHOT_PHASE:API_BEGIN');
      var fields = 'spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(userEnteredValue,formattedValue))))';
      var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + workbook + '?includeGridData=true&prettyPrint=false&fields=' +
        encodeURIComponent(fields) + windowRanges.map(function (range) { return '&ranges=' + encodeURIComponent(range); }).join('');
      var token = null, response = null, status, responseText;
      try {
        token = nativeBoundary(function(){return ScriptApp.getOAuthToken();});
        if (typeof token !== 'string' || token.length === 0) throw new Error('fixed Sheets JSON token unavailable');
      } catch (_) { token = null; hold(false, 'native fixed Sheets JSON request unavailable'); }
      var timeoutSeconds;
      try { timeoutSeconds = Math.min(110, Math.floor(checkBudget(1000) / 1000)); }
      catch (error) { token = null; throw error; }
      try {
        response = sheetsFetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + token },
          validateHttpsCertificates: true, followRedirects: false, muteHttpExceptions: true, timeoutSeconds: timeoutSeconds });
        status = response.getResponseCode();
        if (status === 200) responseText = response.getContentText();
      } catch (_) { hold(false, 'native fixed Sheets JSON request unavailable'); }
      finally { token = null; response = null; }
      hold(integer(status, 100, 599), 'native fixed Sheets JSON HTTP rejected');
      if (status !== 200) Logger.log('FERNAIN_SNAPSHOT_PHASE:JSON_HTTP_REJECT_' + status);
      hold(status === 200, 'native fixed Sheets JSON HTTP rejected');
      hold(typeof responseText === 'string', 'native fixed Sheets JSON response unavailable');
      var rawWindowUtf8Bytes = snapshotUtf8ByteLength(responseText);
      jsonPayloadUtf8Bytes += rawWindowUtf8Bytes;maxRawWindowUtf8Bytes = Math.max(maxRawWindowUtf8Bytes, rawWindowUtf8Bytes);
      Logger.log('FERNAIN_SNAPSHOT_BUDGET_V1:' + JSON.stringify({phase:'RAW',window:windowIndex+1,decodedUtf8Bytes:rawWindowUtf8Bytes,cumulativeUtf8Bytes:jsonPayloadUtf8Bytes,maxWindowUtf8Bytes:maxRawWindowUtf8Bytes,windowLimitBytes:32*1024*1024,aggregateLimitBytes:64*1024*1024,elapsedMs:Date.now()-budgetStarted,heapUsage:'UNKNOWN_NOT_EXPOSED'}));
      hold(rawWindowUtf8Bytes <= 32 * 1024 * 1024, 'native typed snapshot response window exceeds bound');
      hold(jsonPayloadUtf8Bytes <= 64 * 1024 * 1024, 'native full typed snapshot payload exceeds bound');
      checkBudget();
      var nativeRaw;
      try { nativeRaw = JSON.parse(responseText); }
      catch (_) { hold(false, 'native fixed Sheets JSON response invalid'); }
      responseText = null;
      Logger.log('FERNAIN_SNAPSHOT_PHASE:API_RETURN');
      var nativeProjected = typedGetDto(nativeRaw, true, structuralBudget);
      nativeRaw = null;
      Logger.log('FERNAIN_SNAPSHOT_PHASE:DTO_RETURN');
      var native = nativeObject(nativeProjected, 'Sheets full typed snapshot');
      nativeProjected = null;
      Logger.log('FERNAIN_SNAPSHOT_PHASE:DTO_VALIDATED');
      // Every projected window remains bounded; full-record aggregate capacity is versioned here.
      var projectedText = JSON.stringify(copy(native)), projectedWindowUtf8Bytes = snapshotUtf8ByteLength(projectedText);projectedText = null;
      payloadUtf8Bytes += projectedWindowUtf8Bytes;maxProjectedWindowUtf8Bytes = Math.max(maxProjectedWindowUtf8Bytes, projectedWindowUtf8Bytes);
      Logger.log('FERNAIN_SNAPSHOT_BUDGET_V1:' + JSON.stringify({phase:'PROJECTED',window:windowIndex+1,decodedUtf8Bytes:projectedWindowUtf8Bytes,cumulativeUtf8Bytes:payloadUtf8Bytes,maxWindowUtf8Bytes:maxProjectedWindowUtf8Bytes,windowLimitBytes:32*1024*1024,aggregateLimitBytes:64*1024*1024,elapsedMs:Date.now()-budgetStarted,heapUsage:'UNKNOWN_NOT_EXPOSED'}));
      hold(projectedWindowUtf8Bytes <= 32 * 1024 * 1024, 'native typed snapshot response window exceeds bound');
      hold(payloadUtf8Bytes <= 64 * 1024 * 1024, 'native full typed snapshot payload exceeds bound');
      Logger.log('FERNAIN_SNAPSHOT_PHASE:COPY_BOUND_RETURN');
      checkBudget();
      required(native, ['spreadsheetId', 'sheets'], 'native full typed snapshot');
      hold(native.spreadsheetId === workbook && Array.isArray(native.sheets) && native.sheets.length === windowNames.length,
        'native full typed snapshot workbook/coverage mismatch');
      native.sheets.forEach(function (entry) {
        required(entry, ['properties', 'data'], 'native snapshot sheet');
        required(entry.properties, ['sheetId', 'title', 'gridProperties'], 'native snapshot properties');
      });
      windowNames.forEach(function (name) {
        var matches = native.sheets.filter(function (entry) { return entry.properties.title === name; });
        hold(matches.length === 1, name + ' native snapshot sheet identity ambiguous');
        var sheet = matches[0], p = sheet.properties, g = p.gridProperties;
        var expectedPlans = windowPlans.filter(function (plan) { return plan.name === name; });
        required(g, ['rowCount', 'columnCount'], 'native snapshot grid bounds');
        hold(p.sheetId === sheets[name].id && g.rowCount === meta[name].rowCount && g.columnCount === meta[name].columnCount &&
          Array.isArray(sheet.data) && sheet.data.length === expectedPlans.length,
          name + ' native snapshot physical bounds/gid/coverage mismatch');
        expectedPlans.forEach(function (plan) {
          checkBudget(1000);
          var grids = sheet.data.filter(function (grid) {
            return (optional(grid, 'startRow', 'native grid') === undefined ? 0 : grid.startRow) === plan.first - 1 &&
              (optional(grid, 'startColumn', 'native grid') === undefined ? 0 : grid.startColumn) === 0;
          });
          var key = name + ':' + plan.first;
          hold(grids.length === 1 && !own(capturedPlans, key), name + ' native snapshot coordinates/duplicate coverage mismatch');
          var chunk = decodeBlock(name, plan.first, plan.last, grids[0], checkedAt);
          for (var rowIndex = 0; rowIndex < chunk.rows.length; rowIndex++) {
            var physicalIndex = plan.first - 1 + rowIndex;
            hold(!own(result[name].rows, physicalIndex) && !own(result[name].displayRows, physicalIndex),
              name + ' native snapshot duplicate physical row');
            result[name].rows[physicalIndex] = chunk.rows[rowIndex];
            result[name].displayRows[physicalIndex] = chunk.displayRows[rowIndex];
          }
          capturedPlans[key] = true;
        });
      });
      native = null;
    }
    // Each helper returns after projecting/decoding; no raw SDK window is kept.
    for (var windowIndex = 0; windowIndex < windowCount; windowIndex++) captureWindow(windowIndex);
    Object.keys(sheets).forEach(function (name) {
      hold(plans[name].every(function (plan) { return own(capturedPlans, name + ':' + plan.first); }) &&
        result[name].rows.length === meta[name].rowCount && result[name].displayRows.length === meta[name].rowCount,
        name + ' native snapshot missing physical coverage');
      for (var rowIndex = 0; rowIndex < meta[name].rowCount; rowIndex++) {
        hold(own(result[name].rows, rowIndex) && own(result[name].displayRows, rowIndex) &&
          result[name].rows[rowIndex].length === sheets[name].width && result[name].displayRows[rowIndex].length === sheets[name].width,
          name + ' native snapshot incomplete full-width row');
      }
      hold(sameRows(result[name].rows[4], expected[name]), name + ' exact row-5 typed headers changed');
    });
    checkBudget();
    result.spreadsheetId = workbook;
    result.checkedAt = checkedAt;
    result.ref = 'https://docs.google.com/spreadsheets/d/' + workbook + '/edit#native-full-physical-' + Date.parse(checkedAt);
    Logger.log('FERNAIN_SNAPSHOT_PHASE:DECODE_RETURN');
    lastSnapshotCapacity = { snapshot: result, prospectRows: result.Prospects.rows, evidenceRows: result.Evidence.rows, prospectCount: result.Prospects.rows.length, evidenceCount: result.Evidence.rows.length, metrics: { schema: 'BackofficeNativeSnapshotCapacity/v1', rawBytes: jsonPayloadUtf8Bytes, projectedBytes: payloadUtf8Bytes, maxRawWindowBytes: maxRawWindowUtf8Bytes, maxProjectedWindowBytes: maxProjectedWindowUtf8Bytes } };
    return result;
  }
  // V2 readsets retain the action's one110s deadline. Bytes are bounded per
  // declared readset/window and also accumulated honestly across the action.
  var semanticColumns=[1,3,11,14,17,18,19,20,21,22,26],archiveInstance=null,currentUniverse=null;
  var retentionReadActive=false,retentionReadEvent=null,retentionDeclarationToken=null,retentionReadPlans=null;
  var readBundle=null,archiveWorkbookMetadata=null,archiveSnapshotIndex=null,semanticCapacity=null,archiveReadset=null,archiveMetadataCache=undefined,archiveCellCapacity=null,archiveCanonicalMeta=null,actionReadBytes={raw:0,projected:0,ranges:0,fixedGetAttempts:0,retryWaitMs:0};
  function rangeColumn(n){var t='';for(n++;n;n=Math.floor((n-1)/26))t=String.fromCharCode(65+(n-1)%26)+t;return t;}
  function newReadset(){return {rawBytes:0,projectedBytes:0,maxRawWindowBytes:0,maxProjectedWindowBytes:0,actualRanges:0};}
  function rectDecode(plan,grid,at){
    hold(record(grid)&&(optional(grid,'startRow','native grid')===undefined?0:grid.startRow)===plan.first-1&&
      (optional(grid,'startColumn','native grid')===undefined?0:grid.startColumn)===plan.column,'semantic native rectangle coordinates mismatch');
    var rows=optional(grid,'rowData','native grid')===undefined?[]:grid.rowData,count=plan.last-plan.first+1;
    hold(Array.isArray(rows)&&rows.length<=count,'semantic native rectangle row count mismatch');var raw=[],display=[];
    for(var r=0;r<count;r++){var row=rows[r],cells=row&&optional(row,'values','native RowData')!==undefined?row.values:[];
      hold(row===undefined||record(row),'semantic RowData required');hold(Array.isArray(cells)&&cells.length<=plan.width,'semantic rectangle cell width mismatch');var typedRow=[],shown=[];
      for(var c=0;c<plan.width;c++){var cell=cells[c];hold(cell===undefined||record(cell),'semantic CellData required');typedRow.push(cell&&optional(cell,'userEnteredValue','native cell')!==undefined?typed(cell.userEnteredValue):{});
        var text=cell&&optional(cell,'formattedValue','native cell')!==undefined?cell.formattedValue:'';hold(typeof text==='string','semantic native display must be string');shown.push(text);}
      raw.push(typedRow);display.push(shown);
    }return {rows:raw,displayRows:display,checkedAt:at};
  }
  function fetchRectWindow(plans,measurement,retainNative){
    hold(Array.isArray(plans)&&plans.length>0&&plans.length<=16,'semantic bounded sixteen-range window required');
    plans.forEach(function(p){hold(integer(p.first,1)&&integer(p.last,p.first)&&p.last-p.first<500&&integer(p.column,0)&&integer(p.width,1,27),'semantic bounded declared rectangle required');});
    measurement.actualRanges+=plans.length;hold(measurement.actualRanges<=40,'semantic readset exceeds40 actual declared ranges');
    var fields='spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(userEnteredValue,formattedValue))))';
    var ranges=plans.map(function(p){return "'"+p.name+"'!"+rangeColumn(p.column)+p.first+':'+rangeColumn(p.column+p.width-1)+p.last;});
    var url='https://sheets.googleapis.com/v4/spreadsheets/'+workbook+'?includeGridData=true&prettyPrint=false&fields='+encodeURIComponent(fields)+ranges.map(function(r){return '&ranges='+encodeURIComponent(r);}).join('');
    hold(url.length<=2000,'semantic fixed URL exceeds finite transport bound');var token=null,response=null,status,responseText;
    for(var attempt=0;;attempt++){checkBudget(1000);try{token=nativeBoundary(function(){return ScriptApp.getOAuthToken();});hold(typeof token==='string'&&token.length>0,'semantic fixed native token unavailable');response=sheetsFetch(url,{method:'get',headers:{Authorization:'Bearer '+token},validateHttpsCertificates:true,followRedirects:false,muteHttpExceptions:true,timeoutSeconds:Math.min(110,Math.floor(checkBudget(1000)/1000))});status=response.getResponseCode();if(status===200)responseText=response.getContentText();}finally{token=null;response=null;}if(status!==429||attempt>=3)break;var waitMs=1000*Math.pow(2,attempt);hold(lockHeld&&nativeLockHeld(),'read-only quota retry held lock changed');hold(checkBudget(1000)>waitMs+1000,'read-only quota retry exceeds action deadline');hold(actionReadBytes.retryWaitMs+waitMs<=7000,'read-only quota retry action wait bound exhausted');hold(typeof Utilities.sleep==='function','bounded native read-only quota retry unavailable');try{Logger.log('FERNAIN_FIXED_GET_RETRY_V1:'+JSON.stringify({schema:'BackofficeNativeFixedGetRetry/v1',category:'QUOTA429',attempt:attempt+1,retryWaitMs:waitMs,totalWaitMs:actionReadBytes.retryWaitMs+waitMs,elapsedMs:Date.now()-budgetStarted,readOnly:true}));}catch(_){}nativeBoundary(function(){return Utilities.sleep(waitMs);});actionReadBytes.retryWaitMs+=waitMs;checkBudget(1000);hold(lockHeld&&nativeLockHeld(),'read-only quota retry held lock changed');}
    if(!(status===200&&typeof responseText==='string')){try{Logger.log('FERNAIN_SEMANTIC_HTTP_HOLD_V2:'+JSON.stringify({schema:'BackofficeNativeSemanticHttpHold/v2',category:status===429?'QUOTA429':status===401?'AUTH401':status===403?'PERMISSION403':status===400?'BAD_REQUEST400':integer(status,500,599)?'SERVER5xx':'OTHER'}));}catch(_){}}
    hold(status===200&&typeof responseText==='string','semantic fixed Sheets JSON request rejected');var rawBytes=snapshotUtf8ByteLength(responseText);
    measurement.rawBytes+=rawBytes;measurement.maxRawWindowBytes=Math.max(measurement.maxRawWindowBytes,rawBytes);actionReadBytes.raw+=rawBytes;actionReadBytes.ranges+=plans.length;
    hold(rawBytes<=32*1024*1024&&measurement.rawBytes<=64*1024*1024,'semantic raw readset/window byte bound exceeded');var nativeRaw;try{nativeRaw=JSON.parse(responseText);}catch(_){hold(false,'semantic fixed JSON invalid');}responseText=null;
    var native=nativeObject(typedGetDto(nativeRaw,true),'semantic native rectangle');nativeRaw=null;
    var projectedBytes=snapshotUtf8ByteLength(JSON.stringify(native));measurement.projectedBytes+=projectedBytes;measurement.maxProjectedWindowBytes=Math.max(measurement.maxProjectedWindowBytes,projectedBytes);actionReadBytes.projected+=projectedBytes;
    hold(projectedBytes<=32*1024*1024&&measurement.projectedBytes<=64*1024*1024,'semantic projected readset/window byte bound exceeded');
    var names=[];plans.forEach(function(p){if(names.indexOf(p.name)<0)names.push(p.name);});hold(native.spreadsheetId===workbook&&native.sheets.length===names.length,'semantic workbook/physical coverage mismatch');var out=[];
    names.forEach(function(name){var matches=native.sheets.filter(function(e){return e.properties.title===name;});hold(matches.length===1,'semantic physical sheet ambiguous');var sheet=matches[0],expected=plans.filter(function(p){return p.name===name;});hold(sheet.data.length===expected.length,'semantic declared grid coverage mismatch');
      expected.forEach(function(p){hold(sheet.properties.sheetId===p.sheetId&&sheet.properties.gridProperties.rowCount===p.rowCount&&sheet.properties.gridProperties.columnCount===p.columnCount,'semantic physical bounds/gid changed');var grids=sheet.data.filter(function(g){return (optional(g,'startRow','native grid')===undefined?0:g.startRow)===p.first-1&&(optional(g,'startColumn','native grid')===undefined?0:g.startColumn)===p.column;});hold(grids.length===1,'semantic native rectangle duplicate/missing');var decoded={plan:p,capture:rectDecode(p,grids[0],stamp())};if(retainNative===false)safeData(grids[0],'copy');else decoded.nativeRaw={spreadsheetId:native.spreadsheetId,sheets:[{properties:{sheetId:p.sheetId,title:p.name},data:[copy(grids[0])]}]};out.push(decoded);});
    });Logger.log('FERNAIN_SEMANTIC_READSET_BUDGET_V2:'+JSON.stringify({actualRanges:measurement.actualRanges,rawBytes:measurement.rawBytes,projectedBytes:measurement.projectedBytes,maxRawWindowBytes:measurement.maxRawWindowBytes,maxProjectedWindowBytes:measurement.maxProjectedWindowBytes,actionRawBytes:actionReadBytes.raw,actionProjectedBytes:actionReadBytes.projected,actionActualRanges:actionReadBytes.ranges,actionFixedHttpsGetAttempts:actionReadBytes.fixedGetAttempts,actionSheetsGetAttempts:sheetsReadStats.attempts,actionSdkGetAttempts:sheetsReadStats.sdkAttempts,actionPaceWaitMs:sheetsReadStats.waitMs,actionReadRetryWaitMs:actionReadBytes.retryWaitMs,elapsedMs:Date.now()-budgetStarted,readsetLimitBytes:64*1024*1024,windowLimitBytes:32*1024*1024,heapUsage:'UNKNOWN_NOT_EXPOSED'}));checkBudget();return out;
  }
  function addSheetAckDto(value){
    hold(record(value)&&!isThenable(value),'archive addSheet synchronous acknowledgment required');
    function inspect(object){hold(record(object)||Array.isArray(object),'archive addSheet data object required');hold(Object.getOwnPropertySymbols(object).length===0,'archive addSheet symbols prohibited');Object.getOwnPropertyNames(object).forEach(function(k){var d=Object.getOwnPropertyDescriptor(object,k);hold(d&&own(d,'value'),'archive addSheet accessor prohibited');});['error','isError'].forEach(function(k){hold(own(object,k)||!(k in object),'archive addSheet inherited error prohibited');if(own(object,k))hold(!object[k],'archive addSheet native error');});}
    inspect(value);required(value,['spreadsheetId','replies'],'archive addSheet');var replies=value.replies;inspect(replies);hold(Array.isArray(replies)&&replies.length===1&&own(replies,0),'archive addSheet exact reply coverage required');inspect(replies[0]);required(replies[0],['addSheet'],'archive addSheet reply');inspect(replies[0].addSheet);required(replies[0].addSheet,['properties'],'archive addSheet result');
    // Only documented properties are projected; unrelated inert SDK methods
    // cannot become business fields or be accepted by generic safeData.
    var dto=metadataDto({spreadsheetId:value.spreadsheetId,sheets:[{properties:replies[0].addSheet.properties}]});return {spreadsheetId:dto.spreadsheetId,replies:[{addSheet:{properties:dto.sheets[0].properties}}]};
  }
  function archiveMetadata(create,observed){
    if(!observed&&archiveMetadataCache!==undefined&&(!create||archiveMetadataCache!==null))return archiveMetadataCache;
    var result=observed||nativeObject(metadataDto(sheetsGet(workbook,{fields:'spreadsheetId,sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))'})),'archive workbook metadata');hold(result.spreadsheetId===workbook,'archive same-workbook identity required');var L=BackofficeNativeArchiveV2.layout;
    archiveCellCapacity={existingCells:result.sheets.reduce(function(n,s){return n+s.properties.gridProperties.rowCount*s.properties.gridProperties.columnCount;},0),archiveExists:false};var matches=result.sheets.filter(function(s){return s.properties.title===L.name||s.properties.sheetId===L.sheetId;});
    if(matches.length===0&&create){structurePlanEpoch++;discardMetadataPlan();hold(!readBundle,"read bundle cannot cross an archive creation boundary");hold(lockHeld&&nativeLockHeld(),'held project lock required for archive sheet');var cells=result.sheets.reduce(function(n,s){return n+s.properties.gridProperties.rowCount*s.properties.gridProperties.columnCount;},0);hold(cells+L.rowCount*L.width<=10000000,'finite workbook cells unavailable for archive');checkBudget(1000);terminalProofReceipt=null;var added=nativeObject(addSheetAckDto(nativeBoundary(function(){try{return Sheets.Spreadsheets.batchUpdate({requests:[{addSheet:{properties:{sheetId:L.sheetId,title:L.name,gridProperties:{rowCount:L.rowCount,columnCount:L.width}}}}]},workbook);}finally{discardMetadataPlan();}})),'archive fixed addSheet acknowledgment');hold(added.spreadsheetId===workbook&&Array.isArray(added.replies)&&added.replies.length===1&&added.replies[0].addSheet&&added.replies[0].addSheet.properties&&added.replies[0].addSheet.properties.sheetId===L.sheetId,'archive fixed sheet acknowledgment uncertain');archiveMetadataCache=undefined;return archiveMetadata(false);}
    if(!matches.length){archiveMetadataCache=null;return null;}hold(matches.length===1&&matches[0].properties.title===L.name&&matches[0].properties.sheetId===L.sheetId&&matches[0].properties.gridProperties.rowCount===L.rowCount&&matches[0].properties.gridProperties.columnCount===L.width,'archive fixed physical layout changed');archiveCellCapacity.archiveExists=true;rememberMetadataPlan(result);archiveMetadataCache={sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width};return archiveMetadataCache;
  }
  // One immutable, synchronous native read phase. Captures are private,
  // bounded and discarded before any write boundary; they never admit state.
  function bundleCapture(name,first,last,column,width){
    assertRetentionReadCapture();if(!readBundle)return null;
    hold(lockHeld&&nativeLockHeld()&&lockEpoch===readBundleEpoch,'read bundle held lock changed');checkBudget(1000);
    if(retentionReadActive){var priorCompletion=completionProof;completionProof=Object.assign({},retentionReadEvent,{items:readBundle});try{if(closedTerminalMembers.has(retentionReadEvent)){hold(closedTerminalCurrent(retentionReadEvent),'source reconstruction original closed scope changed before derived capture');hold(closedTerminalScope.retentionOwner===retentionDeclarationToken&&closedTerminalScope.ticket===terminalEventTickets.get(retentionReadEvent),'source reconstruction exact derived owner changed');inheritTerminalEvent(completionProof,retentionReadEvent);tagClosedTerminal(completionProof,'RETENTION_DERIVED_COMPLETION');}return completionCapture(name,first,last,column,width);}finally{completionProof=priorCompletion;}}
    var found=readBundle.filter(function(r){var p=r.plan;return p.name===name&&p.column===column&&p.width===width&&p.first<=first&&p.last>=last;});
    if(retentionReadActive)hold(found.length===1,'source reconstruction missing/duplicate private coverage BEFORE cells');if(!found.length)return null;hold(found.length===1,'read bundle range ambiguous');
    var r=found[0],offset=first-r.plan.first,count=last-first+1;
    return {rows:copy(r.capture.rows.slice(offset,offset+count)),displayRows:copy(r.capture.displayRows.slice(offset,offset+count)),checkedAt:r.capture.checkedAt,nativeRaw:first===r.plan.first&&last===r.plan.last?copy(r.nativeRaw):null};
  }

  function retentionValidationRawProperty(k){var r=retentionReadActive&&retentionReadEvent,key=k===BackofficeNativeArchiveV2.layout.rootKey?'rootRaw':k==='FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'?'controlRaw':k==='FERNAIN_NATIVE_RUNTIME_CONFIG_V1'?'configRaw':null;if(!r||!key)closeTerminalScope();terminalBankDigest=null;preflightPropertyReadEpoch++;try{var raw=rawProperties.getProperty(k);if(r&&key){if(raw!==r[key])closeTerminalScope();else closedTerminalProperty(k,raw);}return raw;}catch(error){closeTerminalScope();throw error;}}
  function retentionReadCurrent(r,observation){if(r&&closedTerminalMembers.has(r)){observation.route='CLOSED_RETENTION_ORIGINAL_EVENT';var detail=receiptObservation('SOURCE_RECONSTRUCTION_OWNED_CURRENT');detail.route='CLOSED_TERMINAL';observation.closed=detail;return closedTerminalCurrent(r,detail);}observation.route='GENERIC_ORPHAN_EVENT';return orphanSourceCurrent(r,observation);}
  function assertRetentionReadCapture(){if(!retentionReadActive)return;var r=retentionReadEvent,o={schema:'BackofficeSourceReconstructionPredicateFailure/v1',category:'SOURCE_RECONSTRUCTION_EVENT_AUTHORITY',clock:'DATE_NOW_WALL_CLOCK',ageSampling:'PRE_NATIVE_LOCK',expectedAge:{minimum:0,maximum:5000},checks:{eventPresent:'NOT_EVALUATED',beforeCurrent:'NOT_EVALUATED',rootEqual:'NOT_EVALUATED',controlEqual:'NOT_EVALUATED',configEqual:'NOT_EVALUATED',afterCurrent:'NOT_EVALUATED'},before:retentionCurrentObservation(),after:retentionCurrentObservation()};
    var predicateLogged=false;try{var current=retentionPredicate(o,'eventPresent',r)&&retentionPredicate(o,'beforeCurrent',retentionReadCurrent(r,o.before))&&retentionPredicate(o,'rootEqual',retentionValidationRawProperty(BackofficeNativeArchiveV2.layout.rootKey)===r.rootRaw)&&retentionPredicate(o,'controlEqual',retentionValidationRawProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===r.controlRaw)&&retentionPredicate(o,'configEqual',retentionValidationRawProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===r.configRaw)&&retentionPredicate(o,'afterCurrent',retentionReadCurrent(r,o.after));
    if(!current){predicateLogged=true;try{Logger.log('FERNAIN_SOURCE_RECONSTRUCTION_PREDICATE_V1:'+JSON.stringify(o));}catch(ignore){}}
    hold(current,'source reconstruction actual event/authority changed BEFORE cells');}catch(error){if(!predicateLogged){o.outcome='THREW';try{Logger.log('FERNAIN_SOURCE_RECONSTRUCTION_PREDICATE_V1:'+JSON.stringify(o));}catch(ignore){}}throw error;}
  }
  function withSourceRetentionReadBundle(cfg,selection,fn){if(readBundle||completionProof||canonicalUnionActive||sourceMetadataProofActive||retentionReadActive)return null;safeData(selection,'source reconstruction selection');hold(record(selection)&&Object.keys(selection).sort().join('|')==='metadataHash|metadataRow|prospectRow|sourceReferences'&&typeof selection.metadataHash==='string'&&/^[a-f0-9]{64}$/.test(selection.metadataHash),'exact source reconstruction selection required');archiveMutationFence();var a=archiveAdapter(),plan=a.sourceRetentionReadPlan(selection.sourceReferences,selection.metadataRow),terminal=a.terminalProofPlan(),rows=[selection.metadataRow];if(terminal)rows=rows.concat(terminal.canonicalRows);var declaration={plan:plan,terminal:terminal,controlRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')};retentionDeclarationToken=declaration;try{return withReadOnlyBundle(cfg,{evidenceRows:Array.from(new Set(rows)),prospectRows:[selection.prospectRow],sourceReferences:selection.sourceReferences},function(){var original=a.logical(selection.metadataRow,selection.metadataHash,'SOURCE_METADATA');hold(sha(JSON.stringify(original))===selection.metadataHash,'source reconstruction metadata fresh original hash changed');return fn();},declaration);}finally{retentionDeclarationToken=null;}}
  function withReadOnlyBundle(cfg,selection,fn,retentionDeclaration){
    hold(!readBundle&&lockHeld&&nativeLockHeld()&&typeof fn==='function','one private held-lock native read bundle required');hold(!retentionDeclaration||retentionDeclaration===retentionDeclarationToken,'private source read declaration identity required');
    safeData(selection,'read bundle selection');hold(record(selection)&&Object.keys(selection).sort().join('|')==='evidenceRows|prospectRows|sourceReferences'&&Array.isArray(selection.evidenceRows)&&selection.evidenceRows.length<=16&&Array.isArray(selection.prospectRows)&&selection.prospectRows.length<=2&&Array.isArray(selection.sourceReferences)&&selection.sourceReferences.length<=206,'bounded explicit read bundle selection required');
    var meta=archiveCanonicalMeta||metadata(),archive=archiveAdapter(),plans=[],seen=Object.create(null),payloads=[],L=BackofficeNativeArchiveV2.layout;
    function add(name,row,width){var key=name+'|'+row+'|'+width;if(seen[key])return;seen[key]=true;var m=name===L.name?{sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width}:meta[name];hold(m&&integer(row,1,m.rowCount),'read bundle physical destination outside bounds');plans.push({name:name,sheetId:m.sheetId,rowCount:m.rowCount,columnCount:m.columnCount,first:row,last:row,column:0,width:width});}
    selection.evidenceRows.forEach(function(row){hold(integer(row,6,meta.Evidence.rowCount),'read bundle Evidence row invalid');add('Evidence',row,26);var p=archive.readPayloadPlan(row);if(p)payloads.push(p.row);});
    selection.prospectRows.forEach(function(row){hold(integer(row,6,meta.Prospects.rowCount),'read bundle Prospects row invalid');add('Prospects',row,27);});
    selection.sourceReferences.forEach(function(ref){hold(record(ref)&&integer(ref.row,6,12000),'read bundle source reference invalid');if(ref.location&&ref.location.kind==='ARCHIVE_DIRECT'){hold(ref.location.sheetId===L.sheetId&&ref.location.row===ref.row,'read bundle direct source fixed location invalid');var p=archive.readDirectPayloadPlan(ref.row);payloads.push(p.row);}else {add('Evidence',ref.row,26);var p=archive.readPayloadPlan(ref.row);if(p)payloads.push(p.row);}});
    // Preserve both canonical metadata predicates in the same typed request.
    ['Prospects','Evidence'].forEach(function(name){if(!plans.some(function(p){return p.name===name;}))add(name,1,1);});
    if(retentionDeclaration){payloads=payloads.concat(retentionDeclaration.plan.payloadRows);if(retentionDeclaration.terminal)payloads=payloads.concat(retentionDeclaration.terminal.payloadRows);plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:2,last:501,column:retentionDeclaration.plan.bank==='A'?0:1,width:1});plans.push(preservedPlan());}
    payloads=Array.from(new Set(payloads)).sort(function(a,b){return a-b;});var groups=[];payloads.forEach(function(row){var g=groups[groups.length-1];if(g&&row===g.last+1&&g.last-g.first<127)g.last=row;else groups.push({first:row,last:row});});hold(groups.length<=16,'read bundle payload groups exceed bound');groups.forEach(function(g){plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:g.first,last:g.last,column:0,width:L.width});});
    // Adjacent canonical references may be reconstructed in one actual range.
    var compact=[];plans.sort(function(a,b){return a.name.localeCompare(b.name)||a.width-b.width||a.first-b.first;}).forEach(function(p){var g=compact[compact.length-1];if(g&&(!retentionDeclaration||(g.first!==Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')&&p.first!==Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')))&&g.name===p.name&&g.width===p.width&&g.column===p.column&&p.first===g.last+1&&p.last-g.first<500)g.last=p.last;else compact.push(p);});
    hold(compact.length>0&&compact.length<=40,'read bundle exceeds finite forty-range readset');
    var priorRetentionMeasurement=archiveReadset;if(retentionDeclaration)hold(compact.length<=16,'source reconstruction complete union exceeds16 BEFORE read');var measurement=newReadset(),captured=[];for(var offset=0;offset<compact.length;offset+=16)captured=captured.concat(fetchRectWindow(compact.slice(offset,offset+16),measurement));readBundle=captured;readBundleEpoch=lockEpoch;if(retentionDeclaration){retentionReadPlans=compact;retentionReadEvent=freshOrphanSource();retentionReadEvent.rootRaw=retentionDeclaration.plan.rootText;retentionReadEvent.controlRaw=retentionDeclaration.controlRaw;retentionReadEvent.configRaw=retentionDeclaration.configRaw;retentionReadEvent.compatRaw=retentionDeclaration.compatRaw;retentionReadActive=true;archiveReadset=measurement;}
    try{if(retentionDeclaration){canonicalUnionActive=true;canonicalUnionCapture=inheritTerminalEvent(Object.assign({},retentionReadEvent,{items:captured}),retentionReadEvent);completionProof=canonicalUnionCapture;if(retentionDeclaration.terminal)openClosedTerminal(canonicalUnionCapture,captured,compact,retentionDeclaration);assertRetentionReadCapture();capturePreservation(captured,retentionReadEvent);archive.validateSourceRetentionReadPlan(retentionDeclaration.plan);if(retentionDeclaration.terminal){terminalValidationActive=true;archive.validateTerminalControl();terminalValidationActive=false;}completionProof=null;assertRetentionReadCapture();}var out=fn();if(retentionDeclaration)assertRetentionReadCapture();hold(!out||typeof out.then!=='function','read bundle synchronous completion required');hold(lockHeld&&nativeLockHeld()&&lockEpoch===readBundleEpoch,'read bundle held lock changed');checkBudget(1000);return out;}
    finally{readBundle=null;readBundleEpoch=null;if(retentionDeclaration){if(closedTerminalScope&&closedTerminalScope.retentionOwner===retentionDeclaration&&closedTerminalScope.ticket===terminalEventTickets.get(retentionReadEvent))closeTerminalScope();retentionReadPlans=null;retentionReadActive=false;retentionReadEvent=null;completionProof=null;canonicalUnionCapture=null;canonicalUnionReceipt=null;canonicalUnionActive=false;terminalValidationActive=false;terminalProofReceipt=null;terminalOrphanAck=null;terminalOrphanEvent=null;preservationReceipt=null;archiveReadset=priorRetentionMeasurement;}}
  }
  function archiveLiveRect(first,last){var completed=completionCapture('Evidence',first,last,0,26);if(completed)return completed;var bundled=bundleCapture('Evidence',first,last,0,26);if(bundled)return bundled;if(!archiveCanonicalMeta)archiveCanonicalMeta=metadata();var m=archiveCanonicalMeta.Evidence;hold(integer(first,1,m.rowCount)&&integer(last,first,m.rowCount)&&last-first<500,'bounded canonical full26 archive read required');if(!archiveReadset)archiveReadset=newReadset();return fetchRectWindow([{name:'Evidence',sheetId:sheets.Evidence.id,rowCount:m.rowCount,columnCount:m.columnCount,first:first,last:last,column:0,width:26}],archiveReadset)[0].capture;}
  function archiveRect(first,last,column,width){var completed=completionCapture(BackofficeNativeArchiveV2.layout.name,first,last,column,width);if(completed)return completed;if(currentReceipt(archivePostReceipt)&&archivePostReceipt.first===first&&archivePostReceipt.last===last&&archivePostReceipt.column===column&&archivePostReceipt.width===width){var post=copy(archivePostReceipt.capture);archivePostReceipt=null;return post;}var bundled=bundleCapture(BackofficeNativeArchiveV2.layout.name,first,last,column,width);if(bundled)return bundled;if(archiveSnapshotIndex&&first===2&&last===501&&width===1&&column===archiveSnapshotIndex.column){hold(properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===archiveSnapshotIndex.rootRaw&&archiveSnapshotIndex.capture,'snapshot root/index read changed');return copy(archiveSnapshotIndex.capture);}var L=BackofficeNativeArchiveV2.layout,meta=archiveMetadata(false);hold(meta,'archive fixed sheet missing');if(!archiveReadset)archiveReadset=newReadset();hold(integer(first,1,L.rowCount)&&integer(last,first,L.rowCount)&&last-first<500,'bounded fixed archive range required');var out={rows:[],displayRows:[],checkedAt:stamp()},step=width===20?128:500;for(var start=first;start<=last;start+=step){var part=guardedFreshRects([{name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:start,last:Math.min(start+step-1,last),column:column,width:width}],archiveReadset)[0].capture;out.rows=out.rows.concat(part.rows);out.displayRows=out.displayRows.concat(part.displayRows);}return out;}


  var preservationReadBytePlan=null;
  var canonicalMutationEpoch=0,preservationReceipt=null,archivePostReceipt=null,completionProof=null,terminalValidationActive=false,terminalProofReceipt=null,terminalOrphanEvent=null,terminalOrphanAck=null;
  function verifiedControl(v){return !!v&&(v.schema==='BackofficeNativeArchiveMutationVerified/v1'||v.schema==='BackofficeNativeArchiveMutationVerified/v2');}
  // Capture bootstrap uses one actual final snapshot response for the complete
  // prior terminal proof. Earlier windows remain ordinary snapshot data only.
  var captureSeedOwner=null,terminalReadExtra=null;
  function captureBootstrapSnapshot(cfg,handle){
    hold(!captureSeedOwner&&!readBundle&&!completionProof&&!canonicalUnionActive,'capture bootstrap private phase already active');
    assert0259StorageDispositionTerminal();
    var descriptor=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,null),rootRaw=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),controlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),seed=descriptor&&BackofficeNativeArchiveV2.terminalReadDeclaration(rootRaw,controlRaw,sha);
    // Route selection is before reading the union, never a fallback after a
    // failed/uncertain response. Unsupported histories retain the original path.
    if(!seed){archiveMutationFence();return snapshot(cfg,handle);}
    seed.controlRaw=controlRaw;seed.configRaw=properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1');seed.compatRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1');captureSeedOwner=seed;
    try{return snapshot(cfg,handle,null,seed);}finally{captureSeedOwner=null;}
  }
  function validateCaptureSeed(seed,items,event){
    hold(seed===captureSeedOwner&&event&&Array.isArray(items),'capture bootstrap exact private owner missing');
    var L=BackofficeNativeArchiveV2.layout,orphan=items.filter(function(i){return i.plan.type==='ORPHAN';});hold(orphan.length===1,'capture bootstrap complete physical tail missing');
    var both=orphan[0],proofItems=items.filter(function(i){return i!==both;});
    [Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')].concat(seed.payloadRows).forEach(function(row){var offset=row-both.plan.first,p=Object.assign({},both.plan,{first:row,last:row});hold(both.capture.rows[offset]&&both.capture.displayRows[offset],'capture bootstrap actual original coverage missing');proofItems.push({plan:p,capture:{rows:[both.capture.rows[offset]],displayRows:[both.capture.displayRows[offset]],checkedAt:both.capture.checkedAt}});});
    var priorCompletion=completionProof,priorUnion=canonicalUnionActive,priorUnionCapture=canonicalUnionCapture,priorValidation=terminalValidationActive,accepted=false;
    try{
      event.rootRaw=seed.rootText;event.controlRaw=seed.controlRaw;event.configRaw=seed.configRaw;event.compatRaw=seed.compatRaw;
      canonicalUnionActive=true;terminalValidationActive=true;canonicalUnionCapture=inheritTerminalEvent(Object.assign({},event,{items:proofItems}),event);completionProof=canonicalUnionCapture;
      openClosedTerminal(canonicalUnionCapture,proofItems,proofItems.map(function(i){return i.plan;}));capturePreservation(proofItems,event);
      var archive=archiveAdapter();archive.loadIndex();archive.validateTerminalControl();
      hold(properties.getProperty(L.rootKey)===seed.rootText&&properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===seed.controlRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===seed.configRaw,'capture bootstrap authority changed after material proof');
      var descriptor=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,null),v=JSON.parse(seed.controlRaw).pendingMutation;terminalProofReceipt=mintTerminalProof(v,seed.rootText,descriptor);accepted=true;
    }finally{
      completionProof=priorCompletion;canonicalUnionActive=priorUnion;canonicalUnionCapture=priorUnionCapture;terminalValidationActive=priorValidation;
      if(!accepted){closeTerminalScope();terminalProofReceipt=null;terminalOrphanAck=null;terminalOrphanEvent=null;preservationReceipt=null;}
    }
  }
  function captureSourceRetentionTarget(plan){
    hold(plan&&plan.sheet==='Prospects'&&integer(plan.row,6,2000)&&typeof plan.organizationDisplay==='string','source completion exact target declaration missing');wholeRow(plan.expectedTyped,27);
    var original=completionProof,actual=completionCapture('Prospects',plan.row,plan.row,0,27);hold(original&&original===completionProof&&terminalReceiptCurrent(original)&&actual&&actual.rows.length===1&&actual.displayRows.length===1&&sameRows(actual.rows[0],plan.expectedTyped)&&actual.displayRows[0].length===27&&actual.displayRows[0].every(function(v){return typeof v==='string';})&&actual.displayRows[0][1]===plan.organizationDisplay,'canonical changed while source evidence persisted');
    return {sheetId:sheets.Prospects.id,sheetName:'Prospects',row:plan.row,width:27,typedRow:copy(actual.rows[0]),displayRow:copy(actual.displayRows[0]),checkedAt:new Date(original.checkedMs).toISOString()};
  }
  function archiveMutationFence(){hold(lockHeld&&nativeLockHeld(),'held project lock required for archive mutation fence');hold(typeof BackofficeNativeArchiveV2!=='undefined'&&typeof BackofficeNativeArchiveV2.mutationFence==='function','archive preservation mutation fence unavailable');checkBudget();assert0259StorageDispositionTerminal();var p=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,archiveInstance?archiveInstance.mutationScope():null),j=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3');j=j?JSON.parse(j):null;var v=j&&j.pendingMutation;if(v&&verifiedControl(v)&&!canonicalUnionActive&&!terminalValidationActive&&!(archiveInstance&&archiveInstance.mutationScope())&&(terminalReadExtra||!terminalProofCurrent(v,p))){var priorValidationMeasurement=archiveReadset;archiveReadset=newReadset();terminalValidationActive=true;try{var cfg=JSON.parse(properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'));if(!currentUniverse)currentUniverse=configuredUniverse(cfg,null);var a=archiveAdapter();a.setUniverse(currentUniverse);a.setAuthority(archiveAuthority(cfg));a.validateTerminalControl(terminalReadExtra||undefined);terminalProofReceipt=mintTerminalProof(v,properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),p);}catch(e){closeTerminalScope();terminalOrphanAck=null;throw e;}finally{terminalOrphanEvent=null;terminalValidationActive=false;archiveReadset=priorValidationMeasurement;}}return p;}

  function closeTerminalScope(){closedTerminalBoundaryEpoch++;closedTerminalScope=null;}
  function ticketTerminalEvent(r){terminalEventTickets.set(r,{generation:closedTerminalBoundaryEpoch,origin:r});return r;}
  function terminalTicketCurrent(r){var t=terminalEventTickets.get(r);return t&&t.generation===closedTerminalBoundaryEpoch;}
  function inheritTerminalEvent(r,origin){hold(terminalTicketCurrent(origin),'closed terminal original event retired');terminalEventTickets.set(r,terminalEventTickets.get(origin));return r;}
  // Private complete-terminal CPU scope. This is not a source/eligibility receipt.
  // Its original actual GET timestamp is never renewed. Generic five-second
  // receipts below remain unchanged; only explicitly owned objects use this scope.
  function closedTerminalProperty(k,raw){var q=closedTerminalScope;if(!q)return;if(!Object.prototype.hasOwnProperty.call(q.raw,k)||q.raw[k]!==raw){closeTerminalScope();hold(false,'closed terminal raw authority changed');}q.propertyReadEpoch=preflightPropertyReadEpoch;}
  function openClosedTerminal(event,items,plans,retentionOwner){
    var retentionOwned=retentionOwner!==undefined,completePlans=plans,original=null,originalTicket=null;
    try{if(retentionOwned){original=retentionReadEvent;originalTicket=original&&terminalEventTickets.get(original);hold(retentionOwner===retentionDeclarationToken&&retentionOwner&&retentionOwner.terminal&&retentionReadActive&&canonicalUnionActive&&event===canonicalUnionCapture&&event===completionProof&&items===readBundle&&event&&event.items===items&&Array.isArray(retentionReadPlans)&&retentionReadPlans.length>0&&retentionReadPlans.length<=16&&original&&terminalTicketCurrent(original)&&terminalEventTickets.get(event)===originalTicket,'source reconstruction private complete owner changed');hold(original.rootRaw===retentionOwner.plan.rootText&&original.controlRaw===retentionOwner.controlRaw&&original.configRaw===retentionOwner.configRaw&&event.rootRaw===original.rootRaw&&event.controlRaw===original.controlRaw&&event.configRaw===original.configRaw&&event.checkedMs===original.checkedMs&&event.lockEpoch===original.lockEpoch&&event.mutationEpoch===original.mutationEpoch&&event.actionEpoch===original.actionEpoch&&event.getAttempts===original.getAttempts&&event.frameEpoch===original.frameEpoch,'source reconstruction original event/declaration changed');if(closedTerminalScope)hold(closedTerminalScope.retentionOwner===retentionOwner&&closedTerminalScope.ticket===originalTicket&&closedTerminalCurrent(closedTerminalScope.event),'source reconstruction prior owned scope retired');var L=BackofficeNativeArchiveV2.layout,terminal=retentionOwner.terminal,declaredControl=JSON.parse(original.controlRaw),v=declaredControl&&declaredControl.pendingMutation,root=JSON.parse(original.rootRaw);hold(terminal.rootText===original.rootRaw&&terminal.rootText===retentionOwner.plan.rootText&&terminal.bank===retentionOwner.plan.bank&&terminal.bank===root.bank&&v&&verifiedControl(v)&&v.terminalRootText===original.rootRaw&&v.postcondition&&Array.isArray(v.postcondition.canonicalRows)&&Array.isArray(terminal.canonicalRows)&&JSON.stringify(terminal.canonicalRows)===JSON.stringify(v.postcondition.canonicalRows)&&terminal.controlSha256===sha(JSON.stringify(v))&&Array.isArray(terminal.payloadRows)&&Array.isArray(terminal.canonicalRows)&&Array.isArray(retentionOwner.plan.payloadRows),'source reconstruction exact terminal declaration changed');function covered(name,row,column,width){return retentionReadPlans.filter(function(p){return p.name===name&&p.first<=row&&p.last>=row&&p.column===column&&p.width===width;}).length===1;}hold(covered(L.name,2,terminal.bank==='A'?0:1,1)&&covered(L.name,501,terminal.bank==='A'?0:1,1)&&terminal.payloadRows.concat(retentionOwner.plan.payloadRows).every(function(row){return integer(row,503,L.rowCount)&&covered(L.name,row,0,20);})&&terminal.canonicalRows.concat([retentionOwner.plan.metadataRow]).every(function(row){return integer(row,6,12000)&&covered('Evidence',row,0,26);}), 'source reconstruction complete terminal declaration coverage changed');completePlans=retentionReadPlans;}
    hold((retentionOwned||terminalValidationActive)&&event&&Array.isArray(items)&&Array.isArray(plans)&&terminalTicketCurrent(event),'closed terminal declared original owner required');
    var L=BackofficeNativeArchiveV2.layout;hold(completePlans.some(function(p){return p.name===L.name&&p.first===2&&p.last===501&&p.width===1&&(p.column===0||p.column===1);})&&items.some(function(i){return samePlan(i.plan,preservedPlan());})&&completePlans.concat(retentionOwned?plans:[]).every(function(p){for(var row=p.first;row<=p.last;row++){var count=items.filter(function(i){return i.plan.name===p.name&&i.plan.sheetId===p.sheetId&&i.plan.first<=row&&i.plan.last>=row&&i.plan.column===p.column&&i.plan.width===p.width;}).length;if(count!==1)return false;}return true;}),'closed terminal complete declared union missing');
    var raw=Object.create(null);[L.rootKey,'FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3','FERNAIN_NATIVE_RUNTIME_CONFIG_V1','FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1'].forEach(function(k){raw[k]=retentionOwned?retentionValidationRawProperty(k):properties.getProperty(k);});
    hold(terminalTicketCurrent(event),'closed terminal original event retired during opening');
    if(retentionOwned)hold(terminalTicketCurrent(original)&&terminalEventTickets.get(event)===originalTicket&&terminalEventTickets.get(original)===originalTicket&&raw[L.rootKey]===original.rootRaw&&raw['FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3']===original.controlRaw&&raw['FERNAIN_NATIVE_RUNTIME_CONFIG_V1']===original.configRaw&&raw['FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1']===original.compatRaw,'source reconstruction opening raw authority/ticket changed');
    closedTerminalScope={ticket:terminalEventTickets.get(event),boundaryEpoch:closedTerminalBoundaryEpoch,event:event,checkedMs:event.checkedMs,lockEpoch:event.lockEpoch,mutationEpoch:event.mutationEpoch,actionEpoch:event.actionEpoch,getAttempts:event.getAttempts,frameEpoch:event.frameEpoch,members:new WeakSet(),raw:raw,propertyReadEpoch:preflightPropertyReadEpoch,deadline:budgetDeadline,retentionOwner:retentionOwned?retentionOwner:null};closedTerminalScope.members.add(event);closedTerminalMembers.add(event);
    hold(closedTerminalCurrent(event),'closed terminal original event changed');
    if(retentionOwned)tagClosedTerminal(original,'RETENTION_ORIGINAL_EVENT');
    [terminalOrphanEvent,preservationReceipt].forEach(function(r){var d=r&&terminalDerivedOrigins.get(r);if(d&&d.ticket===closedTerminalScope.ticket&&d.rootRaw===raw[L.rootKey]&&d.controlRaw===raw['FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3']&&d.configRaw===raw['FERNAIN_NATIVE_RUNTIME_CONFIG_V1']&&d.compatRaw===raw['FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1'])tagClosedTerminal(r,r===terminalOrphanEvent?'OPEN_TERMINAL_ORPHAN_EVENT':'OPEN_PRESERVATION_RECEIPT');});
    }catch(error){if(retentionOwned)closeTerminalScope();throw error;}
  }
  function derivedClosedTerminal(r,origin,identity,caller){if(origin){hold(terminalTicketCurrent(origin),'closed terminal derived original retired');terminalDerivedOrigins.set(r,{ticket:terminalEventTickets.get(origin),rootRaw:identity.rootRaw,controlRaw:identity.controlRaw,configRaw:identity.configRaw,compatRaw:identity.compatRaw});}return origin?tagClosedTerminal(r,caller):r;}
  function terminalCheckedMs(){return closedTerminalScope?closedTerminalScope.checkedMs:Date.now();}
  function tagClosedTerminal(r,caller){var q=closedTerminalScope;if(q&&r){hold(closedTerminalCurrent(q.event),'closed terminal tag event changed');
    var fields=['checkedMs','lockEpoch','mutationEpoch','actionEpoch','getAttempts','frameEpoch'],roles=['RETENTION_DERIVED_COMPLETION','RETENTION_ORIGINAL_EVENT','OPEN_TERMINAL_ORPHAN_EVENT','OPEN_PRESERVATION_RECEIPT','CAPTURE_TERMINAL_ORPHAN_EVENT','SOURCE_PRESERVATION_RECEIPT','INDEPENDENT_PRESERVATION_RECEIPT','TERMINAL_ORPHAN_ACK','TERMINAL_PROOF_RECEIPT','TERMINAL_COMPLETION_PROOF'];
    var o={schema:'BackofficeClosedTerminalMemberObservation/v1',caller:roles.indexOf(caller)>=0?caller:'UNKNOWN',checks:{},values:{},firstMismatch:null,observationOnly:true,sourceAuthority:false,sendAuthority:false};fields.forEach(function(k){o.checks[k]='NOT_EVALUATED';});
    function scalar(v){return typeof v==='number'&&Number.isSafeInteger(v)?{type:'SAFE_INTEGER',value:v}:{type:typeof v};}
    function equal(k,actual,expected){var same=actual===expected;o.checks[k]=same?'PASS':'FAIL';o.values[k]={actual:scalar(actual),expected:scalar(expected)};if(!same)o.firstMismatch=k;return same;}
    var accepted=equal('checkedMs',r.checkedMs,q.checkedMs)&&equal('lockEpoch',r.lockEpoch,q.lockEpoch)&&equal('mutationEpoch',r.mutationEpoch,q.mutationEpoch)&&equal('actionEpoch',r.actionEpoch,q.actionEpoch)&&equal('getAttempts',r.getAttempts,q.getAttempts)&&equal('frameEpoch',r.frameEpoch,q.frameEpoch);
    if(!accepted){try{Logger.log('FERNAIN_CLOSED_TERMINAL_MEMBER_V1:'+JSON.stringify(o));}catch(ignore){}}
    hold(accepted,'closed terminal exact owned member changed');q.members.add(r);closedTerminalMembers.add(r);}return r;}
  // Failure-only observations. Values come only from the original evaluated
  // operands. This is neither proof authority nor a new clock/validation gate.
  function proofObservation(boundary,checks){var o={schema:'BackofficeNativeSourcePathPredicate/v1',boundary:boundary,route:'NOT_EVALUATED',stage:'ENTRY',outcome:'NOT_EVALUATED',checks:{},values:{},clock:'DATE_NOW_WALL_CLOCK_ORIGINAL_SAMPLES'};checks.forEach(function(k){o.checks[k]='NOT_EVALUATED';});return o;}
  function proofCheck(o,k,v){if(o)o.checks[k]=v?'PASS':'FAIL';return v;}
  function proofNumber(o,k,v){if(o)o.values[k]=typeof v==='number'&&Number.isFinite(v)?{number:Math.max(-9999999999999,Math.min(9999999999999,v)),clipped:v<-9999999999999||v>9999999999999}:null;return v;}
  function proofEqual(o,k,actual,expected){if(o){proofNumber(o,k+'.original',actual);proofNumber(o,k+'.current',expected);}return proofCheck(o,k,actual===expected);}
  function proofEmit(o,outcome){if(!o||o.emitted)return;o.emitted=true;o.outcome=outcome;try{Logger.log('FERNAIN_SOURCE_PATH_PREDICATE_V1:'+JSON.stringify(o));}catch(ignore){}}
  function currentReceiptObserved(r,o){return proofCheck(o,'generic.present',r)&&proofCheck(o,'generic.localLock',lockHeld)&&proofCheck(o,'generic.nativeLock',nativeLockHeld())&&proofEqual(o,'generic.lockEpoch',r.lockEpoch,lockEpoch)&&proofEqual(o,'generic.mutationEpoch',r.mutationEpoch,canonicalMutationEpoch)&&proofCheck(o,'generic.ageWithin5000',proofNumber(o,'generic.age',proofNumber(o,'generic.ageClock',Date.now())-r.checkedMs)<=5000);}
  function closedTerminalObserved(r,o){
    var q=closedTerminalScope;if(!proofCheck(o,'closed.scopePresent',q)||!proofCheck(o,'closed.receiptPresent',r)||!proofCheck(o,'closed.member',q.members.has(r)))return false;
    var age=proofNumber(o,'closed.initialAge',proofNumber(o,'closed.initialAgeClock',Date.now())-q.checkedMs);
    if(!proofCheck(o,'closed.initialFiniteAge',Number.isFinite(age))||proofCheck(o,'closed.initialNegativeAge',age<0)||proofCheck(o,'closed.initialDeadlineReached',proofNumber(o,'closed.initialDeadlineClock',Date.now())>=proofNumber(o,'closed.initialDeadline',q.deadline))){closeTerminalScope();return false;}
    hold(proofCheck(o,'closed.localLock',lockHeld)&&proofCheck(o,'closed.nativeLockTrue',nativeLockHeld()===true),'closed terminal held lock changed');
    age=proofNumber(o,'closed.afterLockAge',proofNumber(o,'closed.afterLockAgeClock',Date.now())-q.checkedMs);
    var valid=proofCheck(o,'closed.sameScope',closedTerminalScope===q)&&proofEqual(o,'closed.boundaryEpoch',q.boundaryEpoch,closedTerminalBoundaryEpoch)&&proofCheck(o,'closed.sameTicket',terminalEventTickets.get(q.event)===q.ticket)&&proofEqual(o,'closed.ticketGeneration',q.ticket.generation,q.boundaryEpoch)&&proofCheck(o,'closed.afterLockFiniteAge',Number.isFinite(age))&&proofCheck(o,'closed.afterLockNonfuture',age>=0)&&proofCheck(o,'closed.beforeDeadline',proofNumber(o,'closed.afterLockDeadlineClock',Date.now())<proofNumber(o,'closed.afterLockDeadline',q.deadline))&&proofEqual(o,'closed.actionDeadline',q.deadline,budgetDeadline)&&proofEqual(o,'closed.eventOriginalTimestamp',q.event.checkedMs,q.checkedMs)&&proofEqual(o,'closed.memberOriginalTimestamp',r.checkedMs,q.checkedMs)&&proofEqual(o,'closed.memberLockEpoch',r.lockEpoch,q.lockEpoch)&&proofEqual(o,'closed.memberMutationEpoch',r.mutationEpoch,q.mutationEpoch)&&proofEqual(o,'closed.memberActionEpoch',r.actionEpoch,q.actionEpoch)&&proofEqual(o,'closed.memberGET',r.getAttempts,q.getAttempts)&&proofEqual(o,'closed.memberFrame',r.frameEpoch,q.frameEpoch)&&proofEqual(o,'closed.currentLockEpoch',q.event.lockEpoch,lockEpoch)&&proofEqual(o,'closed.currentMutationEpoch',q.event.mutationEpoch,canonicalMutationEpoch)&&proofEqual(o,'closed.currentActionEpoch',q.event.actionEpoch,budgetStarted)&&proofEqual(o,'closed.currentGET',q.event.getAttempts,sheetsReadStats.attempts)&&proofEqual(o,'closed.currentFrame',q.event.frameEpoch,authorityFrameEpoch)&&proofEqual(o,'closed.rawPropertyReadEpoch',q.propertyReadEpoch,preflightPropertyReadEpoch);
    if(!valid){closeTerminalScope();return false;}return true;
  }
  function receiptObservation(boundary){return proofObservation(boundary,['route.present','route.tagged','generic.present','generic.localLock','generic.nativeLock','generic.lockEpoch','generic.mutationEpoch','generic.ageWithin5000','closed.scopePresent','closed.receiptPresent','closed.member','closed.initialFiniteAge','closed.initialNegativeAge','closed.initialDeadlineReached','closed.localLock','closed.nativeLockTrue','closed.sameScope','closed.boundaryEpoch','closed.sameTicket','closed.ticketGeneration','closed.afterLockFiniteAge','closed.afterLockNonfuture','closed.beforeDeadline','closed.actionDeadline','closed.eventOriginalTimestamp','closed.memberOriginalTimestamp','closed.memberLockEpoch','closed.memberMutationEpoch','closed.memberActionEpoch','closed.memberGET','closed.memberFrame','closed.currentLockEpoch','closed.currentMutationEpoch','closed.currentActionEpoch','closed.currentGET','closed.currentFrame','closed.rawPropertyReadEpoch']);}

  function closedTerminalCurrent(r,observation){
    if(observation)return closedTerminalObserved(r,observation);
    var q=closedTerminalScope;if(!q||!r||!q.members.has(r))return false;
    var age=Date.now()-q.checkedMs;
    if(!Number.isFinite(age)||age<0||Date.now()>=q.deadline){closeTerminalScope();return false;}
    hold(lockHeld&&nativeLockHeld()===true,'closed terminal held lock changed');
    age=Date.now()-q.checkedMs;
    var valid=closedTerminalScope===q&&q.boundaryEpoch===closedTerminalBoundaryEpoch&&terminalEventTickets.get(q.event)===q.ticket&&q.ticket.generation===q.boundaryEpoch&&Number.isFinite(age)&&age>=0&&Date.now()<q.deadline&&q.deadline===budgetDeadline&&q.event.checkedMs===q.checkedMs&&r.checkedMs===q.checkedMs&&r.lockEpoch===q.lockEpoch&&r.mutationEpoch===q.mutationEpoch&&r.actionEpoch===q.actionEpoch&&r.getAttempts===q.getAttempts&&r.frameEpoch===q.frameEpoch&&q.event.lockEpoch===lockEpoch&&q.event.mutationEpoch===canonicalMutationEpoch&&q.event.actionEpoch===budgetStarted&&q.event.getAttempts===sheetsReadStats.attempts&&q.event.frameEpoch===authorityFrameEpoch&&q.propertyReadEpoch===preflightPropertyReadEpoch;
    if(!valid){closeTerminalScope();return false;}
    return true;
  }
  function terminalEventCurrent(r){return r&&closedTerminalMembers.has(r)?closedTerminalCurrent(r):orphanSourceCurrent(r);}
  function terminalReceiptCurrent(r,observation){if(observation){var tagged=proofCheck(observation,'route.present',r)&&proofCheck(observation,'route.tagged',closedTerminalMembers.has(r));observation.route=tagged?'CLOSED_TERMINAL':'GENERIC_RECEIPT';return tagged?closedTerminalCurrent(r,observation):currentReceipt(r,observation);}return r&&closedTerminalMembers.has(r)?closedTerminalCurrent(r):currentReceipt(r);}
  function terminalIdentityCurrent(r,p){return terminalEventCurrent(r)&&p&&r.descriptorSha256===sha(JSON.stringify(p))&&r.rangeSha256===sha(JSON.stringify(preservedPlan()))&&r.typedSha256===p.fullTyped20Sha256&&r.displaySha256===p.fullDisplay20Sha256&&r.headerSha256===p.headerSha256&&r.rootRaw===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)&&r.controlRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')&&r.configRaw===properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')&&r.compatRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')&&BackofficeNativeArchiveV2.configCompatible(p,r.configRaw,r.compatRaw,sha)&&terminalEventCurrent(r);}
  function orphanSourceCurrent(r,observation){var age=r?Date.now()-r.checkedMs:-1;if(!observation)return !!r&&age>=0&&age<=5000&&lockHeld&&nativeLockHeld()&&r.lockEpoch===lockEpoch&&r.mutationEpoch===canonicalMutationEpoch&&r.actionEpoch===budgetStarted&&r.getAttempts===sheetsReadStats.attempts&&r.frameEpoch===authorityFrameEpoch;
    observation.age=Number.isFinite(age)?{milliseconds:Math.max(-110001,Math.min(110001,age)),clipped:age<-110001||age>110001,negative:age<0}:{milliseconds:null,clipped:false,negative:age<0};
    return retentionPredicate(observation,'present',!!r)&&retentionPredicate(observation,'ageNonfuture',age>=0)&&retentionPredicate(observation,'ageWithin5000',age<=5000)&&retentionPredicate(observation,'localLock',lockHeld)&&retentionPredicate(observation,'nativeLock',nativeLockHeld())&&retentionEpoch(observation,'lockEpoch',r.lockEpoch,lockEpoch)&&retentionEpoch(observation,'mutationEpoch',r.mutationEpoch,canonicalMutationEpoch)&&retentionEpoch(observation,'actionEpoch',r.actionEpoch,budgetStarted)&&retentionEpoch(observation,'getAttempts',r.getAttempts,sheetsReadStats.attempts)&&retentionEpoch(observation,'frameEpoch',r.frameEpoch,authorityFrameEpoch);
  }
  function retentionPredicate(observation,name,value){observation.checks[name]=value?'PASS':'FAIL';return value;}
  function retentionEpoch(observation,name,actual,expected){observation.epochs[name]={original:Number.isSafeInteger(actual)?actual:null,current:Number.isSafeInteger(expected)?expected:null};return retentionPredicate(observation,name,actual===expected);}
  function retentionCurrentObservation(){var o={age:'NOT_EVALUATED',checks:{},epochs:{}};['present','ageNonfuture','ageWithin5000','localLock','nativeLock','lockEpoch','mutationEpoch','actionEpoch','getAttempts','frameEpoch'].forEach(function(k){o.checks[k]='NOT_EVALUATED';});return o;}
  function freshOrphanSource(){return ticketTerminalEvent({lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,actionEpoch:budgetStarted,getAttempts:sheetsReadStats.attempts,frameEpoch:authorityFrameEpoch,checkedMs:Date.now()});}
  function exactOrphanIdentity(r,p){return orphanSourceCurrent(r)&&p&&r.descriptorSha256===sha(JSON.stringify(p))&&r.rangeSha256===sha(JSON.stringify(preservedPlan()))&&r.typedSha256===p.fullTyped20Sha256&&r.displaySha256===p.fullDisplay20Sha256&&r.headerSha256===p.headerSha256&&r.rootRaw===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)&&r.controlRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')&&r.configRaw===properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')&&r.compatRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')&&BackofficeNativeArchiveV2.configCompatible(p,r.configRaw,r.compatRaw,sha);}
  // Failure-only finite observation of the existing terminal predicate. Each
  // wrapper returns its original value; skipped terms never perform a new RPC.
  function terminalPredicateRecord(d, name, value) {
    d.checks[name] = value ? 'PASS' : 'FAIL';
    if (!value && d.firstFailed === null) d.firstFailed = name;
    return value;
  }
  function terminalPredicateAge(d, name, age) {
    d.ages[name] = Number.isFinite(age) ? {
      milliseconds:Math.max(-110001,Math.min(110001,age)),
      clipped:age < -110001 || age > 110001, negative:age < 0
    } : {milliseconds:null,clipped:false,negative:age < 0};
  }
  function terminalObservedLock(d,prefix) {
    var before=lockStats.nativeLockMs, held=nativeLockHeld();
    var elapsed=lockStats.nativeLockMs-before;
    d.nativeLockMilliseconds[prefix]=Number.isFinite(elapsed) ?
      Math.max(-110001,Math.min(110001,elapsed)) : null;
    return held;
  }
  function terminalObservedCurrent(r,d,prefix) {
    var age=r?Date.now()-r.checkedMs:-1;
    terminalPredicateAge(d,prefix,age);
    if(r&&closedTerminalMembers.has(r)){d.freshness='CLOSED_TERMINAL_ORIGINAL_EVENT_ACTION_DEADLINE';var detail=receiptObservation(d.compound==='SCALAR_MINT'?'TERMINAL_SCALAR_MINT':'TERMINAL_COMPLETION');detail.route='CLOSED_TERMINAL';if(!d.closedDetails)d.closedDetails={};d.closedDetails[prefix]=detail;try{return terminalPredicateRecord(d,prefix+'.closedScope',closedTerminalCurrent(r,detail));}catch(error){proofEmit(detail,'THREW');throw error;}}
    return terminalPredicateRecord(d,prefix+'.present',!!r) &&
      terminalPredicateRecord(d,prefix+'.age',age>=0&&age<=5000) &&
      terminalPredicateRecord(d,prefix+'.localLock',lockHeld) &&
      terminalPredicateRecord(d,prefix+'.nativeLock',terminalObservedLock(d,prefix)) &&
      terminalPredicateRecord(d,prefix+'.lockEpoch',r.lockEpoch===lockEpoch) &&
      terminalPredicateRecord(d,prefix+'.mutationEpoch',r.mutationEpoch===canonicalMutationEpoch) &&
      terminalPredicateRecord(d,prefix+'.actionEpoch',r.actionEpoch===budgetStarted) &&
      terminalPredicateRecord(d,prefix+'.getAttempts',r.getAttempts===sheetsReadStats.attempts) &&
      terminalPredicateRecord(d,prefix+'.frameEpoch',r.frameEpoch===authorityFrameEpoch);
  }
  function terminalObservedIdentity(r,p,d) {
    return terminalObservedCurrent(r,d,'orphan') &&
      terminalPredicateRecord(d,'identity.descriptorPresent',p) &&
      terminalPredicateRecord(d,'identity.descriptor',r.descriptorSha256===sha(JSON.stringify(p))) &&
      terminalPredicateRecord(d,'identity.range',r.rangeSha256===sha(JSON.stringify(preservedPlan()))) &&
      terminalPredicateRecord(d,'identity.typed',r.typedSha256===p.fullTyped20Sha256) &&
      terminalPredicateRecord(d,'identity.display',r.displaySha256===p.fullDisplay20Sha256) &&
      terminalPredicateRecord(d,'identity.header',r.headerSha256===p.headerSha256) &&
      terminalPredicateRecord(d,'identity.root',r.rootRaw===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)) &&
      terminalPredicateRecord(d,'identity.control',r.controlRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')) &&
      terminalPredicateRecord(d,'identity.config',r.configRaw===properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')) &&
      terminalPredicateRecord(d,'identity.compatibility',r.compatRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')) &&
      terminalPredicateRecord(d,'identity.configDigest',BackofficeNativeArchiveV2.configCompatible(p,r.configRaw,r.compatRaw,sha)) &&
(!closedTerminalMembers.has(r)||terminalPredicateRecord(d,'orphan.closedScope',closedTerminalCurrent(r,(function(){var detail=receiptObservation(d.compound==='SCALAR_MINT'?'TERMINAL_SCALAR_MINT':'TERMINAL_COMPLETION');detail.route='CLOSED_TERMINAL';if(!d.closedDetails)d.closedDetails={};d.closedDetails['orphan.final']=detail;return detail;}()))));
  }
  function terminalPredicateDiagnostic() {
    var d={schema:'BackofficeTerminalOrphanPredicateFailure/v1',
      category:'ARCHIVE_TERMINAL_EVENT_FRESHNESS',compound:'COMPLETE',firstFailed:null,checks:{},
      ages:{completion:null,orphan:null},nativeLockMilliseconds:{completion:null,orphan:null},nativeLockTiming:'NATIVE_LOCK_RPC_DURATION',clock:'DATE_NOW_WALL_CLOCK',ageSampling:'PRE_NATIVE_LOCK'};
    ['completion.closedScope','orphan.closedScope','completion.present','completion.age','completion.localLock','completion.nativeLock',
      'completion.lockEpoch','completion.mutationEpoch','completion.actionEpoch',
      'completion.getAttempts','completion.frameEpoch','proof.present','proof.sameGET',
      'proof.sameFrame','orphan.guardConsumed','orphan.present','orphan.age',
      'orphan.localLock','orphan.nativeLock','orphan.lockEpoch','orphan.mutationEpoch',
      'orphan.actionEpoch','orphan.getAttempts','orphan.frameEpoch',
      'identity.descriptorPresent','identity.descriptor','identity.range','identity.typed',
      'identity.display','identity.header','identity.root','identity.control',
      'identity.config','identity.compatibility','identity.configDigest','mint.finalAccepted','mint.guardConsumed',
      'mint.rootText','mint.controlDigest'].forEach(function(name){d.checks[name]='NOT_EVALUATED';});
    return d;
  }
  function terminalOrphanComplete(v){hold(!!terminalOrphanEvent,'same-event terminal orphan stamp missing after validation');var r=terminalOrphanEvent,p;try{p=currentStorageDescriptor();}catch(error){var descriptorObservation=proofObservation('TERMINAL_COMPLETION',[]);descriptorObservation.stage='STORAGE_DESCRIPTOR';proofEmit(descriptorObservation,'THREW');throw error;}var d=terminalPredicateDiagnostic();var predicateLogged=false;try{var complete=terminalPredicateRecord(d,'proof.present',completionProof)&&terminalObservedCurrent(completionProof,d,'completion')&&terminalPredicateRecord(d,'proof.sameGET',completionProof.getAttempts===r.getAttempts)&&terminalPredicateRecord(d,'proof.sameFrame',completionProof.frameEpoch===r.frameEpoch)&&terminalPredicateRecord(d,'orphan.guardConsumed',r.guardConsumed===true)&&terminalObservedIdentity(r,p,d);if(!complete){predicateLogged=true;try{Logger.log('FERNAIN_TERMINAL_ORPHAN_PREDICATE_V1:'+JSON.stringify(d));}catch(_){}}hold(complete,'same-event independent terminal/orphan completion missing');hold(v&&verifiedControl(v)&&v.terminalRootText===r.rootRaw&&sha(JSON.stringify(v))===sha(JSON.stringify(JSON.parse(r.controlRaw).pendingMutation)),'terminal orphan completion control changed');r.finalTerminalAccepted=true;r.terminalControlSha256=sha(JSON.stringify(v));}catch(error){if(!predicateLogged){d.outcome='THREW';try{Logger.log('FERNAIN_TERMINAL_ORPHAN_PREDICATE_V1:'+JSON.stringify(d));}catch(ignore){}}throw error;}}
  function mintTerminalOrphan(v,rootText,p){hold(!!terminalOrphanEvent,'same-event terminal orphan stamp missing before scalar mint');var r=terminalOrphanEvent,d=terminalPredicateDiagnostic();d.compound='SCALAR_MINT';d.category='ARCHIVE_TERMINAL_MINT_CHANGED';var predicateLogged=false;try{var accepted=terminalPredicateRecord(d,'mint.finalAccepted',r.finalTerminalAccepted===true)&&terminalPredicateRecord(d,'mint.guardConsumed',r.guardConsumed===true)&&terminalObservedIdentity(r,p,d)&&terminalPredicateRecord(d,'mint.rootText',rootText===r.rootRaw)&&terminalPredicateRecord(d,'mint.controlDigest',sha(JSON.stringify(v))===r.terminalControlSha256);if(!accepted){predicateLogged=true;try{Logger.log('FERNAIN_TERMINAL_ORPHAN_PREDICATE_V1:'+JSON.stringify(d));}catch(_){}}hold(accepted,'same-event terminal orphan scalar mint changed');terminalOrphanAck=tagClosedTerminal({lockEpoch:r.lockEpoch,mutationEpoch:r.mutationEpoch,actionEpoch:r.actionEpoch,getAttempts:r.getAttempts,frameEpoch:r.frameEpoch,checkedMs:r.checkedMs,descriptorSha256:r.descriptorSha256,rangeSha256:r.rangeSha256,typedSha256:r.typedSha256,displaySha256:r.displaySha256,headerSha256:r.headerSha256,rootRaw:r.rootRaw,controlRaw:r.controlRaw,configRaw:r.configRaw,terminalControlSha256:r.terminalControlSha256},'TERMINAL_ORPHAN_ACK');}catch(error){if(!predicateLogged){d.outcome='THREW';try{Logger.log('FERNAIN_TERMINAL_ORPHAN_PREDICATE_V1:'+JSON.stringify(d));}catch(ignore){}}throw error;}}
  function consumeTerminalOrphan(p){var r=terminalOrphanAck;if(!r)return false;var j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null'),v=j&&j.pendingMutation;if(!v||!verifiedControl(v)||!terminalProofCurrent(v,p)||!terminalIdentityCurrent(r,p)||r.terminalControlSha256!==sha(JSON.stringify(v))){terminalOrphanAck=null;return false;}terminalOrphanAck=null;terminalOrphanEvent=null;terminalProofReceipt=null;closeTerminalScope();return true;}
  function currentStorageDescriptor(){return BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,archiveInstance?archiveInstance.mutationScope():null);}
  function sameStorageAuthority(p,r){return !!p&&!!r&&p.configSha256===r.configSha256&&sha(JSON.stringify(p))===r.descriptorSha256;}
  function mintTerminalProof(v,rootText,p){var identity={configSha256:p&&p.configSha256,descriptorSha256:p?sha(JSON.stringify(p)):null};hold(sameStorageAuthority(currentStorageDescriptor(),identity),'validated storage authority changed before scalar acknowledgment');hold(rootText===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),'validated terminal root changed before scalar acknowledgment');var j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null');hold(j&&j.pendingMutation&&sha(JSON.stringify(j.pendingMutation))===sha(JSON.stringify(v)),'validated terminal control changed before scalar acknowledgment');mintTerminalOrphan(v,rootText,p);return tagClosedTerminal({lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,actionEpoch:budgetStarted,checkedMs:terminalCheckedMs(),controlSha256:sha(JSON.stringify(v)),rootText:rootText,getAttempts:sheetsReadStats.attempts,frameEpoch:authorityFrameEpoch,configSha256:identity.configSha256,descriptorSha256:identity.descriptorSha256},'TERMINAL_PROOF_RECEIPT');}
  function terminalProofCurrent(v,p){var r=terminalProofReceipt,age=r?Date.now()-r.checkedMs:-1;return !!r&&((closedTerminalMembers.has(r))?closedTerminalCurrent(r):age>=0&&age<=5000&&currentReceipt(r))&&r.actionEpoch===budgetStarted&&r.getAttempts===sheetsReadStats.attempts&&r.controlSha256===sha(JSON.stringify(v))&&r.rootText===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)&&sameStorageAuthority(p===undefined?currentStorageDescriptor():p,r)&&terminalReceiptCurrent(r);}
  // Forward native Archive property calls unchanged. A raw same-value or
  // uncertain commit is a boundary for scalar authority, not for owned captures.
  var archiveOwnedProperties={getProperty:function(k){return properties.getProperty(k);},getProperties:function(){return properties.getProperties();},setProperty:function(k,v){terminalProofReceipt=null;try{return properties.setProperty(k,v);}finally{terminalProofReceipt=null;}},deleteProperty:function(k){terminalProofReceipt=null;try{return properties.deleteProperty(k);}finally{terminalProofReceipt=null;}}};
  function preservedPlan(){var L=BackofficeNativeArchiveV2.layout;return {name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),last:Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),column:0,width:20};}
  function samePlan(a,b){return a.name===b.name&&a.sheetId===b.sheetId&&a.first===b.first&&a.last===b.last&&a.column===b.column&&a.width===b.width;}
  function currentReceipt(r,observation){if(observation)return currentReceiptObserved(r,observation);return r&&lockHeld&&nativeLockHeld()&&r.lockEpoch===lockEpoch&&r.mutationEpoch===canonicalMutationEpoch&&Date.now()-r.checkedMs<=5000;}
  function capturePreservation(items,sourceEvent){if(sourceEvent)hold(terminalEventCurrent(sourceEvent),'fresh orphan DTO source event changed BEFORE fence');var p=archiveMutationFence();if(sourceEvent)hold(terminalEventCurrent(sourceEvent),'fresh orphan DTO source event changed AFTER fence');if(!p){preservationReceipt=null;return;}var plan=preservedPlan(),matches=items.filter(function(i){return samePlan(i.plan,plan);});hold(matches.length===1,'fresh exact orphan range missing/duplicated');var c=matches[0].capture;hold(Array.isArray(c.rows)&&c.rows.length===1&&Array.isArray(c.displayRows)&&c.displayRows.length===1&&Array.isArray(c.displayRows[0])&&c.displayRows[0].length===20&&c.displayRows[0].every(function(v){return typeof v==='string';}),'fresh exact orphan typed/display coverage changed');wholeRow(c.rows[0],20);hold(sha(JSON.stringify(c.rows[0]))===p.fullTyped20Sha256&&sha(JSON.stringify(c.displayRows[0]))===p.fullDisplay20Sha256&&own(c.rows[0][0],'stringValue')&&sha(c.rows[0][0].stringValue)===p.headerSha256,'preserved archive slot exact bytes/header changed; KEEP');preservationReadBytePlan={descriptorSha256:sha(JSON.stringify(p)),bytes:utf8Length(JSON.stringify({startRow:Number('{{CONFIGURE_PRIVATE_ARCHIVE_PREVIOUS_ROW}}'),startColumn:0,rowData:[{values:c.rows[0].map(function(cell,i){return {userEnteredValue:cell,formattedValue:c.displayRows[0][i]};})}]}))+2048};if(sourceEvent){hold(terminalEventCurrent(sourceEvent),'fresh orphan source event changed during exact bytes checks');var priorEvent=terminalOrphanEvent,event={lockEpoch:sourceEvent.lockEpoch,mutationEpoch:sourceEvent.mutationEpoch,actionEpoch:sourceEvent.actionEpoch,getAttempts:sourceEvent.getAttempts,frameEpoch:sourceEvent.frameEpoch,checkedMs:sourceEvent.checkedMs,descriptorSha256:sha(JSON.stringify(p)),rangeSha256:sha(JSON.stringify(plan)),typedSha256:p.fullTyped20Sha256,displaySha256:p.fullDisplay20Sha256,headerSha256:p.headerSha256,rootRaw:properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),controlRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')};if(priorEvent&&priorEvent.finalTerminalAccepted===true&&priorEvent.getAttempts===event.getAttempts&&priorEvent.frameEpoch===event.frameEpoch&&terminalIdentityCurrent(priorEvent,p)){event.guardConsumed=priorEvent.guardConsumed;event.finalTerminalAccepted=true;event.terminalControlSha256=priorEvent.terminalControlSha256;}terminalOrphanEvent=derivedClosedTerminal(event,sourceEvent,event,'CAPTURE_TERMINAL_ORPHAN_EVENT');}preservationReceipt=derivedClosedTerminal({lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,checkedMs:sourceEvent?sourceEvent.checkedMs:Date.now(),actionEpoch:budgetStarted,getAttempts:sheetsReadStats.attempts,frameEpoch:authorityFrameEpoch,descriptorSha256:sha(JSON.stringify(p)),bankProofs:items.filter(function(i){return i.plan.name===plan.name&&i.plan.first===2&&i.plan.last===501&&i.plan.width===1&&(i.plan.column===0||i.plan.column===1);}).map(function(i){return {bank:i.plan.column===0?'A':'B',typedSha256:certifiedTerminalBankDigest(i,sourceEvent),rows:copy(i.capture.rows)};})},sourceEvent,terminalOrphanEvent,sourceEvent?'SOURCE_PRESERVATION_RECEIPT':'INDEPENDENT_PRESERVATION_RECEIPT');}
  // Digest-only certificate for ONE exact 500x1 bank from the same actual
  // terminal read event. This never certifies an admission or extends freshness.
  // Cached three-key frame lookups are pure; every actual property read clears it.
  function terminalBankEventCurrent(r) {
    if (!r) return false;
    if(closedTerminalMembers.has(r))return closedTerminalCurrent(r);
    var age = Date.now() - r.checkedMs;
    if (age < 0 || age > 5000) return false;
    hold(lockHeld && nativeLockHeld() === true,
      'terminal bank digest held lock changed');
    age = Date.now() - r.checkedMs;
    return age >= 0 && age <= 5000 && r.lockEpoch === lockEpoch &&
      r.mutationEpoch === canonicalMutationEpoch && r.actionEpoch === budgetStarted &&
      r.getAttempts === sheetsReadStats.attempts && r.frameEpoch === authorityFrameEpoch;
  }
  function terminalBankDigestCurrent(r) {
    return !!r && terminalValidationActive && terminalBankEventCurrent(r.event) &&
      r.propertyReadEpoch === preflightPropertyReadEpoch &&
      JSON.parse(r.rootRaw).bank === r.bank &&
      r.rootRaw === properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey) &&
      r.controlRaw === properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3') &&
      r.configRaw === properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1') &&
      terminalBankDigest === r && terminalBankEventCurrent(r.event) &&
      terminalBankDigest === r && (closedTerminalMembers.has(r.event)?closedTerminalCurrent(r.event):Date.now() - r.event.checkedMs >= 0 && Date.now() - r.event.checkedMs <= 5000);
  }
  function certifiedTerminalBankDigest(item, sourceEvent) {
    var text = JSON.stringify(item.capture.rows), digest = sha(text);
    terminalBankDigest = null;
    var plan = item.plan, L = BackofficeNativeArchiveV2.layout, rows = item.capture.rows;
    // Other callers/plans still receive their genuine hash, without a certificate.
    if (terminalValidationActive && sourceEvent && text.length <= 2097152 && plan.name === L.name &&
        plan.sheetId === L.sheetId && plan.rowCount === L.rowCount &&
        plan.columnCount === L.width && plan.first === 2 && plan.last === 501 &&
        plan.width === 1 && (plan.column === 0 || plan.column === 1) &&
        Array.isArray(rows) && Object.getPrototypeOf(rows) === Array.prototype &&
        Object.keys(rows).length === 500 && Object.getOwnPropertyNames(rows).length === 501 &&
        Object.keys(rows).every(function(key,index){return key === String(index) &&
          own(Object.getOwnPropertyDescriptor(rows,key), 'value');}) &&
        Object.getOwnPropertySymbols(rows).length === 0 &&
        !('toJSON' in rows) && rows.length === 500 && rows.every(function(row) {
          return Array.isArray(row) && Object.getPrototypeOf(row) === Array.prototype &&
            !('toJSON' in row) && Object.getOwnPropertySymbols(row).length === 0 &&
            row.length === 1 && Object.keys(row).length === 1 &&
            Object.getOwnPropertyNames(row).length === 2 && own(row,0) &&
            own(Object.getOwnPropertyDescriptor(row,0), 'value') &&
            row[0] && Object.getPrototypeOf(row[0]) === Object.prototype &&
            Object.getOwnPropertySymbols(row[0]).length === 0 && !('toJSON' in row[0]) &&
            Object.getOwnPropertyNames(row[0]).length === Object.keys(row[0]).length &&
            (Object.keys(row[0]).length === 0 || (Object.keys(row[0]).length === 1 &&
              own(row[0], 'stringValue') && Object.getOwnPropertyDescriptor(row[0], 'stringValue').enumerable === true &&
              own(Object.getOwnPropertyDescriptor(row[0], 'stringValue'), 'value') && typeof row[0].stringValue === 'string'));
        })) {
      var r = {text:text,digest:digest,bank:plan.column === 0 ? 'A' : 'B',
        event:sourceEvent,propertyReadEpoch:preflightPropertyReadEpoch,
        rootRaw:properties.getProperty(L.rootKey),
        controlRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),
        configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')};
      terminalBankDigest = r;
      if (!terminalBankDigestCurrent(r)) terminalBankDigest = null;
    }
    return digest;
  }
  function archiveTerminalSha(text) {
    var r = terminalBankDigest;
    if (r && typeof text === 'string' && text === r.text && terminalBankDigestCurrent(r)) {
      // Archive still independently validates typedIndex, root hash and every entry.
      // Consume before returning: no second use, no timestamp refresh.
      terminalBankDigest = null;
      return r.digest;
    }
    if (r && typeof text === 'string' && text === r.text) terminalBankDigest = null;
    return sha(text);
  }
  function guardedFreshRects(plans,measurement){hold(!readBundle,'fresh mutation proof cannot reuse read bundle');var p=archiveMutationFence();plans=plans.slice();if(p&&!plans.some(function(x){return samePlan(x,preservedPlan());}))plans.push(preservedPlan());hold(plans.length<=16,'fresh guarded phase exceeds bounded sixteen-range window');var items=fetchRectWindow(plans,measurement,false),sourceEvent=freshOrphanSource();lastGuardedSourceEvent=sourceEvent;if(terminalValidationActive&&terminalCompletionPlans)openClosedTerminal(sourceEvent,items,terminalCompletionPlans);if(p)capturePreservation(items,(terminalValidationActive||canonicalUnionActive)?sourceEvent:null);return items;}
  function archiveMutationGuard(){var p=archiveMutationFence();if(!p)return false;if(consumeTerminalOrphan(p))return true;if(preservationReceipt&&closedTerminalMembers.has(preservationReceipt))hold(closedTerminalCurrent(preservationReceipt),'closed terminal preservation scope changed');if(!terminalReceiptCurrent(preservationReceipt)||preservationReceipt.descriptorSha256!==sha(JSON.stringify(p))){archiveMetadata(false);guardedFreshRects([],archiveReadset||newReadset());}hold(terminalReceiptCurrent(preservationReceipt),'fresh orphan mutation receipt unavailable');if(terminalOrphanEvent&&terminalIdentityCurrent(terminalOrphanEvent,p))terminalOrphanEvent.guardConsumed=true;preservationReceipt=null;return true;}
  function discardPropertyBoundaryProof(){closeTerminalScope();sourceMetadataTailReceipt=null;terminalOrphanAck=null;terminalOrphanEvent=null;terminalProofReceipt=null;preservationReceipt=null;archivePostReceipt=null;completionProof=null;canonicalUnionCapture=null;canonicalUnionReceipt=null;}
  function assertCurrentCanonicalUnion(){if(!canonicalUnionActive)return;var j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null'),v=j&&j.pendingMutation;hold(currentReceipt(canonicalUnionReceipt)&&canonicalUnionReceipt.getAttempts===sheetsReadStats.attempts&&canonicalUnionReceipt.controlSha256===(v?sha(JSON.stringify(v)):null)&&canonicalUnionReceipt.rootText===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),'fresh complete canonical union/root required BEFORE effect');}
  function beforeNativeEffect(){sourceMetadataTailReceipt=null;assertCurrentCanonicalUnion();archiveMutationGuard();assertCurrentCanonicalUnion();closeTerminalScope();canonicalMutationEpoch++;terminalOrphanAck=null;terminalOrphanEvent=null;preservationReceipt=null;archivePostReceipt=null;completionProof=null;terminalProofReceipt=null;canonicalUnionCapture=null;canonicalUnionReceipt=null;}
  function usagePostPlans(first,last,column,width,usagePlan){
    transitionExact(usagePlan,['kind','logicalRows'],'usage postread plan');hold((usagePlan.kind==='USAGE_PAYLOAD'&&column===0&&width===20&&first>=Number('{{CONFIGURE_PRIVATE_ARCHIVE_FIRST_PAYLOAD_ROW}}')&&last-first<206&&usagePlan.logicalRows.length===0)||(usagePlan.kind==='USAGE_COMMIT'&&first===2&&last===501&&width===1&&(column===0||column===1)),'exact bounded usage postread kind/range required');hold(Array.isArray(usagePlan.logicalRows)&&usagePlan.logicalRows.length<=206&&new Set(usagePlan.logicalRows).size===usagePlan.logicalRows.length&&usagePlan.logicalRows.every(function(r){return integer(r,6,12000);}), 'usage postread exact destinations required');
    var L=BackofficeNativeArchiveV2.layout,m=archiveCanonicalMeta||metadata(),groups=[];usagePlan.logicalRows.slice().sort(function(a,b){return a-b;}).forEach(function(row){var g=groups[groups.length-1];if(g&&row===g.last+1&&row-g.first<500)g.last=row;else groups.push({sheet:'Evidence',first:row,last:row});});hold(groups.length<=8,'usage commit exceeds eight locator groups');var plans=[],step=width===20?128:500;for(var row=first;row<=last;row+=step)plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:row,last:Math.min(row+step-1,last),column:column,width:width});groups.forEach(function(g){hold(g.last<=m.Evidence.rowCount,'usage canonical destination bounds changed');plans.push({name:'Evidence',sheetId:sheets.Evidence.id,rowCount:m.Evidence.rowCount,columnCount:m.Evidence.columnCount,first:g.first,last:g.last,column:0,width:26});});['Prospects','Evidence'].forEach(function(name){if(!plans.some(function(p){return p.name===name;})){var v=m[name];plans.push({name:name,sheetId:v.sheetId,rowCount:v.rowCount,columnCount:v.columnCount,first:1,last:1,column:0,width:1});}});if(!plans.some(function(p){return samePlan(p,preservedPlan());}))plans.push(preservedPlan());hold(plans.length<=16,'usage postread fresh union exceeds sixteen ranges BEFORE effect');return {plans:plans,groups:groups};
  }
  function postUsageArchive(first,last,column,width,usagePlan){
    var declared=usagePostPlans(first,last,column,width,usagePlan),items=guardedFreshRects(declared.plans,archiveReadset||newReadset()),out={rows:[],displayRows:[],checkedAt:stamp()},L=BackofficeNativeArchiveV2.layout;
    items.filter(function(i){return i.plan.name===L.name&&i.plan.column===column&&i.plan.width===width&&i.plan.first>=first&&i.plan.last<=last;}).forEach(function(i){out.rows=out.rows.concat(copy(i.capture.rows));out.displayRows=out.displayRows.concat(copy(i.capture.displayRows));});hold(out.rows.length===last-first+1&&out.displayRows.length===last-first+1,'usage postread complete physical coverage changed');
    mergedArchiveReceipt={lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,actionEpoch:budgetStarted,checkedMs:Date.now(),getAttempts:sheetsReadStats.attempts,frameEpoch:authorityFrameEpoch,kind:usagePlan.kind,first:first,last:last,column:column,width:width,logicalRows:copy(usagePlan.logicalRows),items:items,capture:out,rootRaw:properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),journalRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')};
  }
  function consumeUsagePost(kind,first,last,column,width,logicalRows){
    var r=mergedArchiveReceipt;if(!r)return null;var age=Date.now()-r.checkedMs;hold(currentReceipt(r)&&age>=0&&age<=5000&&r.actionEpoch===budgetStarted&&r.getAttempts===sheetsReadStats.attempts&&r.frameEpoch===authorityFrameEpoch&&r.kind===kind&&r.first===first&&r.last===last&&r.column===column&&r.width===width&&JSON.stringify(r.logicalRows)===JSON.stringify(logicalRows)&&r.rootRaw===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)&&r.journalRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')&&r.configRaw===properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),'private one-use fresh usage postread scope/epoch/preimage changed');mergedArchiveReceipt=null;return r;
  }
  function postArchive(first,last,column,width,usagePlan){if(usagePlan)return postUsageArchive(first,last,column,width,usagePlan);var L=BackofficeNativeArchiveV2.layout,plans=[],step=width===20?128:500,items=[];for(var start=first;start<=last;start+=step)plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:start,last:Math.min(start+step-1,last),column:column,width:width});for(var at=0;at<plans.length;at+=15)items=items.concat(guardedFreshRects(plans.slice(at,at+15),archiveReadset||newReadset()));archivePostReceipt={lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,checkedMs:Date.now(),first:first,last:last,column:column,width:width,capture:{rows:[],displayRows:[],checkedAt:stamp()}};items.filter(function(i){return i.plan.column===column&&i.plan.width===width&&i.plan.first>=first&&i.plan.last<=last&&!(i.plan.first===Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')&&i.plan.last===Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')&&width!==20);}).forEach(function(i){archivePostReceipt.capture.rows=archivePostReceipt.capture.rows.concat(i.capture.rows);archivePostReceipt.capture.displayRows=archivePostReceipt.capture.displayRows.concat(i.capture.displayRows);});hold(archivePostReceipt.capture.rows.length===last-first+1,'fresh archive postimage receipt coverage changed');}
  function commitRootGuard(hash,rows,bank){var p=archiveMutationFence();if(!p)return true;var r=preservationReceipt,proof=r&&r.bankProofs.filter(function(b){return b.bank===bank&&b.typedSha256===hash&&sameRows(b.rows,rows);});hold(currentReceipt(r)&&r.descriptorSha256===sha(JSON.stringify(p))&&proof.length===1,'exact fresh postbank+orphan receipt required before admission');preservationReceipt=null;archivePostReceipt=null;completionProof=null;return true;}
  function beginCompletionProof(bank,payloadRows,canonicalRows,targetPlan){assertRetentionReadCapture();hold(retentionReadActive||!completionProof&&!readBundle,'private completion proof reentrancy prohibited');var L=BackofficeNativeArchiveV2.layout,plans=[{name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:2,last:501,column:bank==='A'?0:1,width:1}],m=archiveCanonicalMeta||metadata();function groups(rows,max){var out=[];Array.from(new Set(rows)).sort(function(a,b){return a-b;}).forEach(function(row){var g=out[out.length-1];if(g&&row===g.last+1&&row-g.first<max)g.last=row;else out.push({first:row,last:row});});return out;}groups(payloadRows,128).forEach(function(g){plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:g.first,last:g.last,column:0,width:20});});groups(canonicalRows,500).forEach(function(g){plans.push({name:'Evidence',sheetId:sheets.Evidence.id,rowCount:m.Evidence.rowCount,columnCount:m.Evidence.columnCount,first:g.first,last:g.last,column:0,width:26});});if(targetPlan){hold(targetPlan.sheet==='Prospects'&&integer(targetPlan.row,6,m.Prospects.rowCount),'source completion selected target outside bounds');plans.push({name:'Prospects',sheetId:sheets.Prospects.id,rowCount:m.Prospects.rowCount,columnCount:m.Prospects.columnCount,first:targetPlan.row,last:targetPlan.row,column:0,width:27});}hold(plans.length<=15,'completion postconditions exceed finite guarded window');if(canonicalUnionCapture){if(terminalValidationActive)openClosedTerminal(canonicalUnionCapture,canonicalUnionCapture.items,plans,retentionReadActive&&retentionDeclarationToken&&retentionDeclarationToken.terminal?retentionDeclarationToken:undefined);hold(terminalReceiptCurrent(canonicalUnionCapture),'private canonical union epoch changed');completionProof=canonicalUnionCapture;plans.forEach(function(p){completionCapture(p.name,p.first,p.last,p.column,p.width);});return;}var items;terminalCompletionPlans=terminalValidationActive?plans:null;try{items=guardedFreshRects(plans,archiveReadset||newReadset());}finally{terminalCompletionPlans=null;}completionProof=tagClosedTerminal({lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,actionEpoch:budgetStarted,getAttempts:sheetsReadStats.attempts,frameEpoch:authorityFrameEpoch,checkedMs:terminalCheckedMs(),items:items},'TERMINAL_COMPLETION_PROOF');}
  function completionCapture(name,first,last,column,width){var observation=receiptObservation('COMPLETION_CAPTURE');try{observation.stage='RETENTION_BEFORE_CELLS';assertRetentionReadCapture();observation.stage='SOURCE_METADATA_BEFORE_CELLS';assertSourceMetadataCapture();observation.stage='PROOF_PRESENT';if(!proofCheck(observation,'capture.proofPresent',completionProof))return null;observation.stage='PROOF_CURRENT';var current=terminalReceiptCurrent(completionProof,observation);if(!current)proofEmit(observation,'PREDICATE_FALSE');hold(current,'private completion proof epoch/deadline changed');observation.stage='PHYSICAL_INTERVAL';hold(integer(first,1)&&integer(last,first)&&last-first<500,'bounded private completion physical interval required');observation.stage='CHECKED_AT';var out={rows:[],displayRows:[],checkedAt:stamp()};for(var row=first;row<=last;row++){observation.stage='PHYSICAL_COVERAGE';var found=completionProof.items.filter(function(i){var p=i.plan;return p.name===name&&p.first<=row&&p.last>=row&&p.column===column&&p.width===width;});hold(found.length===1,'private completion receipt missing/duplicate physical coverage');var c=found[0].capture,offset=row-found[0].plan.first;observation.stage='TYPED_DISPLAY_SHAPE';hold(Array.isArray(c.rows[offset])&&c.rows[offset].length===width&&Array.isArray(c.displayRows[offset])&&c.displayRows[offset].length===width&&c.rows[offset].every(function(cell){return cell&&typeof cell==='object'&&!Array.isArray(cell);})&&c.displayRows[offset].every(function(cell){return typeof cell==='string';})&&Object.keys(c.rows[offset]).length===width&&Object.keys(c.displayRows[offset]).length===width,'private completion exact dense typed/display width missing');observation.stage='COPY_TYPED';out.rows.push(copy(c.rows[offset]));observation.stage='COPY_DISPLAY';out.displayRows.push(copy(c.displayRows[offset]));}return out;}catch(error){proofEmit(observation,'THREW');throw error;}}
  function writeArchiveRows(first,column,rows,usagePlan){hold(!readBundle,"read bundle cannot cross an archive write boundary");
    archiveMutationFence();hold(lockHeld&&nativeLockHeld(),'held project lock required for archive copy/index write');var L=BackofficeNativeArchiveV2.layout;archiveMetadata(false);hold(Array.isArray(rows)&&rows.length>0&&rows.length<=500&&integer(first,2,L.rowCount-rows.length+1),'bounded fixed archive write rows required');
    hold(!archiveMutationFence()||first>Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')||first+rows.length-1<Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),'preserved archive slot write forbidden; KEEP');var width=rows[0].length;hold(integer(width,1,L.width)&&integer(column,0,L.width-width),'bounded fixed archive write width required');rows.forEach(function(r){wholeRow(r,width);r.forEach(function(c){hold(!own(c,'stringValue')||c.stringValue.length<=45000,'archive native cell limit exceeded');});});
    if(usagePlan){var declaredUsage=usagePostPlans(first,first+rows.length-1,column,width,usagePlan);hold(!archiveReadset||archiveReadset.actualRanges+declaredUsage.plans.length<=40,'usage postread whole phase range headroom unavailable BEFORE effect');}
    var preparedRows=rows.map(function(r){return {values:r.map(function(c){return Object.keys(c).length?{userEnteredValue:copy(c)}:{};})};}),rowBytes=preparedRows.map(function(r){return utf8(JSON.stringify(r)).length+1;}),at=0;
    while(at<rows.length){checkBudget(1000);var count=0,bytes=8192;while(at+count<rows.length&&count<500&&bytes+rowBytes[at+count]<=1900000){bytes+=rowBytes[at+count];count++;}hold(count>0,'archive split row request exceeds2MB bound');var block=preparedRows.slice(at,at+count),body={requests:[{updateCells:{range:{sheetId:L.sheetId,startRowIndex:first+at-1,endRowIndex:first+at+count-1,startColumnIndex:column,endColumnIndex:column+width},rows:block,fields:'userEnteredValue'}}]};hold(utf8(JSON.stringify(body)).length<=2000000,'archive actual split request exceeds2MB bound');beforeNativeEffect();nativeObject(batchUpdateAckDto(nativeBoundary(function(){return Sheets.Spreadsheets.batchUpdate(body,workbook);}),1),'archive updateCells acknowledgment');if(archiveMutationFence())postArchive(first+at,first+at+count-1,column,width,at+count===rows.length&&count===rows.length?usagePlan:null);at+=count;}


  }
  function configuredUniverse(cfg,evidenceRows){
    hold(record(cfg),'archive registry configuration required');var manifests=[],pointers=[];
    if(cfg.sourceRegistry){var p=cfg.sourceRegistry;if(p.schema==='BackofficeNativeRegistryPointer/v1')pointers=[p];else{hold(record(p)&&Object.keys(p).sort().join('|')==='pages|schema'&&p.schema==='BackofficeNativeRegistrySetPointer/v1'&&Array.isArray(p.pages)&&p.pages.length>0&&p.pages.length<=8,'archive complete configured registry set missing');pointers=p.pages;}}
    if(pointers.length){var seen={};pointers.forEach(function(p){hold(record(p)&&Object.keys(p).sort().join('|')==='evidenceRow|schema|typedRowSha256'&&p.schema==='BackofficeNativeRegistryPointer/v1'&&integer(p.evidenceRow,6,10000)&&/^[a-f0-9]{64}$/.test(p.typedRowSha256)&&!seen[p.evidenceRow],'archive exact independent registry pointer required');seen[p.evidenceRow]=true;var row=evidenceRows?evidenceRows[p.evidenceRow-1]:readRow('Evidence',p.evidenceRow,26);hold(sha(JSON.stringify(row))===p.typedRowSha256&&own(row[3],'stringValue'),'archive current registry full26 preimage changed');var d=JSON.parse(row[3].stringValue),proof={schema:'FERNAIN_TRUSTED_NATIVE_REGISTRY_READ_V1',checkedAtUtc:stamp(),fullRegistryReadSha256:sha(JSON.stringify(d))};hold(typeof BackofficeNativePublicSourceV1!=='undefined'&&typeof BackofficeNativePublicSourceV1.createWithScriptOwnedRegistry==='function','archive native registry validator unavailable');var producer=BackofficeNativePublicSourceV1.createWithScriptOwnedRegistry(function(){return d;},proof);manifests.push(producer.registryManifest());});}
    else{hold(typeof BackofficeNativePublicSourceV1!=='undefined'&&typeof BackofficeNativePublicSourceV1.registryManifest==='function','archive registered native seed universe unavailable');manifests.push(BackofficeNativePublicSourceV1.registryManifest());}
    var emails=[];manifests.forEach(function(m){hold(record(m)&&Object.keys(m).length>0&&Object.keys(m).length<=128,'archive bounded complete registry manifest required');Object.keys(m).forEach(function(k){var e=m[k].email;hold(typeof e==='string'&&e===e.toLowerCase()&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(e),'archive normalized registered recipient required');if(emails.indexOf(e)<0)emails.push(e);});});emails.sort();hold(emails.length>0&&emails.length<=1024,'archive complete recipient universe bounds');var registrySha256=sha(JSON.stringify(manifests)),value={emails:emails,registrySha256:registrySha256};value.sha256=sha(JSON.stringify(value));return value;
  }
  function canonicalUnionPlans(groups,extra){
    var m=archiveCanonicalMeta||metadata(),plans=groups.map(function(g){var p=m[g.sheet];hold(p&&integer(g.first,1,p.rowCount)&&integer(g.last,g.first,p.rowCount)&&g.last-g.first<500,'fresh canonical union physical bounds changed');return {name:g.sheet,sheetId:p.sheetId,rowCount:p.rowCount,columnCount:p.columnCount,first:g.first,last:g.last,column:0,width:sheets[g.sheet].width};});
    if(extra)plans.push(extra);['Prospects','Evidence'].forEach(function(name){if(!plans.some(function(p){return p.name===name;})){var p=m[name];plans.push({name:name,sheetId:p.sheetId,rowCount:p.rowCount,columnCount:p.columnCount,first:1,last:1,column:0,width:1});}});
    if(canonicalAllocationRows)canonicalAllocationRows.forEach(function(row){hold(archiveAdapter().assertUnadmittedCanonicalRow(row)===true,'unadmitted canonical allocation proof required');});var rootText=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null'),terminal=null;
    if(j&&j.pendingMutation&&verifiedControl(j.pendingMutation)){
      var cfg=JSON.parse(properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'));if(!currentUniverse)currentUniverse=configuredUniverse(cfg,null);var a=archiveAdapter();a.setUniverse(currentUniverse);a.setAuthority(archiveAuthority(cfg));terminal=a.terminalProofPlan();hold(terminal,'exact previous terminal union plan missing');var L=BackofficeNativeArchiveV2.layout;
      function addMissing(p,max){var first=null;for(var row=p.first;row<=p.last+1;row++){var covered=row>p.last||plans.some(function(x){return x.name===p.name&&x.sheetId===p.sheetId&&x.column===p.column&&x.width===p.width&&x.first<=row&&x.last>=row;});if(!covered&&first===null)first=row;if(first!==null&&(covered||row-first+1===max)){var q=copy(p);q.first=first;q.last=covered?row-1:row;plans.push(q);first=null;}}}
      addMissing({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:2,last:501,column:terminal.bank==='A'?0:1,width:1},500);
      terminal.payloadRows.forEach(function(row){addMissing({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:row,last:row,column:0,width:20},128);});
      terminal.canonicalRows.forEach(function(row){addMissing({name:'Evidence',sheetId:sheets.Evidence.id,rowCount:m.Evidence.rowCount,columnCount:m.Evidence.columnCount,first:row,last:row,column:0,width:26},500);});
      // Coalesce only newly declared adjacent equal-width intervals; canonical
      // target intervals retain exact identity for their independent CAS check.
      var baseCount=groups.length+(extra?1:0)+(groups.some(function(g){return g.sheet==='Prospects';})?0:1)+(groups.some(function(g){return g.sheet==='Evidence';})?0:1),base=plans.slice(0,baseCount),tail=plans.slice(baseCount).sort(function(a,b){return a.name.localeCompare(b.name)||a.column-b.column||a.width-b.width||a.first-b.first;}),joined=[];
      tail.forEach(function(p){var q=joined[joined.length-1],max=p.width===20?128:500;if(q&&q.name===p.name&&q.sheetId===p.sheetId&&q.column===p.column&&q.width===p.width&&p.first===q.last+1&&p.last-q.first<max)q.last=p.last;else joined.push(copy(p));});plans=base.concat(joined);
    }
    var descriptor=archiveMutationFence();if(descriptor&&!plans.some(function(p){return samePlan(p,preservedPlan());}))plans.push(preservedPlan());hold(plans.length<=16,'canonical complete fresh union exceeds sixteen-range window BEFORE effect');return {plans:plans,terminal:terminal,descriptor:descriptor,rootText:rootText,controlSha256:j&&j.pendingMutation?sha(JSON.stringify(j.pendingMutation)):null};
  }
  function canonicalUnionRead(groups,extra,declared){
    var plan=declared||canonicalUnionPlans(groups,extra),terminal=plan.terminal;canonicalUnionReceipt=null;canonicalUnionCapture=null;
    function exactTerminal(){var j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null'),control=j&&j.pendingMutation;hold((control?sha(JSON.stringify(control)):null)===plan.controlSha256&&properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===plan.rootText,'canonical fresh union control/root preimage changed');}
    exactTerminal();var items=guardedFreshRects(plan.plans,archiveReadset||newReadset());exactTerminal();
    if(terminal){canonicalUnionCapture=inheritTerminalEvent(Object.assign({},lastGuardedSourceEvent,{items:items}),lastGuardedSourceEvent);terminalValidationActive=true;try{archiveAdapter().validateTerminalControl();exactTerminal();capturePreservation(items,canonicalUnionCapture);terminalProofReceipt=mintTerminalProof(JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')).pendingMutation,terminal.rootText,plan.descriptor);}catch(e){closeTerminalScope();terminalOrphanAck=null;throw e;}finally{terminalOrphanEvent=null;terminalValidationActive=false;canonicalUnionCapture=null;completionProof=null;}}
    if(canonicalAllocationRows)canonicalAllocationRows.forEach(function(row){hold(archiveAdapter().assertUnadmittedCanonicalRow(row)===true,'unadmitted canonical allocation proof required');});exactTerminal();canonicalUnionReceipt={lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,checkedMs:Date.now(),getAttempts:sheetsReadStats.attempts,rootText:plan.rootText,controlSha256:plan.controlSha256};return items;
  }

  var sourceMetadataProofActive=false,sourceMetadataProofEvent=null,sourceMetadataRefreshActive=false;
  function assertSourceMetadataCapture(){if(!sourceMetadataProofActive)return;var r=sourceMetadataProofEvent,o=proofObservation('SOURCE_METADATA_BEFORE_CELLS',['eventPresent','sourceCurrent','proofPresent','rootEqual','controlEqual','configEqual']);o.source=retentionCurrentObservation();try{var current=proofCheck(o,'eventPresent',r)&&proofCheck(o,'sourceCurrent',orphanSourceCurrent(r,o.source))&&proofCheck(o,'proofPresent',completionProof)&&proofCheck(o,'rootEqual',properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===r.rootRaw)&&proofCheck(o,'controlEqual',properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===r.controlRaw)&&proofCheck(o,'configEqual',properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===r.configRaw);if(!current)proofEmit(o,'PREDICATE_FALSE');hold(current,'source metadata capture source/boundary changed BEFORE cells');}catch(error){proofEmit(o,'THREW');throw error;}}
  function withSourceMetadataProof(declaration,fn){
    // Existing private read scopes keep the original logical path. This is a
    // route decision before any new union planning/read, never error recovery.
    if(readBundle||canonicalUnionActive||completionProof)return null;
    hold(lockHeld&&nativeLockHeld()&&typeof fn==='function','one synchronous held-lock source metadata union required');
    safeData(declaration,'source metadata union declaration');hold(record(declaration)&&Object.keys(declaration).sort().join('|')==='bank|entry|payloadRow|rootText|row'&&integer(declaration.row,6,12000)&&integer(declaration.payloadRow,BackofficeNativeArchiveV2.layout.payloadFirst,BackofficeNativeArchiveV2.layout.rowCount)&&['A','B'].indexOf(declaration.bank)>=0,'exact source metadata union declaration required');
    hold(archiveReadset,'logical readset must be established once before source metadata declaration');var configRaw=properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),controlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),rootRaw=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),source=null;
    hold(rootRaw===declaration.rootText,'source metadata declared root preimage changed');var priorActive=canonicalUnionActive;canonicalUnionActive=true;
    function exact(){hold(lockHeld&&nativeLockHeld()&&properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===rootRaw&&properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===controlRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===configRaw,'source metadata union exact authority changed');assertCurrentCanonicalUnion();if(source)hold(orphanSourceCurrent(source),'source metadata same-response epoch changed');}
    try{
      var L=BackofficeNativeArchiveV2.layout,extra={name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:declaration.payloadRow,last:declaration.payloadRow,column:0,width:20},declared=canonicalUnionPlans([{sheet:'Evidence',first:declaration.row,last:declaration.row}],extra),bankPlan={name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:2,last:501,column:declaration.bank==='A'?0:1,width:1};
      hold(declared.rootText===rootRaw,'source metadata complete union declared root changed');if(!declared.plans.some(function(p){return samePlan(p,bankPlan);}))declared.plans.push(bankPlan);
      hold(declared.plans.length<=16&&archiveReadset.actualRanges+declared.plans.length<=40,'source metadata whole union range headroom unavailable BEFORE read');var items=canonicalUnionRead([{sheet:'Evidence',first:declaration.row,last:declaration.row}],extra,declared);
      source=freshOrphanSource();exact();source.rootRaw=rootRaw;source.controlRaw=controlRaw;source.configRaw=configRaw;sourceMetadataProofEvent=source;sourceMetadataProofActive=true;completionProof={lockEpoch:source.lockEpoch,mutationEpoch:source.mutationEpoch,actionEpoch:source.actionEpoch,getAttempts:source.getAttempts,frameEpoch:source.frameEpoch,checkedMs:source.checkedMs,items:items};
      completionCapture(L.name,2,501,bankPlan.column,1);completionCapture('Evidence',declaration.row,declaration.row,0,26);completionCapture(L.name,declaration.payloadRow,declaration.payloadRow,0,20);
      var out=fn();hold(!out||typeof out.then!=='function','source metadata union callback must remain synchronous');exact();return out;
    }finally{sourceMetadataProofActive=false;sourceMetadataProofEvent=null;canonicalUnionActive=priorActive;canonicalUnionCapture=null;canonicalUnionReceipt=null;completionProof=null;preservationReceipt=null;archivePostReceipt=null;terminalProofReceipt=null;terminalOrphanEvent=null;terminalOrphanAck=null;}
  }
  function freshCanonicalRects(groups,extra){
    if(canonicalUnionActive)return canonicalUnionRead(groups,extra);
    hold(lockHeld&&nativeLockHeld(),'fresh canonical phase requires held lock');var m=archiveCanonicalMeta||metadata(),plans=groups.map(function(g){var p=m[g.sheet];hold(p&&integer(g.first,1,p.rowCount)&&integer(g.last,g.first,p.rowCount)&&g.last-g.first<500,'fresh canonical phase physical bounds changed');return {name:g.sheet,sheetId:p.sheetId,rowCount:p.rowCount,columnCount:p.columnCount,first:g.first,last:g.last,column:0,width:sheets[g.sheet].width};});
    if(extra)plans.push(extra);['Prospects','Evidence'].forEach(function(name){if(!plans.some(function(p){return p.name===name;})){var p=m[name];plans.push({name:name,sheetId:p.sheetId,rowCount:p.rowCount,columnCount:p.columnCount,first:1,last:1,column:0,width:1});}});hold(plans.length<=16,'fresh canonical phase exceeds bounded transport window');return guardedFreshRects(plans,archiveReadset||newReadset());
  }
  function captureFor(items,name,first,last,column,width){var found=items.filter(function(r){var p=r.plan;return p.name===name&&p.first===first&&p.last===last&&p.column===column&&p.width===width;});hold(found.length===1,'fresh native phase receipt coverage changed');return found[0].capture;}
  function archiveCommitRead(column,logicalRows){var L=BackofficeNativeArchiveV2.layout,merged=consumeUsagePost('USAGE_COMMIT',2,501,column,1,logicalRows);if(merged){var exactLive=Object.create(null);merged.items.filter(function(i){return i.plan.name==='Evidence'&&i.plan.width===26;}).forEach(function(i){i.capture.rows.forEach(function(row,j){exactLive[i.plan.first+j]={typedRow:copy(row),displayRow:copy(i.capture.displayRows[j])};});});hold(logicalRows.every(function(row){return own(exactLive,row);}), 'usage postread exact canonical destination missing');return {index:copy(merged.capture),live:exactLive};}var ordered=logicalRows.slice().sort(function(a,b){return a-b;}),groups=[];ordered.forEach(function(row){var g=groups[groups.length-1];if(g&&row===g.last+1&&g.last-g.first<499)g.last=row;else groups.push({sheet:'Evidence',first:row,last:row});});hold(groups.length<=8,'prepared commit phase exceeds eight locator groups');var extra={name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:L.indexFirst,last:L.indexLast,column:column,width:1},items=freshCanonicalRects(groups,extra),live=Object.create(null);groups.forEach(function(g){var c=captureFor(items,'Evidence',g.first,g.last,0,26);c.rows.forEach(function(row,i){live[g.first+i]={typedRow:row,displayRow:c.displayRows[i]};});});return {index:captureFor(items,L.name,L.indexFirst,L.indexLast,column,1),live:live};}
  function casArchiveLocators(writes,verifiedPre){archiveMutationFence();hold(!readBundle,"read bundle cannot cross an archive locator write boundary");
    safeData(writes,'archive locator CAS plans');hold(lockHeld&&nativeLockHeld()&&Array.isArray(writes)&&writes.length>0&&writes.length<=206,'bounded held-lock archive locator CAS required');var meta=archiveCanonicalMeta||metadata(),sorted=writes.slice().sort(function(a,b){return a.row-b.row;}),groups=[],seen={};sorted.forEach(function(w){hold(record(w)&&Object.keys(w).sort().join('|')==='after|expected|row|sheet'&&w.sheet==='Evidence'&&integer(w.row,6,meta.Evidence.rowCount)&&!seen[w.row],'exact archive whole26 CAS plan required');hold(archiveAdapter().validatePreparedLocator(w)===true,'archive locator CAS lacks independent PREPARED admission');seen[w.row]=true;wholeRow(w.expected,26);wholeRow(w.after,26);for(var c=0;c<26;c++)if(c!==3)hold(sameRows(w.expected[c],w.after[c]),'archive locator may change only original D');var d=JSON.parse(w.after[3].stringValue);hold(d.schema==='BackofficeNativeArchiveLocator/v2'&&d.sheetId===BackofficeNativeArchiveV2.layout.sheetId&&d.logicalRow===w.row,'archive exact locator destination required');var g=groups[groups.length-1];if(g&&w.row===g.last+1&&g.last-g.first<499)g.last=w.row;else groups.push({first:w.row,last:w.row});});hold(groups.length<=8,'archive locator CAS exceeds eight physical read groups');
    var captures=[];function readback(after){var items=after||!verifiedPre?freshCanonicalRects(groups.map(function(g){return {sheet:'Evidence',first:g.first,last:g.last};})):null;groups.forEach(function(g){checkBudget(1000);var read;if(items)read=captureFor(items,'Evidence',g.first,g.last,0,26);else {read={rows:[],displayRows:[]};for(var row=g.first;row<=g.last;row++){hold(verifiedPre[row],'prepared commit canonical receipt missing');read.rows.push(verifiedPre[row].typedRow);read.displayRows.push(verifiedPre[row].displayRow);}}read.rows.forEach(function(row,i){var w=sorted.filter(function(p){return p.row===g.first+i;})[0];hold(w&&sameRows(row,after?w.after:w.expected),after?'archive locator complete-row typed readback changed':'archive locator complete-row CAS preimage changed');if(after)captures.push({sheet:'Evidence',row:w.row,typedRow:row,displayRow:read.displayRows[i]});});});}
    readback(false);var requests=sorted.map(function(w){return {updateCells:{range:{sheetId:sheets.Evidence.id,startRowIndex:w.row-1,endRowIndex:w.row,startColumnIndex:3,endColumnIndex:4},rows:[{values:[{userEnteredValue:copy(w.after[3])}]}],fields:'userEnteredValue'}};});hold(utf8(JSON.stringify({requests:requests})).length<=2000000,'archive locator CAS request exceeds2MB');checkBudget(1000);beforeNativeEffect();nativeObject(batchUpdateAckDto(nativeBoundary(function(){return Sheets.Spreadsheets.batchUpdate({requests:requests},workbook);}),requests.length),'archive locator batch acknowledgment');readback(true);return {acknowledged:true,verified:true,rowCount:writes.length,captures:captures};
  }
  function archiveAuthority(cfg){hold(cfg&&cfg.ownerAuthority&&typeof cfg.ownerAuthority.ref==='string'&&cfg.ownerAuthority.ref&&typeof cfg.ownerAuthority.approvedAt==='string'&&Number.isFinite(Date.parse(cfg.ownerAuthority.approvedAt))&&typeof cfg.writerId==='string'&&cfg.writerId,'archive existing owner/writer authority required');return {humanAuthorityRef:cfg.ownerAuthority.ref,humanApprovedAtUtc:cfg.ownerAuthority.approvedAt,projectId:projectId,writerId:cfg.writerId};}
  // Local storage transition only. No email/source authority is created here.
  function transitionExact(value,keys,name){safeData(value,name);hold(record(value)&&Object.keys(value).sort().join('|')===keys.slice().sort().join('|'),name+' exact fields required');}
  function transitionDigest(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
  function transitionFresh(value,name){var at=typeof value==='string'?Date.parse(value):NaN;hold(Number.isFinite(at)&&at<=Date.now()+5000&&Date.now()-at<=300000,name+' fresh reviewed evidence required');}
  function transitionCanonical(text,name){hold(typeof text==='string'&&utf8(text).length<=2000000,name+' bounded canonical text required');var v=JSON.parse(text);safeData(v,name);hold(JSON.stringify(v)===text,name+' exact canonical JSON required');return v;}
  function prepareArchivePreservationReviewed(){hold(false,'sample copy disables one-off archive preservation preparation; configure a separately reviewed private implementation');}
  function applyArchivePreservationReviewed(){hold(false,'sample copy disables one-off archive preservation application; configure a separately reviewed private implementation');}
  function reservePreservationPeak(plan){
    hold(lockHeld&&nativeLockHeld(),'preservation peak held lock required');checkBudget(1000);transitionExact(plan,['expectedRootText','expectedJournalText','pendingJournalText','newRootText','terminalJournalText'],'preservation peak');
    var rootKey=BackofficeNativeArchiveV2.layout.rootKey,journalKey='FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3';hold(properties.getProperty(rootKey)===plan.expectedRootText&&properties.getProperty(journalKey)===plan.expectedJournalText,'preservation peak exact current preimages changed');
    var all=properties.getProperties(),largest=Math.max(utf8(plan.pendingJournalText).length,utf8(plan.terminalJournalText).length),peak=0;hold(largest<=8500&&utf8(plan.newRootText).length<=8500,'preservation pending/terminal/root value peak exceeds bound BEFORE effect');
    all[rootKey]=plan.newRootText;all[journalKey]='x'.repeat(largest);all[sheetsReadKey]=JSON.stringify({schema:'BackofficeNativeSheetsGetPace/v1',state:'RESERVED',atMs:9999999999999});
    Object.keys(all).forEach(function(k){hold(typeof all[k]==='string','native property value malformed');peak+=utf8(k).length+utf8(all[k]).length;});hold(peak<=490000,'whole preservation/property/meter peak unavailable BEFORE first effect; KEEP');
    hold(properties.getProperty(rootKey)===plan.expectedRootText&&properties.getProperty(journalKey)===plan.expectedJournalText,'preservation peak preimages raced');return true;
  }
  function assert0259StorageDispositionTerminal(){
    var privateCase=fernainNativePublic0259CaseConfigurationV1();hold(fernainNativePublic0259CaseConfiguredV1(privateCase),'0259 private historical case binding unconfigured; STOP before property reads or transport');
    hold(lockHeld&&nativeLockHeld()&&budgetExplicitlyStarted,'0259 disposition gate requires fresh held action');var signature=lockEpoch+'|'+budgetStarted+'|'+canonicalMutationEpoch;if(dispositionGateCache===signature)return;
    // This is the single reviewed 0259 storage-only case. Historical terminal
    // receipts remain valid after later ROOT/PACE work, but an in-flight source
    // mutation and a Verified/v2 source-retention control require its exact ACK.
    var all=properties.getProperties(),prefix=privateCase.journalPropertyPrefix,keys=Object.keys(all).filter(function(k){return k.indexOf(prefix)===0;}),liveRootRaw=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),liveControlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),liveRoot=null,liveControl=null;
    try{liveRoot=JSON.parse(liveRootRaw||'null');liveControl=JSON.parse(liveControlRaw||'null');}catch(_){hold(false,'0259 disposition current ROOT/CONTROL malformed; KEEP STOP');}
    var sourceMutation=liveControl&&liveControl.pendingMutation,sourceRetention=sourceMutation&&sourceMutation.kind==='SOURCE_RETENTION',casePlan=privateCase.planSha256,caseOperation=privateCase.operationId,case0259=sourceRetention&&sourceMutation.planSha256===casePlan&&sourceMutation.operationId===caseOperation,pending0259=case0259&&sourceMutation.schema==='BackofficeNativeArchiveMutationPending/v4',verified0259=case0259&&sourceMutation.schema==='BackofficeNativeArchiveMutationVerified/v2';
    if(pending0259)hold(false,'0259 SOURCE_RETENTION Pending remains STOP; resolve exact journal and control before business effects');
    var expected='automaticRetryAllowed|captureSuccessful|completedAtUtc|configSha256|decision|dispositionId|installedHelperSourceSha256|lastSettledGetAtMs|originalControlSha256|originalPlanSha256|originalRootSha256|originalSourceExpiresAtUtc|ownedPaceRaw|phase|priorMeterRaw|promotedControlSha256|promotedRootSha256|releaseId|review|reviewedJsonSha256|schema|scope|sendAuthority|sourceAuthority',matches=[];
    var pinned={root:privateCase.originalRootSha256,control:privateCase.originalControlSha256,config:privateCase.configSha256,helper:privateCase.helperSourceSha256};
    keys.forEach(function(k){var j;try{j=JSON.parse(all[k]);}catch(_){hold(false,'0259 disposition journal malformed; KEEP STOP');}
      hold(record(j)&&Object.keys(j).sort().join('|')===expected&&j.schema==='BackofficeNativeStorageDispositionReceipt/v1'&&j.releaseId===privateCase.releaseId&&k===prefix+j.reviewedJsonSha256&&j.scope==='STORAGE_ONLY'&&j.phase==='ACKNOWLEDGED_STORAGE_ONLY'&&j.sourceAuthority===false&&j.sendAuthority===false&&j.captureSuccessful===false&&j.automaticRetryAllowed===false,'0259 disposition journal not exact terminal storage-only ACK; KEEP STOP');
      hold(j.originalRootSha256===pinned.root&&j.originalControlSha256===pinned.control&&j.configSha256===pinned.config&&j.installedHelperSourceSha256===pinned.helper&&j.originalPlanSha256===privateCase.planSha256&&j.originalSourceExpiresAtUtc===privateCase.originalSourceExpiresAtUtc&&['reviewedJsonSha256','promotedRootSha256','promotedControlSha256'].every(function(n){return typeof j[n]==='string'&&/^[a-f0-9]{64}$/.test(j[n]);})&&typeof j.dispositionId==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(j.dispositionId),'0259 receipt does not bind the exact reviewed case; KEEP STOP');
      hold(record(j.review)&&Object.keys(j.review).sort().join('|')==='checkedAtUtc|execution|expiredSource|flows|installation|physicalReadback|principal|quiet|writer','0259 receipt review shape malformed '+(j.review&&Object.keys(j.review).sort().join('|'))+'; KEEP STOP');hold(record(j.decision)&&Object.keys(j.decision).sort().join('|')==='actor|approvalRef|approved|checkedAtUtc|evidence|helperSourceSha256|parentAuthorizationEvidence|preimagesSha256|recipientUniverseSha256|reviewSha256|scope'&&j.decision.approved===true&&j.decision.scope==='STORAGE_ONLY'&&j.decision.helperSourceSha256===pinned.helper,'0259 receipt decision shape malformed; KEEP STOP');hold(j.decision.reviewSha256===sha(JSON.stringify(j.review)),'0259 receipt review hash mismatch; KEEP STOP');
      var pace;try{pace=JSON.parse(j.ownedPaceRaw);}catch(_){pace=null;}
      hold(pace&&pace.schema==='BackofficeNativeSheetsGetPace/v1'&&pace.state==='RESERVED'&&Number.isSafeInteger(pace.atMs)&&typeof j.priorMeterRaw==='string'&&Number.isSafeInteger(j.lastSettledGetAtMs)&&j.lastSettledGetAtMs>0&&typeof j.completedAtUtc==='string'&&Number.isFinite(Date.parse(j.completedAtUtc)),'0259 disposition terminal settlement receipt incomplete; KEEP STOP');
      if(verified0259&&j.originalPlanSha256===casePlan&&j.reviewedJsonSha256===privateCase.reviewedJsonSha256&&j.dispositionId===privateCase.dispositionId&&j.promotedRootSha256===privateCase.promotedRootSha256&&j.promotedControlSha256===privateCase.promotedControlSha256&&sourceMutation.terminalRootText&&sha(sourceMutation.terminalRootText)===j.promotedRootSha256&&sha(liveControlRaw)===j.promotedControlSha256)matches.push(j);
    });
    if(verified0259)hold(matches.length===1,'0259 Verified/v2 SOURCE_RETENTION requires its exact original-plan and promoted-control ACK; KEEP STOP');
    dispositionGateCache=signature;
  }
  function recipientCompatibilityPlan(input){
    safeData(input,'recipient compatibility reviewed plan');required(input,['schema','receiptText','receiptSha256','oldConfigRaw','newConfigRaw','checkedAtUtc','reviewRef','stoppedExclusiveWriter'],'recipient compatibility reviewed plan');
    hold(Object.keys(input).sort().join('|')==='checkedAtUtc|newConfigRaw|oldConfigRaw|receiptSha256|receiptText|reviewRef|schema|stoppedExclusiveWriter'&&input.schema==='BackofficeNativeRecipientCompatibilityPlan/v1'&&input.stoppedExclusiveWriter===true&&typeof input.reviewRef==='string'&&input.reviewRef.trim()===input.reviewRef&&input.reviewRef.length>0&&input.reviewRef.length<=1000,'exact externally reviewed stopped writer compatibility plan required');
    var age=Date.now()-Date.parse(input.checkedAtUtc);hold(Number.isFinite(age)&&age>=0&&age<=60000,'fresh compatibility plan required');hold(lockHeld&&nativeLockHeld()&&budgetExplicitlyStarted&&!readBundle,'compatibility held sole-writer maintenance required');checkBudget(1000);assert0259StorageDispositionTerminal();
    hold(typeof input.receiptText==='string'&&utf8Length(input.receiptText)<=8500&&sha(input.receiptText)===input.receiptSha256,'exact bounded reviewed compatibility receipt required');var c=JSON.parse(input.receiptText),A=BackofficeNativeArchiveV2;
    hold(A.compatibilityShape(c,sha)&&c.state==='COMMITTED'&&c.reviewRef===input.reviewRef&&sha(input.oldConfigRaw)===c.oldConfigSha256&&sha(input.newConfigRaw)===c.newConfigSha256,'exact compatibility receipt/config pair changed');
    var old=JSON.parse(input.oldConfigRaw),next=JSON.parse(input.newConfigRaw),before=copy(old),after=copy(next);delete before.sourceRegistry;delete before.sourceFamilies;delete after.sourceRegistry;delete after.sourceFamilies;
    hold(JSON.stringify(before)===JSON.stringify(after)&&!own(old,'sourceRegistry')&&!own(old,'sourceFamilies')&&record(next.sourceRegistry)&&record(next.sourceFamilies),'only registry and reviewed families may change');
    hold(old.projectId===projectId&&old.spreadsheetId===workbook&&old.ownerAuthority&&old.ownerAuthority.standing===true,'existing project and owner authority required');
    hold(properties.getProperty(A.compatibilityLayout.key)===null&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===input.oldConfigRaw,'first compatibility exact config preimage required');
    var rootRaw=properties.getProperty(A.layout.rootKey),controlRaw=properties.getProperty(A.preservationLayout.key),j=JSON.parse(controlRaw||'null');hold(sha(rootRaw||'')===c.expectedRootSha256&&sha(controlRaw||'')===c.expectedControlSha256&&j&&j.state==='COMMITTED'&&j.pendingMutation&&verifiedControl(j.pendingMutation)&&j.pendingMutation.terminalRootText===rootRaw&&sha(JSON.stringify(j.descriptor))===c.descriptorSha256,'settled exact current root/control/descriptor required');
    archiveMutationFence();var a=archiveAdapter();a.setUniverse(configuredUniverse(old,null));a.setAuthority(archiveAuthority(old));var baseline=a.compatibilityBaseline();hold(sha(JSON.stringify(baseline.entries))===c.baselineAdmissionsSha256&&baseline.entries.length===c.baselineCount&&A.compatibilityCoverage(c,baseline.entries,j.descriptor,c.newUniverse,sha),'complete reviewed OLD prefix changed; rebase required');
    var newUniverse=configuredUniverse(next,null);hold(JSON.stringify(newUniverse)===JSON.stringify(c.newUniverse),'fresh registry differs from exact reviewed universe');var pointer=next.sourceRegistry;hold(pointer.schema==='BackofficeNativeRegistryPointer/v1','one bounded registry pointer required');var row=readRow('Evidence',pointer.evidenceRow,26),page=JSON.parse(row[3].stringValue);hold(sha(JSON.stringify(row))===pointer.typedRowSha256,'fresh exact registry pointer changed');var familyKeys=[];page.entries.forEach(function(entry){var def=JSON.parse(entry.definitionJson),family=next.sourceFamilies[def.leadId];familyKeys.push(def.leadId);hold(family&&family.schema==='BackofficeNativeReviewedFamily/v1'&&family.organizationKey===def.organizationKey&&JSON.stringify(family.sourceRefs)===JSON.stringify([def.staffUrl,def.workflowUrl]),'exact registry/family relation missing');});hold(Object.keys(next.sourceFamilies).sort().join('|')===familyKeys.sort().join('|'),'unreviewed family/config extension prohibited');
    archiveMutationGuard();hold(properties.getProperty(A.layout.rootKey)===rootRaw&&properties.getProperty(A.preservationLayout.key)===controlRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===input.oldConfigRaw&&properties.getProperty(A.compatibilityLayout.key)===null,'compatibility fresh preimage drift');
    var all=properties.getProperties(),pending=copy(c);pending.state='PENDING';var pendingText=JSON.stringify(pending);hold(utf8Length(input.newConfigRaw)<=8500&&utf8Length(pendingText)<=8500,'compatibility individual property peak capacity');all[A.compatibilityLayout.key]=pendingText;all.FERNAIN_NATIVE_RUNTIME_CONFIG_V1=input.newConfigRaw;var total=0;Object.keys(all).forEach(function(k){hold(typeof all[k]==='string','whole actual properties string values required');total+=utf8Length(k)+utf8Length(all[k]);});hold(total<=490000,'whole actual compatibility property peak capacity');
    age=Date.now()-Date.parse(input.checkedAtUtc);hold(Number.isFinite(age)&&age>=0&&age<=60000,'compatibility plan stale BEFORE effects');checkBudget(1000);
    return {receipt:c,pendingText:pendingText,rootRaw:rootRaw,controlRaw:controlRaw,newUniverse:newUniverse,peakPropertyBytes:total};
  }
  function prepareRecipientCompatibilityReviewed(input){var p=recipientCompatibilityPlan(input);return {schema:'BackofficeNativeRecipientCompatibilityPrepared/v1',complete:true,planSha256:sha(JSON.stringify(input)),rootSha256:sha(p.rootRaw),controlSha256:sha(p.controlRaw),baselineCount:p.receipt.baselineCount,receiptBytes:utf8Length(input.receiptText),newConfigBytes:utf8Length(input.newConfigRaw),peakPropertyBytes:p.peakPropertyBytes,noEligibility:true};}
  function applyRecipientCompatibilityReviewed(input,expectedPlanSha256){hold(expectedPlanSha256===sha(JSON.stringify(input)),'exact externally reviewed compatibility plan hash required');var p=recipientCompatibilityPlan(input),A=BackofficeNativeArchiveV2,key=A.compatibilityLayout.key,stage='BEFORE_EFFECTS',attempted=0;
    function exactPair(receiptRaw,cfgRaw){hold(properties.getProperty(A.layout.rootKey)===p.rootRaw&&properties.getProperty(A.preservationLayout.key)===p.controlRaw&&properties.getProperty(key)===receiptRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===cfgRaw,'compatibility actual root/control/config/receipt drift; STOP');checkBudget(1000);var age=Date.now()-Date.parse(input.checkedAtUtc);hold(Number.isFinite(age)&&age>=0&&age<=60000,'compatibility technical observation expired; STOP');}
    try{exactPair(null,input.oldConfigRaw);stage='PENDING';attempted++;properties.setProperty(key,p.pendingText);exactPair(p.pendingText,input.oldConfigRaw);stage='CONFIG';attempted++;properties.setProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1',input.newConfigRaw);exactPair(p.pendingText,input.newConfigRaw);stage='COMMITTED';attempted++;properties.setProperty(key,input.receiptText);exactPair(input.receiptText,input.newConfigRaw);currentUniverse=p.newUniverse;var a=archiveAdapter();a.setUniverse(currentUniverse);a.setAuthority(archiveAuthority(JSON.parse(input.newConfigRaw)));a.loadIndex();archiveMutationGuard();exactPair(input.receiptText,input.newConfigRaw);return {schema:'BackofficeNativeRecipientCompatibilityApplied/v1',complete:true,verified:true,stage:'COMMITTED',propertyWriteAttempts:attempted,baselineCount:p.receipt.baselineCount,noEligibility:true};}
    catch(error){return {schema:'BackofficeNativeRecipientCompatibilityApplied/v1',complete:false,verified:false,stage:stage,propertyWriteAttempts:attempted,status:'UNCERTAIN_KEEP_STOP_FOR_EXACT_READBACK',noRetry:true,noEligibility:true};}
  }
  function archiveAdapter(){
    hold(typeof BackofficeNativeArchiveV2!=='undefined'&&typeof BackofficeNativeArchiveV2.create==='function','strict native archive implementation missing');
    if(!archiveInstance)archiveInstance=BackofficeNativeArchiveV2.create({hold:hold,sha:archiveTerminalSha,copy:copy,wholeRow:wholeRow,mutationBoundaryGuarded:true,reservePreservationPeak:reservePreservationPeak,terminalProofCurrent:terminalProofCurrent,validatePreviousControl:function(){archiveMutationFence();return terminalReceiptCurrent(terminalProofReceipt);},commitRootGuard:commitRootGuard,beginCompletionProof:beginCompletionProof,endCompletionProof:function(){terminalBankDigest=null;completionProof=null;},completeOperationGuard:function(){archiveMutationGuard();return true;},terminalOrphanComplete:terminalOrphanComplete,byteLength:utf8Length,reserveSourceRetention:reserveSourceRetention,captureSourceRetentionTarget:captureSourceRetentionTarget,reserveStorageMinimum:function(kind){hold(kind==='PERSIST','exact minimum storage kind required');checkBudget(4753);return true;},checkBudget:checkBudget,now:function(){return Date.now();},lockHeld:function(){return lockHeld&&nativeLockHeld();},props:archiveOwnedProperties,
      consumeSourceMetadataTail:consumeSourceMetadataTail,withSourceMetadataProof:withSourceMetadataProof,readLive:archiveLiveRect,casLive:casWritesVerified,casLocators:casArchiveLocators,readCommit:archiveCommitRead,readPayloadBatch:function(first,last){var merged=consumeUsagePost('USAGE_PAYLOAD',first,last,0,20,[]);if(merged)return copy(merged.capture);var L=BackofficeNativeArchiveV2.layout;hold(integer(first,L.payloadFirst,L.rowCount)&&integer(last,first,Math.min(first+205,L.rowCount)),'bounded usage payload readback required');var p={name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:first,last:last,column:0,width:20};return captureFor(freshCanonicalRects([],p),L.name,first,last,0,20);},readArchiveRect:archiveRect,writeArchiveRows:writeArchiveRows,ensureArchiveSheet:function(){return archiveMetadata(true);},beginLogicalReadset:function(){if(!sourceMetadataRefreshActive&&!retentionReadActive)archiveReadset=newReadset();},verifyArchiveStorageCapacity:function(){var L=BackofficeNativeArchiveV2.layout;archiveMetadata(false);hold(archiveCellCapacity&&(archiveCellCapacity.archiveExists||archiveCellCapacity.existingCells+L.rowCount*L.width<=10000000),'archive finite native workbook cell capacity unavailable');},snapshotMetrics:function(x){hold(semanticCapacity&&semanticCapacity.snapshot===x&&semanticCapacity.safetyRows===x.Prospects.safetyRows&&semanticCapacity.evidenceRows===x.Evidence.rows,'archive capacity snapshot identity changed');return copy(semanticCapacity.metrics);},verifyDestinationDisplays:blankEvidenceDisplayProof});
    return archiveInstance;
  }

  function reserveSourceRetention(input){hold(lockHeld&&nativeLockHeld()&&input&&input.preview&&input.values.length>=1&&input.values.length<=205&&Array.isArray(input.copyRows)&&input.copyRows.length===input.values.length+1,'mixed held bounded storage plan required');var blocks=0,bytes=8192;input.copyRows.forEach(function(row){wholeRow(row,20);var cost=utf8Length(JSON.stringify({values:row.map(function(c){return Object.keys(c).length?{userEnteredValue:copy(c)}:{};})}))+1;hold(cost+8192<=1900000,'mixed single copy request bytes BEFORE pending');if(bytes+cost>1900000){blocks++;bytes=8192;}bytes+=cost;});if(bytes>8192)blocks++;var completion=input.copyRows.length>128?5:4,declared=8+blocks*4+4+6+2+completion+5;hold(archiveReadset&&archiveReadset.actualRanges+declared<=40,'mixed full lifecycle declared readset exceeds40 BEFORE pending');function dtoBytes(rows,width){hold(Array.isArray(rows),'mixed byte plan rows required');var nativeRows=rows.map(function(row){wholeRow(row,width);return {values:row.map(function(c){return {userEnteredValue:c,formattedValue:own(c,'stringValue')?c.stringValue:''};})};});return utf8Length(JSON.stringify({startRow:802,startColumn:19,rowData:nativeRows}))+2048;}hold(input.currentBankRows.length===500&&input.plannedBankUpperRows.length===500&&input.canonicalUpperRows.length===2,'mixed exact current/planned bank byte plans required');hold(sha(JSON.stringify(input.currentBankRows))===JSON.parse(properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)).indexTypedSha256,'mixed exact current bank byte plan/root mismatch BEFORE pending');var bankBytes=Math.max(dtoBytes(input.currentBankRows,1),dtoBytes(input.plannedBankUpperRows,1)),copyBytes=dtoBytes(input.copyRows,20),canonicalBytes=Math.max(dtoBytes([input.canonicalUpperRows[0]],26),dtoBytes([input.canonicalUpperRows[1]],26)),descriptor=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,archiveInstance.mutationScope());hold(preservationReadBytePlan&&preservationReadBytePlan.descriptorSha256===sha(JSON.stringify(descriptor)),'mixed measured preserved archive slot byte plan unavailable BEFORE pending');var orphanBytes=preservationReadBytePlan.bytes,totalBytes=6*bankBytes+6*copyBytes+12*canonicalBytes+declared*(orphanBytes+8192),windowBytes=bankBytes+copyBytes+2*canonicalBytes+orphanBytes+16384;hold(archiveReadset.rawBytes+totalBytes<=64*1024*1024&&archiveReadset.projectedBytes+totalBytes<=64*1024*1024&&windowBytes<=32*1024*1024,'mixed exact planned bank/copy/canonical byte bounds BEFORE pending');checkBudget((8+Math.max(0,blocks-1)+5)*1251+1000);return true;}
  // Capture-only storage planning: references are not current source/send proof.
  function sourceRetentionReuseReferences(refs,row,metadataHash,metadataTyped){
    safeData(refs,'retention reuse references');wholeRow(metadataTyped,26);
    hold(lockHeld&&nativeLockHeld()&&typeof metadataHash==='string'&&sha(JSON.stringify(metadataTyped))===metadataHash,'exact retained metadata reuse preimage required');
    var reuseOwner={lock:lockEpoch,action:budgetStarted,mutation:canonicalMutationEpoch};
    var doc=JSON.parse(metadataTyped[3].stringValue),entry=doc&&doc.value&&doc.value.sourceEntry,m=entry&&entry.sourceProof;
    hold(doc.schema==='BackofficeNativeJournal/v1'&&doc.kind==='source-metadata'&&m&&Array.isArray(m.chunks),'retention reuse metadata required');
    var explicit=own(m,'chunkReferenceSchema'),located=explicit&&m.chunkReferenceSchema==='BackofficeNativeLocatedChunkRefs/v2',delta=explicit&&(located||m.chunkReferenceSchema==='BackofficeNativeFixedChunkReplacements/v1');
    var expected=m.chunks.map(function(ref,i){var out=copy(ref);out.location=located?copy(ref.location):{kind:'EVIDENCE_LOGICAL',sheetId:sheets.Evidence.id,row:ref.row};
      if(!explicit){out.originSourceId=entry.sourceId;out.originIndex=i;out.originTotal=m.chunkCount;out.originRetainedJsonSha256=m.retainedJsonSha256;}
      if(!delta){out.originChunkSha256=out.chunkSha256;out.replacements=[];}return out;});
    hold(JSON.stringify(expected)===JSON.stringify(refs),'exact metadata-derived reuse references required');
    var a=archiveAdapter(),plan=a.sourceRetentionReadPlan(refs,row),metadata=plan.entries.filter(function(e){return e.storageKind==='EVIDENCE_LOGICAL'&&e.logicalRow===row;});
    if(metadata.length!==1)return null;
    hold(metadata[0].state==='ACTIVE'&&metadata[0].summary.kind==='source-metadata'&&metadata[0].summary.originalTypedRowSha256===metadataHash,'retention reuse admitted metadata changed');
    var admitted=refs.every(function(ref){return plan.entries.some(function(e){return e.state==='ACTIVE'&&e.storageKind===ref.location.kind&&
      (e.storageKind==='ARCHIVE_DIRECT'?e.payloadRow:e.logicalRow)===ref.row&&e.summary.kind==='source-chunk'&&e.summary.originalTypedRowSha256===ref.rowSha256;});});
    if(!admitted)return null; // Unsupported before the fresh validation read; no uncertain fallback.
    var rootRaw=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),controlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),configRaw=properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1');
    function exactReuse(){hold(lockHeld&&nativeLockHeld()&&lockEpoch===reuseOwner.lock&&budgetStarted===reuseOwner.action&&canonicalMutationEpoch===reuseOwner.mutation&&properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===rootRaw&&properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===controlRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===configRaw,'retention reuse authority changed');}
    exactReuse();var previousControl=JSON.parse(controlRaw).pendingMutation;if(!previousControl||!verifiedControl(previousControl)){archiveMutationFence();hold(a.validateSourceRetentionReadPlan(plan)===true,'fresh retained reuse admissions unavailable');exactReuse();var ordinaryResult=copy(refs);exactReuse();return ordinaryResult;}hold(!terminalReadExtra,'one source reuse material callback required');var callbackAccepted=false;terminalReadExtra=function(){var before={getAttempts:sheetsReadStats.attempts,frame:authorityFrameEpoch,mutation:canonicalMutationEpoch};exactReuse();hold(a.validateSourceRetentionReadPlan(plan)===true,'fresh retained reuse admissions unavailable');exactReuse();hold(before.getAttempts===sheetsReadStats.attempts&&before.frame===authorityFrameEpoch&&before.mutation===canonicalMutationEpoch,'same-response reuse crossed an actual boundary');callbackAccepted=true;return true;};try{archiveMutationFence();hold(callbackAccepted,'fresh previous terminal union did not validate reuse');exactReuse();var result=copy(refs);exactReuse();return result;}finally{terminalReadExtra=null;}
  }
  function snapshotSourceMetadata(cfg,handle,row,expected){
    // Entry-only route decision. No fallback is permitted once fresh planning/read begins.
    if(readBundle||completionProof||canonicalUnionActive||sourceMetadataRefreshActive)return null;
    hold(lockHeld&&nativeLockHeld(),'source metadata refresh held lock required');var a=archiveAdapter(),d=a.sourceMetadataRefreshPlan(row);if(!d)return null;
    var controlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),j=JSON.parse(controlRaw||'null'),v=j&&j.pendingMutation;
    if(!v||!verifiedControl(v)||['PERSIST','SOURCE_RETENTION'].indexOf(v.postcondition.kind)<0||v.postcondition.canonicalRows.length!==1||v.postcondition.canonicalRows[0]!==row||d.payloadRow<Number('{{CONFIGURE_PRIVATE_ARCHIVE_FIRST_PAYLOAD_ROW}}')||d.payloadRow>1176)return null;
    hold(!expected||expected===d.entry.summary.originalTypedRowSha256,'source metadata refresh expected original changed');
    var scope={declaration:d,expected:expected||d.entry.summary.originalTypedRowSha256,controlRaw:controlRaw,configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1'),logicalRow:null};
    var result=snapshot(cfg,handle,scope);hold(scope.logicalRow,'same-response source metadata original missing');return {canonicalSnapshot:result,logicalRow:scope.logicalRow};
  }
  function snapshot(cfg,handle,sourceRefresh,terminalSeed){
    lastSnapshotCapacity=null;semanticCapacity=null;safeData(cfg,'semantic snapshot configuration');hold(record(cfg),'independent semantic snapshot configuration required');hold(lockHeld&&nativeLockHeld(),'held project lock required for trusted semantic snapshot');var expectedP=wholeRow(cfg.prospectsHeaders,27),expectedE=wholeRow(cfg.evidenceHeaders,26),meta=metadata(),at=stamp();archiveCanonicalMeta=meta;archiveMetadata(false,archiveWorkbookMetadata);archiveSnapshotIndex=null;
    hold(meta.Prospects.rowCount<=2000&&meta.Prospects.rowCount+meta.Evidence.rowCount<=12000,'semantic fixed canonical physical row bounds exceeded');if(handle!==undefined&&handle!==null){safeData(handle,'semantic selected handle');hold(record(handle)&&Object.keys(handle).sort().join('|')==='leadId|row'&&integer(handle.row,6,meta.Prospects.rowCount)&&typeof handle.leadId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(handle.leadId),'exact selected row/lead handle required');}
    var result={schema:'BackofficeNativeSemanticSnapshot/v2',spreadsheetId:workbook,checkedAt:at,ref:'https://docs.google.com/spreadsheets/d/'+workbook+'/edit#native-semantic-v2-'+Date.parse(at),Prospects:{sheetId:sheets.Prospects.id,rowCount:meta.Prospects.rowCount,width:27,columns:semanticColumns.slice(),safetyRows:[],organizationDisplay:[],headers:null,target:null},Evidence:{sheetId:sheets.Evidence.id,rowCount:meta.Evidence.rowCount,width:26,rows:[],displayRows:[],archiveSummaries:[]}},plans=[],measurement=newReadset();
    function add(name,first,last,column,width,type){plans.push({name:name,sheetId:sheets[name].id,rowCount:meta[name].rowCount,columnCount:meta[name].columnCount,first:first,last:last,column:column,width:width,type:type});}
    for(var first=1;first<=meta.Prospects.rowCount;first+=500){var last=Math.min(first+499,meta.Prospects.rowCount);[[1,3],[11,16]].forEach(function(span){add('Prospects',first,last,span[0],span[1],'SAFETY');});}
    var evidenceStart=plans.length;for(var firstE=1;firstE<=meta.Evidence.rowCount;firstE+=500)add('Evidence',firstE,Math.min(firstE+499,meta.Evidence.rowCount),0,26,'EVIDENCE');
    // Natural Evidence order is distributed across the final request windows; adjacent heavy physical blocks never share a window.
    var evidencePlans=plans.splice(evidenceStart);plans=plans.concat(evidencePlans);
    add('Prospects',5,5,0,27,'HEADERS');if(handle)add('Prospects',handle.row,handle.row,0,27,'TARGET');hold(plans.length<=38,'semantic canonical readset plan exceeds38 ranges');var L=BackofficeNativeArchiveV2.layout,rootRaw=properties.getProperty(L.rootKey);if(rootRaw!==null){var rootSelector=JSON.parse(rootRaw);hold(rootSelector&&rootSelector.sheetId===L.sheetId&&['A','B'].indexOf(rootSelector.bank)>=0,'snapshot archive root selector invalid');archiveSnapshotIndex={rootRaw:rootRaw,column:rootSelector.bank==='A'?0:1,capture:null};plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:L.indexFirst,last:L.indexLast,column:archiveSnapshotIndex.column,width:1,type:'INDEX'});}
    var snapshotDescriptor=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,archiveInstance?archiveInstance.mutationScope():null),snapshotOrphan=null,snapshotAuthority={root:properties.getProperty(L.rootKey),control:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),config:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')};
    function exactSnapshotAuthority(){hold(lockHeld&&nativeLockHeld(),'snapshot planning held lock changed');hold(properties.getProperty(L.rootKey)===snapshotAuthority.root&&properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===snapshotAuthority.control&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===snapshotAuthority.config,'snapshot root/control/config preimage changed');var current=BackofficeNativeArchiveV2.mutationFence(properties,sha,hold,archiveInstance?archiveInstance.mutationScope():null);hold(JSON.stringify(current)===JSON.stringify(snapshotDescriptor),'snapshot preservation descriptor changed');}
    if(snapshotDescriptor)plans.push({name:L.name,sheetId:L.sheetId,rowCount:L.rowCount,columnCount:L.width,first:Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),last:Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),column:0,width:20,type:'ORPHAN'});
    if(sourceRefresh){hold(snapshotDescriptor&&archiveSnapshotIndex&&rootRaw===sourceRefresh.declaration.rootText&&snapshotAuthority.control===sourceRefresh.controlRaw&&snapshotAuthority.config===sourceRefresh.configRaw,'source metadata refresh declared authority changed BEFORE read');var op=plans.filter(function(p){return p.type==='ORPHAN';});hold(op.length===1,'source metadata refresh exact orphan plan missing');op[0].last=sourceRefresh.declaration.payloadRow;hold(op[0].last-op[0].first<128,'source metadata refresh finite payload gap exceeded');}
    if(terminalSeed){hold(terminalSeed===captureSeedOwner&&!sourceRefresh&&snapshotDescriptor&&archiveSnapshotIndex&&rootRaw===terminalSeed.rootText&&snapshotAuthority.control===terminalSeed.controlRaw&&snapshotAuthority.config===terminalSeed.configRaw,'capture bootstrap exact declared authority changed BEFORE read');var orphanPlan=plans.filter(function(p){return p.type==='ORPHAN';});hold(orphanPlan.length===1,'capture bootstrap orphan declaration missing');orphanPlan[0].last=Math.max.apply(null,[Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}')].concat(terminalSeed.payloadRows));hold(orphanPlan[0].last-orphanPlan[0].first<128,'capture bootstrap complete tail exceeds existing interval bound');}
    hold(plans.length<=40,'snapshot complete declared range bound exceeded');
    for(var r=0;r<meta.Prospects.rowCount;r++){result.Prospects.safetyRows.push(Array(11));result.Prospects.organizationDisplay.push(undefined);}var seen={};
    var windowCount=Math.ceil(plans.length/16),windows=[];for(var wi=0;wi<windowCount;wi++){var plannedWindow=[];for(var pi=wi;pi<plans.length;pi+=windowCount)plannedWindow.push(plans[pi]);windows.push(plannedWindow);}var refreshItems=null,refreshEvent=null,seedItems=null,seedEvent=null;
    if(sourceRefresh){var required=plans.filter(function(p){return p.type==='INDEX'||p.type==='ORPHAN'||p.type==='TARGET'||(p.type==='EVIDENCE'&&p.first<=sourceRefresh.declaration.row&&p.last>=sourceRefresh.declaration.row);});hold(required.length===4,'source metadata refresh last-window complete plan missing');var lastWindow=windows[windowCount-1];required.forEach(function(p){if(lastWindow.indexOf(p)>=0)return;var from=windows.filter(function(w){return w.indexOf(p)>=0;});hold(from.length===1,'source metadata refresh duplicate planned interval');var replace=lastWindow.findIndex(function(q){return required.indexOf(q)<0;});hold(replace>=0,'source metadata refresh cannot fit exact last window');var q=lastWindow[replace],at=from[0].indexOf(p);from[0][at]=q;lastWindow[replace]=p;});hold(windows.every(function(w){return w.length<=16;}),'source metadata refresh window cap unchanged');}
    if(terminalSeed){var requiredSeed=plans.filter(function(p){return p.type==='INDEX'||p.type==='ORPHAN'||p.type==='TARGET'||p.type==='EVIDENCE'&&terminalSeed.canonicalRows.some(function(row){return p.first<=row&&row<=p.last;});});var lastSeedWindow=windows[windowCount-1];requiredSeed.forEach(function(p){if(lastSeedWindow.indexOf(p)>=0)return;var from=windows.filter(function(w){return w.indexOf(p)>=0;});hold(from.length===1,'capture bootstrap duplicate planned interval');var replace=lastSeedWindow.findIndex(function(q){return requiredSeed.indexOf(q)<0;});hold(replace>=0,'capture bootstrap complete terminal union cannot fit');var q=lastSeedWindow[replace],at=from[0].indexOf(p);from[0][at]=q;lastSeedWindow[replace]=p;});hold(windows.every(function(w){return w.length<=16;}),'capture bootstrap final response range cap changed');}
    for(var offset=0;offset<windowCount;offset++){var windowPlans=windows[offset];exactSnapshotAuthority();var snapshotWindow=fetchRectWindow(windowPlans,measurement,false);var thisEvent=freshOrphanSource();exactSnapshotAuthority();if(sourceRefresh&&offset===windowCount-1){refreshItems=snapshotWindow;refreshEvent=thisEvent;}if(terminalSeed&&offset===windowCount-1){seedItems=snapshotWindow;seedEvent=thisEvent;}snapshotWindow.forEach(function(item){var p=item.plan,c=item.capture,k=p.name+'|'+p.first+'|'+p.column+'|'+p.type;hold(!own(seen,k),'semantic duplicate declared range');seen[k]=true;
      if(p.type==='ORPHAN'){hold(snapshotOrphan===null,'snapshot orphan duplicated');snapshotOrphan=(sourceRefresh||terminalSeed)?{rows:[c.rows[0]],displayRows:[c.displayRows[0]],checkedAt:c.checkedAt}:c;return;}if(p.type==='INDEX'){archiveSnapshotIndex.capture=c;return;}if(p.type==='HEADERS'){result.Prospects.headers=c.rows[0];return;}if(p.type==='TARGET'){hold(c.rows[0][14].stringValue===handle.leadId,'native selected target lead changed');result.Prospects.target={row:handle.row,leadId:handle.leadId,typedRow27:c.rows[0],displayRow27:c.displayRows[0]};return;}
      c.rows.forEach(function(row,i){var ri=p.first-1+i;if(p.type==='EVIDENCE'){result.Evidence.rows[ri]=row;result.Evidence.displayRows[ri]=c.displayRows[i];return;}semanticColumns.forEach(function(column,ci){if(column>=p.column&&column<p.column+p.width){hold(result.Prospects.safetyRows[ri][ci]===undefined,'semantic safety column duplicate');result.Prospects.safetyRows[ri][ci]=row[column-p.column];}});if(p.column===1)result.Prospects.organizationDisplay[ri]=c.displayRows[i][0];});});}
    if(snapshotDescriptor){hold(snapshotOrphan&&snapshotOrphan.rows.length===1&&snapshotOrphan.displayRows.length===1,'snapshot complete orphan proof missing');wholeRow(snapshotOrphan.rows[0],20);hold(sha(JSON.stringify(snapshotOrphan.rows[0]))===snapshotDescriptor.fullTyped20Sha256&&sha(JSON.stringify(snapshotOrphan.displayRows[0]))===snapshotDescriptor.fullDisplay20Sha256&&sha(snapshotOrphan.rows[0][0].stringValue)===snapshotDescriptor.headerSha256,'snapshot preserved archive slot changed');}exactSnapshotAuthority();

    if(sourceRefresh){
      var priorReadset=archiveReadset,priorUnion=canonicalUnionActive;archiveReadset=measurement;sourceMetadataRefreshActive=true;sourceMetadataProofActive=true;sourceMetadataProofEvent=refreshEvent;refreshEvent.rootRaw=snapshotAuthority.root;refreshEvent.controlRaw=snapshotAuthority.control;refreshEvent.configRaw=snapshotAuthority.config;
      function exactRefresh(){var o=proofObservation('SOURCE_METADATA_REFRESH_BEFORE_CELLS',['sourceCurrent']);o.source=retentionCurrentObservation();try{o.stage='EXACT_SNAPSHOT_AUTHORITY';exactSnapshotAuthority();o.stage='ORIGINAL_EVENT_CURRENT';var current=proofCheck(o,'sourceCurrent',orphanSourceCurrent(refreshEvent,o.source));if(!current)proofEmit(o,'PREDICATE_FALSE');hold(current,'source metadata refresh last actual response changed BEFORE cells');}catch(error){proofEmit(o,'THREW');throw error;}}
      try{exactRefresh();var proofItems=refreshItems.filter(function(i){return i.plan.type!=='ORPHAN';}),payloadPlan=refreshItems.filter(function(i){return i.plan.type==='ORPHAN';});hold(payloadPlan.length===1,'source metadata refresh payload missing/duplicate');var both=payloadPlan[0],basePlan=both.plan;
        (function(){var mixed=JSON.parse(sourceRefresh.controlRaw).pendingMutation.postcondition;return mixed.kind==='SOURCE_RETENTION'?Array.from({length:mixed.directCount},function(_,i){return mixed.directFirst+i;}).concat([Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),sourceRefresh.declaration.payloadRow]):[Number('{{CONFIGURE_PRIVATE_ARCHIVE_PRESERVED_ROW}}'),sourceRefresh.declaration.payloadRow];}()).forEach(function(row){var p=Object.assign({},basePlan,{first:row,last:row});var at=row-basePlan.first;hold(both.capture.rows[at]&&both.capture.displayRows[at],'source metadata refresh exact original coverage missing');proofItems.push({plan:p,capture:{rows:[both.capture.rows[at]],displayRows:[both.capture.displayRows[at]],checkedAt:both.capture.checkedAt}});});
        canonicalUnionActive=true;canonicalUnionCapture=inheritTerminalEvent(Object.assign({},refreshEvent,{items:proofItems}),refreshEvent);completionProof=canonicalUnionCapture;canonicalUnionReceipt={lockEpoch:lockEpoch,mutationEpoch:canonicalMutationEpoch,checkedMs:refreshEvent.checkedMs,getAttempts:refreshEvent.getAttempts,rootText:refreshEvent.rootRaw,controlSha256:sha(JSON.stringify(JSON.parse(refreshEvent.controlRaw).pendingMutation))};
        capturePreservation(proofItems,refreshEvent);var freshArchive=archiveAdapter();freshArchive.loadIndex();var freshPlan=freshArchive.sourceMetadataRefreshPlan(sourceRefresh.declaration.row);hold(freshPlan&&JSON.stringify(freshPlan)===JSON.stringify(sourceRefresh.declaration),'source metadata refresh same-response ACTIVE admission changed');
        terminalValidationActive=true;completionProof=null;freshArchive.validateTerminalControl();exactRefresh();completionProof=canonicalUnionCapture;sourceRefresh.logicalRow=freshArchive.logical(sourceRefresh.declaration.row,sourceRefresh.expected,'SOURCE_METADATA');exactRefresh();
        var metadataDoc=JSON.parse(sourceRefresh.logicalRow[3].stringValue),proof=metadataDoc.value&&metadataDoc.value.sourceEntry&&metadataDoc.value.sourceEntry.sourceProof;hold(proof&&typeof proof.expiresAtUtc==='string'&&Number.isFinite(Date.parse(proof.expiresAtUtc))&&Date.parse(proof.expiresAtUtc)>Date.now(),'source metadata refresh original source expiry HOLD');exactRefresh();
      }finally{sourceMetadataRefreshActive=false;sourceMetadataProofActive=false;sourceMetadataProofEvent=null;terminalValidationActive=false;canonicalUnionActive=priorUnion;completionProof=null;canonicalUnionCapture=null;canonicalUnionReceipt=null;preservationReceipt=null;terminalProofReceipt=null;terminalOrphanAck=null;terminalOrphanEvent=null;archiveReadset=priorReadset;}
    }
    result.Prospects.safetyRows.forEach(function(row){wholeRow(row,11);});hold(result.Prospects.organizationDisplay.every(function(v){return typeof v==='string';})&&sameRows(result.Prospects.headers,expectedP)&&sameRows(result.Evidence.rows[4],expectedE),'semantic dense coverage/exact row5 headers changed');
    if(handle){var target=result.Prospects.target;semanticColumns.forEach(function(col,i){hold(sameRows(target.typedRow27[col],result.Prospects.safetyRows[handle.row-1][i]),'native selected full27 differs from complete safety projection');});hold(target.displayRow27[1]===result.Prospects.organizationDisplay[handle.row-1],'native selected organization display changed');}
    currentUniverse=configuredUniverse(cfg,result.Evidence.rows);var archive=archiveAdapter();archive.setUniverse(currentUniverse);if(cfg.ownerAuthority)archive.setAuthority(archiveAuthority(cfg));archiveReadset=measurement;try{if(terminalSeed)validateCaptureSeed(terminalSeed,seedItems,seedEvent);else archive.loadIndex();}finally{archiveSnapshotIndex=null;}result.Evidence.rows.forEach(function(row,i){result.Evidence.archiveSummaries[i]=i<5?null:archive.summaryFor(row,i+1);});archiveReadset=null;
    semanticCapacity={snapshot:result,safetyRows:result.Prospects.safetyRows,evidenceRows:result.Evidence.rows,metrics:copy(measurement)};checkBudget();return result;
  }
  function migrateArchiveRows(cfg,rows){hold(!readBundle,"read bundle cannot cross an archive migration boundary");hold(lockHeld&&nativeLockHeld(),'held project lock required for archive migration');safeData(rows,'archive migration rows');currentUniverse=configuredUniverse(cfg,null);var a=archiveAdapter();a.setUniverse(currentUniverse);a.setAuthority(archiveAuthority(cfg));hold(Array.isArray(rows)&&rows.length>0&&rows.length<=32,'native migration phase must contain at most32 rows');archiveReadset=newReadset();a.loadIndex();var results=a.migrate(rows,undefined,true);Logger.log('FERNAIN_ARCHIVE_MIGRATION_V2:'+JSON.stringify({schema:'BackofficeNativeArchiveMigrationReport/v2',requestedRows:rows.length,verifiedArchivedRows:results.filter(function(r){return !!r.archiveSummary;}).length,keptFullRows:results.filter(function(r){return !r.archiveSummary;}).length,entryCount:a.entryCount(),acknowledged:true,verified:true,sendAttempted:false,originalPayloadsRetained:true,checkedAt:stamp()}));archiveReadset=null;return {acknowledged:true,verified:true,rows:results};}
  function withQuotaBookkeepingReport(report) {
    report.canonicalReadOnly = true;
    report.quotaBookkeepingOnly = true;
    report.quotaBookkeepingPropertyKey = sheetsReadKey;
    report.internalMeterPropertyWriteAttempts = sheetsReadStats.internalMeterWriteAttempts;
    report.propertyWriteAttempted = sheetsReadStats.internalMeterWriteAttempts > 0;
    report.readOnly = !report.propertyWriteAttempted;
    report.sheetsGetMetrics = copy(sheetsReadStats);
    return report;
  }
  function archiveUnindexedCopyInspectionReadOnly(cfg,expected){
    hold(lockHeld&&nativeLockHeld(),'held project lock required for finite unindexed copy inspection');safeData(cfg,'finite unindexed copy inspection configuration');safeData(expected,'finite unindexed copy inspection pins');
    hold(cfg&&cfg.projectId===projectId&&cfg.spreadsheetId===workbook,'finite unindexed copy exact configured project/workbook required');
    archiveCanonicalMeta=metadata();archiveReadset=newReadset();hold(archiveMetadata(false),'fixed archive sheet required for pinned unindexed copy inspection');
    currentUniverse=configuredUniverse(cfg,null);var archive=archiveAdapter();archive.setUniverse(currentUniverse);return withQuotaBookkeepingReport(archive.inspectUnindexedReadOnly(expected,archiveAuthority(cfg),archiveCanonicalMeta.Evidence.rowCount));
  }
  function archiveReadOnlyReconciliation(cfg){
    hold(lockHeld&&nativeLockHeld(),'held project lock required for finite archive inspection');
    safeData(cfg,'finite archive inspection configuration');
    hold(cfg&&cfg.projectId===projectId&&cfg.spreadsheetId===workbook,'finite archive inspection exact configured project/workbook required');
    archiveCanonicalMeta=metadata();archiveReadset=newReadset();
    var meta=archiveMetadata(false);
    if(!meta){hold(properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===null,'archive root without fixed physical sheet; KEEP');return withQuotaBookkeepingReport({schema:'BackofficeNativeArchiveReadOnlyReconciliation/v1',complete:true,readOnly:true,rootPresent:false,archiveSheetPresent:false,admittedEntries:0,unknownMeansKeep:true,scopeComplete:false,propertyWriteAttempted:false,canonicalWriteAttempted:false,archiveWriteAttempted:false,sourceFetchAttempted:false,sendAttempted:false});}
    currentUniverse=configuredUniverse(cfg,null);var archive=archiveAdapter();archive.setUniverse(currentUniverse);var result=archive.reconcileReadOnly();result.archiveSheetPresent=true;return withQuotaBookkeepingReport(result);
  }
  function archiveMeasurement(cfg,rows){hold(lockHeld&&nativeLockHeld(),'held project lock required for archive measurement');hold(Array.isArray(rows)&&rows.length>0&&rows.length<=40&&rows.every(function(r){return integer(r,6,12000);})&&new Set(rows).size===rows.length,'bounded distinct read-only archive measurement rows required');archiveReadset=newReadset();currentUniverse=configuredUniverse(cfg,null);var eligible=0,bytes=0,kinds={},groups=[],sorted=rows.slice().sort(function(a,b){return a-b;});sorted.forEach(function(row){var g=groups[groups.length-1];if(g&&row===g.last+1)g.last=row;else groups.push({first:row,last:row});});hold(groups.length<=8,'read-only archive measurement exceeds8groups');groups.forEach(function(g){var r=archiveLiveRect(g.first,g.last);r.rows.forEach(function(row,i){var summary=BackofficeNativeArchiveV2.classify(row,r.displayRows[i],g.first+i,currentUniverse,sha,function(t){return utf8(t).length;});if(summary){eligible++;bytes+=utf8(JSON.stringify(row)).length+utf8(JSON.stringify(r.displayRows[i])).length;kinds[summary.kind]=(kinds[summary.kind]||0)+1;}});});var report={schema:'BackofficeNativeArchiveMeasurement/v2',complete:true,readOnly:true,checkedAt:stamp(),sampleRows:rows.length,actualPhysicalReadGroups:groups.length,strictEligibleRows:eligible,keptFullRows:rows.length-eligible,verifiedEligibleCopyBytes:bytes,eligibleKinds:kinds,archiveMaximumRows:BackofficeNativeArchiveV2.layout.maxEntries,archiveMaximumBytes:BackofficeNativeArchiveV2.layout.maxBytes,canonicalWriteAttempted:false,propertyWriteAttempted:false,sendAttempted:false};withQuotaBookkeepingReport(report);Logger.log('FERNAIN_ARCHIVE_MEASUREMENT_V2:'+JSON.stringify(report));return report;}

  function casSourceChunks(writes,expires){var ack=casSourceChunksPhysical(writes,expires),results=archiveAdapter().migrate(writes.map(function(w){return w.row;}),expires);ack.physicalRows=results.map(function(r){return r.physicalAfter26;});ack.physicalDisplayRows=results.map(function(r){return r.physicalDisplay26;});ack.archiveSummaries=results.map(function(r){return r.archiveSummary||null;});return ack;}

  // Separate read-only proof: no new fields enter the authoritative full-table snapshot.
  function blankEvidenceDisplayProof(value) {
    var count = value && value.Evidence && value.Evidence.rows && value.Evidence.rows.length;
    hold(integer(count, 6, 12000), 'native source CAPACITY_HOLD destination display proof invalid');
    var fields = 'spreadsheetId,sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(effectiveFormat(numberFormat)))))';
    var url = 'https://sheets.googleapis.com/v4/spreadsheets/' + workbook + '?includeGridData=true&prettyPrint=false&fields=' +
      encodeURIComponent(fields) + '&ranges=' + encodeURIComponent("'Evidence'!A6:G" + count);
    var token = null, response = null, text, status;
    try {
      token = nativeBoundary(function(){return ScriptApp.getOAuthToken();});
      hold(typeof token === 'string' && token.length > 0, 'native source CAPACITY_HOLD destination display proof unavailable');
      response = sheetsFetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + token },
        validateHttpsCertificates: true, followRedirects: false, muteHttpExceptions: true,
        timeoutSeconds: Math.min(110, Math.floor(checkBudget(1000) / 1000)) });
      status = response.getResponseCode();
      if (status === 200) text = response.getContentText();
    } finally { token = null; response = null; }
    hold(status === 200 && typeof text === 'string', 'native source CAPACITY_HOLD destination display proof unavailable');
    hold(snapshotUtf8ByteLength(text) <= 32 * 1024 * 1024, 'native source CAPACITY_HOLD destination display proof invalid');
    var result = JSON.parse(text); text = null; safeData(result, 'Sheets destination text formats');
    function keys(object, allowed, needed) {
      hold(record(object) && Object.keys(object).every(function (key) { return allowed.indexOf(key) >= 0; }) &&
        (needed || []).every(function (key) { return own(object, key); }), 'native source CAPACITY_HOLD destination display proof invalid');
    }
    keys(result, ['spreadsheetId', 'sheets'], ['spreadsheetId', 'sheets']);
    hold(result.spreadsheetId === workbook && Array.isArray(result.sheets) && result.sheets.length === 1,
      'native source CAPACITY_HOLD destination display proof invalid');
    var sheet = result.sheets[0]; keys(sheet, ['properties', 'data'], ['properties', 'data']);
    keys(sheet.properties, ['sheetId', 'title'], ['sheetId', 'title']);
    hold(sheet.properties.sheetId === sheets.Evidence.id && sheet.properties.title === 'Evidence' &&
      Array.isArray(sheet.data) && sheet.data.length === 1, 'native source CAPACITY_HOLD destination display proof invalid');
    var grid = sheet.data[0]; keys(grid, ['startRow', 'startColumn', 'rowData'], ['startRow']);
    hold(grid.startRow === 5 && (!own(grid, 'startColumn') || grid.startColumn === 0),
      'native source CAPACITY_HOLD destination display proof invalid');
    var rows = own(grid, 'rowData') ? grid.rowData : [];
    hold(Array.isArray(rows) && rows.length <= count - 5, 'native source CAPACITY_HOLD destination display proof invalid');
    rows.forEach(function (row, index) {
      if (index % 128 === 0) checkBudget(1000); keys(row, ['values']);
      var cells = own(row, 'values') ? row.values : [];
      hold(Array.isArray(cells) && cells.length <= 7, 'native source CAPACITY_HOLD destination display proof invalid');
      var target = value.Evidence.rows[index + 5];
      hold(Array.isArray(target) && target.length === 26, 'native source CAPACITY_HOLD destination display proof invalid');
      var blank = target.every(function (cell) { return Object.keys(cell).length === 0; });
      cells.forEach(function (cell, col) {
        keys(cell, ['effectiveFormat']); if (!own(cell, 'effectiveFormat')) return;
        var format = cell.effectiveFormat; keys(format, ['numberFormat']);
        if (!own(format, 'numberFormat')) return; var number = format.numberFormat;
        keys(number, ['type', 'pattern'], ['type']);
        hold(typeof number.type === 'string' && (!own(number, 'pattern') || typeof number.pattern === 'string'),
          'native source CAPACITY_HOLD destination display proof invalid');
        if (blank && [0, 1, 2, 3, 4, 6].indexOf(col) >= 0) hold(
          number.type === 'TEXT' && (!own(number, 'pattern') || number.pattern === '@') ||
          number.type === 'NUMBER_FORMAT_TYPE_UNSPECIFIED' && !own(number, 'pattern'),
          'native source CAPACITY_HOLD destination text display is not identity/default');
      });
    });
    checkBudget(1000); return true;
  }
  function snapshotCapacity(value) {
    if(value&&value.schema==='BackofficeNativeSemanticSnapshot/v2'){hold(lockHeld&&nativeLockHeld()&&semanticCapacity&&semanticCapacity.snapshot===value&&semanticCapacity.safetyRows===value.Prospects.safetyRows&&semanticCapacity.evidenceRows===value.Evidence.rows,'native source CAPACITY_HOLD measured semantic snapshot capacity unavailable');blankEvidenceDisplayProof(value);return copy(semanticCapacity.metrics);}

    try {
      hold(lockHeld && nativeLockHeld() && lastSnapshotCapacity && lastSnapshotCapacity.snapshot === value &&
        value.Prospects && value.Evidence && lastSnapshotCapacity.prospectRows === value.Prospects.rows &&
        lastSnapshotCapacity.evidenceRows === value.Evidence.rows &&
        lastSnapshotCapacity.prospectCount === value.Prospects.rows.length &&
        lastSnapshotCapacity.evidenceCount === value.Evidence.rows.length,
        'native source CAPACITY_HOLD measured snapshot capacity unavailable');
      blankEvidenceDisplayProof(value);
    }
    catch (error) {
      lastSnapshotCapacity = null;
      var descriptor = error && Object.getOwnPropertyDescriptor(error, 'message');
      if (descriptor && own(descriptor, 'value') && typeof descriptor.value === 'string' &&
        descriptor.value.indexOf('HOLD: native source CAPACITY_HOLD ') === 0) { error.nativeScope = 'GLOBAL'; throw error; }
      try { hold(false, 'native source CAPACITY_HOLD destination display proof unavailable'); }
      catch (failure) { failure.nativeScope = 'GLOBAL'; throw failure; }
    }
    return JSON.parse(JSON.stringify(lastSnapshotCapacity.metrics));
  }
  function readRow(name, row, width) {
    sheetInfo(name, width);
    hold(integer(row, 1), 'native row exceeds physical bounds');
    return readBlock(name, row, row).rows[0];
  }
  function readRowCapture(name, row, width) {
    var info = sheetInfo(name, width);
    hold(integer(row, 1), 'native capture row exceeds physical bounds');
    var capture = readBlock(name, row, row, true);
    return { sheetId: info.id, sheetName: name, row: row, width: info.width,
      values: capture.rows[0], typedRow: capture.rows[0], displayRow: capture.displayRows[0],
      checkedAt: capture.checkedAt,
      ref: 'https://docs.google.com/spreadsheets/d/' + workbook + '/edit#gid=' + info.id + '&range=A' + row + ':' + info.last + row,
      result: { isError: false, structuredContent: capture.nativeRaw } };
  }
  // Fixed native SDK acknowledgment DTO for this updateCells-only writer.
  // SDK helper functions are transport members; business fields remain strict.
  function batchUpdateAckDto(value, requestCount) {
    var name = 'canonical batchUpdate', count = 0;
    function inspect(object) {
      hold(object && typeof object === 'object' && !isThenable(object), name + ' synchronous native result missing');
      var keys = Object.getOwnPropertyNames(object); count += keys.length + 1;
      hold(count <= 2000000, name + ' native data exceeds structural budget');
      hold(Object.getOwnPropertySymbols(object).length === 0, name + ' native data contains symbol fields');
      keys.forEach(function (key) { var d = Object.getOwnPropertyDescriptor(object, key);
        hold(d && own(d, 'value'), name + ' native accessor field prohibited'); });
      ['error', 'isError'].forEach(function (key) {
        hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
        if (own(object, key)) { var v = Object.getOwnPropertyDescriptor(object, key).value;
          safeData(v, name); hold(!v, name + ' native error'); }
      });
      return keys;
    }
    hold(record(value), name + ' synchronous native result missing');
    inspect(value); required(value, ['spreadsheetId', 'replies'], 'canonical acknowledgment');
    var id = Object.getOwnPropertyDescriptor(value, 'spreadsheetId').value;
    hold(typeof id === 'string' && id === workbook, 'canonical native batch acknowledgment missing/uncertain');
    var replies = Object.getOwnPropertyDescriptor(value, 'replies').value;
    hold(Array.isArray(replies), 'canonical native batch acknowledgment missing/uncertain');
    var keys = inspect(replies), length = Object.getOwnPropertyDescriptor(replies, 'length').value;
    hold(integer(length, 1, 13000) && length === requestCount && keys.length === length + 1,
      'canonical native batch acknowledgment missing/uncertain');
    var result = { spreadsheetId: id, replies: [] };
    for (var index = 0; index < length; index++) {
      hold(own(replies, index), name + ' native array is sparse');
      var reply = Object.getOwnPropertyDescriptor(replies, index).value;
      hold(record(reply), 'canonical native batch acknowledgment missing/uncertain');
      var replyKeys = inspect(reply);
      // updateCells has an empty documented response. Reject unexpected
      // semantic response data while tolerating inert SDK helper members.
      replyKeys.forEach(function (key) {
        if (key === 'error' || key === 'isError') return;
        var member = Object.getOwnPropertyDescriptor(reply, key).value;
        hold(typeof member === 'function' || member === undefined,
          'canonical native batch acknowledgment missing/uncertain');
      });
      result.replies.push({});
    }
    return result;
  }
  function canonicalCasResult(writes,sourceExpiresAtUtc,allocationRows){hold(!readBundle&&!canonicalUnionActive,'read bundle/reentrancy cannot cross a canonical write boundary');var priorMeasurement=archiveReadset,success=false,scalar=null;archiveReadset=newReadset();canonicalUnionActive=true;canonicalAllocationRows=allocationRows||null;try{var result=casWritesVerified(writes,sourceExpiresAtUtc,undefined,true);hold(result&&result.ack&&result.ack.acknowledged===true&&result.ack.verified===true,'complete public canonical storage acknowledgment required');if(terminalProofReceipt){var j=JSON.parse(properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')||'null');hold(j&&j.pendingMutation&&terminalProofCurrent(j.pendingMutation),'exact current scalar storage acknowledgment required at return');scalar=terminalProofReceipt;}success=true;return result;}finally{archiveReadset=priorMeasurement;canonicalUnionActive=false;canonicalAllocationRows=null;canonicalUnionCapture=null;canonicalUnionReceipt=null;completionProof=null;preservationReceipt=null;archivePostReceipt=null;terminalProofReceipt=success?scalar:null;terminalOrphanEvent=null;if(!success)terminalOrphanAck=null;}}
  function casWrites(writes,sourceExpiresAtUtc){return canonicalCasResult(writes,sourceExpiresAtUtc).ack;}
  function consumeSourceMetadataTail(plan,capture){var r=sourceMetadataTailReceipt;sourceMetadataTailReceipt=null;hold(r&&orphanSourceCurrent(r)&&samePlan(r.plan,plan)&&r.capture===capture&&sha(JSON.stringify(capture.rows))===r.typedSha256&&sha(JSON.stringify(capture.displayRows))===r.displaySha256&&properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)===r.rootRaw&&properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')===r.controlRaw&&properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')===r.configRaw,'source metadata tail exact same-response preimage changed BEFORE cells');return true;}
  function appendOnlyFullJournal(write,kind,expires){
    if(expires!==undefined||['pending','attempt-boundary','send-outcome','native-receipt','label-pending','label-readback','canonical-write-pending','confirmed','hold','action-trace'].indexOf(kind)<0)return false;
    safeData(write,'append-only full26 journal plan');
    if(!record(write)||Object.keys(write).sort().join('|')!=='after|expected|row|sheet'||write.sheet!=='Evidence'||!integer(write.row,6,12000))return false;
    var before=wholeRow(write.expected,26),after=wholeRow(write.after,26);
    if(!before.every(function(cell){return Object.keys(cell).length===0;})||after.some(function(cell,i){return i>6&&Object.keys(cell).length!==0;})||[0,1,2,4,5,6].some(function(i){return Object.keys(after[i]).length!==0&&!own(after[i],'stringValue');})||!own(after[3],'stringValue')||after[3].stringValue.length>45000||after[2].stringValue!==kind||after[4].stringValue!=='Native acknowledged write + exact typed readback'||Object.keys(after[5]).length!==0||typeof after[6].stringValue!=='string'||!Number.isFinite(Date.parse(after[6].stringValue)))return false;
    var doc;try{doc=JSON.parse(after[3].stringValue);}catch(_){return false;}
    var valid=record(doc)&&JSON.stringify(doc)===after[3].stringValue&&Object.keys(doc).sort().join('|')==='checkedAt|kind|schema|value'&&doc.schema==='BackofficeNativeJournal/v1'&&doc.kind===kind&&typeof doc.checkedAt==='string'&&Number.isFinite(Date.parse(doc.checkedAt))&&record(doc.value);if(!valid||kind!=='action-trace')return valid;return nonarchivableCoreTrace(doc.value);
  }
  function nonarchivableCoreTrace(value){
    if(!record(value)||Object.keys(value).sort().join('|')!=='noSend|trace'||value.noSend!==true||!record(value.trace))return false;var t=value.trace,base=['schema','traceId','requestId','operation','startedAt','finishedAt','outcome','reasonCode','scope','stage','projectId','writerId','humanAuthorityRef','humanApprovedAt','captureId','leadId','noResend','noSend','modelAuthority','servedModel','nativeReadbackRequired','registrationCoverage','sourcePreparation'],optionalKeys=['sourceCapture','priorSourceCapture','rowCapacity','validationDiagnostic','candidateHandle','consumerCapture','consumerModelInput','consumerComparison','consumerNormalization','sourceId','sourceVersionSha256','bodySha256','beforeTypedRowSha256','handle','preparedUsageBasisRef','attemptId','pendingRow','receiptId','bindingHash','markerState'];
    if(!base.every(function(k){return own(t,k);})||Object.keys(t).some(function(k){return base.indexOf(k)<0&&optionalKeys.indexOf(k)<0;})||t.schema!=='BackofficeNativeActionTrace/v1'||['RECONCILE_PENDING','LIST_CANDIDATES','CAPTURE_PUBLIC_SOURCE','PREPARE_SOURCE','CONSUME_GEMINI'].indexOf(t.operation)<0||typeof t.traceId!=='string'||!/^NATIVE-TRACE-[A-Za-z0-9_-]+$/.test(t.traceId)||t.traceId!==t.requestId||t.modelAuthority!==false||t.nativeReadbackRequired!==true||t.servedModel!=='UNKNOWN_NOT_ATTESTED'||typeof t.noSend!=='boolean'||typeof t.noResend!=='boolean'||!Number.isFinite(Date.parse(t.startedAt))||!Number.isFinite(Date.parse(t.finishedAt))||Date.parse(t.finishedAt)<Date.parse(t.startedAt)||!Number.isFinite(Date.parse(t.humanApprovedAt))||['outcome','reasonCode','scope','stage'].some(function(k){return typeof t[k]!=='string'||!t[k]||t[k].length>1000;}))return false;
    var cfg=JSON.parse(properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')||'null');return cfg&&cfg.ownerAuthority&&t.projectId===projectId&&t.writerId===cfg.writerId&&t.humanAuthorityRef===cfg.ownerAuthority.ref&&t.humanApprovedAt===cfg.ownerAuthority.approvedAt;
  }
  function persistAppendOnlyFullJournal(write){
    var result=canonicalCasResult([write],undefined,[write.row]);
    hold(result&&result.ack&&result.ack.acknowledged===true&&result.ack.verified===true&&Array.isArray(result.captures)&&result.captures.length===1,'append-only full26 journal typed/display receipt missing');
    var captured=result.captures[0];hold(record(captured)&&captured.sheet==='Evidence'&&captured.row===write.row&&sameRows(wholeRow(captured.typedRow,26),wholeRow(write.after,26))&&Array.isArray(captured.displayRow)&&captured.displayRow.length===26&&captured.displayRow.every(function(value){return typeof value==='string';}),'append-only full26 journal exact postimage changed');
    return {acknowledged:true,verified:true,physicalAfter26:copy(captured.typedRow),physicalDisplay26:copy(captured.displayRow),archiveSummary:null,logicalOriginal26Sha256:sha(JSON.stringify(captured.typedRow))};
  }
  function casWritesVerified(writes, sourceExpiresAtUtc, postArchivePlan, publicCanonicalPhase) {sourceMetadataTailReceipt=null;archiveMutationFence(); hold(!readBundle,"read bundle cannot cross a canonical write boundary");
    lastSnapshotCapacity = null;
    safeData(writes, 'canonical write plans');
    hold(lockHeld && nativeLockHeld(), 'held project lock required for sole-writer CAS protocol');
    hold(Array.isArray(writes) && writes.length > 0 && writes.length <= 500, 'bounded canonical writes required');
    var seen = {}, plans = [], requests = [], captures = [], postArchiveCapture=null,postArchiveEvent=null,postDeclaredRanges=0,preDeclaredRanges=0,canonicalGroupsCount=0,phasePreserved=false;
    writes.forEach(function (write) {
      hold(record(write), 'canonical write plan missing');
      var info = sheetInfo(write.sheet), row = write.row;
      hold(integer(row, 6), 'canonical write row outside data bounds');
      var key = write.sheet + ':' + row;
      hold(!own(seen, key), 'duplicate row write plan'); seen[key] = true;
      var expected = wholeRow(write.expected, info.width), after = wholeRow(write.after, info.width);
      plans.push({ sheet: write.sheet, row: row, expected: expected, after: after });
    });
    if (sourceExpiresAtUtc !== undefined) {
      hold(plans.length === 1 && plans[0].sheet === 'Evidence' && typeof sourceExpiresAtUtc === 'string' &&
        Number.isFinite(Date.parse(sourceExpiresAtUtc)), 'exact source metadata expiry bound required');
      var sourceMetadata = JSON.parse(plans[0].after[3].stringValue), sourceValue = sourceMetadata.value;
      hold(sourceMetadata.schema === 'BackofficeNativeJournal/v1' && sourceMetadata.kind === 'source-metadata' &&
        sourceValue && sourceValue.noSend === true && sourceValue.sourceEntry && sourceValue.sourceEntry.sourceProof &&
        sourceValue.sourceEntry.sourceProof.expiresAtUtc === sourceExpiresAtUtc && Date.parse(sourceExpiresAtUtc) > Date.now(),
        'native retained source manifest stale/incomplete');
    }
    var metadataTail=postArchivePlan&&sourceExpiresAtUtc!==undefined;
    if(metadataTail){var L=BackofficeNativeArchiveV2.layout;hold(plans.length===1&&plans[0].sheet==='Evidence'&&plans[0].expected.every(function(c){return Object.keys(c).length===0;})&&postArchivePlan.name===L.name&&postArchivePlan.sheetId===L.sheetId&&postArchivePlan.rowCount===L.rowCount&&postArchivePlan.columnCount===L.width&&integer(postArchivePlan.first,Number('{{CONFIGURE_PRIVATE_ARCHIVE_FIRST_PAYLOAD_ROW}}'),L.rowCount)&&integer(postArchivePlan.last,postArchivePlan.first,Math.min(postArchivePlan.first+205,L.rowCount))&&postArchivePlan.column===0&&postArchivePlan.width===20,'exact new source metadata tail declaration required BEFORE effect');archiveAdapter().assertUnadmittedCanonicalRow(plans[0].row);}
    // Pre-read every full row before any mutation. This is safe only after the
    // caller has verified cutover of all other canonical writers.
    function readback(after) {
      var sorted=plans.slice().sort(function(a,b){return a.sheet.localeCompare(b.sheet)||a.row-b.row;}), groups=[];
      sorted.forEach(function(p){var g=groups[groups.length-1];if(g&&g.sheet===p.sheet&&p.row===g.last+1&&g.last-g.first<499){g.last=p.row;g.plans.push(p);}else groups.push({sheet:p.sheet,first:p.row,last:p.row,plans:[p]});});
      if(!after&&publicCanonicalPhase){canonicalGroupsCount=groups.length;phasePreserved=!!archiveMutationFence();var names=groups.map(function(g){return g.sheet;}),probeCount=(names.indexOf('Prospects')<0?1:0)+(names.indexOf('Evidence')<0?1:0);preDeclaredRanges=canonicalUnionActive?canonicalUnionPlans(groups,null).plans.length:(groups.length<=14?groups.length+probeCount+(phasePreserved?1:0):groups.length*2);postDeclaredRanges=preDeclaredRanges;hold(archiveReadset&&archiveReadset.actualRanges+preDeclaredRanges+postDeclaredRanges<=40,'canonical phase complete pre/post declared ranges exceed40 BEFORE effect');}var items=canonicalUnionActive?canonicalUnionRead(groups,after?postArchivePlan:null):(groups.length<=14?freshCanonicalRects(groups,(after||metadataTail)?postArchivePlan:null):null);hold(!postArchivePlan||items,'private archive phase exceeds bounded canonical groups');if(after&&metadataTail){postArchiveEvent=freshOrphanSource();postArchiveEvent.rootRaw=properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey);postArchiveEvent.controlRaw=properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3');postArchiveEvent.configRaw=properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1');}if(!after&&metadataTail){var tailBefore=captureFor(items,postArchivePlan.name,postArchivePlan.first,postArchivePlan.last,postArchivePlan.column,postArchivePlan.width);hold(tailBefore.rows.length===postArchivePlan.last-postArchivePlan.first+1&&tailBefore.displayRows.length===tailBefore.rows.length&&tailBefore.rows.every(function(row){return Array.isArray(row)&&row.length===20&&row.every(function(c){return Object.keys(c).length===0;});})&&tailBefore.displayRows.every(function(row){return Array.isArray(row)&&row.length===20&&row.every(function(v){return typeof v==='string';});}),'source metadata declared physical tail occupied/malformed BEFORE effect');}groups.forEach(function(g){var read=items?captureFor(items,g.sheet,g.first,g.last,0,sheets[g.sheet].width):readBlock(g.sheet,g.first,g.last);g.plans.forEach(function(p,i){hold(sameRows(read.rows[i],after?p.after:p.expected),after?'canonical complete-row typed readback mismatch':'canonical complete-row CAS preimage changed');if(after)captures.push({sheet:p.sheet,row:p.row,typedRow:read.rows[i],displayRow:read.displayRows[i]});});});if(after&&postArchivePlan)postArchiveCapture=captureFor(items,postArchivePlan.name,postArchivePlan.first,postArchivePlan.last,postArchivePlan.column,postArchivePlan.width);
    }
    readback(false);
    if(metadataTail){var metadataPostPlanCount=4;hold(archiveReadset&&archiveReadset.actualRanges+metadataPostPlanCount<=40,'source metadata complete canonical/tail postread headroom unavailable BEFORE effect');}
    plans.forEach(function (plan) {
      var info = sheets[plan.sheet], width = info.width, col = 0;
      while (col < width) {
        if (sameRows(plan.expected[col], plan.after[col])) { col++; continue; }
        var start = col, values = [];
        while (col < width && !sameRows(plan.expected[col], plan.after[col])) {
          values.push(Object.keys(plan.after[col]).length ? { userEnteredValue: copy(plan.after[col]) } : {});
          col++;
        }
        requests.push({ updateCells: {
          range: { sheetId: info.id, startRowIndex: plan.row - 1, endRowIndex: plan.row,
            startColumnIndex: start, endColumnIndex: col },
          rows: [{ values: values }], fields: 'userEnteredValue'
        } });
      }
    });
    var response = null;
    if (requests.length) {
      checkBudget(1000);
      if (sourceExpiresAtUtc !== undefined) hold(Date.parse(sourceExpiresAtUtc) > Date.now(), 'native retained source manifest stale/incomplete');
      var blocks=[],block=[],blockBytes=64;requests.forEach(function(r){var bytes=utf8(JSON.stringify(r)).length+1;hold(bytes+64<=1900000,'canonical single request exceeds finite body bound');if(block.length&&blockBytes+bytes>1900000){blocks.push(block);block=[];blockBytes=64;}block.push(r);blockBytes+=bytes;});if(block.length)blocks.push(block);if(publicCanonicalPhase){var remainingDeclared=postDeclaredRanges+(canonicalUnionActive?(blocks.length-1)*postDeclaredRanges:(phasePreserved?blocks.length:0))+(canonicalGroupsCount>14&&!canonicalUnionActive?preDeclaredRanges:0);hold(archiveReadset.actualRanges+remainingDeclared<=40,'canonical phase postread/effect guards exceed40 BEFORE effect');}blocks.forEach(function(b,blockIndex){if(canonicalUnionActive&&blockIndex>0){var ordered=plans.slice().sort(function(a,b){return a.sheet.localeCompare(b.sheet)||a.row-b.row;}),regroups=[];ordered.forEach(function(p){var g=regroups[regroups.length-1];if(g&&g.sheet===p.sheet&&p.row===g.last+1&&g.last-g.first<499)g.last=p.row;else regroups.push({sheet:p.sheet,first:p.row,last:p.row});});canonicalUnionRead(regroups,null);}checkBudget(1000);if(sourceExpiresAtUtc!==undefined)hold(Date.parse(sourceExpiresAtUtc)>Date.now(),'native retained source manifest stale/incomplete');beforeNativeEffect();nativeObject(batchUpdateAckDto(nativeBoundary(function(){return Sheets.Spreadsheets.batchUpdate({requests:b},workbook);}),b.length),'canonical batchUpdate');});response={spreadsheetId:workbook,replies:requests.map(function(){return {};})};
      required(response, ['spreadsheetId', 'replies'], 'canonical acknowledgment');
      hold(response.spreadsheetId === workbook && Array.isArray(response.replies) &&
        response.replies.length === requests.length && response.replies.every(record),
        'canonical native batch acknowledgment missing/uncertain');
    }
    if(postArchivePlan)archiveMetadata(true);
    readback(true);
    if (sourceExpiresAtUtc !== undefined) hold(Date.parse(sourceExpiresAtUtc) > Date.now(), 'native retained source manifest stale/incomplete');
    if(archiveMutationFence()&&!terminalReceiptCurrent(preservationReceipt))guardedFreshRects([],archiveReadset||newReadset());if(canonicalUnionActive)assertCurrentCanonicalUnion();if(metadataTail){hold(orphanSourceCurrent(postArchiveEvent)&&postArchiveEvent.rootRaw===properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)&&postArchiveEvent.controlRaw===properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3')&&postArchiveEvent.configRaw===properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),'source metadata tail original postread event changed BEFORE mint');hold(postArchiveCapture&&postArchiveCapture.rows.length===postArchivePlan.last-postArchivePlan.first+1&&postArchiveCapture.displayRows.length===postArchiveCapture.rows.length,'source metadata tail postimage missing');sourceMetadataTailReceipt={lockEpoch:postArchiveEvent.lockEpoch,mutationEpoch:postArchiveEvent.mutationEpoch,actionEpoch:postArchiveEvent.actionEpoch,getAttempts:postArchiveEvent.getAttempts,frameEpoch:postArchiveEvent.frameEpoch,checkedMs:postArchiveEvent.checkedMs,plan:copy(postArchivePlan),capture:postArchiveCapture,typedSha256:sha(JSON.stringify(postArchiveCapture.rows)),displaySha256:sha(JSON.stringify(postArchiveCapture.displayRows)),rootRaw:properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey),controlRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'),configRaw:properties.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1'),compatRaw:properties.getProperty('FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1')};}return {ack:{ acknowledged: true, verified: true, changed: requests.length > 0,
      requestCount: requests.length, checkedAt: stamp(),
      ref: 'https://docs.google.com/spreadsheets/d/' + workbook + '/edit#native-cas-readback' },captures:captures,archiveCapture:postArchiveCapture};
  }

  // Source reconstruction reuses the existing same-workbook typed decoder.
  function readEvidenceRows(first,last) { return archiveAdapter().logicalRows(first,last); }
  // Sole-writer whole26 CAS, restricted to blank contiguous source-chunk rows.
  // All preimages and request sizes are checked before the first mutation.
  function casSourceChunksPhysical(writes, expiresAtUtc) {archiveMutationFence();hold(!readBundle,"read bundle cannot cross a source chunk write boundary");
    lastSnapshotCapacity = null;
    safeData(writes, 'canonical write plans');
    hold(lockHeld && nativeLockHeld(), 'held project lock required for sole-writer CAS protocol');
    hold(Array.isArray(writes) && writes.length > 0 && writes.length <= 206, 'bounded native source chunk writes required');
    hold(typeof expiresAtUtc === 'string' && Number.isFinite(Date.parse(expiresAtUtc)) &&
      Date.parse(expiresAtUtc) > Date.now(), 'native retained source manifest stale/incomplete');
    var plans = [], batches = [], sourceId = null, sourceSha = null;
    writes.forEach(function (write, index) {
      hold(record(write) && write.sheet === 'Evidence' && integer(write.row, 6) &&
        (index === 0 || write.row === writes[index - 1].row + 1), 'contiguous native source Evidence rows required');
      var expected = wholeRow(write.expected, 26), after = wholeRow(write.after, 26);
      hold(expected.every(function (cell) { return Object.keys(cell).length === 0; }), 'native source blank full26 preimage required');
      hold(after[2].stringValue === 'source-chunk' && typeof after[3].stringValue === 'string' &&
        after[3].stringValue.length <= 45000, 'native source chunk journal required');
      var doc = JSON.parse(after[3].stringValue), value = doc.value;
      if (index === 0 && record(value)) { sourceId = value.sourceId; sourceSha = value.sourceVersionSha256; }
      hold(doc.schema === 'BackofficeNativeJournal/v1' && doc.kind === 'source-chunk' && record(value) &&
        value.noSend === true && value.index === index && value.total === writes.length &&
        typeof sourceId === 'string' && /^NATIVE-SOURCE-[A-Za-z0-9_-]{1,100}$/.test(sourceId) &&
        value.sourceId === sourceId && value.recordId === sourceId + '-' + index &&
        typeof sourceSha === 'string' && /^[a-f0-9]{64}$/.test(sourceSha) && value.sourceVersionSha256 === sourceSha &&
        after[0].stringValue === value.recordId && typeof value.chunk === 'string' && value.chunk.length > 0 &&
        value.chunk.length <= 39000 && /^[A-Za-z0-9+/]*={0,2}$/.test(value.chunk) && sha(value.chunk) === value.chunkSha256 &&
        after[4].stringValue === 'Native acknowledged write + exact typed readback' &&
        typeof after[6].stringValue === 'string' && Number.isFinite(Date.parse(after[6].stringValue)) &&
        after.every(function (cell, col) { return [0,2,3,4,6].indexOf(col) >= 0 || Object.keys(cell).length === 0; }),
        'native source chunk journal identity/content mismatch');
      plans.push({ row: write.row, expected: expected, after: after });
    });
    var first = plans[0].row, last = plans[plans.length - 1].row;
    var sourceGuarded=!!archiveMutationFence(),pre=sourceGuarded?captureFor(freshCanonicalRects([{sheet:'Evidence',first:first,last:last}]),'Evidence',first,last,0,26).rows:readBlock('Evidence', first, last).rows;
    plans.forEach(function (plan, index) {
      hold(sameRows(pre[index], plan.expected), 'canonical complete-row CAS preimage changed');
    });
    for (var offset = 0; offset < plans.length; offset += 32) {
      var block = plans.slice(offset, offset + 32), request = { requests: [{ updateCells: {
        range: { sheetId: sheets.Evidence.id, startRowIndex: block[0].row - 1,
          endRowIndex: block[block.length - 1].row, startColumnIndex: 0, endColumnIndex: 26 },
        rows: block.map(function (plan) { return { values: plan.after.map(function (cell) {
          return Object.keys(cell).length ? { userEnteredValue: copy(cell) } : {};
        }) }; }), fields: 'userEnteredValue'
      } }] };
      hold(utf8(JSON.stringify(request)).length < 2000000, 'native source batch request payload exceeds bound');
      batches.push(request);
    }
    batches.forEach(function (request) {
      checkBudget(1000);
      hold(Date.parse(expiresAtUtc) > Date.now(), 'native retained source manifest stale/incomplete');
      beforeNativeEffect();nativeObject(batchUpdateAckDto(nativeBoundary(function(){return Sheets.Spreadsheets.batchUpdate(request, workbook);}), 1), 'canonical batchUpdate');
    });
    var post = sourceGuarded?captureFor(freshCanonicalRects([{sheet:'Evidence',first:first,last:last}]),'Evidence',first,last,0,26).rows:readBlock('Evidence', first, last).rows;
    plans.forEach(function (plan, index) {
      hold(sameRows(post[index], plan.after), 'canonical complete-row typed readback mismatch');
    });
    hold(Date.parse(expiresAtUtc) > Date.now(), 'native retained source manifest stale/incomplete');
    return { acknowledged: true, verified: true, changed: true, rowCount: plans.length,
      requestCount: batches.length, checkedAt: stamp(),
      ref: 'https://docs.google.com/spreadsheets/d/' + workbook + '/edit#native-source-cas-readback' };
  }

  function decodeBytes(bytes, charset) {
    var text = Utilities.newBlob(bytes).getDataAsString(charset || 'UTF-8');
    if (!charset || String(charset).toUpperCase() === 'UTF-8') {
      var actual = utf8(text);
      hold(bytes.length === actual.length && bytes.every(function (b, i) {
        return (b + 256) % 256 === (actual[i] + 256) % 256;
      }), 'native MIME bytes are not valid UTF-8');
    }
    return text;
  }
  function decodeBody(data) {
    hold(typeof data === 'string' && /^[A-Za-z0-9_-]*={0,2}$/.test(data) && data.length % 4 !== 1,
      'native MIME base64url invalid');
    return decodeBytes(Utilities.base64DecodeWebSafe(data), 'UTF-8');
  }
  function decodeHeader(value) {
    hold(typeof value === 'string', 'native header value missing');
    if (value.indexOf('=?') < 0) return value;
    // RFC 2047 whitespace between adjacent encoded words is not content.
    var compact = value.replace(/(\?=)[ \t\r\n]+(?==\?)/g, '$1');
    return compact.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, function (_, charset, encoding, data) {
      hold(/^(?:UTF-8|US-ASCII)$/i.test(charset), 'unsupported native encoded-header charset');
      var bytes;
      if (encoding.toUpperCase() === 'B') {
        hold(/^[A-Za-z0-9+/]*={0,2}$/.test(data), 'native encoded-header base64 invalid');
        bytes = Utilities.base64Decode(data);
      } else {
        bytes = [];
        for (var i = 0; i < data.length; i++) {
          var ch = data[i];
          if (ch === '_') bytes.push(32);
          else if (ch === '=') {
            hold(/^[0-9A-Fa-f]{2}$/.test(data.slice(i + 1, i + 3)), 'native encoded-header Q escape invalid');
            bytes.push(parseInt(data.slice(i + 1, i + 3), 16)); i += 2;
          } else { hold(ch.charCodeAt(0) < 128, 'native encoded-header Q byte invalid'); bytes.push(ch.charCodeAt(0)); }
        }
      }
      hold(charset.toUpperCase() !== 'US-ASCII' || bytes.every(function (b) { return ((b + 256) % 256) < 128; }),
        'native US-ASCII encoded header invalid');
      return decodeBytes(bytes, 'UTF-8');
    });
  }
  // Fixed Gmail Message/Thread SDK semantic DTO, never raw HTTP/SDK data.
  // Retained strings preserve exact header/body values. Only body.data may
  // normalize a validated SDK Byte[] to canonical base64url semantic data;
  // this is not original wire equality. Unknown own SDK data is omitted
  // without invoking SDK helpers.
  // Every visited schema node rejects accessors, symbols, inherited expected
  // fields, error signals, thenables and ambiguous arrays before projection.
  function gmailReceiptDto(value, kind) {
    var name = 'Gmail receipt DTO', count = 0;
    var schemas = {
      message: { id: 'string', threadId: 'string', labelIds: 'strings', snippet: 'string',
        historyId: 'string', internalDate: 'date', payload: 'part', sizeEstimate: 'size',
        raw: 'string', classificationLabelValues: 'classifications' },
      thread: { id: 'string', snippet: 'string', historyId: 'string', messages: 'messages' },
      part: { partId: 'string', mimeType: 'string', filename: 'string', headers: 'headers',
        body: 'body', parts: 'parts' },
      body: { attachmentId: 'string', size: 'size', data: 'string' },
      header: { name: 'string', value: 'string' },
      classification: { labelId: 'string', fields: 'classificationFields' },
      classificationField: { fieldId: 'string', selection: 'string' }
    };
    function rejectedSchema(error, shape, field, expectedType, value) {
      var observedType = value === null ? 'NULL' : Array.isArray(value) ? 'ARRAY' :
        { undefined: 'UNDEFINED', function: 'FUNCTION', symbol: 'SYMBOL', bigint: 'BIGINT',
          object: 'OBJECT', string: 'STRING', number: 'NUMBER', boolean: 'BOOLEAN' }[typeof value] || 'UNKNOWN';
      Object.defineProperty(error, 'nativeGmailReceiptDtoDiagnostic', { value: {
        shape: own(schemas, shape) ? shape : 'UNKNOWN',
        field: ['id', 'threadId', 'labelIds', 'snippet', 'historyId', 'internalDate', 'payload', 'sizeEstimate',
          'raw', 'classificationLabelValues', 'messages', 'partId', 'mimeType', 'filename', 'headers', 'body',
          'parts', 'attachmentId', 'size', 'data', 'name', 'value', 'labelId', 'fields', 'fieldId', 'selection'].indexOf(field) >= 0 ? field : 'OTHER',
        expectedType: ['STRING', 'SIZE', 'DATE', 'OBJECT', 'ARRAY'].indexOf(expectedType) >= 0 ? expectedType : 'UNKNOWN',
        observedType: observedType
      } });
    }
    function tick(depth, amount) {
      count += amount;
      hold(depth <= 100 && count <= 2000000, name + ' native data exceeds structural budget');
      checkBudget();
    }
    function present(object, key) {
      hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
      return own(object, key);
    }
    function audit(object, depth, fields, array, shape, field) {
      try {
        hold((array ? Array.isArray(object) : record(object)) && !isThenable(object),
          name + ' synchronous native schema node missing');
      } catch (error) { rejectedSchema(error, shape, field, array ? 'ARRAY' : 'OBJECT', object); throw error; }
      tick(depth, 1);
      hold(Object.getOwnPropertySymbols(object).length === 0, name + ' native data contains symbol fields');
      var keys = Object.getOwnPropertyNames(object);
      hold(keys.length <= 2000000, name + ' native data exceeds structural budget');
      keys.forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(object, key);
        hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
        if (!array && !own(fields, key) && key !== 'error' && key !== 'isError') tick(depth + 1, 1);
      });
      ['error', 'isError'].forEach(function (key) {
        if (present(object, key)) {
          var signal = Object.getOwnPropertyDescriptor(object, key).value;
          safeData(signal, name);
          hold(!signal, name + ' native error');
          if (!array) tick(depth + 1, 1);
        }
      });
      return keys;
    }
    function array(value, entryKind, depth, mimeBudget, mimeDepth, shape, field) {
      var keys = audit(value, depth, {}, true, shape, field);
      var length = Object.getOwnPropertyDescriptor(value, 'length').value;
      hold(integer(length, 0, 2000000) && keys.length === length + 1,
        name + ' native array sparse or extra fields prohibited');
      if (entryKind === 'message') hold(length > 0 && length <= 10000,
        'native complete thread identity/message count invalid');
      var result = [];
      for (var index = 0; index < length; index++) {
        hold(own(value, index), name + ' native array is sparse');
        var item = Object.getOwnPropertyDescriptor(value, index).value;
        result.push(entryKind === 'string' ? scalar(item, 'string', depth + 1, shape, field) :
          project(item, entryKind, depth + 1, mimeBudget, mimeDepth, field));
      }
      return result;
    }
    function bodyDataBytes(value, depth, size) {
      var keys = audit(value, depth, {}, true, 'body', 'data');
      var length = Object.getOwnPropertyDescriptor(value, 'length').value;
      hold(integer(length, 0, 2000000) && keys.length === length + 1,
        name + ' native array sparse or extra fields prohibited');
      hold(size === undefined || size === length, 'native MIME body size invalid');
      hold(count + length <= 2000000, name + ' native data exceeds structural budget');
      var bytes = [];
      for (var index = 0; index < length; index++) {
        hold(own(value, index), name + ' native array is sparse');
        var byte = Object.getOwnPropertyDescriptor(value, index).value;
        tick(depth + 1, 1);
        hold(integer(byte, -128, 255), name + ' native schema scalar invalid');
        // Signed Byte[] and unsigned octets map losslessly to the same byte.
        bytes.push(byte > 127 ? byte - 256 : byte);
      }
      checkBudget();
      var encoded = Utilities.base64EncodeWebSafe(bytes);
      hold(typeof encoded === 'string', 'native MIME base64url invalid');
      encoded = encoded.replace(/=+$/, '');
      hold(/^[A-Za-z0-9_-]*$/.test(encoded) && encoded.length === Math.ceil(length * 4 / 3),
        'native MIME base64url invalid');
      var decoded = Utilities.base64DecodeWebSafe(encoded);
      hold(decoded.length === length && decoded.every(function (byte, index) {
        checkBudget();
        return integer(byte, -128, 255) && (byte + 256) % 256 === (bytes[index] + 256) % 256;
      }), 'native MIME base64url invalid');
      checkBudget();
      return encoded;
    }
    function scalar(value, type, depth, shape, field) {
      tick(depth, 1);
      try {
        hold(type === 'string' && typeof value === 'string' ||
          type === 'size' && integer(value, 0) ||
          type === 'date' && (typeof value === 'string' && /^[0-9]+$/.test(value) ||
            typeof value === 'number' && Number.isFinite(value)) && integer(Number(value), 1),
          name + ' native schema scalar invalid');
      } catch (error) { rejectedSchema(error, shape, field, { string: 'STRING', size: 'SIZE', date: 'DATE' }[type], value); throw error; }
      return value;
    }
    function project(object, shape, depth, mimeBudget, mimeDepth, field) {
      var fields = schemas[shape];
      hold(fields, name + ' fixed schema kind required');
      if (shape === 'message') { mimeBudget = { count: 0 }; mimeDepth = 0; }
      if (shape === 'part') {
        mimeBudget.count++;
        hold(mimeDepth <= 20 && mimeBudget.count <= 200, 'native MIME structure invalid/unbounded');
      }
      audit(object, depth, fields, false, shape, field);
      var result = {};
      Object.keys(fields).forEach(function (key) {
        if (!present(object, key)) return;
        var item = Object.getOwnPropertyDescriptor(object, key).value, type = fields[key];
        if (type === 'strings') result[key] = array(item, 'string', depth + 1, mimeBudget, mimeDepth, shape, key);
        else if (type === 'messages') result[key] = array(item, 'message', depth + 1, undefined, undefined, shape, key);
        else if (type === 'headers') result[key] = array(item, 'header', depth + 1, mimeBudget, mimeDepth, shape, key);
        else if (type === 'parts') result[key] = array(item, 'part', depth + 1, mimeBudget, mimeDepth + 1, shape, key);
        else if (type === 'classifications') result[key] = array(item, 'classification', depth + 1, mimeBudget, mimeDepth, shape, key);
        else if (type === 'classificationFields') result[key] = array(item, 'classificationField', depth + 1, mimeBudget, mimeDepth, shape, key);
        else if (type === 'part' || type === 'body') result[key] = project(item, type, depth + 1, mimeBudget, mimeDepth, key);
        else if (shape === 'body' && key === 'data' && Array.isArray(item))
          result[key] = bodyDataBytes(item, depth + 1, own(result, 'size') ? result.size : undefined);
        else result[key] = scalar(item, type, depth + 1, shape, key);
      });
      ['error', 'isError'].forEach(function (key) {
        if (own(object, key)) result[key] = Object.getOwnPropertyDescriptor(object, key).value;
      });
      return result;
    }
    hold(kind === 'message' || kind === 'thread', name + ' fixed schema kind required');
    return project(value, kind, 0);
  }
  function nativeMessage(message, format, expectedId) {
    message = nativeObject(gmailReceiptDto(message, 'message'), 'Gmail message');
    required(message, ['id', 'threadId', 'labelIds'], 'Gmail message identity');
    hold(validId(message.id) && (!expectedId || message.id === expectedId) && validId(message.threadId),
      'native Gmail message/thread identity mismatch');
    hold(Array.isArray(message.labelIds) && message.labelIds.every(function (id) {
      return typeof id === 'string' && id.length > 0;
    }) && new Set(message.labelIds).size === message.labelIds.length, 'native Gmail label coverage missing');
    var result = { id: message.id, thread_id: message.threadId, label_ids: message.labelIds.slice() };
    if (optional(message, 'internalDate', 'Gmail message') !== undefined) {
      hold(typeof message.internalDate === 'string' || typeof message.internalDate === 'number', 'native internalDate type invalid');
      hold((typeof message.internalDate !== 'string' || /^[0-9]+$/.test(message.internalDate)) &&
        integer(Number(message.internalDate), 1), 'native internalDate invalid');
      result.internal_date = String(message.internalDate);
    }
    if (format === 'minimal') return result;
    required(message, ['payload'], 'Gmail full/metadata');
    hold(own(result, 'internal_date') && record(message.payload), 'native Gmail full/metadata payload missing');
    var parts = 0;
    function payload(native, depth) {
      parts++;
      required(native, ['mimeType', 'headers'], 'native MIME payload');
      hold(record(native) && depth <= 20 && parts <= 200 && typeof native.mimeType === 'string' && native.mimeType,
        'native MIME structure invalid/unbounded');
      var p = { mime_type: native.mimeType };
      if (optional(native, 'partId', 'native MIME') !== undefined) { hold(typeof native.partId === 'string', 'native MIME partId invalid'); p.part_id = native.partId; }
      if (optional(native, 'filename', 'native MIME') !== undefined) { hold(typeof native.filename === 'string', 'native MIME filename invalid'); p.filename = native.filename; }
      hold(Array.isArray(native.headers), 'native MIME headers missing');
      p.headers = native.headers.map(function (header) {
        required(header, ['name', 'value'], 'native MIME header');
        hold(record(header) && typeof header.name === 'string' && /^[!-9;-~]+$/.test(header.name) &&
          typeof header.value === 'string', 'native MIME header invalid');
        return { name: header.name, value: decodeHeader(header.value) };
      });
      if (optional(native, 'body', 'native MIME') !== undefined) {
        hold(record(native.body), 'native MIME body invalid');
        p.body = {};
        if (optional(native.body, 'size', 'native MIME body') !== undefined) { hold(integer(native.body.size, 0), 'native MIME body size invalid'); p.body.size = native.body.size; }
        if (optional(native.body, 'attachmentId', 'native MIME body') !== undefined) {
          hold(typeof native.body.attachmentId === 'string' && native.body.attachmentId, 'native attachmentId invalid');
          p.body.attachment_id = native.body.attachmentId;
        }
        if (optional(native.body, 'data', 'native MIME body') !== undefined) p.body.content = decodeBody(native.body.data);
        else if (!own(native.body, 'attachmentId') && (native.body.size === undefined || native.body.size === 0)) p.body.content = '';
        else if (format === 'full' && !own(native.body, 'attachmentId')) hold(false, 'native full MIME body content omitted');
      } else if (format === 'full') hold(false, 'native full MIME body missing');
      if (optional(native, 'parts', 'native MIME') !== undefined) {
        hold(Array.isArray(native.parts), 'native MIME parts invalid');
        p.parts = native.parts.map(function (part) { return payload(part, depth + 1); });
      }
      return p;
    }
    result.payload = payload(message.payload, 0);
    return result;
  }
  function full(id) {
    hold(validId(id), 'Gmail message id required');
    checkBudget(1000);
    terminalProofReceipt=null;return { isError: false, structuredContent: nativeMessage(nativeBoundary(function(){return Gmail.Users.Messages.get('me', id, { format: 'full' });}), 'full', id) };
  }
  function minimal(id) {
    hold(validId(id), 'Gmail message id required');
    checkBudget(1000);
    terminalProofReceipt=null;return { isError: false, structuredContent: nativeMessage(nativeBoundary(function(){return Gmail.Users.Messages.get('me', id, { format: 'minimal' });}), 'minimal', id) };
  }
  function threadFull(id) {
    hold(validId(id), 'Gmail thread id required');
    checkBudget(1000);
    terminalProofReceipt=null;var thread = nativeObject(gmailReceiptDto(nativeBoundary(function(){return Gmail.Users.Threads.get('me', id, { format: 'full' });}), 'thread'), 'Gmail full thread');
    required(thread, ['id', 'messages'], 'Gmail full thread');
    hold(thread.id === id && Array.isArray(thread.messages) && thread.messages.length > 0 &&
      thread.messages.length <= 10000, 'native complete thread identity/message count invalid');
    var seen = new Set();
    var messages = thread.messages.map(function (message) {
      checkBudget();
      var mapped = nativeMessage(message, 'full');
      hold(mapped.thread_id === id && !seen.has(mapped.id), 'native thread message identity duplicated/mismatched');
      seen.add(mapped.id); return mapped;
    });
    var dto = { id: id, complete: true, count: messages.length, messages: messages };
    var historyId = optional(thread, 'historyId', 'Gmail full thread');
    if (historyId !== undefined) {
      hold(typeof historyId === 'string' && /^[0-9]{1,20}$/.test(historyId), 'native thread historyId invalid');
      dto.history_id = historyId;
    }
    return { isError: false, structuredContent: dto, nativeRaw: copy(thread),
      nativeRawRepresentation: 'GMAIL_THREAD_SDK_SEMANTIC_DTO_V1', checkedAt: stamp(),
      ref: 'https://mail.google.com/mail/u/?authuser=operator%40example.com#all/' + id };
  }
  // Fixed getProfile SDK semantic DTO, not raw HTTP/body or raw SDK data.
  // Only Gmail's four profile fields and checked error signals are retained.
  // Unknown own SDK data is omitted; own accessors/symbols still fail closed.
  function gmailProfileDto(value, name) {
    hold(record(value) && !isThenable(value), name + ' synchronous native result missing');
    required(value, ['emailAddress'], name);
    var keys = Object.getOwnPropertyNames(value);
    hold(keys.length + 1 <= 2000000, name + ' native data exceeds structural budget');
    hold(Object.getOwnPropertySymbols(value).length === 0, name + ' native data contains symbol fields');
    keys.forEach(function (key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
    });
    function present(key) {
      hold(own(value, key) || !(key in value), name + ' inherited native field prohibited');
      return own(value, key);
    }
    function data(key) { return safeData(Object.getOwnPropertyDescriptor(value, key).value, name); }
    ['error', 'isError'].forEach(function (key) {
      if (present(key)) hold(!data(key), name + ' native error');
    });
    var result = { emailAddress: data('emailAddress') };
    hold(typeof result.emailAddress === 'string', 'exact mailbox address required');
    ['messagesTotal', 'threadsTotal'].forEach(function (key) {
      if (present(key)) {
        var count = data(key);
        hold(integer(count, 0), 'native profile count invalid: ' + key);
        result[key] = count;
      }
    });
    if (present('historyId')) {
      var historyId = data('historyId');
      hold(typeof historyId === 'string' && /^[0-9]{1,20}$/.test(historyId), 'native profile historyId invalid');
      result.historyId = historyId;
    }
    ['error', 'isError'].forEach(function (key) { if (own(value, key)) result[key] = data(key); });
    return result;
  }
  // Fixed Gmail metadata SDK semantic DTOs, never raw HTTP/body bytes.
  // Only direct unknown function members on these schema objects are inert
  // SDK helpers. Unknown data stays subject to strict structural validation.
  function gmailMetadataDto(value, kind, name) {
    var count = 0;
    function budget(amount, depth) {
      count += amount;
      hold(count <= 2000000 && depth <= 100, name + ' native data exceeds structural budget');
    }
    function present(object, key) {
      hold(own(object, key) || !(key in object), name + ' inherited native field prohibited');
      return own(object, key);
    }
    function data(object, key) {
      return Object.getOwnPropertyDescriptor(object, key).value;
    }
    function signals(object) {
      ['error', 'isError'].forEach(function (key) {
        if (present(object, key)) hold(!safeData(data(object, key), name), name + ' native error');
      });
    }
    function descriptors(object, depth) {
      hold(object && typeof object === 'object' && !isThenable(object), name + ' synchronous native result missing');
      var keys = Object.getOwnPropertyNames(object);
      budget(keys.length + 1, depth);
      hold(Object.getOwnPropertySymbols(object).length === 0, name + ' native data contains symbol fields');
      keys.forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(object, key);
        hold(descriptor && own(descriptor, 'value'), name + ' native accessor field prohibited');
      });
      signals(object);
      return keys;
    }
    // This validator never projects or strips unknown data. It preserves the
    // general safeData rejection and shares the DTO's total structural budget.
    function extra(item, depth) {
      budget(1, depth);
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
      if (typeof item === 'number') { hold(Number.isFinite(item), name + ' native number is non-finite'); return; }
      hold(item !== undefined && typeof item === 'object', name + ' native data contains unsupported values');
      var keys = descriptors(item, depth);
      if (Array.isArray(item)) {
        var length = data(item, 'length');
        hold(integer(length, 0, 2000000), name + ' native data exceeds structural budget');
        for (var index = 0; index < length; index++) hold(own(item, index), name + ' native array is sparse');
      }
      keys.forEach(function (key) { if (!Array.isArray(item) || key !== 'length') extra(data(item, key), depth + 1); });
    }
    function object(value, known, requiredKeys, depth) {
      hold(record(value), name + ' synchronous native result missing');
      var keys = descriptors(value, depth);
      known.forEach(function (key) { present(value, key); });
      required(value, requiredKeys, name);
      keys.forEach(function (key) {
        if (known.indexOf(key) >= 0 || key === 'error' || key === 'isError') return;
        var item = data(value, key);
        if (typeof item === 'function') return;
        safeData(item, name); extra(item, depth + 1);
      });
      var result = {};
      ['error', 'isError'].forEach(function (key) { if (own(value, key)) result[key] = data(value, key); });
      return result;
    }
    function scalar(source, target, key, type, choices) {
      if (!present(source, key)) return;
      var item = safeData(data(source, key), name);
      hold(typeof item === type && (!choices || choices.indexOf(item) >= 0), name + ' native schema field invalid: ' + key);
      target[key] = item;
    }
    function list(entries, min, max, project) {
      hold(Array.isArray(entries), name + ' native list must be an array');
      var keys = descriptors(entries, 1), length = data(entries, 'length');
      hold(integer(length, min, max) && keys.length === length + 1, name + ' native array cardinality invalid');
      var result = [];
      for (var index = 0; index < length; index++) {
        hold(own(entries, index), name + ' native array is sparse');
        result.push(project(data(entries, index)));
      }
      return result;
    }
    function sendAs(entry) {
      var keys = ['sendAsEmail', 'displayName', 'replyToAddress', 'signature', 'isPrimary', 'isDefault', 'treatAsAlias', 'smtpMsa', 'verificationStatus'];
      var result = object(entry, keys, ['sendAsEmail'], 2);
      ['sendAsEmail', 'displayName', 'replyToAddress', 'signature'].forEach(function (key) { scalar(entry, result, key, 'string'); });
      ['isPrimary', 'isDefault', 'treatAsAlias'].forEach(function (key) { scalar(entry, result, key, 'boolean'); });
      scalar(entry, result, 'verificationStatus', 'string', ['accepted', 'pending']);
      if (present(entry, 'smtpMsa')) {
        var smtp = data(entry, 'smtpMsa');
        var relay = object(smtp, ['host', 'port', 'username', 'password', 'securityMode'], ['host', 'port', 'securityMode'], 3);
        // Gmail explicitly documents username/password as write-only, never
        // populated in responses. Do not admit unexpected credential fields.
        hold(!present(smtp, 'username') && !present(smtp, 'password'), name + ' write-only SMTP credentials in response prohibited');
        scalar(smtp, relay, 'host', 'string');
        var port = safeData(data(smtp, 'port'), name);
        hold(integer(port, 0, 2147483647), name + ' native SMTP port invalid'); relay.port = port;
        scalar(smtp, relay, 'securityMode', 'string', ['securityModeUnspecified', 'none', 'ssl', 'starttls']);
        result.smtpMsa = relay;
      }
      return result;
    }
    function label(entry) {
      var keys = ['id', 'name', 'messageListVisibility', 'labelListVisibility', 'type'];
      var result = object(entry, keys, ['id', 'name'], 2);
      scalar(entry, result, 'id', 'string'); scalar(entry, result, 'name', 'string');
      scalar(entry, result, 'messageListVisibility', 'string', ['show', 'hide']);
      scalar(entry, result, 'labelListVisibility', 'string', ['labelShow', 'labelShowIfUnread', 'labelHide']);
      scalar(entry, result, 'type', 'string', ['system', 'user']);
      return result;
    }
    function message(entry) {
      var result = object(entry, ['id', 'threadId'], ['id'], 2);
      scalar(entry, result, 'id', 'string'); scalar(entry, result, 'threadId', 'string');
      hold(validId(result.id) && (!own(result, 'threadId') || validId(result.threadId)), name + ' native search identity invalid');
      return result;
    }
    var result;
    if (kind === 'sendAs') {
      result = object(value, ['sendAs'], ['sendAs'], 0);
      result.sendAs = list(data(value, 'sendAs'), 1, 100, sendAs);
    } else if (kind === 'vacation') {
      var keys = ['enableAutoReply', 'responseSubject', 'responseBodyPlainText', 'responseBodyHtml', 'restrictToContacts', 'restrictToDomain', 'startTime', 'endTime'];
      result = object(value, keys, ['enableAutoReply'], 0);
      ['enableAutoReply', 'restrictToContacts', 'restrictToDomain'].forEach(function (key) { scalar(value, result, key, 'boolean'); });
      ['responseSubject', 'responseBodyPlainText', 'responseBodyHtml'].forEach(function (key) { scalar(value, result, key, 'string'); });
      ['startTime', 'endTime'].forEach(function (key) {
        scalar(value, result, key, 'string');
        if (own(result, key)) hold(/^[0-9]+$/.test(result[key]) && integer(Number(result[key]), 0), name + ' native vacation time invalid: ' + key);
      });
    } else if (kind === 'labels') {
      result = object(value, ['labels'], ['labels'], 0);
      result.labels = list(data(value, 'labels'), 0, 2000000, label);
    } else if (kind === 'messages') {
      result = object(value, ['messages', 'nextPageToken', 'resultSizeEstimate'], [], 0);
      if (present(value, 'messages')) result.messages = list(data(value, 'messages'), 0, 100, message);
      scalar(value, result, 'nextPageToken', 'string');
      if (own(result, 'nextPageToken')) hold(result.nextPageToken.length > 0, name + ' native pagination token invalid');
      if (present(value, 'resultSizeEstimate')) {
        var estimate = safeData(data(value, 'resultSizeEstimate'), name);
        hold(integer(estimate, 0, 4294967295), name + ' native result estimate invalid'); result.resultSizeEstimate = estimate;
      }
    } else hold(false, 'fixed Gmail metadata projection kind required');
    return result;
  }
  function accountProfile() {
    checkBudget(1000);
    terminalProofReceipt=null;var profile = nativeObject(gmailProfileDto(nativeBoundary(function(){return Gmail.Users.getProfile('me');}), 'Gmail account profile'), 'Gmail account profile');
    required(profile, ['emailAddress'], 'Gmail account profile');
    var address = mailbox(profile.emailAddress);
    hold(address === accountAddress, 'native exact account profile mismatch');
    var dto = { email_address: address };
    ['messagesTotal', 'threadsTotal'].forEach(function (key) {
      var value = optional(profile, key, 'Gmail account profile');
      if (value !== undefined) {
        hold(integer(value, 0), 'native profile count invalid: ' + key);
        dto[key === 'messagesTotal' ? 'messages_total' : 'threads_total'] = value;
      }
    });
    var historyId = optional(profile, 'historyId', 'Gmail account profile');
    if (historyId !== undefined) {
      hold(typeof historyId === 'string' && /^[0-9]{1,20}$/.test(historyId), 'native profile historyId invalid');
      dto.history_id = historyId;
    }
    var checkedAt = stamp();
    return { isError: false, structuredContent: dto, accountAddress: address, address: address,
      complete: true, nativeRaw: copy(profile), nativeRawRepresentation: 'GMAIL_PROFILE_SDK_SEMANTIC_DTO_V1', checkedAt: checkedAt,
      ref: 'gmail-native-account-profile:' + projectId + ':' + Date.parse(checkedAt) };
  }
  function label(id) {beforeNativeEffect();hold(!readBundle,"read bundle cannot cross a label boundary");
    hold(validId(id), 'Gmail message id required');
    checkBudget(1000);
    terminalProofReceipt=null;var message = nativeBoundary(function(){return Gmail.Users.Messages.modify({ addLabelIds: [labelId] }, 'me', id);});
    return { isError: false, structuredContent: nativeMessage(message, 'minimal', id) };
  }
  function mailbox(address) {
    hold(typeof address === 'string' && address === address.trim() && address.length <= 320,
      'exact mailbox address required');
    var matched = address.match(/^("(?:[^"\\\r\n]|\\[\x20-\x7e])*"|[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+)@((?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,})$/);
    hold(matched && matched[1].length <= 64 && (matched[1][0] === '"' ||
      !/^\.|\.$|\.\./.test(matched[1])), 'unsupported or malformed mailbox address');
    return matched[1] + '@' + matched[2].toLowerCase();
  }
  var nativeSendBudgetError=null;
  function sendBudgetHeldBeforeDispatch(error){var p=nativeSendBudgetError,exact=!!p&&error===p.error&&lockHeld&&nativeLockHeld()&&budgetExplicitlyStarted&&p.lockEpoch===lockEpoch&&p.budgetStarted===budgetStarted&&p.budgetDeadline===budgetDeadline&&p.mutationEpoch===canonicalMutationEpoch&&p.frameEpoch===authorityFrameEpoch;nativeSendBudgetError=null;return exact;}
  function send(args, rfcMessageId) {nativeSendBudgetError=null;beforeNativeEffect();hold(!readBundle,"read bundle cannot cross a send boundary");
    safeData(args, 'exact send arguments');
    hold(record(args) && Object.keys(args).every(function (key) {
      return ['from_address', 'to', 'subject', 'payload'].indexOf(key) >= 0;
    }), 'bounded exact send arguments required');
    hold(args.from_address === fromAddress && typeof args.to === 'string' &&
      mailbox(args.to) === args.to && args.to[0] !== '"', 'exact approved single From/To required');
    hold(typeof args.subject === 'string' && args.subject && !/[\r\n\x00-\x1f\x7f]/.test(args.subject),
      'safe exact message subject required');
    var p = args.payload;
    hold(record(p) && Object.keys(p).every(function (key) { return ['mime_type', 'charset', 'body'].indexOf(key) >= 0; }) &&
      p.mime_type === 'text/plain' && p.charset === 'UTF-8' && record(p.body) &&
      Object.keys(p.body).length === 1 && typeof p.body.content === 'string', 'exact plain UTF-8 message required');
    hold(utf8(p.body.content).length <= 1000000, 'bounded native message body required');
    hold(typeof rfcMessageId === 'string' && !/[\r\n]/.test(rfcMessageId), 'durable RFC Message-ID required');
    var identity = rfcMessageId;
    if (identity[0] === '<' && identity[identity.length - 1] === '>') identity = identity.slice(1, -1);
    hold(/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(identity) &&
      identity.length <= 250, 'RFC Message-ID invalid');
    function header(text) {
      if (!/[^\x20-\x7e]/.test(text) && text.length <= 200) return text;
      // RFC 2047 encoded words are at most 75 characters. Break on Unicode
      // character boundaries, then fold only between complete encoded words.
      var chunks = [], chunk = '', size = 0;
      Array.from(text).forEach(function (character) {
        var count = utf8(character).length;
        if (size + count > 45) { chunks.push(chunk); chunk = ''; size = 0; }
        chunk += character; size += count;
      });
      if (chunk) chunks.push(chunk);
      return chunks.map(function (value) { return '=?UTF-8?B?' + base64(value) + '?='; }).join('\r\n ');
    }
    var encodedBody = base64(p.body.content).match(/.{1,76}/g) || [''];
    var raw = [
      'From: ' + header('Backoffice Backoffice Owner') + ' <' + accountAddress + '>',
      'To: ' + args.to, 'Subject: ' + header(args.subject),
      'Date: ' + new Date(Date.now()).toUTCString(), 'Message-ID: <' + identity + '>',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64', '', encodedBody.join('\r\n')
    ].join('\r\n');
    // Exactly one native invocation. An exception or incomplete response is an
    // unknown outcome for the caller's no-resend state machine, never a retry.
    var encodedRaw = Utilities.base64EncodeWebSafe(utf8(raw)).replace(/=+$/, '');
    // Conservative admission floors preserve the existing 30s gate. They are
    // not an upper bound on closure CPU, transport latency, or future shapes.
    checkBudget(1000);
    try { checkBudget(40000); }
    catch (notDispatched) { nativeSendBudgetError={error:notDispatched,lockEpoch:lockEpoch,budgetStarted:budgetStarted,budgetDeadline:budgetDeadline,mutationEpoch:canonicalMutationEpoch,frameEpoch:authorityFrameEpoch}; throw notDispatched; }
    terminalProofReceipt=null;var result = nativeObject(gmailReceiptDto(nativeBoundary(function(){return Gmail.Users.Messages.send({
      raw: encodedRaw
    }, 'me');}), 'message'), 'Gmail send');
    required(result, ['id', 'threadId'], 'native send acknowledgment');
    hold(validId(result.id) && validId(result.threadId), 'native send acknowledgment identity missing');
    return { id: result.id, thread_id: result.threadId };
  }
  function searchAll(query, max) {
    hold(typeof query === 'string' && query.trim() && query.length <= 20000 && !/[\x00\r\n]/.test(query), 'bounded native Gmail query required');
    if (max === undefined) max = 400;
    hold(integer(max, 1, 10000), 'explicit bounded native Gmail search budget required');
    var ids = [], seen = new Set(), tokens = new Set(), token, checkedAt = stamp(), pages = 0;
    do {
      var options = { q: query, maxResults: Math.min(100, max), includeSpamTrash: true };
      if (token) options.pageToken = token;
      checkBudget(1000);
      terminalProofReceipt=null;var result = nativeObject(gmailMetadataDto(nativeBoundary(function(){return Gmail.Users.Messages.list('me', options);}), 'messages', 'Gmail paginated search'), 'Gmail paginated search');
      var messages = optional(result, 'messages', 'Gmail search') === undefined ? [] : result.messages;
      hold(Array.isArray(messages) && messages.length <= options.maxResults, 'native message page invalid');
      messages.forEach(function (message) {
        required(message, ['id'], 'native search message');
        hold(record(message) && validId(message.id) && !seen.has(message.id), 'native message IDs repeated/invalid');
        seen.add(message.id); ids.push(message.id);
        hold(ids.length <= max, 'native complete Gmail search exceeds budget');
      });
      token = optional(result, 'nextPageToken', 'Gmail search');
      hold(token === undefined || typeof token === 'string' && token.length > 0 && !tokens.has(token),
        'native pagination token repeated/invalid');
      if (token) {
        hold(ids.length < max, 'native search budget reached before complete pagination');
        tokens.add(token);
      }
      pages++;
      hold(pages <= max + 1, 'native pagination page budget exhausted');
    } while (token);
    return { ids: ids, checkedAt: checkedAt, complete: true, pages: pages, query: query, ref: 'gmail-native-search:' + sha(query) };
  }
  function addressList(headers, name) {
    hold(Array.isArray(headers), 'native account metadata headers missing');
    var matches = headers.filter(function (header) { return header.name.toLowerCase() === name; });
    hold(matches.length <= 1, 'duplicate native ' + name + ' address header');
    if (!matches.length || matches[0].value === '') return [];
    var text = matches[0].value.replace(/\r\n[ \t]+/g, ' ');
    hold(!/[\r\n\x00]/.test(text), 'unsupported native address-header folding');
    var list = [], current = '', quote = false, escaped = false, comment = 0, angle = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (escaped) { if (!comment) current += ch; escaped = false; continue; }
      if (ch === '\\' && (quote || comment)) { if (!comment) current += ch; escaped = true; continue; }
      if (comment) {
        if (ch === '(') { comment++; hold(comment <= 10, 'native address comment nesting unbounded'); }
        if (ch === ')') comment--;
        continue;
      }
      if (!quote && ch === '(') { comment = 1; current += ' '; continue; }
      if (ch === '"') { quote = !quote; current += ch; continue; }
      if (!quote) {
        if (ch === '<') { hold(!angle, 'nested native mailbox angle brackets'); angle = true; }
        else if (ch === '>') { hold(angle, 'unmatched native mailbox angle bracket'); angle = false; }
        else if (ch === ':' || ch === ';') hold(false, 'native address groups/hidden recipients unsupported');
        else if (ch === ',' && !angle) {
          hold(current.trim(), 'empty native address-list member'); list.push(current.trim()); current = ''; continue;
        }
        else if (ch === ')') hold(false, 'unmatched native address comment');
      }
      current += ch;
    }
    hold(!quote && !escaped && !comment && !angle && current.trim(), 'native address list incomplete');
    list.push(current.trim());
    return list.map(function (item) {
      var pair = item.match(/^([^<>]*)<([^<>]+)>\s*$/), addr;
      if (pair) {
        // A quoted display name may contain punctuation, including commas.
        // Unquoted addr-spec text before <...> is ambiguous and fails closed.
        var display = pair[1].replace(/"(?:[^"\\]|\\.)*"/g, '');
        hold(!/[@,;:]/.test(display), 'ambiguous native display-name mailbox');
        addr = pair[2].trim();
      } else { hold(!/[<>]/.test(item), 'native mailbox angle syntax invalid'); addr = item; }
      return mailbox(addr);
    });
  }
  function accountUsage(binding, cfg) {
    safeData(binding, 'account-usage binding'); safeData(cfg, 'account-usage configuration');
    hold(record(binding) && record(cfg) && record(cfg.provider), 'independent binding/provider policy required');
    var policy = cfg.provider, started = Date.now(), checkedAt = new Date(started).toISOString();
    var manual=cfg.manualUsage;
    hold(record(manual)&&manual.schema==='BackofficeNativeManualQuotaEvidence/v1'&&manual.complete===true&&manual.modelAuthority===false&&manual.principal===accountAddress&&Number.isInteger(manual.evidenceRows)&&manual.evidenceRows>=6&&typeof manual.evidenceSha256==='string'&&/^[a-f0-9]{64}$/.test(manual.evidenceSha256)&&manual.evidenceSha256===cfg.evidenceSha256&&Array.isArray(manual.unknownReservations)&&Array.isArray(manual.confirmedReceipts),'fresh complete manual-counterpart quota evidence required');
    var manualUnknownKeys=Object.create(null),manualReceiptIds=Object.create(null),manualReceiptsById=Object.create(null),manualUnknown24=[],manualUnknown60=[];
    manual.unknownReservations.forEach(function(item){hold(record(item)&&['BackofficeManualUncertainSend/v1','BackofficeManualUnknownSendReceipt/v1'].indexOf(item.schema)>=0&&typeof item.roundId==='string'&&item.roundId&&Number.isInteger(item.claimRow)&&item.claimRow>=6&&typeof item.contactId==='string'&&item.contactId&&typeof item.recipient==='string'&&mailbox(item.recipient)===item.recipient&&typeof item.completedAtUtc==='string'&&Number.isFinite(Date.parse(item.completedAtUtc))&&Number.isInteger(item.sourceRow)&&item.sourceRow>=6&&item.sourceRow<=manual.evidenceRows&&typeof item.sourceSha256==='string'&&/^[a-f0-9]{64}$/.test(item.sourceSha256),'manual unknown reservation binding invalid');var age=started-Date.parse(item.completedAtUtc),key=JSON.stringify([item.roundId,item.claimRow,item.contactId]);hold(age>=-5000,'manual unknown reservation timestamp is in the future');hold(!own(manualUnknownKeys,key),'duplicate manual unknown reservation');manualUnknownKeys[key]=true;if(age<=86400000)manualUnknown24.push(item);if(age<=3600000)manualUnknown60.push(item);});
    manual.confirmedReceipts.forEach(function(item){hold(record(item)&&item.schema==='BackofficeManualSendReceipt/v1'&&typeof item.messageId==='string'&&item.messageId&&typeof item.threadId==='string'&&item.threadId&&typeof item.sender==='string'&&mailbox(item.sender)===accountAddress&&typeof item.recipient==='string'&&mailbox(item.recipient)===item.recipient&&typeof item.subject==='string'&&item.subject&&typeof item.bodySha256==='string'&&/^[a-f0-9]{64}$/.test(item.bodySha256)&&typeof item.completedAtUtc==='string'&&Number.isFinite(Date.parse(item.completedAtUtc))&&Number.isInteger(item.sourceRow)&&item.sourceRow>=6&&item.sourceRow<=manual.evidenceRows&&typeof item.sourceSha256==='string'&&/^[a-f0-9]{64}$/.test(item.sourceSha256),'manual confirmed receipt binding invalid');hold(!own(manualReceiptIds,item.messageId),'duplicate manual confirmed Gmail ID');manualReceiptIds[item.messageId]=true;if(started-Date.parse(item.completedAtUtc)<=86400000){hold(started-Date.parse(item.completedAtUtc)>=-5000,'manual receipt timestamp is in the future');manualReceiptsById[item.messageId]=item;}});
    hold(Array.isArray(policy.senderAddresses) && policy.senderAddresses.length > 0 &&
      Array.isArray(policy.internalDomains) && policy.internalDomains.length > 0, 'independent sender/domain coverage required');
    var senders = policy.senderAddresses.map(mailbox);
    hold(new Set(senders).size === senders.length && senders.includes(accountAddress),
      'exact native account absent from sender coverage');
    var domains = policy.internalDomains.map(function (domain) {
      hold(typeof domain === 'string' && domain === domain.toLowerCase() &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain), 'independent internal domain invalid');
      return domain;
    });
    hold(new Set(domains).size === domains.length, 'duplicate independent internal domain');
    checkBudget(1000);
    terminalProofReceipt=null;var profile = nativeObject(gmailProfileDto(nativeBoundary(function(){return Gmail.Users.getProfile('me');}), 'Gmail profile'), 'Gmail profile');
    required(profile, ['emailAddress'], 'Gmail profile');
    checkBudget(1000);
    terminalProofReceipt=null;var labels = nativeObject(gmailMetadataDto(nativeBoundary(function(){return Gmail.Users.Labels.list('me');}), 'labels', 'Gmail labels'), 'Gmail labels');
    required(labels, ['labels'], 'Gmail labels');
    hold(Array.isArray(labels.labels), 'native label list must be an array');
    labels.labels.forEach(function (entry) { required(entry, ['id', 'name'], 'Gmail label'); });
    hold(mailbox(profile.emailAddress) === accountAddress && Array.isArray(labels.labels) &&
      labels.labels.filter(function (l) { return record(l) && l.id === labelId && l.name === 'Outreach/Sent/Jobs'; }).length === 1,
      'native connected account/Label_5 binding mismatch');
    var terms = [mailbox(binding.to), mailbox(binding.to).split('@')[1], binding.name, binding.company].concat(cfg.familyTerms || []);
    hold(terms.every(function (term) { return typeof term === 'string' && term && !/["{}\r\n\x00]/.test(term); }),
      'safe exact recipient/organization/family history terms required');
    var history = searchAll('in:anywhere {' + terms.map(function (term) { return '"' + term + '"'; }).join(' ') + '}', cfg.historySearchBudget || 400);
    var outboundQuery = 'in:anywhere -in:drafts (in:sent OR from:me OR ' + senders.map(function (sender) {
      hold(!/["(){}\s]/.test(sender), 'sender cannot be safely bound to outbound query'); return 'from:' + sender;
    }).join(' OR ') + ') after:' + (Math.floor((started - 86400000) / 1000) - 1);
    var sent = searchAll(outboundQuery, cfg.outboundSearchBudget || 400);
    Object.keys(manualReceiptsById).forEach(function(id){hold(sent.ids.indexOf(id)>=0,'recent manual receipt missing from complete fresh account outbound census');});
    var campaign60 = 0, automation24 = 0, unknownAutomation24 = 0, recipients = [], external = [], metadataBasis = [];
    sent.ids.forEach(function (id) {
      checkBudget(1000);
      terminalProofReceipt=null;var native = gmailReceiptDto(nativeBoundary(function(){return Gmail.Users.Messages.get('me', id, { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'] });}), 'message');
      var message = nativeMessage(native, 'metadata', id), date = Number(message.internal_date), labels = message.label_ids;
      hold(date <= started + 5000 && !labels.includes('DRAFT'), 'native outbound timestamp/draft coverage unknown');
      var from = addressList(message.payload.headers, 'from');
      hold(from.length === 1 && senders.includes(from[0]),
        'native outbound sender absent from independent coverage');
      var toOnly = addressList(message.payload.headers, 'to'), cc = addressList(message.payload.headers, 'cc'), bcc = addressList(message.payload.headers, 'bcc');
      var to = toOnly.concat(cc, bcc);
      var manualReceipt=manualReceiptsById[id];if(manualReceipt){var subjects=message.payload.headers.filter(function(h){return h.name.toLowerCase()==='subject';});hold(subjects.length===1&&subjects[0].value===manualReceipt.subject&&message.thread_id===manualReceipt.threadId&&Math.abs(date-Date.parse(manualReceipt.completedAtUtc))<=300000&&from.length===1&&from[0]===manualReceipt.sender&&to.indexOf(manualReceipt.recipient)>=0,'fresh native account message does not exactly corroborate manual receipt binding');}
      metadataBasis.push({id:message.id,thread_id:message.thread_id,internal_date:message.internal_date,label_ids:message.label_ids.slice(),headers:message.payload.headers.map(function(h){return {name:h.name,value:h.value};}),nativeRawHeaders:native.payload.headers.map(function(h){return {name:h.name,value:h.value};}),nativeMetadataRepresentation:'GMAIL_MESSAGE_METADATA_SDK_SEMANTIC_DTO_V1',nativeMetadataSha256:sha(JSON.stringify({id:native.id,threadId:native.threadId,internalDate:native.internalDate,labelIds:native.labelIds,headers:native.payload.headers})),parsed:{from:from,to:toOnly,cc:cc,bcc:bcc},checkedAt:stamp()});
      hold(to.length > 0, 'native outbound recipient coverage unavailable');
      recipients = recipients.concat(to);
      external = external.concat(to.filter(function (address) { return domains.indexOf(address.split('@').pop()) < 0; }));
      // A message outside the campaign label (including a sender-matched
      // outbound with missing SENT) is conservatively unknown automation.
      if (labels.includes(labelId) && labels.includes('SENT')) {
        automation24++; if (date >= started - 3600000) campaign60++;
      } else unknownAutomation24++;
    });
    manualUnknown24.forEach(function(item){recipients.push(item.recipient);if(domains.indexOf(item.recipient.split('@').pop())<0)external.push(item.recipient);});
    var reservation = cfg.reservations;
    hold(record(reservation) && ['campaign60', 'account24', 'automation24'].every(function (key) {
      return integer(reservation[key], 0);
    }), 'independent current reservation counts required');
    var reservedCampaign60=Math.max(reservation.campaign60,manualUnknown60.length),reservedAccount24=Math.max(reservation.account24,manualUnknown24.length),reservedAutomation24=Math.max(reservation.automation24,manualUnknown24.length);
    campaign60+=manualUnknown60.length;unknownAutomation24+=manualUnknown24.length;var totalAccount24=sent.ids.length+manualUnknown24.length;
    var measured = {
      messages24: totalAccount24, externalUnique24: new Set(external).size, apiRecipientsPerMessage: 0,
      recipients24: recipients.length, externalRecipients24: external.length, uniqueRecipients24: new Set(recipients).size
    };
    hold(record(policy.dimensions), 'independent applicable provider dimensions required');
    var dimensions = {};
    Object.keys(policy.dimensions).forEach(function (name) {
      var dimension = policy.dimensions[name];
      hold(record(dimension) && typeof dimension.applicable === 'boolean', 'independent provider applicability missing: ' + name);
      dimensions[name] = copy(dimension);
      if (!dimension.applicable) return;
      hold(dimension.complete === true && integer(dimension.limit, 1) && integer(dimension.reserved, 0),
        'independent provider limit/reservations incomplete: ' + name);
      var metric = own(measured, name) ? name : dimension.nativeMetric;
      hold(typeof metric === 'string' && own(measured, metric), 'provider dimension lacks native usage metric: ' + name);
      dimensions[name].used = measured[metric]; dimensions[name].increment = 1;
    });
    Object.keys(measured).forEach(function (name) {
      hold(own(dimensions, name) && dimensions[name].applicable === true, 'required provider dimension missing: ' + name);
    });
    var ref = 'gmail-native-account-usage:' + projectId + ':' + started;
    var usageBasis={schema:'BackofficeNativeAccountUsageBasis/v1',accountAddress:accountAddress,checkedAt:checkedAt,windowStartUtc:new Date(started-86400000).toISOString(),windowEndUtc:checkedAt,queryWindowConservativeSeconds:1,outboundSearch:sent,historySearch:history,historyTerms:terms,senderAddresses:senders,internalDomains:domains,nativeProfile:copy(profile),nativeProfileRepresentation:'GMAIL_PROFILE_SDK_SEMANTIC_DTO_V1',nativeLabels:labels.labels.filter(function(l){return l.id===labelId;}).map(function(l){return {id:l.id,name:l.name};}),nativeLabelsRepresentation:'GMAIL_LABELS_LIST_SDK_SEMANTIC_DTO_V1',metadata:metadataBasis,classification:'LABEL_5_AND_SENT_KNOWN_AUTOMATION_OTHER_OUTBOUND_UNKNOWN_AUTOMATION',countedIds:sent.ids,manualUnknownReservations24:manualUnknown24.map(function(x){return {schema:x.schema,roundId:x.roundId,claimRow:x.claimRow,contactId:x.contactId,recipient:x.recipient,completedAtUtc:x.completedAtUtc,sourceRow:x.sourceRow,sourceSha256:x.sourceSha256};}),manualConfirmedReceipts24:Object.keys(manualReceiptsById),recipientCount24:recipients.length,externalRecipientCount24:external.length,uniqueRecipientCount24:new Set(recipients).size,externalUniqueRecipientCount24:new Set(external).size,campaign60:campaign60,totalAccount24:totalAccount24,automation24:automation24,unknownAutomation24:unknownAutomation24,reservations:{campaign60:reservedCampaign60,account24:reservedAccount24,automation24:reservedAutomation24}};
    return {
      nativeUsageBasis:usageBasis,nativeUsageBasisSha256:sha(JSON.stringify(usageBasis)),
      account: { address: accountAddress, labelId: labelId, complete: true, checkedAt: checkedAt, ref: ref + ':account' },
      usage: { accountAddress: accountAddress, complete: true, unknownUsage: false,
        campaign60: campaign60, totalAccount24: totalAccount24, automation24: automation24,
        unknownAutomation24: unknownAutomation24,
        reservedCampaign60: reservedCampaign60, reservedAccount24: reservedAccount24,
        reservedAutomation24: reservedAutomation24, accountSentIds: sent.ids,
        recipientCount24: recipients.length, externalRecipientCount24: external.length,
        uniqueRecipientCount24: new Set(recipients).size, externalUniqueRecipientCount24: new Set(external).size,
        checkedAt: checkedAt, ref: ref + ':usage' },
      provider: { accountAddress: accountAddress, complete: true, tier: policy.tier,
        dimensions: dimensions, checkedAt: checkedAt, ref: ref + ':provider-native-usage' },
      historyCheck: { complete: true, clear: history.ids.length === 0, binding: copy(binding),
        ids: history.ids, checkedAt: history.checkedAt, ref: history.ref },
      // No claim that profile/modify freshly reads sendAs, delegation, vacation,
      // off-account senders, or other writer activity. Independent registered
      // coverage adapters supply that evidence to the caller separately.
      coverage: { aliases: false, delegation: false, vacation: false },
      checkedAt: checkedAt, ref: ref
    };
  }
  function nativeSettings() {
    var checkedAt = stamp(), ref = 'gmail-native-settings:' + projectId + ':' + Date.parse(checkedAt);
    checkBudget(1000);
    terminalProofReceipt=null;var profile = nativeObject(gmailProfileDto(nativeBoundary(function(){return Gmail.Users.getProfile('me');}), 'Gmail settings account'), 'Gmail settings account');
    required(profile, ['emailAddress'], 'Gmail settings account');
    hold(mailbox(profile.emailAddress) === accountAddress, 'native settings account identity mismatch');
    checkBudget(1000);
    terminalProofReceipt=null;var aliases = nativeObject(gmailMetadataDto(nativeBoundary(function(){return Gmail.Users.Settings.SendAs.list('me');}), 'sendAs', 'Gmail native sendAs settings'), 'Gmail native sendAs settings');
    required(aliases, ['sendAs'], 'Gmail native sendAs settings');
    hold(Array.isArray(aliases.sendAs) && aliases.sendAs.length > 0 && aliases.sendAs.length <= 100,
      'finite complete native sendAs list required');
    function flag(object, key, requiredFlag, name) {
      var value = optional(object, key, name);
      if (value === undefined) {
        hold(!requiredFlag, name + ' required boolean flag missing: ' + key);
        return null;
      }
      hold(typeof value === 'boolean', name + ' boolean flag invalid: ' + key);
      return value;
    }
    var entries = aliases.sendAs.map(function (entry) {
      required(entry, ['sendAsEmail'], 'native sendAs entry');
      var email = mailbox(entry.sendAsEmail);
      var primary = flag(entry, 'isPrimary', false, 'native sendAs');
      var defaultAddress = flag(entry, 'isDefault', false, 'native sendAs');
      var treatAsAlias = flag(entry, 'treatAsAlias', false, 'native sendAs');
      var status = optional(entry, 'verificationStatus', 'native sendAs');
      hold(status === undefined || status === 'accepted' || status === 'pending', 'native sendAs verification status invalid');
      return { address: email, isPrimary: primary, isDefault: defaultAddress,
        treatAsAlias: treatAsAlias, verificationStatus: status === undefined ? null : status };
    });
    var senderAddresses = entries.map(function (entry) { return entry.address; });
    hold(new Set(senderAddresses).size === senderAddresses.length && entries.filter(function (entry) {
      return entry.isPrimary === true && entry.address === accountAddress;
    }).length === 1 && entries.filter(function (entry) { return entry.isPrimary === true; }).length === 1 &&
      entries.filter(function (entry) { return entry.isDefault === true; }).length <= 1,
      'native exact sendAs identities/primary account ambiguous');
    checkBudget(1000);
    terminalProofReceipt=null;var nativeVacation = nativeObject(gmailMetadataDto(nativeBoundary(function(){return Gmail.Users.Settings.getVacation('me');}), 'vacation', 'Gmail native vacation settings'), 'Gmail native vacation settings');
    var enabled = flag(nativeVacation, 'enableAutoReply', true, 'native vacation');
    function time(key) {
      var value = optional(nativeVacation, key, 'native vacation');
      if (value === undefined) return null;
      hold(typeof value === 'string' && /^[0-9]+$/.test(value) && integer(Number(value), 0),
        'native vacation finite millisecond time invalid: ' + key);
      return value;
    }
    var startTime = time('startTime'), endTime = time('endTime');
    hold(startTime === null || endTime === null || Number(endTime) >= Number(startTime),
      'native vacation time bounds invalid');
    return {
      accountAddress: accountAddress, senderAddresses: senderAddresses,
      aliases: { complete: true, accountAddress: accountAddress, senderAddresses: senderAddresses.slice(),
        entries: entries, checkedAt: checkedAt, ref: ref + ':sendAs' },
      vacation: { complete: true, accountAddress: accountAddress, enableAutoReply: enabled, enabled: enabled,
        restrictToContacts: flag(nativeVacation, 'restrictToContacts', false, 'native vacation'),
        restrictToDomain: flag(nativeVacation, 'restrictToDomain', false, 'native vacation'),
        startTime: startTime, endTime: endTime, checkedAt: checkedAt, ref: ref + ':vacation' },
      checkedAt: checkedAt, ref: ref
    };
  }
  function deleteVerifiedCapture(key, expected, proof) {archiveMutationFence();hold(!readBundle,"read bundle cannot cross a verified capture deletion boundary");
    hold(lockHeld && nativeLockHeld(), 'held project lock required for verified pool cleanup');
    var prefixes = ['FERNAIN_NATIVE_POOL_CAPTURE_V1:', 'FERNAIN_NATIVE_POOL_STATE_V1:'];
    var prefix = prefixes.filter(function (p) { return typeof key === 'string' && key.indexOf(p) === 0; })[0];
    hold(prefix && /^[A-Za-z0-9_-]{16,128}$/.test(key.slice(prefix.length)) && typeof expected === 'string' && utf8(expected).length <= 8500, 'only exact bounded pool capture/state cleanup allowed');
    safeData(proof, 'pool archive cleanup proof');
    hold(proof.schema === 'BackofficeNativePoolArchiveCleanupProof/v1' && proof.captureId === key.slice(prefix.length) && /^[a-f0-9]{64}$/.test(proof.captureSha256) && ['COMPLETE', 'PROPOSAL_ONLY'].indexOf(proof.terminalState) >= 0, 'pool terminal archive authority missing; keep');
    checkBudget(); hold(properties.getProperty(key) === expected, 'pool cleanup expected property preimage changed; keep');
    var head; try { head = JSON.parse(expected); } catch (_) { hold(false, 'pool capture/state malformed; keep'); }
    safeData(head, 'pool capture/state head');
    if (prefix === prefixes[0]) hold(head.schema === 'BackofficeNativePoolCaptureManifest/v1' && head.id === proof.captureId && head.sha256 === proof.captureSha256 && head.manifestRow === proof.manifest.row && head.manifestRowSha256 === proof.manifest.rowSha256, 'pool capture head/archive mismatch; keep');
    else hold(head.schema === 'BackofficeNativePoolConsumption/v1' && head.captureId === proof.captureId && head.state === proof.terminalState && head.noAutomaticRetry === true, 'pool state not terminal/archived; keep');
    function archived(ref, kind) {
      safeData(ref, 'pool archive row reference'); hold(integer(ref.row, 6) && /^[a-f0-9]{64}$/.test(ref.rowSha256), 'pool archive typed row reference missing');
      var row = readRow('Evidence', ref.row, 26); hold(sha(JSON.stringify(row)) === ref.rowSha256 && own(row[3], 'stringValue'), 'pool archive full26 preimage changed; keep');
      var doc; try { doc = JSON.parse(row[3].stringValue); } catch (_) { hold(false, 'pool archive row malformed; keep'); }
      safeData(doc, 'pool native archive'); hold(doc.schema === 'BackofficeNativeJournal/v1' && doc.kind === kind && record(doc.value), 'pool native archive version/kind mismatch'); return doc.value;
    }
    var retained = archived(proof.manifest, 'pool-capture-manifest');
    var m = retained.manifest; safeData(m, 'pool capture manifest');
    hold(retained.captureId === proof.captureId && m.schema === 'BackofficeNativePoolEvidenceManifest/v1' && m.id === proof.captureId && m.sha256 === proof.captureSha256 && integer(m.chunkCount, 1, 128) && Array.isArray(m.chunks) && m.chunks.length === m.chunkCount, 'pool full native manifest identity incomplete');
    var encoded = '', seen = new Set();
    m.chunks.forEach(function (ref, index) {
      hold(ref.index === index && !seen.has(ref.row), 'pool archive chunk index/row repeated'); seen.add(ref.row);
      var v = archived(ref, 'pool-capture-chunk');
      hold(v.captureId === proof.captureId && v.index === index && v.total === m.chunkCount && typeof v.chunk === 'string' && v.chunk.length <= 39000 && /^[A-Za-z0-9+/]*={0,2}$/.test(v.chunk) && v.captureSha256 === proof.captureSha256 && sha(v.chunk) === ref.chunkSha256 && v.chunkSha256 === ref.chunkSha256, 'pool full archive chunk hash/identity mismatch'); encoded += v.chunk;
    });
    hold(sha(encoded) === m.encodedSha256, 'pool full encoded archive root mismatch');
    var captured = decodeBytes(Utilities.base64Decode(encoded), 'UTF-8'); hold(utf8(captured).length <= 4000000 && sha(captured) === proof.captureSha256, 'pool full capture archive root mismatch');
    var terminal = archived(proof.terminal, 'pool-capture-terminal');
    hold(terminal.captureId === proof.captureId && terminal.terminalState === proof.terminalState && terminal.noAutomaticRetry === true && record(terminal.captureManifest) && terminal.captureManifest.row === proof.manifest.row && terminal.captureManifest.rowSha256 === proof.manifest.rowSha256 && terminal.captureManifest.sha256 === proof.captureSha256, 'pool terminal archive/readback mismatch');
    if (proof.terminalState === 'COMPLETE') hold(record(terminal.canonicalReadback) && terminal.canonicalReadback.acknowledged === true && terminal.canonicalReadback.verified === true, 'completed pool effects have no archived canonical readback');
    checkBudget(); hold(properties.getProperty(key) === expected, 'pool head changed during archive validation; keep');
    checkBudget(); terminalProofReceipt=null;try{properties.deleteProperty(key);}finally{discardPropertyBoundaryProof();} checkBudget(); hold(properties.getProperty(key) === null, 'pool verified cleanup null readback mismatch');
    return { acknowledged: true, verified: true, deleted: true, captureId: proof.captureId, archiveManifestRow: proof.manifest.row, terminalRow: proof.terminal.row };
  }
  function invoke(name, args) {
    hold(typeof name === 'string' && /^fernain[A-Za-z0-9_]{1,100}$/.test(name) &&
      name !== 'fernainNativeServices', 'strict independent native-adapter function identifier required');
    var root = typeof globalThis !== 'undefined' ? globalThis : null;
    var descriptor = root && Object.getOwnPropertyDescriptor(root, name);
    hold(descriptor && own(descriptor, 'value') && typeof descriptor.value === 'function',
      'registered project native adapter unavailable: ' + name);
    checkBudget(1000);
    safeData(args, 'native adapter arguments');
    terminalProofReceipt=null;var result = nativeBoundary(function(){return descriptor.value(args);});
    checkBudget();
    hold(result !== undefined && !isThenable(result), 'native adapter must return synchronous evidence');
    safeData(result, 'native adapter evidence');
    return result;
  }
  return Object.freeze({
    now: function () { return Date.now(); }, newId: function () { return Utilities.getUuid(); },
    startBudget: startBudget, checkBudget: checkBudget, archiveMutationFence:archiveMutationFence, archiveMutationGuard:archiveMutationGuard, sheetsGetMetrics:function(){return copy(sheetsReadStats);},
    readCanonicalIdentity:function(){checkBudget(1000);var dto=sheetsGet(workbook,{fields:'spreadsheetId'}),d=dto&&typeof dto==='object'&&!Array.isArray(dto)&&Object.getOwnPropertyDescriptor(dto,'spreadsheetId');hold(d&&own(d,'value')&&d.value===workbook,'fixed canonical workbook identity unavailable');return {spreadsheetId:workbook};},
    // Scalar transport identity only; never a source/storage/eligibility proof.
    preflightTransportStamp:function(){checkBudget(1000);hold(lockHeld&&nativeLockHeld()&&budgetExplicitlyStarted,'private preflight transport requires held action lock');return {projectId:projectId,lockEpoch:lockEpoch,actionEpoch:budgetStarted,deadlineMs:budgetDeadline,mutationEpoch:canonicalMutationEpoch,frameEpoch:authorityFrameEpoch,getAttempts:sheetsReadStats.attempts,boundaryEpoch:preflightTransportEpoch,propertyReadEpoch:preflightPropertyReadEpoch};},
    invalidateNativeReadBoundary:discardActualBoundary, sha: sha, shaMetrics: shaMetrics, byteLength: utf8Length, projectId: projectId,
    lock: Object.freeze({
      hasLock: function () { return lockHeld && nativeLockHeld(); },
      tryLock: function (ms) {
        hold(integer(ms, 0, 30000) && !lockHeld, 'bounded fresh project lock attempt required');
        checkBudget(ms);
        discardMetadataPlan();discardActualBoundary();lockHeld = scriptLock.tryLock(ms) === true;
        if (lockHeld) lockEpoch++;
        return lockHeld;
      },
      releaseLock: function () { hold(!readBundle,"read bundle cannot cross a lock release boundary");discardMetadataPlan();discardActualBoundary();if(lockHeld){try{finalizeSheetsMeter();}catch(finalizationError){sheetsReadStats.meterSamplingStage='AFTER_FAILED_LOCK_FINALIZER_STATE_UNVERIFIED';sheetsReadStats.meterFinalizationVerified=false;throw finalizationError;}finally{try{scriptLock.releaseLock();}finally{lockHeld=false;lockEpoch++;discardActualBoundary();}}} }
    }),
    props: Object.freeze({
      deleteVerifiedCapture: deleteVerifiedCapture,
      getProperty: function (key) { checkBudget();closeTerminalScope();terminalBankDigest=null;preflightPropertyReadEpoch++;if(retentionReadActive)return nativeBoundary(function(){return rawProperties.getProperty(key);});return rawProperties.getProperty(key); },
      setProperty: function (key, value) {hold(!readBundle,"read bundle cannot cross a property write boundary");
        hold(typeof key === 'string' && key && typeof value === 'string', 'script property key/string required');hold(key!==sheetsReadKey&&key!=='FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1','ordinary property interface cannot write private Sheets pace/recipient compatibility authority');
        checkBudget();
        archiveMutationFence();hold(key!=='FERNAIN_NATIVE_ARCHIVE_ROOT_V2'&&key!=='FERNAIN_NATIVE_ARCHIVE_PRESERVATION_V3'&&key!=='FERNAIN_NATIVE_ARCHIVE_RECIPIENT_COMPATIBILITY_V1','ordinary property interface cannot change archive authority');terminalProofReceipt=null;try{properties.setProperty(key, value);}finally{discardPropertyBoundaryProof();}
        checkBudget();
        hold(properties.getProperty(key) === value, 'script property write readback mismatch');
      },
      deleteProperty: function (key) {hold(!readBundle,"read bundle cannot cross a property deletion boundary");
        var prefix = 'FERNAIN_NATIVE_CAPTURE_V1:';
        hold(typeof key === 'string' && key.indexOf(prefix) === 0 &&
          /^[A-Za-z0-9_-]{16,128}$/.test(key.slice(prefix.length)), 'only ephemeral capture property deletion allowed');
        hold(lockHeld && nativeLockHeld(), 'held project lock required for ephemeral capture deletion');
        checkBudget();
        var before = properties.getProperty(key);
        hold(typeof before === 'string' && utf8(before).length <= 8500, 'ephemeral capture preimage missing/unbounded; keep');
        var capture;
        try { capture = JSON.parse(before); } catch (_) { hold(false, 'ephemeral capture preimage malformed; keep'); }
        safeData(capture, 'ephemeral capture');
        required(capture, ['schema', 'id', 'consumed', 'expiresAt'], 'ephemeral capture');
        var expiry = typeof capture.expiresAt === 'string' ? Date.parse(capture.expiresAt) : NaN;
        hold(capture.schema === 'BackofficeNativeCapture/v1' && capture.id === key.slice(prefix.length) &&
          typeof capture.consumed === 'boolean' && Number.isFinite(expiry) &&
          (capture.consumed === true || expiry <= Date.now()), 'capture not proven disposable; keep');
        checkBudget();
        hold(properties.getProperty(key) === before, 'ephemeral capture preimage changed; keep');
        checkBudget();
        archiveMutationFence();terminalProofReceipt=null;try{properties.deleteProperty(key);}finally{discardPropertyBoundaryProof();}
        checkBudget();
        hold(properties.getProperty(key) === null, 'ephemeral capture deletion readback mismatch');
        return { acknowledged: true, verified: true, deleted: true };
      },
      getProperties: function () { checkBudget();if(retentionReadActive)return nativeBoundary(function(){return properties.getProperties();});return properties.getProperties(); }
    }),
    sourceRetentionReuseReferences:sourceRetentionReuseReferences,snapshotSourceMetadata:snapshotSourceMetadata,withReadOnlyBundle:withReadOnlyBundle,withSourceRetentionReadBundle:withSourceRetentionReadBundle, snapshot: snapshot,captureBootstrapSnapshot:captureBootstrapSnapshot, fullSnapshotDiagnostic: fullSnapshotDiagnostic, snapshotCapacity: snapshotCapacity, readRow: readRow, readRowCapture: readRowCapture, casWrites: casWrites,
    readEvidenceRows: readEvidenceRows, casSourceChunks: casSourceChunks,
    casArchiveLocators: function(writes){return casArchiveLocators(writes);},
    prepareRecipientCompatibilityReviewed:prepareRecipientCompatibilityReviewed,applyRecipientCompatibilityReviewed:applyRecipientCompatibilityReviewed,prepareArchivePreservationReviewed:prepareArchivePreservationReviewed, applyArchivePreservationReviewed:applyArchivePreservationReviewed,
    activateArchivePreservation:function(){hold(false,'sample copy disables one-off archive preservation activation; configure a separately reviewed private implementation');},
    beginSourceArchiveReadset: function(){if(!retentionReadActive)archiveReadset=newReadset();},
    readEvidenceLogicalRow: function(row,expected,purpose){assertRetentionReadCapture();return archiveAdapter().logical(row,expected,purpose);},
    validateArchiveSummary: function(row,summary,targetEmail){return archiveAdapter().validateArchiveSummary(row,summary,targetEmail);},
    validateArchiveSummaries: function(rows,summaries,targetEmail){return archiveAdapter().validateArchiveSummaries(rows,summaries,targetEmail);},
    validateArchiveReadBoundary: function(){return archiveAdapter().validateArchiveReadBoundary();},
    persistArchiveEligibleRow: function(write,kind,expires){hold(!readBundle,"read bundle cannot cross an archive persistence boundary");lastSnapshotCapacity=null;if(appendOnlyFullJournal(write,kind,expires)&&properties.getProperty(BackofficeNativeArchiveV2.layout.rootKey)!==null)return persistAppendOnlyFullJournal(write);archiveMutationFence();return archiveAdapter().persist(write,kind,expires);},
    persistArchiveEligibleRows: function(writes,kind){hold(!readBundle,"read bundle cannot cross an archive persistence boundary");lastSnapshotCapacity=null;return archiveAdapter().persistMany(writes,kind);},
    previewSourceRetention: function(values,row,at){return archiveAdapter().previewSourceRetention(values,row,at);},
    persistSourceRetention: function(values,write,preview,expires,targetPlan){hold(!readBundle,'read bundle cannot cross mixed source persistence');lastSnapshotCapacity=null;return archiveAdapter().sourceRetention(values,write,preview,expires,targetPlan);},
    previewSourceArchiveChunks: function(values){return archiveAdapter().previewDirect(values);},
    appendSourceArchiveChunks: function(values,expires){hold(!readBundle,"read bundle cannot cross an archive persistence boundary");lastSnapshotCapacity=null;return archiveAdapter().appendDirect(values,expires);},
    readSourceArchiveChunk: function(location,expected){return archiveAdapter().readDirect(location,expected);},
    readSourceArchiveChunks: function(first,last,sheetId){assertRetentionReadCapture();return archiveAdapter().readDirectRows(first,last,sheetId);},
    planSourceRetentionCapacity: function(x,plan,metadata,reserve){return archiveAdapter().capacity(x,plan,metadata,reserve);},
    archiveUnindexedCopyInspectionReadOnly: archiveUnindexedCopyInspectionReadOnly, archiveReadOnlyReconciliation: archiveReadOnlyReconciliation, migrateArchiveRows: migrateArchiveRows, archiveMeasurement: archiveMeasurement,
    send: send, sendBudgetHeldBeforeDispatch: sendBudgetHeldBeforeDispatch, full: full, label: label, minimal: minimal, threadFull: threadFull, accountProfile: accountProfile,
    searchAll: searchAll, accountUsage: accountUsage, nativeSettings: nativeSettings, invoke: invoke
  });
}

/* Public sample: private archive repair runners are disabled. */
function fernainNativeArchiveFailureCategoryV2(){return 'UNCONFIGURED';}
function fernainNativeArchivePhaseV2(){fernHold(false,'archive maintenance runner is unconfigured; STOP before native access');}
function fernainNativeArchiveReadOnlyMeasurementV2(){return fernainNativeArchivePhaseV2();}
function fernainNativeArchiveMigrationV2(){return fernainNativeArchivePhaseV2();}
function fernainNativeLegacyArchivePlanV2(){return null;}
function fernainNativeLegacyArchivePhaseV2(){fernHold(false,'legacy archive maintenance runner is unconfigured; STOP before native access');}
function fernainNativeLegacyArchiveReadOnlyMeasurementV2(){return fernainNativeLegacyArchivePhaseV2();}
function fernainNativeLegacyArchiveMigrationV2(){return fernainNativeLegacyArchivePhaseV2();}
