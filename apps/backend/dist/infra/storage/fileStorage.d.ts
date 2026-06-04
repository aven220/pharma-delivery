export declare function ensureUploadDir(): Promise<void>;
export declare function saveEvidenceFile(buffer: Buffer, fileName: string): Promise<{
    filePath: string;
    mimeType: string;
    fileSize: number;
}>;
export declare function saveExcelFile(buffer: Buffer, fileName: string): Promise<string>;
