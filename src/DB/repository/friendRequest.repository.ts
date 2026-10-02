import { IFriendRequest } from "../../common/interfaces";
import { FriendRequest } from "../model";
import { DatabaseRepository } from "./base.repository";


export class FriendRequestRepository extends DatabaseRepository<IFriendRequest> {

    constructor() {
        super(FriendRequest)
    }


}