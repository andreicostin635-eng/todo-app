const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const nodemailer = require('nodemailer');
const nm = nodemailer.createTransport || nodemailer.default?.createTransport ? nodemailer : nodemailer.default;
const { ImapFlow } = require('imapflow');
const POP3Client = require('poplib');

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tododb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});

io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);
  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
  });
});

app.get('/tasks', async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY id');
  res.json(result.rows);
});

app.get('/tasks/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;
  const result = await pool.query(
    'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
    [title, description]
  );
  io.emit('task-created', result.rows[0]);
  res.status(201).json(result.rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const { title, description, done } = req.body;
  const result = await pool.query(
    'UPDATE tasks SET title=$1, description=$2, done=$3 WHERE id=$4 RETURNING *',
    [title, description, done, req.params.id]
  );
  io.emit('task-updated', result.rows[0]);
  res.json(result.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  io.emit('task-deleted', { id: req.params.id });
  res.json({ message: 'Deleted' });
});

app.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  const transporter = nm.createTransport({
    host: MAIL_HOST,
    port: 587,
    secure: false,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });
  try {
    await transporter.sendMail({ from: MAIL_USER, to, subject, text });
    res.json({ message: 'Письмо отправлено!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/check-imap', async (req, res) => {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    logger: false,
  });
  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });
    const messages = [];
    for await (const msg of client.fetch('1:5', { envelope: true })) {
      messages.push({
        id: msg.uid,
        subject: msg.envelope.subject,
        from: msg.envelope.from[0]?.address,
        date: msg.envelope.date,
      });
    }
    await client.logout();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/check-pop3', async (req, res) => {
  const client = new POP3Client(995, 'pop.gmail.com', {
    tlserrs: false,
    enabletls: true,
    debug: false
  });
  let messages = [];
  client.on('connect', () => { client.login(MAIL_USER, MAIL_PASS); });
  client.on('login', (status) => {
    if (status) { client.list(); }
    else { res.status(401).json({ error: 'Ошибка авторизации POP3' }); }
  });
  client.on('list', (status, msgcount) => {
    if (status && msgcount > 0) { client.retr(msgcount); }
    else { client.quit(); res.json({ message: 'Нет писем', count: 0 }); }
  });
  client.on('retr', (status, msgnumber, data) => {
    messages.push({ number: msgnumber, preview: data.substring(0, 200) });
    client.quit();
  });
  client.on('quit', () => { res.json(messages); });
  client.on('error', (err) => { res.status(500).json({ error: err.message }); });
});

server.listen(3000, () => console.log('Backend running on port 3000'));