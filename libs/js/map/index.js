/// <reference path="../jquery.js" />

let currentBaseLayer =
  JSON.parse(localStorage.getItem('currentBaseLayer')) ?? 'Standard';

const styles = {
  Standard: 'standard',
  Streets: 'streets-v12',
  Outdoors: 'outdoors-v12',
  Satellite: 'standard-satellite',
  Dark: 'navigation-night-v1',
};

let categories;
let userGeo;
let searchResults = [];

let map = new mapboxgl.Map({
  style: `/api/mapboxgljs/styles?style=${styles[currentBaseLayer]}&initial=true`,
  projection: 'globe',
  transformRequest: (url, resourceType) => {
    if (
      (resourceType === 'SpriteImage' || resourceType === 'SpriteJSON') &&
      url.includes('api.mapbox.com')
    ) {
      const baseUrl = `http://localhost:8080/assets/mapboxgljs/${styles[currentBaseLayer]}/sprite`;
      const newUrl =
        resourceType === 'SpriteImage' ? `${baseUrl}.png` : `${baseUrl}.json`;
      return { url: newUrl };
    }
  },
  container: 'map',
});

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
        tokenCache.expiresAt = Date.now() + 30 * 1000;

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
    await getToken();

    map = new mapboxgl.Map({
      style: `/api/mapboxgljs/styles?style=${styles[currentBaseLayer]}&initial=true`,
      projection: 'globe',
      transformRequest: (url, resourceType) => {
        if (
          (resourceType === 'SpriteImage' || resourceType === 'SpriteJSON') &&
          url.includes('api.mapbox.com')
        ) {
          const baseUrl = `http://localhost:8080/assets/mapboxgljs/${styles[currentBaseLayer]}/sprite`;
          const newUrl =
            resourceType === 'SpriteImage'
              ? `${baseUrl}.png`
              : `${baseUrl}.json`;
          return { url: newUrl };
        }
      },
      container: 'map',
      zoom: 1,
      minZoom: 0.095,
      maxZoom: 17,
      center: [30, 15],
    });

    map.on('load', () => {
      console.log('Map loaded');
      resolve(map);
    });

    map.on('error', (e) => {
      console.error('Map error:', e.error);
      reject(e.error);
    });
  });
};

const mapPromise = initialiseMap();

mapPromise.then((map) => {
  map.scrollZoom.setWheelZoomRate(0.005);
  map.scrollZoom.setZoomRate(0.005);
});
