// This file sets up a simple backend server using Node.js and Express.js.
// It provides a basic RESTful API for managing a list of items.

// Import the express library
// We need to use `require` because this is a standard Node.js environment.
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const technicianRoutes = require('./routes/technician');
const app = express();

// Set the port for the server to run on.
// The PORT is typically provided by the hosting environment, or we default to 3001.
const PORT = process.env.PORT || 3001;

// Middleware to enable CORS for frontend communication
app.use(cors());

// Middleware to parse JSON bodies from incoming requests.
// This is essential for handling POST and PUT requests.
app.use(express.json());

// Admin routes
app.use('/api/admin', adminRoutes);

// Technician routes
app.use('/api/technician', technicianRoutes);

// --- In-memory Data Store ---
// This is a simple array to act as our database for demonstration purposes.
// In a real-world application, you would connect to a database like PostgreSQL or MongoDB.
let items = [
    { id: 1, name: 'Item One', description: 'This is the first item.' },
    { id: 2, name: 'Item Two', description: 'This is the second item.' }
];

// --- API Routes ---

// GET /api/items
// This route retrieves all items from our data store.
app.get('/api/items', (req, res) => {
    console.log('GET request received for /api/items');
    res.json(items);
});

// GET /api/items/:id
// This route retrieves a single item by its ID.
app.get('/api/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const item = items.find(item => item.id === itemId);

    if (!item) {
        console.log(`Item with ID ${itemId} not found`);
        return res.status(404).send('Item not found.');
    }

    console.log(`GET request received for item with ID ${itemId}`);
    res.json(item);
});

// POST /api/items
// This route creates a new item. It expects a JSON body with 'name' and 'description'.
app.post('/api/items', (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        return res.status(400).send('Name and description are required.');
    }

    // Generate a new ID for the item.
    const newItem = {
        id: items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1,
        name,
        description
    };

    items.push(newItem);
    console.log('POST request received. New item created:', newItem);
    res.status(201).json(newItem);
});

// PUT /api/items/:id
// This route updates an existing item by its ID.
app.put('/api/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const item = items.find(item => item.id === itemId);

    if (!item) {
        return res.status(404).send('Item not found.');
    }

    const { name, description } = req.body;

    if (name) {
        item.name = name;
    }
    if (description) {
        item.description = description;
    }

    console.log(`PUT request received for item with ID ${itemId}. Updated item:`, item);
    res.json(item);
});

// DELETE /api/items/:id
// This route deletes an item by its ID.
app.delete('/api/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const initialLength = items.length;

    // Filter out the item to be deleted.
    items = items.filter(item => item.id !== itemId);

    if (items.length === initialLength) {
        return res.status(404).send('Item not found.');
    }

    console.log(`DELETE request received for item with ID ${itemId}.`);
    res.status(204).send(); // 204 No Content is a standard response for a successful DELETE.
});

// Start the server and listen for incoming requests.
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});