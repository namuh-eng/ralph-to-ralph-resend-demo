#!/bin/bash
# ABOUTME: Deploy script for AWS App Runner via ECR
# ABOUTME: Builds Docker image, pushes to ECR, creates/updates App Runner service

set -euo pipefail
cd "$(dirname "$0")/.."

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="699486076867"
ECR_REPO="resend-clone"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
APP_RUNNER_SERVICE="resend-clone"
IMAGE_TAG="${1:-latest}"
IMAGE_IDENTIFIER="${ECR_URI}:${IMAGE_TAG}"

echo "=== Deploying to App Runner ==="
echo "Region: ${AWS_REGION}"
echo "ECR: ${IMAGE_IDENTIFIER}"
echo ""

CREATE_SOURCE_CONFIGURATION=$(cat <<JSON
{
  "AuthenticationConfiguration": {
    "AccessRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerECRAccessRole"
  },
  "ImageRepository": {
    "ImageIdentifier": "${IMAGE_IDENTIFIER}",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "3000",
      "RuntimeEnvironmentVariables": {
        "NODE_ENV": "production"
      }
    }
  }
}
JSON
)

INSTANCE_CONFIGURATION=$(cat <<'JSON'
{
  "Cpu": "1024",
  "Memory": "2048"
}
JSON
)

# Step 1: Authenticate Docker with ECR
echo "→ Authenticating with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Step 2: Build Docker image
echo "→ Building Docker image..."
docker build -t "${ECR_REPO}:${IMAGE_TAG}" .

# Step 3: Tag and push to ECR
echo "→ Pushing to ECR..."
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${IMAGE_IDENTIFIER}"
docker push "${IMAGE_IDENTIFIER}"

# Step 4: Check if App Runner service exists
echo "→ Checking App Runner service..."
SERVICE_ARN=$(aws apprunner list-services --region "${AWS_REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn | [0]" \
  --output text 2>/dev/null || echo "None")

if [ "${SERVICE_ARN}" = "None" ] || [ -z "${SERVICE_ARN}" ]; then
  # Step 5a: Create new App Runner service
  echo "→ Creating App Runner service..."
  aws apprunner create-service \
    --region "${AWS_REGION}" \
    --service-name "${APP_RUNNER_SERVICE}" \
    --source-configuration "${CREATE_SOURCE_CONFIGURATION}" \
    --instance-configuration "${INSTANCE_CONFIGURATION}"

  echo "✓ App Runner service created. It may take a few minutes to deploy."
else
  # Step 5b: Update existing App Runner service
  echo "→ Updating App Runner service (${SERVICE_ARN})..."
  CURRENT_SOURCE_CONFIGURATION=$(aws apprunner describe-service \
    --region "${AWS_REGION}" \
    --service-arn "${SERVICE_ARN}" \
    --query 'Service.SourceConfiguration' \
    --output json)

  UPDATED_SOURCE_CONFIGURATION=$(CURRENT_SOURCE_CONFIGURATION="${CURRENT_SOURCE_CONFIGURATION}" IMAGE_IDENTIFIER="${IMAGE_IDENTIFIER}" python3 - <<'PY'
import json
import os

source_configuration = json.loads(os.environ["CURRENT_SOURCE_CONFIGURATION"])
image_repository = source_configuration.get("ImageRepository")
if not image_repository:
    raise SystemExit("Existing App Runner service is not configured with an image repository")
image_repository["ImageIdentifier"] = os.environ["IMAGE_IDENTIFIER"]
print(json.dumps(source_configuration, separators=(",", ":")))
PY
)

  aws apprunner update-service \
    --region "${AWS_REGION}" \
    --service-arn "${SERVICE_ARN}" \
    --source-configuration "${UPDATED_SOURCE_CONFIGURATION}"

  echo "✓ Service update started."
fi

# Step 6: Get service URL
echo ""
echo "→ Fetching service URL..."
SERVICE_URL=$(aws apprunner describe-service \
  --region "${AWS_REGION}" \
  --service-arn "$(aws apprunner list-services --region "${AWS_REGION}" \
    --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn | [0]" \
    --output text)" \
  --query "Service.ServiceUrl" \
  --output text 2>/dev/null || echo "pending")

echo ""
echo "=== Deployment Complete ==="
echo "Service: ${APP_RUNNER_SERVICE}"
echo "URL: https://${SERVICE_URL}"
echo ""
