/// <reference path="../jquery.js" />

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
  const currentIndex = baseLayers.findIndex(
    ({ name }) => name === currentBaseLayer
  );

  const newIndex =
    currentIndex === baseLayers.length - 1 ? 0 : currentIndex + 1;

  map.setStyle(baseLayers[newIndex].style);
  currentBaseLayer = baseLayers[newIndex].name;

  localStorage.setItem('currentBaseLayer', JSON.stringify(currentBaseLayer));
});

$('#search').on('keydown', (e) => {
  let value = e.target.value;

  if (e.key === 'Enter' && value.length) {
    getSearchResults(value);
  }
});

$('#search').on('input', (e) => {
  let value = e.target.value;
  if (value.length) {
    categorySearchOption(value);
  }
});

$('#country-select').on('click', '#country-option', ({ target }) => {
  console.log(target);
  getCountryData(target.value);
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

map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['poi-label'], // This is typically the layer name for POIs in Mapbox styles
  });

  if (features.length > 0) {
    const poi = features[0];
    console.log('POI details:', poi.properties);

    // You can use this data to display a popup or update your UI
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(
        `<h3>${poi.properties.name}</h3><p>Type: ${poi.properties.type}</p>`
      )
      .addTo(map);
  }
});

function categorySearchOption(value) {
  const closestMatch = categories.reduce((bestMatch, current) => {
    let newValue = value.toLowerCase();
    let currentName = current.name.toLowerCase();

    if (
      currentName.indexOf(newValue) !== -1 &&
      (bestMatch === null ||
        currentName.indexOf(newValue) <
          bestMatch.name.toLowerCase().indexOf(newValue))
    ) {
      return current;
    }

    return bestMatch;
  }, null);

  $('#search-category').children().remove();

  if (closestMatch) {
    $('#search-category').append(
      /*html*/ `<div data-value='${closestMatch.canonical_id}'>${closestMatch.name}</div>`
    );
  }
}
