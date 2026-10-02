// import { Types } from "mongoose";
import { IFollow } from "../../common/interfaces";
import { Follow } from "../model/follow.model";
import { DatabaseRepository } from "./base.repository";


export class FollowRepository extends DatabaseRepository<IFollow> {
    constructor() {
        super(Follow);
    }
}