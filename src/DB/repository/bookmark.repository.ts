import { IBookmark } from "../../common/interfaces";
import { DatabaseRepository } from "./base.repository";
import { BookmarkModel } from "../model";


export class BookmarkRepository extends DatabaseRepository<IBookmark> {

    constructor() {
        super(BookmarkModel)
    }
}
