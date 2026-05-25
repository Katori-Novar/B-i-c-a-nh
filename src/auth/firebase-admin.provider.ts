import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  App,
  ServiceAccount,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";

export const FIREBASE_ADMIN = Symbol("FIREBASE_ADMIN");

export const firebaseAdminProvider: Provider<App> = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    if (getApps().length > 0) {
      return getApp();
    }

    const serviceAccount = configService.get<string>(
      "FIREBASE_SERVICE_ACCOUNT",
    );

    if (serviceAccount) {
      const parsedServiceAccount = JSON.parse(serviceAccount) as ServiceAccount;

      return initializeApp({
        credential: cert(parsedServiceAccount),
      });
    }

    return initializeApp();
  },
};
