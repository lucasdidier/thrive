# Email provider data

`public/free-email-domains.js` contains a bundled snapshot of the MIT-licensed
[Kikobeats/free-email-domains](https://github.com/Kikobeats/free-email-domains)
`domains.json`, retrieved 2026-10-19 (32,573 entries). License is retained in
`free-email-domains-LICENSE.md`. It includes free/public and disposable providers.

The client importer performs exact, case-insensitive domain membership checks.
No email address or domain is sent to the provider. Classification is a suggestion,
not identity verification. Explicit client type always overrides it.

Refresh by downloading upstream `domains.json` and its license, validating that it
is an array of domain strings, then regenerating the Set in the JS module. Update
the retrieval date/count here and run the importer tests. The snapshot is not
updated at runtime. Company names use a basic domain-label heuristic, including
common country-code second-level suffixes; they are always editable in preview.
