const nunjucks = require('nunjucks');
const ecc = require('eosjs-ecc');
const html_to_pdf = require('html-pdf-node');

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
        if (format === 'c') {
            return d.toISOString();
        }
        return d.toString();
    });

    return env;
}

function getBodyContent(draft, vars, translation) {
    const htmlString = renderTemplate(draft, vars, translation)
    const match = /<body[^>]*>((.|[\n\r])*)<\/body>/im.exec(htmlString);
    return (match && match[1]) ? match[1].trim() : '';
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
        console.log("arrayBuffer: ", buffer)
        const sha = ecc.sha256(buffer);
        console.log('sha256: ', sha)

        return sha;
    } catch (err) {
        console.error("Error in getPDFHash:", err);
        throw err;
    }
}


async function downloadPDF(draft, vars, translation, filename = 'document.pdf') {
    try {
        console.log("here on down", draft, vars, translation)
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


async function convertToPDF(content) {
    return new Promise(async (resolve, reject) => {
        try {
            const html_to_pdf = require('html-pdf-node');
            
            let options = { format: 'A4', margin: {
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
            }};
            
            let file = {content}
            // let file = { content: "<h1>Welcome to html-pdf-node</h1>" };

            html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
              resolve(pdfBuffer)
            });

        } catch (err) {
            reject(err);
        }
    });
}



module.exports = { renderTemplate, getBodyContent, downloadPDF, convertToPDF, getPDFHash }
