// Non-sending inspection; internal quota meter property bookkeeping only. No source capture, cleanup or resume.
function fernainNativeArchiveReadOnlyReconciliationV1(){
 var s=null,got=false,stage='SERVICES',started=Date.now(),out={schema:'BackofficeNativeArchiveReadOnlyInspectionRun/v1',complete:false,readOnly:true,propertyWriteAttempted:false,canonicalWriteAttempted:false,archiveWriteAttempted:false,sourceFetchAttempted:false,sendAttempted:false,unknownMeansKeep:true};
 try{
  s=fernainNativeServices();s.startBudget(110000);
  fernHold(s.projectId==='{{CONFIGURE_GOOGLE_ID_036}}','finite archive inspection exact native project required');
  stage='CONFIG';var c=JSON.parse(s.props.getProperty('FERNAIN_NATIVE_RUNTIME_CONFIG_V1')||'null');
  fernHold(c&&c.schema==='BackofficeNativeConfig/v1'&&c.projectId===s.projectId&&c.spreadsheetId==='{{CONFIGURE_GOOGLE_ID_030}}','finite archive inspection exact configuration required');
  stage='LOCK';got=s.lock.tryLock(0);fernHold(got&&s.lock.hasLock()===true,'finite archive inspection held lock required');
  stage='ROOT_INDEX_RECENT_AND_TAIL';out.result=s.archiveReadOnlyReconciliation(c);s.checkBudget();fernHold(out.result&&out.result.complete===true&&out.result.canonicalReadOnly===true&&out.result.quotaBookkeepingOnly===true,'finite archive inspection incomplete');
  out.complete=true;
 }catch(e){out.failedStage=stage;out.failureCategory=typeof fernainNativeFiniteErrorCategoryV1==='function'?fernainNativeFiniteErrorCategoryV1(e):'VALIDATION_HOLD';out.disposition='KEEP';}
 finally{try{if(got&&s)s.lock.releaseLock();}catch(finalizationError){out.complete=false;out.failedStage='SHEETS_GET_FINALIZATION';out.failureCategory='QUOTA_METER';out.status='HOLD';out.disposition='KEEP';}if(s&&typeof s.sheetsGetMetrics==='function'){out.sheetsGetMetrics=s.sheetsGetMetrics();out.internalMeterPropertyWriteAttempts=out.sheetsGetMetrics.internalMeterWriteAttempts;out.propertyWriteAttempted=out.internalMeterPropertyWriteAttempts>0;out.readOnly=!out.propertyWriteAttempted;out.canonicalReadOnly=true;out.quotaBookkeepingOnly=true;out.quotaBookkeepingPropertyKey='FERNAIN_NATIVE_SHEETS_GET_PACE_V1';}}
 out.elapsedMs=Date.now()-started;Logger.log('FERNAIN_ARCHIVE_READONLY_RECONCILIATION_V1:'+JSON.stringify(out));return out;
}
