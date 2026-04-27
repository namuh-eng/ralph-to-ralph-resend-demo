#!/bin/bash
# ABOUTME: Deploy script for AWS App Runner via ECR
# ABOUTME: Builds Docker image, pushes to ECR, creates/updates App Runner service

set -euo pipefail
cd "$(dirname "$0")/.."

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="699486076867"
IMAGE_TAG="${1:-latest}"

APP_ECR_REPO="${APP_ECR_REPO:-resend-clone}"
APP_RUNNER_SERVICE="${APP_RUNNER_SERVICE:-resend-clone}"
APP_DOCKERFILE="${APP_DOCKERFILE:-Dockerfile}"
APP_PORT="${APP_PORT:-8080}"

INGESTER_ECR_REPO="${INGESTER_ECR_REPO:-${APP_ECR_REPO}-ingester}"
INGESTER_APP_RUNNER_SERVICE="${INGESTER_APP_RUNNER_SERVICE:-namuh-ingester}"
INGESTER_DOCKERFILE="${INGESTER_DOCKERFILE:-packages/ingester/Dockerfile}"
INGESTER_PORT="${INGESTER_PORT:-3016}"

function ecr_uri() {
  local repo="$1"
  echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${repo}"
}

function build_create_source_configuration() {
  local image_identifier="$1"
  local port="$2"
  cat <<JSON
{
  "AuthenticationConfiguration": {
    "AccessRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerECRAccessRole"
  },
  "ImageRepository": {
    "ImageIdentifier": "${image_identifier}",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "${port}",
      "RuntimeEnvironmentVariables": {
        "HOST": "0.0.0.0",
        "NODE_ENV": "production",
        "PORT": "${port}"
      }
    }
  }
}
JSON
}

INSTANCE_CONFIGURATION=$(cat <<'JSON'
{
  "Cpu": "1024",
  "Memory": "2048"
}
JSON
)

function require_ecr_repository() {
  local repo="$1"
  if ! aws ecr describe-repositories \
    --region "${AWS_REGION}" \
    --repository-names "${repo}" \
    >/dev/null 2>&1; then
    echo "Missing ECR repository: ${repo}" >&2
    echo "Create it first or override ${repo} via environment variables." >&2
    exit 1
  fi
}

function deploy_service() {
  local service_name="$1"
  local repo="$2"
  local dockerfile="$3"
  local port="$4"
  local image_identifier
  image_identifier="$(ecr_uri "${repo}"):${IMAGE_TAG}"

  echo "=== Deploying ${service_name} ==="
  echo "Region: ${AWS_REGION}"
  echo "Image: ${image_identifier}"

  require_ecr_repository "${repo}"

  echo "→ Building Docker image..."
  docker build -f "${dockerfile}" -t "${repo}:${IMAGE_TAG}" .

  echo "→ Pushing to ECR..."
  docker tag "${repo}:${IMAGE_TAG}" "${image_identifier}"
  docker push "${image_identifier}"

  echo "→ Checking App Runner service..."
  local service_arn
  service_arn=$(aws apprunner list-services --region "${AWS_REGION}" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].ServiceArn | [0]" \
    --output text 2>/dev/null || echo "None")

  if [ "${service_arn}" = "None" ] || [ -z "${service_arn}" ]; then
    echo "→ Creating App Runner service..."
    aws apprunner create-service \
      --region "${AWS_REGION}" \
      --service-name "${service_name}" \
      --source-configuration "$(build_create_source_configuration "${image_identifier}" "${port}")" \
      --instance-configuration "${INSTANCE_CONFIGURATION}"

    echo "✓ App Runner service created. It may take a few minutes to deploy."
  else
    echo "→ Updating App Runner service (${service_arn})..."
    local current_source_configuration
    current_source_configuration=$(aws apprunner describe-service \
      --region "${AWS_REGION}" \
      --service-arn "${service_arn}" \
      --query 'Service.SourceConfiguration' \
      --output json)

    local updated_source_configuration
    updated_source_configuration=$(CURRENT_SOURCE_CONFIGURATION="${current_source_configuration}" IMAGE_IDENTIFIER="${image_identifier}" PORT="${port}" python3 - <<'PY'
import json
import os

source_configuration = json.loads(os.environ["CURRENT_SOURCE_CONFIGURATION"])
image_repository = source_configuration.get("ImageRepository")
if not image_repository:
    raise SystemExit("Existing App Runner service is not configured with an image repository")
image_repository["ImageIdentifier"] = os.environ["IMAGE_IDENTIFIER"]

image_configuration = image_repository.get("ImageConfiguration") or {}
image_configuration["Port"] = os.environ["PORT"]
runtime_environment = image_configuration.get("RuntimeEnvironmentVariables") or {}
runtime_environment["HOST"] = "0.0.0.0"
runtime_environment["NODE_ENV"] = "production"
runtime_environment["PORT"] = os.environ["PORT"]
image_configuration["RuntimeEnvironmentVariables"] = runtime_environment
image_repository["ImageConfiguration"] = image_configuration
print(json.dumps(source_configuration, separators=(",", ":")))
PY
)

    aws apprunner update-service \
      --region "${AWS_REGION}" \
      --service-arn "${service_arn}" \
      --source-configuration "${updated_source_configuration}"

    echo "✓ Service update started."
  fi

  local current_service_arn
  current_service_arn=$(aws apprunner list-services --region "${AWS_REGION}" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].ServiceArn | [0]" \
    --output text)

  local service_url
  service_url=$(aws apprunner describe-service \
    --region "${AWS_REGION}" \
    --service-arn "${current_service_arn}" \
    --query "Service.ServiceUrl" \
    --output text 2>/dev/null || echo "pending")

  echo "Service: ${service_name}"
  echo "URL: https://${service_url}"
  echo ""
}

echo "→ Authenticating with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

deploy_service "${APP_RUNNER_SERVICE}" "${APP_ECR_REPO}" "${APP_DOCKERFILE}" "${APP_PORT}"
deploy_service "${INGESTER_APP_RUNNER_SERVICE}" "${INGESTER_ECR_REPO}" "${INGESTER_DOCKERFILE}" "${INGESTER_PORT}"

echo "=== Deployment Complete ==="
