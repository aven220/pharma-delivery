"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
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
            const user = await user_service_1.userService.getById((0, auth_middleware_1.routeParam)(req.params.id));
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
            const user = await user_service_1.userService.update((0, auth_middleware_1.routeParam)(req.params.id), req.body);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async activate(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus((0, auth_middleware_1.routeParam)(req.params.id), 'ACTIVE');
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async deactivate(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus((0, auth_middleware_1.routeParam)(req.params.id), 'INACTIVE');
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await user_service_1.userService.resetPassword((0, auth_middleware_1.routeParam)(req.params.id), req.body.password);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async changeStatus(req, res, next) {
        try {
            const user = await user_service_1.userService.changeStatus((0, auth_middleware_1.routeParam)(req.params.id), req.body.status);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
