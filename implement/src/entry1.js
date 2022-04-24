const depend = require('./module');
const depend2 = require('./module2');
console.log(`this is entry1 and depend is ${JSON.stringify(depend)} + ${JSON.stringify(depend2)}`);
console.log(`env is __WEB_ENV__`)
