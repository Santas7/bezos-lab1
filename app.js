const express = require('express');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const port = 3002;

var DATA = {};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});


app.post('/connect', (req, res) => {
  const { login, password, host } = req.body;

  const conn = new Client();
  conn
    .on('ready', () => {
      console.log('SSH connection established');
      conn.exec('ps aux', (err, stream) => {
        if (err) {
          console.error('Error executing ps aux command:', err);
          res.status(500).json({ success: false, message: 'Error executing ps aux command.' });
          conn.end();
          return;
        }

        let data = '';
        stream
          .on('data', (chunk) => {
            data += chunk.toString();
          })
          .on('close', () => {
            conn.end();
            res.render('fileList', { files: data });
          });
      });
    })
    .on('error', (err) => {
      console.error('SSH Connection Error:', err);
      res.status(500).json({ success: false, message: 'Error connecting to SSH server.' });
    })
    .connect({
      host: host,
      port: 22,
      username: login,
      password: password,
    });
    DATA = {
        login: login,
        password: password,
        host: host
    }
});


app.post('/close-file', (req, res) => {
    const { pid } = req.body; 
    console.log(`Closing process with PID: ${pid}`);
    const { login, password, host } = DATA; 
  
    const conn = new Client();
    conn
      .on('ready', () => {
        console.log('SSH connection established for close-file');
        
        conn.exec('ps aux', (err, stream) => {
          if (err) {
            console.error('Error executing ps aux:', err);
            return res.status(500).json({ success: false, message: 'Error executing ps aux on SSH server.' });
          }
  
          let data = '';
          stream
            .on('data', (chunk) => {
              data += chunk.toString();
            })
            .on('close', () => {
              const processes = data.split('\n').filter(line => line.includes('.txt'));
              console.log('Processes with .txt:', processes);
  
              const filePIDs = processes.map(line => line.split(/\s+/)[1]); 

              if (!filePIDs.includes(pid)) {
                console.error('PID does not belong to a .txt file.');
                return res.status(400).json({ success: false, message: 'The PID does not belong to a .txt file.' });
              }
  
              const killCommand = `kill -9 ${pid}`;
              console.log(`Executing command: ${killCommand}`);
              conn.exec(killCommand, (killErr, killStream) => {
                if (killErr) {
                  console.error('Error closing process:', killErr);
                  return res.status(500).json({ success: false, message: 'Failed to kill the process.' });
                }
  
                killStream.on('close', () => {
                  console.log(`Process with PID ${pid} has been killed successfully.`);
                  conn.end(); 
                  res.json({ success: true, message: `Process with PID ${pid} has been closed successfully.` });
                });
                alert(`File has been closes successfully.`);
              });
            });
        });
      })
      .on('error', (err) => {
        console.error('SSH Connection Error:', err);
        res.status(500).json({ success: false, message: 'Error connecting to SSH server.' });
      })
      .connect({
        host: host,
        port: 22,
        username: login,
        password: password,
      });
  });
  

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
