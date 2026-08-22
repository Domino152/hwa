import { Router } from "express";
import { FeeController } from "../controllers/fee.controller";
const router = Router();
router.get("/:registerNumber", FeeController.getByRegisterNumber);
router.put("/:registerNumber", FeeController.upsert);
router.delete("/:registerNumber", FeeController.delete);
export default router;
