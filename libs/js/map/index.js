let map = L.map('map', {
  zoomSnap: 0,
  maxBoundsViscosity: 1,
  minZoom: 2.5,
  zoomControl: false,
}).setView([51.835778, 0], 2.5);

var worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

map.setMaxBounds(worldBounds);

map.setZoom(2.5);

map.fitBounds(worldBounds);

map.once('moveend', () => {
  map.setView([47.73307550971585, 0.2293651266492969], 2.5);
});

const controlContainer = document.querySelector('.leaflet-control-container');
const mapContainer = document.getElementById('map');

mapContainer.parentNode.insertBefore(
  controlContainer,
  mapContainer.nextSibling
);

// let zoomLevel = map.getZoom();
// let center = map.getCenter();

// map.on("zoom", () => {
//   zoomLevel = map.getZoom();
//   console.log("Zoom level changed: " + zoomLevel);
// });

// map.on("move", () => {
//   center = map.getCenter();
//   console.log("Center changed" + center);
// });

// map.on("moveend", function (e) {
//   var center = map.getCenter(); // Get the final map center after the move ends
//   var zoom = map.getZoom(); // Get the final zoom level
//   console.log("Map finished moving to:", center, "Zoom level:", zoom);
// });
