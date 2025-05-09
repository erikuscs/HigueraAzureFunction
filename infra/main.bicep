@description('The name of the project')
param projectName string = 'higuera'

@description('The environment (dev, test, prod)')
param environment string = 'dev'

@description('The location for all resources')
// Update default location to a supported one like 'eastus2'
param location string = 'eastus2'

@description('The email recipients for notifications')
param emailRecipients string

@description('The custom domain for the static web app')
param customDomain string = 'higueradashboard.live'

var uniqueName = '${projectName}-${environment}'
var tags = {
  environment: environment
  project: projectName
}

// Add reference to the existing user-assigned identity
resource higueraAdminIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: 'higuera_admin'
  scope: resourceGroup('higuera-rg') // Use the correct resource group name
}

// Key Vault for storing secrets
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${uniqueName}-kv'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enabledForTemplateDeployment: true
  }
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${uniqueName}-ai'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    DisableIpMasking: false
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Azure Cache for Redis resource
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${uniqueName}-redis'
  location: location
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'volatile-lru'
    }
    redisVersion: '6.0'
  }
  tags: tags
}

// Storage Account for Function
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${replace(uniqueName, '-', '')}st'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Function App Service Plan
resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${uniqueName}-plan'
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${uniqueName}-func'
  location: location
  tags: union(tags, { 'azd-service-name': 'functionapp' }) // Add azd tag
  kind: 'functionapp'
  // Update identity to use UserAssigned
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      // Reference the existing identity resource ID
      '${higueraAdminIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'REDIS_CONNECTION_STRING'
          value: '${redisCache.properties.hostName}:${redisCache.properties.sslPort},password=${redisCache.listKeys().primaryKey},ssl=True,abortConnect=False'
        }
        {
          name: 'KEY_VAULT_URL'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'EMAIL_RECIPIENT'
          value: emailRecipients
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'CORS_ALLOWED_ORIGINS'
          value: 'https://${staticWebApp.properties.defaultHostname},https://${customDomain}'
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${staticWebApp.properties.defaultHostname}'
          'https://${customDomain}'
        ]
        supportCredentials: false
      }
    }
  }
}

// Static Web App for Next.js
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: '${uniqueName}-swa'
  // Use the location parameter
  location: location
  tags: union(tags, { 'azd-service-name': 'web' }) // Add correct AZD tag for the web service
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
    buildProperties: {
      appLocation: '/'
      apiLocation: ''
      // Align outputLocation with azure.yaml dist setting
      outputLocation: '.next'
      appBuildCommand: 'npm run build'
      apiBuildCommand: ''
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Configure Static Web App application settings
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    AZURE_FUNCTION_URL: 'https://${functionApp.properties.defaultHostName}'
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
    KEY_VAULT_URL: keyVault.properties.vaultUri
    AZURE_FUNCTION_APP_NAME: functionApp.name
  }
}

// Grant Function App access to Key Vault
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // Add a suffix to the role name guid to ensure a new assignment is created
  name: guid(keyVault.id, functionApp.id, 'Key Vault Secrets User-UAI')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    // Update principalId to use the user-assigned identity's principalId
    principalId: higueraAdminIdentity.properties.principalId
    principalType: 'ServicePrincipal' // Keep as ServicePrincipal for User Assigned Identity
  }
}

// Grant Static Web App access to Key Vault
resource staticWebAppKeyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, staticWebApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: staticWebApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Store Redis connection string in Key Vault
resource redisConnectionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'RedisConnectionString'
  properties: {
    value: '${redisCache.properties.hostName}:${redisCache.properties.sslPort},password=${redisCache.listKeys().primaryKey},ssl=True,abortConnect=False'
  }
}

output functionAppName string = functionApp.name
output keyVaultName string = keyVault.name
output appInsightsName string = appInsights.name
output redisName string = redisCache.name
output staticWebAppName string = staticWebApp.name
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
