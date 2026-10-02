import { IComment } from "../../common/interfaces";
import { CommentModel} from "../model/index";
import { DatabaseRepository } from "./base.repository";

export class CommentRepository extends DatabaseRepository<IComment> {
    constructor() {
        super(CommentModel);
    }
}