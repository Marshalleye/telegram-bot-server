import { Controller, Get } from '@nestjs/common';
import { BotService } from './bot/bot.service';
import { Reputation } from '@prisma/client';

@Controller()
export class AppController {
  constructor(private readonly botService: BotService) {}

  @Get('/reputations')
  async getReputations(): Promise<Reputation[]> {
    const reputations = this.botService.getAllReputation();
    return (await reputations).sort((a, b) => b.reputation - a.reputation);
  }
}
