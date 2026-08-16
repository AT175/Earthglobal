const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/mapTiles.controller');

// GET /map-tiles/satellite — Sentinel-2 satellite imagery tiles
router.get('/satellite', requireAuth, controller.getSatelliteTiles);

// GET /map-tiles/ndvi — NDVI vegetation index tiles (requires bbox param)
router.get('/ndvi', requireAuth, controller.getNdviTiles);

module.exports = router;
