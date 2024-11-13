/// <reference path="../jquery.js" />

let allCountriesLayer = L.layerGroup();
let selectedCountriesLayer = L.layerGroup();

let baseButtonLayerStates = [];

const loadBaseLayers = async () => {
  const layerPromises = Object.keys(styles).map(async (friendlyName, i) => {
    return new Promise((resolve, reject) => {
      if (currentBaseLayer !== friendlyName) {
        $.ajax({
          url: `/api/mapboxgljs?style=${styles[friendlyName]}`,
          method: 'GET',
          success: (response) => {
            console.log(response.sprite);
            baseLayers[friendlyName] = response;

            baseButtonLayerStates.push({
              stateName: friendlyName,
              index: i,
              changeLayer: () => {
                const newIndex =
                  baseButtonLayerStates.length - 1 === i ? 0 : i + 1;
                const nextLayer = baseButtonLayerStates[newIndex].stateName;

                map.setStyle(baseLayers[nextLayer]);
                currentBaseLayer = nextLayer;

                localStorage.setItem(
                  'currentBaseLayer',
                  JSON.stringify(currentBaseLayer)
                );
              },
            });

            resolve();
          },
          error: (xhr) => {
            console.log(xhr);
            const res = JSON.parse(xhr.responseText);
            console.log(
              `Error Status: ${xhr.status} - Error Message: ${res.error}`
            );
            console.log(`Response Text: ${res.details}`);
            reject(new Error('Failed to load map style'));
          },
        });
      } else {
        resolve();
      }
    });
  });

  await Promise.all(layerPromises);
};

loadBaseLayers();
