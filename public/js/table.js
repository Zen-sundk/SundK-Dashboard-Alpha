// Initialize the table data on the case page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1) Extract the caseName from the current URL
    // e.g. /cases/Cancer20346 => "Cancer20346"
    const pathParts = window.location.pathname.split('/');
    // pathParts might be ["", "cases", "Cancer20346"]
    const caseName = pathParts[2];

    // 2) Fetch the case data from the server
    const response = await fetch(`/api/case/${caseName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch case data for ${caseName}`);
    }
    const caseData = await response.json();

    // 3) Grab tablesData from the returned JSON
    const tablesData = caseData.tablesData;

    // 4) Create tables if they exist
    if (tablesData) {
      if (tablesData.table1) createTable('table1', tablesData.table1);
      if (tablesData.table2) createTable('table2', tablesData.table2);
      if (tablesData.table3) createTable('table3', tablesData.table3);
    }
  } catch (error) {
    console.error('Error loading table data:', error);
  }
});

function createTable(containerId, tableData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear any previous content in the container
  container.innerHTML = "";

  // If a title is provided, add it above the table.
  if (tableData.title) {
    const titleEl = document.createElement("h3");
    titleEl.textContent = tableData.title;
    titleEl.style.textAlign = "center"; // optional styling
    container.appendChild(titleEl);
  }

  // Build the table
  const table = document.createElement("table");

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  (tableData.columns || []).forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");
  (tableData.rows || []).forEach(row => {
    const tr = document.createElement("tr");
    (tableData.columns || []).forEach(col => {
      const td = document.createElement("td");
      td.textContent = row[col] || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}
