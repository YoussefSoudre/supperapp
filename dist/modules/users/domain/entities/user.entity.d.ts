export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING_KYC = "pending_kyc"
}
export declare class User {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    passwordHash: string;
    status: UserStatus;
    cityId: string;
    referralCode: string;
    referredById: string | null;
    avatarUrl: string | null;
    fcmToken: string | null;
    phoneVerified: boolean;
    kycVerified: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
