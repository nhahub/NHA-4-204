import { PDFParse } from "pdf-parse";

export async function processCV(base64Buffer: string): Promise<string> {
    const buffer = Buffer.from(base64Buffer, "base64");
    
    // MODULAR STORAGE INTEGRATION:
    // If you eventually implement S3 or Local storage, you can insert logic here to asynchronously save the `buffer` to your bucket.
    // e.g. await s3.upload(buffer).promise();

    // 1. Parse the PDF in Memory
    const parser = new PDFParse({ data: buffer });
    await parser.getText();
    const data = await parser.getText();
    
    // 2. Return the extracted raw text
    return data.text;
}
