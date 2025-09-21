const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const billingRoutes = require('./routes/billing');
const networkRoutes = require('./routes/network');
const tenantAuthRoutes = require('./routes/tenantAuth');
const captivePortalRoutes = require('./routes/captivePortal');
const networkControlRoutes = require('./routes/networkControl');
const hotspotRoutes = require('./routes/hotspot');
const networkControl = require('./services/networkControl');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true); // Allow all origins for development
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware with IP detection
app.use((req, res, next) => {
  // Get real IP address
  let clientIP = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] ||
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 req.ip || 
                 'unknown';
  
  // Clean up IP address
  if (clientIP.includes(',')) {
    clientIP = clientIP.split(',')[0].trim();
  }
  if (clientIP.includes('::ffff:')) {
    clientIP = clientIP.replace('::ffff:', '');
  }
  if (clientIP === '::1') {
    clientIP = '127.0.0.1';
  }
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${clientIP}`);
  
  // Log mobile device access
  const userAgent = req.get('User-Agent') || '';
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent) && clientIP.startsWith('192.168.137.')) {
    console.log(`📱 Mobile device access: ${clientIP} - ${req.path}`);
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/tenant-auth', tenantAuthRoutes);
app.use('/api/captive-portal', captivePortalRoutes);
app.use('/api/network-control', networkControlRoutes);
app.use('/api/hotspot', hotspotRoutes);

// Captive Portal Detection Routes (MUST be before static files)
app.get('/generate_204', captivePortalRoutes); // Android
app.get('/hotspot-detect.html', captivePortalRoutes); // iOS
app.get('/connecttest.txt', captivePortalRoutes); // Windows
app.get('/ncsi.txt', captivePortalRoutes); // Windows NCSI

// Captive Portal Routes (must be before API routes to catch all traffic)
app.use('/', captivePortalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'LinkNest MDU Backend'
  });
});

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  clients.add(ws);
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to LinkNest WebSocket server',
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'subscribe':
          // Handle subscription to specific events
          ws.subscriptions = data.events || [];
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast function for real-time updates
const broadcast = (data) => {
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Export broadcast function for use in routes
app.locals.broadcast = broadcast;

// Simulate real-time updates (for demo purposes)
setInterval(() => {
  const updates = [
    {
      type: 'network_update',
      data: {
        activeConnections: Math.floor(Math.random() * 50) + 10,
        networkLoad: (Math.random() * 100).toFixed(2),
        timestamp: new Date().toISOString()
      }
    },
    {
      type: 'tenant_activity',
      data: {
        event: 'connection_change',
        tenantId: Math.floor(Math.random() * 10) + 1,
        status: Math.random() > 0.5 ? 'online' : 'offline',
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  // Send random update
  if (Math.random() > 0.7) {
    broadcast(updates[Math.floor(Math.random() * updates.length)]);
  }
}, 5000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`
    ╔════════════════════════════════════════╗
    ║                                        ║
    ║     LinkNest MDU Backend Server       ║
    ║                                        ║
    ╠════════════════════════════════════════╣
    ║  Server running on port ${PORT}          ║
    ║  WebSocket server ready                ║
    ║  Database: ${process.env.DB_NAME}              ║
    ║  Network Control: Initializing...     ║
    ╚════════════════════════════════════════╝
  `);
  
  // Initialize Network Control Service
  try {
    await networkControl.initialize();
    console.log('🌐 Network Control Service ready!');
  } catch (error) {
    console.error('⚠️ Network Control initialization failed:', error.message);
    console.log('📊 Running in simulation mode');
  }
});
