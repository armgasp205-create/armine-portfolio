document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // THEME BUTTON
    // =========================

    const themeButton = document.getElementById("theme-toggle");

    themeButton.addEventListener("click", function () {

        document.body.classList.toggle("light-mode");

        if (document.body.classList.contains("light-mode")) {
            themeButton.textContent = "☀️";
        } else {
            themeButton.textContent = "🌙";
        }

    });


    // =========================
    // PERIOD SELECT
    // =========================

    const periodSelect = document.getElementById("period-select");

    periodSelect.addEventListener("change", function () {

        showToast("Selected: " + periodSelect.value);

    });


    // =========================
    // VIEW ALL
    // =========================

    const viewAll = document.getElementById("view-all");

    viewAll.addEventListener("click", function () {

        showToast("All orders opened");

    });


    // =========================
    // TOAST
    // =========================

    function showToast(message) {

        const toast = document.getElementById("toast");

        toast.textContent = message;

        toast.classList.add("show");

        setTimeout(function () {
            toast.classList.remove("show");
        }, 2500);

    }

});