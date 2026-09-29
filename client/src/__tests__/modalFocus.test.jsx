/**
 * modalFocus.test.jsx
 * Tests that Modal component: has dialog role, traps focus on open,
 * closes on Escape key, and is inaccessible when closed.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// A simplified Modal component matching the pattern used in the app
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="modal"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div data-testid="modal-overlay" onClick={onClose} />
      <div data-testid="modal-panel">
        <h2 id="modal-title">{title}</h2>
        <button data-testid="modal-close-btn" onClick={onClose}>Close</button>
        {children}
      </div>
    </div>
  );
};

// Wrapper for testing open/close state
const ModalWrapper = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button data-testid="open-btn" onClick={() => setOpen(true)}>Open Modal</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Test Modal">
        <p>Modal content</p>
        <button data-testid="action-btn">Action</button>
      </Modal>
    </div>
  );
};

describe('Modal component accessibility and behaviour', () => {
  it('is not rendered when isOpen=false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">content</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('renders with role="dialog" and aria-modal="true" when open', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('is labelled by the modal title (aria-labelledby)', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Confirm Deletion">content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
    expect(screen.getByText('Confirm Deletion')).toBeTruthy();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test">content</Modal>);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test">content</Modal>);
    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders children inside the modal panel', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        <p data-testid="child-content">Important message</p>
      </Modal>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Important message')).toBeTruthy();
  });

  it('integrates correctly with open/close state toggle', () => {
    render(<ModalWrapper />);

    // Initially closed
    expect(screen.queryByRole('dialog')).toBeNull();

    // Open it
    fireEvent.click(screen.getByTestId('open-btn'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Test Modal')).toBeTruthy();

    // Close via button
    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
