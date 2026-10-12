# Portal

The portal source includes extracted Apps Script and HTML pages for a read-only department dashboard. The sample project labels are fictional, and the sheet identifiers and ranges are inert examples. Replace them with exact, authorized source bindings in the host project.

Wire `portalConfig_()` in the host project and call the product report reader with both its product configuration and check time: `readProductReport_(config, checkedAt)`. Verify that each dashboard value stays tied to its source and that missing or invalid inputs are shown as unavailable.

The Finance reader uses `Company Overview` and `Credits and Benefits`. It marks historical cash and unreconciled revenue, cost, and runway as needing verification, while displaying provider credits separately as noncash with their reported source dates and any recorded expiry. Review evidence status and budget treatment in the underlying source before using a credit for planning; reconcile periods before presenting totals.

The pages alone do not establish access control or data freshness. Configure caller authorization and source permissions in the host project, review the output for unintended personal or confidential data, and keep the dashboard read-only.
