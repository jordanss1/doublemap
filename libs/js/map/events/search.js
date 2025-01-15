/// <reference path="../../jquery.js" />

mapPromise.then((map) => {
  let searchLoading = false;

  $('#search').on('keydown', async (e) => {
    let value = e.target.value;

    if (e.key === 'Enter' && value.length) {
      if (chosenCountryISO) {
        updateChosenCountryState();
      }

      if (!searchLoading) {
        panToSearchResult(0);
      }
    }
  });

  let reverseLookupTimeout;
  let searchTimer;

  $('#search').on('focus', ({ target }) => {
    $('#search-container-inside').removeClass('outline-0');
    $('#search-container-inside').addClass('outline-3');

    const isPopoutDisabled =
      $('#search-popout').attr('aria-disabled') === 'true';

    if (isPopoutDisabled && target.value.length) {
      $('#search-popout').attr('aria-disabled', 'false');
    }
  });

  $('#search').on('blur', ({ e }) => {
    $('#search-container-inside').removeClass('outline-3');
    $('#search-container-inside').addClass('outline-0');

    if (e.target === e.currentTarget) {
      $('#search-popout').attr('aria-disabled', 'true');
    }
  });

  $('#search').on('input', async (e) => {
    let value = e.target.value.trim();

    clearTimeout(reverseLookupTimeout);
    clearTimeout(searchTimer);

    const isPopoutDisabled =
      $('#search-popout').attr('aria-disabled') === 'true';

    if (value.length) {
      if (isPopoutDisabled) {
        $('#search-popout').attr('aria-disabled', 'false');
      }

      const normalizedValue = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      searchTimer = setTimeout(
        () => getSearchResults(normalizedValue, searchLoading),
        1500
      );

      const closestMatch = categorySearchOption(value);

      if (closestMatch) {
        const { neighborhood, place, region, district } =
          mostRecentLocation.context;

        const categoryName = closestMatch.name.toLowerCase();

        $('#search-category').children().remove();

        $('#search-category').append(/*html*/ `
            <div id='search-category-item' class='flex items-baseline gap-1' data-value='${closestMatch.canonical_id}'>
            <i
            class="fa-solid fa-magnifying-glass text-[10px] text-slate-700"
            ></i>
            <div>
             <span class='text-sm'>${closestMatch.name}</span><span> - <span id='search-category-item-default-area' class='text-white-900 text-[13px]'></span><span id='search-category-item-appended' class='text-white-900 text-[13px]'></span>
            </div>
          </div>`);

        const regex = new RegExp(`^${categoryName}(\\s)`, 'i');

        const areaToSearch = normalizedValue
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

        if (normalizedValue.length > 0 && areaToSearch[0]) {
          clearTimeout(reverseLookupTimeout);

          const prepositions = ['near', 'around', 'in'];

          if (regex.test(normalizedValue)) {
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
      $('#search-normal').children().remove();
      searchResults = [];

      if (!isPopoutDisabled) {
        $('#search-popout').attr('aria-disabled', 'true');
      }
    }
  });

  $('#search-category').on(
    'click',
    '#search-category-item',
    async function (e) {
      $('#search-container-inside').removeClass('outline-3');
      $('#search-container-inside').addClass('outline-0');

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

        $('#search-popout').attr('aria-disabled', 'true');

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
      } finally {
        $('#search-popout').attr('aria-disabled', 'true');
      }
    }
  );

  $('#search-normal').on('click', '#search-normal-item', function (e) {
    panToSearchResult($(this).data('value'));
  });
});

function panToSearchResult(indexInResults) {
  $('#search-container-inside').removeClass('outline-3');
  $('#search-container-inside').addClass('outline-0');

  const { coordinates, feature_type, bbox, context } =
    searchResults[indexInResults];

  console.log(feature_type);
  console.log(indexInResults);
  console.log(searchResults);

  const coords = [coordinates.longitude, coordinates.latitude];

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

  $('#search-popout').attr('aria-disabled', 'true');
}

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
