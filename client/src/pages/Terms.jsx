import React from 'react';

export const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-extrabold text-[#f5ede6] font-serif">Terms of Service</h1>
      <p className="text-sm text-[#a89f91]">
        By accessing or using Savora, you agree to be bound by these Terms of Service.
      </p>
      <h2 className="text-lg font-bold text-[#f5ede6] pt-4">Order Acceptance & Cancellations</h2>
      <p className="text-sm text-[#a89f91]">
        Orders placed through Savora are subject to acceptance by fulfilling restaurants. Customers may cancel orders while in the "PLACED" status. Cancellations after preparation has started are at the discretion of the restaurant and administrative review.
      </p>
    </div>
  );
};

export default Terms;
