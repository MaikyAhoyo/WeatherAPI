export default async function handler(request, response) {
  const { lat, lon, type } = request.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const endpoint = type === "forecast" ? "forecast" : "weather";
  const url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=es`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return response.status(200).json(data);
  } catch (error) {
    return response
      .status(500)
      .json({ error: "Fallo al conectar con OpenWeather" });
  }
}
