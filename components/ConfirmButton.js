'use client';

// A submit button that asks before it submits (used for deletes).
export default function ConfirmButton({ message, className, children }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
