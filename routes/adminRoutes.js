const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const valid = await admin.verifyPassword(password);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      // For demonstration, we simply return the ADMIN_SECRET.
      // In production, generate a proper token (like JWT).
      return res.json({ success: true, message: 'Admin login successful', token: process.env.ADMIN_SECRET });
    } catch (error) {
      console.error("Error in admin login:", error);
      return res.status(500).json({ success: false, message: 'Server error during admin login' });
    }
  });
  module.exports = router;