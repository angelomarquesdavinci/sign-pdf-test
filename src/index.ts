import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { P12Signer } from "@signpdf/signer-p12";
import signpdf from "@signpdf/signpdf";
import * as fsPromises from "fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PdfDigitalSigner, SignerSettings } from "sign-pdf-lib";

export function getSignFormattedDate() {
  const date = new Date();

  const formattedDate = `${date.getFullYear()}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}.${String(date.getDate() + 1).padStart(2, "0")}`;

  const formattedTime = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const offset = -date.getTimezoneOffset() / 60;
  const formattedOffset = `${offset >= 0 ? "+" : "-"}${Math.abs(offset)
    .toString()
    .padStart(2, "0")}'00'`;

  return `${formattedDate} ${formattedTime} ${formattedOffset}`;
}

const signTextProperties = {
  curitiba: { x: 610, y: 455, width: 180 },
  default: { x: 200, y: 580, width: 200 },
  "foz-do-iguaçu": { x: 330, y: 675, width: 180 },
  "francisco-beltrao": { x: 620, y: 310, width: 180 },
  londrina: { x: 315, y: 720, width: 180 },
  "marechal-candido-rondon": { x: 340, y: 725, width: 180 },
  "rio-negro": { x: 330, y: 680, width: 180 },
  "sao-jose-dos-pinhais": { x: 330, y: 715, width: 180 },
};

async function verifyPdfSignatures(
  pdfFile: Buffer,
  certificate: { file: Buffer; password?: string }
) {
  const settings: SignerSettings = {
    signatureLength: 4000 - 6,
    rangePlaceHolder: 9999999,
    signatureComputer: {
      certificate: certificate.file,
      password: certificate.password ?? "",
    },
  };

  const pdfSigner = new PdfDigitalSigner(settings);

  const checks = await pdfSigner.verifySignaturesAsync(pdfFile);

  if (!checks?.signatures.length) throw Error("No signatures");
}

async function drawSignText(
  pdfDoc: PDFDocument,
  template: keyof typeof signTextProperties
) {
  const pageIndex =
    template === "francisco-beltrao" ? 2 : pdfDoc.getPageCount() - 1;
  const page = pdfDoc.getPage(pageIndex);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textProperties = signTextProperties[template];
  const firstTextWidth = 0.53 * textProperties.width;

  page.drawText("PEDRO AMERICO NORCIO DUARTE:06109641944", {
    x: textProperties.x,
    y: textProperties.y,
    maxWidth: firstTextWidth,
    size: 7,
    lineHeight: 10,
    font: helveticaBoldFont,
  });

  page.drawText(
    `Assinado de forma digital por PEDRO AMERICO NORCIO DUARTE DUARTE:06109641944\nDados:${getSignFormattedDate()}`,
    {
      x: textProperties.x + firstTextWidth,
      y: textProperties.y + 2,
      maxWidth: textProperties.width - firstTextWidth,
      size: 5,
      lineHeight: 6,
      font: helveticaBoldFont,
    }
  );

  return {
    page,
    widgetRect: [
      textProperties.x,
      textProperties.y,
      textProperties.x + textProperties.width,
      textProperties.y + 50,
    ],
  };
}

async function work() {
  // contributing.pdf is the file that is going to be signed
  const pdfBuffer = await fsPromises.readFile(`curitiba-template.pdf`);
  // certificate.p12 is the certificate that is going to be used to sign
  const certificateBuffer = await fsPromises.readFile(`certificate.p12`);
  const signer = new P12Signer(certificateBuffer, { passphrase: "123456" });

  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const { page, widgetRect } = await drawSignText(pdfDoc, "curitiba");

  // The PDF needs to have a placeholder for a signature to be signed.
  pdflibAddPlaceholder({
    pdfDoc,
    reason: "The user is declaring consent.",
    contactInfo: "signpdf@example.com",
    name: "John Doe",
    location: "Free Text Str., Free World",
    signatureLength: 4000,
    widgetRect,
    pdfPage: page,
  });

  const writtenPdfBuffer = await pdfDoc.save();

  // const writtenPdfBuffer = Buffer.from(pdfDoc.);

  // // pdfWithPlaceholder is now a modified buffer that is ready to be signed.
  const signedPdf = await signpdf.sign(writtenPdfBuffer, signer);

  await verifyPdfSignatures(signedPdf, {
    file: certificateBuffer,
    password: "123456",
  });

  // // signedPdf is a Buffer of an electronically signed PDF. Store it.
  const targetPath = `${__dirname}/../signed-pgrs.pdf`;
  await fsPromises.writeFile(targetPath, signedPdf);
}

work();
