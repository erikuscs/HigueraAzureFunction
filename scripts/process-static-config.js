/**
 * This script processes the staticwebapp.config.json file to replace placeholders
 * with actual environment values for deployment
 */

const fs = require('fs');
const path = require('path');

// Define the path to the staticwebapp.config.json file
const configFilePath = path.join(__dirname, '..', 'staticwebapp.config.json');

// Function to process the config file
function processConfig() {
  try {
    console.log('Processing staticwebapp.config.json for deployment...');
    
    // Read the staticwebapp.config.json file
    const configContent = fs.readFileSync(configFilePath, 'utf8');
    
    // Get the function app name from environment variables or use a default for local development
    const functionAppName = process.env.AZURE_FUNCTION_APP_NAME || 'higuera-dev-func';
    
    // Replace the placeholder with the actual function app name
    const processedContent = configContent.replace(/%AZURE_FUNCTION_APP_NAME%/g, functionAppName);
    
    // Write the processed content back to the file
    fs.writeFileSync(configFilePath, processedContent);
    
    console.log(`Successfully processed staticwebapp.config.json with function app name: ${functionAppName}`);
  } catch (error) {
    console.error('Error processing staticwebapp.config.json:', error.message);
    process.exit(1);
  }
}

// Execute the function
processConfig();