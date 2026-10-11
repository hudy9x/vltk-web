// Compatibility entry point. Build the maintained app/ sources without touching app.js.
const { buildApp } = require('./build-app');
const result = buildApp();
console.log(`Built app/game.js from ${result.modules.length} modules. app.js remains the backup.`);
