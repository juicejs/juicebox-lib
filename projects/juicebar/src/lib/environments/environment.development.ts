// environments/environment.development.ts
import {BaseAppConfig} from "../config/base-app.config";

export const environment: BaseAppConfig = {
  appName: "",
  modules: [],
  production: false,
  apiUrl: 'http://localhost:3022'  // your development API endpoint
  // other configuration values...
};
