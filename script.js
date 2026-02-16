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

searchBtn.addEventListener("click", () => {
  const city = searchInput.value;
  if (city) {
    fetchWeather(city);
  }
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = searchInput.value;
    if (city) {
      fetchWeather(city);
    }
  }
});

async function fetchWeather(city) {
  try {
    loadingIndicator.classList.remove("hidden");
    weatherContainer.classList.add("hidden");
    errorMessage.classList.add("hidden");

    const apiKey = config.apiKey;

    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`,
    );

    if (!geoResponse.ok) throw new Error("Error en la red al buscar la ciudad");
    const geoData = await geoResponse.json();

    if (geoData.length === 0) throw new Error("Ciudad no encontrada");

    const { lat, lon, name, country } = geoData[0];

    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=es`,
    );

    if (!weatherResponse.ok) throw new Error("Error al obtener el clima");
    const weatherData = await weatherResponse.json();

    weatherData.name = name;
    weatherData.sys.country = country;

    updateUI(weatherData);
    loadingIndicator.classList.add("hidden");
    weatherContainer.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    loadingIndicator.classList.add("hidden");
    errorMessage.textContent = error.message;
    errorMessage.classList.remove("hidden");
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
}
