import { Router } from "express";
import { ParentController } from "../controllers/parent.controller";
const router = Router();
router.get("/:registerNumber", ParentController.getByRegisterNumber);
router.put("/:registerNumber", ParentController.upsert);
router.delete("/:registerNumber", ParentController.delete);
export default router;
