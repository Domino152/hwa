import { Request, Response, NextFunction } from "express";
import { Fee } from "../models/Fee";
import { ApiResponse } from "../utils/ApiResponse";

export class FeeController {
  static async getByRegisterNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { registerNumber } = req.params;
      const fee = await Fee.findOne({ registerNumber });
      new ApiResponse(200, fee, "Fee record fetched").send(res);
    } catch (error) { next(error); }
  }

  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { registerNumber } = req.params;
      const fee = await Fee.findOneAndUpdate(
        { registerNumber },
        { ...req.body, registerNumber },
        { new: true, upsert: true }
      );
      new ApiResponse(200, fee, "Fee record saved").send(res);
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Fee.findOneAndDelete({ registerNumber: req.params.registerNumber });
      new ApiResponse(200, null, "Fee record deleted").send(res);
    } catch (error) { next(error); }
  }
}
