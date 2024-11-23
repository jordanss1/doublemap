/// <reference path="../jquery.js" />

let baseLayers = [];

Object.keys(styles).map((friendlyName, i) => {
  $.ajax({
    url: `/api/mapboxgljs?style=${styles[friendlyName]}`,
    method: 'GET',
    success: (response) => {
      baseLayers.push({ name: friendlyName, style: response });
    },
    error: (xhr) => {
      console.log(xhr);
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
});
