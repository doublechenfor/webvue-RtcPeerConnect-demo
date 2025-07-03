const Koa = require('koa');
const WebSocket = require('ws')
const https = require('https')
const fs = require('fs');
const clients = new Set()

const app = new Koa()
const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt'),
    // passphrase: '1111'
  };
const server = https.createServer(options, app.callback())
const wsInstance = new WebSocket.Server({server})


wsInstance.on('connection', (ws, websocket,request) => {
    if (!Array.from(clients).filter(v=>v.sys === websocket.headers['user-agent'])?.[0]) {
        clients.add({
            ws,
            sys: websocket.headers['user-agent']
        });
    }
    ws.on('message', (data) => {
        const received = data.toString()
        const receivedJSON = JSON.parse(received);
        switch(receivedJSON.action) {
            case 'push-stream':
                clients.forEach(item => {
                    if (item.sys === websocket.headers['user-agent']) {
                        return;
                    }
                    item.ws.send(JSON.stringify({
                        action: 'joined',
                        user: receivedJSON.sys,
                        data: receivedJSON.data
                    }))
                })
                break;
            case 'answer-offer':
                clients.forEach(item => {
                    if (item.sys === websocket.headers['user-agent']) {
                        return;
                    }
                    item.ws.send(JSON.stringify({
                        action: 'answer-offer',
                        user: receivedJSON.sys,
                        data: receivedJSON.data
                    }))
                })
                break;
            case 'send-candidate':
                clients.forEach(item => {
                    if (item.sys === websocket.headers['user-agent']) {
                        return;
                    }
                    item.ws.send(JSON.stringify({
                        action: 'send-candidate',
                        user: receivedJSON.sys,
                        data: receivedJSON.data
                    }))
                })
                break;
        }
        console.log('msg-action', receivedJSON.action)
    })

    ws.on('error', (res) => {
        console.log('header', res);
    })
})

server.listen(443, ()=> {
    console.log('https start')
})

