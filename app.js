// ==========================================
// French Cities Data (20 Largest Cities)
// ==========================================
const FRENCH_CITIES = [
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Marseille", lat: 43.2965, lon: 5.3698 },
    { name: "Lyon", lat: 45.7640, lon: 4.8357 },
    { name: "Toulouse", lat: 43.6047, lon: 1.4442 },
    { name: "Nice", lat: 43.7102, lon: 7.2620 },
    { name: "Nantes", lat: 47.2184, lon: -1.5536 },
    { name: "Strasbourg", lat: 48.5734, lon: 7.7521 },
    { name: "Montpellier", lat: 43.6108, lon: 3.8767 },
    { name: "Bordeaux", lat: 44.8378, lon: -0.5792 },
    { name: "Lille", lat: 50.6292, lon: 3.0573 },
    { name: "Rennes", lat: 48.1173, lon: -1.6778 },
    { name: "Reims", lat: 49.2583, lon: 4.0317 },
    { name: "Saint-Étienne", lat: 45.4397, lon: 4.3872 },
    { name: "Le Havre", lat: 49.4944, lon: 0.1079 },
    { name: "Toulon", lat: 43.1242, lon: 5.9280 },
    { name: "Grenoble", lat: 45.1885, lon: 5.7245 },
    { name: "Dijon", lat: 47.3220, lon: 5.0415 },
    { name: "Angers", lat: 47.4784, lon: -0.5632 },
    { name: "Nîmes", lat: 43.8367, lon: 4.3601 },
    { name: "Clermont-Ferrand", lat: 45.7772, lon: 3.0870 }
];

// Available panel positions
const PANEL_POSITIONS = [27, 35, 42];

// ==========================================
// DOM Elements
// ==========================================
const citySelect = document.getElementById('city-select');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const datePicker = document.getElementById('date-picker');
const calculateBtn = document.getElementById('calculate-btn');
const resultCard = document.getElementById('result-card');
const angleValue = document.getElementById('angle-value');
const exactAngle = document.getElementById('exact-angle');
const recommendedPosition = document.getElementById('recommended-position');
const resultLocation = document.getElementById('result-location');
const panelVisual = document.getElementById('panel-visual');
const calendarCard = document.getElementById('calendar-card');
const calendarTimeline = document.getElementById('calendar-timeline');
const modeBtns = document.querySelectorAll('.mode-btn');
const inputSections = document.querySelectorAll('.input-section');

// ==========================================
// Initialization
// ==========================================
function init() {
    // Populate city select
    FRENCH_CITIES.forEach(city => {
        const option = document.createElement('option');
        option.value = city.name;
        option.textContent = city.name;
        citySelect.appendChild(option);
    });

    // Set default date to today
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed', err));
        });
    }

    // Event listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => switchInputMode(btn.dataset.mode));
    });

    calculateBtn.addEventListener('click', calculateInclination);

    // Clear coords when city is selected
    citySelect.addEventListener('change', () => {
        if (citySelect.value) {
            latitudeInput.value = '';
            longitudeInput.value = '';
        }
    });
}

