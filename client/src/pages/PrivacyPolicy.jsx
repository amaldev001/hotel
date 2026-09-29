import React from 'react';

export const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-extrabold text-[#f5ede6] font-serif">Privacy Policy</h1>
      <p className="text-sm text-[#a89f91]">
        Your privacy is critically important to us. Savora collects only necessary order, delivery address, and contact details required to process food orders and fulfill deliveries.
      </p>
      <h2 className="text-lg font-bold text-[#f5ede6] pt-4">Data Collection & Protection</h2>
      <p className="text-sm text-[#a89f91]">
        We do not store payment card data on our servers. All online transactions are processed directly by PCI-DSS compliant third-party payment providers (Stripe / Razorpay). Personal contact information is shared with fulfilling restaurants strictly for active orders and is automatically redacted for non-active historical orders.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
