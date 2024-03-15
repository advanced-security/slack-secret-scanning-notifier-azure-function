import { SecretScanningAlertWebHookPayload } from "./types";
import axios from "axios";
import * as url from "url";

const ACTION_ICONS: { [key: string]: string } = {
    created: "🔑",
    resolved: "✅",
    reopened: "🔑",
    dismissed: "❌"
};

const PRIVATE_ICON = "🔒";
const PUBLIC_ICON = "🌐";

function validateSlackWebhook(webhook: string): string | null {
    if (!webhook.startsWith("https://")) {
        return null;
    }

    // parse as a URL to validate
    try {
        const parsedUrl = new url.URL(webhook);

        if (parsedUrl.protocol !== "https:") {
            return null;
        }

        if (!parsedUrl.hostname) {
            return null;
        }

        if (!(parsedUrl.hostname.endsWith(".slack.com")|| parsedUrl.hostname.endsWith(".slack-gov.com"))) {
            return null;
        }

        if (!parsedUrl.pathname.startsWith("/services/")) {
            return null;
        }

        // that's good enough, if any more of the format is wrong then the server will reject it
        return parsedUrl.href;
    } catch (e) {
        return null;
    }
}

export const notifySlack = async (eventData: SecretScanningAlertWebHookPayload) => {
    // get Slack webhook out of app settings in Azure Function
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhook) {
        throw new Error("SLACK_WEBHOOK_URL is not set");
    }

    if (!validateSlackWebhook(slackWebhook)) {
        throw new Error("SLACK_WEBHOOK_URL is not valid");
    }

    // notify Slack using the webhook
    const slackMessage = makeSlackMessage(eventData);

    await postToSlack(slackWebhook, slackMessage);
}

const postToSlack = async (slackWebhook: string, slackMessage: any) => {
    try {
        const response = await axios.post(slackWebhook, slackMessage, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.status !== 200) {
            console.error(`Error posting to Slack webhook: ${response.statusText}`);
            return false;
        }

        return true;
    } catch (e) {
        console.error(`Error parsing event data: ${e}`);
        return false;
    }
}

const makeSlackMessage = (eventData: SecretScanningAlertWebHookPayload) => {
    try {
        const action = eventData.action;
        const owner = eventData.repository.owner.login;
        const repo = eventData.repository.name;
        const privateRepo = eventData.repository.private;
        const eventTime = eventData.alert.created_at;
        const secretScanningViewUrl = eventData.alert.html_url;

        const actionIcon = ACTION_ICONS[action] || "";
        const visibilityIcon = privateRepo ? PRIVATE_ICON : PUBLIC_ICON;

        const slackMessage = {
            text: `Secret scanning 🔑 alert ${action} on GitHub repo ${owner}/${repo}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `Secret scanning 🔑 alert ${action} on GitHub repo ${owner}/${repo}`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        { type: "mrkdwn", text: `*Action*: ${action} ${actionIcon}`, verbatim: true },
                        { type: "mrkdwn", text: `*Repo*: ${owner}/${repo}`, verbatim: true },
                        { type: "mrkdwn", text: `*Visibility*: ${privateRepo ? 'private' : 'public'} ${visibilityIcon}`, verbatim: true },
                        { type: "mrkdwn", text: `*Time*: ${eventTime}`, verbatim: true },
                    ],
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "View on GitHub",
                            },
                            url: secretScanningViewUrl,
                            style: "primary",
                            accessibility_label: "View this secret scanning alert in GitHub Advanced Security",
                        },
                    ],
                },
            ],
        };

        return slackMessage;
    } catch (e) {
        console.error(`Error creating Slack message: ${e}`);
        return null;
    }
}
