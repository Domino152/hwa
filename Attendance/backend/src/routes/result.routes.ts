import { Router } from "express";
import { ResultController } from "../controllers/result.controller";
const router = Router();
router.get("/:registerNumber", ResultController.getByRegisterNumber);
router.put("/:registerNumber", ResultController.upsert);
router.delete("/:registerNumber", ResultController.deleteByRegisterNumber);
export default router;
