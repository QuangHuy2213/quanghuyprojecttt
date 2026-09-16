import {
  Module,
} from '@nestjs/common';

import {
  AiController,
} from './ai.controller';

import {
  AiService,
} from './ai.service';

import {
  PropertyRecommendationService,
} from './property-recommendation.service';

import {
  SystemHelpService,
} from './system-help.service';

import {
  PrismaModule,
} from '../prisma/prisma.module';


@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    AiController,
  ],

  providers: [
    AiService,
    PropertyRecommendationService,
    SystemHelpService,
  ],

  exports: [
    AiService,
  ],
})
export class AiModule {}