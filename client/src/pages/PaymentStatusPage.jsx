import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useConfig } from "../context/ConfigContext";
import { formatMoney } from "../utils/moneyFormatter";
import { CheckCircle2, XCircle, Clock, RefreshCw, ArrowRight } from "lucide-react";

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 36;

export const PaymentStatusPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useConfig();

  const [order, setOrder] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      const o = res.data.data;
      setOrder(o);
      if (["PLACED","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED"].includes(o.status)) {
        setDone(true);
        clearInterval(intervalRef.current);
      } else if (["PAYMENT_FAILED","EXPIRED","CANCELLED","REJECTED"].includes(o.status)) {
        setDone(true);
        clearInterval(intervalRef.current);
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrder();
    intervalRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setPollCount((c) => {
        if (c >= MAX_POLLS) { clearInterval(intervalRef.current); setDone(true); return c; }
        fetchOrder();
        return c + 1;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  const isSuccess = order && ["PLACED","CONFIRMED","PREPARING","READY","OUT_FOR_DELIVERY","DELIVERED"].includes(order.status);
  const isFailed  = order && ["PAYMENT_FAILED","CANCELLED","REJECTED"].includes(order.status);
  const isExpired = order && order.status === "EXPIRED";
  const isPending = !done && (!order || order.status === "PAYMENT_PENDING");

  return (
    <div className="max-w-lg mx-auto py-16 px-4 flex flex-col items-center text-center space-y-6">
      {isPending && (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-900/30 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" style={{ animationDuration: "1.5s" }} />
          </div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">Processing Payment…</h1>
          <p className="text-[#a89f91] text-sm leading-relaxed">
            We are confirming your payment with the gateway. Please don&#39;t close this tab.
          </p>
          <div className="w-full bg-[#262320] rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((pollCount / MAX_POLLS) * 100, 95)}%` }} />
          </div>
        </>
      )}
      {isSuccess && (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">Payment Confirmed!</h1>
          <p className="text-[#a89f91] text-sm">Your order has been placed and the restaurant has been notified.</p>
          {order.pricing && (
            <div className="w-full bg-[#191715] rounded-2xl p-4 text-sm space-y-2 border border-[#2a2724]">
              <div className="flex justify-between">
                <span className="text-[#787065]">Total</span>
                <span className="font-bold text-[#f5ede6]">{formatMoney(order.pricing.total, config.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#787065]">Order ID</span>
                <span className="font-mono text-xs text-[#a89f91]">{order._id}</span>
              </div>
            </div>
          )}
          <Link to={`/orders/${id}`} className="btn-primary w-full flex items-center justify-center gap-2">
            Track Your Order <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
      {isFailed && (
        <>
          <div className="w-20 h-20 rounded-full bg-rose-900/30 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">Payment Failed</h1>
          <p className="text-[#a89f91] text-sm">Your payment could not be processed. You have not been charged.</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link to="/cart" className="btn-primary flex-1 flex items-center justify-center">Try Again</Link>
            <Link to="/orders" className="btn-secondary flex-1 flex items-center justify-center">View Orders</Link>
          </div>
        </>
      )}
      {isExpired && (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">Order Expired</h1>
          <p className="text-[#a89f91] text-sm">The payment window has expired. You have not been charged.</p>
          <Link to="/cart" className="btn-primary w-full flex items-center justify-center">Start a New Order</Link>
        </>
      )}
      {done && !isSuccess && !isFailed && !isExpired && order?.status === "PAYMENT_PENDING" && (
        <>
          <div className="w-20 h-20 rounded-full bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">Still Processing…</h1>
          <p className="text-[#a89f91] text-sm">Check your order status for updates.</p>
          <Link to={`/orders/${id}`} className="btn-primary w-full flex items-center justify-center">View Order Status</Link>
        </>
      )}
    </div>
  );
};

export default PaymentStatusPage;
