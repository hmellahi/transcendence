import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import UserEntity from "src/user/entities/user.entity"
import { FindOneOptions, Repository } from "typeorm";
// import FriendshipEntity from "./entities/friendship.enitity";
import { Friendship_Status , FriendshipStatus} from "./Interfaces/friendship.interface";
@Injectable()
export class FriendshipService
{
    // constructor(
    //     @InjectRepository(FriendshipEntity)
    //     private friendshipRepository: Repository<FriendshipEntity>
    // ){}

    // public async createFriendship(sender: UserEntity, receiver: UserEntity)
    // {
    //     const friendship = new FriendshipEntity();

    //     friendship.sender = sender;
    //     friendship.receiver = receiver;

    //     const newFriendship = this.friendshipRepository.create(friendship);
    //     return await this.friendshipRepository.save(newFriendship);
    // }

    // public async getFriendship(opts:any)
    // {
    //     return await this.friendshipRepository
    //                                 .findOne(opts)
    // }

    // public async changeFriendshipStatus(sender: UserEntity,
    //                                     friendshipRequestId: number,
    //                                     requiredStatus: Friendship_Status)
    // {
    //     const friendship = await this.getFriendship({id: friendshipRequestId, sender: sender});
    //     let friendshipStatus: FriendshipStatus;
    //     friendshipStatus.status = requiredStatus;

    //     if (!friendship || friendship.status === friendshipStatus)
    //         return false;
    //     friendship.status = friendshipStatus;
    //     this.friendshipRepository.save(friendship);
    //     return true;
    // }
}