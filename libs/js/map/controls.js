/// <reference path="../jquery.js" />

$('#zoom-in').on('click', () => {
  let currentZoom = map.getZoom();
  map.easeTo({ zoom: currentZoom + 0.3 });
});

$('#zoom-out').on('click', () => {
  let currentZoom = map.getZoom();

  map.easeTo({ zoom: currentZoom - 0.3 });
});

$('#style-control').on('click', () => {
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
