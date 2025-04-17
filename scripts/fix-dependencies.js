/**
 * This script helps track and document deprecated dependencies in the project.
 * It runs after npm install via the postinstall hook in package.json.
 */

console.log('\n===== Dependency Management Notes =====');
console.log('Some transitive dependencies have deprecation warnings:');
console.log('1. inflight - Known memory leak issues, overridden to v2.0.0');
console.log('2. lodash.isequal - Use Node.js util.isDeepStrictEqual instead');
console.log('3. rimraf - Using v5+ as recommended');
console.log('4. glob - Using v10+ as recommended');
console.log('5. fstream - No longer supported, but required by some dependencies');
console.log('\nThese have been addressed where possible through overrides in package.json.');
console.log('For remaining warnings, we\'re monitoring for updates from upstream dependencies.');
console.log('=========================================\n');

// Check Azure dependencies to ensure they follow best practices
const fs = require('fs');
const path = require('path');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  // Check for Azure SDK dependencies
  const azureDeps = Object.keys(packageJson.dependencies || {})
    .filter(dep => dep.startsWith('@azure/'));
  
  if (azureDeps.length > 0) {
    console.log('Azure SDK dependencies found:');
    azureDeps.forEach(dep => {
      console.log(` - ${dep}: ${packageJson.dependencies[dep]}`);
    });
    console.log('\nEnsure these follow Azure best practices:');
    console.log('- Use Managed Identity for auth when possible');
    console.log('- Implement proper error handling with retry logic');
    console.log('- Never hardcode credentials');
    console.log('\n');
  }
} catch (err) {
  console.error('Error checking package.json:', err.message);
}