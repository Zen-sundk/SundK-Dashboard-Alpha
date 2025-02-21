document.addEventListener("DOMContentLoaded", function() {
    let clickCount = 0;
    let clickTimeout;
    const logoImage = document.querySelector(".nav-logo img");
    
    if (logoImage) {
      logoImage.addEventListener("click", function() {
        clickCount++;
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => { clickCount = 0; }, 1000); // Reset count after 1 second
        if (clickCount >= 3) {
          clickCount = 0;
          document.getElementById("adminLoginModal").classList.add("active");
        }
      });
    }
    
    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const username = document.getElementById("adminUsername").value;
        const password = document.getElementById("adminPassword").value;
        
        try {
          const response = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
          });
          const result = await response.json();
          if (result.success) {
            alert(result.message);
            // Store the token in localStorage
            localStorage.setItem("adminToken", result.token);
            localStorage.setItem("isAdmin", "true");
            document.getElementById("adminLoginModal").classList.remove("active");
            document.querySelectorAll(".admin-only").forEach(el => {
              el.style.display = "block";
            });
            document.getElementById("adminLogout").style.display = "block";
          } else {
            alert("Incorrect username or password.");
          }
        } catch (error) {
          console.error("Admin login error:", error);
          alert("Error logging in as admin.");
        }
      });
    }
    
    // Close admin modal when clicking the close button.
    const closeAdminBtn = document.getElementById("closeAdminModalBtn");
    if (closeAdminBtn) {
      closeAdminBtn.addEventListener("click", function() {
        document.getElementById("adminLoginModal").classList.remove("active");
      });
    }
    
    // On page load, if admin flag is set, reveal admin-only elements.
    if (localStorage.getItem("isAdmin") === "true") {
      document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = "block";
      });
      document.getElementById("adminLogout").style.display = "block";
    }
    
    // Handle logout button click.
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function() {
        localStorage.removeItem("isAdmin");
        document.querySelectorAll(".admin-only").forEach(el => {
          el.style.display = "none";
        });
        document.getElementById("adminLogout").style.display = "none";
        alert("Logged out successfully.");
      });
    }
  });
  