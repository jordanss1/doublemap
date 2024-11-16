/// <reference path="../jquery.js" />

let baseLayers = {};
let baseButtonLayerStates = [];

Object.keys(styles).map((friendlyName, i) => {
  $.ajax({
    url: `/api/mapboxgljs?style=${styles[friendlyName]}`,
    method: 'GET',
    success: (response) => {
      baseLayers[friendlyName] = response;

      baseButtonLayerStates.push({
        name: friendlyName,
        changeLayer: () => {
          const newIndex = baseButtonLayerStates.length - 1 === i ? 0 : i + 1;
          const nextLayer = baseButtonLayerStates[newIndex].name;

          console.log(this.name);
          console.log(nextLayer);

          map.setStyle(baseLayers[nextLayer]);
          currentBaseLayer = nextLayer;

          localStorage.setItem(
            'currentBaseLayer',
            JSON.stringify(currentBaseLayer)
          );
        },
      });
    },
    error: (xhr) => {
      console.log(xhr);
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
});
