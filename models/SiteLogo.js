const mongoose = require('mongoose');
const { Schema } = mongoose;

const siteLogoSchema = new Schema({
  // Logo gemmes som en Buffer med sin contentType
  logo: {
    data: { type: Buffer, default: null },
    contentType: { type: String, default: "" }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SiteLogo', siteLogoSchema);
