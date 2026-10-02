import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { userGQLSchema } from "../user";
import { postGQLSchema } from "../post/gql/post.schema.gql";

const query = new GraphQLObjectType({
    name: "Query",
    description: "Root query",
    fields: {
        ...userGQLSchema.registerQuery(),
        ...postGQLSchema.registerQuery()
    }
})
const mutation = new GraphQLObjectType({
    name: "Mutation",
    description: "Root mutation",
    fields: {
     ...userGQLSchema.registerMutation(),
     ...postGQLSchema.registerMutation()
    }
})

export const schema = new GraphQLSchema({ query , mutation})