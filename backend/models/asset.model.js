const mongoose = require('mongoose');

const categories = ['Characters', 'Props', 'Environments', 'HDRIs', 'Materials'];

const licenseTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 100000000,
      validate: {
        validator: (value) =>
          Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
        message: 'Price must be a valid amount with at most two decimal places',
      },
    },
    remainingLicenses: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value === null || Number.isSafeInteger(value),
        message: 'Remaining licenses must be a whole number or unlimited',
      },
    },
  },
  { _id: false },
);

const assetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: categories,
    },
    fileFormats: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          match: /^[a-z0-9]{2,10}$/,
        },
      ],
      required: true,
      validate: {
        validator: (formats) => formats.length > 0 && new Set(formats).size === formats.length,
        message: 'At least one unique file format is required',
      },
    },
    polycount: {
      type: Number,
      required: true,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      validate: Number.isSafeInteger,
    },
    thumbnailImage: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isHttpUrl,
        message: 'Thumbnail must be an HTTP or HTTPS URL',
      },
    },
    previewModelUrl: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: (value) => value === '' || isHttpUrl(value),
        message: 'Preview must be an HTTP or HTTPS URL',
      },
    },
    filePath: {
      type: String,
      required: true,
      select: false,
    },
    licenseTiers: {
      type: [licenseTierSchema],
      required: true,
      validate: [
        {
          validator: (tiers) => tiers.length > 0,
          message: 'At least one license tier is required',
        },
        {
          validator: (tiers) => {
            const names = tiers.map((tier) => tier.name.trim().toLowerCase());
            return new Set(names).size === names.length;
          },
          message: 'License tier names must be unique within an asset',
        },
      ],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

assetSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
assetSchema.index({ isPublished: 1, fileFormats: 1, createdAt: -1 });

const Asset = mongoose.model('Asset', assetSchema);
Asset.categories = categories;

module.exports = Asset;
