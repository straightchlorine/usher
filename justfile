# list recipes
default:
    @just --list

# bump frontend/package.json, commit and create a signed tag, e.g. just bump-version v1.0.0
bump-version version:
    #!/usr/bin/env bash
    set -euo pipefail
    version="{{ version }}"
    if ! [[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
        echo "version must look like vX.Y.Z or vX.Y.Z-rc.N, got: $version" >&2
        exit 1
    fi
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if [ "$branch" != "master" ]; then
        echo "must be on master (currently on $branch)" >&2
        exit 1
    fi
    if ! git diff --cached --quiet; then
        echo "the index has staged changes; commit or unstage them first" >&2
        exit 1
    fi
    if ! git diff --quiet -- frontend/package.json frontend/package-lock.json; then
        echo "frontend/package.json or package-lock.json has uncommitted changes" >&2
        exit 1
    fi
    before="$(jq -r .version frontend/package.json)"
    if [ "$before" = "${version#v}" ]; then
        echo "frontend/package.json is already at ${version#v}; nothing to bump" >&2
        exit 1
    fi
    (cd frontend && npm version "${version#v}" --no-git-tag-version)
    after="$(jq -r .version frontend/package.json)"
    if [ "$after" = "$before" ]; then
        echo "npm version left the version unchanged ($before)" >&2
        exit 1
    fi
    git add frontend/package.json frontend/package-lock.json
    git commit -S -m "chore(version): bump to $version" -- frontend/package.json frontend/package-lock.json
    git tag -a "$version" -s -m "$version"
    echo
    echo "Tagged $version. Publish with:"
    echo "  git push origin master --follow-tags"

# vet the backend and run the frontend tests
test:
    go vet ./...
    cd frontend && CI=true npm test -- --watchAll=false

# build both images for the local platform
images:
    docker buildx build --load -t usher-api:local -f Dockerfile .
    docker buildx build --load -t usher-web:local -f frontend/Dockerfile frontend

# start the compose stack
up:
    docker compose up -d --build

# stop the compose stack
down:
    docker compose down
