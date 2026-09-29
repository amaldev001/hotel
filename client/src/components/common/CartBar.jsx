import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { formatMoney } from "../../utils/moneyFormatter";
import api from "../../utils/api";
import { ShoppingBag, ArrowRight } from "lucide-react";

/**
 * Sticky bottom mobile cart bar.
 * Only shown to customer role when cart has items. Hidden on sm+ via Tailwind.
 * Data is fetched lazily once on mount to avoid over-fetching.
 */
export const CartBar = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const [cartData, setCartData] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "customer") return;

    const fetchCart = () => {
      api.get("/cart").then((res) => {
        const data = res.data.data;
        if (data && data.items && data.items.length > 0) {
          setCartData(data);
        } else {
          setCartData(null);
        }
      }).catch(() => setCartData(null));
    };

    fetchCart();
    // Refresh whenever the page becomes visible (tab switching)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCart();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user]);

  if (!cartData || !user || user.role !== "customer") return null;

  const itemCount = cartData.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="cart-bar sm:hidden" role="complementary" aria-label="Cart summary">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-white leading-tight">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
          <p className="text-xs text-brand-100 leading-tight">
            {cartData.restaurantId?.name || "Your Basket"}
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate("/cart")}
        className="flex items-center gap-1.5 bg-white text-brand-700 font-bold text-sm px-4 py-2 rounded-xl shadow-sm hover:bg-brand-50 transition-colors"
        style={{ minHeight: "36px" }}
        aria-label="View basket"
      >
        View Basket
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default CartBar;
