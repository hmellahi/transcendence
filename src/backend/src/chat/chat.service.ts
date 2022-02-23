import { ForbiddenException, HttpCode, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddAdminDto, AddMemberDto, CreateChannelDto, JoinChannelDto, LeaveChannelDto, UpdateChannelPassword } from './dtos/channel.dto';
import ChannelEntity  from './entities/channel.entity';
import * as bcrypt from "bcrypt";
import { AuthService } from 'src/authentication/auth.service';
import UserEntity from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { GetMessagesDto, MessageDto } from './dtos/message.dto';
import MessageEntity from './entities/message.entity';
import { filteredUser } from 'src/user/utils/user.utils';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChannelEntity)
        private readonly channelRepository: Repository<ChannelEntity>,
        @InjectRepository(MessageEntity)
        private readonly messgaeRepository: Repository<MessageEntity>,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) { }


    async createChannel(data: CreateChannelDto)
    {
        if (data.isLocked)
            data.password = await bcrypt.hash(data.password, 10);   
        const newChannel = this.channelRepository.create({...data, members:[data.owner], admins:[data.owner]});
        const id : number = (await this.channelRepository.save(newChannel)).id;
        return {id};
    }

    async getChannels(user:UserEntity) {

        let channels = [];
        (await this.channelRepository
                            .find(
                                {
                                    where: {type: "public"},
                                    relations:["members"]}
                                ))
                            .map(({members,password,...channel})=>
                            {
                                if (!this.isMember(members, user))
                                    channels.push({...channel, membersCount: members.length});
                            }); // it's need to be filtered
        return channels;
    }

    async getMyChannels(user:UserEntity) {
        let channels = [];
        (await this.channelRepository
                            .find(
                                {
                                    where: {type: "public"},
                                    relations:["members"]}
                                ))
                            .map(({members,password,...channel})=>
                            {
                                if (this.isMember(members, user))
                                    channels.push({...channel, membersCount: members.length});
                            }); // it's need to be filtered
        return channels;
    }

    async joinChannel(data: JoinChannelDto)
    {
        const channel = await this.channelRepository
                                .findOne(
                                    {
                                        where: {id:data.channelId},
                                        relations: ['members']
                                    }
                            );

        if (!channel || this.isMember(channel.members, data.user))
            throw new HttpException("Channel not found or You already Joined", HttpStatus.NOT_FOUND);
        
        if (channel.isLocked)
        {
            if (!data.password)
                throw new HttpException("Password field not exist", HttpStatus.BAD_REQUEST);
            await this.authService.verifyPassword(channel.password,data.password);
        }

        channel.members.push(data.user);
        await this.channelRepository.save(channel);
    }

    async addMember(member: UserEntity, data: AddMemberDto)
    {
        const newMember = await this.userService.getByLogin(member,data.login);

        if (!newMember)
            throw new HttpException("user not exist", HttpStatus.NOT_FOUND);
        const channel = await this.channelRepository
                                .findOne(
                                    {
                                        where: { id: data.channelId},
                                        relations: ['members']
                                    }
                                );
        if (!this.isMember(channel.members, member))
            throw new ForbiddenException;
        if (this.isMember(channel.members, newMember))
            throw new HttpException("User already a member", HttpStatus.BAD_REQUEST);
        channel.members.push(newMember);
        await this.channelRepository.save(channel);                           
    }

    async leaveChannel(member: UserEntity, data: LeaveChannelDto)
    {   
        const channel = await this.channelRepository.findOne({id:data.channelId}, {relations: ['members']});

        if (!channel || !this.isMember(channel.members, member))
            throw new HttpException("Channel not found or User not A member", HttpStatus.BAD_REQUEST);
        await this.channelRepository
                                .createQueryBuilder()
                                .relation('members')
                                .of({id: data.channelId})
                                .remove(member);
        await this.channelRepository
                                .createQueryBuilder()
                                .relation('admins')
                                .of({id: data.channelId})
                                .remove(member);

        await this.channelRepository
                                .update({id: data.channelId, owner: member}, {owner: null}) 
    }

    public async  updateChannelPassword(member: UserEntity, data:UpdateChannelPassword)
    {
        const channel = await this.channelRepository
                                .findOne(
                                    {id: data.channelId}, 
                                    {relations:['owner', 'admins']}
                            );
        if (!channel)
            throw new HttpException("Channel not exist", HttpStatus.NOT_FOUND);
        //checking if this member is the owner or admin
        if ((!channel.owner || channel.owner.id !== member.id) &&
             !this.isAdmin(channel.admins, member))
            throw new UnauthorizedException;
        if (data.isLocked)
            channel.password = await bcrypt.hash(data.password, 10);
        channel.isLocked = data.isLocked;
        await this.channelRepository.save(channel);
    }

    public async addAdmin(member: UserEntity, data:AddAdminDto)
    {
        const newAdmin = await this.userService.getById(data.userId);

        const channel = await this.channelRepository
                                .findOne(
                                    {id: data.channelId},
                                    {relations: ['admins']}
                                );
        if (!channel || this.isAdmin(channel.admins, newAdmin))
            throw new HttpException("Channel not exist  or User already admin", HttpStatus.BAD_REQUEST);
        if (!this.isAdmin(channel.admins, member))
            throw new ForbiddenException;
        await this.channelRepository
                .createQueryBuilder()
                .relation('admins')
                .of({id: data.channelId})
                .add(newAdmin);
    }

    private isMember(members: UserEntity[], userToFind: UserEntity)
    {
        return members.find(user => user.id === userToFind.id);
    }

    private isAdmin(admins: UserEntity[], userToFind: UserEntity)
    {
        return admins.find(user => user.id === userToFind.id) !== undefined;
    }


    // Messages

    async createMessage(member: UserEntity, data: MessageDto)
    {
        const channel = await this.channelRepository
                                .findOne(
                                    {id: data.channelId},
                                    {relations:['members']});
        if (!channel || !this.isMember(channel.members, member))
            throw new HttpException("channel not found or user is not member", HttpStatus.NOT_FOUND);

       const message = this.messgaeRepository.create({msg: data.msg, owner: member, channel: channel});
       await this.messgaeRepository.save(message);
    }

    async getAllMessages(member: UserEntity, data: GetMessagesDto)
    {
        const channel = await this.channelRepository
                                .findOne(
                                    {id: data.channelId},
                                    {relations:['members', 'admins']});
        if (!channel || !this.isMember(channel.members, member))
            throw new HttpException("channel not found or user is not member", HttpStatus.NOT_FOUND);
        const messages = (await this.messgaeRepository
                        .find(
                            {
                                where: {channel: channel},
                                relations: ['owner'],
                                order: {create_date: "ASC"}
                            })
                )
                .map(({owner, ...res})=>({...res, owner: filteredUser(owner)}));
        return {isAdmin: this.isAdmin(channel.admins, member), messages: messages}
    }
}