const styles = {
  Streets: "jawg-streets",
  Sunny: "jawg-sunny",
  Terrain: "jawg-terrain",
  Dark: "jawg-dark",
  Light: "jawg-light",
};

let baseLayers = {};
let buttonLayerStates = [];

Object.keys(styles).forEach((friendlyName) => {
  baseLayers[friendlyName] = L.tileLayer(
    `/api/tileLayer?style={style}&z={z}&x={x}&y={y}`,
    {
      attribution:
        '<a href="https://jawg.io?utm_medium=map&utm_source=attribution" title="Tiles Courtesy of Jawg Maps" target="_blank" class="jawg-attrib">&copy; <b>Jawg</b>Maps</a> | <a href="https://www.openstreetmap.org/copyright" title="OpenStreetMap is open data licensed under ODbL" target="_blank" class="osm-attrib">&copy; OSM contributors</a>',
      minZoom: 0,
      maxZoom: 22,
      style: styles[friendlyName], // Dynamically set the style
    }
  );

  //   buttonLayerStates.push({
  //     stateName: friendlyName, // using easy button
  //     icon: "fa-layer-group",
  //     title: "Change map type",
  //     onClick: (control) => {
  //       const currentIndex = buttonLayerStates.findIndex(
  //         (ele) => ele.stateName === control._currentState.stateName
  //       );
  //       const newIndex =
  //         buttonLayerStates.length - 1 === currentIndex ? 0 : currentIndex + 1;

  //       map.removeLayer(baseLayers[friendlyName]);
  //       map.addLayer(baseLayers[buttonLayerStates[newIndex].stateName]);
  //       control.state(buttonLayerStates[newIndex].stateName);
  //     },
  //   });
});

// const baseLayerToggle = L.easyButton({
//   id: "base-layers-button",
//   states: buttonLayerStates,
// });

// baseLayerToggle.addTo(map);

baseLayers["Streets"].addTo(map);
