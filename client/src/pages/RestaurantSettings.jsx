import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useToast } from "../components/common/Toast";
import Skeleton from "../components/common/Skeleton";
import ErrorState from "../components/common/ErrorState";
import FormField from "../components/common/FormField";
import { Clock, ToggleLeft, ToggleRight, MapPin, Save } from "lucide-react";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABELS = { monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday",
  friday:"Friday", saturday:"Saturday", sunday:"Sunday" };

const defaultHours = { open: "09:00", close: "22:00", isOpen: true };

export const RestaurantSettings = () => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    acceptingOrders: true,
    deliveryFee: "",
    minOrderAmount: "",
    servicePostalCodes: "",
    operatingHours: {},
  });

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/restaurant/profile");
      const r = res.data.data;
      setProfile(r);
      const hours = {};
      DAYS.forEach((d) => {
        hours[d] = r.operatingHours?.[d] || { ...defaultHours };
      });
      setForm({
        acceptingOrders: r.acceptingOrders !== undefined ? r.acceptingOrders : true,
        deliveryFee: String(r.deliveryFee ?? ""),
        minOrderAmount: String(r.minOrderAmount ?? ""),
        servicePostalCodes: (r.servicePostalCodes || []).join(", "),
        operatingHours: hours,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load restaurant settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleDayChange = (day, field, value) => {
    setForm((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], [field]: value },
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const codes = form.servicePostalCodes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await api.put("/restaurant/profile", {
        acceptingOrders: form.acceptingOrders,
        deliveryFee: parseInt(form.deliveryFee, 10),
        minOrderAmount: parseInt(form.minOrderAmount, 10),
        servicePostalCodes: codes,
        operatingHours: form.operatingHours,
      });
      showToast("Settings saved successfully", "success");
      fetchProfile();
    } catch (err) {
      showToast(err.response?.data?.error?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto space-y-6 py-6"><Skeleton className="h-64" count={1} /></div>;
  if (error) return <ErrorState message={error} onRetry={fetchProfile} />;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Restaurant Settings</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Operating hours, delivery settings and order acceptance.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Accepting Orders Toggle */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-card">
          <h2 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-amber-500" /> Order Acceptance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Accepting Orders</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Toggle off to temporarily pause incoming orders without suspending the restaurant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, acceptingOrders: !f.acceptingOrders }))}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-amber-500 ${form.acceptingOrders ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`}
              aria-pressed={form.acceptingOrders}
              aria-label="Toggle accepting orders"
              style={{ minHeight: "24px", minWidth: "48px" }}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.acceptingOrders ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg w-fit ${form.acceptingOrders ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>
            {form.acceptingOrders ? "OPEN — accepting orders" : "PAUSED — not accepting orders"}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-card">
          <h2 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" /> Delivery Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Delivery Fee (minor units)" id="delivery-fee">
              <input
                type="number"
                min="0"
                value={form.deliveryFee}
                onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                placeholder="e.g. 500 for $5.00"
                className="input"
              />
            </FormField>
            <FormField label="Minimum Order Amount (minor units)" id="min-order">
              <input
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder="e.g. 1000 for $10.00"
                className="input"
              />
            </FormField>
          </div>
          <FormField label="Service Postal Codes (comma-separated)" id="postal-codes">
            <input
              type="text"
              value={form.servicePostalCodes}
              onChange={(e) => setForm((f) => ({ ...f, servicePostalCodes: e.target.value }))}
              placeholder="10001, 10002, 10003"
              className="input"
            />
          </FormField>
        </div>

        {/* Operating Hours */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-card">
          <h2 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Weekly Operating Hours
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Hours are interpreted in the restaurant&#39;s configured timezone.
          </p>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {DAYS.map((day) => {
              const h = form.operatingHours[day] || { ...defaultHours };
              return (
                <div key={day} className="py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <div className="w-28 flex-shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.isOpen}
                        onChange={(e) => handleDayChange(day, "isOpen", e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                        style={{ minHeight: "18px", minWidth: "18px" }}
                      />
                      <span className={`text-sm font-semibold ${h.isOpen ? "text-stone-900 dark:text-stone-100" : "text-stone-400"}`}>
                        {DAY_LABELS[day]}
                      </span>
                    </label>
                  </div>
                  {h.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={h.open}
                        onChange={(e) => handleDayChange(day, "open", e.target.value)}
                        className="input flex-1 text-sm"
                        aria-label={`${DAY_LABELS[day]} opening time`}
                      />
                      <span className="text-stone-400 text-xs flex-shrink-0">to</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={(e) => handleDayChange(day, "close", e.target.value)}
                        className="input flex-1 text-sm"
                        aria-label={`${DAY_LABELS[day]} closing time`}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
};

export default RestaurantSettings;
