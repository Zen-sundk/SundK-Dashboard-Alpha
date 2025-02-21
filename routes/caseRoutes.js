const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer config: files go to `uploads/` temporarily
const upload = multer({ dest: 'uploads/' });

const {
  ocrTableImage,
  parseSingleTable,
  parseTable2
} = require('../utils/ocrUtils');

// Mongoose model
const CaseModel = require('../models/Case');

/**
 * Middleware: isAdmin
 * Checks that the request contains the correct admin token in header "X-Admin-Auth".
 */
function isAdmin(req, res, next) {
  if (req.headers['x-admin-auth'] === process.env.ADMIN_SECRET) {
    next();
  } else {
    return res.status(403).json({ error: 'Unauthorized: Admin credentials required' });
  }
}

/**
 * POST /createCase
 * (Protected) Uploads 3 SVG graphs, op til 3 table-billeder, og 2 PDF-filer.
 * Kører OCR på table-billeder, gemmer SVG-indhold i DB, samt opretter case i MongoDB.
 */
router.post(
  '/createCase',
  isAdmin,
  upload.fields([
    { name: 'graph1', maxCount: 1 },
    { name: 'graph2', maxCount: 1 },
    { name: 'graph3', maxCount: 1 },
    { name: 'tableImage1', maxCount: 1 },
    { name: 'tableImage2', maxCount: 1 },
    { name: 'tableImage3', maxCount: 1 },
    { name: 'pdf1', maxCount: 1 },
    { name: 'pdf2', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { caseName, displayTitle, synopsis } = req.body;
      if (!caseName || !displayTitle) {
        return res.status(400).json({ success: false, message: 'Missing caseName or displayTitle' });
      }

      // Rens/trim inputs
      const _displayTitle = displayTitle.trim() || caseName;
      const _synopsis = synopsis ? synopsis.trim() : 'No synopsis provided.';

      // --------------------------------------
      // 1) Processér SVG-filer (flyt ikke filen, men læs indhold)
      // --------------------------------------
      const svgGraphs = { graph1: '', graph2: '', graph3: '' };

      if (req.files.graph1) {
        const svgPath = req.files.graph1[0].path;
        svgGraphs.graph1 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath); // slet temp-fil
      }
      if (req.files.graph2) {
        const svgPath = req.files.graph2[0].path;
        svgGraphs.graph2 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath);
      }
      if (req.files.graph3) {
        const svgPath = req.files.graph3[0].path;
        svgGraphs.graph3 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath);
      }

      // --------------------------------------
      // 2) Processér table-billeder (OCR)
      // --------------------------------------
      const tablesData = {
        table1: { columns: [], rows: [], title: "Periode for incidens" },
        table2: { columns: [], rows: [], title: "Periode for follow-up" },
        table3: { columns: [], rows: [], title: "Periode for dødsfald" }
      };

      // tableImage1 => parseSingleTable
      if (req.files.tableImage1) {
        const tablePath = req.files.tableImage1[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseSingleTable(
          recognizedText,
          ["", "2012-2014", "2015-2017", "2018-2020", "2021-2023"],
          6
        );
        tablesData.table1 = { ...parsedTable, title: "Periode for incidens" };
        fs.unlinkSync(tablePath);
      }

      // tableImage2 => parseTable2
      if (req.files.tableImage2) {
        const tablePath = req.files.tableImage2[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseTable2(
          recognizedText,
          ["Overlevelse (%)", "2012-2014", "2015-2017", "2018-2020", "2021-2023"]
        );
        tablesData.table2 = { ...parsedTable, title: "Periode for follow-up" };
        fs.unlinkSync(tablePath);
      }

      // tableImage3 => parseSingleTable
      if (req.files.tableImage3) {
        const tablePath = req.files.tableImage3[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseSingleTable(
          recognizedText,
          ["", "2012-2014", "2015-2017", "2018-2020", "2021-2022"],
          6
        );
        tablesData.table3 = { ...parsedTable, title: "Periode for dødsfald" };
        fs.unlinkSync(tablePath);
      }

      // --------------------------------------
      // 3) Flyt de to PDF-filer (hvis de findes) til case-mappen
      //    og gem deres stier i DB (valgfrit).
      // --------------------------------------
      const pdfPaths = {};
      if (req.files.pdf1) {
        // Read PDF file as Buffer (do not specify encoding)
        const pdf1Buffer = fs.readFileSync(req.files.pdf1[0].path);
        fs.unlinkSync(req.files.pdf1[0].path);
        pdfPaths.pdf1 = pdf1Buffer;
      }
      if (req.files.pdf2) {
        const pdf2Buffer = fs.readFileSync(req.files.pdf2[0].path);
        fs.unlinkSync(req.files.pdf2[0].path);
        pdfPaths.pdf2 = pdf2Buffer;
      }

      // --------------------------------------
      // 4) Opret og gem case i DB
      // --------------------------------------
      const newCase = new CaseModel({
        caseName,
        displayTitle: _displayTitle,
        synopsis: _synopsis,
        tablesData,
        svgGraphs,
        pdfPaths
      });
      
      await newCase.save();

      return res.status(201).json({
        success: true,
        message: `Case "${caseName}" has been created!`
      });

    } catch (error) {
      console.error('Error in /createCase route:', error);
      return res.status(500).json({ success: false, message: 'Server error creating case' });
    }
  }
);

/**
 * GET /api/case/:caseName
 * Retrieve a case document from MongoDB.
 * This route converts stored PDF buffers into URLs for client consumption.
 */
router.get('/api/case/:caseName', async (req, res) => {
  try {
    const { caseName } = req.params;
    let caseDoc = await CaseModel.findOne({ caseName });
    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found in DB' });
    }
    // Convert the Mongoose document to a plain object.
    caseDoc = caseDoc.toObject();
    // If pdfPaths exist, add URLs and remove the raw Buffer data.
    if (caseDoc.pdfPaths) {
      caseDoc.pdfPaths.pdf1Url = `/pdf/${caseName}/pdf1`;
      caseDoc.pdfPaths.pdf2Url = `/pdf/${caseName}/pdf2`;
      delete caseDoc.pdfPaths.pdf1;
      delete caseDoc.pdfPaths.pdf2;
    }
    return res.json(caseDoc);
  } catch (error) {
    console.error('Error retrieving case data:', error);
    return res.status(500).json({ error: 'Server error retrieving case data' });
  }
});

