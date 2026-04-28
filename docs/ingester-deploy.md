# Ingester deployment runbook

Issue #70 splits SES/SNS ingestion into its own container and App Runner service so webhook bursts do not contend with the Next.js app.

## Local docker-compose

Start the full stack:

```bash
docker compose up --build app ingester postgres migrate
```

Endpoints:

- App: `http://localhost:${PORT:-3015}`
- Ingester health: `http://localhost:${INGESTER_PORT:-3016}/health`
- SES SNS webhook target: `http://localhost:${INGESTER_PORT:-3016}/events/ses`

Check the ingester container:

```bash
docker compose ps ingester
docker compose logs -f ingester
```

## Production deploy shape

`bash scripts/deploy.sh <image-tag>` now deploys two services:

- app image from `Dockerfile`
- ingester image from `packages/ingester/Dockerfile`

Override names when the real production service or repository names differ from the repo defaults:

```bash
APP_ECR_REPO=resend-clone \
APP_RUNNER_SERVICE=resend-clone \
INGESTER_ECR_REPO=resend-clone-ingester \
INGESTER_APP_RUNNER_SERVICE=namuh-ingester \
bash scripts/deploy.sh <image-tag>
```


## Background job worker

Issue #15 moves send/webhook work to AWS-native background jobs. The app publishes jobs to SQS after persisting rows; the ingester service consumes and executes them.

Required production environment for both app and ingester:

```bash
BACKGROUND_JOBS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/<account>/namuh-send-background
BACKGROUND_JOBS_REQUIRE_QUEUE=true
BACKGROUND_JOBS_EVENT_BUS_NAME=namuh-send-background-jobs # optional lifecycle/event hook bus
```

Set this only on the ingester worker service when SQS is ready:

```bash
BACKGROUND_WORKER_POLL=true
INGESTER_JOB_TOKEN=<random-bearer-token-for-eventbridge-http-targets>
```

SQS requirements:

- configure a redrive policy and DLQ; worker failures leave messages undeleted so SQS owns retry exhaustion
- use a standard queue by default; FIFO is supported if the queue URL ends in `.fifo`
- grant the app `sqs:SendMessage` and optional `events:PutEvents`
- grant the ingester `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:ChangeMessageVisibility`, and SES send permissions

EventBridge scheduling:

- call `POST /jobs/scheduled-emails` every minute to enqueue due scheduled sends
- call `POST /jobs/webhooks` every minute to retry webhook deliveries whose `next_retry_at` has arrived
- alternatively publish `scheduled-email.scan` and `webhook-delivery.scan` jobs into SQS

Manual probes:

```bash
INGESTER_URL="https://<ingester-service-url>"
curl -i -X POST "${INGESTER_URL}/jobs/poll" \
  -H "Authorization: Bearer ${INGESTER_JOB_TOKEN}"
curl -i -X POST "${INGESTER_URL}/jobs/scheduled-emails" \
  -H "Authorization: Bearer ${INGESTER_JOB_TOKEN}"
curl -i -X POST "${INGESTER_URL}/jobs/webhooks" \
  -H "Authorization: Bearer ${INGESTER_JOB_TOKEN}"
```

## SNS cutover

After the ingester service is live, SES SNS should point at:

```text
https://<ingester-service-url>/events/ses
```

Do not leave SES pointed at the Next.js app URL once the split is active.

## Tail ingester logs

1. Resolve the service id:

```bash
SERVICE_NAME=namuh-ingester
aws apprunner list-services \
  --region us-east-1 \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceId | [0]" \
  --output text
```

2. Find the CloudWatch log group that App Runner created:

```bash
SERVICE_NAME=namuh-ingester
aws logs describe-log-groups \
  --region us-east-1 \
  --log-group-name-prefix "/aws/apprunner/${SERVICE_NAME}"
```

3. Tail the application log group:

```bash
LOG_GROUP="/aws/apprunner/namuh-ingester/<service-id>/application"
aws logs tail "${LOG_GROUP}" --region us-east-1 --since 10m --follow
```

## Force-process a missed SES event

The ingester verifies the original SNS signature, so the safe replay path is to resend the exact SNS notification body that AWS originally delivered.

```bash
INGESTER_URL="https://<ingester-service-url>/events/ses"
curl -i "${INGESTER_URL}" \
  -H "Content-Type: text/plain; charset=UTF-8" \
  -H "x-amz-sns-message-type: Notification" \
  --data @sns-notification.json
```

`sns-notification.json` must be a real captured SNS envelope, including the original `Signature`, `SigningCertURL`, and `MessageId` fields. Because `email_events.source_id` is idempotent on the SNS `MessageId`, an already-processed notification will return `200 OK` and no-op.

## External residuals

This repo change does not create or mutate external AWS resources on its own. Before production cutover, verify:

- the ingester ECR repository exists
- the ingester App Runner service has the shared RDS and Secrets Manager wiring
- the SQS queue exists with a redrive policy and DLQ
- EventBridge schedule/rules exist for scheduled-email and webhook retry scans
- IAM grants app publish permissions and ingester consume/delete/change-visibility permissions
- the SES SNS subscription has been updated to the ingester URL
