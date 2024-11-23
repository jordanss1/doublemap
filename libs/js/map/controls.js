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

$('#country-select').on('click', '#country-option', ({ target }) => {
  console.log(target);
  getCountryData(target.value);
});
