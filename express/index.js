const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 3001;

app.use(
  cors({
    origin: ['http://web:8080'],
  })
);

app.get('/tiles', async (req, res) => {
  console.log('Received query:', req.query);
  const { z, x, y } = req.query;
  const url = `http://tileserver:3000/data/countries/${z}/${x}/${y}.pbf`;

  try {
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });

    res.set('Content-Type', 'application/vnd.mapbox-vector-tile');
    res.status(200).send(data);
  } catch (e) {
    if (e instanceof axios.AxiosError) {
      res
        .status(e.status)
        .send({ error: 'Error retrieving tiles: ' + e.message });
    }

    console.error('Error fetching tile:', error);
    res.status(500).send({ error: 'Failed to fetch tile' });
  }
});

app.listen(port);
