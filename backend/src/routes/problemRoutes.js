import { Router } from 'express';
import { createProblem, deleteProblem, getProblemById, getProblems, updateProblem } from '../controllers/problemController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.route('/')
  .get(getProblems)
  .post(protect, authorize('admin'), createProblem);

router.route('/:id')
  .get(getProblemById)
  .put(protect, authorize('admin'), updateProblem)
  .delete(protect, authorize('admin'), deleteProblem);

export default router;
