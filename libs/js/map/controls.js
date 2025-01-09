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

  $('#history-control').on('click', async () => {
    if (historyMode) await getToken();

    await changeHistoryMode(map, !historyMode);
  });

  $('#slider-button').on('click', async () => {
    const isDaySliderEnabled =
      $('#day-slider-container').attr('aria-disabled') === 'false';

    if (isDaySliderEnabled) {
      $('#day-slider-container').attr('aria-disabled', 'true');
    } else {
      await getWikipediaEvents();
      $('#day-slider-container').attr('aria-disabled', 'false');
    }
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

  $('#search').on('keydown', (e) => {
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
          $('#search-category-item-default-area').text('');
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
    await getCountryData(target.value);
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
            speed: 0.5,
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
    const { coordinates, feature_type } = searchResults[$(this).data('value')];

    const coords = [coordinates.longitude, coordinates.latitude]; // Southwest corner

    const zoom = zoomForFeatureType(feature_type);

    map.flyTo({
      center: coords,
      speed: 3,
      curve: 1.7,
      zoom,
    });
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

    $('#search-category-item-default-area').text('');
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

async function getWikipediaEvents() {
  try {
    const { data, initial } = await $.ajax({
      url: '/api/wikipedia/events?day=01&month=11',
      method: 'GET',
      dataType: 'json',
    });

    console.log(data);

    if (initial) {
      try {
        const { data } = await $.ajax({
          url: '/api/wikipedia/events?day=01&month=11',
          method: 'GET',
          dataType: 'json',
        });
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
  }
}
