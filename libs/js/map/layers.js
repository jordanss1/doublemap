/// <reference path="../jquery.js" />

// const styles = {
//   Streets: 'jawg-streets',
//   Sunny: 'jawg-sunny',
//   Terrain: 'jawg-terrain',
//   Dark: 'jawg-dark',
//   Light: 'jawg-light',
// };

// let allCountriesLayer = L.layerGroup();
// let selectedCountriesLayer = L.layerGroup();

// let baseLayers = {};
// let baseButtonLayerStates = [];
// let currentBaseLayer =
//   JSON.parse(localStorage.getItem('currentBaseLayer')) ?? 'Streets';

// Object.keys(styles).forEach((friendlyName, i) => {
//   baseLayers[friendlyName] = L.tileLayer(
//     `/api/tileLayer?style={style}&z={z}&x={x}&y={y}`,
//     {
//       attribution:
//         '<a href="https://jawg.io?utm_medium=map&utm_source=attribution" title="Tiles Courtesy of Jawg Maps" target="_blank" class="jawg-attrib">&copy; <b>Jawg</b>Maps</a> | <a href="https://www.openstreetmap.org/copyright" title="OpenStreetMap is open data licensed under ODbL" target="_blank" class="osm-attrib">&copy; OSM contributors</a>',
//       minZoom: 0,
//       maxZoom: 22,
//       style: styles[friendlyName], // Dynamically set the style
//     }
//   );

//   baseButtonLayerStates.push({
//     stateName: friendlyName,
//     index: i,
//     changeLayer: () => {
//       const newIndex = baseButtonLayerStates.length - 1 === i ? 0 : i + 1;
//       const nextLayer = baseButtonLayerStates[newIndex].stateName;

//       map1.removeLayer(baseLayers[friendlyName]);
//       map1.addLayer(baseLayers[nextLayer]);
//       currentBaseLayer = nextLayer;

//       localStorage.setItem(
//         'currentBaseLayer',
//         JSON.stringify(currentBaseLayer)
//       );
//     },
//   });
// });

// baseLayers[currentBaseLayer].addTo(map1);
