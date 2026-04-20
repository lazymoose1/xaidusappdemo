import supertest from 'supertest';
import app from '../../index';

export const request = supertest(app);

export function authRequest() {
  return {
    get: (url: string) => request.get(url).set('Authorization', 'Bearer demo-token'),
    post: (url: string) => request.post(url).set('Authorization', 'Bearer demo-token'),
    put: (url: string) => request.put(url).set('Authorization', 'Bearer demo-token'),
    delete: (url: string) => request.delete(url).set('Authorization', 'Bearer demo-token'),
  };
}

export function parentAuthRequest() {
  // For parent-role endpoints, we need to override the demo-token user to have parent role.
  // The demo-token in dev mode always returns { id: 'demo-user', role: 'teen' }.
  // Tests that need parent role should mock authMiddleware directly.
  return authRequest();
}
