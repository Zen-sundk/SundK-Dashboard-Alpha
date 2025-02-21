document.addEventListener("DOMContentLoaded", function() {
  const graphModal = document.getElementById("graphModal");
  const graphModalContent = document.getElementById("graphModalContent");
  const closeGraphModal = document.getElementById("closeGraphModal");

  // Add click listeners to all graph images
  const graphs = document.querySelectorAll(".graph-img");
  graphs.forEach(graph => {
    graph.addEventListener("click", function(e) {
      e.stopPropagation();
      console.log("Graph clicked. InnerHTML:", this.innerHTML);
      if (graphModalContent && graphModal) {
        // Set the modal content to the clicked graph's HTML
        graphModalContent.innerHTML = this.innerHTML;
        graphModal.classList.add("active");
      }
    });
  });

  // Close the graph modal when clicking the close button
  if (closeGraphModal && graphModal) {
    closeGraphModal.addEventListener("click", function(e) {
      e.stopPropagation();
      graphModal.classList.remove("active");
      graphModalContent.innerHTML = "";
    });
  }

  // Close the graph modal if clicking outside the modal-content
  if (graphModal) {
    graphModal.addEventListener("click", function(e) {
      if (e.target === graphModal) {
        graphModal.classList.remove("active");
        graphModalContent.innerHTML = "";
      }
    });
  }
});
