import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, Reputation } from '@prisma/client';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.botMessage();
  }

  async botMessage() {
    const bot = new TelegramBot(process.env.BOT_API_TOKEN, { polling: true });
    const thanksWords = ['thanks', 'Thanks', '👍', 'Thx', 'thx', 'nice'];

    bot.on('new_chat_members', (msg) =>
      bot.sendMessage(
        msg.chat.id,
        `Hello, ${msg.new_chat_members[0].first_name}`,
      ),
    );

    bot.on(
      'left_chat_member',
      async (msg) =>
        await this.removeReputation(String(msg.left_chat_member.id)),
    );

    bot.on('message', async (msg) => {
      if (msg?.reply_to_message) {
        const user = await bot.getChatMember(
          msg.chat.id,
          msg.reply_to_message.from.id,
        );

        if (user.status === 'left') {
          return;
        }

        if (msg?.sticker) {
          if (msg.sticker.emoji === '👍') {
            this.handleThanksWordReaction(msg, bot);
          }
          return;
        }

        if (
          msg?.reply_to_message.from.username === 'reputationDemoBot' ||
          msg?.reply_to_message.from.username === msg?.from.username
        ) {
          return;
        }

        const thanksWord = msg.text
          .toLocaleLowerCase()
          .split(' ')
          .find((word) =>
            thanksWords.includes(
              word.replace(/[&\/\\#,+()$~%.'":*?!<>{}]/g, ''),
            ),
          );

        if (thanksWord) {
          this.handleThanksWordReaction(msg, bot);
        }
      }
    });
  }

  async removeReputation(telegramId: string) {
    const user = await this.prisma.reputation.findFirst({
      where: { telegramId },
    });

    if (user) {
      await this.prisma.reputation.delete({
        where: { id: user.id },
      });
    }
  }

  async sendReputationMessage(
    chatId: number,
    replyUserName: string,
    fromUserName: string,
    bot: TelegramBot,
    telegramId: string,
  ) {
    const reputationData = await this.getReputation(telegramId);
    bot.sendMessage(
      chatId,
      `Congrats, ${replyUserName}! Member ${fromUserName} increase your reputation! Your current reputation is ${reputationData.reputation}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Chat statistic',
                url: 'http://google.com',
              },
            ],
          ],
        },
      },
    );
  }

  async increaseReputation(
    telegramId: string,
    userName: string,
    userAvatar: string,
    fullName: string,
  ) {
    const reputationData = await this.getReputation(telegramId);

    if (reputationData) {
      await this.updateReputation(
        reputationData.reputation + 1,
        reputationData.id,
      );
      return;
    }

    await this.createReputation({
      telegramId,
      userName,
      userAvatar,
      fullName,
      reputation: 1,
    });
  }

  async getReputation(telegramId: string): Promise<Reputation> {
    return await this.prisma.reputation.findFirst({
      where: { telegramId },
    });
  }

  async getAllReputation(): Promise<Reputation[]> {
    return await this.prisma.reputation.findMany();
  }

  async updateReputation(reputation: number, id: number): Promise<void> {
    await this.prisma.reputation.update({
      where: { id },
      data: { reputation },
    });
  }

  async createReputation(data: Prisma.ReputationCreateInput): Promise<void> {
    await this.prisma.reputation.create({
      data,
    });
  }

  async handleThanksWordReaction(msg: TelegramBot.Message, bot: TelegramBot) {
    const telegramId = String(msg.reply_to_message?.from.id);
    const userAvatar = await this.getUserAvatarUrl(
      msg.reply_to_message.from.id,
      bot,
    );

    await this.increaseReputation(
      telegramId,
      `${
        msg.reply_to_message.from?.username
          ? msg.reply_to_message.from?.username
          : ''
      }`,
      userAvatar,
      `${msg.reply_to_message.from?.first_name} ${msg.reply_to_message.from?.last_name}`,
    );

    await this.sendReputationMessage(
      msg.chat.id,
      `${msg.reply_to_message.from?.first_name} ${
        msg.reply_to_message.from?.last_name
      } ${
        msg.reply_to_message.from?.username
          ? `(@${msg.reply_to_message.from?.username})`
          : ''
      }`,
      `${msg.from?.first_name} ${msg.from?.last_name}`,
      bot,
      telegramId,
    );
  }

  async getUserAvatarUrl(userId: number, bot: TelegramBot) {
    const userProfile = await bot.getUserProfilePhotos(userId);

    if (!userProfile.photos.length) {
      return '';
    }

    const fileId = userProfile.photos[0][0].file_id;
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;

    return `https://api.telegram.org/file/bot${process.env.BOT_API_TOKEN}/${filePath}`;
  }
}
