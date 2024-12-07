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

  $('#search').on('input', (e) => {
    let value = e.target.value.trim();

    if (value.length) {
      const closestMatch = categorySearchOption(value);

      if (closestMatch) {
        const categoryName = closestMatch.name.toLowerCase();
        const normalizedText = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        $('#search-category').children().remove();

        $('#search-category').append(
          /*html*/ `<div id='search-category-item' data-value='${closestMatch.canonical_id}'>${closestMatch.name} near</div>`
        );

        const regex = new RegExp(`^${categoryName}(\\s)`, 'i');

        const areaToSearch = normalizedText
          .slice(categoryName.length)
          .split(/\s+/)
          .filter(Boolean);

        if (normalizedText.length > 0 && areaToSearch[0]) {
          const prepositions = ['near', 'around', 'in'];

          if (regex.test(normalizedText)) {
            if (prepositions.includes(areaToSearch[0])) {
              $('#search-category-item').append(
                ` ${areaToSearch.slice(1).join(' ')}`
              );
            } else {
              $('#search-category-item').append(` ${areaToSearch.join(' ')}`);
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

  $('#search-category').on('click', '#search-category-item', (e) => {
    const category = $(this).data('value');

    $.ajax({
      url: `/api/mapboxgljs/category?category=${category}`,
      method: 'POST',
      dataType: 'json',
      data: {},
      success: () => {},
      error: () => {},
    });
  });

  $('#search-normal').on('click', '#search-normal-item', function (e) {
    const { coordinates, feature_type } = searchResults[$(this).data('value')];
    const coords = [coordinates.longitude, coordinates.latitude]; // Southwest corner

    const zoom = feature_type === 'poi' ? 16 : 10;

    map.flyTo({
      center: coords,
      speed: 3,
      curve: 1.7,
      zoom,
    });
  });
});

function categorySearchOption(value) {
  const closestMatch = categories.reduce((bestMatch, current) => {
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
