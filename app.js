// app.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY;


// User Registration
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      // Check if user exists
      const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Insert user
      const newUser = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, hashedPassword]
      );
      res.status(201).json({ message: 'User registered', user: newUser.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

  // User Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      // Retrieve user
      const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
      // Compare passwords
      const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
      if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });
      // Generate JWT
      const token = jwt.sign({ userId: user.rows[0].id }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

  // JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };
  

  // Create Registry
app.post('/registries', authenticateJWT, async (req, res) => {
    const { name } = req.body;
    try {
      const newRegistry = await db.query(
        'INSERT INTO registries (user_id, name) VALUES ($1, $2) RETURNING *',
        [req.userId, name]
      );
      res.status(201).json({ registry: newRegistry.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

  // Add Product to Registry
app.post('/registries/:registryId/products', authenticateJWT, async (req, res) => {
    const { registryId } = req.params;
    const { name, description, price } = req.body;
  
    try {
      // Check if registry belongs to user
      const registry = await db.query('SELECT * FROM registries WHERE id = $1 AND user_id = $2', [registryId, req.userId]);
      if (registry.rows.length === 0) return res.status(403).json({ message: 'Access denied' });
  
      // Generate Affiliate Link
      const affiliateLink = await generateAffiliateLink(name);
  
      // Insert Product
      const newProduct = await db.query(
        'INSERT INTO products (name, description, price, affiliate_link) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, price, affiliateLink]
      );
  
      // Map Product to Registry
      await db.query(
        'INSERT INTO registry_products (registry_id, product_id) VALUES ($1, $2)',
        [registryId, newProduct.rows[0].id]
      );
  
      res.status(201).json({ product: newProduct.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Affiliate Link Generation Function
async function generateAffiliateLink(productName) {
    // Integrate with actual affiliate API here
    // Placeholder implementation
    return `https://affiliate.example.com/?product=${encodeURIComponent(productName)}`;
  }
  

  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
  