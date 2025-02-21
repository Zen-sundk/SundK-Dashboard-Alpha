document.addEventListener("DOMContentLoaded", function() {
    const pdfModal = document.getElementById("pdfModal");
    if (!pdfModal) {
      // If pdfModal is not present (e.g., on homepage), exit the script.
      return;
    }
    
    const pdfViewer = document.getElementById("pdfViewer");
    const downloadLink = document.getElementById("downloadPdfLink");
    const closePdfModal = document.getElementById("closePdfModal");
    
    // Extract caseName from the URL (assuming URL is like /cases/<caseName>)
    const pathParts = window.location.pathname.split('/');
    const caseName = pathParts[pathParts.length - 1] || "UnknownCase";
    
    // Event listener for "Vis Tabel 1" button
    const viewTableBtn = document.getElementById("viewTableBtn");
    if (viewTableBtn) {
      viewTableBtn.addEventListener("click", function(e) {
        e.preventDefault();
        // Use the GET route that serves PDFs from the database
        const pdfPath = `/pdf/${caseName}/pdf1`;
        pdfViewer.src = pdfPath;
        downloadLink.href = pdfPath;
        pdfModal.classList.add("active");
      });
    }
    
    // Event listener for "Vis Tekst" button
    const viewTextBtn = document.getElementById("viewTextBtn");
    if (viewTextBtn) {
      viewTextBtn.addEventListener("click", function(e) {
        e.preventDefault();
        // Use the GET route that serves PDFs from the database
        const pdfPath = `/pdf/${caseName}/pdf2`;
        pdfViewer.src = pdfPath;
        downloadLink.href = pdfPath;
        pdfModal.classList.add("active");
      });
    }
    
    // Close modal on click of close button
    closePdfModal.addEventListener("click", function() {
      pdfModal.classList.remove("active");
      pdfViewer.src = "";
    });
    
    // Close modal if clicking outside the modal-content
    pdfModal.addEventListener("click", function(e) {
      if (e.target === pdfModal) {
        pdfModal.classList.remove("active");
        pdfViewer.src = "";
      }
    });
  });
  