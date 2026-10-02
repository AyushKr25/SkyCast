<div align="center">

# 🌤️ SkyCast — Real-Time Weather Dashboard

**A beautiful, glassmorphic weather dashboard with live conditions, hourly & 7-day forecasts, air quality, sun & moon tracking — powered entirely by free Open-Meteo APIs. No API keys required.**

**🔗 Live demo: [skycast20.netlify.app](https://skycast20.netlify.app/)**

</div>

---

## ✨ Features

| | |
|---|---|
| 🌡️ **Real-time weather** | Live temperature, feels-like, humidity, wind, pressure, dew point, visibility & cloud cover |
| 🕐 **Hourly forecast** | Next 24 hours with icons, temperatures & rain probability |
| 📅 **7-day forecast** | Daily highs/lows with expandable details (rain total, wind, precipitation chance) |
| 🍃 **Air Quality page** | US + European AQI with color-coded scale and PM2.5, PM10, O₃, NO₂, SO₂ & CO readings |
| 🌙 **Sun & Moon** | Animated sun-arc showing the day's progress, plus moon phase & illumination |
| 🧭 **Wind compass** | Live wind direction on an animated compass, with gusts |
| 🔔 **Smart alerts** | Auto-derived advisories for storms, heavy rain, heat, frost, high UV & poor air |
| 🗺️ **Maps page** | Full OpenStreetMap view with coordinates, timezone & elevation details |
| 🔍 **City search** | Instant autocomplete search across 100,000+ places worldwide |
| 📍 **Geolocation** | One-tap "Use My Location" with reverse geocoding |
| 🌗 **°C / °F toggle** | Switch units instantly — preference is remembered |
| 🌞 **Day & night mode** | Auto theme that follows sunrise/sunset at your location, or manual light/dark |
| 🎨 **Dynamic hero scenes** | Animated rain, snow, thunder & sky backdrops that match live conditions |
| 📱 **Fully responsive** | Desktop sidebar → mobile bottom bar, works on every screen size |

## 🖥️ Pages

Every sidebar item opens its **own dedicated page**:

- **Home** — current conditions hero, wind compass, humidity & visibility trends, UV index, live conditions
- **Forecast** — 24-hour forecast and 7-day outlook with Sun & Moon details
- **Maps** — interactive OpenStreetMap of the selected location
- **Air Quality** — AQI scale, all six pollutants and health guidance
- **Alerts** — active weather advisories derived from live data
- **Settings** — units and appearance

## 🛠️ Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript** — zero frameworks, zero build step
- **[Open-Meteo](https://open-meteo.com)** — weather forecast, geocoding & air-quality APIs (free, no key)
- **[BigDataCloud](https://bigdatacloud.com)** — free client-side reverse geocoding
- **[OpenStreetMap](https://openstreetmap.org)** — embedded location maps

## 🚀 Run Locally

```bash
# any static server works — for example:
python -m http.server 5500
# or
npx serve .
```

Then open **http://localhost:5500** in your browser.

> Geolocation requires HTTPS or localhost — both are fine for local dev.

## ☁️ Deploy (Netlify)

**Drag & drop:** go to [app.netlify.com/drop](https://app.netlify.com/drop) and drop the project folder — done.

**Via Git:** on [app.netlify.com](https://app.netlify.com) choose **Add new site → Import an existing project**, connect your GitHub repo, and deploy. Build command: *none*, publish directory: `.` — the included `netlify.toml` handles the rest.

## 📁 Project Structure

```
.
├── index.html      # Markup — sidebar, pages (Home / Forecast / Maps / Air / Alerts / Settings)
├── style.css       # Glassmorphism UI, day & night themes, animated weather scenes
├── script.js       # Data fetching, page routing, rendering, alerts, search, geolocation
├── netlify.toml    # Netlify deploy config
└── .gitignore
```

## 📊 Data Sources

- **Weather & forecast:** Open-Meteo Forecast API (Best Match model)
- **Air quality:** Open-Meteo Air Quality API (CAMS data, US + European AQI)
- **Place search:** Open-Meteo Geocoding API
- **Moon phase:** computed client-side (synodic month algorithm)

Live data auto-refreshes every 10 minutes.

---

<div align="center">
Made with ☕ and vanilla JS · Data by <a href="https://open-meteo.com">Open-Meteo</a>
</div>
