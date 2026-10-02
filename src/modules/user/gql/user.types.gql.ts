import { GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../../common/enums";


export const GenderGQLEnumType = new GraphQLEnumType({
    name: "GenderGQLEnumType",
    values: {
        Male: { value: GenderEnum.MALE },
        Female: { value: GenderEnum.FEMALE },
    }
})

const RoleGQLEnumType = new GraphQLEnumType({
    name: "RoleType",
    values: {
        ADMIN: { value: RoleEnum.ADMIN },
        USER: { value: RoleEnum.USER },
    }
})

const ProviderGQLEnumType = new GraphQLEnumType({
    name: "ProviderType",
    values: {
        SYSTEM: { value: ProviderEnum.SYSTEM },
        GOOGLE: { value: ProviderEnum.GOOGLE },
    }
})

export const OneUserType: GraphQLObjectType = new GraphQLObjectType({
    name: "OneUserType",
    fields: () => ({
        _id: { type: new GraphQLNonNull(GraphQLID) },

             firstName: { type: new GraphQLNonNull(GraphQLString) },
             lastName: { type: new GraphQLNonNull(GraphQLString) },
             username: { type: GraphQLString },
             email: { type: new GraphQLNonNull(GraphQLString) },
             password: { type: new GraphQLNonNull(GraphQLString) },
                                      
             phone: { type: GraphQLString },
             profilePicture: { type: GraphQLString },
             profileCoveredPictures: { type: new GraphQLList(GraphQLString) },
                   
             gender: { type: GenderGQLEnumType },
             role: { type: RoleGQLEnumType },
             provider: { type: ProviderGQLEnumType },
                   
             changeCredentialsTime: { type: GraphQLString },
             DOB: { type: GraphQLString },
             confirmEmail: { type: GraphQLString },
                   
             createdAt: { type: GraphQLString },
             updatedAt: { type: GraphQLString },
             deletedAt: { type: GraphQLString },
             restoredAt: { type: GraphQLString },
    })
})

export const profile = new GraphQLNonNull(new GraphQLObjectType({
    name: "ProfileResponse",
    description: "",
    fields: {
        data: { type: OneUserType }
    }
}))