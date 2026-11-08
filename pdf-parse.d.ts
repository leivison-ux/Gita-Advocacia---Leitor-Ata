declare module 'pdf-parse' {
  type PdfData={text:string; numpages:number; info?:unknown};
  function pdfParse(data:Buffer,options?:{max?:number}):Promise<PdfData>;
  export = pdfParse;
}
