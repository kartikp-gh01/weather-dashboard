# Weather Dashboard

A polished, responsive weather dashboard built with HTML5, CSS3, and vanilla JavaScript. It delivers current conditions, a 5-day forecast, hourly preview, air quality insights, recent searches, and a premium glassmorphism experience.

## Features

- Search weather by city name
- Press Enter or click Search
- Current location support via the Geolocation API
- Recent search history using LocalStorage
- Dark/light mode toggle
- Loading spinner and friendly error states
- Responsive glassmorphism UI
- 5-day forecast and hourly preview
- Air quality and UV index details
- Temperature unit toggle (°C / °F)
- Auto-refresh and quick copy/share actions

## Installation

1. Clone or download this project.
2. Open the project folder in your editor.
3. Replace the placeholder API key in `config.js` with your OpenWeatherMap API key.
4. Open `index.html` in a browser or run a simple local server.

## Folder Structure

```text
Weather-Dashboard/
├── index.html
├── style.css
├── script.js
├── config.js
├── README.md
└── assets/
    ├── icons/
    └── images/
```

## API Setup

1. Sign up at OpenWeatherMap.
2. Create an API key.
3. Open `config.js` and replace:

```js
window.WEATHER_CONFIG = {
  apiKey: 'YOUR_OPENWEATHER_API_KEY',
};
```

## Screenshots

Placeholder: Add screenshots of the dashboard in the assets/images folder.

## Live Demo

Placeholder: Add a live deployment link here when available.

## Author

Kartik Parashar

## License

This project is open-source and available under the MIT License.
