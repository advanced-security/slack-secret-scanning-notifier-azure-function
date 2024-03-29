# Installing the Azure Function and GitHub App

To get this Azure Function working, you need to:

1. create or edit a Slack App and get a webhook URL
2. create a GitHub App
3. create an Azure Function app, and deploy this Azure Function to it
4. configure the Azure Function with the GitHub App's private key, webhook secret, and the GitHub App's ID
5. configure the Azure Function with the Slack webhook URL
6. configure the GitHub App with the Azure Function's URL as the webhook
7. install the GitHub App on the organization and set it to be active on the whole organization or the repositories you want

> [!NOTE]
> When working with the Azure CLI, remember to use `az login` to log in to Azure, and `az logout` first if you are having problems.

> [!NOTE]
> To use the Bash (use WSL on Windows for Bash) scripts in the `scripts` directory, set your Azure settings in a `azure.env` file that they pick up from the same directory. You may need to change settings if you want to vary the region the Function is used in, or change its name to allow more than one to coexist in the same subscription.

> [!WARNING]
> Don't get confused between the Slack webhook and the Azure Function webhook.
>
> The Slack webhook is configured in the Azure Function, and the Azure Function webhook is configured in the GitHub App.

## Creating a Slack App and getting a webhook URL

You need to create a Slack App, and get a webhook URL for it. You can use the UI to do this.

### Use the Slack UI to create a new Slack App

