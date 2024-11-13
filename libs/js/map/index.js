/// <reference path="../jquery.js" />

let map = null;
let savedBaseLayer = JSON.parse(localStorage.getItem('savedBaseLayer'));
let currentBaseLayer = '';

const styles = {
  Standard: 'standard',
  Streets: 'streets-v12',
  Outdoors: 'outdoors-v12',
  Satellite: 'standard-satellite',
  Dark: 'navigation-night-v1',
};

let baseLayers = {};

mapboxgl.accessToken = window.config.mapboxToken;

const retrieveMap = async () => {
  currentBaseLayer = savedBaseLayer ?? 'Standard';

  await $.ajax({
    url: `/api/mapboxgljs?style=${styles[currentBaseLayer]}`,
    method: 'GET',
    success: (response) => {
      baseLayers[currentBaseLayer] = response;

      map = new mapboxgl.Map({
        container: 'map',
        style: response,
        projection: 'globe',
        transformRequest: (url, resourceType) => {
          if (
            (resourceType === 'SpriteImage' || resourceType === 'SpriteJSON') &&
            url.includes('api.mapbox.com')
          ) {
            return {
              url: `http://localhost:8080/assets/mapboxgljs/${styles[currentBaseLayer]}/sprite`,
            };
          }
        },
        zoom: 1,
        center: [30, 15],
      });
    },
    error: (xhr) => {
      console.log(xhr);
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
};

retrieveMap();

// let map1 = L.map('map1', {
//   zoomSnap: 0,
//   maxBoundsViscosity: 1,
//   minZoom: 2.5,
//   zoomControl: false,
// }).setView([51.835778, 0], 2.5);

// var worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

// map1.setMaxBounds(worldBounds);

// map1.fitBounds(worldBounds);

// const addAllCountriesToMap = (features) => {
//   allCountriesLayer.clearLayers();

//   features.forEach(({ geometry }) =>
//     L.geoJSON(geometry).addTo(allCountriesLayer)
//   );

//   if (!map1.hasLayer(allCountriesLayer)) {
//     if (map1.hasLayer(selectedCountriesLayer)) {
//       map1.removeLayer(selectedCountriesLayer);
//       map1.fire('layergroupremove', {
//         selectedCountriesLayer,
//         id: 'select-country',
//       });
//     }

//     allCountriesLayer.addTo(map1);
//     map1.fire('layergroupadd', { allCountriesLayer, id: 'all-countries' });
//   }
// };

// const addSingleCountryToMap = (country) => {
//   selectedCountriesLayer.clearLayers();

//   L.geoJSON(country.geometry).addTo(selectedCountriesLayer);

//   if (!map1.hasLayer(selectedCountriesLayer)) {
//     if (map1.hasLayer(allCountriesLayer)) {
//       map1.removeLayer(allCountriesLayer);
//       map1.fire('layergroupremove', { allCountriesLayer, id: 'all-countries' });
//     }

//     selectedCountriesLayer.addTo(map1);
//     map1.fire('layergroupadd', {
//       selectedCountriesLayer,
//       id: 'select-country',
//     });
//   }
// };

// const minZoom = 2.5;
// let currentZoom = map1.getZoom();

// const controlContainer = document.querySelector('.leaflet-control-container');
// const mapContainer = document.getElementById('map1');

// mapContainer.parentNode.insertBefore(
//   controlContainer,
//   mapContainer.nextSibling
// );
