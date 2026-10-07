document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("city-input"), button = document.getElementById("search-button");
    const status = document.getElementById("weather-status");
    const info = document.querySelector(".weather-info"), details = document.querySelector(".weather-details"), forecast = document.querySelector(".forecast-grid");
    let controller, request = 0;
    const set = (id, value) => document.getElementById(id).textContent = value;
    function condition(code) {
        if (code === 0) return ["☀️", "Clear sky"];
        if (code <= 3) return ["🌤️", "Partly cloudy"];
        if (code <= 48) return ["🌫️", "Fog"];
        if (code <= 67) return ["🌧️", "Rain / drizzle"];
        if (code <= 77) return ["❄️", "Snow"];
        if (code <= 82) return ["🌦️", "Rain showers"];
        if (code <= 86) return ["🌨️", "Snow showers"];
        return ["⛈️", "Thunderstorm"];
    }
    async function json(url, signal) {
        const response = await fetch(url, {signal});
        if (!response.ok) throw new Error("Weather service unavailable. Please try again.");
        return response.json();
    }
    async function search() {
        const city = input.value.trim();
        if (city.length < 2) {status.textContent = "Enter at least two letters of a city name."; input.focus(); return;}
        controller?.abort(); controller = new AbortController();
        const signal = controller.signal, id = ++request;
        const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), 15000);
        status.textContent = "Loading weather…"; button.textContent = "Loading…";
        document.querySelector(".weather-card").setAttribute("aria-busy", "true");
        info.hidden = details.hidden = true; forecast.replaceChildren();
        try {
            const geo = new URL("https://geocoding-api.open-meteo.com/v1/search");
            geo.search = new URLSearchParams({name: city, count: "1", language: "en", format: "json"});
            const places = await json(geo, signal);
            const place = places.results?.[0];
            if (!place) throw new Error("City not found. Check the name and try again.");
            const url = new URL("https://api.open-meteo.com/v1/forecast");
            url.search = new URLSearchParams({latitude: place.latitude, longitude: place.longitude, current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min", timezone: "auto", forecast_days: "5"});
            const data = await json(url, signal);
            if (!data.current || !Number.isFinite(data.current.temperature_2m) || !Array.isArray(data.daily?.time)) throw new Error("Incomplete weather data. Please try again.");
            if (id !== request) return;
            const weather = condition(data.current.weather_code);
            set("city-name", [place.name, place.admin1, place.country].filter(Boolean).join(", "));
            set("temperature", Math.round(data.current.temperature_2m) + "°C");
            set("weather-description", weather[1]); set("weather-icon", weather[0]);
            set("humidity", data.current.relative_humidity_2m + "%");
            set("wind", data.current.wind_speed_10m + " km/h");
            set("feels-like", Math.round(data.current.apparent_temperature) + "°C");
            data.daily.time.forEach((date, index) => {
                const card = document.createElement("div"); card.className = "forecast-card";
                const day = document.createElement("span"), icon = document.createElement("strong"), temperature = document.createElement("b");
                day.textContent = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {weekday: "short", day: "numeric"});
                icon.textContent = condition(data.daily.weather_code[index])[0]; icon.title = condition(data.daily.weather_code[index])[1];
                temperature.textContent = `${Math.round(data.daily.temperature_2m_max[index])}° / ${Math.round(data.daily.temperature_2m_min[index])}°`;
                card.append(day, icon, temperature); forecast.append(card);
            });
            info.hidden = details.hidden = false;
            status.textContent = `Updated: ${data.current.time.replace("T", " ")} (${data.timezone}). Source: Open-Meteo.`;
            try {localStorage.setItem("portfolio-weather-city", place.name);} catch {}
        } catch (error) {
            if (id === request) status.textContent = error.name === "AbortError" ? "Request timed out. Check your connection and try again." : error.message === "Failed to fetch" ? "Could not connect. Check your internet and try again." : error.message;
        } finally {
            clearTimeout(timeout);
            if (id === request) {button.textContent = "Search"; document.querySelector(".weather-card").setAttribute("aria-busy", "false");}
        }
    }
    button.addEventListener("click", search);
    input.addEventListener("keydown", event => {if (event.key === "Enter") {event.preventDefault(); search();}});
    const theme = document.getElementById("theme-toggle");
    function setTheme(light) {document.body.classList.toggle("light-mode", light); theme.textContent = light ? "☀️" : "🌙"; theme.setAttribute("aria-pressed", String(light)); theme.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");}
    try {setTheme(localStorage.getItem("portfolio-theme") === "light"); input.value = localStorage.getItem("portfolio-weather-city") || "Yerevan";} catch {setTheme(false); input.value = "Yerevan";}
    theme.addEventListener("click", () => {const light = !document.body.classList.contains("light-mode"); setTheme(light); try {localStorage.setItem("portfolio-theme", light ? "light" : "dark");} catch {}});
    search();
});
