document.addEventListener("DOMContentLoaded", function() {
  const openModalBtn = document.getElementById("openNewCaseModalBtn");
  const closeModalBtn = document.getElementById("closeNewCaseModalBtn");
  const newCaseModal = document.getElementById("newCaseModal");
  const newCaseForm = document.getElementById("newCaseForm");
  const modalTitle = newCaseModal.querySelector("h2");
  const submitBtn = newCaseForm.querySelector(".submit-btn");

  // Show the modal when the "Create New Case" button is clicked
  openModalBtn.addEventListener("click", function() {
    newCaseForm.reset();
    // Remove any edit-mode attributes if they exist
    newCaseForm.removeAttribute("data-mode");
    newCaseForm.removeAttribute("data-case");
    // Reset modal title and submit button text to "create" mode
    modalTitle.textContent = "New Case";
    submitBtn.textContent = "Create Case";
    newCaseModal.classList.add("active");
  });

  // Close the modal when clicking the close button
  closeModalBtn.addEventListener("click", function() {
    newCaseModal.classList.remove("active");
  });

  // Also close the modal if clicking outside the modal content
  window.addEventListener("click", function(e) {
    if (e.target === newCaseModal) {
      newCaseModal.classList.remove("active");
    }
  });

  // Intercept form submission for creation mode.
  // (When in edit mode, the editCaseModal.js script handles submission.)
  newCaseForm.addEventListener("submit", async function(e) {
    // If the form is in edit mode, do nothing here.
    if (newCaseForm.getAttribute("data-mode") === "edit") {
      return;
    }
    e.preventDefault();

    // Create a FormData object from the form.
    const formData = new FormData(newCaseForm);

    // Retrieve the admin token from localStorage.
    const token = localStorage.getItem("adminToken");

    try {
      const response = await fetch(newCaseForm.action, {
        method: newCaseForm.method,
        headers: {
          "X-Admin-Auth": token
          // Do not set "Content-Type" manually when sending FormData.
        },
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        newCaseModal.classList.remove("active");
        // Refresh the home page to display the new case
        window.location.href = "/";
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("Error creating case:", error);
      alert("An error occurred while creating the case.");
    }
  });
});
