"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRANSITIONS = exports.RideStatusTransitions = void 0;
exports.canTransitionTo = canTransitionTo;
var RideStatusTransitions;
(function (RideStatusTransitions) {
    RideStatusTransitions["PENDING_TO_SEARCHING"] = "pending \u2192 searching";
    RideStatusTransitions["SEARCHING_TO_ACCEPTED"] = "searching \u2192 accepted";
    RideStatusTransitions["ACCEPTED_TO_DRIVER_EN_ROUTE"] = "accepted \u2192 driver_en_route";
    RideStatusTransitions["DRIVER_EN_ROUTE_TO_ARRIVED"] = "driver_en_route \u2192 arrived";
    RideStatusTransitions["ARRIVED_TO_IN_PROGRESS"] = "arrived \u2192 in_progress";
    RideStatusTransitions["IN_PROGRESS_TO_COMPLETED"] = "in_progress \u2192 completed";
})(RideStatusTransitions || (exports.RideStatusTransitions = RideStatusTransitions = {}));
exports.VALID_TRANSITIONS = {
    pending: ['searching', 'cancelled'],
    searching: ['accepted', 'cancelled', 'no_driver'],
    accepted: ['driver_en_route', 'cancelled'],
    driver_en_route: ['arrived', 'cancelled'],
    arrived: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    scheduled: ['searching', 'cancelled'],
};
function canTransitionTo(from, to) {
    return exports.VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
//# sourceMappingURL=ride-status.vo.js.map