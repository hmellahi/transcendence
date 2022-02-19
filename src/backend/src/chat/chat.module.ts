import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/authentication/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChannelsController } from './controllers/channels.controller';
import  ChannelEntity from './entites/channel.entity';
import { TmpChatService } from './services/chat.service';

@Module({
    imports: [
        AuthModule,
        TypeOrmModule.forFeature([ChannelEntity])
    ],
    controllers : [ChannelsController],
    providers: [TmpChatService, ChatGateway]
})
export class ChatModule {}
