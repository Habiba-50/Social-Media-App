import { GenderEnum, ProviderEnum, RoleEnum } from "../enums";


export interface IUser {

    firstName: string,
    lastName: string,
    username?: string,
    email: string,
    password: string,
    bio?: string,
    phone?: string,
    profilePicture?: string,
    profileCoveredPictures?: string[],

    gender?: GenderEnum,
    role: RoleEnum,
    provider: ProviderEnum,

    changeCredentialsTime?: Date,
    DOB?: Date,
    confirmEmail?: Date,


    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | undefined,
    restoredAt?: Date | undefined,

    followingCount?: number,
    followersCount?: number,
    friendsCount?: number,

}