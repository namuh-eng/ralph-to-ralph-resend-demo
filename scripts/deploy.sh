#!/usr/bin/env bash
# ABOUTME: Build, push, and redeploy opensend on AWS ECS Fargate.
# ABOUTME: Idempotent. Run anytime to ship the current branch to prod.
#
# Usage:
#   bash scripts/deploy.sh                  # both app and ingester
#   bash scripts/deploy.sh app              # just the app
#   bash scripts/deploy.sh ingester         # just the ingester
#
# Requires: docker (with buildx), aws CLI, AWS creds with ECR + ECS permissions.
# Assumes infra has been bootstrapped (see scripts/aws-bootstrap.sh).

set -euo pipefail
cd "$(dirname "$0")/.."

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"
if [[ -z "${AWS_ACCOUNT_ID:-}" ]]; then
  echo "AWS_ACCOUNT_ID not set and 'aws sts get-caller-identity' failed." >&2
  echo "Run 'aws configure' or export AWS_ACCOUNT_ID." >&2
  exit 1
fi
PRODUCT="${PRODUCT:-opensend}"
CLUSTER="${ECS_CLUSTER:-namuh}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

APP_REPO="${PRODUCT}-app"
APP_SERVICE="${PRODUCT}-app"
APP_DOCKERFILE="${APP_DOCKERFILE:-Dockerfile}"
APP_TARGET="${APP_TARGET:-runner}"

ING_REPO="${PRODUCT}-ingester"
ING_SERVICE="${PRODUCT}-ingester"
ING_DOCKERFILE="${ING_DOCKERFILE:-packages/ingester/Dockerfile}"

color() { printf "\033[1;%sm%s\033[0m\n" "$1" "$2"; }
info()  { color 36 "$*"; }
ok()    { color 32 "$*"; }
warn()  { color 33 "$*"; }
err()   { color 31 "$*" >&2; }

ecr_login() {
  info "→ ECR login (${AWS_REGION})"
  aws ecr get-login-password --region "${AWS_REGION}" \
    | docker login --username AWS --password-stdin "${ECR_BASE}" >/dev/null
  ok "  logged in"
}

build_and_push() {
  local repo="$1" dockerfile="$2" target="${3:-}"
  local image="${ECR_BASE}/${repo}:${IMAGE_TAG}"

  info "→ Build & push ${repo}"
  echo "  image:      ${image}"
  echo "  dockerfile: ${dockerfile}"
  echo "  platform:   ${PLATFORM}"
  [[ -n "${target}" ]] && echo "  target:     ${target}"

  local args=(buildx build --platform "${PLATFORM}" -f "${dockerfile}" -t "${image}" --push)
  [[ -n "${target}" ]] && args+=(--target "${target}")
  args+=(.)

  docker "${args[@]}"
  ok "  pushed ${image}"
}

redeploy() {
  local service="$1"
  info "→ Force redeploy ECS service: ${service}"
  aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${service}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    --query 'service.deployments[0].{status:status,desired:desiredCount}' \
    --output table
}

wait_stable() {
  local service="$1"
  info "→ Wait for ${service} to stabilize (this can take a few minutes)"
  if aws ecs wait services-stable \
    --cluster "${CLUSTER}" \
    --services "${service}" \
    --region "${AWS_REGION}"; then
    ok "  ${service} is stable"
  else
    err "  ${service} did not stabilize. Recent events:"
    aws ecs describe-services \
      --cluster "${CLUSTER}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query 'services[0].events[0:5].message' \
      --output table || true
    return 1
  fi
}

deploy_app() {
  build_and_push "${APP_REPO}" "${APP_DOCKERFILE}" "${APP_TARGET}"
  redeploy "${APP_SERVICE}"
}

deploy_ingester() {
  build_and_push "${ING_REPO}" "${ING_DOCKERFILE}" ""
  redeploy "${ING_SERVICE}"
}

target="${1:-all}"

ecr_login

case "${target}" in
  app)
    deploy_app
    wait_stable "${APP_SERVICE}"
    ;;
  ingester)
    deploy_ingester
    wait_stable "${ING_SERVICE}"
    ;;
  all)
    deploy_app
    deploy_ingester
    wait_stable "${APP_SERVICE}" &
    APP_PID=$!
    wait_stable "${ING_SERVICE}" &
    ING_PID=$!
    APP_RC=0; ING_RC=0
    wait "${APP_PID}" || APP_RC=$?
    wait "${ING_PID}" || ING_RC=$?
    if [[ "${APP_RC}" -ne 0 || "${ING_RC}" -ne 0 ]]; then
      err "One or more services failed to stabilize."
      exit 1
    fi
    ;;
  *)
    err "Unknown target: ${target} (expected: app | ingester | all)"
    exit 2
    ;;
esac

ok "✓ Deploy complete: ${PRODUCT} (${target})"
echo
echo "App:      https://${PRODUCT}.namuh.co"
echo "API:      https://api.${PRODUCT}.namuh.co"
echo "Events:   https://events.${PRODUCT}.namuh.co"
