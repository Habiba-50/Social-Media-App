import { QueryFilter } from "mongoose";
import { INotification } from "../../common/interfaces";
import { NotificationModel } from "../model/index";
import { DatabaseRepository } from "./base.repository";

export class NotificationRepository extends DatabaseRepository<INotification> {
    constructor() {
        super(NotificationModel);
    }

    async countDocuments(filter: QueryFilter<INotification>) {
        return await this.model.countDocuments(filter);
    }
}