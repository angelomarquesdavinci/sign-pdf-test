import * as fsPromises from "fs/promises";
import { PDFDocument } from "pdf-lib";
import {
  PdfSigner,
  SignDigitalParameters,
  SignerSettings,
  AddFieldParameters,
  SignVisualParameters,
  PdfDigitalSigner,
  PdfVisualSigner,
} from "sign-pdf-lib";

async function main() {
  try {
    const filePath = "template-rio-negro-preenchido.pdf";
    const filePathVerify = "pedro-assinado-1.pdf";
    const fileBytes = await fsPromises.readFile(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    const lastPage = pdfDoc.getPageCount();

    const settings: SignerSettings = {
      signatureLength: 4000 - 6,
      rangePlaceHolder: 9999999,
      signatureComputer: {
        certificate: await fsPromises.readFile("certificate.p12"),
        password: "123456",
      },
    };

    // const parameters: SignDigitalParameters = {
    //   pageNumber: lastPage,
    //   signature: {
    //     name: "jhondoe",
    //     location: "pr",
    //     reason: "Signing Certificate",
    //     date: new Date(),
    //     contactInfo: "example@email.com",
    //   },
    //   // visual: {
    //   // background: await fsPromises.readFile("react-logo.png"),

    //   visual: {
    //     // background: await fsPromises.readFile("react-logo.png"),
    //     texts: [
    //       { lines: ["a", "c", "d", "f"] },
    //       { lines: ["b", "c", "d", "f"] },
    //       // { lines: ["c"] },
    //       // { lines: ["d"] },
    //     ],
    //     rectangle: {
    //       left: 50.0 * -1,
    //       top: (180 - 100) * -1,
    //       right: (50.0 + 214.0) * -1,
    //       bottom: (180 - 100 + 70) * -1,
    //     },
    //   },
    // };

    // const signFieldParameters: SignDigitalParameters = {
    //   pageNumber: lastPage,
    //   signature: {
    //     name: "jhondoe",
    //     location: "pr",
    //     reason: "Signing Certificate",
    //     // modified: new Date(),
    //     contactInfo: "example@email.com",
    //   },
    //   visual: {
    //     // background: await fsPromises.readFile("react-logo.png"),

    //     texts: [
    //       { lines: ["a"] },
    //       { lines: ["b"] },
    //       { lines: ["c"] },
    //       { lines: ["d"] },
    //     ],
    //     rectangle: {
    //       left: 50.0 * -1,
    //       top: (180 - 100) * -1,
    //       right: (50.0 + 214.0) * -1,
    //       bottom: (180 - 100 + 70) * -1,
    //     },
    //   },
    // };

    const pdfSigner = new PdfDigitalSigner(settings);

    // const placeholderPdf = await pdfSigner.addPlaceholderAsync(
    //   fileBytes,
    //   parameters
    // );

    // const fieldPdf = await pdfSigner.addFieldAsync(
    //   fileBytes,
    //   addFieldParameters
    // );
    // const signedPdf = await pdfSigner.addFieldAsync(
    //   fieldPdf,
    //   addFieldParameters
    // );
    // const signedPdf = await pdfSigner.signAsync(fileBytes, parameters);

    // await fsPromises.writeFile(filePathVerify, signedPdf);

    const fileBytesVerify = await fsPromises.readFile(filePathVerify);
    const checks = await pdfSigner.verifySignaturesAsync(fileBytesVerify);
    pdfSigner.verifySignaturesAsync;

    // @ts-ignore
    console.log("checks", checks?.signatures[0].details);
  } catch (error) {
    console.error("error reading the file:", error);
  }
}

main();
