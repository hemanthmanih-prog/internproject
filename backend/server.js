const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./config/db');
const loanRoutes = require('./routes/loanRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// API Routes
app.use('/api', loanRoutes);

// Catch-all for HTML navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Start Server and Initialize Database
async function startServer() {
  // Attempt MySQL initialization
  console.log('🔄 Connecting to MySQL Database...');
  const connected = await initDB();
  if (connected) {
    console.log('✅ Connected to MySQL successfully! Tables and seed data prepared.');
  } else {
    console.warn('⚠️  MySQL could not connect with current .env credentials.');
    console.warn('👉 Please update DB_PASSWORD in your .env file and restart the server.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Loan Application System running at http://localhost:${PORT}`);
  });
}

startServer();
