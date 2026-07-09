(() => {
  const API_BASE = 'https://api.weatherapi.com/v1';
  const apiKey = window.WEATHER_CONFIG?.apiKey || '';
  const state = {
    unit: localStorage.getItem('weather-unit') || 'metric',
    theme: localStorage.getItem('weather-theme') || 'dark',
    city: localStorage.getItem('weather-last-city') || 'London',
    currentWeather: null,
    forecast: null,
    autoRefreshTimer: null,
  };

  const elements = {
    form: document.getElementById('searchForm'),
    input: document.getElementById('cityInput'),
    locationButton: document.getElementById('locationButton'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    clearHistory: document.getElementById('clearHistory'),
    copySummary: document.getElementById('copySummary'),
    shareSummary: document.getElementById('shareSummary'),
    loading: document.getElementById('loadingIndicator'),
    statusMessage: document.getElementById('statusMessage'),
    cityName: document.getElementById('cityName'),
    countryTag: document.getElementById('countryTag'),
    dateTime: document.getElementById('dateTime'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    weatherDescription: document.getElementById('weatherDescription'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    conditionText: document.getElementById('conditionText'),
    coordinates: document.getElementById('coordinates'),
    forecastList: document.getElementById('forecastList'),
    hourlyForecast: document.getElementById('hourlyForecast'),
    airQuality: document.getElementById('airQuality'),
    recentSearches: document.getElementById('recentSearches'),
  };

  function init() {
    bindEvents();
    setTheme(state.theme);
    setUnit(state.unit);
    renderRecentSearches();

    if (!navigator.onLine) {
      showStatusMessage('You are offline. Live weather updates are unavailable until you reconnect.', 'warning');
    } else {
      loadWeather(state.city);
    }

    window.addEventListener('online', () => {
      showStatusMessage('Connection restored. Refreshing weather data.', 'success');
      loadWeather(state.city, true);
    });

    window.addEventListener('offline', () => {
      showStatusMessage('You are offline. Some features may be unavailable.', 'warning');
    });

    startAutoRefresh();
  }

  function bindEvents() {
    elements.form.addEventListener('submit', handleSearchSubmit);
    elements.locationButton.addEventListener('click', () => requestLocation());
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.clearHistory.addEventListener('click', clearHistory);
    elements.copySummary.addEventListener('click', copySummary);
    elements.shareSummary.addEventListener('click', shareSummary);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const city = elements.input.value.trim();
    if (!city) {
      showStatusMessage('Please enter a city name to search.', 'warning');
      return;
    }

    loadWeather(city);
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }

  function setTheme(theme) {
    state.theme = theme;
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
    elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('weather-theme', theme);
  }

  function toggleUnit() {
    const nextUnit = state.unit === 'metric' ? 'imperial' : 'metric';
    setUnit(nextUnit);
    if (state.currentWeather) {
      loadWeather(state.city, true);
    }
  }

  function setUnit(unit) {
    state.unit = unit;
    elements.unitToggle.textContent = unit === 'metric' ? '°F' : '°C';
    localStorage.setItem('weather-unit', unit);
  }

  async function loadWeather(city, isRefresh = false) {
    if (!navigator.onLine) {
      showStatusMessage('You are offline. Live weather updates are unavailable until you reconnect.', 'warning');
      return;
    }

    if (!isApiConfigured()) {
      showStatusMessage('Add your WeatherAPI.com key in config.js to load live data.', 'warning');
      return;
    }

    elements.input.value = city;
    state.city = city;

    if (!isRefresh) {
      showLoading(true);
      elements.statusMessage.textContent = '';
      elements.statusMessage.className = 'status-message';
    }

    try {
      const weatherData = await fetchWeatherData(city);
      renderWeather(weatherData);
      if (!isRefresh) {
        showStatusMessage(`Showing live weather for ${weatherData.location.name}.`, 'success');
      }
    } catch (error) {
      handleError(error);
    }

    if (!isRefresh) {
      showLoading(false);
      elements.statusMessage.classList.remove('loading');
    }
  }

  async function fetchWeatherData(city) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${API_BASE}/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=5&aqi=yes&alerts=no`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await buildError(response);
      }

      return response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function buildError(response) {
    if (response.status === 401) {
      return new Error('WeatherAPI.com rejected the API key. Please verify it in config.js or create a new key from your WeatherAPI.com account.');
    }

    if (response.status === 400) {
      return new Error('Please enter a valid city name or location.');
    }

    if (response.status === 404) {
      return new Error('We could not find that city. Please try another location.');
    }

    if (response.status === 429) {
      return new Error('WeatherAPI.com rate limit reached. Please wait a moment and try again.');
    }

    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || 'Weather data could not be loaded right now.';
    return new Error(message);
  }

  function renderWeather(data) {
    const location = data.location;
    const current = data.current;
    const forecastDays = data.forecast?.forecastday ?? [];
    const firstDay = forecastDays[0] || null;

    state.currentWeather = { location, current, forecastDays };
    state.forecast = forecastDays;
    state.city = location.name;

    saveRecentSearch(location.name);
    localStorage.setItem('weather-last-city', location.name);

    const conditionText = current.condition?.text || 'Clear';
    document.body.classList.remove('weather-clear', 'weather-clouds', 'weather-rain', 'weather-snow', 'weather-thunderstorm', 'weather-mist');
    document.body.classList.add(`weather-${normalizeCondition(conditionText)}`);

    elements.cityName.textContent = `${location.name}, ${location.country}`;
    elements.countryTag.textContent = location.country;
    elements.dateTime.textContent = formatDateTime(location.localtime_epoch);
    elements.temperature.textContent = formatTemperature(current.temp_c, current.temp_f);
    elements.weatherDescription.textContent = current.condition?.text || '--';
    elements.feelsLike.textContent = `Feels like ${formatTemperature(current.feelslike_c, current.feelslike_f)}`;
    elements.humidity.textContent = `${current.humidity}%`;
    elements.windSpeed.textContent = formatWindSpeed(current.wind_kph, current.wind_mph);
    elements.pressure.textContent = `${current.pressure_mb} hPa`;
    elements.visibility.textContent = formatVisibility(current.vis_km, current.vis_miles);
    elements.sunrise.textContent = firstDay?.astro?.sunrise || '--';
    elements.sunset.textContent = firstDay?.astro?.sunset || '--';
    elements.conditionText.textContent = current.condition?.text || '--';
    elements.coordinates.textContent = `${Number(location.lat).toFixed(2)}, ${Number(location.lon).toFixed(2)}`;
    elements.weatherIcon.innerHTML = `<span aria-hidden="true">${getWeatherIcon(conditionText)}</span>`;
    elements.weatherIcon.setAttribute('aria-label', conditionText);

    renderForecast(forecastDays);
    renderHourly(firstDay?.hour ?? []);
    renderAirQuality(current.air_quality, current.uv);
    renderRecentSearches();
    document.title = `${location.name} Weather Dashboard`;
  }

  function renderForecast(days) {
    if (!days?.length) {
      elements.forecastList.innerHTML = '<div class="stat-card">Forecast unavailable.</div>';
      return;
    }

    elements.forecastList.innerHTML = days.slice(0, 5).map((day) => `
      <div class="forecast-item">
        <div>
          <strong>${formatDay(day.date_epoch)}</strong>
          <div class="muted">${day.day?.condition?.text || 'Forecast'}</div>
        </div>
        <div>${formatTemperature(day.day?.maxtemp_c, day.day?.maxtemp_f)} / ${formatTemperature(day.day?.mintemp_c, day.day?.mintemp_f)}</div>
      </div>
    `).join('');
  }

  function renderHourly(hours) {
    if (!hours?.length) {
      elements.hourlyForecast.innerHTML = '<div class="stat-card">Hourly forecast unavailable.</div>';
      return;
    }

    elements.hourlyForecast.innerHTML = hours.slice(0, 8).map((hour) => `
      <div class="hourly-item">
        <strong>${formatHour(hour.time_epoch)}</strong>
        <span>${getWeatherIcon(hour.condition?.text || 'Clear')}</span>
        <span>${formatTemperature(hour.temp_c, hour.temp_f)}</span>
      </div>
    `).join('');
  }

  function renderAirQuality(air, uvIndex) {
    if (!air) {
      elements.airQuality.innerHTML = '<div class="stat-card">Air quality data unavailable.</div>';
      return;
    }

    const aqiValue = Number(air['us-epa-index'] ?? air['gb-defra-index'] ?? 0);
    const aqiLabel = getAqiLabel(aqiValue);

    elements.airQuality.innerHTML = `
      <div class="stat-card">
        <span class="label">Air Quality Index</span>
        <strong>${aqiValue || 'N/A'} • ${aqiLabel}</strong>
      </div>
      <div class="stat-card">
        <span class="label">PM2.5</span>
        <strong>${Number(air.pm2_5 || 0).toFixed(1)} μg/m³</strong>
      </div>
      <div class="stat-card">
        <span class="label">UV Index</span>
        <strong>${Number(uvIndex || 0).toFixed(1)}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Weather Summary</span>
        <strong>${buildSummary()}</strong>
      </div>
    `;
  }

  function renderRecentSearches() {
    const history = JSON.parse(localStorage.getItem('weather-recent') || '[]');
    if (!history.length) {
      elements.recentSearches.innerHTML = '<div class="stat-card">No recent searches yet.</div>';
      return;
    }

    elements.recentSearches.innerHTML = history.map((city) => `
      <div class="recent-item">
        <span>${city}</span>
        <button type="button" data-city="${city}">Open</button>
      </div>
    `).join('');

    elements.recentSearches.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => loadWeather(button.dataset.city));
    });
  }

  function saveRecentSearch(city) {
    const history = JSON.parse(localStorage.getItem('weather-recent') || '[]');
    const nextList = [city, ...history.filter((entry) => entry !== city)].slice(0, 6);
    localStorage.setItem('weather-recent', JSON.stringify(nextList));
  }

  function clearHistory() {
    localStorage.removeItem('weather-recent');
    renderRecentSearches();
    showStatusMessage('Recent searches cleared.', 'success');
  }

  function showLoading(isLoading) {
    elements.loading.hidden = !isLoading;
    elements.loading.style.display = isLoading ? 'flex' : 'none';
    if (isLoading) {
      elements.loading.setAttribute('aria-busy', 'true');
    } else {
      elements.loading.removeAttribute('aria-busy');
    }
  }

  function showStatusMessage(message, type = 'success') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
  }

  function handleError(error) {
    showStatusMessage(error.message || 'Unable to fetch weather data.', 'error');
  }

  function buildSummary() {
    if (!state.currentWeather) {
      return 'Waiting for weather data';
    }

    const current = state.currentWeather.current;
    return `${state.currentWeather.location.name}: ${current.condition?.text || 'clear conditions'} with ${formatTemperature(current.temp_c, current.temp_f)}.`;
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      showStatusMessage('Geolocation is not supported in this browser.', 'warning');
      return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`${API_BASE}/forecast.json?key=${apiKey}&q=${position.coords.latitude},${position.coords.longitude}&days=5&aqi=yes&alerts=no`);
          if (!response.ok) {
            throw new Error('Unable to look up your current location.');
          }
          const data = await response.json();
          loadWeather(`${data.location.lat},${data.location.lon}`);
        } catch (error) {
          handleError(error);
        } finally {
          showLoading(false);
        }
      },
      () => {
        showLoading(false);
        showStatusMessage('Location permission was denied. You can still search by city.', 'warning');
      }
    );
  }

  async function copySummary() {
    if (!state.currentWeather) {
      showStatusMessage('There is no weather data to copy yet.', 'warning');
      return;
    }

    const current = state.currentWeather.current;
    const text = `Weather in ${state.currentWeather.location.name}: ${current.condition?.text || 'clear conditions'}. Temperature ${formatTemperature(current.temp_c, current.temp_f)}. Feels like ${formatTemperature(current.feelslike_c, current.feelslike_f)}.`;

    try {
      await navigator.clipboard.writeText(text);
      showStatusMessage('Weather summary copied to clipboard.', 'success');
    } catch {
      showStatusMessage('Clipboard access was blocked. Please copy manually.', 'warning');
    }
  }

  async function shareSummary() {
    if (!state.currentWeather) {
      showStatusMessage('There is no weather data to share yet.', 'warning');
      return;
    }

    const current = state.currentWeather.current;
    const text = `Weather in ${state.currentWeather.location.name}: ${current.condition?.text || 'clear conditions'}. Temperature ${formatTemperature(current.temp_c, current.temp_f)}.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Weather Dashboard', text });
        showStatusMessage('Weather summary shared.', 'success');
      } catch {
        showStatusMessage('Sharing was canceled.', 'warning');
      }
    } else {
      showStatusMessage('Sharing is not available in this browser.', 'warning');
    }
  }

  function startAutoRefresh() {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = setInterval(() => {
      if (navigator.onLine && state.city) {
        loadWeather(state.city, true);
      }
    }, 10 * 60 * 1000);
  }

  function isApiConfigured() {
    return Boolean(apiKey && apiKey !== 'YOUR_OPENWEATHER_API_KEY' && apiKey !== 'YOUR_WEATHERAPI_KEY');
  }

  function formatTemperature(celsius, fahrenheit) {
    return state.unit === 'metric' ? `${Math.round(celsius || 0)}°C` : `${Math.round(fahrenheit || 0)}°F`;
  }

  function formatWindSpeed(kph, mph) {
    return state.unit === 'metric' ? `${Number(kph || 0).toFixed(1)} km/h` : `${Number(mph || 0).toFixed(1)} mph`;
  }

  function formatVisibility(km, miles) {
    return state.unit === 'metric' ? `${Number(km || 0).toFixed(1)} km` : `${Number(miles || 0).toFixed(1)} mi`;
  }

  function formatDateTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatDay(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString([], { weekday: 'short' });
  }

  function formatHour(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric' });
  }

  function normalizeCondition(text) {
    const value = (text || '').toLowerCase();
    if (value.includes('thunder') || value.includes('storm')) return 'thunderstorm';
    if (value.includes('snow')) return 'snow';
    if (value.includes('rain') || value.includes('drizzle')) return 'rain';
    if (value.includes('mist') || value.includes('fog') || value.includes('haze')) return 'mist';
    if (value.includes('cloud')) return 'clouds';
    return 'clear';
  }

  function getWeatherIcon(main) {
    const value = (main || '').toLowerCase();
    if (value.includes('sun') || value.includes('clear')) return '☀️';
    if (value.includes('cloud')) return '☁️';
    if (value.includes('rain') || value.includes('drizzle')) return '🌧️';
    if (value.includes('snow')) return '❄️';
    if (value.includes('thunder')) return '⛈️';
    if (value.includes('mist') || value.includes('fog') || value.includes('haze')) return '🌫️';
    return '🌤️';
  }

  function getAqiLabel(aqi) {
    const labels = {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor',
    };
    return labels[aqi] || 'Unknown';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
