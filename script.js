const searchInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const errorMessage = document.getElementById("error-message");
const weatherContainer = document.getElementById("weather-container");
const loadingIndicator = document.getElementById("loading");
const cityNameEl = document.getElementById("city-name");
const dateEl = document.getElementById("date");
const tempEl = document.getElementById("temperature");
const descEl = document.getElementById("description");
const iconEl = document.getElementById("weather-icon");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("wind-speed");
const pressureEl = document.getElementById("pressure");
const suggestionsList = document.getElementById("suggestions-list");

let activitiesData = null;
let debounceTimer;

searchBtn.addEventListener("click", () => {
  const city = searchInput.value;
  if (city) {
    handleSearch(city);
  }
});

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();

  clearTimeout(debounceTimer);

  if (query.length > 2) {
    debounceTimer = setTimeout(() => {
      fetchSuggestions(query);
    }, 500);
  } else {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
  }
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    clearTimeout(debounceTimer);
    const city = searchInput.value;
    if (city) {
      handleSearch(city);
    }
  }
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
    suggestionsList.classList.add("hidden");
  }
});

async function loadActivities() {
  try {
    const response = await fetch("./activities.json");
    activitiesData = await response.json();
  } catch (error) {
    console.error("Error cargando actividades:", error);
  }
}

async function fetchSuggestions(query) {
  try {
    const apiKey = config.apiKey;
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`,
    );

    if (!response.ok) throw new Error("Error fetching suggestions");

    const cities = await response.json();
    renderSuggestions(cities);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
  }
}

function renderSuggestions(cities) {
  suggestionsList.innerHTML = "";

  if (cities.length === 0) {
    suggestionsList.classList.add("hidden");
    return;
  }

  cities.forEach((city) => {
    const li = document.createElement("li");
    li.className =
      "px-6 py-3 cursor-pointer hover:bg-white/40 transition-colors text-gray-800 border-b border-white/20 last:border-0";

    const state = city.state ? `, ${city.state}` : "";
    li.textContent = `${city.name}${state}, ${city.country}`;

    li.addEventListener("click", () => {
      searchInput.value = `${city.name}, ${city.country}`;
      suggestionsList.classList.add("hidden");
      fetchWeather(city.lat, city.lon, city.name);
    });

    suggestionsList.appendChild(li);
  });

  suggestionsList.classList.remove("hidden");
}

async function fetchWeather(lat, lon, name) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      loadingIndicator.classList.remove("hidden");
      weatherContainer.classList.add("hidden");
      errorMessage.classList.add("hidden");

      const apiKey = config.apiKey;
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=es`,
      );

      if (!weatherResponse.ok) throw new Error("Servidor no disponible");

      const weatherData = await weatherResponse.json();
      weatherData.name = name;

      updateUI(weatherData);
      loadingIndicator.classList.add("hidden");
      weatherContainer.classList.remove("hidden");

      return;
    } catch (error) {
      console.warn(`Intento ${attempt} fallido. Reintentando...`);

      if (attempt === MAX_RETRIES) {
        loadingIndicator.classList.add("hidden");
        errorMessage.textContent =
          "No pudimos conectar con el servidor tras varios intentos. Revisa tu conexión.";
        errorMessage.classList.remove("hidden");
      } else {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
}

async function handleSearch(query) {
  try {
    errorMessage.classList.add("hidden");
    await fetchSuggestions(query);
  } catch (error) {
    console.error(error);
  }
}

function updateUI(data) {
  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  tempEl.textContent = `${Math.round(data.main.temp)}°`;
  descEl.textContent = data.weather[0].description;
  humidityEl.textContent = `${data.main.humidity}%`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  windSpeedEl.textContent = `${data.wind.speed} km/h`;

  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  const now = new Date();
  const options = { weekday: "long", day: "numeric", month: "long" };
  dateEl.textContent = now.toLocaleDateString("es-ES", options);

  const activitiesContainer = document.getElementById("activities-container");

  const mainWeather = data.weather[0].main;
  const isDay = data.weather[0].icon.includes("d");
  const timeKey = isDay ? "day" : "night";

  const currentData =
    activitiesData.weather_activities[mainWeather] ||
    activitiesData.weather_activities["Clear"];
  const selection = currentData[timeKey];

  activitiesContainer.innerHTML = selection.tasks
    .map(
      (task) => `
    <div class="flex items-center gap-4 bg-white/20 p-3 rounded-2xl hover:bg-white/30 transition-all cursor-default group">
      <div class="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        <i class="fa-solid ${task.icon} text-black/70"></i>
      </div>
      <span class="text-sm font-medium text-black/80">${task.activity}</span>
    </div>
  `,
    )
    .join("");
}

loadActivities();
