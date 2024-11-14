/// <reference path="../jquery.js" />

let currentBaseLayer =
  JSON.parse(localStorage.getItem('savedBaseLayer')) ?? 'Standard';

const styles = {
  Standard: 'standard',
  Streets: 'streets-v12',
  Outdoors: 'outdoors-v12',
  Satellite: 'standard-satellite',
  Dark: 'navigation-night-v1',
};

mapboxgl.accessToken = window.config.mapboxToken;

/** @type {mapboxgl.Map} */
map = new mapboxgl.Map({
  style: `/api/mapboxgljs?style=${styles[currentBaseLayer]}&initial=true`,
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
  container: 'map',
  zoom: 1,
  minZoom: 0.095,
  center: [30, 15],
});

map.scrollZoom.setWheelZoomRate(0.005);
map.scrollZoom.setZoomRate(0.005);

// const mapReady = () => {
//   $.ajax({
//     url: `/api/mapboxgljs?style=${styles[currentBaseLayer]}`,
//     method: 'GET',
//     success: (response) => {
//       baseLayers[currentBaseLayer] = response;

//       map = new mapboxgl.Map({
//         container: 'map',
//         style: response,
//         projection: 'globe',
//         transformRequest: (url, resourceType) => {
//           if (
//             (resourceType === 'SpriteImage' || resourceType === 'SpriteJSON') &&
//             url.includes('api.mapbox.com')
//           ) {
//             return {
//               url: `http://localhost:8080/assets/mapboxgljs/${styles[currentBaseLayer]}/sprite`,
//             };
//           }
//         },
//         zoom: 1,
//         center: [30, 15],
//       });

//       // minZoom = map.getMinZoom();

//       // map.on('load', () => resolve(map));
//     },
//     error: (xhr) => {
//       console.log(xhr);
//       const res = JSON.parse(xhr.responseText);
//       console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
//       console.log(`Response Text: ${res.details}`);
//     },
//   });
// };