// ==========================================
// Input Mode Switching
// ==========================================
function switchInputMode(mode) {
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    inputSections.forEach(section => {
        if (section.classList.contains(`${mode}-input`)) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

// ==========================================
// Solar Calculations
// ==========================================

/**
 * Calculate the day of year from a date
 * @param {Date} date 
 * @returns {number} Day of year (1-365)
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Calculate solar declination angle
 * Formula: δ = 23.45° × sin(360/365 × (day + 284))
 * @param {number} dayOfYear 
 * @returns {number} Declination in degrees
 */
function calculateSolarDeclination(dayOfYear) {
    const angle = (360 / 365) * (dayOfYear + 284);
    const angleRad = angle * (Math.PI / 180);
    return 23.45 * Math.sin(angleRad);
}

/**
 * Calculate optimal panel inclination
 * @param {number} latitude - Latitude in degrees
 * @param {Date} date - Selected date
 * @returns {object} { exactAngle, recommendedAngle }
 */
function calculateOptimalAngle(latitude, date) {
    const dayOfYear = getDayOfYear(date);
    const declination = calculateSolarDeclination(dayOfYear);

    // Solar altitude at noon = 90 - latitude + declination
    const solarAltitude = 90 - latitude + declination;

    // Optimal panel angle = 90 - solar altitude
    let optimalAngle = 90 - solarAltitude;

    // Clamp to reasonable values
    optimalAngle = Math.max(0, Math.min(90, optimalAngle));

    // Find nearest available position
    let recommendedAngle = PANEL_POSITIONS[0];
    let minDiff = Math.abs(optimalAngle - PANEL_POSITIONS[0]);

    for (const position of PANEL_POSITIONS) {
        const diff = Math.abs(optimalAngle - position);
        if (diff < minDiff) {
            minDiff = diff;
            recommendedAngle = position;
        }
    }

    return {
        exactAngle: optimalAngle.toFixed(1),
        recommendedAngle
    };
}

// ==========================================
// Main Calculation Handler
// ==========================================
function calculateInclination() {
    let latitude, locationName;

    // Get latitude based on input mode
    const activeMode = document.querySelector('.mode-btn.active').dataset.mode;

    if (activeMode === 'city') {
        if (!citySelect.value) {
            showError('Veuillez sélectionner une ville');
            return;
        }
        const city = FRENCH_CITIES.find(c => c.name === citySelect.value);
        latitude = city.lat;
        locationName = city.name;
    } else {
        if (!latitudeInput.value) {
            showError('Veuillez entrer une latitude');
            return;
        }
        latitude = parseFloat(latitudeInput.value);
        const longitude = parseFloat(longitudeInput.value) || 0;
        locationName = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
    }

    // Get date
    if (!datePicker.value) {
        showError('Veuillez sélectionner une date');
        return;
    }
    const selectedDate = new Date(datePicker.value);

    // Calculate
    const result = calculateOptimalAngle(latitude, selectedDate);

    // Display results
    displayResults(result, locationName, selectedDate);

    // Calculate seasonal calendar
    calculateSeasonalCalendar(latitude);
}

// ==========================================
// Seasonal Calendar Logic
// ==========================================

function calculateSeasonalCalendar(latitude) {
    const year = new Date().getFullYear();
    const periods = [];
    let currentPosition = null;
    let startDate = null;

    // Analyze each day of the year
    for (let day = 1; day <= 365; day++) {
        const date = new Date(year, 0, day);
        const result = calculateOptimalAngle(latitude, date);
        const position = result.recommendedAngle;

        if (position !== currentPosition) {
            if (currentPosition !== null) {
                periods.push({
                    angle: currentPosition,
                    start: new Date(startDate),
                    end: new Date(year, 0, day - 1)
                });
            }
            currentPosition = position;
            startDate = new Date(date);
        }

        // Last day
        if (day === 365) {
            periods.push({
                angle: currentPosition,
                start: new Date(startDate),
                end: new Date(date)
            });
        }
    }

    // Merge periods if they wrap around New Year (optional, for simplicity we keep them as list)
    displayCalendar(periods);
}

function displayCalendar(periods) {
    calendarCard.classList.add('active');
    calendarTimeline.innerHTML = '';

    const dateOptions = { day: 'numeric', month: 'long' };

    periods.forEach(period => {
        const item = document.createElement('div');
        item.className = 'calendar-item';

        let seasonText = '';
        if (period.angle === 27) seasonText = 'Optimisation Été';
        else if (period.angle === 42) seasonText = 'Optimisation Hiver';
        else seasonText = 'Inter-saisons';

        item.innerHTML = `
            <div class="calendar-angle-badge">
                <span class="badge-val">${period.angle}</span>
                <span class="badge-unit">deg</span>
            </div>
            <div class="calendar-info">
                <span class="calendar-dates">Du ${period.start.toLocaleDateString('fr-FR', dateOptions)} au ${period.end.toLocaleDateString('fr-FR', dateOptions)}</span>
                <span class="calendar-season">${seasonText}</span>
            </div>
        `;
        calendarTimeline.appendChild(item);
    });
}

// ==========================================
// Display Results
// ==========================================
function displayResults(result, locationName, date) {
    // Show result card
    resultCard.classList.add('active');

    // Animate angle value
    animateNumber(angleValue, result.recommendedAngle);

    // Update details
    exactAngle.textContent = `${result.exactAngle}°`;
    recommendedPosition.textContent = `${result.recommendedAngle}°`;

    // Format date
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('fr-FR', dateOptions);
    resultLocation.textContent = `${locationName} • ${formattedDate}`;

    // Update panel visual
    updatePanelVisual(result.recommendedAngle);

    // Update position indicators
    updatePositionIndicators(result.recommendedAngle);

    // Scroll to results
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Animate number counting up
 */
function animateNumber(element, target) {
    const duration = 800;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * easeOut);

        element.textContent = current + '°';

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Update panel visual rotation
 */
function updatePanelVisual(angle) {
    // Transform panel to show inclination
    // The panel rotates around its left edge
    panelVisual.style.transform = `translateX(-50%) rotate(-${angle}deg)`;
}

/**
 * Update position indicators
 */
function updatePositionIndicators(activeAngle) {
    document.querySelectorAll('.position-dot').forEach(dot => {
        const dotAngle = parseInt(dot.dataset.angle);
        dot.classList.toggle('active', dotAngle === activeAngle);
    });
}

// ==========================================
// Error Handling
// ==========================================
function showError(message) {
    // Simple alert for now, could be improved with custom toast
    alert(message);
}

// ==========================================
// Start Application
// ==========================================
init();
