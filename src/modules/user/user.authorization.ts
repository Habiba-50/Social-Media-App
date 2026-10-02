import { RoleEnum } from "../../common/enums";


export const userAuthorization = {
    profile: [RoleEnum.USER, RoleEnum.ADMIN],
    getAllUsers: [RoleEnum.ADMIN]
}