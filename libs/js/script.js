/// <reference path="./jquery.js" />

mapPromise.then((map) => {
  $.ajax({
    url: '/api/ipinfo',
    method: 'GET',
    data: 'json',
    success: ({ data }) => {
      userGeo = data;
      const latLong = userGeo.loc.split(',');
      const latitude = parseFloat(latLong[0]);
      const longitude = parseFloat(latLong[1]);

      mostRecentLocation = {
        latitude,
        longitude,
        context: {
          iso_a2: userGeo.country,
          region: userGeo.region,
          place: userGeo.city,
          neighborhood: null,
          district: null,
          name: null,
        },
      };

      map.flyTo({
        center: [longitude, latitude],
        speed: 0.5,
        curve: 2,
        zoom: 3,
      });
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });

  $.ajax({
    url: `/api/countries?country=all`,
    method: 'GET',
    dataType: 'json',
    success: ({ data }) => {
      countryList = data
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
        .map(({ properties }) => {
          return { name: properties.name, iso_a2: properties.iso_a2 };
        });

      countryList.forEach(({ name, iso_a2 }) => {
        $('#country-select').append(
          `<option id="country-option" class="text-lg" value="${iso_a2}">${name}</option>`
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
    url: '/api/mapboxgljs/category?list=true',
    method: 'GET',
    dataType: 'json',
    success: (res) => {
      categoryList = res.data;
      console.log(res.data);
    },
    error: (xhr) => {
      const res = JSON.parse(xhr.responseText);
      console.log(`Error Status: ${xhr.status} - Error Message: ${res.error}`);
      console.log(`Response Text: ${res.details}`);
    },
  });
});

async function getCountryData(iso_a2) {
  try {
    const { data } = await $.ajax({
      url: `/api/countries?country=${iso_a2}`,
      method: 'GET',
      dataType: 'json',
    });

    map.setFilter('country-line', ['==', 'iso_a2', iso_a2]);
    map.setFilter('country-fill', ['==', 'iso_a2', iso_a2]);
    // map.setFilter('country-extrusion', ['==', 'iso_a2', iso_a2]);

    const responses = data.map((countryData) => {
      if (countryData.error) {
        return;
      }

      return countryData;
    });
  } catch (err) {
    console.log(err);
  }
}
