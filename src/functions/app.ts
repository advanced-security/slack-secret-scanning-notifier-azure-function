import { Probot } from "probot";
import { EmitterWebhookEvent } from "@octokit/webhooks";
import { SecretScanningAlertWebHookPayload } from "./types";
import { eventFilter } from "./filter";
import { notifySlack } from "./slack_notifier";

const setupApp = (app: Probot) => {
  app.onAny(async (event: EmitterWebhookEvent) => {
    const payload = event.payload as SecretScanningAlertWebHookPayload;

    if (eventFilter(event)) {
      await notifySlack(payload);
    }
  });
};

export default setupApp;
