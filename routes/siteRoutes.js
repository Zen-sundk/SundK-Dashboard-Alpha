const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

// Multer til filupload (logo)
const upload = multer({ dest: 'uploads/' });

// Importér SiteLogo modellen
const SiteLogo = require('../models/SiteLogo');

/**
 * POST /admin/logo
 * (Protected) Upload eller opdater site-logoet.
 * Forvent en fil med feltet "logo" fra formularen.
 */
router.post('/admin/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Ingen logo-fil fundet' });
    }
    // Læs filen som Buffer
    const logoBuffer = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path); // Fjern midlertidig fil

    // Find eksisterende logo-dokument (vi antager, at der kun er ét)
    let siteLogo = await SiteLogo.findOne({});
    if (!siteLogo) {
      siteLogo = new SiteLogo();
    }
    siteLogo.logo.data = logoBuffer;
    siteLogo.logo.contentType = req.file.mimetype;
    await siteLogo.save();

    return res.status(200).json({ success: true, message: 'Logo uploaded/updated successfully.' });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return res.status(500).json({ success: false, message: 'Server error uploading logo' });
  }
});

/**
 * GET /site/logo
 * Hent og send site-logoet fra MongoDB med korrekt Content-Type.
 */
router.get('/site/logo', async (req, res) => {
  try {
    const siteLogo = await SiteLogo.findOne({});
    if (!siteLogo || !siteLogo.logo || !siteLogo.logo.data) {
      return res.status(404).send("Logo not found");
    }
    res.contentType(siteLogo.logo.contentType);
    res.send(siteLogo.logo.data);
  } catch (error) {
    console.error("Error retrieving logo:", error);
    res.status(500).send("Server error retrieving logo");
  }
});

module.exports = router;
