#!/bin/bash
# deploy.sh - Script to deploy HigueraAzureFunction to Azure

# Set default environment name
ENV_NAME=dev

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env) ENV_NAME="$2"; shift ;;
        --preview) PREVIEW=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Initialize Azure Developer CLI environment if not already initialized
if [ ! -d ".azure" ]; then
    echo "Initializing Azure Developer CLI environment..."
    azd init --template . --environment $ENV_NAME
fi

# Prompt for email recipients if not already set
if [ -z "$(azd env get-values --output json | jq -r '.emailRecipients // empty')" ]; then
    read -p "Enter email recipients for notifications (comma-separated): " EMAIL_RECIPIENTS
    azd env set emailRecipients "$EMAIL_RECIPIENTS"
fi

# Preview or provision resources
if [ "$PREVIEW" = true ]; then
    echo "Previewing deployment (what-if)..."
    azd provision --preview
else
    # Provision Azure resources
    echo "Provisioning Azure resources..."
    azd provision

    # Deploy application
    echo "Deploying application..."
    azd deploy

    # Get outputs
    STATIC_WEB_APP_URL=$(azd env get-values --output json | jq -r '.staticWebAppUrl // empty')
    FUNCTION_APP_URL=$(azd env get-values --output json | jq -r '.functionAppUrl // empty')

    echo "Deployment completed successfully!"
    echo "Static Web App URL: $STATIC_WEB_APP_URL"
    echo "Function App URL: $FUNCTION_APP_URL"
fi