1. Go to the [new Slack App page](https://api.slack.com/apps?new_app=1)
2. Choose the "From scratch" option
3. Name it something like "Secret Scanning Notifier", and choose the workspace you want to create it in
4. Click on the "Create App" button

Under "Add features and functionality", choose "Incoming Webhooks", and toggle the switch to "On".

Click on the "Add New Webhook to Workspace" button, and choose the channel you want to post to.

You will be given a new Slack webhook URL. Copy this and save it somewhere safe, as you will need it later to configure the Azure Function you will create.

## Creating a GitHub app

You need to create a GitHub app, and install it on a repo. You can use the UI to do this.

You won't yet know the Azure Function URL to use as the webhook URL, so you can leave the webhook as inactive for now.

Using the GitHub API to create this GitHub App is not yet implemented.

### Use the GitHub UI to create a new GitHub App

1. Got to the Organization you want to create the app in
2. Click on the "Settings" button in the top menu bar
3. Click on the "Developer settings" button in the left-hand side panel
4. Click on the "GitHub Apps" link
5. Click on the "New GitHub App" button at the top right of the page

That should take you to the `https://github.com/organizations/<org>/settings/apps/new` page for your organization, which will replace `<org>`.

Fill in the details, and click on the "Create GitHub App" button.

You will need a name, a description, a homepage URL (which can just be `https://github.com/advanced-security/`, if you like), and a webhook URL. You also need to make a secret and to generate a private key.

- the webhook URL can be left blank, since we have not yet created the Azure Function
- uncheck the "Active" checkbox for the webhook, since we have not yet created the Azure Function
- use a secure secret for the webhook secret, since this authenticates that this GitHub App is making requests to your Functions App
  - ⚠️ save the webhook secret somewhere safe, and generate it securely. It's best to do this using a password manager or key vault
- give the GitHub App read access to Secret scanning alerts under the repository permissions
- leave the option selected to "Enable SSL verification"
- click on the "Create GitHub App" button

Once it is created, you will need to download the private key.

- click on the "Generate a private key" button at at the bottom of the page. This will automatically download the private key as a `.pem` file.
  - ⚠️ save the private key somewhere safe - _this is the only time you get to download it_, and you will need it later

[The full GitHub docs](https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) can help you if you get stuck.

## Deploying the Azure Function

You need to create an Azure Function App, and deploy the Azure Function to it.

Before you deploy, set a `filter.yml` if you wish to filter out certain events. See [filtering events](README.md) for more details.

### Creating the Functions App

You can use the Azure Portal, the Azure CLI, or the VSCode Azure Functions extension to do this.

The Function uses the NodeJS runtime, and will work with NodeJS 20+.

#### Creating the Functions App with the Azure Portal

You need to create a new Function App, and then deploy the function to it.

In the [Azure Portal](https://portal.azure.com), click on the "Create a resource" button, and search for "Function App".

That should take you to the [Create Function App](https://portal.azure.com/#create/Microsoft.FunctionApp) page.

Fill in the details, and click on the "Review + create" button. Make sure you select the NodeJS runtime, of the latest stable version (20+).

#### Creating the Functions App with the Azure CLI

It needs your subscription ID, a location, and a function app name to be set in `scripts/azure.env` in the repo directory.

Only the subscription ID is necessary - the rest have defaults: you may want to change the region or the name of the function.

You can use the convenience script `scripts/create-azure-function.sh`.

#### Creating the Functions App with the VSCode Azure Functions extension

You need to install the [Azure Functions extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) for VSCode.

Then, you can create a new Function App, and deploy the function to it, using the Workspace pane in the VSCode Azure Functions extension panel.

Left-click the Azure Functions button in the top right of the pane, and select "Create Function App in Azure...", then follow the prompts to create the Function App.

### Configuring the Functions App

Set the following environment variables in the Functions App:

```bash
APP_ID=...
PRIVATE_KEY=...
WEBHOOK_SECRET=...
SLACK_WEBHOOK_URL=...
```

where `APP_ID` is the ID of the GitHub App you created earlier, `PRIVATE_KEY` is the contents of the `.pem` file you downloaded earlier, `WEBHOOK_SECRET` is the webhook secret you defined when you configured the GitHub App, and `SLACK_WEBHOOK_URL` is the URL of the Slack incoming webhook you created earlier.

The private key should be a single line, removing the whitespace in the `.pem` file, like:

```text
-----BEGIN RSA PRIVATE KEY-----MIAAA...AAA==-----END RSA PRIVATE KEY-----
```

You can use the `scripts/pem-to-one-liner.sh` script to do this, which just uses `tr` to remove the line breaks.

It is also possible to set these directly in the Azure Portal, but you may prefer to configure them in code.

#### Synchronizing the Functions App's settings with the local repo

You can sync your remote settings from the app you created to the local repo.

You can use the Azure Functions extension in VSCode. Right-click on the Function App in the Resources pane, and select "Download remote settings" from the context menu.

Alternatively, you can also use the `scripts/sync-settings-remote-to-local.sh` script, after you set `scripts/azure.env` appropriately. This will save the settings to `remote.settings.json`, which you can copy to `local.settings.json`.

Then in your `local.settings.json` file these environment variables are defined like:

```json
{
  "IsEncrypted": false,
  "Values": {
    "APP_ID": "...",
    "PRIVATE_KEY": "...",
    "WEBHOOK_SECRET": "...",
    "SLACK_WEBHOOK_URL": "...",
    ...
  }
}
```

#### Configuring the Functions App with the Azure Portal

These environment variables can be configured in the Azure Portal under the "Configuration" section of the Function App, as "Application settings".

#### Configuring the Functions App with the Azure Functions extension for VSCode

You can also configure the environment variables in the Azure Functions extension in VSCode, by right-clicking on the Function App in the Resources pane, and selecting "Configure Application Settings" from the context menu.

You can also set them directly in the `local.settings.json` (as above) and sync them to the remote Function App by right-clicking on the Function App in the Resources pane, and selecting "Upload local settings" from the context menu.

#### Configuring the Functions App with the Azure CLI

You can use the `scripts/sync-settings-local-to-remote.sh` shell script provided in this repository. Make sure to set the `local.settings.json` and `scripts/azure.env` appropriately first.

### Deploying the Function to the Function App

You then need to deploy the function to the Function App.

You can use the Azure Portal, the Azure CLI, or the VSCode Azure Functions extension to do this.

Some of these steps assume you have zipped up the code of this function into `slack-secret-scanning-notifier.zip`.

You can do that using the `scripts/make-function-zip.sh` shell script provide in this repository. Make sure to set the `scripts/azure.env` appropriately first.

#### Deploying with the Azure Portal

In the [Azure Portal](https://portal.azure.com), click on the "Function Apps" button in the left-hand menu, and select the Function App you created.

That should take you to the Function App's page.

Click on the "Functions" button in the left-hand menu, and then click on the "Deploy" button in the top menu.

Select "Zip Deploy", and upload the `slack-secret-scanning-notifier.zip` file.

#### Deploying with the Azure CLI

Use the `scripts/deploy.sh` shell script provided in this repository. Make sure to set the `scripts/azure.env` appropriately first.

That may fail if it can't find the function app. If it does, you can try using `scripts/deploy-zip.sh` instead, using the `slack-secret-scanning-notifier.zip`.

#### Deploying with the VSCode Azure Functions extension

There are a couple of ways to deploy the function to the Function App with the VSCode Azure Functions extension.

1. Use the Workspace pane in the VSCode Azure Functions extension panel. Left-click the Azure Functions button in the top right of the pane, and select "Deploy to Function App...", then follow the prompts to deploy the function.
   - or
2. Find the Function App in the Resources pane (under the correct Subscription). Right-click it, and select "Deploy to Function App..." from the context menu.

### Finding the Function's URL

You need to find the URL of the Function to set up the GitHub App's webhook.

This is returned when you deploy the function to the Function App using the `scripts/deploy.sh` script. If you used a different method, you may need to find it manually.

You can use the Azure Portal, the Azure CLI, or the VSCode Azure Functions extension to do this.

If you can't find the Function under the Functions App, you may need to click on the "Refresh" button in the top menu. If that doesn't work, there may be an error in the Function's code or settings. Check that you can debug the Function locally, to see if there are any mistakes in the configuration, especially the `PRIVATE_KEY` setting.

#### Finding the Functions App's URL with the Azure Portal

In the [Azure Portal](https://portal.azure.com), click on the "Function Apps" button in the left-hand menu, and select the Function App you created.

That should take you to the Function App's page. You should see your Function listed in the table. Left-click on the Function's name, and on the Function's page, left-click on the "Get function URL" button in the top menu. Copy the URL.

#### Finding the Function's URL with the Azure CLI

Use the `scripts/get-function-url.sh` shell script provided in this repository. Make sure to set the `scripts/azure.env` appropriately first.

This gets the URL of your Functions App and adds `/api/slack-secret-scanning-notifier` to the end of the URL, to get the full URL to your Function.

#### Finding the Functions App's URL with the VSCode Azure Functions extension

You can find the URL of the Function App in the Resources pane (under the correct Subscription).

Open up the Function App, and expand the Functions node. Right-click on the Function, and select "Copy Function Url" from the context menu.

## Configuring the GitHub App

Fill in the details you now know from the Function App and installed Function into the GitHub App's settings.

- select the `secret_scanning_alert` event under "Permissions & events" and click "Save" at the bottom of the page
  - ⚠️ carefully think about the security implications of giving the Functions App access to these events
- set the webhook URL to the URL of the Function
- set the webhook to Active by checking the box

## Installing the GitHub App

You need to install the GitHub App on an organization or repository.

### Use the GitHub UI to install the GitHub App

- navigate to the GitHub App you created earlier, and click on the "Install App" button
- choose which organization to install it on
- choose whether to install it for selected repositories, or for the whole organization
