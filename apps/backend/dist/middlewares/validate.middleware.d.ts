import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';
type Schema = AnyZodObject | ZodEffects<AnyZodObject>;
export declare function validate(schema: Schema): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export {};
