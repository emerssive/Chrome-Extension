require('dotenv').config();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error executing test query', err.stack);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});


// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  
  const tokenParts = authHeader.split(' ');
  if (tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
    return res.status(403).json({ error: 'Malformed token' });
  }
  
  const token = tokenParts[1];
  
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

// Save a product
app.post('/products', async (req, res) => {
  const { name, description, price, image_url, rating, review_count, product_url, store_url } = req.body;
  try {
    // Validate required fields
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, image_url, rating, review_count, product_url, store_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [name, description, price, image_url, rating, review_count, product_url, store_url]
    );
    res.status(201).json({ message: 'Product created successfully', productId: result.rows[0].id });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: 'Error saving product' });
  }
});

// Fetch products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Delete a product
// Delete a product without token verification
app.delete('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    // Check if the product exists
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the product is associated with any registry items
    const registryItemResult = await pool.query('SELECT * FROM registry_items WHERE product_id = $1', [productId]);
    if (registryItemResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete product; it is associated with registry items' });
    }

    // Delete the product
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});



//API documentation
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // Specifies the version of OpenAPI
    info: {
      title: 'Registry API',
      version: '1.0.0',
      description: 'API documentation for the Registry application',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Replace with your server URL
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {          // Defines the security scheme used for JWT
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['app.js'], // Points to the file(s) containing annotations
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Users
 *     requestBody:
 *       description: User registration data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 userId:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Error registering user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in a user
 *     tags:
 *       - Users
 *     requestBody:
 *       description: User login credentials
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: JWT token
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error logging in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */


/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []       // Indicates this endpoint requires authentication
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: john_doe
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: john@example.com
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2021-01-01T00:00:00.000Z'
 *       401:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error fetching profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /registries:
 *   post:
 *     summary: Create a new registry
 *     tags:
 *       - Registries
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Registry data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wedding Gifts
 *               description:
 *                 type: string
 *                 example: A registry for our wedding
 *     responses:
 *       201:
 *         description: Registry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registry created successfully
 *                 registryId:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Error creating registry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /registries:
 *   get:
 *     summary: Get all registries for the authenticated user
 *     tags:
 *       - Registries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of registries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Registry'
 *       500:
 *         description: Error fetching registries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /registries/{registryId}:
 *   get:
 *     summary: Get a specific registry by ID
 *     tags:
 *       - Registries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the registry
 *     responses:
 *       200:
 *         description: Registry details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistryDetails'
 *       404:
 *         description: Registry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error fetching registry details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /registry-items:
 *   post:
 *     summary: Add a product to a registry
 *     tags:
 *       - Registry Items
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Product details to add to the registry
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registryId
 *               - productId
 *               - quantity
 *             properties:
 *               registryId:
 *                 type: integer
 *                 example: 10
 *               productId:
 *                 type: integer
 *                 example: 5
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Product added to registry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product added to registry
 *                 registryItemId:
 *                   type: integer
 *                   example: 15
 *       403:
 *         description: Unauthorized or registry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error adding product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /registry-items/{registryId}:
 *   get:
 *     summary: Get all items in a registry
 *     tags:
 *       - Registry Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the registry
 *     responses:
 *       200:
 *         description: List of registry items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RegistryItem'
 *       403:
 *         description: Registry not found or unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error fetching registry items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /registry-items/{registryId}/{itemId}:
 *   get:
 *     summary: Get a specific registry item
 *     tags:
 *       - Registry Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the registry
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the registry item
 *     responses:
 *       200:
 *         description: Registry item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistryItem'
 *       404:
 *         description: Registry item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error fetching registry item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /search/registries:
 *   get:
 *     summary: Search registries
 *     tags:
 *       - Registries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query string
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Registry'
 *       500:
 *         description: Error searching registries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
