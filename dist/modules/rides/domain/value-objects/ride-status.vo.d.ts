export declare enum RideStatusTransitions {
    PENDING_TO_SEARCHING = "pending \u2192 searching",
    SEARCHING_TO_ACCEPTED = "searching \u2192 accepted",
    ACCEPTED_TO_DRIVER_EN_ROUTE = "accepted \u2192 driver_en_route",
    DRIVER_EN_ROUTE_TO_ARRIVED = "driver_en_route \u2192 arrived",
    ARRIVED_TO_IN_PROGRESS = "arrived \u2192 in_progress",
    IN_PROGRESS_TO_COMPLETED = "in_progress \u2192 completed"
}
export declare const VALID_TRANSITIONS: Record<string, string[]>;
export declare function canTransitionTo(from: string, to: string): boolean;
