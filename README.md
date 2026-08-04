# Quvirl marketing bot v1.1

Duplicate prevention uses three checks:
1. Prospect must still have `status: new`.
2. Normalized email must not exist in any successful `send-log.json` entry.
3. Prospect ID must not exist in any successful log entry.

The same checks run again immediately before SMTP sending. The GitHub workflow uses one concurrency group, preventing overlapping campaign runs. Keep `data/send-log.json` committed because it is the permanent do-not-resend record. Suppressed addresses in `data/suppression.json` are never sent.

Add only reviewed business contacts to `data/prospects.json`, with `eligible: true` and a documented `legalBasis`. Keep the repository private and credentials in GitHub Secrets.
