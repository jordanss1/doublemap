/// <reference path="../jquery.js" />

let currentBaseLayer =
  JSON.parse(localStorage.getItem('currentBaseLayer')) ?? 'Standard';

const styles = [
  { name: 'Standard', url: 'mapbox://styles/mapbox/standard' },
  { name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { name: 'Satellite', url: 'mapbox://styles/mapbox/standard-satellite' },
  { name: 'Dark', url: 'mapbox://styles/mapbox/navigation-night-v1' },
];

let categoryList = [];
let userGeo;
let mostRecentLocation;
let searchResults = [];

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
      console.log('Using cached token');
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
        await getToken();

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

        map.on('load', () => {
          if (currentBaseLayer === 'Dark') {
            nightNavStyles(map);
          }
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
