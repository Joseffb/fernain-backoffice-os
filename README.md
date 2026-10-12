# Automated Backoffice for Google Workspace

Source components for owner and shared-mail intake, Finance and Legal review, department preparation, Sales source and archive workflows, and a read-only portal. Use the setup notes to assemble the selected components in their intended host projects.

Start with [the Drive system](docs/drive-system.md), [setup notes](docs/setup.md), and the [department prompt references](docs/department-gems.md). The [Sales workflow notes](docs/lead-workflows.md) describe the separate research, review, send, and reconciliation boundaries. [Portal notes](docs/portal.md) identify the source interfaces that need local wiring.

The `config/registry.sample.json` file contains no operational authority. Replace placeholders only in a trusted local copy, and verify source identity, permissions, review requirements, deduplication, and effect readback for each integration. Department prompts guide responses; application code and host permissions must enforce every operational boundary. Keep external sending disabled until the complete workflow and reconciliation path have been validated in the intended environment.

The folders contain source from several existing components:

- `owner-mail/` contains intake, parent adapters, and canonical templates.
- `finance/` and `legal/` contain review and source-binding modules.
- `preparation/` contains shared preparation adapters.
- `cloud/` contains Workspace orchestration helpers.
- `sales/` contains Apps Script modules for source capture, archive handling, and workflow integration.
- `portal/` contains extracted portal pages and Apps Script source.
- `department-prompts/` contains selected prompt-reference fields from department configuration files.

Configure each application against its own current source contracts. The examples use inert identifiers and sample labels; they do not identify production resources.
