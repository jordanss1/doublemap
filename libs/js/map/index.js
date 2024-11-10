/// <reference path="../jquery.js" />

let map = L.map('map', {
  zoomSnap: 0,
  maxBoundsViscosity: 1,
  minZoom: 2.5,
  zoomControl: false,
}).setView([51.835778, 0], 2.5);

var worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

map.setMaxBounds(worldBounds);

map.fitBounds(worldBounds);

const addAllCountriesToMap = (features) => {
  allCountriesLayer.clearLayers();

  features.forEach(({ geometry }) =>
    L.geoJSON(geometry).addTo(allCountriesLayer)
  );

  if (!map.hasLayer(allCountriesLayer)) {
    if (map.hasLayer(selectedCountriesLayer)) {
      map.removeLayer(selectedCountriesLayer);
      map.fire('layergroupremove', {
        selectedCountriesLayer,
        id: 'select-country',
      });
    }

    allCountriesLayer.addTo(map);
    map.fire('layergroupadd', { allCountriesLayer, id: 'all-countries' });
  }
};

const addSingleCountryToMap = (country) => {
  selectedCountriesLayer.clearLayers();

  L.geoJSON(country.geometry).addTo(selectedCountriesLayer);

  if (!map.hasLayer(selectedCountriesLayer)) {
    if (map.hasLayer(allCountriesLayer)) {
      map.removeLayer(allCountriesLayer);
      map.fire('layergroupremove', { allCountriesLayer, id: 'all-countries' });
    }

    selectedCountriesLayer.addTo(map);
    map.fire('layergroupadd', { selectedCountriesLayer, id: 'select-country' });
  }
};

const minZoom = 2.5;
let currentZoom = map.getZoom();

const controlContainer = document.querySelector('.leaflet-control-container');
const mapContainer = document.getElementById('map');

mapContainer.parentNode.insertBefore(
  controlContainer,
  mapContainer.nextSibling
);
