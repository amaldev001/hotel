# 12 — Menu Management

## 1. Cuisine Tags (Platform-Level) `[ADM-003]` `[D7]`

Cuisine tags are maintained by Admin via `POST /api/admin/categories`. Restaurants reference these tags in their `cuisineCategories` field. Restaurant owners do not create cuisine tags; they only assign pre-existing tags to their profile.

---

## 2. Menu Categories

Categories belong to exactly one restaurant and are used to group menu items.

### Category Fields
| Field | Type | Notes |
|---|---|---|
| `restaurantId` | ObjectId | Required; must match authenticated owner's restaurant |
| `name` | String | Required, max 80 chars |
| `description` | String | Optional, max 255 chars |
| `sortOrder` | Number | Integer; controls display order |
| `isActive` | Boolean | Inactive categories are hidden from customers |

### Category Ownership Rule
- Category `restaurantId` is set by the server from the authenticated owner's restaurant.
- A restaurant owner cannot create, update, or delete categories belonging to another restaurant.
- Admin may manage any restaurant's categories.

---

## 3. Menu Items `[D7]`

### Item Fields
| Field | Type | Constraints |
|---|---|---|
| `restaurantId` | ObjectId | Set by server; not supplied by client |
| `categoryId` | ObjectId | Required; must belong to the same restaurant as the item |
| `name` | String | Required, max 120 chars |
| `description` | String | Optional, max 500 chars |
| `price` | Number | Required; positive integer in minor units `[D4]` (e.g., 1299 = $12.99) |
| `image` | String | Optional; relative asset path from validated upload; null if no image |
| `diet` | String | Required; enum: `"veg"` \| `"non_veg"` |
| `isAvailable` | Boolean | Required; default `true`; controls whether item can be ordered |
| `preparationTime` | Number | Required; positive integer in minutes |
| `isDeleted` | Boolean | Soft-delete flag; default `false` `[D26]` |

---

## 4. Item Ownership & Validation Rules

1. `categoryId` must reference a `MenuCategory` that belongs to the same `restaurantId`. Server validates this.
2. `price` must be a positive integer. Floats are rejected by Zod schema. `[D4]`
3. `diet` must be exactly `"veg"` or `"non_veg"`. No other values are permitted. `[D7]`
4. Items with `isAvailable: false` appear on the menu for browsing but cannot be added to a new cart.
5. Items with `isDeleted: true` are excluded from all public menu responses and cannot be added to carts.

---

## 5. Soft Deletion `[D26]`

Menu items are **never hard-deleted**. When `DELETE /api/menu-items/:id` is called:

```text
SET isDeleted = true
```

- The item is excluded from `GET /api/restaurants/:id/menu` responses.
- Historical order snapshots are **not affected** — the snapshot stores the name, price, and quantity at order creation time. `[D5]`
- Restoration (setting `isDeleted` back to `false`) is not supported in v1.

---

## 6. Food Variants & Add-Ons `[D20]`

Variants, size options, toppings, extras, modifiers, and option groups are **out of scope for v1**. Do not implement any variant/add-on data model or UI. A future change request via `docs/35` is required to introduce this feature.

---

## 7. Image Upload Rules `[D20]`

- Accepted formats: **JPEG, PNG, WebP only** — validated by file magic bytes, not just file extension.
- Maximum file size: **2 MB**.
- Filenames are assigned a random UUID-based name by the server. Client-supplied filenames are discarded.
- No external image URLs: images must be uploaded through `POST /api/uploads`.
- No SVG files (risk of XSS/SSRF via SVG parsing).
- Images are stored in the local volume file system (`/uploads/` directory).

---

## 8. Item Availability vs. Restaurant Eligibility

| Condition | Effect |
|---|---|
| `item.isAvailable = false` | Item cannot be added to cart; hidden from "available" filter |
| `item.isDeleted = true` | Item excluded from all API responses and carts |
| `restaurant.status = SUSPENDED` | No new orders accepted; menu still publicly browsable |
| `restaurant.acceptingOrders = false` | No new orders accepted (checkout validation blocks) |
| Restaurant outside operating hours | No new orders via checkout/quote |

> [!IMPORTANT]
> Unavailability checks are re-validated at checkout time, not only at cart-add time. A cart item that becomes unavailable between cart-add and checkout will cause checkout to fail with `ITEM_UNAVAILABLE`.

---

## 9. Implementation Verification

- **Soft Delete**: `DELETE /api/menu-items/:id` sets `isDeleted = true`. Historical orders snapshot menu item values and are unaffected by soft deletion or price edits.
- **Data Integrity**: Prices are validated as positive minor-unit integers. `diet` field is strictly limited to `"veg"` or `"non_veg"`.
- **Upload Validation**: Image uploads verify JPEG, PNG, and WebP magic bytes via `image-type` buffer inspection and restrict size to <= 2MB.
- **Testing**: Backend tests confirm tenant isolation (owners cannot modify another restaurant's menu items/categories), price integrity, and availability filtering.

