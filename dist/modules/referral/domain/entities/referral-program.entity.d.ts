export declare enum RewardType {
    WALLET_CREDIT = "wallet_credit",
    DISCOUNT = "discount",
    FREE_RIDE = "free_ride"
}
export declare class ReferralProgram {
    id: string;
    name: string;
    cityId: string | null;
    referrerRewardType: RewardType;
    referrerRewardAmount: number;
    refereeRewardType: RewardType;
    refereeRewardAmount: number;
    triggerAfterTrips: number;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
