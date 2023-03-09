const easConfig = require('./eas.json')

// Add eas cli globally so container can run update commands 
// without having to keep eas in the deps (expo disallows this -_-)
console.log(`npm install -g eas-cli@${easConfig.cli.version}`)
