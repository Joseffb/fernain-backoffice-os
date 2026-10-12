# Drive system

The source set uses Drive and Workspace documents as input and review surfaces. The owner-mail and department components separate source reading from review and later effects. Configure exact folders, files, tabs, and permissions in a trusted local environment; the sample registry deliberately contains no live bindings.

Use a clear layout for each installation. For example:

```text
Backoffice/
  Shared Inbox/
  Departments/
    Finance/
    Legal/
    Marketing/
    Fundraising/
    Engineering/
  Review Queue/
  Approved Outputs/
  Archive/
```

Keep source material, review drafts, approved outputs, and archived records in separate locations. Define an allowlist for each reader and writer. Verify exact file identity, version, and content before using a source; verify the destination and read back any effect that the application records.

The sample registry is a shape reference for producers, authorities, matters, and recipient policies. It grants no access and includes no operational entries. Populate it only after the host application can authenticate the operator and verify the exact bindings. Where an adapter supports compare-and-set or reservation checks, preserve those checks and validate the resulting state from the authoritative destination.

Finance and Legal review modules consume structured source and decision evidence. A prompt or registry entry does not itself establish legal, financial, or sending authority. Route decisions to the appropriate owner and retain the source and review references required by the local workflow.
