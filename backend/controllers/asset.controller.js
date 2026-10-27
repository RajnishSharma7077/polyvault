const mongoose = require('mongoose');
const Asset = require('../models/asset.model');

const maxPageSize = 48;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readNumber(query, key, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (query[key] === undefined || query[key] === '') return undefined;
  const value = Number(query[key]);
  if (!Number.isFinite(value) || value < min || value > max) {
    const error = new Error(`${key} must be a number between ${min} and ${max}`);
    error.status = 400;
    throw error;
  }
  return value;
}

function publicAsset(asset) {
  const value = asset.toObject();
  delete value.filePath;
  return value;
}

async function listAssets(req, res, next) {
  try {
    const { category, format, search } = req.query;
    const minPolycount = readNumber(req.query, 'minPolycount');
    const maxPolycount = readNumber(req.query, 'maxPolycount');
    const minPrice = readNumber(req.query, 'minPrice');
    const maxPrice = readNumber(req.query, 'maxPrice');
    const page = readNumber(req.query, 'page', { min: 1, max: 100000 });
    const limit = readNumber(req.query, 'limit', { min: 1, max: maxPageSize });

    if (minPolycount !== undefined && !Number.isSafeInteger(minPolycount)) {
      return res.status(400).json({ success: false, message: 'minPolycount must be a whole number' });
    }
    if (maxPolycount !== undefined && !Number.isSafeInteger(maxPolycount)) {
      return res.status(400).json({ success: false, message: 'maxPolycount must be a whole number' });
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({ success: false, message: 'minPrice cannot exceed maxPrice' });
    }
    if (minPolycount !== undefined && maxPolycount !== undefined && minPolycount > maxPolycount) {
      return res.status(400).json({ success: false, message: 'minPolycount cannot exceed maxPolycount' });
    }
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      return res.status(400).json({ success: false, message: 'search must be at most 100 characters' });
    }
    if (category !== undefined && !Asset.categories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Unknown asset category' });
    }
    if (
      req.query.format !== undefined &&
      (typeof format !== 'string' || !/^[a-z0-9]{2,10}$/i.test(format.replace(/^\./, '')))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid file format filter' });
    }

    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (format) filter.fileFormats = String(format).replace(/^\./, '').toLowerCase();
    if (search?.trim()) {
      const term = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: term }, { description: term }];
    }
    if (minPolycount !== undefined || maxPolycount !== undefined) {
      filter.polycount = {};
      if (minPolycount !== undefined) filter.polycount.$gte = minPolycount;
      if (maxPolycount !== undefined) filter.polycount.$lte = maxPolycount;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      const price = {};
      if (minPrice !== undefined) price.$gte = minPrice;
      if (maxPrice !== undefined) price.$lte = maxPrice;
      filter.licenseTiers = { $elemMatch: { price } };
    }

    const currentPage = page || 1;
    const pageSize = limit || 16;
    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .select('-filePath')
        .populate('creator', 'fullName')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Asset.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      assets: assets.map((asset) => {
        delete asset.filePath;
        return asset;
      }),
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
}

function listCategories(req, res) {
  res.json({ success: true, categories: Asset.categories });
}

async function getAsset(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }
    const asset = await Asset.findOne({ _id: req.params.id, isPublished: true })
      .select('-filePath')
      .populate('creator', 'fullName');
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    return res.json({ success: true, asset: publicAsset(asset) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getAsset, listAssets, listCategories };
