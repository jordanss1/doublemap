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



const minZoom = 2.5;
let currentZoom = map.getZoom();

const controlContainer = document.querySelector('.leaflet-control-container');
const mapContainer = document.getElementById('map');

mapContainer.parentNode.insertBefore(
  controlContainer,
  mapContainer.nextSibling
);
