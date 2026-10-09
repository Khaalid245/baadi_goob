import { Request, Response, NextFunction } from "express";

export const roleCheck = (allowedRoles: string[]) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Placeholder role check
    const userRole = 'student'; // This will come from decoded JWT
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    next();
  };
};
