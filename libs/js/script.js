/// <reference path="./jquery.js" />

jQuery(() => {
  console.log("Window loaded");
  if ($("#preloader").length) {
    $("#preloader")
      .delay(300)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});

let map = L.map("map");

// L.tileLayer(
//   "https://tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token={accessToken}",
//   {
//     attribution:
//       '<a href="https://jawg.io?utm_medium=map&utm_source=attribution" title="Tiles Courtesy of Jawg Maps" target="_blank" class="jawg-attrib" >&copy; <b>Jawg</b>Maps</a> | <a href="https://www.openstreetmap.org/copyright" title="OpenStreetMap is open data licensed under ODbL" target="_blank" class="osm-attrib">&copy; OSM contributors</a>',
//     minZoom: 0,
//     maxZoom: 22,
//     accessToken: window.config.JAWG_TOKEN,
//   }
// ).addTo(map);

$.ajax({
  url: "/api/countries?country=all",
  method: "GET",
  dataType: "json",

  success: (results) => {
    console.log(results);
    // L.geoJSON(results, {
    //   coordsToLatLngs: results["geometry"]["coordinates"],
    // }).addTo(map);
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText).message;
    console.log(`Error Status: ${xhr.status}`);
    console.log(`Response Text: ${res}`);
  },
});
