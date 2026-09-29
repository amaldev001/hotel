import React from 'react';

export const FormField = ({ label, id, error, helpText, required, children }) => {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const ariaDescribedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[#f5ede6] mb-1"
        >
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      {React.cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': ariaDescribedBy,
        className: `w-full rounded-xl border px-3.5 py-2.5 text-sm bg-[#191715] border-[#2a2724] text-[#f5ede6] placeholder:text-stone-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-touch ${
          error ? 'border-rose-500 focus:ring-rose-500' : ''
        } ${children.props.className || ''}`,
      })}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-rose-400 font-medium">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={helpId} className="mt-1 text-xs text-[#a89f91]">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormField;
