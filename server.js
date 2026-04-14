let fs = require('fs');
let http = require('http');
let https = require('https');
const express = require('express');
var cors = require('cors');
const app = express();
app.use(cors());
const bodyParser = require("body-parser");
var fileUpload = require('express-fileupload');
//const expressValidator = require('express-validator')
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

// db config 🐰
require('./src/config/db');


const httpServer = http.createServer(app);
//var io = require('socket.io')(httpServer);
//var path = require("path");
app.use(bodyParser.json());
app.use(fileUpload());
//-------------------file upload ------------

//app.use(expressValidator());
//app.use('/static', express.static(path.join(__dirname, 'public')))
//socket

app.use('/', express.static(path.join(__dirname, 'public')));
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
	res.json({
		status: true,
		message: 'Welcome to Auto ai module'
	})
})

var user_route = require('./src/route/user');
var customer_route = require('./src/route/customer');
var ledger_route = require('./src/route/ledger');

const port = process.env.PORT || 3001;
//const httpsPort = process.env.HTTPSPORT || 3005;
const basePath = '/api';
app.use(basePath+'/user', user_route);
app.use(basePath+'/customer', customer_route);
app.use(basePath+'/ledger', ledger_route);
// CONFIG
const MONGO_URI = process.env.MONGO_URL;
const DUMP_DIR = path.join(__dirname, 'dump');
const BACKUP_DIR = path.join(__dirname, 'backups');
const EMAIL_TO = process.env.EMAIL;

// Ensure backup folder exists
if (!fs.existsSync(DUMP_DIR)) fs.mkdirSync(DUMP_DIR);
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// Setup nodemailer (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rana.irfan.qau@gmail.com',
    pass: 'gbvs zkrq lujg aydh sbch' // use App Password
  }
});

// API endpoint to trigger backup
//app.get('/backup', async (req, res) => 
const runBackup = () => {
  console.log("process started");
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(BACKUP_DIR, `mongo-backup-${date}.zip`);

  exec(`"${process.env.MONGO_TOOL_PATH}" --uri="${MONGO_URI}" --out="${DUMP_DIR}"`, (err, stdout, stderr) => {
    console.log("command executed");
    if (err) {
      console.error('Backup failed:', stderr);
      return;
    }

    // ✅ Ensure dump folder exists and has data
    if (!fs.existsSync(DUMP_DIR) || fs.readdirSync(DUMP_DIR).length === 0) {
      console.error('Dump folder is empty or missing!');
      return;
    }
    console.log("command dump dir found");
    
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // ✅ FIX: add trailing slash
    archive.directory(DUMP_DIR + '/', false);

    archive.finalize();

    output.on('close', async () => {
      console.log(`Backup created: ${archivePath} (${archive.pointer()} bytes)`);

      // ✅ Clean old backups (keep 3)
      let files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.zip'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 3) {
        files.slice(3).forEach(f => {
          fs.unlinkSync(path.join(BACKUP_DIR, f.name));
          console.log('Deleted old backup:', f.name);
        });
      }

      try {
        // ✅ SEND EMAIL FIRST
        await transporter.sendMail({
          from: '"Mongo Backup" <your@gmail.com>',
          to: EMAIL_TO,
          subject: 'MongoDB Backup',
          text: 'Backup attached.',
          attachments: [
            { filename: path.basename(archivePath), path: archivePath }
          ]
        });

        console.log('Email sent successfully');

        // ✅ THEN delete dump folder
        if (fs.existsSync(DUMP_DIR)) {
          fs.rmSync(DUMP_DIR, { recursive: true, force: true });
          console.log('Removed temporary dump folder');
        }

      } catch (emailErr) {
        console.error('Email failed:', emailErr);
      }
    });

    archive.on('error', err => {
      console.error('Compression error:', err);
    });
  });
};
// Runs at 10:00 PM every day
// cron.schedule('0 20 * * *', () => {
//   console.log('Running scheduled backup at 10 PM...');
//   runBackup();
// });

app.get('/backup', (req, res) => {
  runBackup();
  res.send('Backup started');
});

httpServer.listen(port, () => console.log(`Gold shop App listening on port ${port}!`))
//httpsServer.listen(httpsPort, () => console.log(`Example app listening on port ${httpsPort}!`));
//console.log(httpServer)
exports.httpServer = httpServer
