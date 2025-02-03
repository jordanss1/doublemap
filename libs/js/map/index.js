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
let previousPois = [];
let currentPoiCategory = 'default';
let countryList = [];
let hoveredCountryId = null;
let chosenCountryISO = null;
let pausePoiSearch = false;
let selectedPoi;
let selectedSearch;
let currentMarker = null;
let disableAllButtons = false;

let categoryPanelButtons = [
  '#hotel-button',
  '#bank-button',
  '#museum-button',
  '#shopping-button',
  '#food_and_drink-button',
  '#coffee-button',
  '#park-button',
];

let countryPopup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  className: `country_popup lg:!max-w-xl md:!max-w-lg sm:!max-w-md !w-full`,
});

let tokenCache = {
  token: null,
  expiresAt: null,
};

const tokenIsValid = () => {
  return tokenCache.token && Date.now() < tokenCache.expiresAt;
};

const getToken = async () => {
  if (tokenIsValid()) {
    return tokenCache.token;
  }

  const response = await $.ajax({
    url: '/api/mapboxgljs/token',
    method: 'GET',
    dataType: 'json',
  });

  mapboxgl.accessToken = response.data.token;
  tokenCache.token = response.data.token;
  tokenCache.expiresAt = Date.now() + 60 * 1000;

  return response.data.token;
};

const showBigError = (title, subtitle) => {
  $('#error-screen').attr('aria-disabled', 'false');
  $('#big-error-title').text(title);
  $('#big-error-subtitle').text(subtitle);
};

const initialiseMap = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await $.ajax({
        url: '/api/mapboxgljs/map',
        dataType: 'json',
        method: 'GET',
      });

      let url = styles[2].url;
      let token;

      try {
        token = await getToken();
      } catch (error) {
        throw error;
      }

      if (!historyMode) {
        url = styles.find((style) => currentBaseLayer === style.name).url;
      }

      map = new mapboxgl.Map({
        style: url,
        projection: 'globe',
        container: 'map',
        zoom: 1,
        padding: { left: 80, right: 0, top: 0, bottom: 0 },
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
          map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
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
    } catch (error) {
      const details = error.responseJSON.details;

      showBigError("Can't load map", details);
      reject('Token could not be retrieved');
    }
  });
};

const createModernCountryPopup = (countryInfo) => {
  const { restCountries, geonames } = countryInfo;
  const { flags, name } = restCountries;

  console.log(restCountries);
  console.log(geonames);

  countryPopup
    .setLngLat(restCountries.latlng.reverse())
    .setHTML(
      /*html*/ `<div class='grid grid-cols-[max-content_auto] gap-2'>
              <div class='flex'>
               <img src="${flags.svg ?? flags.png}" alt="${
        flags.alt
      }" class='w-44'>
              </div>
              <div class='flex flex-col gap-2'>
                <div id='country-name-button' role='button'  aria-hidden='true' class='grid grid-cols-[max-content_auto] items-baseline gap-2 group/button'>
                  <div class='group/toggle h-full'>
                    <i class="fa-solid fa-toggle-off cursor-pointer group-hover/button:text-white-50 group-hover/toggle:text-white-50 text-white-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 id='name-common' class="text-2xl relative group-aria-hidden/button:visible font-title group-active/button:translate-x-2 delay-75 translate-x-0 transition-all duration-200 ease-in-out font-extrabold"
                    >${name.common}</h3>
                    <h3 id='name-official' class="text-2xl group-aria-hidden/button:absolute relative group-aria-hidden/button:invisible font-title group-active/button:translate-x-2 delay-75 translate-x-0 transition-all duration-200 ease-in-out font-extrabold"
                    >${name.official}</h3>
                  </div>
                </div>
                <p>Population: hi</p>
                <p>Capital: hi</p>
              </div>
            </div>
`
    )
    .addTo(map);

  $('#country-name-button').on('click', function () {
    console.log('click');
  });
};

const mapPromise = initialiseMap();

mapPromise.then((map) => {
  map.scrollZoom.setWheelZoomRate(0.005);
  map.scrollZoom.setZoomRate(0.005);
});
