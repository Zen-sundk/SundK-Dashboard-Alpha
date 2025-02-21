const mongoose = require('mongoose');
const { Schema } = mongoose;

const caseSchema = new Schema({
  caseName: {
    type: String,
    required: true,
    unique: true
  },
  displayTitle: {
    type: String,
    required: true
  },
  synopsis: {
    type: String,
    default: ""
  },
  // The entire table data (including columns, rows, titles)
  tablesData: {
    type: Schema.Types.Mixed, // or Object
    default: {}
  },
  // We store the actual text content of each SVG
  svgGraphs: {
    graph1: { type: String, default: "" },
    graph2: { type: String, default: "" },
    graph3: { type: String, default: "" }
  },
  // Store PDF paths
  pdfPaths: {
    pdf1: { type: Buffer, default: null },
    pdf2: { type: Buffer, default: null }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Case', caseSchema);
