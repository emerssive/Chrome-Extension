# Chrome Extention Backend

The backend branch of this repository contains the backend code for a registry platform, allowing users to create personal registries, add products from any online store, and manage them via a Chrome extension. The backend provides RESTful APIs for user authentication, product management, registry management, and integrates with affiliate APIs for link generation.

## Features

- User Authentication: Secure user registration and login using JWT-based authentication.

- Registry Management: Create and manage personal registries.

- Product Management: Add products to registries, including product details from any online store.

- RESTful APIs: Provides endpoints for all functionalities, enabling integration with frontend applications and extensions.

- Database Interaction: Uses PostgreSQL for data persistence.

- Security: Implements best practices for handling authentication and sensitive data.
CORS Support: Configurable Cross-Origin Resource Sharing to allow requests from specified origins.

## Tech Stack

- Node.js with Express.js: Backend server and API development.

- PostgreSQL: Relational database for storing user, registry, and product information.

- JWT (JSON Web Tokens): For secure - authentication and session management.

- pg: PostgreSQL client for Node.js.
bcrypt: Library for hashing passwords.

- cors: Middleware for enabling CORS.

- dotenv: For managing environment variables.