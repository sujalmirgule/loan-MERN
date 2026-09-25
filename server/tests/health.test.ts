import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('API Health Check Endpoint', () => {
  it('GET /api/health should return 200 with service and database status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'loan-approve-api');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('status', 'ok');
    expect(response.body.database).toHaveProperty('type');
    expect(['MySQL', 'SQLite']).toContain(response.body.database.type);
  });

  it('GET /api/nonexistent-route should return 404 with standard error format', async () => {
    const response = await request(app).get('/api/nonexistent-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message).toContain('not found');
  });
});
