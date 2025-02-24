require('dotenv').config(); // Load variables from .env

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Set EJS as the view engine and define the views folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(express.json());

// adminRoutes
const adminRoutes = require('./routes/adminRoutes');
app.use('/', adminRoutes);

// Mount your API routes (for POST/PUT/DELETE)
const caseRoutes = require('./routes/caseRoutes');
app.use('/', caseRoutes);

// Importér dine site routes
const siteRoutes = require('./routes/siteRoutes');
app.use('/', siteRoutes);

/**
 * GET /
 * Dynamically render the home page by fetching all cases from MongoDB.
 */
app.get('/', async (req, res) => {
  try {
    const CaseModel = require('./models/Case');
    const cases = await CaseModel.find({});
    res.render('index', { cases });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send('Server error');
  }
});

/**
 * GET /cases/:caseName
 * Dynamically render an individual case page.
 * Note: We pass the case data as "caseData" (not "case") to avoid reserved-word conflicts.
 */
app.get('/cases/:caseName', async (req, res) => {
  try {
    const { caseName } = req.params;
    const CaseModel = require('./models/Case');
    const caseDoc = await CaseModel.findOne({ caseName });
    if (!caseDoc) {
      return res.status(404).send('Case not found');
    }
    res.render('casePage', { caseData: caseDoc });
  } catch (error) {
    console.error('Error rendering case page:', error);
    res.status(500).send('Server error');
  }
});

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});

