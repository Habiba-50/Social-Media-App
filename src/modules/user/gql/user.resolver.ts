import { IAuthUser } from "../../../common/types/express.types";
import { gqlAuthorization, GQLValidation } from "../../../middleware";
import { userAuthorization } from "../user.authorization";
import userService, { UserService } from "../user.service";
import { profileGQL } from "../user.validation";


export class UserResolver{
    private userService: UserService;

    constructor() {
        this.userService = userService;
    }

    profile = async (parent: any, args: { search?: string }, {user}: IAuthUser, info: any)=> {
        await gqlAuthorization(userAuthorization.profile, user)
        await GQLValidation<{ search?: string }>(profileGQL , args)
        const userProfile = await this.userService.profile(user);
        return {data:userProfile};
    }
}

export const userResolver = new UserResolver()