const uuid = require("uuid");
const puppeteer = require('puppeteer');
const path = require("path");

module.exports = function (fastify, opts, done) {
    
    // fastify.post("/quotation", async (request, response) => {
    //     return generate("quotation", request.body);
    // });

    // fastify.post("/referral", async (request, response) => {
    //     return generate("referral", request.body);
    // });

    fastify.post("/rentals/ticket", async (request, response) => {
        return generate("ticket", request.body, 'Ticket solo informativo. No representa un CFDI.');
    });

    const generate = async function (template, body, footerText = '') {

        const footer = `
        <footer style="margin: 0 4mm; width: 100%; font-size: 2mm;">
            <p class="float-left" style="width: 33%; float: left">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAYAAAAfrhY5AAABgmlDQ1BzUkdCIElFQzYxOTY2LTIuMQAAKJF1kb9LQlEUxz9ZYaShUENBg4Q1ZZiB1NKglAXVYAb9WvT5K1B7vGeEtAatQUHU0q+h/oJag+YgKIog2oLmopaS13kqKJHncu753O+953DvuWCJZJSs3uSFbC6vhUMB1/zCosv6io0unPjxRRVdnZ4dj1DXvh5oMOOdx6xV/9y/ZosndAUaWoRHFVXLC08IT63nVZN3hTuUdDQufC7cr8kFhe9NPVbmN5NTZf4xWYuEg2BxCrtSNRyrYSWtZYXl5bizmTWlch/zJfZEbm5WYo94NzphQgRwMckYQenJICMy+/HgY0BW1Mn3lvJnWJVcRWaVAhorpEiTp1/UNamekJgUPSEjQ8Hs/9++6skhX7m6PQDNL4bx0QvWHShuG8b3sWEUT6DxGa5y1fzVIxj+FH27qrkPwbEJF9dVLbYHl1vQ+aRGtWhJahS3JJPwfgZtC9B+C61L5Z5V9jl9hMiGfNUN7B9An5x3LP8C6RZoIdhCA94AAAAJcEhZcwAACxMAAAsTAQCanBgAAAFsSURBVEiJ5dcxSxxBFADg79a90tiEGBOsrEyTBPwD2lpY2hibYHlFCpFUYp0uRcp0EkhhZacISjoRK22EFAqiWGhCmqDmLG4X9W73jjt37gI+GBZmmPlmZx/z2JL7URI2qlmd09hKBkO2n1hAfwq/6QJa35ZS/FMP8GOUouTNux1DiGPZSXaE6wKxlyhnDaxrPJbBAmHYyTDKUcFIW/F48RhfsFrX/6cHewkW/1/CxcnzBd7haYfrbON7JxPHceVh1+XXFkbusVfQ18muHxoRfvUCTvHPOOsFHmMXw5iUnXDPsSjAhZRm+1+s5MAbIWAtFk3h0RBwMzw4nIc3g0/Vvn8QvBU8gf0QeFdhbrO9SDjSeKKZPyMRBgqEYQaXde1tHv6+QLitiDDVJpxVCy7adA/UTkTF/VJ3gldNJsY4rJvz+s74rNYl+AO1UrqH33iGb5hLdpYX//ADT5J5H7F2Z3wEYzjPaJuYxzKqNy1axbbt20VrAAAAAElFTkSuQmCC" 
                class="icon" style="height: 10px; width: 10px; margin: 0px 5px 0px 0px; vertical-align: middle;"/>
                www.input.mx
            </p>
            <p style='text-align: center; float: left;'>`
                +footerText+
            `</p>
            <p style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></p>
        </footer>`

        var html = await fastify.view(
            "public/document_" + template + ".html",
            body
        );
        var documentName = template + "." + uuid.v1() + ".pdf";
        var documentLocation = path.join(__dirname, "public/docs/") + documentName;
        // Uncomment line 41 and comment from 42 to 45 to run on Windows
        const browser = await puppeteer.launch();
        // const browser = await puppeteer.launch({
        //     executablePath: '/usr/bin/chromium-browser',
        //     args: ['--no-sandbox']
        // });
        const page = await browser.newPage();
        await page.setContent(html);

        await page.pdf({ 
            path: documentLocation, 
            format: 'letter',
            displayHeaderFooter: true,
            footerTemplate: footer
        });
        await browser.close();

        return { path: "docs/" + documentName };
    };

    done();
};