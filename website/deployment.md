---
title: "Self-host Usher on Kubernetes and Cloudflare"
description: "Deploy the Usher API on k3s with Argo CD and sealed secrets, and the web app as a Cloudflare Worker proxy. DNS, database, secrets, GitHub settings and checks."
---

# Deployment

Argo CD reads `k8s/` from `master`. The API runs on a k3s cluster. The SPA is a Cloudflare Worker (`usher-web`) at `https://usher.piotrkrzysztof.dev` that proxies `/api/*` to `https://usher-api.piotrkrzysztof.dev`. The frontend is not deployed to Kubernetes.

This page summarises the runbook in [`k8s/README.md`](https://github.com/straightchlorine/usher/blob/master/k8s/README.md). Replace the host names, the kube context and the namespace with your own. The runbook also covers the maintainer's fleet repo (Argo CD Application, ImageUpdater and Gatus probes), which is not described here.

## 1. DNS

In Cloudflare, create an A record `usher-api` pointing at the node IP of your cluster. Create it DNS only (grey cloud) so cert-manager's HTTP-01 challenge reaches Traefik directly. Once `kubectl -n usher get certificate` shows `usher-api-tls` Ready, switch it to proxied (orange).

Without the record the Worker gets Cloudflare error 1016 (HTTP 530) on `/api`. The `usher` name is created by the Worker's custom domain.

## 2. Database

```bash
kubectl --context hetzner-debian -n databases exec -it postgres-0 -- psql -U postgres
```

```sql
CREATE ROLE usher LOGIN PASSWORD '<pw>';
CREATE DATABASE usher OWNER usher;
```

The API creates its schema on first start (runs the embedded `schema.sql` when `public.events` does not exist).

## 3. Secrets

Generate every random value once and reuse it in the database, seal and `gh` steps (run this block, then step 2 with `$PW`, in the same shell):

```bash
PW=$(openssl rand -base64 24 | tr -d '/+=')   # database password (URL-safe)
ROOT=$(openssl rand -base64 24 | tr -d '/+=')
JWT=$(openssl rand -hex 32)
PROXY=$(openssl rand -hex 32)

/home/zweiss/code/fleet/scripts/seal.sh -c hetzner-debian -n usher -N usher-api \
  -l DATABASE_URL="postgres://usher:$PW@postgres.databases.svc.cluster.local:5432/usher" \
  -l JWT_SECRET="$JWT" \
  -l ROOT_PASSWORD="$ROOT" \
  -l PROXY_SHARED_SECRET="$PROXY" \
  -o k8s/sealed-usher-api.yaml
```

`seal.sh` is the maintainer's sealed-secrets helper from the fleet repo. Any `kubeseal` workflow that produces a SealedSecret `usher-api` with the same four keys works. `-l` lands in shell history; use `-f KEY=PATH` for anything you keep. Commit `k8s/sealed-usher-api.yaml` (it is listed in `kustomization.yaml`; the kustomization does not build until the file exists).

Set the same proxy key as the secret `USHER_PROXY_KEY` in the GitHub `cloudflare` environment:

```bash
gh secret set USHER_PROXY_KEY --env cloudflare --repo straightchlorine/usher --body "$PROXY"
```

The Deployment and the CronJob read `DATABASE_URL`, `JWT_SECRET`, `ROOT_PASSWORD` and `PROXY_SHARED_SECRET` through explicit `secretKeyRef`s (not optional): a missing key fails the pod instead of starting the API without the proxy check. With the key set, the API answers 403 to everything without the `X-Usher-Proxy-Key` header except `GET /api/health` and CORS preflights. The Worker strips any client-sent copy and sets its own. The API logs a WARNING at start if the key is empty.

## 4. GitHub

The environments `docker` and `cloudflare` are restricted to the tag pattern `v*`. Every `v*` tag (including `-rc.N`) also deploys the production Worker.

Image Updater bumps the `api` tag in `k8s/kustomization.yaml` on `master` as `codextech-bot` through `argocd/github-writeback`. The bot is exempt from the master ruleset.

```bash
gh api -X PUT repos/straightchlorine/usher/collaborators/codextech-bot -f permission=push
```

- Accept the invitation from the `codextech-bot` account.
- The credential in `argocd/github-writeback` must have push access to `straightchlorine/usher`. If it is a fine-grained PAT scoped to `honeywatch` only, add this repo to it.

Environment `cloudflare` secrets:

- `CLOUDFLARE_API_TOKEN` with Account: Workers Scripts Edit and Zone (`piotrkrzysztof.dev`): Workers Routes Edit; add Zone DNS Edit if the custom domain step returns 403.
- `CLOUDFLARE_ACCOUNT_ID`.
- `USHER_PROXY_KEY` (step 3).

## 5. First release

On `master`, bump and push with tags (see [Releasing](releasing.md)):

```bash
just bump-version v1.0.0-rc.1
git push origin master --follow-tags
```

The image tag in `kustomization.yaml` already points at it; Image Updater later moves it to the stable `X.Y.Z`.

First Worker deploy: if the wrangler-action secret upload fails because the Worker does not exist yet, run once locally:

```bash
cd frontend && npm run build && npx wrangler deploy && npx wrangler secret put PROXY_SHARED_SECRET
```

Register the Argo CD Application and the ImageUpdater only once the rc images exist, so Argo does not sync against a missing image.

## 6. Checks

```bash
curl -i https://usher-api.piotrkrzysztof.dev/api/health   # 200 {"status":"ok"}
curl -i https://usher-api.piotrkrzysztof.dev/api/events   # 403, no proxy key
curl -i https://usher.piotrkrzysztof.dev/api/events       # 200 via the Worker
kubectl --context hetzner-debian -n usher get pods,cronjob,certificate
```

## Demo reset

CronJob `usher-demo-reset` runs `--reset-demo` daily at 04:00 UTC (after the 03:00 backup): wipes demo data and re-seeds. Run it now with `kubectl --context hetzner-debian -n usher create job --from=cronjob/usher-demo-reset reset-now`.

The reset leaves a few seconds of empty demo data while it re-seeds (accepted). The Job is capped at 15 minutes (`activeDeadlineSeconds: 900`).
