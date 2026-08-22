import { Request, Response, NextFunction } from "express";
import { Parent } from "../models/Parent";
import { ApiResponse } from "../utils/ApiResponse";

export class ParentController {
  static async getByRegisterNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const parent = await Parent.findOne({ registerNumber: req.params.registerNumber });
      new ApiResponse(200, parent, "Parent record fetched").send(res);
    } catch (error) { next(error); }
  }

  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { registerNumber } = req.params;
      const parent = await Parent.findOneAndUpdate(
        { registerNumber },
        { ...req.body, registerNumber },
        { new: true, upsert: true }
      );
      new ApiResponse(200, parent, "Parent record saved").send(res);
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Parent.findOneAndDelete({ registerNumber: req.params.registerNumber });
      new ApiResponse(200, null, "Parent record deleted").send(res);
    } catch (error) { next(error); }
  }
}
