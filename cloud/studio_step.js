/* Private staging adapter for Studio. No Gmail/Drive/network services.
 * This validates finite model controls only. It does not confer source,
 * destination, deduplication or write authority. record_authorized is false.
 */
function validateStudioControlInput(event) {
  var inputs = event && event.workflow && event.workflow.actionInvocation && event.workflow.actionInvocation.inputs;
  if (!inputs || Object.keys(inputs).sort().join(',') !== 'controls_json,purpose') throw new Error('STUDIO_INPUT_KEYS');
  function scalar(key) {
    var v=inputs[key];
    if (!v || Object.keys(v).join(',')!=='stringValues' || !Array.isArray(v.stringValues) || v.stringValues.length!==1 || typeof v.stringValues[0]!=='string' || v.stringValues[0].length>2048) throw new Error('STUDIO_INPUT_TYPE');
    return v.stringValues[0];
  }
  var purpose=scalar('purpose'), fields;
  if (purpose==='EXECUTIVE_EMAIL_CLASSIFICATION') fields={needs_owner_review:{type:'boolean'}};
  else if (purpose==='FINANCE_DRAFT_REVIEW') fields={review_state:{type:'enum',values:['READY_FOR_REVIEW','MISSING_DATA','EXCEPTION']},source_identity_matches:{type:'boolean'},required_fields_complete:{type:'boolean'},arithmetic_consistent:{type:'boolean'},synthetic:{type:'boolean'},human_review_required:{type:'boolean'},no_payment_accounting_or_send:{type:'boolean'}};
  else throw new Error('STUDIO_PURPOSE_BLOCKED');
  var output;
  try { output=JSON.parse(scalar('controls_json')); } catch(e) { throw new Error('STUDIO_OUTPUT_JSON'); }
  BackofficeGuard.validateOutput({output_fields:fields},output);
  if (purpose==='FINANCE_DRAFT_REVIEW') {
    if (output.human_review_required!==true || output.no_payment_accounting_or_send!==true) throw new Error('FINANCE_EFFECT_POLICY');
    if (output.review_state==='READY_FOR_REVIEW' && (!output.source_identity_matches || !output.required_fields_complete || !output.arithmetic_consistent)) throw new Error('FINANCE_READY_INCONSISTENT');
    if (output.review_state==='MISSING_DATA' && output.required_fields_complete) throw new Error('FINANCE_MISSING_INCONSISTENT');
  }
  return {input_valid:true,record_authorized:false,validated_controls_json:JSON.stringify(output),trace_schema_version:BackofficeGuard.VERSION};
}
function onConfigControlValidation() {
  return {action:{navigations:[{push_card:{sections:[{header:'Finite model controls only; no write authority',widgets:[
    {selectionInput:{name:'purpose',label:'Approved purpose',type:'DROPDOWN',items:[{text:'Executive email classification',value:'EXECUTIVE_EMAIL_CLASSIFICATION'},{text:'Finance draft review',value:'FINANCE_DRAFT_REVIEW'}]}},
    {textInput:{name:'controls_json',label:'Gemini finite control JSON only',inputMode:'PLAIN_TEXT',hostAppDataSource:{workflowDataSource:{includeVariables:true}}}},
    {textParagraph:{text:'No source body, recipient, destination or action fields. The existing owner must verify source, authority, deduplication and exact effect readback. This staged action never authorizes recording.'}}
  ]}]}}]}};
}
function onExecuteControlValidation(event) {
  var out=validateStudioControlInput(event);
  var fields={
    input_valid:AddOnsResponseService.newVariableData().addBooleanValue(out.input_valid),
    record_authorized:AddOnsResponseService.newVariableData().addBooleanValue(false),
    validated_controls_json:AddOnsResponseService.newVariableData().addStringValue(out.validated_controls_json),
    trace_schema_version:AddOnsResponseService.newVariableData().addStringValue(out.trace_schema_version)
  };
  var action=AddOnsResponseService.newReturnOutputVariablesAction().setVariableDataMap(fields);
  return AddOnsResponseService.newRenderActionBuilder().setHostAppAction(AddOnsResponseService.newHostAppAction().setWorkflowAction(action)).build();
}
if (typeof module!=='undefined' && module.exports) module.exports={validateStudioControlInput:validateStudioControlInput};
