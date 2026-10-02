import { GraphQLString } from "graphql"
import * as UserGQLTypes from "./user.types.gql"
import * as UserGQLArgs from "./user.args.gql"
import { userResolver } from './user.resolver';


export class UserGQLSchema {
    constructor() { }

    registerQuery() {
        return {
            profile: {
                description:"Get user profile",
                type: UserGQLTypes.profile,
                args: UserGQLArgs.profile,
                resolve: userResolver.profile
            }
        }
    }
  

    registerMutation() {
        return {
            like: {
                type: GraphQLString,
                description: "test welcome point",
                resolve: () => {

                    return `Hello`

                }
            }
        }
    }
}
export const userGQLSchema = new UserGQLSchema()