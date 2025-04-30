const pdfjs = require("pdfjs-dist");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const nodeFetch = require("node-fetch");
let fileURL = "";
let signURL = "";
const printSignature = async () => {
  const response = await nodeFetch(fileURL);
  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const responseImgFile = await nodeFetch(signURL);
  const arrayImgBuffer = await responseImgFile.arrayBuffer();
  const imageBuffer = Buffer.from(arrayImgBuffer);

  const pdfDoc = await PDFDocument.load(fileBuffer);
  const pages = pdfDoc.getPages();

  let pageArra = await getPositionV2(pages.length, fileBuffer);
  const signatureImageBytes = imageBuffer
    ? imageBuffer
    : fs.readFileSync("sign.png");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    // const { width, height } = signatureImage.scale(0.7);
    const xAndYTranform = pageArra
      .filter((pageArr) => pageArr.page === i)
      .map((pg) => pg.transform)
      .flat();
    if (xAndYTranform.length) {
      page.drawImage(signatureImage, {
        x: xAndYTranform[4] + 2,
        y: xAndYTranform[5] - 2,
        width: 220,
        height: 35,
      });
    }
  }
  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync("sugnPDF.pdf", modifiedPdfBytes);
};

async function getPositionV2(pageLength, fileBuffer) {
  const pdf = await pdfjs.getDocument(fileBuffer).promise;
  const result = Array.apply(null, Array(pageLength)).map(function (_, index) {
    return pdf.getPage(index + 1).then(function (page) {
      return page.getTextContent().then(function (textContent) {
        const transform = textContent.items
          .map(function (item) {
            if (
              item.str.includes("Signature of person responsible for deduction")
            ) {
              return item.transform;
            }
          })
          .filter((item) => item !== undefined)
          .flat();
        return { page: index, transform };
      });
    });
  });
  return await Promise.all(result);
}
