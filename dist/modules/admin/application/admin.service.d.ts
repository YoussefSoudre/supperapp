import { Repository } from 'typeorm';
import { Role } from '../domain/entities/role.entity';
import { Permission } from '../domain/entities/permission.entity';
import { UserRole } from '../domain/entities/user-role.entity';
export declare class AdminService {
    private readonly roleRepo;
    private readonly permRepo;
    private readonly userRoleRepo;
    constructor(roleRepo: Repository<Role>, permRepo: Repository<Permission>, userRoleRepo: Repository<UserRole>);
    getRoles(): Promise<Role[]>;
    assignRole(userId: string, roleId: string, grantedBy: string, cityId?: string): Promise<UserRole>;
    getUserRoles(userId: string): Promise<string[]>;
}
