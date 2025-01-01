/// <reference path="../jquery.js" />

let currentBaseLayer =
  JSON.parse(localStorage.getItem('currentBaseLayer')) ?? 'Standard';

const styles = [
  { name: 'Standard', url: 'mapbox://styles/mapbox/standard' },
  { name: 'Dark', url: 'mapbox://styles/mapbox/navigation-night-v1' },
  {
    name: 'History',
    url: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
  },
];

let categoryList = [];
let userGeo;
let mostRecentLocation;
let searchResults = [];
let currentPois;
let currentPoiCategory = 'default';
let hoveredCountryId = null;

let tokenCache = {
  token: null,
  expiresAt: null,
};

const tokenIsValid = () => {
  return tokenCache.token && Date.now() < tokenCache.expiresAt;
};

const getToken = () => {
  return new Promise(async (resolve, reject) => {
    if (tokenIsValid()) {
      resolve(tokenCache.token);
      return;
    }

    $.ajax({
      url: '/api/mapboxgljs/token',
      method: 'GET',
      dataType: 'json',
      success: ({ data }) => {
        mapboxgl.accessToken = data.token;
        tokenCache.token = data.token;
        tokenCache.expiresAt = Date.now() + 60 * 1000;

        resolve(data.token);
      },
      error: (xhr) => {
        const res = JSON.parse(xhr.responseText);
        console.log(`Error Status: ${xhr.status} - Error Message: ${res}`);
        console.log(`Response Text: ${res.details}`);
      },
    });
  });
};

const initialiseMap = () => {
  return new Promise(async (resolve, reject) => {
    $.ajax({
      url: '/api/mapboxgljs/map',
      dataType: 'json',
      method: 'GET',
      success: async () => {
        const token = await getToken();

        const { url } = styles.find((style) => currentBaseLayer === style.name);

        map = new mapboxgl.Map({
          style: url,
          projection: 'globe',
          container: 'map',
          zoom: 1,
          minZoom: 0.095,
          maxZoom: 17,
          center: [30, 15],
        });

        map.on('load', async () => {
          if (currentBaseLayer === 'Dark') {
            nightNavStyles(map);
          } else if (currentBaseLayer === 'Standard') {
            map.setConfigProperty(
              'basemap',
              'showPointOfInterestLabels',
              false
            );
          } else {
            historyMapStyles(map);
            map.filterByDate('2013-04-14');
          }

          await applyLayers(token);
          await retrieveAndApplyIcons(token);

          resolve(map);
        });
      },

      error: (xhr) => {
        const res = JSON.parse(xhr.responseText);
        console.log(`Error Status: ${xhr.status} - Error Message: ${res}`);
        console.log(`Response Text: ${res.details}`);
      },
    });
  });
};

const mapPromise = initialiseMap();

mapPromise.then((map) => {
  map.scrollZoom.setWheelZoomRate(0.005);
  map.scrollZoom.setZoomRate(0.005);
});

function nightNavStyles(map) {
  map.setFog({
    color: 'rgb(11, 11, 25)',
    'high-color': 'rgb(36, 92, 223)',
    'horizon-blend': 0.02,
    'space-color': 'rgb(11, 11, 25)',
    'star-intensity': 0.6,
  });

  map.setPaintProperty('water', 'fill-color', [
    'interpolate',
    ['linear'],
    ['zoom'],
    0,
    'rgb(10, 20, 40)',
    8,
    'rgb(20, 40, 80)',
  ]);

  map.setPaintProperty('water', 'fill-antialias', true);
  map.setPaintProperty('water', 'fill-opacity', 0.9);

  map.addLayer(
    {
      id: 'water-sheen',
      type: 'fill',
      source: 'composite',
      'source-layer': 'water',
      layout: {},
      paint: {
        'fill-color': 'rgb(100, 100, 255)',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.02, 8, 0.1],
      },
    },
    'water'
  );
}

async function applyLayers(token) {
  if (!map.getSource('country-borders')) {
    map.addSource('country-borders', {
      type: 'vector',
      tiles: ['http://localhost:3000/data/countries/{z}/{x}/{y}.pbf'],
      promoteId: 'iso_a2',
    });
  }

  if (!map.getLayer('country-fill')) {
    map.addLayer({
      id: 'country-fill',
      type: 'fill',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 5.5,
      paint: {
        'fill-color': 'rgb(0, 255, 255)',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          currentBaseLayer === 'Dark' ? 0.4 : 0.6,
          0,
        ],
        'fill-emissive-strength': 10,
        'fill-outline-color': 'red',
      },
    });
  }

  // map.addLayer({
  //   id: 'country-extrusion',
  //   type: 'fill-extrusion',
  //   source: 'country-borders', // The vector tile source
  //   'source-layer': 'country_bordersgeo', // The layer within the vector tiles
  //   // filter: ['==', 'iso_a2', ''], // Use dynamic country selection
  //   paint: {
  //     'fill-extrusion-color': '#ff0000', // Color of the extrusion
  //     'fill-extrusion-height': 3, // Height based on a field in the data
  //     'fill-extrusion-base': 0, // Base height
  //     'fill-extrusion-opacity': 0.8, // Transparency level
  //     'fill-extrusion-cast-shadows': true, // Enable shadows
  //   },
  // });

  if (!map.getLayer('country-line')) {
    map.addLayer({
      id: 'country-line',
      type: 'line',
      source: 'country-borders',
      'source-layer': 'country_bordersgeo',
      maxzoom: 5.5,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          'rgba(0, 255, 255, 0.8)',
          'rgba(0, 255, 255, 0.3)',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          3,
          1,
        ],
        'line-blur': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 10],
        'line-emissive-strength': 10,
      },
    });
  }
}

function historyMapStyles(map) {
  map.setFog({
    range: [0.8, 8],
    color: '#e0d8c0', // A muted, parchment-like color
    'horizon-blend': 0.3,
    'high-color': '#a0a0c0', // A soft, hazy purple for the upper atmosphere
    'space-color': '#1a1a2a', // A deep, night-sky blue
    'star-intensity': 0.6, // Slightly prominent stars for a mystical feel
  });

  map.setPaintProperty('water', 'fill-color', '#3a5e63'); // A deep, muted teal for the sea
  map.setPaintProperty('water', 'fill-opacity', 0.8); // Slightly transparent to blend with fog

  // Add a subtle texture to the water
  map.addLayer({
    id: 'water-texture',
    type: 'fill',
    source: 'composite',
    'source-layer': 'water',
    paint: {
      'fill-pattern': 'wave-pattern', // You'll need to add this image to your style
      'fill-opacity': 0.1,
    },
  });
  map.setLayoutProperty('country-label', 'text-font', [
    'Old Standard TT Italic',
    'Arial Unicode MS Regular',
  ]);
  map.setPaintProperty('country-label', 'text-color', '#4a4a4a');

  map.addLayer({
    id: 'paper-texture',
    type: 'background',
    paint: {
      'background-pattern': 'paper-texture', // You'll need to add this image to your style
      'background-opacity': 0.1,
    },
  });

  // Add a soft glow to the coastlines
  map.addLayer({
    id: 'coastline-glow',
    type: 'line',
    source: 'composite',
    'source-layer': 'coastline',
    paint: {
      'line-color': '#c9b77d', // A soft, golden glow
      'line-width': 2,
      'line-blur': 3,
    },
  });
}
