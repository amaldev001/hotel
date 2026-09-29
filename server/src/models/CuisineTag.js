import mongoose from 'mongoose';

const cuisineTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CuisineTag = mongoose.model('CuisineTag', cuisineTagSchema);
export default CuisineTag;
