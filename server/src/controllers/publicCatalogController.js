import asyncHandler from '../utils/asyncHandler.js';
import {
  searchRestaurants,
  getPublicRestaurantDetail,
  getPublicRestaurantMenu,
  searchItemsAcrossOpenRestaurants,
} from '../services/searchService.js';

export const getRestaurants = asyncHandler(async (req, res) => {
  const result = await searchRestaurants(req.query);
  res.status(200).json(result);
});

export const getRestaurantById = asyncHandler(async (req, res) => {
  const restaurant = await getPublicRestaurantDetail(req.params.id);
  res.status(200).json({
    success: true,
    data: restaurant,
  });
});

export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const result = await getPublicRestaurantMenu(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const searchItems = asyncHandler(async (req, res) => {
  const result = await searchItemsAcrossOpenRestaurants(req.query);
  res.status(200).json(result);
});
