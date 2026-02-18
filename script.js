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
const forecastSection = document.getElementById("forecast-section");
const forecastContainer = document.getElementById("forecast-container");
const activitiesSection = document.getElementById("activities-section");
const activitiesContainer = document.getElementById("activities-container");
const suggestionsList = document.getElementById("suggestions-list");
const favoritesContainer = document.getElementById("favorites-container");
const favoritesSection = document.getElementById("favorites-section");
const recentContainer = document.getElementById("recent-container");
const recentSection = document.getElementById("recent-section");

let favorites = JSON.parse(localStorage.getItem("weather_favorites")) || [];
let recentSearches = JSON.parse(localStorage.getItem("weather_recent")) || [];
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
    console.error(error);
  }
}

function saveToLocalStorage() {
  localStorage.setItem("weather_favorites", JSON.stringify(favorites));
  localStorage.setItem("weather_recent", JSON.stringify(recentSearches));
  renderQuickAccess();
}

function addToRecent(city) {
  recentSearches = [
    city,
    ...recentSearches.filter((c) => c.name !== city.name),
  ].slice(0, 5);
  saveToLocalStorage();
}

function toggleFavorite(city) {
  const index = favorites.findIndex((c) => c.name === city.name);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(city);
  }
  saveToLocalStorage();
}

function renderQuickAccess() {
  if (recentSearches.length > 0) {
    recentSection.classList.remove("hidden");
    recentContainer.innerHTML = recentSearches
      .map(
        (city) => `
        <button onclick="loadWeatherData(${city.lat}, ${city.lon}, '${city.name}')"
                class="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-full transition-all flex items-center gap-1">
            <i class="fa-solid fa-clock-rotate-left opacity-50"></i> ${city.name}
        </button>
    `,
      )
      .join("");
  } else {
    recentSection.classList.add("hidden");
  }

  if (favorites.length > 0) {
    favoritesSection.classList.remove("hidden");
    favoritesContainer.innerHTML = favorites
      .map(
        (city) => `
        <button onclick="loadWeatherData(${city.lat}, ${city.lon}, '${city.name}')"
                class="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full transition-all border border-yellow-200 font-medium">
            ${city.name}
        </button>
    `,
      )
      .join("");
  } else {
    favoritesSection.classList.add("hidden");
  }
}

async function fetchSuggestions(query) {
  try {
    const response = await fetch(
      `/api/weather?q=${encodeURIComponent(query)}&type=geo`,
    );

    if (!response.ok) throw new Error("Error fetching suggestions");

    const cities = await response.json();
    renderSuggestions(cities);
  } catch (error) {
    console.error(error);
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
      const cityData = { name: city.name, lat: city.lat, lon: city.lon };
      searchInput.value = `${city.name}, ${city.country}`;
      suggestionsList.classList.add("hidden");

      addToRecent(cityData);
      loadWeatherData(city.lat, city.lon, city.name);
    });

    suggestionsList.appendChild(li);
  });

  suggestionsList.classList.remove("hidden");
}

async function handleSearch(query) {
  try {
    errorMessage.classList.add("hidden");
    await fetchSuggestions(query);
  } catch (error) {
    console.error(error);
  }
}

async function loadWeatherData(lat, lon, name) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  loadingIndicator.classList.remove("hidden");
  weatherContainer.classList.add("hidden");
  forecastSection.classList.add("hidden");
  activitiesSection.classList.add("hidden");
  errorMessage.classList.add("hidden");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`/api/weather?lat=${lat}&lon=${lon}&type=weather`),
        fetch(`/api/weather?lat=${lat}&lon=${lon}&type=forecast`),
      ]);

      if (!weatherRes.ok || !forecastRes.ok)
        throw new Error("Servidores no disponibles");

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();
      weatherData.name = name;

      renderWeather(weatherData);
      renderForecast(forecastData);

      loadingIndicator.classList.add("hidden");
      weatherContainer.classList.remove("hidden");
      return;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        loadingIndicator.classList.add("hidden");
        errorMessage.textContent = "Error de conexión. Intenta de nuevo.";
        errorMessage.classList.remove("hidden");
      } else {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
}

function renderWeather(data) {
  const isFav = favorites.find((c) => c.name === data.name);

  cityNameEl.innerHTML = `
        ${data.name}
        <button id="fav-btn" class="ml-2 text-2xl transition-transform hover:scale-125 focus:outline-none">
            <i class="${
              isFav ? "fa-solid" : "fa-regular"
            } fa-star text-yellow-400"></i>
        </button>
    `;

  tempEl.textContent = `${Math.round(data.main.temp)}°`;
  descEl.textContent = data.weather[0].description;
  humidityEl.textContent = `${data.main.humidity}%`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  windSpeedEl.textContent = `${data.wind.speed} km/h`;
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  const newFavBtn = document.getElementById("fav-btn");
  newFavBtn.onclick = () => {
    toggleFavorite({
      name: data.name,
      lat: data.coord.lat,
      lon: data.coord.lon,
    });
    renderWeather(data);
  };

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  renderActivities(data);
}

function renderForecast(data) {
  forecastSection.classList.remove("hidden");

  const dailyData = data.list.filter((item) =>
    item.dt_txt.includes("12:00:00"),
  );

  forecastContainer.innerHTML = dailyData
    .map(
      (item) => `
    <div class="flex items-center justify-between bg-white/20 p-4 rounded-2xl hover:bg-white/30 transition-all">
      <div class="flex flex-col">
        <span class="font-bold capitalize">
          ${new Date(item.dt * 1000).toLocaleDateString("es-ES", {
            weekday: "long",
          })}
        </span>
        <span class="text-xs text-black/50">
          ${new Date(item.dt * 1000).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xl font-bold">${Math.round(item.main.temp)}°</span>
        <img
          src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png"
          alt="icon"
          class="w-10 h-10"
        >
      </div>
    </div>
  `,
    )
    .join("");
}

function renderActivities(data) {
  const mainWeather = data.weather[0].main;
  const isDay = data.weather[0].icon.includes("d");
  const timeKey = isDay ? "day" : "night";

  const currentData =
    activitiesData.weather_activities[mainWeather] ||
    activitiesData.weather_activities["Clear"];
  const selection = currentData[timeKey];
  activitiesSection.classList.remove("hidden");

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

async function init() {
  await loadActivities();
  renderQuickAccess();
}

init();
