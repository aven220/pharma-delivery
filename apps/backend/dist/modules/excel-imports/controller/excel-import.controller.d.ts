import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
export declare const excelUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare class ExcelImportController {
    upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    reprocess(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const excelImportController: ExcelImportController;
