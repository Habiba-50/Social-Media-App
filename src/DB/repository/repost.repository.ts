import { IRepost } from "../../common/interfaces";
import { RepostModel } from "../model";
import { DatabaseRepository } from "./base.repository";



export class RepostRepository extends DatabaseRepository<IRepost> {

    constructor() {
        super(RepostModel)
    }

}