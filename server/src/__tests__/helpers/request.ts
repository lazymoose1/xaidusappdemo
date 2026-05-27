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
  return {
    get: (url: string) => request.get(url).set('Authorization', 'Bearer demo-parent-token'),
    post: (url: string) => request.post(url).set('Authorization', 'Bearer demo-parent-token'),
    put: (url: string) => request.put(url).set('Authorization', 'Bearer demo-parent-token'),
    delete: (url: string) => request.delete(url).set('Authorization', 'Bearer demo-parent-token'),
  };
}
