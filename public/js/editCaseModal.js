document.addEventListener("DOMContentLoaded", function() {
  async function openEditModal(caseName) {
    try {
      // Use the correct endpoint: /api/case/:caseName
      const response = await fetch(`/api/case/${encodeURIComponent(caseName)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch case data");
      }
      const data = await response.json();
      console.log("Fetched case data:", data);
      
      const modal = document.getElementById("newCaseModal");
      const modalTitle = modal.querySelector("h2");
      const form = document.getElementById("newCaseForm");

      // Pre-populate text fields.
      form.caseName.value = data.caseName; // Optionally disable this input if you don't want editing.
      form.displayTitle.value = data.displayTitle || "";
      form.synopsis.value = data.synopsis || "";
      
      // Populate the SVG file name fields (if you have them as read-only inputs)
      if (data.svgGraphs) {
        const g1Field = document.getElementById("graph1Name");
        const g2Field = document.getElementById("graph2Name");
        const g3Field = document.getElementById("graph3Name");
        if (g1Field) g1Field.value = data.svgGraphs.graph1 ? "graph1.svg" : "";
        if (g2Field) g2Field.value = data.svgGraphs.graph2 ? "graph2.svg" : "";
        if (g3Field) g3Field.value = data.svgGraphs.graph3 ? "graph3.svg" : "";
      }
      
      // Set the form into "edit" mode.
      form.setAttribute("data-mode", "edit");
      form.setAttribute("data-case", data.caseName);

      // Change modal title and submit button text.
      modalTitle.textContent = "Edit Case";
      const submitBtn = form.querySelector(".submit-btn");
      if (submitBtn) {
        submitBtn.textContent = "Update Case";
      }
      
      // Remove the 'required' attribute from file inputs (for editing)
      const fileInputs = form.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        input.removeAttribute("required");
      });

      // Show the modal.
      modal.classList.add("active");
    } catch (error) {
      console.error("Error opening edit modal:", error);
      alert("Error loading case data for editing.");
    }
  }

  // Expose openEditModal globally so it can be called from caseActions.js or inline.
  window.openEditModal = openEditModal;

  // Intercept form submission in edit mode.
  const form = document.getElementById("newCaseForm");
  form.addEventListener("submit", async function(e) {
    if (form.getAttribute("data-mode") === "edit") {
      e.preventDefault();
      const caseName = form.getAttribute("data-case");
      
      // Create a FormData object from the form to include text and file inputs.
      const formData = new FormData(form);
      
      // Retrieve the admin token from localStorage.
      const token = localStorage.getItem("adminToken");

      try {
        // Use the correct endpoint for updating: /api/case/:caseName
        const response = await fetch(`/api/case/${encodeURIComponent(caseName)}`, {
          method: "PUT",
          headers: {
            "X-Admin-Auth": token  // Add the admin token header
          },
          body: formData // Let the browser set the Content-Type header for FormData
        });
        const result = await response.json();
        if (result.success) {
          alert("Case updated successfully.");
          document.getElementById("newCaseModal").classList.remove("active");
        } else {
          alert("Error updating case: " + (result.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Error updating case:", error);
        alert("An error occurred while updating the case.");
      }
    }
    // Otherwise, allow normal form submission for new case creation.
  });
});
