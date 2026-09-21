import { Router } from 'express';

import { authenticate } from '../../shared/authenticate';
import { getUserRecommendationById, getUserRecommendations, requestRecommendation } from './recommendations.controller';



export const recommendationsRouter = Router();

recommendationsRouter.use(authenticate);

recommendationsRouter.post('/', requestRecommendation);
recommendationsRouter.get('/', getUserRecommendations);
recommendationsRouter.get('/:id', getUserRecommendationById);
