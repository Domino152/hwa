import { Router } from "express";
import { StudentController } from "../controllers/student.controller";
import { validateRequest } from "../middleware/validateRequest";
import { createStudentSchema, updateStudentSchema } from "../utils/validations";

const router = Router();

router.post("/", validateRequest(createStudentSchema), StudentController.create);
router.get("/", StudentController.getAll);
router.get("/:id", StudentController.getById);
router.put("/:id", validateRequest(updateStudentSchema), StudentController.update);
router.delete("/:id", StudentController.delete);
router.post("/:id/send-welcome", StudentController.sendWelcome);

export default router;
