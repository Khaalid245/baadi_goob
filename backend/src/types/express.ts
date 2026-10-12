/* eslint-disable @typescript-eslint/no-namespace */
import { JwtPayload } from "../common/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
