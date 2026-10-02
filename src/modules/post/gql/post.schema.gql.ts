import * as PostGQLTypes from "./post.types.gql"
import * as PostGQLArgs from "./post.args.gql"
import { PostResolver } from './post.resolver';


export class PostGQLSchema {
    private postResolver: PostResolver;
    constructor() {
        this.postResolver = new PostResolver();
     }

    registerQuery() {
        return {
            postList: {
                description:"Get user postList",
                type: PostGQLTypes.postList,
                args: PostGQLArgs.postList,
                resolve: this.postResolver.postList
            }
        }
    }
  

    registerMutation() {
        return {
            reactOnPost: {
                type: PostGQLTypes.ReactOnPost,
                description: "React on post",
                args: PostGQLArgs.reactOnPost,
                resolve: this.postResolver.reactOnPost
            }
        }
    }
}
export const postGQLSchema = new PostGQLSchema()