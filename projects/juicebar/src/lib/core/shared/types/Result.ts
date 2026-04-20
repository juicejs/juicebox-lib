export class Result<T = any> {

  constructor(payload?: any, error?: string) {
    if (payload || payload == null) {
      this.success = true;
      this.payload = <T>payload;
    } else {
      this.success = false;
      this.error = error;
    }
  }

  success: boolean;
  error?: string;
  payload?: T;
}
