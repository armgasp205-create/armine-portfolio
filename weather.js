document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // THEME
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
    // WEATHER DATA
    // =========================

    const weatherData = {

        yerevan: {
            city: "Yerevan",
            temperature: "24°C",
            description: "Partly Cloudy",
            icon: "🌤️",
            humidity: "55%",
            wind: "12 km/h",
            feelsLike: "23°C"
        },

        gyumri: {
            city: "Gyumri",
            temperature: "20°C",
            description: "Sunny",
            icon: "☀️",
            humidity: "48%",
            wind: "10 km/h",
            feelsLike: "19°C"
        },

        cairo: {
            city: "Cairo",
            temperature: "32°C",
            description: "Sunny",
            icon: "☀️",
            humidity: "35%",
            wind: "15 km/h",
            feelsLike: "34°C"
        },

        london: {
            city: "London",
            temperature: "17°C",
            description: "Cloudy",
            icon: "☁️",
            humidity: "70%",
            wind: "14 km/h",
            feelsLike: "16°C"
        },

        paris: {
            city: "Paris",
            temperature: "21°C",
            description: "Clear Sky",
            icon: "🌤️",
            humidity: "52%",
            wind: "9 km/h",
            feelsLike: "20°C"
        }

    };


    // =========================
    // SEARCH
    // =========================

    const cityInput = document.getElementById("city-input");
    const searchButton = document.getElementById("search-button");

    searchButton.addEventListener("click", searchCity);

    cityInput.addEventListener("keydown", function (event) {

        if (event.key === "Enter") {
            searchCity();
        }

    });


    function searchCity() {

        const city = cityInput.value.trim().toLowerCase();

        if (city === "") {
            showToast("Enter a city name");
            return;
        }

        if (weatherData[city]) {

            const data = weatherData[city];

            document.getElementById("city-name").textContent = data.city;
            document.getElementById("temperature").textContent = data.temperature;
            document.getElementById("weather-description").textContent = data.description;
            document.getElementById("weather-icon").textContent = data.icon;
            document.getElementById("humidity").textContent = data.humidity;
            document.getElementById("wind").textContent = data.wind;
            document.getElementById("feels-like").textContent = data.feelsLike;

            showToast("Weather updated");

        } else {

            showToast("City not found");

        }

    }


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