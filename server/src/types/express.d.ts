import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    user?: {
      id: string;
      role: string;
      authId: string;
      troopCode?: string;
      isScoutAccount?: boolean;
      isScoutMember?: boolean;
    };
  }
}
