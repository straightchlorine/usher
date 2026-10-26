---
title: "Release Usher: version bump, tags and workflow"
description: "How to cut an Usher release: just bump-version, a signed tag on master, and what the release workflow does with the images, the Worker and the GitHub release."
---

# Releasing

The version lives in `frontend/package.json`. The tag must point at a commit that is already on `master`, so bump after the release changes are merged:

```bash
git switch master && git pull
just bump-version v1.0.0-rc.1
git push origin master v1.0.0-rc.1
```

`bump-version` refuses to run unless you are on `master` with an empty index and clean `frontend/package*.json`. It updates `package.json` and the lockfile, commits only those two files (signed) and creates a signed tag.

With a protected `master` and squash merges, either push the bump commit through a pull request and then tag the merged commit (`git tag -s vX.Y.Z <sha>` and `git push origin vX.Y.Z`), or run the bump on `master` after merging.

Use `v1.0.0-rc.1` as the first tag to exercise the pipeline, then `v1.0.0`.

## What the workflow does

Pushing a `vX.Y.Z` (or `vX.Y.Z-rc.N`) tag runs `.github/workflows/release.yml`:

1. runs the full CI,
2. checks the tag is on `master` and matches `package.json`,
3. checks `DOCKERHUB_USERNAME` equals the GitHub owner,
4. builds both images from clean layers for amd64 and arm64, pushes them to GHCR and Docker Hub with provenance and SBOM attestations,
5. signs both registry refs by digest with cosign,
6. creates the GitHub release (marked pre-release when the tag has a suffix),
7. once the images are published, deploys the web Worker (`deploy-web`); every tag, release candidates included, deploys the production Worker.

## Required repository settings

- Environment `docker`, with the variable `DOCKERHUB_USERNAME` (it must equal the GitHub owner) and the secret `DOCKERHUB_TOKEN`.
- Environment `cloudflare`, with the secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `USHER_PROXY_KEY`. See [Deployment](deployment.md).
- Both environments are restricted to the tag pattern `v*`.
