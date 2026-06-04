import { Server } from 'socket.io';
export declare function setupSocketIO(io: Server): void;
export declare const SOCKET_EVENTS: {
    readonly DELIVERY_CREATED: "delivery.created";
    readonly DELIVERY_UPDATED: "delivery.updated";
    readonly DELIVERY_COMPLETED: "delivery.completed";
    readonly ASSIGNMENT_CREATED: "assignment.created";
    readonly ASSIGNMENT_UPDATED: "assignment.updated";
    readonly INCIDENT_CREATED: "incident.created";
};
