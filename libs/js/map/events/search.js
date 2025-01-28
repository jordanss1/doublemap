/// <reference path="../../jquery.js" />

mapPromise.then((map) => {
  let searchLoading = false;

  const performSearch = (value) => {
    if (value.length && !searchLoading) {
      if (chosenCountryISO) {
        updateChosenCountryState();
      }

      markAndPanToSearchResult(0);
    }
  };

  $('#search').on('keydown', async (e) => {
    let value = e.target.value;

    if (e.key === 'Enter') {
      performSearch(value);
    }
  });

  $('#search-button').on('click', async (e) => {
    const value = $('#search').val();

    const searchExpanded =
      $('#search-container').attr('aria-expanded') === 'true';

    if (window.innerWidth <= 768) {
      if (searchExpanded) {
        performSearch(value);
      } else {
        $('#search-container').attr('aria-expanded', 'true');
      }
    } else {
      performSearch(value);
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

      if (searchTerm !== normalizedValue) {
        searchTimer = setTimeout(
          () => getSearchResults(normalizedValue, searchLoading),
          1500
        );
      }

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
      const isPanelExpanded = $('#left-panel').attr('aria-expanded') === 'true';

      const category = $(this).data('value');
      let areaToSearch = $('#search-category-item-appended').text();

      if (!areaToSearch) {
        const { longitude, latitude } = mostRecentLocation;

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

        activateCategoryButton();

        const pois = await getOverpassPois(bounds, category);

        currentPois = pois;

        map.fitBounds(
          [
            [longitude - 0.1, latitude - 0.1],
            [longitude + 0.1, latitude + 0.1],
          ],
          {
            speed: 0.5,
            curve: 2,
            padding: {
              right: 50,
              top: 50,
              bottom: 50,
              left: isPanelExpanded ? 295 : 50,
            },
            zoom: 9.5,
            duration: 2500,
          }
        );

        addPoiSourceAndLayer(pois, 'chosen-pois');

        $('#search-popout').attr('aria-disabled', 'true');

        if (window.innerWidth <= 768) {
          $('#search-container').attr('aria-expanded', 'false');
        }

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

          const bounds = {
            _sw: { lng: longitude - 0.1, lat: latitude - 0.1 },
            _ne: { lng: longitude + 0.1, lat: latitude + 0.1 },
          };

          currentPoiCategory = category;

          activateCategoryButton();

          const pois = await getOverpassPois(bounds, category);

          currentPois = pois;

          map.flyTo({
            center: [longitude, latitude],
            speed: 0.5,
            curve: 2,
            zoom: 9.5,
          });

          addPoiSourceAndLayer(pois, 'chosen-pois');
        } else {
          // couldn't find area to search
        }
      } catch (err) {
        console.log(err);
      } finally {
        $('#search-popout').attr('aria-disabled', 'true');

        if (window.innerWidth <= 768) {
          $('#search-container').attr('aria-expanded', 'false');
        }
      }
    }
  );

  $('#search-normal').on('click', '#search-normal-item', function (e) {
    markAndPanToSearchResult($(this).data('value'));
    console.log($(this).data('value'));
  });
});

let searchTimeout;

function markAndPanToSearchResult(indexInResults) {
  clearTimeout(searchTimeout);
  const isPanelExpanded = $('#left-panel').attr('aria-expanded');

  $('#search-container-inside').removeClass('outline-3');
  $('#search-container-inside').addClass('outline-0');

  searchTimeout = setTimeout(() => {
    appendLocationToCategoryOption(true);
  }, 3000);

  currentPoiCategory = 'default';

  addPoiSourceAndLayer([], 'default-pois');

  const { coordinates, feature_type, bbox, context } =
    searchResults[indexInResults].properties;

  const coords = [coordinates.longitude, coordinates.latitude];

  if (feature_type === 'country') {
    updateChosenCountryState(context.country.country_code);
  } else {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    if (!map.getSource('markers-source')) {
      map.addSource('markers-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [searchResults[indexInResults]],
        },
      });
    } else {
      map.getSource('markers-source').setData({
        type: 'FeatureCollection',
        features: [searchResults[indexInResults]],
      });
    }

    currentMarker = searchResults[indexInResults];

    map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

    changeExitButton(false, 'Exit chosen result');

    addMarkersLayer();
    map.moveLayer('modern-markers-layer');
  }

  if (bbox && bbox.length) {
    map.fitBounds(bbox, {
      padding: {
        right: 20,
        top: 20,
        bottom: 20,
        left: isPanelExpanded ? 295 : 20,
      },
      retainPadding: false,
      maxZoom: 8,
      speed: 0.5,
      curve: 2,
      duration: 2500,
    });
  } else {
    const zoom = zoomForFeatureType(feature_type);

    map.flyTo({
      center: coords,
      speed: 0.5,
      curve: 1,
      zoom,
      essential: true,
      duration: 2500,
    });
  }

  $('#search-popout').attr('aria-disabled', 'true');
}

async function appendLocationToCategoryOption(noZoomLimit = null) {
  return setTimeout(async () => {
    const feature = await reverseLookupFromLatLng(noZoomLimit);

    if (!feature) return;

    const { district, neighborhood, region, place } = feature;

    mostRecentLocation.context = {
      neighborhood,
      district,
      region,
      place,
    };

    $('#search-category-item-appended').text('');

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

async function reverseLookupFromLatLng(noZoomLimit = null) {
  const currentZoom = map.getZoom();
  const { lng, lat } = map.getCenter();
  const { latitude, longitude } = mostRecentLocation;

  const zoomLimit = noZoomLimit ? 0 : currentPoiCategory === 'default' ? 9 : 7;
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
