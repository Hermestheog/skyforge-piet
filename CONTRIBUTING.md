# Contributing

Start with [the model contract](docs/TRACKING.md) and [the development history](docs/DEVELOPMENT-LOG.md).
This project treats the actual Piet PNG as the executable program. A text
assembler change is not verified until the generated image runs in npiet.

For a numerical bug, record:

1. The exact whitespace-separated input and PNG SHA-256.
2. Interpreter version/build and the output you observed.
3. Expected values and their units/source; distinguish two-body and SGP4 models.
4. A failing PNG-level test, followed by the fix and passing result.
5. Any rejected hypotheses or unusual interpreter behavior worth preserving.

Run `npm test` sequentially with npiet on PATH, or use the Docker command in
README. Logs are written under `logs/runs/` even when a suite fails. Commit
relevant run logs and append a concise finding to the development log.
Archive large useful traces with `scripts/archive-trace.mjs`; raw live tracking
traces are ignored to keep routine commits small. GitHub Actions artifacts
expire after 90 days, so significant evidence should be committed permanently.

Keep the original circular program and regression fixtures intact. Add new
tracking tests instead of replacing the original checks. Document any numerical
contract change and why it is needed. The next major goal is verified SGP4;
passing a circular or two-body test does not establish SGP4 correctness.
