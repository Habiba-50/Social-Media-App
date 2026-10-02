import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { ReactEnum } from "../../../common/enums";


export const ReactGQLEnumType = new GraphQLEnumType({
    name: "ReactGQLEnumType",
    values: {
        DISLIKE: { value: ReactEnum.DISLIKE },
        LIKE: { value: ReactEnum.LIKE },
        LOVE: { value: ReactEnum.LOVE },
        LAUGH: { value: ReactEnum.LAUGH },
        WOW: { value: ReactEnum.WOW },
        SAD: { value: ReactEnum.SAD },
        ANGRY: { value: ReactEnum.ANGRY },
    }
})

export const postList = {
    page: { type: GraphQLInt },
    size: { type: GraphQLInt },
    search:{ type: GraphQLString }
}


export const reactOnPost = {
    postId: { type : new GraphQLNonNull(GraphQLID) },
    react: {
        type: ReactGQLEnumType
    },
}