/* Route for the pdf */
router.get('/pdf/:caseName/:pdfKey', async (req, res) => {
  try {
    const { caseName, pdfKey } = req.params; // pdfKey should be "pdf1" or "pdf2"
    const caseDoc = await CaseModel.findOne({ caseName });
    if (!caseDoc || !caseDoc.pdfPaths || !caseDoc.pdfPaths[pdfKey]) {
      return res.status(404).send("PDF not found");
    }
    res.set('Content-Type', 'application/pdf');
    res.send(caseDoc.pdfPaths[pdfKey]);
  } catch (error) {
    console.error("Error retrieving PDF:", error);
    res.status(500).send("Server error retrieving PDF");
  }
});

/**
 * PUT /api/case/:caseName
 * (Protected) Update an existing case in MongoDB.
 * This endpoint handles file updates for SVGs, table images, and PDF files.
 * New files (SVG, table, or PDF) replace the old data.
 */
router.put(
  '/api/case/:caseName',
  isAdmin,
  upload.fields([
    { name: 'graph1', maxCount: 1 },
    { name: 'graph2', maxCount: 1 },
    { name: 'graph3', maxCount: 1 },
    { name: 'tableImage1', maxCount: 1 },
    { name: 'tableImage2', maxCount: 1 },
    { name: 'tableImage3', maxCount: 1 },
    { name: 'pdf1', maxCount: 1 },
    { name: 'pdf2', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { caseName } = req.params;
      // Fetch the current document.
      const currentCase = await CaseModel.findOne({ caseName });
      if (!currentCase) {
        return res.status(404).json({ error: 'Case not found in DB' });
      }

      // Start with JSON fields from req.body (for text updates)
      let updatedData = { ...req.body };

      // --- Process SVG Files ---
      const currentSVG = currentCase.svgGraphs || {};
      const newSVG = {};
      if (req.files.graph1 && req.files.graph1.length > 0) {
        const svgPath = req.files.graph1[0].path;
        newSVG.graph1 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath);
      }
      if (req.files.graph2 && req.files.graph2.length > 0) {
        const svgPath = req.files.graph2[0].path;
        newSVG.graph2 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath);
      }
      if (req.files.graph3 && req.files.graph3.length > 0) {
        const svgPath = req.files.graph3[0].path;
        newSVG.graph3 = fs.readFileSync(svgPath, 'utf-8');
        fs.unlinkSync(svgPath);
      }
      updatedData.svgGraphs = { ...currentSVG, ...newSVG };

      // --- Process Table Images ---
      const currentTables = currentCase.tablesData || {
        table1: { columns: [], rows: [], title: "Periode for incidens" },
        table2: { columns: [], rows: [], title: "Periode for follow-up" },
        table3: { columns: [], rows: [], title: "Periode for dødsfald" }
      };
      const newTables = {};
      if (req.files.tableImage1 && req.files.tableImage1.length > 0) {
        const tablePath = req.files.tableImage1[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseSingleTable(
          recognizedText,
          ["", "2012-2014", "2015-2017", "2018-2020", "2021-2023"],
          6
        );
        newTables.table1 = { ...parsedTable, title: "Periode for incidens" };
        fs.unlinkSync(tablePath);
      }
      if (req.files.tableImage2 && req.files.tableImage2.length > 0) {
        const tablePath = req.files.tableImage2[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseTable2(
          recognizedText,
          ["Overlevelse (%)", "2012-2014", "2015-2017", "2018-2020", "2021-2023"]
        );
        newTables.table2 = { ...parsedTable, title: "Periode for follow-up" };
        fs.unlinkSync(tablePath);
      }
      if (req.files.tableImage3 && req.files.tableImage3.length > 0) {
        const tablePath = req.files.tableImage3[0].path;
        const recognizedText = await ocrTableImage(tablePath);
        const parsedTable = parseSingleTable(
          recognizedText,
          ["", "2012-2014", "2015-2017", "2018-2020", "2021-2022"],
          6
        );
        newTables.table3 = { ...parsedTable, title: "Periode for dødsfald" };
        fs.unlinkSync(tablePath);
      }
      updatedData.tablesData = { ...currentTables, ...newTables };

      // --- Process PDF Files ---
      const currentPDF = currentCase.pdfPaths || {};
      const newPDF = {};
      if (req.files.pdf1 && req.files.pdf1.length > 0) {
        const pdf1Buffer = fs.readFileSync(req.files.pdf1[0].path);
        fs.unlinkSync(req.files.pdf1[0].path);
        newPDF.pdf1 = pdf1Buffer;
      }
      if (req.files.pdf2 && req.files.pdf2.length > 0) {
        const pdf2Buffer = fs.readFileSync(req.files.pdf2[0].path);
        fs.unlinkSync(req.files.pdf2[0].path);
        newPDF.pdf2 = pdf2Buffer;
      }
      updatedData.pdfPaths = { ...currentPDF, ...newPDF };

      // Update the document in MongoDB.
      const updatedCase = await CaseModel.findOneAndUpdate(
        { caseName },
        updatedData,
        { new: true }
      );
      if (!updatedCase) {
        return res.status(404).json({ error: 'Case not found in DB' });
      }
      return res.json({ success: true, updatedCase });
    } catch (error) {
      console.error('Error updating case:', error);
      return res.status(500).json({ error: 'Server error updating case' });
    }
  }
);

/**
 * DELETE /api/case/:caseName
 * (Protected) Remove the case document from MongoDB.
 */
router.delete('/api/case/:caseName', isAdmin, async (req, res) => {
  try {
    const { caseName } = req.params;
    const deletedCase = await CaseModel.findOneAndDelete({ caseName });
    if (!deletedCase) {
      return res.status(404).json({ error: 'Case not found in DB' });
    }
    return res.json({ success: true, deletedCase });
  } catch (error) {
    console.error('Error deleting case:', error);
    return res.status(500).json({ error: 'Server error deleting case' });
  }
});

module.exports = router;
