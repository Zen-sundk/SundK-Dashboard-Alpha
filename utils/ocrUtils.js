const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

function getPastelColor() {
  const r = 210 + Math.floor(Math.random() * 46);
  const g = 210 + Math.floor(Math.random() * 46);
  const b = 210 + Math.floor(Math.random() * 46);
  return `rgb(${r}, ${g}, ${b})`;
}

async function ocrTableImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'dan', // Danish language
      { logger: m => console.log(m) }
    );
    return text;
  } catch (error) {
    console.error("Error during OCR:", error);
    return "";
  }
}

/**
 * Merges tokens for table2 lines (e.g. "1" + "år" => "1 år", "Hazard" + "ratio" => "Hazard ratio", etc.).
 */
function mergeTable2Tokens(tokens) {
  const merged = [];
  for (let i = 0; i < tokens.length; i++) {
    let tk = tokens[i];
    if (i < tokens.length - 1) {
      // If we see "(\d+) år", merge them
      if (/^\d+$/.test(tk) && tokens[i + 1].toLowerCase() === "år") {
        tk = tk + " år";
        i++;
      }
      // If we see "hazard" + "ratio" => "Hazard ratio"
      else if (tk.toLowerCase() === "hazard" && tokens[i + 1].toLowerCase().startsWith("ratio")) {
        tk = "Hazard ratio";
        i++;
      }
      // If we see "justeret" + "hazard" => "Justeret hazard ratio**" possibly
      else if (tk.toLowerCase() === "justeret" && tokens[i + 1].toLowerCase().startsWith("hazard")) {
        let accum = tk;
        i++;
        // Merge next tokens until we find a numeric or run out
        while (i < tokens.length && !/^[\d]+(?:[.,]\d+)?$/.test(tokens[i])) {
          accum += " " + tokens[i];
          i++;
        }
        tk = accum;
        i--;
      }
    }
    merged.push(tk);
  }
  return merged;
}

/**
 * fixTable2Line:
 * Splits a line into tokens, merges known patterns, forces exactly 5 tokens,
 * then maps them to the columns array. Replaces '+' with '*' in tokens.
 */
function fixTable2Line(line, columns) {
  const expectedCount = columns.length; // Typically 5
  let tokens = line.split(/\s+/).filter(Boolean);

  // Merge known pairs/tokens
  tokens = mergeTable2Tokens(tokens);

  // If tokens > 5, merge from the left
  while (tokens.length > expectedCount) {
    tokens[0] = tokens[0] + " " + tokens[1];
    tokens.splice(1, 1);
  }
  // If tokens < 5, pad with empty
  while (tokens.length < expectedCount) {
    tokens.push("");
  }

  // Replace '+' with '*'
  tokens = tokens.map(t => t.replace(/\+/g, '*'));

  // Build row object
  const row = {};
  for (let i = 0; i < expectedCount; i++) {
    row[columns[i]] = tokens[i];
  }
  return row;
}

/**
 * parseTable2:
 * - Reads up to `maxRows` lines from the OCR output (default 6).
 * - If a line includes "Dødelighed, index", we create a row with a special flag `_singleCell: true`
 *   so the front-end can render it as a single cell (no numeric columns).
 * - All other lines are parsed normally using fixTable2Line => 5 columns.
 */
function parseTable2(tableText, overrideColumns, maxRows = 6) {
  const columns = overrideColumns || ["Overlevelse (%)", "2012-2014", "2015-2017", "2018-2020", "2021-2023"];

  // Split the text into lines, filter out extraneous lines
  let lines = tableText.split('\n')
    .map(ln => ln.trim())
    .filter(ln => ln.length > 0);

  // Filter out lines containing "Periode", "Overlevelse (%)", or date patterns
  lines = lines.filter(ln => {
    if (/^\(/.test(ln)) return false;
    if (/periode/i.test(ln)) return false;
    if (/overlevelse\s*\(%\)/i.test(ln)) return false;
    if (/\d{4}-\d{4}/.test(ln)) return false;
    return true;
  });

  const rows = [];
  for (let i = 0; i < lines.length && rows.length < maxRows; i++) {
    const line = lines[i];

    // If this line includes "Dødelighed, index", create a row with a single cell
    // (the first column "Overlevelse (%)") set to "Dødelighed, index:" 
    // and a special flag `_singleCell: true`. No numeric columns are added.
    if (/dødelighed,\s*index/i.test(line)) {
      let rowD = { _singleCell: true };
      rowD[columns[0]] = "Dødelighed, index:";
      rows.push(rowD);
    } else {
      // parse normally => 5 columns
      const normalRow = fixTable2Line(line, columns);
      rows.push(normalRow);
    }
  }

  return { columns, rows };
}

/**
 * parseSingleTable:
 * For table1 or table3 usage. Expects a certain number of rows (expectedRows).
 * Splits lines, filters out disclaimers, etc., and parses each line with parseRowForSingleTable.
 */
function parseSingleTable(tableText, overrideColumns, expectedRows) {
  const columns = overrideColumns || ["", "2012-2014", "2015-2017", "2018-2020", "2021-2023"];
  const groupSize = columns.length;

  let lines = tableText.split('\n')
    .map(ln => ln.trim())
    .filter(ln => ln.length > 0);

  // Filter out lines containing "Periode", date patterns, etc.
  lines = lines.filter(ln => {
    if (/^\(/.test(ln)) return false;
    if (/periode/i.test(ln)) return false;
    if (/\d{4}-\d{4}/.test(ln)) return false;
    return true;
  });

  // Take only the first expectedRows lines
  lines = lines.slice(0, expectedRows);

  const rowObjs = lines.map(ln => parseRowForSingleTable(ln, groupSize));
  // Pad with empty rows if needed
  while (rowObjs.length < expectedRows) {
    let emptyRow = {};
    for (let c = 0; c < groupSize; c++) {
      emptyRow[c] = "";
    }
    rowObjs.push(emptyRow);
  }

  // Build final structure
  const rows = rowObjs.map(r => {
    const row = {};
    row[columns[0]] = r[0] || "";
    for (let c = 1; c < groupSize; c++) {
      row[columns[c]] = r[c] || "";
    }
    return row;
  });

  return { columns, rows };
}

/**
 * parseRowForSingleTable:
 * Splits a line, collects numeric tokens from the right for (groupSize - 1), remainder is label.
 */
function parseRowForSingleTable(line, groupSize) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const numericPattern = /^[\d]+(?:[.,]\d+)?$/;
  let numbers = [];
  let i = tokens.length - 1;
  while (i >= 0 && numbers.length < (groupSize - 1)) {
    if (numericPattern.test(tokens[i])) {
      numbers.unshift(tokens[i]);
    }
    i--;
  }
  let label = tokens.slice(0, i + 1).join(" ").trim();
  // fix plus->asterisk
  label = label.replace(/\+/g, '*');

  while (numbers.length < (groupSize - 1)) {
    numbers.push("");
  }
  const rowObj = {};
  rowObj[0] = label;
  for (let j = 1; j < groupSize; j++) {
    rowObj[j] = numbers[j - 1];
  }
  return rowObj;
}

module.exports = {
  getPastelColor,
  ocrTableImage,
  parseSingleTable,
  parseTable2
};
