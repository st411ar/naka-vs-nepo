const acc = document.querySelectorAll(".accordion");

acc.forEach(button => {
    button.addEventListener("click", () => {
        const panel = button.nextElementSibling;

        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    });
});
