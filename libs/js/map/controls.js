/// <reference path="../jquery.js" />

mapPromise.then((map) => {
  $('#zoom-in').on('click', () => {
    let currentZoom = map.getZoom();
    map.easeTo({ zoom: currentZoom + 0.3 });
  });

  $('#zoom-out').on('click', () => {
    let currentZoom = map.getZoom();

    map.easeTo({ zoom: currentZoom - 0.3 });
  });

  const slider = $('#day-slider');
  const popupContainer = $('#popup-container');

  $('#history-control').on('click', async () => {
    if (historyMode) await getToken();

    await changeHistoryMode(map, !historyMode);
  });

  $('#slider-button').on('click', async () => {
    const isDaySliderEnabled =
      $('#day-slider-container').attr('aria-disabled') === 'false';

    if (isDaySliderEnabled) {
      $('#day-slider-container').attr('aria-disabled', 'true');
      $('#history-container').removeClass('h-20');
      $('#history-container').addClass('h-10');
      $('#history-date').attr('aria-disabled', 'true');
      $('#history-date').addClass('animate-end_absolute');
    } else {
      positionSliderPopup(slider, popupContainer);

      const progress =
        ((slider.val() - slider[0].min) / (slider[0].max - slider[0].min)) *
        100;

      $('#day-slider-container').attr('aria-disabled', 'false');
      $('#history-container').removeClass('h-10');
      $('#history-container').addClass('h-20');
      $('#history-date').attr('aria-disabled', 'false');
      $('#history-date').removeClass('animate-end_absolute');
      slider.css(
        '--track-color',
        `linear-gradient(to right, #4D9CFF ${progress}%, #d1d6e1 ${progress}%)`
      );
    }
  });

  slider.on('input', function () {
    const dayOfYear = $(this).val();
    const textBox = $('#popup-text');
    const progress = ((dayOfYear - this.min) / (this.max - this.min)) * 100;

    slider.css(
      '--track-color',
      `linear-gradient(to right, #4D9CFF ${progress}%, #d1d6e1 ${progress}%)`
    );

    const date = new Date(2024, 0);

    date.setDate(dayOfYear);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    positionSliderPopup(slider, popupContainer);

    textBox.text(dateString);
  });

  let sliderMouseUpTimer;
  let wikipediaTimer;

  slider.on('mousedown', function () {
    clearTimeout(sliderMouseUpTimer);
    clearTimeout(wikipediaTimer);

    sliderMouseUpTimer = applySliderStyles(true);
  });

  slider.on('mouseup', async function () {
    clearTimeout(sliderMouseUpTimer);

    const date = new Date(2024, 0);

    date.setDate(this.value);

    const dateString = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    sliderMouseUpTimer = applySliderStyles(false);

    wikipediaTimer = setTimeout(async () => {
      await getWikipediaEvents(day, month);

      $('#history-date').text(dateString);
    }, 1500);
  });

  $('#style-control').on('click', async () => {
    await getToken();

    if (historyMode) {
      await changeHistoryMode(map, false);
      return;
    }

    const zoom = map.getZoom();

    const currentIndex = styles.findIndex(
      (style) => currentBaseLayer === style.name
    );

    const nextIndex = currentIndex === 0 ? 1 : 0;

    map.setStyle(styles[nextIndex].url, {
      diff: true,
    });

    currentBaseLayer = styles[nextIndex].name;

    localStorage.setItem('currentBaseLayer', JSON.stringify(currentBaseLayer));

    map.once('style.load', async () => {
      if (currentBaseLayer === 'Dark') {
        nightNavStyles(map);
      } else {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      }

      const currentPoiLayer =
        currentPoiCategory === 'default' ? 'default-pois' : 'chosen-pois';

      if (zoom > 11 && currentPois) {
        addPoiSourceAndLayer(currentPois, currentPoiLayer);
      }
    });
  });

  $('#search').on('keydown', async (e) => {
    let value = e.target.value;

    if (e.key === 'Enter' && value.length) {
      getSearchResults(value);
    }
  });

  let reverseLookupTimeout;

  $('#search').on('input', async (e) => {
    let value = e.target.value.trim();
    clearTimeout(reverseLookupTimeout);

    if (value.length) {
      const closestMatch = categorySearchOption(value);

      if (closestMatch) {
        const { neighborhood, place, region, district } =
          mostRecentLocation.context;

        const categoryName = closestMatch.name.toLowerCase();
        const normalizedText = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        $('#search-category').children().remove();

        $('#search-category').append(
          /*html*/ `<div id='search-category-item' data-value='${closestMatch.canonical_id}'>${closestMatch.name} near <span id='search-category-item-default-area'></span><span id='search-category-item-appended'></span></div>`
        );

        const regex = new RegExp(`^${categoryName}(\\s)`, 'i');

        const areaToSearch = normalizedText
          .slice(categoryName.length)
          .split(/\s+/)
          .filter(Boolean);

        if (!areaToSearch[0]) {
          $('#search-category-item-default-area').text(
            `${neighborhood ? `${neighborhood}, ` : ''}${
              place ? `${place}` : ''
            }${district && district !== place ? `, ${district}` : ''}${
              region ? `, ${region}` : ''
            }`
          );
        }

        reverseLookupTimeout = await appendLocationToCategoryOption();

        if (normalizedText.length > 0 && areaToSearch[0]) {
          clearTimeout(reverseLookupTimeout);

          const prepositions = ['near', 'around', 'in'];

          if (regex.test(normalizedText)) {
            if (prepositions.includes(areaToSearch[0])) {
              $('#search-category-item-appended').append(
                ` ${areaToSearch.slice(1).join(' ')}`
              );
            } else {
              $('#search-category-item-default-area').text('');
              $('#search-category-item-appended').append(
                ` ${areaToSearch.join(' ')}`
              );
            }
          } else {
            $('#search-category').children().remove();
          }
        }
      } else {
        $('#search-category').children().remove();
      }
    } else {
      $('#search-category').children().remove();
    }
  });

  $('#country-select').on('click', '#country-option', async ({ target }) => {
    await getHistoryOfCountry(target.text);
    // const [restCountryData, geonames] = await getCountryData(target.value);

    // updateChosenCountryState(target.value);

    // if (geonames) {
    //   // changeMapInteraction(true);
    //   const bbox = [
    //     [geonames.west, geonames.south],
    //     [geonames.east, geonames.north],
    //   ];

    //   map.fitBounds(bbox, {
    //     padding: 20,
    //     maxZoom: 8,
    //     duration: 2000,
    //   });
    // }

    // if (restCountryData) {
    // }
  });

  $('#search-category').on(
    'click',
    '#search-category-item',
    async function (e) {
      const category = $(this).data('value');
      let areaToSearch = $('#search-category-item-appended').text();

      if (!areaToSearch) {
        const { longitude, latitude } = mostRecentLocation;

        map.fitBounds([
          [longitude - 0.1, latitude - 0.1],
          [longitude + 0.1, latitude + 0.1],
        ]);

        const bounds = {
          _sw: {
            lng: longitude - 0.1,
            lat: latitude - 0.1,
          },
          _ne: {
            lng: longitude + 0.1,
            lat: latitude + 0.1,
          },
        };

        currentPoiCategory = category;

        const pois = await getOverpassPois(bounds, category);

        await addPoiSourceAndLayer(pois, 'chosen-pois');

        return;
      }

      areaToSearch = encodeURIComponent(areaToSearch).trim();

      try {
        const { data } = await $.ajax({
          url: `/api/mapboxgljs/search?q=${areaToSearch}&limit=1&endpoint=forward`,
          method: 'GET',
          dataType: 'json',
        });

        if (data.length) {
          const { latitude, longitude } = data[0].properties.coordinates;

          map.flyTo({
            center: [longitude, latitude],
            speed: 1.5,
            curve: 2,
            zoom: 10,
          });

          const bounds = {
            _sw: { lng: longitude - 0.1, lat: latitude - 0.1 },
            _ne: { lng: longitude + 0.1, lat: latitude + 0.1 },
          };

          currentPoiCategory = category;

          const pois = await getOverpassPois(bounds, category);

          if (pois.length) {
            await addPoiSourceAndLayer(pois, 'chosen-pois');
          }
        } else {
        }
      } catch (err) {
        console.log(err);
      }
    }
  );

  $('#search-normal').on('click', '#search-normal-item', function (e) {
    console.log(searchResults[$(this).data('value')]);

    const { coordinates, feature_type, bbox, context } =
      searchResults[$(this).data('value')];

    const coords = [coordinates.longitude, coordinates.latitude]; // Southwest corner

    if (feature_type === 'region' || feature_type === 'country') {
      map.fitBounds(bbox, {
        padding: 20,
        maxZoom: 8,
        duration: 2000,
      });

      if (feature_type === 'country') {
        updateChosenCountryState(context.country.country_code);
      }
    } else {
      const zoom = zoomForFeatureType(feature_type);

      map.flyTo({
        center: coords,
        speed: 0.5,
        curve: 1,
        zoom,
        essential: true,
        duration: 2000,
      });
    }
  });
});

