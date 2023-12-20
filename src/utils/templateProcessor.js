const nunjucks = require('nunjucks');
const ecc = require('eosjs-ecc');
const html_to_pdf = require('html-pdf-node');
const { PDFDocument } = require('pdf-lib');
const { jsPDF } = require('jspdf');

class TransExtension {
    constructor(translation) {
        this.tags = ['trans'];
        this.translation = translation;
    }

    parse(parser, nodes) {
        let tok = parser.nextToken();
        let args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);
        return new nodes.CallExtension(this, 'run', args);
    }

    run(context, key) {
        return this.translation[key] || key;
    }
}

function createEnv(translation) {
    const env = new nunjucks.Environment();
    env.addExtension('TransExtension', new TransExtension(translation));

    env.addFilter('date', function(date, format) {
        const d = new Date(date);
        
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0'); // Месяцы начинаются с 0
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');

        return `${day}-${month}-${year} ${hours}:${minutes}`;
        // return d.toString();
    });

    return env;
}

function getBodyContent(draft, vars, translation) {
    const htmlString = renderTemplate(draft, vars, translation)
    return htmlString
}

function getBody(content) {
    return content
}

async function fetchFont(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const font = arrayBufferToBase64(arrayBuffer);
    return font;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function renderTemplate(draft, vars, translation) {
    const env = createEnv(translation);
    return env.renderString(draft, vars);
}


async function getPDFHash(draft, vars, translation) {
    try {

        const content = renderTemplate(draft, vars, translation);
        const buffer = await convertToPDF(content);
        const sha = ecc.sha256(buffer);
        

        return sha;
    } catch (err) {
        console.error("Error in getPDFHash:", err);
        throw err;
    }
}


async function downloadPDF(draft, vars, translation, filename = 'document.pdf') {
    try {
        
        const content = renderTemplate(draft, vars, translation);
        const buffer = await convertToPDF(content);
        
        const blob = new Blob([buffer], { type: 'application/pdf' });
        // const link = document.createElement('a');
        // link.href = window.URL.createObjectURL(blob);
        // link.download = filename;
        // link.click();
        // 
        return blob
    } catch (err) {
        console.error("Error generating PDF:", err);
    }
}


async function updateMetadata(pdfBuffer, meta) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // pdfDoc.setAuthor(meta.author)
    // pdfDoc.setKeywords([meta.lang])
    // pdfDoc.setProducer('PDF App 9000 🤖')

    pdfDoc.setTitle(meta.title)
    pdfDoc.setSubject(meta.lang)
    pdfDoc.setCreator(`coopjs-pdf ${meta.version}`)
    pdfDoc.setCreationDate(meta.created_at)
    pdfDoc.setModificationDate(meta.created_at)

    return await pdfDoc.save();
}

async function convertToPDF(content, meta) {
    return new Promise(async (resolve, reject) => {
        try {
            const html_to_pdf = require('html-pdf-node');
            
            let options = { 
                format: 'A4',
                margin: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                },
                headerTemplate: "",
            };
            
            let file = {content}
            
            const pdfBuffer = await html_to_pdf.generatePdf(file, options)
            const cleanPDFBuffer = await updateMetadata(pdfBuffer, meta)

            resolve(cleanPDFBuffer)


        } catch (err) {
            reject(err);
        }
    });
}



module.exports = { renderTemplate, getBodyContent, downloadPDF, convertToPDF, getPDFHash, getBody }
