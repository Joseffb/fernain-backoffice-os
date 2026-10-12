# Setup

1. Choose the host application for each component and identify its current source files, destinations, and operator permissions.
2. Make a private configuration copy. Replace the sample identifiers with exact resource bindings and configure credentials through the host application's supported secret store.
3. Review source allowlists, output locations, deduplication keys, reservations, and readback behavior for each adapter. Keep department prompt references separate from application enforcement.
4. Assemble the modules required by the selected workflow in their respective host projects. Preserve module dependencies and source contracts.
5. Use non-production records to check source identity, authorization, hold behavior, retries, and effect readback. Leave external sending disabled until the complete route has passed those checks.

Before an archive-writing Sales route runs, have the owner review and configure every marked private historical-storage binding in the trusted host project. Keep the route at its typed HOLD while any binding is missing or unverified; replacing ordinary Google resource IDs alone does not configure that case. The historical maintenance endpoints in this sample are disabled examples. Use fresh reviewed evidence for future work; old receipts and one-off recovery instructions do not authorize a new operation.

For the portal, provide `portalConfig_()` in the host project and connect the product report reader as `readProductReport_(config, checkedAt)`. Keep the check time explicit so displayed values can be tied to their source read.

The department JSON files are prompt references, not runtime configurations. They contain only the fields present in their source; the Legal reference is shorter than the other examples. Do not infer missing controls or permissions from another department's file.
