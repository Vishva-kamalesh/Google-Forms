require('dotenv').config();

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const responseRoutes = require('./routes/responses');
const analyticsRoutes = require('./routes/analytics');

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/formbuilder';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Core middleware
app.use(helmet());
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:3001'], // Allow both default ports
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Rate limiting for auth and responses
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});

const responsesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});

app.use('/api/auth', authLimiter);
app.use('/api/responses', responsesLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:3001'], // Allow both default ports
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Collaboration namespace
const collaborationNamespace = io.of('/collaboration');

collaborationNamespace.on('connection', (socket) => {
  socket.on('join-form', (formId) => {
    if (!formId) return;
    socket.join(formId);
    collaborationNamespace.to(formId).emit('user-joined', {
      formId,
      socketId: socket.id,
    });
  });

  socket.on('form-update', ({ formId, updates, userId, timestamp }) => {
    if (!formId || !updates) return;
    socket.to(formId).emit('form-updated', {
      formId,
      updates,
      updatedBy: userId || null,
      timestamp: timestamp || Date.now(),
    });
  });

  socket.on('cursor-move', ({ formId, position, userId, timestamp }) => {
    if (!formId || !position) return;
    socket.to(formId).emit('cursor-moved', {
      formId,
      position,
      userId: userId || null,
      timestamp: timestamp || Date.now(),
    });
  });
});

// Analytics namespace
const analyticsNamespace = io.of('/analytics');

analyticsNamespace.on('connection', (socket) => {
  socket.on('join-analytics', (formId) => {
    if (!formId) return;
    socket.join(`analytics-${formId}`);
  });
});

// Make sockets available to routes
app.set('io', io);
app.set('analyticsNamespace', analyticsNamespace);

// Mongo connection and server start
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
