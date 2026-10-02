import { FlattenMaps, HydratedDocument, PopulateOptions, ProjectionType, QueryFilter, QueryOptions } from "mongoose";
import { IChat } from "../../common/interfaces";
import { ChatModel } from "../model/index";
import { DatabaseRepository } from "./base.repository";

export class ChatRepository extends DatabaseRepository<IChat> {
    constructor() {
        super(ChatModel);
    }


    async findOneChat({
        filter = {},
        projection,
        options,
        page = "1",
        size = "5"
      }: {
        filter: QueryFilter<IChat>;
        projection?: ProjectionType<IChat> | null | undefined;
        options?: QueryOptions<IChat>;
        page?: string | number | undefined;
        size?: string | number | undefined;
      }): Promise<
        FlattenMaps<IChat> | HydratedDocument<IChat> | null
        > {
        page = parseInt(page as string) ;
        size = parseInt(size as string);
        let doc = this.model.findOne(filter, {
            messages: { $slice: [-(page * size), size] }
        }, options);
    
        if (options?.populate) {
           doc.populate(options.populate as PopulateOptions);
        }
        if (options?.lean) {
           doc.lean(options.lean) as any;
        }
        return await doc.exec();
      }
}