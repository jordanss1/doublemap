/// <reference path="./jquery.js" />

jQuery(() => {
  if ($("#preloader").length) {
    $("#preloader")
      .delay(300)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});

$.ajax({
  url: "/api/ipinfo",
  method: "GET",
  data: "json",
  success: ({ data }) => {
    console.log(data);
  },
  error: (xhr) => {
    const res = JSON.parse(xhr.responseText);
    console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
    console.log(`Response Text: ${res.details}`);
  },
});

$.ajax({
  url: "/api/countries?country=all",
  method: "GET",
  dataType: "json",

  success: (results) => {
    const coords = [];

    const sortedCountries = results.data
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
      .map(({ properties, geometry }) => {
        const { name, iso_a2 } = properties;
        coords.push({ iso_a2, geometry });

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
