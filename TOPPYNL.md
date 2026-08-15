# toppynl/evidence

Fork of [`evidence-dev/evidence`](https://github.com/evidence-dev/evidence) (MIT).
It exists because upstream has been effectively dormant since February 2026 —
attention moved to the commercial Evidence Studio — while bugs that block our
internal BI reports sit open and untouched.

We carry as little as possible: only fixes we need, kept small enough that merging
upstream back in stays trivial if it ever revives.

## What we changed

| branch / commit                   | what                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fix/unset-input-forever-loading` | Inputs with a `defaultValue` written in markdown never matched a typed value from a query, so the input stayed unset and every query using it froze in a permanent loading state. Upstream [#1479](https://github.com/evidence-dev/evidence/issues/1479), [#2024](https://github.com/evidence-dev/evidence/issues/2024). |

## Publishing

`@evidence-dev` is not our scope, so anything we publish goes to **GitHub Packages**
under `@toppynl`:

| upstream                            | ours                                    |
| ----------------------------------- | --------------------------------------- |
| `@evidence-dev/evidence`            | `@toppynl/evidence`                     |
| `@evidence-dev/core-components`     | `@toppynl/evidence-core-components`     |
| `@evidence-dev/sdk`                 | `@toppynl/evidence-sdk`                 |
| `@evidence-dev/component-utilities` | `@toppynl/evidence-component-utilities` |
| `@evidence-dev/bigquery`            | `@toppynl/evidence-bigquery`            |

Everything else (icons, tailwind, telemetry, universal-sql, preprocess, db-commons,
the other datasources) is **not** forked and keeps resolving from npmjs at the
version upstream published.

The rename is **not committed**. `scripts/toppynl-rescope.mjs` applies it in CI just
before publishing, because committing it would mean renaming every `workspace:*`
cross-reference and every `@evidence-dev/...` import in the source, and then
conflicting with upstream on all of it forever. Cross-references survive the rename
as npm aliases — the dependency key stays `@evidence-dev/sdk`, only its value
becomes `npm:@toppynl/evidence-sdk@<version>` — so the published code finds its
dependencies under the names it imports.

### Cutting a release

1. Land a fix with a changeset (`pnpm changeset`), same as upstream.
2. On merge to `main`, `.github/workflows/toppynl-publish.yml` opens a
   **Version Packages** PR (standard changesets). Merge it when you want a release.
3. Tag it: `git tag toppynl-v<date-or-version> && git push --tags`. That runs the
   publish job: install (which builds), rescope, `pnpm publish` the five packages in
   dependency order to `npm.pkg.github.com`.

Auth is the built-in `GITHUB_TOKEN`; no secrets to provision. A manual
`workflow_dispatch` run defaults to `dry_run: true`, which only packs the tarballs
so you can inspect them.

### Consuming the packages

In the consuming repo's `.npmrc`:

```
@toppynl:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

and depend on `@toppynl/evidence*` instead of `@evidence-dev/*`. Note that the
Evidence CLI discovers datasource and component plugins by package name, so
`evidence.config.yaml` and any `connection.yaml` referencing `@evidence-dev/bigquery`
need updating to the `@toppynl` name at the same time.

Until then, `data-reports-project` consumes the same fix as a `pnpm patch` on top of
the published `@evidence-dev` packages — see `patches/README.md` there.
