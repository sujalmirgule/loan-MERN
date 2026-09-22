import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../App';

// Mock global fetch for health check
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        status: 'ok',
        service: 'loan-approve-api',
        environment: 'test',
        timestamp: new Date().toISOString(),
        database: { status: 'ok', type: 'SQLite' },
      }),
  })
);

describe('Client Application Root', () => {
  it('renders landing page with h1 heading and Apply Now / Login navigation links', async () => {
    await act(async () => {
      render(<App />);
    });

    // The landing page renders an h1 heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    // Login and Apply Now are Link elements (role=link) in the new landing page header
    expect(screen.getAllByRole('link', { name: /Apply Now/i }).length).toBeGreaterThan(0);
    // Login is present in the mobile drawer or hidden desktop nav as a link
    expect(screen.getAllByRole('link', { name: /Login/i }).length).toBeGreaterThan(0);
  });
});

