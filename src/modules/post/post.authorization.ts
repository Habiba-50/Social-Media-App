import { RoleEnum } from "../../common/enums";


export const postAuthorization = {
    createPost : [RoleEnum.USER , RoleEnum.ADMIN],
    updatePost : [RoleEnum.USER , RoleEnum.ADMIN],
    deletePost : [RoleEnum.USER , RoleEnum.ADMIN],
    getPost : [RoleEnum.USER , RoleEnum.ADMIN]
}

