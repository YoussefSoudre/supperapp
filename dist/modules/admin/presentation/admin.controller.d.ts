import { AdminService } from '../application/admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getRoles(): Promise<import("../domain/entities/role.entity").Role[]>;
    assignRole(userId: string, body: {
        roleId: string;
        grantedBy: string;
        cityId?: string;
    }): Promise<import("../domain/entities/user-role.entity").UserRole>;
    getUserRoles(userId: string): Promise<string[]>;
}
