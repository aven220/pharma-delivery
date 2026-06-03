"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceType = exports.IncidentType = exports.CallResult = exports.AssignmentStatus = exports.DeliveryPriority = exports.DeliveryStatus = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "PENDING";
    DeliveryStatus["SCHEDULED"] = "SCHEDULED";
    DeliveryStatus["ASSIGNED"] = "ASSIGNED";
    DeliveryStatus["IN_ROUTE"] = "IN_ROUTE";
    DeliveryStatus["DELIVERED"] = "DELIVERED";
    DeliveryStatus["FAILED"] = "FAILED";
    DeliveryStatus["CANCELLED"] = "CANCELLED";
    DeliveryStatus["RESCHEDULED"] = "RESCHEDULED";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
var DeliveryPriority;
(function (DeliveryPriority) {
    DeliveryPriority["URGENT"] = "URGENT";
    DeliveryPriority["HIGH"] = "HIGH";
    DeliveryPriority["MEDIUM"] = "MEDIUM";
    DeliveryPriority["LOW"] = "LOW";
})(DeliveryPriority || (exports.DeliveryPriority = DeliveryPriority = {}));
var AssignmentStatus;
(function (AssignmentStatus) {
    AssignmentStatus["PENDING"] = "PENDING";
    AssignmentStatus["ACCEPTED"] = "ACCEPTED";
    AssignmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AssignmentStatus["COMPLETED"] = "COMPLETED";
    AssignmentStatus["REASSIGNED"] = "REASSIGNED";
    AssignmentStatus["CANCELLED"] = "CANCELLED";
})(AssignmentStatus || (exports.AssignmentStatus = AssignmentStatus = {}));
var CallResult;
(function (CallResult) {
    CallResult["ANSWERED"] = "ANSWERED";
    CallResult["NO_ANSWER"] = "NO_ANSWER";
    CallResult["OFF"] = "OFF";
    CallResult["WRONG_NUMBER"] = "WRONG_NUMBER";
    CallResult["RESCHEDULE"] = "RESCHEDULE";
})(CallResult || (exports.CallResult = CallResult = {}));
var IncidentType;
(function (IncidentType) {
    IncidentType["WRONG_ADDRESS"] = "WRONG_ADDRESS";
    IncidentType["PATIENT_ABSENT"] = "PATIENT_ABSENT";
    IncidentType["MEDICATION_REJECTED"] = "MEDICATION_REJECTED";
    IncidentType["DANGEROUS_ZONE"] = "DANGEROUS_ZONE";
    IncidentType["INCOMPLETE_ORDER"] = "INCOMPLETE_ORDER";
    IncidentType["OTHER"] = "OTHER";
})(IncidentType || (exports.IncidentType = IncidentType = {}));
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["PHOTO"] = "PHOTO";
    EvidenceType["SIGNATURE"] = "SIGNATURE";
    EvidenceType["DOCUMENT"] = "DOCUMENT";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