async function appendLocationToCategoryOption() {
  return setTimeout(async () => {
    const feature = await reverseLookupFromLatLng();

    if (!feature) return;

    const { district, neighborhood, region, place } = feature;

    mostRecentLocation.context = {
      neighborhood,
      district,
      region,
      place,
    };

    $('#search-category-item-default-area').text(
      `${neighborhood ? `${neighborhood}, ` : ''}${place ? `${place}` : ''}${
        district && district !== place ? `, ${district}` : ''
      }${region ? `, ${feature.region}` : ''}`
    );
  }, 500);
}

function categorySearchOption(value) {
  const closestMatch = categoryList.reduce((bestMatch, current) => {
    if (current.name === 'default') return bestMatch;

    const newValue = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const currentName = current.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (
      (currentName.includes(newValue) || newValue.includes(currentName)) &&
      (bestMatch === null || currentName.length > bestMatch.name.length)
    ) {
      return current;
    }

    return bestMatch;
  }, null);

  return closestMatch;
}

async function reverseLookupFromLatLng() {
  const currentZoom = map.getZoom();
  const { lng, lat } = map.getCenter();
  const { latitude, longitude } = mostRecentLocation;

  const zoomLimit = currentPoiCategory === 'default' ? 9 : 7;
  const threshold = 0.02;

  const initiateNewSearch =
    currentZoom >= zoomLimit &&
    (Math.abs(lng - longitude) > threshold ||
      Math.abs(lat - latitude) > threshold);

  if (initiateNewSearch) {
    mostRecentLocation.latitude = lat;
    mostRecentLocation.longitude = lng;

    try {
      const { data } = await $.ajax({
        url: `/api/mapboxgljs/search?latitude=${lat}&longitude=${lng}&limit=6&endpoint=reverse`,
        method: 'GET',
        dataType: 'json',
      });
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  return null;
}

async function getWikipediaEvents(day, month) {
  $('#day-slider').prop('disabled', true);

  try {
    const { data, complete } = await $.ajax({
      url: `/api/wikipedia/events?action=fetch&day=${day}&month=${month}`,
      method: 'GET',
      dataType: 'json',
    });

    console.log(data);

    if (complete === false) {
      try {
        const { data } = await $.ajax({
          url: `/api/wikipedia/events?action=update&day=${day}&month=${month}`,
          method: 'GET',
          dataType: 'json',
        });

        console.log(data);
      } catch (xhr) {
        const res = JSON.parse(xhr.responseText);
        console.log(
          `Error Status: ${xhr.status} - Error Message: ${res.error}`
        );
        console.log(`Response Text: ${res.details}`);
      }
    }
  } catch (xhr) {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  } finally {
    $('#day-slider').prop('disabled', false);
  }
}

function positionSliderPopup(slider, popup) {
  const dayOfYear = $(slider).val();

  const sliderRect = slider[0].getBoundingClientRect();
  const thumbWidth = 20;
  const thumbOffset =
    ((dayOfYear - slider[0].min) / (slider[0].max - slider[0].min)) *
    (sliderRect.width - thumbWidth);

  const popupLeft =
    sliderRect.left + thumbOffset + thumbWidth / 2 - popup.outerWidth() / 2;

  popup.css('--left-popup', `${popupLeft - 87}px`);
}

function applySliderStyles(mouseDown) {
  const popup = $('#popup-container');
  const sliderRect = $('#day-slider')[0].getBoundingClientRect();
  const top = mouseDown ? 70 : 55;

  $('#day-slider').css('--active-height', mouseDown ? '6px' : '8px');
  $('#day-slider').css('--scale-thumb', mouseDown ? '1.2' : 1);
  $('#day-slider').css('--color-thumb', mouseDown ? '#80b8ff' : '#4d9cff');
  $('#day-slider').css('--scale-track', mouseDown ? '.98' : 1);

  popup.css('--opacity-popup', mouseDown ? '100' : '0');
  popup.css('--top-popup', `${sliderRect.top - top}px`);
  popup.css('--popup-scale', mouseDown ? '1' : 0.8);

  if (map.getZoom() >= 2) {
    $('#day-slider-bg').css('--scale-track', mouseDown ? '.98' : '1');
  }

  return setTimeout(
    () => {
      popup.css('visibility', mouseDown ? 'visible' : 'hidden');
    },
    mouseDown ? 0 : 500
  );
}
