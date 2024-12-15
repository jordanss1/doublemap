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

  $('#style-control').on('click', async () => {
    await getToken();

    const currentIndex = styles.findIndex(
      (style) => currentBaseLayer === style.name
    );
    const nextIndex = currentIndex === styles.length - 1 ? 0 : currentIndex + 1;

    map.setStyle(styles[nextIndex].url, {
      diff: true,
      config: { basemap: { showPointOfInterestLabels: false } },
    });

    currentBaseLayer = styles[nextIndex].name;

    localStorage.setItem('currentBaseLayer', JSON.stringify(currentBaseLayer));
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

        console.log(neighborhood);

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

        reverseLookupTimeout = setTimeout(async () => {
          const feature = await reverseLookupFromLatLng();

          if (!feature) return;

          const { district, neighborhood, region, place } = feature;
          console.log(neighborhood);

          mostRecentLocation.context = {
            neighborhood,
            district,
            region,
            place,
          };

          $('#search-category-item-default-area').text('');
          $('#search-category-item-default-area').text(
            `${neighborhood ? `${neighborhood}, ` : ''}${
              place ? `${place}` : ''
            }${district && district !== place ? `, ${district}` : ''}${
              region ? `, ${feature.region}` : ''
            }`
          );
        }, 500);

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

  $('#country-select').on('click', '#country-option', ({ target }) => {
    getCountryData(target.value);
  });

  $('#search-category').on(
    'click',
    '#search-category-item',
    async function (e) {
      const category = $(this).data('value');
      let areaToSearch = $('#search-category-item-appended').text();

      if (!areaToSearch) {
        return getOverpassPois(map.getBounds(), category);
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

          getOverpassPois(bounds, category);
        } else {
        }
      } catch {}
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

function categorySearchOption(value) {
  const closestMatch = categoryList.reduce((bestMatch, current) => {
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

  const threshold = 0.02;

  const initiateNewSearch =
    currentZoom >= 9 &&
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

function zoomForFeatureType(feature_type) {
  if (feature_type === 'region' || feature_type === 'country') {
    return 3;
  }

  if (feature_type === 'poi' || feature_type === 'street') {
    return 16;
  }

  return 10;
}
