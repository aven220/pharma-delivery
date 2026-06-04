"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const user_service_1 = require("../service/user.service");
class UserController {
    async list(req, res, next) {
        try {
            const result = await user_service_1.userService.list(req.query);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const user = await user_service_1.userService.getById(req.params.id);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const user = await user_service_1.userService.create(req.body);
            res.status(201).json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const user = await user_service_1.userService.update(req.params.id, req.body);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async activate(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus(req.params.id, 'ACTIVE');
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async deactivate(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus(req.params.id, 'INACTIVE');
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await user_service_1.userService.resetPassword(req.params.id, req.body.password);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async changeStatus(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus(req.params.id, req.body.status);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
