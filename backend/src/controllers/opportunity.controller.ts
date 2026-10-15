import { Request, Response, NextFunction } from "express";
import {
  listOpportunitiesQuerySchema,
  opportunityIdParamSchema,
  createOpportunitySchema,
  updateOpportunitySchema,
} from "../validations/opportunity.validation";
import {
  listOpportunities,
  getOpportunityById as getOpportunityByIdService,
  createOpportunity as createOpportunityService,
  updateOpportunity as updateOpportunityService,
  closeOpportunity as closeOpportunityService,
  deleteOpportunity as deleteOpportunityService,
} from "../services/opportunity.service";
import { AppError } from "../middleware/errorHandler";

export const getOpportunities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = listOpportunitiesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid query parameters";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const result = await listOpportunities(parseResult.data);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const getOpportunityById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = opportunityIdParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const opportunity = await getOpportunityByIdService(parseResult.data.id);
    res.status(200).json({ opportunity });
  } catch (error: unknown) {
    next(error);
  }
};

export const postOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = createOpportunitySchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const opportunity = await createOpportunityService(
      req.user.id,
      parseResult.data
    );

    res.status(201).json({
      message: "Opportunity created successfully",
      opportunity,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = opportunityIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const bodyResult = updateOpportunitySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage =
        bodyResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const opportunity = await updateOpportunityService(
      paramResult.data.id,
      req.user.id,
      bodyResult.data
    );

    res.status(200).json({
      message: "Opportunity updated successfully",
      opportunity,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const closeOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = opportunityIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const opportunity = await closeOpportunityService(
      paramResult.data.id,
      req.user.id
    );

    res.status(200).json({
      message: "Opportunity closed successfully",
      opportunity,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const deleteOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = opportunityIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    await deleteOpportunityService(paramResult.data.id, {
      id: req.user.id,
      role: req.user.role,
    });

    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
};
