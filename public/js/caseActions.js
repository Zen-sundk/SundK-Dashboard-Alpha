document.addEventListener('DOMContentLoaded', () => {
  // Navigate to case details when clicking on a case-box (unless clicking on an admin action)
  document.querySelectorAll('.case-box').forEach(box => {
    box.addEventListener('click', (e) => {
      if (e.target.closest('.case-actions')) return;
      const caseName = box.getAttribute('data-case');
      // Update the URL to point to the dynamic route instead of a static HTML file.
      window.location.href = `/cases/${caseName}`;
    });
  });

  // Attach event listener for edit icons.
  document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const caseBox = e.target.closest('.case-box');
      const caseName = caseBox.getAttribute('data-case');
      if (typeof openEditModal === 'function') {
        openEditModal(caseName);
      } else {
        console.error('openEditModal is not defined.');
      }
    });
  });

  // Attach event listener for delete icons.
  document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const caseBox = e.target.closest('.case-box');
      const caseName = caseBox.getAttribute('data-case');
      if (confirm(`Are you sure you want to delete case "${caseName}"?`)) {
        try {
          // Retrieve the admin token from localStorage.
          const token = localStorage.getItem("adminToken");
          const response = await fetch(`/api/case/${encodeURIComponent(caseName)}`, {
            method: 'DELETE',
            headers: {
              "X-Admin-Auth": token
            }
          });
          const result = await response.json();
          if (result.success) {
            caseBox.remove();
          } else {
            alert('Error deleting case: ' + (result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error deleting case:', error);
          alert('An error occurred while deleting the case.');
        }
      }
    });
  });
});
