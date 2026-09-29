/**
 * emptyErrorStates.test.jsx
 * Verifies that data views render distinct loading, empty, and error states.
 * An API failure must never look like "no data" — it must show an error message.
 */
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// A generic data list view component (mirrors what pages like RestaurantList do)
const DataListView = ({ loading, error, data }) => {
  if (loading) {
    return (
      <div data-testid="loading-state">
        <div data-testid="skeleton" aria-label="Loading content…" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="error-state" role="alert">
        <p>Error: {error}</p>
        <button>Retry</button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div data-testid="empty-state">
        <p>No items found.</p>
      </div>
    );
  }

  return (
    <ul data-testid="data-list">
      {data.map((item) => (
        <li key={item.id} data-testid="data-item">{item.name}</li>
      ))}
    </ul>
  );
};

describe('Data view states — loading, empty, and error', () => {
  it('renders a skeleton/loading indicator when loading=true', () => {
    render(<DataListView loading={true} error={null} data={null} />);
    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(screen.getByTestId('skeleton')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByTestId('data-list')).toBeNull();
  });

  it('renders an error message (not empty state) when API fails', () => {
    render(<DataListView loading={false} error="Network error. Please try again." data={null} />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Network error/i)).toBeTruthy();
    // Must NOT show empty state — API failure ≠ no data
    expect(screen.queryByTestId('empty-state')).toBeNull();
    expect(screen.queryByText('No items found.')).toBeNull();
  });

  it('renders empty state when data is an empty array', () => {
    render(<DataListView loading={false} error={null} data={[]} />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('No items found.')).toBeTruthy();
    expect(screen.queryByTestId('data-list')).toBeNull();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('renders data items when data is populated', () => {
    const data = [{ id: 1, name: 'Pizza Palace' }, { id: 2, name: 'Burger Barn' }];
    render(<DataListView loading={false} error={null} data={data} />);
    expect(screen.getByTestId('data-list')).toBeTruthy();
    const items = screen.getAllByTestId('data-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Pizza Palace');
    expect(items[1].textContent).toBe('Burger Barn');
    expect(screen.queryByTestId('loading-state')).toBeNull();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('error state always includes a retry mechanism', () => {
    render(<DataListView loading={false} error="Server error 500" data={null} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});
