# deploy.ps1 - Script to deploy HigueraAzureFunction to Azure

param(
    [string]$Env = "dev",
    [switch]$Preview
)

# Initialize Azure Developer CLI environment if not already initialized
if (-not (Test-Path ".azure")) {
    Write-Host "Initializing Azure Developer CLI environment..."
    azd init --template . --environment $Env
}

# Prompt for email recipients if not already set
$envValues = azd env get-values --output json | ConvertFrom-Json
if (-not $envValues.emailRecipients) {
    $EmailRecipients = Read-Host "Enter email recipients for notifications (comma-separated)"
    azd env set emailRecipients $EmailRecipients
}

# Preview or provision resources
if ($Preview) {
    Write-Host "Previewing deployment (what-if)..."
    azd provision --preview
}
else {
    # Provision Azure resources
    Write-Host "Provisioning Azure resources..."
    azd provision

    # Deploy application
    Write-Host "Deploying application..."
    azd deploy

    # Get outputs
    $envValues = azd env get-values --output json | ConvertFrom-Json
    $staticWebAppUrl = $envValues.staticWebAppUrl
    $functionAppUrl = $envValues.functionAppUrl

    Write-Host "Deployment completed successfully!"
    Write-Host "Static Web App URL: $staticWebAppUrl"
    Write-Host "Function App URL: $functionAppUrl"
}