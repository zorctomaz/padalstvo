'use strict';

const path = require('path');
const express = require('express');

const sites = require('./src/sites.json');
const { findNearestSite } = require('./src/geo');
const { fetchArsoForecast } = require('./src/arso');
const { fetchOpendataReport } = require('./src/opendata');
const { buildParaglidingSummary } = require('./src/paragliding');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sites', (req, res) => {
  res.json({ sites });
});

app.get('/api/nearest', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Manjkata parametra lat in lon.' });
  }
  const { site, distanceKm } = findNearestSite(sites, lat, lon);
  res.json({ site, distanceKm });
});

app.get('/api/weather', async (req, res) => {
  try {
    let site;
    let distanceKm = null;

    if (req.query.siteId) {
      site = sites.find((s) => s.id === req.query.siteId);
      if (!site) {
        return res.status(404).json({ error: `Neznano vzletišče: ${req.query.siteId}` });
      }
      if (req.query.lat && req.query.lon) {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          distanceKm = Math.round(
            require('./src/geo').haversineKm(lat, lon, site.lat, site.lon) * 10
          ) / 10;
        }
      }
    } else {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return res.status(400).json({ error: 'Podaj siteId ali lat & lon.' });
      }
      const nearest = findNearestSite(sites, lat, lon);
      site = nearest.site;
      distanceKm = nearest.distanceKm;
    }

    const [arsoResult, opendataResult] = await Promise.allSettled([
      fetchArsoForecast(site.arsoLocation),
      fetchOpendataReport(site.lat, site.lon),
    ]);

    const summary = buildParaglidingSummary({ site, distanceKm, arsoResult, opendataResult });
    res.json(summary);
  } catch (err) {
    console.error('Napaka /api/weather:', err);
    res.status(500).json({ error: 'Napaka pri pridobivanju vremenskih podatkov.', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Padalstvo vreme app posluša na http://localhost:${PORT}`);
});
