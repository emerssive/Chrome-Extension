// app.js
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

// Add product to registry
app.post('/registry-items', verifyToken, async (req, res) => {
  const { registryId, productId, quantity } = req.body;
  try {
    // Generate affiliate link (mock implementation)
    //const affiliateLink = await generateAffiliateLink(productId);

    const result = await pool.query(
      'INSERT INTO registry_items (registry_id, product_id, quantity, affiliate_link) VALUES ($1, $2, $3, $4) RETURNING id',
      [registryId, productId, quantity, affiliateLink]
    );
    res.status(201).json({ message: 'Product added to registry', registryItemId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error adding product to registry' });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});