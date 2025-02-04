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
  className: `country_popup  lg:!max-w-2xl md:!max-w-xl sm:!max-w-md !w-full`,
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

let animating = false;

const createModernCountryPopup = (countryInfo) => {
  const { restCountries, geonames } = countryInfo;
  const {
    flags,
    name,
    population,
    capital,
    area,
    coatOfArms,
    translations,
    currencies,
  } = restCountries;

  const translationsArray = Object.entries(translations)
    .map(([key, value]) => {
      if (key === 'cym') {
        key = 'eng';
      }

      key = key.toUpperCase();

      return {
        ...value,
        code: key,
      };
    })
    .sort((a, b) => (a.code === 'ENG' ? -1 : b.code === 'ENG' ? 1 : 0));

  const currency = Object.entries(currencies).map(([key, value]) => ({
    ...value,
    code: key,
  }))[0];

  console.log(restCountries);
  console.log(geonames);

  countryPopup
    .setLngLat(restCountries.latlng.reverse())
    .setHTML(
      /*html*/ `
          <div  class='flex flex-col gap-2'>
           <div class='grid grid-cols-[1fr_1fr] transition-all duration-300 gap-2 items-center'>
              <div id='country-image-button' title='Change country photo' aria-label='Change country photo' role='button'  aria-hidden='true' class='flex border-r-2  border-b-2 p-2 aspect-[2/1] h-full overflow-hidden w-full self-start relative rounded-bl-none rounded-br-md rounded-tr-none border-white-50 group/button'>
                <div class='bg-black/70 flex items-center justify-center group-hover/button:scale-110 scale-100 z-50 group-hover/button:bg-black/100  border-2 border-white-50 absolute top-2 right-2 w-7 h-7 transition-all duration-100 ease-in delay-75 rounded-md'>
                  <i class="fa-solid fa-right-left text-lg transition-all ease-in group-hover/button:text-white-50 text-white-300"></i>
                </div>
                  <img id='country-flag' src="${
                    flags.svg ?? flags.png
                  }" class=' w-full translate-x-4 object-contain delay-0 opacity-0 group-aria-hidden/button:opacity-100 relative group-aria-hidden/button:delay-1000 group-aria-hidden/button:translate-x-0 transition-all rounded-md ease-in-out' alt="${
        flags.alt
      }" >
                  <img id='country-coat' src="${
                    coatOfArms.svg ?? coatOfArms.png
                  }" class='bg-[conic-gradient(from_100deg_at_10%_65%,#a100ff_0%_8%,_#4d9cff_26%,#5c2970_26%_32%,#0000_30%_100%),_linear-gradient(to_left,_#264b8d,_rgb(168_85_247_/_0))] w-full delay-1000 border-4 border-white-300 opacity-100 object-contain group-aria-hidden/button:opacity-0 invisible rounded-md absolute group-aria-hidden/button:delay-0 group-aria-hidden/button:-translate-x-4 translate-x-0 transition-all  ease-in-out' >
              </div>
              <div class='flex flex-col relative gap-4 h-fit'>
                <div class='absolute z-50 right-0 flex gap-1 items-center justify-center top-0 min-w-6'>
                    <div role='button' title='Change name translation' aria-label='Change name translation' id='left-arrow' class='group'>
                    <i class="fa-solid fa-caret-left opacity-60 text-xl group-active:opacity-100 transition-all ease-in duration-100"></i>
                    </div>
                    <div id='translation-choice' class='text-lg' data-value='0'>
                    <span>
                      ${translationsArray[0].code}
                      </span>
                    </div>
                    <div role='button' title='Change name translation' aria-label='Change name translation' id='right-arrow' class='group'>
                      <i class="fa-solid fa-caret-right opacity-60 text-xl group-active:opacity-100 transition-all ease-in duration-100"></i>
                    </div>
                </div>
                <div id='country-name-button' role='button' title='Toggle name type' aria-label='Toggle name type'  aria-hidden='true' class='grid grid-cols-[max-content_auto] relative items-center p-2 gap-3 group/button'>
                  
                  <div class='group/toggle'>
                    <i id='name-toggle' class="fa-solid fa-toggle-off cursor-pointer group-aria-hidden/button:text-white-600 group-hover/toggle:opacity-100 group-hover/button:opacity-100 opacity-70 transition-all ease-in duration-100 text-sky-500 text-2xl"></i>
                  </div>
                  <div id='name-container' class='flex items-center'>
                    <h3 id='name-common' class="text-3xl text-center translate-x-4 delay-0 opacity-0 group-aria-hidden/button:opacity-100 relative font-title  group-aria-hidden/button:delay-1000 group-aria-hidden/button:translate-x-0 transition-all text-white-300  ease-in-out font-extrabold"
                    >${name.common}</h3>
                    <h3 id='name-official' class="text-3xl opacity-100 text-center  translate-x-0 invisible absolute group-aria-hidden/button:opacity-0 group-aria-hidden/button:delay-0 font-title  delay-1000 group-aria-hidden/button:-translate-x-4 text-white-300 transition-all  ease-in-out font-extrabold"
                    >${name.official}</h3>
                  </div>
                </div>
              </div>
            </div>
            <div class='grid grid-cols-[repeat(auto-fill,_minmax(200px,_1fr))] gap-4 p-2'>
              <div class='flex items-baseline gap-2'>
                <div class='rounded-md flex items-center justify-center w-7 h-7  border border-white-300 bg-gradient-to-r from-blue-300 via-purple-500 gap-2 to-pink-500'>
                  <i class="fa-solid fa-users-between-lines text-white-50 text-lg"></i>
                </div>
                <span class='text-xl font-title'>${population.toLocaleString()} <span class='text-lg font-title'>people</span></span>
              </div>
              <div class='flex items-baseline gap-2'>
                <div class='flex items-center justify-center w-7 h-7 rounded-md border border-white-300 bg-gradient-to-r from-blue-300 via-purple-500 gap-2 to-pink-500'>
                  <i class="fa-solid fa-landmark-flag text-white-50 text-lg"></i>
                </div>
                <span class='text-xl font-title'>${capital}</span>
              </div>
              <div class='flex items-baseline gap-2'>
                <div class='flex items-center justify-center w-7 h-7 rounded-md border border-white-300 bg-gradient-to-r from-blue-300 via-purple-500 gap-2 to-pink-500'>
                  <i class="fa-solid fa-coins text-white-50 text-lg"></i>                
                </div>
                <div class='*:mr-1'>
                  <span class='text-xl font-title'>${currency.symbol}</span> 
                  <span class='text-xl relative bottom-1'>|</span>
                  <span class='text-xl font-title'>${currency.code}</span> 
                  <span class='text-xl relative bottom-1'>|</span>
                  <span class='text-xl font-title'>${currency.name}</span>
                </div> 
              </div>
              <div class='flex items-baseline gap-2'>
                <div class='flex items-center justify-center w-7 h-7 rounded-md border border-white-300 bg-gradient-to-r from-blue-300 via-purple-500 gap-2 to-pink-500'>
                  <i class="fa-solid fa-expand text-white-50 text-lg"></i>
                </div>
                <span class='text-xl font-title'>${area.toLocaleString()} </span>
                <span class='text-lg font-title'>kilometers</span>
              </div>
            </div>
          </div>
`
    )
    .addTo(map);

  setTimeout(() => {
    const nameCommon = $('#name-common')[0];
    const nameOfficial = $('#name-official')[0];

    if (nameCommon && nameOfficial) {
      const maxHeight = Math.max(
        nameCommon.scrollHeight,
        nameOfficial.scrollHeight
      );

      $('#name-container').css('height', `${maxHeight}px`);
    }
  }, 100);

  $('#right-arrow').on('click', (e) => {
    e.stopPropagation();
  });
  $('#left-arrow').on('click', (e) => {
    e.stopPropagation();
  });

  $('#country-image-button').on('click', function () {
    if (animating) return;

    animating = true;

    const buttonEnabled =
      $('#country-image-button').attr('aria-hidden') === 'false';

    if (buttonEnabled) {
      $('#country-image-button').attr('aria-hidden', 'true');
      $('#country-coat').removeClass('animate-start_absolute');
      $('#country-coat').addClass('animate-end_absolute');
      $('#country-flag').removeClass('invisible');

      setTimeout(() => {
        $('#country-flag').removeClass('animate-end_absolute');
        $('#country-flag').addClass('animate-start_absolute');
        $('#country-coat').addClass('invisible');
        animating = false;
      }, 500);
    } else {
      $('#country-image-button').attr('aria-hidden', 'false');
      $('#country-flag').removeClass('animate-start_absolute');
      $('#country-flag').addClass('animate-end_absolute');
      $('#country-coat').removeClass('invisible');

      setTimeout(() => {
        $('#country-coat').removeClass('animate-end_absolute');
        $('#country-coat').addClass('animate-start_absolute');
        $('#country-flag').addClass('invisible');

        animating = false;
      }, 500);
    }
  });

  $('#country-name-button').on('click', function () {
    if (animating) return;

    animating = true;

    const buttonEnabled =
      $('#country-name-button').attr('aria-hidden') === 'false';

    if (buttonEnabled) {
      $('#country-name-button').attr('aria-hidden', 'true');
      $('#name-official').removeClass('animate-start_absolute');
      $('#name-official').addClass('animate-end_absolute');
      $('#name-toggle').removeClass('fa-toggle-on');
      $('#name-toggle').addClass('fa-toggle-off');
      $('#name-common').removeClass('invisible');

      setTimeout(() => {
        $('#name-common').removeClass('animate-end_absolute');
        $('#name-common').addClass('animate-start_absolute');
        $('#name-official').addClass('invisible');
        animating = false;
      }, 500);
    } else {
      $('#country-name-button').attr('aria-hidden', 'false');
      $('#name-common').removeClass('animate-start_absolute');
      $('#name-common').addClass('animate-end_absolute');
      $('#name-toggle').removeClass('fa-toggle-off');
      $('#name-toggle').addClass('fa-toggle-on');
      $('#name-official').removeClass('invisible');

      setTimeout(() => {
        $('#name-official').removeClass('animate-end_absolute');
        $('#name-official').addClass('animate-start_absolute');
        $('#name-common').addClass('invisible');
        animating = false;
      }, 500);
    }
  });
};

const mapPromise = initialiseMap();

mapPromise.then((map) => {
  map.scrollZoom.setWheelZoomRate(0.005);
  map.scrollZoom.setZoomRate(0.005);
});
