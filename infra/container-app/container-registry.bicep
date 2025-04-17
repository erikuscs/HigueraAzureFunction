@description('Specifies the location for the registry.')
param location string = resourceGroup().location

@description('Specifies the name of the container registry.')
param registryName string = 'higueracontainerreg${uniqueString(resourceGroup().id)}'

@description('Specifies the SKU of the container registry.')
param skuName string = 'Basic'

resource registry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: registryName
  location: location
  sku: {
    name: skuName
  }
  properties: {
    adminUserEnabled: true
  }
}

@description('Output the login server property for later use')
output loginServer string = registry.properties.loginServer

@description('Output the registry name')
output name string = registry.name
