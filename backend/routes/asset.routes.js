const express = require('express');
const { getAsset, listAssets, listCategories } = require('../controllers/asset.controller');

const router = express.Router();

router.get('/', listAssets);
router.get('/categories', listCategories);
router.get('/:id', getAsset);

module.exports = router;
