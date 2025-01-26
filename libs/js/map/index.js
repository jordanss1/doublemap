/// <reference path="../jquery.js" />

let currentBaseLayer =
  JSON.parse(localStorage.getItem('currentBaseLayer')) ?? 'Standard';
let historyMode = JSON.parse(localStorage.getItem('historyMode'))
  ? true
  : false;

const styles = [
  { name: 'Standard', url: 'mapbox://styles/mapbox/standard' },
  { name: 'Dark', url: 'mapbox://styles/mapbox/navigation-night-v1' },
  {
    name: 'History',
    url: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
  },
];

let categoryList = [];
let userGeo;
let mostRecentLocation;
let searchResults = [];
let searchTerm;
let currentPois = [];
let currentPoiCategory = 'default';
let countryList = [];
let hoveredCountryId = null;
let chosenCountryISO = null;
let currentMarker = null;

let categoryPanelButtons = [
  '#hotel-button',
  '#bank-button',
  '#museum-button',
  '#shopping-button',
  '#food_and_drink-button',
  '#coffee-button',
  '#outdoors-button',
];

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
        let url = styles[2].url;
        const token = await getToken();

        if (!historyMode) {
          url = styles.find((style) => currentBaseLayer === style.name).url;
        }

        map = new mapboxgl.Map({
          style: url,
          projection: 'globe',
          container: 'map',
          zoom: 1,
          minZoom: 0.7,
          maxZoom: 17,
          center: [30, 15],
        });

        map.on('load', async () => {
          $('#search').val('');

          if ($('#preloader').length) {
            $('#preloader').fadeOut('slow', function () {
              $(this).remove();
            });
          }

          if (historyMode) {
            applyHistoryHtml(true);
            applyHistoryStyles();
            applyCountryLayers();
            map.filterByDate('2020-01-01');
            return resolve(map);
          }

          applyHistoryHtml(false);

          if (currentBaseLayer === 'Dark') {
            nightNavStyles(map);
          } else {
            map.setConfigProperty(
              'basemap',
              'showPointOfInterestLabels',
              false
            );
            map.setFog({
              color: 'rgb(11, 11, 25)',
              'high-color': 'rgb(36, 92, 223)',
              'horizon-blend': 0.02,
              'space-color': 'rgb(11, 11, 25)',
              'star-intensity': 0.6,
            });
          }

          await applyCountryLayers();
          await retrieveAndApplyIcons(token);

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
