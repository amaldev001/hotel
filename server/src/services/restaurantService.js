import mongoose from 'mongoose';
import argon2 from 'argon2';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import defaultStorageProvider from '../providers/storageProvider.js';

/**
 * Admin provisioning of Restaurant + Owner account in an atomic operation.
 */
export const createRestaurantWithOwner = async (data) => {
  const ownerName = data.ownerName || data.owner?.name;
  const ownerEmail = data.ownerEmail || data.owner?.email;
  const ownerPhone = data.ownerPhone || data.owner?.phone;
  const temporaryPassword = data.temporaryPassword || data.owner?.temporaryPassword;
  const {
    name,
    description,
    deliveryFee,
    minOrderAmount,
    servicePostalCodes,
    cuisineCategories,
    address,
    contact,
    operatingHours,
  } = data;

  if (!ownerEmail) {
    throw new AppError('Owner email is required', 400, 'INVALID_INPUT');
  }

  const normalizedEmail = ownerEmail.toLowerCase().trim();

  // Check if owner email already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this owner email address already exists.', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  // Hash temporary password with Argon2id
  const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });

  let session = null;
  try {
    // Only attempt transactions if connected to a Replica Set or Sharded Cluster
    const isReplicaSet = mongoose.connection.client?.topology?.description?.type?.includes('ReplicaSet') ||
                         mongoose.connection.client?.topology?.description?.type === 'Sharded';
    if (isReplicaSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
  } catch (_err) {
    session = null;
  }

  try {
    const userDocs = await User.create(
      [
        {
          name: ownerName,
          email: normalizedEmail,
          phone: ownerPhone,
          passwordHash,
          role: 'restaurant',
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      ],
      session ? { session } : {}
    );

    const ownerUser = userDocs[0];

    const restaurantDocs = await Restaurant.create(
      [
        {
          ownerId: ownerUser._id,
          name,
          description,
          deliveryFee,
          minOrderAmount,
          servicePostalCodes,
          cuisineCategories,
          address,
          contact: contact || { phone: ownerPhone, email: normalizedEmail },
          operatingHours: operatingHours || {
            monday: { open: '00:00', close: '23:59', isOpen: true },
            tuesday: { open: '00:00', close: '23:59', isOpen: true },
            wednesday: { open: '00:00', close: '23:59', isOpen: true },
            thursday: { open: '00:00', close: '23:59', isOpen: true },
            friday: { open: '00:00', close: '23:59', isOpen: true },
            saturday: { open: '00:00', close: '23:59', isOpen: true },
            sunday: { open: '00:00', close: '23:59', isOpen: true },
          },
          status: 'ACTIVE',
          acceptingOrders: true,
        },
      ],
      session ? { session } : {}
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    const createdRestaurant = restaurantDocs[0].toObject();
    delete createdRestaurant.ownerId?.passwordHash;
    return createdRestaurant;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (_e) {
        // ignore
      }
    }
    throw error;
  }
};

/**
 * Update assigned restaurant profile for owner (strictly scoped to ownerId).
 */
export const updateRestaurantByOwner = async (ownerUserId, updateData) => {
  const restaurant = await Restaurant.findOne({ ownerId: ownerUserId });
  if (!restaurant) {
    throw new AppError('Assigned restaurant profile not found', 404, 'NOT_FOUND');
  }

  // Delete old files if logo or banner is being replaced
  if (updateData.logo !== undefined && restaurant.logo && updateData.logo !== restaurant.logo) {
    await defaultStorageProvider.deleteFile(restaurant.logo);
  }
  if (updateData.banner !== undefined && restaurant.banner && updateData.banner !== restaurant.banner) {
    await defaultStorageProvider.deleteFile(restaurant.banner);
  }

  Object.assign(restaurant, updateData);
  await restaurant.save();

  return restaurant;
};

/**
 * Sanitize public restaurant object (omits owner email/phone and internal flags).
 */
export const sanitizePublicRestaurant = (restaurantDoc, openNow = false) => {
  const rest = restaurantDoc.toObject ? restaurantDoc.toObject() : restaurantDoc;
  const cuisineTypes = (rest.cuisineCategories || []).map((c) =>
    typeof c === 'object' && c !== null && c.name ? c.name : String(c)
  );

  return {
    _id: rest._id,
    name: rest.name,
    description: rest.description,
    logo: rest.logo,
    banner: rest.banner,
    cuisineCategories: rest.cuisineCategories,
    cuisineTypes,
    address: rest.address,
    servicePostalCodes: rest.servicePostalCodes,
    deliveryFee: rest.deliveryFee,
    minOrderAmount: rest.minOrderAmount,
    acceptingOrders: rest.acceptingOrders,
    operatingHours: rest.operatingHours,
    openNow,
    status: rest.status,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
};
