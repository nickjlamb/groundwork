# Security policy

## Reporting

Please report vulnerabilities privately to **nickjlamb@gmail.com** rather than opening a public issue. You'll get an acknowledgement within a few days.

## What counts as high-severity here

The most serious class of bug in this project is a **redaction bypass**: any input where the scaffolded pre-step claims text is safe but an identifier survives in the output. If you find one, please include the (synthetic, never real) input text that reproduces it.

Also in scope: anything that makes `check` report a pass it shouldn't (a gate that doesn't gate), and dependency vulnerabilities with a plausible path to exploitation through the CLI.

## Honest scope note

Groundwork's redaction pre-step is deterministic and keyword-anchored by design. Its documented limitation — it will not catch free-prose names — is not a vulnerability; a synthetic input that defeats the *documented* patterns is.
