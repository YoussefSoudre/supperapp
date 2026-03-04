export declare enum FoodOrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PREPARING = "preparing",
    READY_FOR_PICKUP = "ready_for_pickup",
    PICKED_UP = "picked_up",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
export declare class FoodOrder {
    id: string;
    userId: string;
    restaurantId: string;
    driverId: string | null;
    status: FoodOrderStatus;
    items: Array<{
        itemId: string;
        name: string;
        qty: number;
        unitPrice: number;
        notes?: string;
    }>;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    currency: string;
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    specialInstructions: string | null;
    paymentId: string | null;
    isPaid: boolean;
    estimatedDeliveryAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
