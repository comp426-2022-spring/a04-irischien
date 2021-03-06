const express = require('express');
const minimist = require('minimist');
const morgan = require('morgan');
const db = require("./database.js");
const fs = require('fs');
const app = express()

var args = minimist(process.argv.slice(2));
var allowedName = 'port';
const HTTP_PORT = args[allowedName] || 5555;

// Make Express use its own built-in body parser for both urlencoded and JSON body data.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// start an app server
const server = app.listen(HTTP_PORT, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',HTTP_PORT))
});

// if helped is asked, show the message below, then exit with code 0 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}
// create log file
if (args['log'] == true) {
    const WRITESTREAM = fs.createWriteStream('FILE', { flags: 'a' })
    app.use(morgan('combined', { stream: WRITESTREAM }))
} 

// Creates sqllite database
app.use((req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }
  const stmt = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const information = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
  next();
});

app.get('/app/log/access', (req, res) => {
    const stmt = db.prepare('SELECT * FROM accesslog').all()
    res.status(200).json(stmt)
})

app.get('/app/error', (req, res) => {
    throw new error ('Error test successful')
})

app.get('/app/', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead(res.statusCode, { 'Content-Type' : 'text/plain'});
    res.end(res.statusCode + ' ' + res.statusMessage)
});

// Default response for any other request
app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});
