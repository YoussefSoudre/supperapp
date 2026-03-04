export declare enum ReferralUsageStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    REWARDED = "rewarded",
    EXPIRED = "expired"
}
export declare class ReferralUsage {
    id: string;
    programId: string;
    referrerId: string;
    refereeId: string;
    status: ReferralUsageStatus;
    tripsCompleted: number;
    rewardedAt: Date | null;
    createdAt: Date;
}
