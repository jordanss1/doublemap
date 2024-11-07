/// <reference path="./jquery.js" />

let map = L.map("map", {
  zoomSnap: 0.5,
  maxBoundsViscosity: 1,
  minZoom: 2.5,
}).setView([51.835778, 0], 2.5);

var worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

map.setMaxBounds(worldBounds);

map.setZoom(2.5);

map.fitBounds(worldBounds);

map.once("moveend", () => {
  map.setView([47.73307550971585, 0.2293651266492969], 2.5);
});

let zoomLevel = map.getZoom();
let center = map.getCenter();

map.on("zoom", () => {
  zoomLevel = map.getZoom();
  console.log("Zoom level changed: " + zoomLevel);
});

map.on("move", () => {
  center = map.getCenter();
  console.log("Center changed" + center);
});

map.on("moveend", function (e) {
  var center = map.getCenter(); // Get the final map center after the move ends
  var zoom = map.getZoom(); // Get the final zoom level
  console.log("Map finished moving to:", center, "Zoom level:", zoom);
});

jQuery(() => {
  if ($("#preloader").length) {
    $("#preloader")
      .delay(300)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});

L.tileLayer(
  "https://tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token={accessToken}",
  {
    attribution:
      '<a href="https://jawg.io?utm_medium=map&utm_source=attribution" title="Tiles Courtesy of Jawg Maps" target="_blank" class="jawg-attrib" >&copy; <b>Jawg</b>Maps</a> | <a href="https://www.openstreetmap.org/copyright" title="OpenStreetMap is open data licensed under ODbL" target="_blank" class="osm-attrib">&copy; OSM contributors</a>',
    minZoom: 0,
    maxZoom: 22,
    accessToken: window.config.JAWG_TOKEN,
  }
).addTo(map);

$.ajax({
  url: "/api/countries?country=all",
  method: "GET",
  dataType: "json",

  success: (results) => {
    const sortedCountries = results.data
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, iso_a2 }) => {
        return { name, iso_a2 };
      });

    sortedCountries.forEach(({ name, iso_a2 }) => {
      $("#country-select").append(
        `<option class="text-lg" value="${iso_a2}">${name}</option>`
      );
    });
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

$.ajax({
  url: "/api/countries?country=US",
  method: "GET",
  dataType: "json",

  success: (results) => {
    // console.log(results);
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});
