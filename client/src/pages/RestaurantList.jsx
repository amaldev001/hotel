import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Pagination from '../components/common/Pagination';
import { Search, Clock, Leaf, Filter, Sparkles } from 'lucide-react';

export const RestaurantList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const cuisine = searchParams.get('cuisine') || '';
  const openNow = searchParams.get('openNow') === 'true';
  const vegOnly = searchParams.get('vegOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [restaurants, setRestaurants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRestaurants = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cuisine) params.set('cuisine', cuisine);
    if (openNow) params.set('openNow', 'true');
    if (vegOnly) params.set('vegOnly', 'true');
    params.set('page', page.toString());
    params.set('limit', '12');

    api
      .get(`/restaurants?${params.toString()}`)
      .then((res) => {
        setRestaurants(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch restaurants');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRestaurants();
  }, [q, cuisine, openNow, vegOnly, page]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Header & Filter Controls */}
      <div className="bg-[#191715] p-6 rounded-2xl border border-[#2a2724] shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-[#f5ede6]">Discover Restaurants</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-[#787065] absolute left-3 top-3" />
            <input
              type="text"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateParam('q', e.currentTarget.value);
              }}
              placeholder="Search by restaurant name or cuisine..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2a2724] bg-[#0e0d0c] text-[#f5ede6] placeholder:text-[#787065] text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateParam('openNow', openNow ? '' : 'true')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all min-h-touch ${
                openNow
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-[#191715] border-[#2a2724] text-[#a89f91] hover:text-[#f5ede6]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Open Now</span>
            </button>

            <button
              onClick={() => updateParam('vegOnly', vegOnly ? '' : 'true')}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all min-h-touch ${
                vegOnly
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-[#191715] border-[#2a2724] text-[#a89f91] hover:text-[#f5ede6]'
              }`}
            >
              <Leaf className="w-4 h-4" />
              <span>Veg Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" count={6} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState
          title="No restaurants found"
          message="Try adjusting your search terms or filters to find what you're looking for."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => (
              <div
                key={rest._id}
                onClick={() => navigate(`/restaurants/${rest._id}`)}
                className="group cursor-pointer restaurant-card bg-[#191715] rounded-2xl overflow-hidden border border-[#2a2724] shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative h-44 bg-[#262320] overflow-hidden">
                  {rest.imageUrl ? (
                    <img
                      src={rest.imageUrl}
                      alt={rest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#787065] bg-[#262320]">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  )}
                  {!rest.isCurrentlyOpen && (
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-semibold">
                      Closed
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-[#f5ede6] group-hover:text-brand-400 transition-colors">
                      {rest.name}
                    </h3>
                    <p className="text-xs text-[#787065] line-clamp-1 mt-1">
                      {rest.cuisineTypes?.join(', ') || 'Various Cuisines'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#787065] pt-2 border-t border-[#2a2724]">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#787065]" />
                      <span>{rest.estimatedDeliveryTime || '25-35'} min</span>
                    </div>
                    <div>
                      <span>Fee: {rest.deliveryFee ? `$${(rest.deliveryFee / 100).toFixed(2)}` : 'Free'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => updateParam('page', p.toString())}
          />
        </>
      )}
    </div>
  );
};

export default RestaurantList;
