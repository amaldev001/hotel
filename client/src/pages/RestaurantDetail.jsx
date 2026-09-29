import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Clock, MapPin, Search, Leaf, Plus, ShoppingBag, AlertOctagon, Sparkles } from 'lucide-react';

export const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('all'); // all | veg | non_veg

  // Cart mismatch handling
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);

  const fetchMenu = () => {
    setLoading(true);
    setError(null);

    api
      .get(`/restaurants/${id}/menu`)
      .then((res) => {
        setRestaurant(res.data.data.restaurant);
        setCategories(res.data.data.categories || []);
        setItems(res.data.data.items || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to load menu');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMenu();
  }, [id]);

  const handleAddToCart = async (item, clearExisting = false) => {
    if (!user) {
      showToast('Please sign in to add items to your cart', 'info');
      navigate(`/login?returnPath=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      if (clearExisting) {
        await api.delete('/cart');
      }

      await api.post('/cart/items', {
        menuItemId: item._id,
        quantity: 1,
      });

      showToast(`Added ${item.name} to cart`, 'success');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.error?.code === 'CART_RESTAURANT_MISMATCH') {
        setPendingItem(item);
        setMismatchDialogOpen(true);
      } else {
        const msg = err.response?.data?.error?.message || 'Failed to add item';
        showToast(msg, 'error');
      }
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDiet = dietFilter === 'all' || item.diet === dietFilter;

    return matchesSearch && matchesDiet;
  });

  return (
    <div className="space-y-8 pb-24">
      {loading ? (
        <Skeleton className="h-64" count={1} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMenu} />
      ) : (
        <>
          {/* Restaurant Header */}
          <div className="bg-[#191715] rounded-3xl overflow-hidden border border-[#2a2724] shadow-sm">
            <div className="h-48 sm:h-64 bg-[#262320] relative overflow-hidden">
              {restaurant.imageUrl ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#787065] bg-[#262320]">
                  <Sparkles className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-[#f5ede6]">
                    {restaurant.name}
                  </h1>
                  <p className="text-sm text-[#787065] mt-1">
                    {restaurant.cuisineTypes?.join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-4 text-xs sm:text-sm font-medium text-[#a89f91]">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-[#787065]" />
                    <span>{restaurant.estimatedDeliveryTime || '25-35'} mins</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-[#787065]" />
                    <span>Min: {formatMoney(restaurant.minOrderAmount, config.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Status Banner if Closed or Not Accepting Orders */}
              {(!restaurant.isCurrentlyOpen || !restaurant.isAcceptingOrders) && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/40 flex items-center space-x-3 text-amber-300">
                  <AlertOctagon className="w-5 h-5 flex-shrink-0 text-amber-400" />
                  <p className="text-sm font-medium">
                    This restaurant is currently closed or not accepting orders.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Menu Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#191715] p-4 rounded-2xl border border-[#2a2724] shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#787065] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#2a2724] bg-[#0e0d0c] text-[#f5ede6] placeholder:text-[#787065] focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => setDietFilter('all')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  dietFilter === 'all'
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-[#191715] border-[#2a2724] text-[#a89f91] hover:text-[#f5ede6]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter('veg')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center justify-center space-x-1 ${
                  dietFilter === 'veg'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-[#191715] border-[#2a2724] text-[#a89f91] hover:text-[#f5ede6]'
                }`}
              >
                <Leaf className="w-3 h-3 text-emerald-500" />
                <span>Veg</span>
              </button>
              <button
                onClick={() => setDietFilter('non_veg')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  dietFilter === 'non_veg'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-[#191715] border-[#2a2724] text-[#a89f91] hover:text-[#f5ede6]'
                }`}
              >
                Non-Veg
              </button>
            </div>
          </div>

          {/* Grouped Categories Menu */}
          {categories.length === 0 || filteredItems.length === 0 ? (
            <EmptyState title="No items available" message="No menu items match your search filters." />
          ) : (
            <div className="space-y-8">
              {categories.map((cat) => {
                const categoryItems = filteredItems.filter((i) => i.categoryId.toString() === cat._id.toString());
                if (categoryItems.length === 0) return null;

                return (
                  <section key={cat._id} className="space-y-4">
                    <h2 className="text-xl font-bold text-[#f5ede6] border-b pb-2 border-[#2a2724]">
                      {cat.name}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categoryItems.map((item) => (
                        <div
                          key={item._id}
                          className="bg-[#191715] p-4 rounded-2xl border border-[#2a2724] shadow-sm flex justify-between space-x-4"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                                  item.diet === 'veg' ? 'border-emerald-600' : 'border-red-600'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.diet === 'veg' ? 'bg-emerald-600' : 'bg-red-600'
                                  }`}
                                />
                              </span>
                              <h3 className="text-base font-bold text-[#f5ede6]">
                                {item.name}
                              </h3>
                            </div>
                            <p className="text-xs text-[#787065] line-clamp-2">
                              {item.description}
                            </p>
                            <p className="text-sm font-extrabold text-[#f5ede6] pt-1">
                              {formatMoney(item.price, config.currency)}
                            </p>
                          </div>

                          <div className="flex flex-col items-center justify-between flex-shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-20 h-20 rounded-xl object-cover border border-[#2a2724] mb-2"
                              />
                            ) : null}
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={!item.isAvailable || !restaurant.isAcceptingOrders}
                              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-40 min-h-touch flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Sticky Mobile "View Cart" Bar */}
          <div className="fixed bottom-4 left-4 right-4 z-30 sm:hidden">
            <button
              onClick={() => navigate('/cart')}
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5" />
                <span>View Cart</span>
              </div>
              <span>Checkout &rarr;</span>
            </button>
          </div>
        </>
      )}

      {/* Cart Mismatch Confirmation Dialog */}
      <ConfirmDialog
        isOpen={mismatchDialogOpen}
        onClose={() => setMismatchDialogOpen(false)}
        onConfirm={() => {
          if (pendingItem) handleAddToCart(pendingItem, true);
        }}
        title="Clear Cart & Change Restaurant?"
        message="Your cart contains items from another restaurant. Would you like to clear your cart and add items from this restaurant instead?"
        confirmLabel="Clear Cart & Add"
        isDanger={true}
      />
    </div>
  );
};

export default RestaurantDetail;
