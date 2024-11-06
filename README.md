# Chrome Extension: Product Registry

## Overview
This Chrome Extension allows users to easily add products from any online store to their personal registry. Users can search for products, view product details, and save them to a central registry for future reference. The extension seamlessly interacts with an API backend to handle user authentication, and product information storage.

## Features
- Browse and select products from any online store.
- Display product information (name, image, price, description) in a popup.
- Save products to a personal registry with a simple click.
- Search bar and filters to find products efficiently.
- User dashboard to manage saved products (edit/delete).

## Tech Stack
- **Frontend (Chrome Extension):** JavaScript, HTML, CSS
- **Backend:** Node.js with Express, PostgreSQL
- **API Communication:** RESTful APIs using Fetch API
- **Authentication:** JWT-based
- **Cloud Services:** AWS (EC2, RDS, S3) for backend and database deployment

# Chrome Extension Frontend Setup

## 1. Setting Up the Frontend in Chrome Extension

### Directory Structure
Ensure the following key files are in place:
- `popup.html`: Main HTML file for the extension's UI
- `style.css`: Contains styles for the UI components
- `script.js`: Handles UI interactions and functionality (scraping, navigation)
- `manifest.json`: Registers the popup and other required permissions for the extension

Organize files into folders:
- `/assets/css` for styles
- `/assets/js` for scripts

### Manifest File Configuration
In manifest.json, configure the popup and permissions:
```json
{
    "manifest_version": 3,
    "name": "Product Scraper",
    "version": "1.0",
    "description": "Scrapes and saves product data from online stores.",
    "action": {
        "default_popup": "popup.html",
        "default_icon": "icon.png"
    },
    "permissions": ["activeTab", "storage"]
}
```

### Adding Event Listeners
In script.js, add event listeners for:
- UI elements like buttons (e.g., "More Information" and dropdown options)
- Handling storage interactions

## 2. Major Functional Points

### Product Scraping
- On detecting an online store homepage, the script scrapes product data
- Stores data under each store's URL

### Dropdown Navigation
- Home: Displays all global products
- See Your Registry: Displays products saved under the current store's URL

### Data Caching
- Uses chrome.storage.local to cache scraped data by URL
- Prevents duplicate fetches

### Modal for Product Details
- Displays more information when the "More Information" button is clicked

## 3. Sample User Flow

1. Install the extension from the Chrome Web Store or load it as an unpacked extension
2. Open an online store website
3. Click the extension icon in Chrome to open the UI (popup.html)
4. The extension scrapes product data and displays it in the UI
   - Each product appears in a card format with options for viewing details
5. Click "More Information" for expanded product details in a modal
6. Use the dropdown menu to switch between "Home" and "See Your Registry" views to access global or store-specific products


# Backend Setup

This repository contains the backend code for a registry platform, allowing users to create personal registries, add products from any online store, and manage them via a Chrome extension. The backend provides RESTful APIs for user authentication, product management, registry management, and integrates with affiliate APIs for link generation.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Testing the API](#testing-the-api)
- [CORS Configuration](#cors-configuration)
- [Known Bugs and Issues](#known-bugs-and-issues)
- [Critical Improvements](#critical-improvements)
- [License](#license)

## Features
- **User Authentication**: Secure user registration and login using JWT-based authentication
- **Registry Management**: Create and manage personal registries
- **Product Management**: Add products to registries, including product details from any online store
- **Affiliate Integration**: Generate affiliate links for added products
- **RESTful APIs**: Provides endpoints for all functionalities
- **Database Interaction**: Uses PostgreSQL for data persistence
- **Security**: Implements best practices for handling authentication and sensitive data
- **CORS Support**: Configurable Cross-Origin Resource Sharing

## Tech Stack
- Node.js with Express.js: Backend server and API development
- PostgreSQL: Relational database for storing user, registry, and product information
- JWT (JSON Web Tokens): For secure authentication and session management
- pg: PostgreSQL client for Node.js
- bcrypt: Library for hashing passwords
- cors: Middleware for enabling CORS
- dotenv: For managing environment variables

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- PostgreSQL (v10 or higher)
- Git (for cloning the repository)

## Installation and Setup

### Clone the Repository
```bash
git clone https://github.com/emerssive/Chrome-Extension.git
cd registry-backend
```

### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Create a `.env` file in the root directory and add:
```env
# Server Configuration
PORT=3000

# Database Configuration
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=registry_db

# JWT Secret Key
JWT_SECRET=your_jwt_secret_key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Affiliate API Keys (if applicable)
AFFILIATE_API_KEY=your_affiliate_api_key
```

### Database Setup

1. **Start PostgreSQL Service**
   Ensure PostgreSQL service is running on your machine.

2. **Create the Database**
   ```sql
   psql -U postgres
   CREATE DATABASE registry_db;
   \q
   ```

3. **Create Tables**
   ```sql
   psql -U postgres -d registry_db

   -- Users Table
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(50) NOT NULL,
     email VARCHAR(100) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Registries Table
   CREATE TABLE registries (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     name VARCHAR(100) NOT NULL,
     description TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Products Table
   CREATE TABLE products (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     description TEXT,
     price NUMERIC(10, 2),
     image_url TEXT,
     rating NUMERIC(3, 2),
     review_count INTEGER,
     product_url TEXT,
     store_url VARCHAR(255),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Registry Items Table
   CREATE TABLE registry_items (
     id SERIAL PRIMARY KEY,
     registry_id INTEGER REFERENCES registries(id) ON DELETE CASCADE,
     product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
     quantity INTEGER DEFAULT 1,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   \q
   ```

## Running the Application
```bash
# Standard start
node app.js

# Development with auto-restart
nodemon app.js
```
The server will run on http://localhost:3000

## API Endpoints
Refer to the code for detailed information on API endpoints, or access the API documentation if provided.

## Testing the API
Use curl, Postman, or any API testing tool to interact with the endpoints.

Example using curl:
```bash
curl -X GET http://localhost:3000/registries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## CORS Configuration
```javascript
const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
```

## Known Bugs and Issues
1. **Token Verification Issue**
   - Issue: Middleware not handling Bearer prefix correctly
   - Solution: Update verifyToken middleware

2. **Unauthorized Access to Delete Endpoint**
   - Issue: DELETE /products/:productId lacks authentication
   - Impact: Security risk for unauthorized deletion
   - Recommendation: Implement authorization checks

3. **Insufficient Error Handling**
   - Issue: Incomplete error handling and validation
   - Recommendation: Implement express-validator

4. **CORS Misconfiguration**
   - Issue: Potentially too permissive
   - Recommendation: Restrict to trusted origins

5. **No Rate Limiting**
   - Issue: Susceptible to brute-force attacks
   - Recommendation: Implement express-rate-limit

Additional issues include lack of logging, password hashing parameters, SQL injection risks, missing automated tests, inconsistent API responses, and hardcoded values.

## Critical Improvements
1. **Role-Based Access Control (RBAC)**
   - Introduce user and admin roles
   - Restrict sensitive operations

2. **Enhanced Security**
   - Token expiration and refresh
   - Input sanitization
   - HTTPS enforcement

3. **Error Handling and Validation**
   - Implement express-validator
   - Improve error messages

4. **Performance and Monitoring**
   - Add rate limiting
   - Implement logging
   - Set up monitoring tools

5. **Testing**
   - Add automated tests

6. **Database and Scalability**
   - Optimize database operations
   - Prepare for horizontal scaling
   - Implement caching

7. **User Features**
   - Email verification
   - Password reset functionality




