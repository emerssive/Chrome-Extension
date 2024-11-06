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


## Frontend Setup 

1. Setting Up the Frontend in Chrome Extension 
<tab>
    **Directory Structure:**
        Ensure the following key files are in place:
            **popup.html:** Main HTML file for the extension’s UI.
            **style.css:** Contains styles for the UI components.
            **script.js:** Handles UI interactions and functionality (scraping, navigation).
            **manifest.json:** Registers the popup and other required permissions for the extension.
        Organize files into folders, e.g., /assets/css for styles and /assets/js for scripts.
        <tab>
    **Manifest File Configuration:**
        In manifest.json, configure the popup and permissions:
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
        <tab>
    **Adding Event Listeners:**
        In script.js, add event listeners for UI elements like buttons (e.g., "More Information" and dropdown options) and for handling storage interactions.
        <tab>
**2. Major Functional Points**
<tab>
    Product Scraping: On detecting an online store homepage, the script scrapes product data, storing it under each store’s URL.
    Dropdown Navigation:
        Home: Displays all global products.
        See Your Registry: Displays products saved under the current store’s URL.
    Data Caching: Uses chrome.storage.local to cache scraped data by URL, preventing duplicate fetches.
    Modal for Product Details: Displays more information when the "More Information" button is clicked.
    <br>
**3. Sample User Flow**
<tab>
    **Step 1**: Install the extension from the Chrome Web Store or load it as an unpacked extension.
     **Step 2:** Open an online store website.
     **Step 3** Click the extension icon in Chrome to open the UI (popup.html).
     **Step 4** The extension scrapes product data and displays it in the UI. Each product appears in a card format with options for viewing details.
     **Step 5** Click "More Information" for expanded product details in a modal.
     **Step 6** Use the dropdown menu to switch between "Home" and "See Your Registry" views to access global or store-specific products.







