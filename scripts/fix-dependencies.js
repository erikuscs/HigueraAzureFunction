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

// Fix lodash.isequal usage if it exists
function fixLodashIsEqual() {
  const projectRoot = path.join(__dirname, '..');
  // Common file patterns that might use lodash.isequal
  const patterns = [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '!**/node_modules/**',
    '!**/.git/**'
  ];

  console.log('Checking for lodash.isequal usage in project files...');
  
  try {
    // Simple check for direct requires of lodash.isequal
    const { globSync } = require('glob');
    const files = globSync(patterns, { cwd: projectRoot });
    
    let filesFixed = 0;
    
    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for lodash.isequal requires or imports
        if (content.includes('lodash.isequal') || 
            content.includes('lodash/isequal') || 
            content.includes('lodash/isEqual')) {
          
          // Replace with Node's util.isDeepStrictEqual
          const newContent = content
            .replace(/const\s+isEqual\s*=\s*require\(['"]lodash\.isequal['"]\);?/g, 
                     'const { isDeepStrictEqual: isEqual } = require(\'util\');')
            .replace(/const\s+(\w+)\s*=\s*require\(['"]lodash\.isequal['"]\);?/g, 
                     'const { isDeepStrictEqual: $1 } = require(\'util\');')
            .replace(/import\s+isEqual\s+from\s+['"]lodash\.isequal['"];?/g, 
                     'import { isDeepStrictEqual as isEqual } from \'util\';')
            .replace(/import\s+(\w+)\s+from\s+['"]lodash\.isequal['"];?/g, 
                     'import { isDeepStrictEqual as $1 } from \'util\';')
            .replace(/import\s+{\s*isEqual\s*}\s+from\s+['"]lodash['"];?/g, 
                     'import { isDeepStrictEqual as isEqual } from \'util\';');
          
          if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            filesFixed++;
            console.log(`Fixed lodash.isequal usage in: ${file}`);
          }
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err.message);
      }
    }
    
    if (filesFixed > 0) {
      console.log(`\nReplaced lodash.isequal with util.isDeepStrictEqual in ${filesFixed} files.`);
    } else {
      console.log('No direct lodash.isequal usage found in project files.');
    }
  } catch (err) {
    console.error('Error searching for lodash.isequal usage:', err.message);
  }
}

// Handle fstream dependency warning
function checkFstreamUsage() {
  try {
    const packageLock = path.join(__dirname, '..', 'package-lock.json');
    if (fs.existsSync(packageLock)) {
      const lockContent = fs.readFileSync(packageLock, 'utf8');
      if (lockContent.includes('"fstream"')) {
        console.log('\nWARNING: fstream package is still present in your dependencies.');
        console.log('This package is no longer supported and may have security vulnerabilities.');
        console.log('It\'s likely being required by a transitive dependency.');
        console.log('Consider updating packages that depend on fstream or using an alternative.');
      }
    }
  } catch (err) {
    console.error('Error checking for fstream usage:', err.message);
  }
}

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

  // Fix deprecated dependencies
  fixLodashIsEqual();
  checkFstreamUsage();
  
} catch (err) {
  console.error('Error checking package.json:', err.message);
}