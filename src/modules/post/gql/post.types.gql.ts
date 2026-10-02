import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { AvailabilityEnum } from "../../../common/enums";
import { OneUserType } from "../../user/gql/user.types.gql";

const AvailabilityEnumType = new GraphQLEnumType({
  name: "AvailabilityEnum",
  values: {
    PUBLIC: { value: AvailabilityEnum.PUBLIC },
    FRIENDS: { value: AvailabilityEnum.FRIENDS },
    ONLY_ME: { value: AvailabilityEnum.ONLY_ME },
  },
});

export const OnePostType: GraphQLObjectType = new GraphQLObjectType({
  name: "OnePostType",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    folderId: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLString },
    files: { type: new GraphQLList(GraphQLString) },

    likes: {
      type: new GraphQLList(OneUserType),
      resolve: (post) => (post.likes || []).map((like: any) => like.userId).filter(Boolean)
    },
    tags: { type: new GraphQLList(OneUserType) },
    availability: { type: AvailabilityEnumType },

    createdBy: { type: new GraphQLNonNull(OneUserType) },
    updatedBy: { type: new GraphQLNonNull(OneUserType) },

    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: GraphQLString },
    deletedAt: { type: GraphQLString },
    restoredAt: { type: GraphQLString },
  }),
});

export const postList = new GraphQLNonNull(
  new GraphQLObjectType({
    name: "PostListResponse",
    fields: {
      data: {
        type: new GraphQLObjectType({
          name: "PostPaginationResponse",
          fields: {
              docs: { type: new GraphQLList(OnePostType) },
              currentPage:{ type: GraphQLInt },
              pageSize:{ type: GraphQLInt },
              pages:{ type: GraphQLInt },
          },
        }),
      },
    },
  }),
);

export const ReactOnPost = new GraphQLObjectType({
    name: "ReactOnPostResponse",
  fields: {
        message: { type: new GraphQLNonNull(GraphQLString) },
        data: { type: OnePostType }
    }
})