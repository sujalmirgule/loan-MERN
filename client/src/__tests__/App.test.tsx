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
  it('renders landing page with Loan Approve title and portal buttons', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('heading', { name: /LOAN APPROVE/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Customer Portal$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Admin Console$/i })).toBeInTheDocument();
  });
});
