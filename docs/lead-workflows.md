# Lead workflows

The Sales modules separate candidate discovery, source capture, eligibility checks, preparation, external sending, and archive reconciliation. A candidate's presence in a registry does not establish that it is eligible for contact. Before any send, the application must re-check the current source, recipient, suppression and deduplication state, pacing limits, and operator authority.

Keep research and drafting separate from sending. Use a bounded queue and a distinct review step; preserve a durable send receipt and reconcile uncertain outcomes before considering another attempt. If a source, write, or receipt is incomplete or ambiguous, hold the item for review rather than replaying the action.

For a Studio workflow, keep the existing initial Reconcile step before List. The List action exposes `CANDIDATE_HANDLES`; continue to Capture only when `traceRecorded` is true, `candidate_count` is positive, and `candidate_id` is nonempty. Capture passes its `candidate_id` locator to Prepare, which returns `source_context_json` and `capture_id`. Gemini consumes `source_context_json`; Consume uses `capture_id` with `model_json` and closes the durable receipt. A typed HOLD stops the downstream path. If Consume's effect is uncertain, do not resend; reconcile its existing receipt. Keep all platform action names and scalar mappings aligned with the host descriptors.

Replace sample identities and bindings with verified data in the host environment, and test the full path—including holds and reconciliation—before enabling any external effect.

For archive-writing Sales routes, first obtain owner review of the marked private historical-storage case and configure its exact expected bindings in the trusted host project. The sample must stay at typed HOLD until those bindings are present and verified; substituting Google resource IDs by itself is insufficient. Historical maintenance endpoints remain disabled examples, and old receipts or one-off recovery recipes are not authority for a later run.
