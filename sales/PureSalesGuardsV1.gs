"use strict";
/*
 * Bounded successor to historical sales_0404_send_helper.js. No top-level effects.
 * The existing canonical Gmail/Sheets writer calls this once with an independently
 * loaded parent preflight key. A Gem proposal never supplies authority or evidence.
 * Journal begin must atomically create a stable per-lead pending record and fsync.
 * Journal append must append/fsync before acknowledging {durable:true,ref}.
 * Unknown outcome means KEEP pending, no resend, no fallback effects.
 */
const FERN_SALES_ID = "{{CONFIGURE_GOOGLE_ID_030}}";
const FERN_PROSPECTS_SHEET = 901;
const FERN_EVIDENCE_SHEET = 903;
const FERN_FROM = "Backoffice Backoffice Owner <operator@example.com>";
const FERN_FIRST_INTRO_COPY_REVISION = "first-introduction-20261013T193329Z";
const FERN_FRESH_MS = 300000;
const FERN_PROVIDER_LIMITS = Object.freeze({
  messages24: 500, externalUnique24: 500, apiRecipientsPerMessage: 500,
  recipients24: 10000, externalRecipients24: 3000, uniqueRecipients24: 3000
});
const FERN_COVERAGE = Object.freeze([
  "canonicalProspects", "canonicalEvidence", "gmailHistory", "accountSent",
  "suppression", "organizationHistory", "familyHistory", "reservations"
]);
function fernHold(condition, reason) {
  if (!condition) {
    const error = new Error("HOLD: " + reason);
    error.code = "CURRENT_SALES_VALIDATION_HOLD";
    throw error;
  }
}
function fernSame(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function fernEmail(value) {
  fernHold(typeof value === "string" && value === value.trim(), "exact email required");
  const parts = value.split("@");
  fernHold(parts.length === 2 &&
    /^[A-Za-z0-9.!#$%&'*+\/=?^_\x60{|}~-]+$/.test(parts[0]) &&
    parts[0].length <= 64 && !/^\./.test(parts[0]) &&
    !/\.$/.test(parts[0]) && !/\.\./.test(parts[0]) &&
    /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(parts[1]),
    "single individual email required; no guessed or multi-recipient route");
  return parts[0] + "@" + parts[1].toLowerCase();
}
function fernRow(row, length) {
  fernHold(Array.isArray(row) && row.length <= length, "complete bounded row required");
  return Array.from({length}, (_, i) => row[i] == null ? "" : row[i]);
}
function fernFresh(record, now, what) {
  fernHold(record && typeof record.ref === "string" && record.ref.length > 0,
    what + " authoritative reference missing");
  const checked = Date.parse(record.checkedAt);
  fernHold(Number.isFinite(checked) && checked <= now + 5000 &&
    now - checked <= FERN_FRESH_MS, what + " freshness unknown or expired");
}
function fernCount(value, what) {
  fernHold(Number.isSafeInteger(value) && value >= 0, what + " usage/reservation unknown");
  return value;
}
function fernBinding(candidate) {
  const binding = {
    row:candidate.row, leadId:candidate.leadId, product:candidate.product,
    to:fernEmail(candidate.to), name:candidate.name, first:candidate.first,
    company:candidate.company, role:candidate.role,
    organizationKey:candidate.organizationKey, subject:candidate.subject,
    observation:candidate.observation, sourceRefs:candidate.sourceRefs
  };
  if (Object.prototype.hasOwnProperty.call(candidate, "copyRevision")) {
    fernHold(candidate.copyRevision === FERN_FIRST_INTRO_COPY_REVISION,
      "unknown introductory copy revision");
    fernHold(candidate.verifiedWorkflowHeading === "Jobs Board" ||
      candidate.verifiedWorkflowHeading === "Job Search",
      "independently verified workflow heading required");
    binding.copyRevision = FERN_FIRST_INTRO_COPY_REVISION;
    binding.verifiedWorkflowHeading = candidate.verifiedWorkflowHeading;
  }
  return binding;
}
function fernFirstIntroductionSubject(candidate) {
  fernHold(candidate && candidate.copyRevision === FERN_FIRST_INTRO_COPY_REVISION,
    "explicit current introductory copy revision required");
  fernHold(typeof candidate.company === "string" && candidate.company.length > 0 &&
    candidate.company === candidate.company.trim() &&
    !/[\x00-\x1f\x7f\u0085\u2028\u2029<>]/.test(candidate.company),
    "verified organization name required for introductory subject");
  return candidate.company + " — Could you share your experience?";
}
function fernFirstIntroductionFeature(candidate) {
  fernHold(candidate && typeof candidate.company === "string" &&
    candidate.company.length > 0 && candidate.company === candidate.company.trim() &&
    !/[\x00-\x1f\x7f\u0085\u2028\u2029<>]/.test(candidate.company),
    "verified organization name required for introductory observation");
  const observation = candidate.observation;
  const prefix = "I noticed ";
  const separator = "’s website provides a public ";
  fernHold(typeof observation === "string" && observation.indexOf(prefix) === 0 &&
    observation.charAt(observation.length - 1) === ".",
    "primary-source observation does not match the verified feature form");
  const separatorAt = observation.indexOf(separator, prefix.length);
  fernHold(separatorAt > prefix.length &&
    separatorAt === observation.lastIndexOf(separator),
    "primary-source observation does not match the verified feature form");
  const label = observation.slice(prefix.length, separatorAt);
  const feature = observation.slice(separatorAt + separator.length, -1);
  fernHold(label.length > 0 && label.length <= 120 && label === label.trim() &&
    !/[\x00-\x1f\x7f\u0085\u2028\u2029<>.!?]/.test(label),
    "primary-source observation label is empty, ambiguous, or outside the bounded form");
  fernHold(feature.length > 0 && feature.length <= 120 && feature === feature.trim() &&
    !/[\x00-\x1f\x7f\u0085\u2028\u2029<>.!?]/.test(feature),
    "verified feature is empty, ambiguous, or outside the bounded single-line form");
  fernHold((candidate.verifiedWorkflowHeading === "Jobs Board" ||
    candidate.verifiedWorkflowHeading === "Job Search") &&
    feature === candidate.verifiedWorkflowHeading + " page",
    "observed feature does not match the independently verified workflow heading");
  return feature;
}
function renderCurrentSalesBody(candidate) {
  if (Object.prototype.hasOwnProperty.call(candidate, "copyRevision")) {
    fernHold(candidate.copyRevision === FERN_FIRST_INTRO_COPY_REVISION,
      "unknown introductory copy revision");
    const feature = fernFirstIntroductionFeature(candidate);
    return "Hi " + candidate.first + ",\n\n" +
      "I'm Fernáin, founder of Fernain. After nine years developing technology at a national membership organization, I'm now building tools specifically for membership organizations, associations, and publishers.\n\n" +
      "But one organization's experience isn't everyone's, and I don't want to assume I know what others need.\n\n" +
      "I noticed " + candidate.company + " uses " + feature + ". We're developing similar infrastructure and would value your perspective on what's working and what's frustrating.\n\n" +
      "Would you be open to sharing one thing you'd change about your current system?\n\n" +
      "Your insights would help shape what we're building.\n\n" +
      "Thanks,\nFernáin Joseff Betancourt\nFounder, Fernain LLC\nhttps://fernain.com";
  }
  return "Hi " + candidate.first + ",\n\n" +
    "I’m Backoffice, founder of Backoffice. We’re building Jobs, a career-board product for membership organizations, associations and publishers.\n\n" +
    candidate.observation + " How is that service working for your team and members? I’d be interested in what you’d keep and what you’d change.\n\n" +
    "Would you be open to a brief conversation? If someone else handles the board, I’d appreciate a pointer to the right person.\n\n" +
    "Thanks,\nBackoffice Backoffice Owner\nFounder, Example Organization\nhttps://example.com";
}
function validateCurrentSalesPreflight(packet, now) {
  fernHold(packet && packet.schema === "BackofficeCurrentSalesPreflight/v1", "trusted packet missing");
  fernHold(packet.provenance && packet.provenance.kind === "parent-provider-readback" &&
    packet.provenance.modelAuthority === false && packet.provenance.ref, "independent trust boundary missing");
  fernHold(typeof packet.packetId === "string" && packet.packetId.length > 0, "packet identity missing");
  fernFresh(packet, now, "preflight");
  fernFresh(packet.account, now, "connected Gmail account and label binding");
  fernHold(packet.account.complete === true &&
    packet.account.address === "operator@example.com" && packet.account.labelId === "Label_5",
    "exact connected Gmail account/Label_5 binding required");
  const candidate = packet.binding;
  fernHold(candidate && candidate.copyRevision === FERN_FIRST_INTRO_COPY_REVISION,
    "explicit current introductory copy revision required");
  fernHold(candidate && Number.isSafeInteger(candidate.row) && candidate.row > 1 &&
    /^[A-Za-z0-9_-]+$/.test(candidate.leadId || "") &&
    candidate.product === "Jobs" && candidate.recipientKind === "named-individual",
    "exact Product AA/LeadID/individual binding required");
  for (const key of ["name","first","company","role","organizationKey","subject","observation"])
    fernHold(typeof candidate[key] === "string" && candidate[key].trim().length > 0,
      "trusted " + key + " missing");
  fernHold(!/[\r\n]/.test(candidate.subject) && !/[\r\n]/.test(candidate.first),
    "header/greeting injection");
  fernHold(candidate.subject === fernFirstIntroductionSubject(candidate),
    "exact owner-approved introductory subject required");
  fernHold(Array.isArray(candidate.sourceRefs) && candidate.sourceRefs.length > 0 &&
    candidate.sourceRefs.every(ref => typeof ref === "string" && /^https:\/\//.test(ref)),
    "exact independently verified source required");
  fernFresh(packet.source, now, "individual route and observation source");
  const binding = fernBinding(candidate), body = renderCurrentSalesBody(candidate);
  fernHold(fernSame(packet.source.binding, binding) && packet.source.clear === true &&
    packet.source.complete === true, "current route/source/observation mismatch");
  fernHold(packet.owner && packet.owner.effectScopeRef &&
    fernSame(packet.owner.binding, binding) && packet.owner.body === body &&
    fernSame(packet.owner.allowedEffects, ["send-one-initial","message-Label_5","canonical-L-R:Y-EvidenceA:G"]),
    "exact owner effect scope missing or changed");
  fernHold(packet.mode === "SEND" && packet.scheduleActivation === false &&
    packet.catchUp === false, "bounded current SEND mode required");
  fernHold(packet.canonical && packet.canonical.spreadsheetId === FERN_SALES_ID &&
    packet.canonical.prospectsSheetId === FERN_PROSPECTS_SHEET &&
    packet.canonical.evidenceSheetId === FERN_EVIDENCE_SHEET &&
    packet.canonical.rowRenderOption === "FORMULA" &&
    Number.isSafeInteger(packet.canonical.evidenceRow) && packet.canonical.evidenceRow > 1,
    "canonical destination binding missing");
  const row = fernRow(packet.canonical.rowAtoAA, 27);
  fernHold(row[14] === candidate.leadId && row[1] === candidate.company &&
    row[26] === candidate.product && row[11] === "Qualified - not contacted" &&
    row.slice(17,23).every(value => value === ""), "live canonical row not eligible");
  fernHold(typeof packet.canonical.contactCell === "string" &&
    row.includes(packet.canonical.contactCell), "exact canonical contact cell missing");
  const contact = packet.canonical.contactCell.split(/\r?\n/);
  fernHold(contact.includes(candidate.name) && contact.includes(candidate.role) &&
    contact.some(value => {
      try { return fernEmail(value) === binding.to; } catch (_) { return false; }
    }), "canonical individual route does not match current trusted source");
  for (const key of FERN_COVERAGE) {
    const check = packet.checks && packet.checks[key];
    fernFresh(check, now, key);
    fernHold(check.complete === true && check.clear === true &&
      fernSame(check.binding, binding), key + " coverage/conflict/unknown");
  }
  const usage = packet.usage;
  fernHold(usage && usage.complete === true && usage.unknownUsage === false,
    "complete account/automation usage required");
  fernFresh(usage, now, "usage");
  fernHold(usage.accountAddress === packet.account.address,
    "usage belongs to a different or unknown account");
  const campaign = fernCount(usage.campaign60,"campaign60") +
    fernCount(usage.reservedCampaign60,"reservedCampaign60");
  const account = fernCount(usage.totalAccount24,"totalAccount24") +
    fernCount(usage.reservedAccount24,"reservedAccount24");
  const automation = fernCount(usage.automation24,"automation24") +
    fernCount(usage.unknownAutomation24,"unknownAutomation24") +
    fernCount(usage.reservedAutomation24,"reservedAutomation24");
  fernHold(usage.campaign60 <= usage.totalAccount24 &&
    usage.automation24 + usage.unknownAutomation24 <= usage.totalAccount24,
    "campaign/automation/unknown usage inconsistent with complete account coverage");
  fernHold(campaign + 1 <= 20 && account + 1 <= 400 && automation + 1 <= 360,
    "campaign/account/automation rolling quota");
  fernHold(Array.isArray(usage.accountSentIds) &&
    usage.accountSentIds.every(id => typeof id === "string" && id.length > 0) &&
    new Set(usage.accountSentIds).size === usage.accountSentIds.length &&
    usage.accountSentIds.length <= usage.totalAccount24, "complete SENT reconciliation ids required");
  fernHold(packet.provider && packet.provider.complete === true &&
    packet.provider.tier === "trial-or-conservative", "provider tier/coverage unknown");
  fernFresh(packet.provider, now, "provider limits and usage");
  fernHold(packet.provider.accountAddress === packet.account.address,
    "provider usage belongs to a different or unknown account");
  for (const [name, limit] of Object.entries(FERN_PROVIDER_LIMITS)) {
    const dimension = packet.provider.dimensions && packet.provider.dimensions[name];
    fernHold(dimension && dimension.applicable === true && dimension.limit === limit &&
      dimension.complete === true, name + " applicable provider coverage unknown");
    const used = fernCount(dimension.used,name + ".used");
    const reserved = fernCount(dimension.reserved,name + ".reserved");
    fernHold(dimension.increment === 1 && used + reserved + 1 <= Math.floor(limit * 0.8),
      name + " provider 20% headroom");
  }
  for (const [name, dimension] of Object.entries(packet.provider.dimensions)) {
    fernHold(dimension && typeof dimension.applicable === "boolean",
      name + " applicability unknown");
    if (!dimension.applicable || Object.hasOwn(FERN_PROVIDER_LIMITS,name)) continue;
    fernHold(dimension.complete === true && Number.isSafeInteger(dimension.limit) &&
      dimension.limit > 0 && dimension.increment === 1 &&
      fernCount(dimension.used,name + ".used") +
      fernCount(dimension.reserved,name + ".reserved") + 1 <= Math.floor(dimension.limit * 0.8),
      name + " additional applicable provider headroom unknown");
  }
  fernHold(packet.provider.dimensions.messages24.used >= usage.totalAccount24,
    "provider account message usage inconsistent");
  return {candidate:Object.assign({}, candidate, {to:binding.to}), binding, body, row,
    campaign, account, automation};
}
function validateCurrentSalesClaim(claim, packet, now) {
  fernFresh(claim, now, "active sole-writer claim");
  fernHold(claim.status === "ACTIVE" && claim.complete === true &&
    claim.writerId === packet.claim.writerId && claim.id === packet.claim.id &&
    claim.packetId === packet.packetId && claim.writerType === "existing-canonical-sole-writer" &&
    Date.parse(claim.leaseUntil) > now &&
    fernSame(claim.binding, fernBinding(packet.binding)) &&
    claim.ownerEffectScopeRef === packet.owner.effectScopeRef,
    "active single-writer claim readback mismatch");
}
function validateCurrentSalesProposal(proposal, prepared) {
  fernHold(proposal && typeof proposal === "object", "advisory proposal missing");
  fernHold(proposal.copyRevision === FERN_FIRST_INTRO_COPY_REVISION &&
    prepared && prepared.binding &&
    prepared.binding.copyRevision === FERN_FIRST_INTRO_COPY_REVISION,
    "explicit current introductory copy revision required");
  const allowed = new Set(["row","leadId","product","to","name","first","company","role",
    "organizationKey","subject","observation","sourceRefs","copyRevision",
    "verifiedWorkflowHeading","body"]);
  fernHold(Object.keys(proposal).every(key => allowed.has(key)), "proposal contains extra effects/authority");
  const binding = Object.assign({}, proposal);
  delete binding.body;
  fernHold(fernSame(fernBinding(binding), prepared.binding) &&
    proposal.body === prepared.body, "Gem proposal differs from independently approved exact content/source/route");
}
function fernHeader(message, name) {
  const headers = message.payload && message.payload.headers;
  fernHold(Array.isArray(headers), "full receipt headers missing");
  const found = headers.filter(header => String(header.name).toLowerCase() === name);
  fernHold(found.length <= 1, "duplicate " + name + " header");
  return found[0] ? String(found[0].value) : "";
}
function fernSingleHeaderEmail(value) {
  const match = value.match(/^(?:[^<>,\r\n]*<([^<>,\r\n]+)>|([^<>,\r\n]+))$/);
  fernHold(match, "single receipt recipient required");
  return fernEmail((match[1] || match[2]).trim());
}
function verifyCurrentSalesReceipt(result, prepared, sentId, now) {
  fernHold(result && !result.isError && result.structuredContent, "native send receipt unavailable");
  const message = result.structuredContent;
  fernHold(message.id === sentId && typeof message.thread_id === "string" &&
    message.thread_id.length > 0 && Array.isArray(message.label_ids) &&
    message.label_ids.includes("SENT") &&
    message.payload && message.payload.mime_type === "text/plain" &&
    message.payload.body && message.payload.body.content === prepared.body &&
    (!message.payload.parts || message.payload.parts.length === 0) &&
    !message.payload.filename && !message.payload.body.attachment_id,
    "exact native body/MIME/SENT/identity mismatch");
  fernHold(fernSingleHeaderEmail(fernHeader(message,"to")) === prepared.binding.to &&
    fernSingleHeaderEmail(fernHeader(message,"from")) === "operator@example.com" &&
    fernHeader(message,"subject") === prepared.binding.subject &&
    fernHeader(message,"cc") === "" && fernHeader(message,"bcc") === "",
    "exact native recipient/from/subject or unexpected CC/BCC");
  const sentAt = Number(message.internal_date);
  fernHold(Number.isFinite(sentAt) && sentAt > now - FERN_FRESH_MS && sentAt <= now + 5000,
    "native send timestamp unavailable or stale");
  return message;
}
function fernCellRequest(sheetId, row, column, values) {
  return {updateCells:{range:{sheetId,startRowIndex:row-1,endRowIndex:row,
    startColumnIndex:column-1,endColumnIndex:column-1+values.length},
    rows:[{values:values.map(value => ({userEnteredValue:{stringValue:String(value)}}))}],
    fields:"userEnteredValue"}};
}
function renderCurrentSalesLog(prepared, packet, message, now) {
  const utc = new Date(Number(message.internal_date)).toISOString();
  const checkedAt = new Date(now).toISOString();
  const date = new Date(Number(message.internal_date)).toLocaleDateString("en-US",
    {timeZone:"UTC",month:"short",day:"numeric",year:"numeric"});
  const candidate = prepared.candidate;
  const values = [date,"operator@example.com",candidate.to,utc,message.id,message.thread_id,
    "Initial introduction sent; await organic reply, no automatic follow-up.",checkedAt];
  const evidence = [candidate.leadId,candidate.company,
    "Initial introduction / current single integration test / exact receipt",
    "Packet " + packet.packetId + ". Owner effect scope " + packet.owner.effectScopeRef +
    ". Active sole writer " + packet.claim.id + " / " + packet.claim.writerId +
    ". Current Product AA " + candidate.product + "; exact named individual " + candidate.name +
    " / " + candidate.role + " / " + candidate.to + ". Sources: " +
    candidate.sourceRefs.join(" ; ") + ". Complete canonical/Gmail/suppression/organization/family/reservation checks. " +
    prepared.campaign + " prior campaign/reserved rolling60; " + prepared.account +
    " account/reserved rolling24; " + prepared.automation +
    " automation/unknown/reserved rolling24; provider message/recipient 20% headroom verified. UTC " +
    utc + "; message " + message.id + "; thread " + message.thread_id +
    ". Exact body/recipient/subject/SENT and message Label_5 with other labels/read state preserved. " +
    "One attempt; no schedule activation, catch-up, CC/BCC, attachments or automatic follow-up. Subject: " +
    candidate.subject + ". Body:\n" + prepared.body,
    "Exact SENT","https://mail.google.com/mail/u/?authuser=operator%40example.com#all/" + message.id,date];
  return {values,evidence,args:{spreadsheet_id:FERN_SALES_ID,requests:[
    fernCellRequest(FERN_PROSPECTS_SHEET,candidate.row,12,["Sent"]),
    fernCellRequest(FERN_PROSPECTS_SHEET,candidate.row,18,values),
    fernCellRequest(FERN_EVIDENCE_SHEET,packet.canonical.evidenceRow,1,evidence)]}};
}
