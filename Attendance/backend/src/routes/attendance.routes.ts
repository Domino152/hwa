import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";
import { validateRequest } from "../middleware/validateRequest";
import { markAttendanceSchema } from "../utils/attendanceValidations";

const router = Router();

router.get("/sessions", AttendanceController.getSessions);
router.get("/summary", AttendanceController.getSummary);
router.get("/", AttendanceController.getAll);
router.get("/student/:studentId", AttendanceController.getByStudent);
router.post(
  "/",
  validateRequest(markAttendanceSchema),
  AttendanceController.mark
);

export default router;
