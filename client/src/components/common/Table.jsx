import React from 'react';

export const Table = ({ headers, children }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#2a2724] bg-[#191715] shadow-sm">
      <table className="w-full text-left text-sm text-[#a89f91]">
        <thead className="bg-[#0e0d0c] text-xs uppercase font-semibold text-[#787065] border-b border-[#2a2724]">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} scope="col" className="px-4 py-3 sm:px-6">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2724]">{children}</tbody>
      </table>
    </div>
  );
};

export default Table;

