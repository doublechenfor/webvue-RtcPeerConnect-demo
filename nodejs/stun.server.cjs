const Turn = require('node-turn');  
const server = new Turn({  
    authMech: 'long-term',  
    credentials: { username: 'your_username', password: 'your_password' }  
});  
server.start();  
