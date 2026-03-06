const express = require('express');
const cors = require('cors');
const geminiRoutes = require('./routes/gemini');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/gemini', geminiRoutes);

// Health check route
app.get('/', (req, res) => {
    res.send('Quanta Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
