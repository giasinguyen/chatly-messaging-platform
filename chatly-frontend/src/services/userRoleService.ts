import { userService } from "@/services/user.service";
import type { UserResponse } from "@/types/auth";

export type UserRole = NonNullable<UserResponse["role"]>;
export type UserRoleMap = Record<string, UserRole>;

let cachedRolesById: UserRoleMap | null = null;
let pendingRolesPromise: Promise<UserRoleMap> | null = null;

function buildRolesById(users: UserResponse[]): UserRoleMap {
    return users.reduce<UserRoleMap>((rolesById, user) => {
        if (user.role) {
            rolesById[user.id] = user.role;
        }
        return rolesById;
    }, {});
}

export const userRoleService = {
    getRolesById: async (): Promise<UserRoleMap> => {
        if (cachedRolesById) {
            return cachedRolesById;
        }

        if (!pendingRolesPromise) {
            pendingRolesPromise = userService
                .getAll()
                .then((response) => {
                    cachedRolesById =
                        response.code === 1000 && response.result
                            ? buildRolesById(response.result)
                            : {};
                    return cachedRolesById;
                })
                .finally(() => {
                    pendingRolesPromise = null;
                });
        }

        return pendingRolesPromise;
    },

    clearCache: () => {
        cachedRolesById = null;
        pendingRolesPromise = null;
    },
};
