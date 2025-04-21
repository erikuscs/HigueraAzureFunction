#!/bin/bash
# Azure Static Web App Direct Deployment Script
# This script deploys your Next.js application directly to Azure Static Web Apps
# bypassing GitHub Actions authentication issues

echo "🚀 Starting Azure Static Web App direct deployment..."

# Build the Next.js application
echo "📦 Building Next.js application..."
npm ci
npm run build
npm run export

# Validate export output
if [ -d "out" ]; then
  echo "✅ Export successful - out directory found"
else
  echo "❌ Export failed - out directory not found"
  exit 1
fi

# Deploy using Azure CLI
echo "🔄 Deploying to Azure Static Web App..."
echo "⚠️ Please authenticate with Azure CLI if prompted"

# Login to Azure
az login

# Get Static Web App details
STATIC_WEBAPP_NAME="HigueraDashboard"
RESOURCE_GROUP=$(az staticwebapp list --query "[?name=='$STATIC_WEBAPP_NAME'].resourceGroup" -o tsv)

if [ -z "$RESOURCE_GROUP" ]; then
  echo "❌ Error: Could not find Static Web App with name $STATIC_WEBAPP_NAME"
  echo "Please check the name and try again"
  exit 1
fi

echo "📂 Using resource group: $RESOURCE_GROUP"

# Deploy using the Azure CLI Static Web Apps upload command (preview extension)
echo "🚀 Deploying to Azure Static Web App..."
az staticwebapp upload \
  --name "$STATIC_WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --source "out" \
  --verbose

echo "✅ Deployment complete!"