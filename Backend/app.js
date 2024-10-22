require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    next();
  });
};

// User registration
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Get user profile
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Create a registry
app.post('/registries', verifyToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO registries (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, name, description]
    );
    res.status(201).json({ message: 'Registry created successfully', registryId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error creating registry' });
  }
});

// Get all registries for a user
app.get('/registries', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, created_at FROM registries WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching registries' });
  }
});

// Get specific registry by ID
app.get('/registries/:registryId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.description, r.created_at, 
              COUNT(ri.id) as item_count, 
              COALESCE(SUM(ri.quantity), 0) as total_items
       FROM registries r 
       LEFT JOIN registry_items ri ON r.id = ri.registry_id 
       WHERE r.id = $1 AND r.user_id = $2 
       GROUP BY r.id`,
      [req.params.registryId, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching registry details' });
  }
});

// Add product to registry
app.post('/registry-items', verifyToken, async (req, res) => {
  const { registryId, productId, quantity } = req.body;
  try {
    // First verify the registry belongs to the user
    const registryCheck = await pool.query(
      'SELECT id FROM registries WHERE id = $1 AND user_id = $2',
      [registryId, req.userId]
    );
    
    if (registryCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Registry not found or unauthorized' });
    }
    
    const result = await pool.query(
      'INSERT INTO registry_items (registry_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING id',
      [registryId, productId, quantity]
    );
    res.status(201).json({ message: 'Product added to registry', registryItemId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error adding product to registry' });
  }
});

// Get all items in a registry
app.get('/registry-items/:registryId', verifyToken, async (req, res) => {
  try {
    // First verify the registry belongs to the user
    const registryCheck = await pool.query(
      'SELECT id FROM registries WHERE id = $1 AND user_id = $2',
      [req.params.registryId, req.userId]
    );
    
    if (registryCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Registry not found or unauthorized' });
    }
    
    const result = await pool.query(
      `SELECT ri.id, ri.product_id, ri.quantity, ri.created_at, 
              p.name, p.description, p.price, p.image_url
       FROM registry_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.registry_id = $1
       ORDER BY ri.created_at DESC`,
      [req.params.registryId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching registry items' });
  }
});

// Get specific registry item
app.get('/registry-items/:registryId/:itemId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ri.id, ri.product_id, ri.quantity, ri.created_at,
              p.name, p.description, p.price, p.image_url
       FROM registry_items ri
       JOIN products p ON ri.product_id = p.id
       JOIN registries r ON ri.registry_id = r.id
       WHERE ri.id = $1 AND ri.registry_id = $2 AND r.user_id = $3`,
      [req.params.itemId, req.params.registryId, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registry item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching registry item details' });
  }
});

// Search registries
app.get('/search/registries', verifyToken, async (req, res) => {
  const { query } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at 
       FROM registries 
       WHERE user_id = $1 
       AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY created_at DESC`,
      [req.userId, `%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error searching registries' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});