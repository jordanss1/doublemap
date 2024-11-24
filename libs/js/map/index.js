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

mapboxgl.accessToken = window.config.mapboxToken;

/** @type {mapboxgl.Map} */
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
        resourceType === 'SpriteImage' ? `${baseUrl}.png` : `${baseUrl}.json`;
      return { url: newUrl };
    }
  },
  container: 'map',
  zoom: 1,
  minZoom: 0.095,
  maxZoom: 17,
  center: [30, 15],
});

map.scrollZoom.setWheelZoomRate(0.005);
map.scrollZoom.setZoomRate(0.005);
