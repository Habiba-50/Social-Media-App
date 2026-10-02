import { PostService } from './../post.service';
import { IAuthUser } from '../../../common/types/express.types';
import { PagibanteDto, paginationValidationSchema } from '../../../common/validation';
import { GQLValidation } from '../../../middleware';
import { reactOnPostGQL } from '../post.validation';
import { ReactOnPostGQLDto } from '../post.dto';


export class PostResolver {
    private postService: PostService; 

    constructor() {
        this.postService = new PostService();
    }

    postList = async (parent: any, args:any, { user }: IAuthUser, info: any) => {
        await GQLValidation<PagibanteDto>(paginationValidationSchema.query, args)
        const postList = await this.postService.getPostList(args, user);
        return {data:postList};
    }

    reactOnPost = async (parent: any, args: any, { user }: IAuthUser, info: any) => {
        await GQLValidation<ReactOnPostGQLDto>(reactOnPostGQL, args);
        const { postId, react } = args
        const result = await this.postService.reactPost({ postId }, { react }, user);
        // console.log(result)
        return {message:"Reacted on post",data:result};
    }
}

export const postResolver = new PostResolver()