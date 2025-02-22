/// <reference path="../../jquery.js" />

let locToCategoryTimer;

mapPromise.then((map) => {
  const performSearch = (value) => {
    if (value.length && !searchLoading) {
      if (chosenCountryISO) {
        updateChosenCountryState();
      }

      $('#search-container-inside').removeClass('outline-3');
      $('#search-container-inside').addClass('outline-0');

      markAndPanToSearchResult(searchResults[0]);
    }
  };

  $('#search').on('keydown', async (e) => {
    if (disableAllButtons) return;

    let value = e.target.value;

    if (e.key === 'Enter') {
      performSearch(value);
    }

    if (e.key === 'Backspace') {
      let value = e.target.value.slice(0, -1).trim();

      const normalizedValue = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (searchTerm === normalizedValue) {
        $('#search-button-spinner').attr('aria-disabled', 'true');
        changePanelSpinners(false);
      }
    }
  });

  $('#search-button').on('click', async (e) => {
    if (disableAllButtons) return;

    clearTimeout(locToCategoryTimer);

    const value = $('#search').val();

    const searchExpanded =
      $('#search-container').attr('aria-expanded') === 'true';

    if (window.innerWidth <= 768) {
      if (searchExpanded) {
        performSearch(value);
      } else {
        $('#search-container').attr('aria-expanded', 'true');

        if (window.innerWidth <= 424) {
          if (chosenCountryISO) {
            clearSidebarContent();
            currentPoiCategory = 'default';

            updateChosenCountryState();

            await flyToPromise({
              speed: 0.5,
              zoom: map.getZoom() - 0.5,
              duration: 1000,
            });
          }

          expandSidebar(true);
        }
      }
    } else {
      performSearch(value);
    }
  });

  let reverseLookupTimeout;
  let searchTimer;

  $('#search').on('focus', ({ target }) => {
    if (disableAllButtons) return;

    $('#search-container-inside').removeClass('outline-0');
    $('#search-container-inside').addClass('outline-3');

    const isPopoutDisabled =
      $('#search-popout').attr('aria-disabled') === 'true';

    if (isPopoutDisabled && target.value.length) {
      $('#search-popout').attr('aria-disabled', 'false');
    }
  });

  $('#search').on('input', async (e) => {
    if (disableAllButtons) return;

    let value = e.target.value.trim();

    clearTimeout(reverseLookupTimeout);
    clearTimeout(searchTimer);
    clearTimeout(locToCategoryTimer);

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

      if (searchTerm === normalizedValue) return;

      $('#search-button-spinner').attr('aria-disabled', 'false');

      if (!$('#content-results').find('#poi-content-item').length) {
        changePanelSpinners(true);
        expandSidebar(true);
      }

      searchTimer = setTimeout(async () => {
        try {
          await getSearchResults(normalizedValue);
        } catch (err) {
        } finally {
          $('#search-button-spinner').attr('aria-disabled', 'true');
          changePanelSpinners(false);
        }
      }, 1500);

      const closestMatch = categorySearchOption(value);

      if (closestMatch) {
        const { neighborhood, place, region, district } =
          mostRecentLocation.context;

        const categoryName = closestMatch.name.toLowerCase();

        $('#search-category').children().remove();

        $('#search-category').append(/*html*/ `
          <div id='search-category-item' class='flex cursor-pointer group px-1 hover:bg-sky-400 items-baseline gap-1' data-value='${closestMatch.canonical_id}'>
          <i
          class="fa-solid fa-magnifying-glass group-hover:text-purple-500 text-[10px] text-slate-700"
          ></i>
          <div>
           <span class='text-sm'>${closestMatch.name}</span><span> - <span id='search-category-item-default-area' class='text-white-900 group-hover:text-white-50 text-[13px]'></span><span id='search-category-item-appended' class='text-white-900 group-hover:text-white-50 text-[13px]'></span>
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
      $('#search-button-spinner').attr('aria-disabled', 'true');
      changePanelSpinners(false);

      $('#search-category').children().remove();
      $('#search-normal').children().remove();
      searchResults = [];
      searchTerm = '';

      if ($('#content-results').find('#search-content-item').length) {
        clearSidebarContent();
        $('#content-chosen').empty();
        $('#content-chosen').attr('aria-disabled', 'true');
      }

      if (!isPopoutDisabled) {
        $('#search-popout').attr('aria-disabled', 'true');
      }
    }
  });

  let flyToTimer3;

  $('#search-category').on(
    'click',
    '#search-category-item',
    async function (e) {
      if (disableAllButtons) return;

      $('#search-container-inside').removeClass('outline-3');
      $('#search-container-inside').addClass('outline-0');

      clearTimeout(reverseLookupTimeout);
      clearTimeout(searchTimer);
      clearTimeout(flyToTimer3);
      clearTimeout(locToCategoryTimer);

      changePanelSpinners(true);

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

        if (window.innerWidth > 640) {
          expandSidebar(true);
        }

        flyToTimer3 = setTimeout(async () => {
          await flyToPromise({
            center: [longitude, latitude],
            speed: 0.5,
            curve: 2,
            zoom: 10.5,
            duration: 2500,
          });

          try {
            const newPois = await getOverpassPois(bounds, category);

            previousPois = [...currentPois];
            currentPois = newPois;

            addPoiSourceAndLayer(newPois, 'chosen-pois');
          } catch (err) {
            console.log(err);
          } finally {
            changePanelSpinners(false);
            $('#search-popout').attr('aria-disabled', 'true');

            if (window.innerWidth <= 768) {
              $('#search-container').attr('aria-expanded', 'false');
            }
          }
        }, 50);

        return;
      }

      areaToSearch = encodeURIComponent(areaToSearch).trim();

      try {
        const { data } = await $.ajax({
          url: `/api/mapboxgljs/search?q=${areaToSearch}&limit=1&endpoint=forward`,
          method: 'GET',
          dataType: 'json',
        });

        if (window.innerWidth > 640) {
          expandSidebar(true);
        }

        if (data.length) {
          const { latitude, longitude } = data[0].properties.coordinates;

          const bounds = {
            _sw: { lng: longitude - 0.1, lat: latitude - 0.1 },
            _ne: { lng: longitude + 0.1, lat: latitude + 0.1 },
          };

          currentPoiCategory = category;

          activateCategoryButton();

          flyToTimer3 = setTimeout(async () => {
            await flyToPromise({
              center: [longitude, latitude],
              speed: 0.5,
              curve: 2,
              zoom: 10.5,
              duration: 2500,
            });

            const newPois = await getOverpassPois(bounds, category);

            previousPois = [...currentPois];
            currentPois = newPois;

            addPoiSourceAndLayer(newPois, 'chosen-pois');
          }, 50);
        } else {
          // couldn't find area to search
          // use mostRecentLocation
        }
      } catch (err) {
        //
      } finally {
        changePanelSpinners();

        $('#search-popout').attr('aria-disabled', 'true');

        if (window.innerWidth <= 768) {
          $('#search-container').attr('aria-expanded', 'false');
        }
      }
    }
  );

  $('#search-normal').on('click', '#search-normal-item', function (e) {
    if (disableAllButtons) return;

    const selectedResult = searchResults[$(this).data('value')];

    $('#search-container-inside').removeClass('outline-3');
    $('#search-container-inside').addClass('outline-0');

    markAndPanToSearchResult(selectedResult);
  });
});

function markAndPanToSearchResult(selectedResult) {
  clearTimeout(locToCategoryTimer);

  if (window.innerWidth > 640) {
    expandSidebar(true);
  }

  currentMarker = null;
  selectedPoi = null;

  currentPoiCategory = 'default';

  addPoiSourceAndLayer([], 'default-pois');

  locToCategoryTimer = setTimeout(() => {
    appendLocationToCategoryOption(true);
  }, 3000);

  const { coordinates, feature_type, bbox, context, mapbox_id } =
    selectedResult.properties;

  selectedSearch = mapbox_id;

  const coords = [coordinates.longitude, coordinates.latitude];

  appendSearchResults(searchResults);

  if (feature_type === 'country') {
    updateChosenCountryState(context.country.country_code);
  } else {
    if (chosenCountryISO) {
      updateChosenCountryState();
    }

    addMarkersSourceAndLayer([selectedResult]);

    currentMarker = selectedResult;

    map.setLayoutProperty('modern-markers-layer', 'visibility', 'visible');

    changeExitButton(false, 'Exit chosen result');

    map.moveLayer('modern-markers-layer');
  }

  if (bbox && bbox.length) {
    fitBoundsDelayed(bbox, {
      maxZoom: 8,
      speed: 0.5,
      curve: 2,
      duration: 2500,
    });
  } else {
    const zoom = zoomForFeatureType(feature_type);

    flyToDelayed({
      center: coords,
      speed: 0.5,
      curve: 2,
      zoom,
      essential: true,
      duration: 2500,
    });
  }

  $('#search-popout').attr('aria-disabled', 'true');
}

let appendTimer;

async function appendLocationToCategoryOption(noZoomLimit = null) {
  clearTimeout(appendTimer);

  appendTimer = setTimeout(async () => {
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
      throw err;
    }
  }

  return null;
}
