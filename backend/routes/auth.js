const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET || 'default-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Check if admin exists
router.get('/admin-exists', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM admins');
    const adminExists = parseInt(result.rows[0].count) > 0;
    res.json({ exists: adminExists });
  } catch (error) {
    console.error('Error checking admin existence:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin signup (only if no admin exists)
router.post('/admin-signup', [
  body('username').isLength({ min: 3 }).trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if admin already exists
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Admin account already exists' });
    }

    const { username, password } = req.body;
    
    // Hash password - but for mock database, use MOCK: prefix
    let passwordHash;
    const isMockDB = process.env.USE_MOCK_DB === 'true' || process.env.DB_PASSWORD === '123456';
    
    if (isMockDB) {
      // For mock database, store password with MOCK: prefix
      passwordHash = 'MOCK:' + password;
    } else {
      // For real database, use bcrypt
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }
    
    // Create admin
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, passwordHash]
    );
    
    const admin = result.rows[0];
    const token = generateToken(admin);
    
    res.status(201).json({
      message: 'Admin account created successfully',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin login
router.post('/admin-login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password } = req.body;
    
    // Find admin
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    
    // Check password - handle mock database differently
    let isMatch = false;
    
    // Check if we're using mock database (password_hash starts with 'MOCK:')
    if (admin.password_hash && admin.password_hash.startsWith('MOCK:')) {
      // For mock database, compare plain text
      const mockPassword = admin.password_hash.replace('MOCK:', '');
      isMatch = password === mockPassword;
    } else {
      // For real database, use bcrypt
      isMatch = await bcrypt.compare(password, admin.password_hash);
    }
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(admin);
    
    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current admin info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, created_at FROM admins WHERE id = $1',
      [req.adminId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({ admin: result.rows[0] });
  } catch (error) {
    console.error('Error fetching admin info:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
