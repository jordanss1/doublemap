/// <reference path="../jquery.js" />

let mapLoaded = true;
let map = null;

mapboxgl.accessToken = window.config.mapboxToken;

const retrieveMap = async () => {
  let attempt = 0;
  const maxRetries = 5;

  while (attempt < maxRetries) {
    try {
      const response = await $.ajax({
        url: '/api/mapboxgl',
        method: 'GET',
      });

      map = new mapboxgl.Map({
        container: 'map',
        style: response,
        projection: 'globe',
        zoom: 1,
        center: [30, 15],
      });

      break;
    } catch (xhr) {
      if (xhr.status === 429) {
        break;
      }

      console.log(xhr);
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);

      attempt++;
      console.log(`Retrying... Attempt ${attempt} of ${maxRetries}`);

      if (attempt >= maxRetries) {
        console.log('Max retry attempts reached.');
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
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
