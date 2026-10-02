document.addEventListener('DOMContentLoaded', () => {
    // Service Worker PWA Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[SmartForms PWA] Service Worker Active Scope:', reg.scope))
            .catch(err => console.error('[SmartForms PWA] Registration Failed:', err));
    }

    // Sidebar View Navigation Switcher
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const viewPanels = document.querySelectorAll('.view-panel');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('data-view');
            if (!targetView) return;

            menuItems.forEach(m => m.classList.remove('active'));
            viewPanels.forEach(p => p.classList.add('hidden'));

            e.currentTarget.classList.add('active');
            const activePanel = document.getElementById(targetView);
            if (activePanel) activePanel.classList.remove('hidden');
        });
    });

    // Converter Mode Tab Switcher
    const btnModePdfToImg = document.getElementById('btnModePdfToImg');
    const btnModePdfToWord = document.getElementById('btnModePdfToWord');
    const btnModeImgToPdf = document.getElementById('btnModeImgToPdf');
    
    const pdfToImgBox = document.getElementById('pdfToImgBox');
    const pdfToWordBox = document.getElementById('pdfToWordBox');
    const imgToPdfBox = document.getElementById('imgToPdfBox');

    btnModePdfToImg.addEventListener('click', () => {
        btnModePdfToImg.classList.add('active');
        btnModePdfToWord.classList.remove('active');
        btnModeImgToPdf.classList.remove('active');
        pdfToImgBox.classList.remove('hidden');
        pdfToWordBox.classList.add('hidden');
        imgToPdfBox.classList.add('hidden');
    });

    btnModePdfToWord.addEventListener('click', () => {
        btnModePdfToWord.classList.add('active');
        btnModePdfToImg.classList.remove('active');
        btnModeImgToPdf.classList.remove('active');
        pdfToWordBox.classList.remove('hidden');
        pdfToImgBox.classList.add('hidden');
        imgToPdfBox.classList.add('hidden');
    });

    btnModeImgToPdf.addEventListener('click', () => {
        btnModeImgToPdf.classList.add('active');
        btnModePdfToImg.classList.remove('active');
        btnModePdfToWord.classList.remove('active');
        imgToPdfBox.classList.remove('hidden');
        pdfToImgBox.classList.add('hidden');
        pdfToWordBox.classList.add('hidden');
    });

    // IndexedDB Setup for History Log
    const DB_NAME = 'SmartFormsDB';
    const DB_VERSION = 1;
    let db = null;

    function initIndexedDB() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('signedDocs')) {
                db.createObjectStore('signedDocs', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            loadHistoryFromDB();
        };
    }

    initIndexedDB();

    function saveDocToDB(fileName) {
        if (!db) return;
        const transaction = db.transaction(['signedDocs'], 'readwrite');
        const store = transaction.objectStore('signedDocs');
        store.add({
            name: fileName,
            timestamp: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
        });
        transaction.oncomplete = () => loadHistoryFromDB();
    }

    function loadHistoryFromDB() {
        if (!db) return;
        const historyListContainer = document.getElementById('historyListContainer');
        const countSignedDisplay = document.getElementById('countSigned');
        const transaction = db.transaction(['signedDocs'], 'readonly');
        const store = transaction.objectStore('signedDocs');
        const request = store.getAll();

        request.onsuccess = () => {
            const records = request.result;
            countSignedDisplay.innerText = records.length;
            historyListContainer.innerHTML = '';

            if (records.length === 0) {
                historyListContainer.innerHTML = '<p class="empty-msg">No processed documents in local offline history.</p>';
                return;
            }

            records.reverse().forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'history-item';
                itemDiv.innerHTML = `
                    <div>
                        <strong style="font-size:0.88rem;">${item.name}</strong>
                        <div style="font-size:0.75rem; color:#64748b;">Processed on ${item.timestamp}</div>
                    </div>
                    <span style="color:#10b981; font-weight:600; font-size:0.8rem;"><i class="fa-solid fa-check-circle"></i> Saved</span>
                `;
                historyListContainer.appendChild(itemDiv);
            });
        };
    }

    document.getElementById('btnClearHistory').addEventListener('click', () => {
        if (!db) return;
        if (confirm('Clear local history log?')) {
            const transaction = db.transaction(['signedDocs'], 'readwrite');
            transaction.objectStore('signedDocs').clear();
            transaction.oncomplete = () => loadHistoryFromDB();
        }
    });

    // -------------------------------------------------------------
    // US LEGAL TEMPLATES GENERATOR (W-9, NDA, LEASE AGREEMENT)
    // -------------------------------------------------------------
    window.generateTemplatePdf = async function(type) {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // US Letter standard (8.5 x 11 inches)
        const { width, height } = page.getSize();
        
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        let title = '';
        let filename = '';
        let contentLines = [];

        if (type === 'w9') {
            title = 'REQUEST FOR TAXPAYER IDENTIFICATION NUMBER (IRS FORM W-9)';
            filename = 'IRS_Form_W9_Template.pdf';
            contentLines = [
                '1. Name (As shown on your income tax return): ___________________________',
                '2. Business name/disregarded entity name, if different from above: ___________',
                '3. Check appropriate box for federal tax classification:',
                '   [ ] Individual/sole proprietor  [ ] C Corporation  [ ] S Corporation',
                '   [ ] Partnership  [ ] Trust/estate  [ ] Limited liability company',
                '4. Address (number, street, and apt. or suite no.): _______________________',
                '5. City, state, and ZIP code: _________________________________________',
                'Part I: Taxpayer Identification Number (TIN)',
                'Social Security Number (SSN): ___ - __ - ____',
                'OR Employer Identification Number (EIN): __ - _______',
                'Part II: Certification',
                'Under penalties of perjury, I certify that the information provided is true, correct,',
                'and complete. Signature: _______________________ Date: _____________'
            ];
        } else if (type === 'nda') {
            title = 'STANDARD NON-DISCLOSURE AGREEMENT (NDA)';
            filename = 'Standard_NDA_Template.pdf';
            contentLines = [
                'This Non-Disclosure Agreement ("Agreement") is entered into as of ___________',
                'by and between _______________________ ("Disclosing Party")',
                'and _______________________ ("Receiving Party").',
                '',
                '1. Purpose: The Disclosing Party intends to share confidential information',
                '   for the sole purpose of evaluating a potential business collaboration.',
                '2. Confidential Information: All data, materials, products, and specs.',
                '3. Obligations: The Receiving Party agrees to hold information strictly confidential.',
                '4. Term: This Agreement shall remain in effect for 2 years from execution.',
                '',
                'Disclosing Party Signature: ___________________ Date: _____________',
                'Receiving Party Signature: ___________________ Date: _____________'
            ];
        } else if (type === 'lease') {
            title = 'RESIDENTIAL LEASE AGREEMENT (US STANDARD)';
            filename = 'Residential_Lease_Template.pdf';
            contentLines = [
                'This Residential Lease Agreement ("Lease") is made on _______________',
                'by and between Landlord: ___________________________________________',
                'and Tenant: _____________________________________________________.',
                '',
                '1. Property Address: _____________________________________________',
                '2. Term: Lease begins on _______________ and ends on _______________.',
                '3. Rent: Tenant agrees to pay monthly rent of $________ USD, due on the 1st.',                 '4. Security Deposit: Tenant shall deposit$________ USD upon signing.',
                '',
                'Landlord Signature: _________________________ Date: _____________',
                'Tenant Signature: ___________________________ Date: _____________'
            ];
        }

        page.drawText(title, { x: 50, y: height - 60, size: 14, font: boldFont, color: PDFLib.rgb(0.1, 0.1, 0.4) });
        page.drawLine({ start: { x: 50, y: height - 70 }, end: { x: width - 50, y: height - 70 }, thickness: 1, color: PDFLib.rgb(0.7, 0.7, 0.7) });

        let yPos = height - 100;
        for (const line of contentLines) {
            page.drawText(line, { x: 50, y: yPos, size: 10, font: font, color: PDFLib.rgb(0.2, 0.2, 0.2) });
            yPos -= 22;
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        saveDocToDB(filename);
        alert(`Template ${filename} successfully generated and downloaded!`);
    };

    // -------------------------------------------------------------
    // CONVERTER MODE 1: PDF TO JPG
    // -------------------------------------------------------------
    const convertPdfInput = document.getElementById('convertPdfInput');
    const pdfToImgResult = document.getElementById('pdfToImgResult');

    convertPdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pdfToImgResult.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Converting PDF to JPG Image...</p>';
        pdfToImgResult.classList.remove('hidden');

        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const imgUrl = canvas.toDataURL('image/jpeg', 0.9);
        pdfToImgResult.innerHTML = `
            <img src="${imgUrl}" style="max-width:100%; max-height:250px; border-radius:8px; border:1px solid #ddd; margin-bottom:12px;">
            <br>
            <a href="${imgUrl}" download="${file.name.replace('.pdf', '')}_Page1.jpg" class="btn btn-success">
                <i class="fa-solid fa-download"></i> Download Image (JPG)
            </a>
        `;

        saveDocToDB(`Converted_${file.name}_to_JPG`);
    });

    // -------------------------------------------------------------
    // CONVERTER MODE 2: PDF TO WORD
    // -------------------------------------------------------------
    const convertPdfWordInput = document.getElementById('convertPdfWordInput');
    const pdfToWordResult = document.getElementById('pdfToWordResult');

    convertPdfWordInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        pdfToWordResult.innerHTML = '<p><i class="fa-solid fa-spinner fa-spin"></i> Extracting text from PDF for Word...</p>';
        pdfToWordResult.classList.remove('hidden');

        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullExtractedText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullExtractedText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        const blob = new Blob([fullExtractedText], { type: 'application/msword' });
        const docUrl = URL.createObjectURL(blob);

        pdfToWordResult.innerHTML = `
            <p style="margin-bottom:10px; font-weight:600; color:#0f172a;"><i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Text extracted successfully!</p>
            <a href="${docUrl}" download="${file.name.replace('.pdf', '')}_Converted.doc" class="btn btn-primary" style="background:#2563eb;">
                <i class="fa-solid fa-download"></i> Download Word Document (.doc)
            </a>
        `;

        saveDocToDB(`Converted_${file.name}_to_Word`);
    });

    // -------------------------------------------------------------
    // CONVERTER MODE 3: IMAGES TO PDF (US LETTER)
    // -------------------------------------------------------------
    const convertImgInput = document.getElementById('convertImgInput');
    const imgPreviewList = document.getElementById('imgPreviewList');
    const btnBuildPdfFromImg = document.getElementById('btnBuildPdfFromImg');
    let selectedImageFiles = [];

    convertImgInput.addEventListener('change', (e) => {
        selectedImageFiles = Array.from(e.target.files);
        if (selectedImageFiles.length === 0) return;

        imgPreviewList.innerHTML = '';
        selectedImageFiles.forEach(file => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            imgPreviewList.appendChild(img);
        });

        btnBuildPdfFromImg.classList.remove('hidden');
    });

    btnBuildPdfFromImg.addEventListener('click', async () => {
        if (selectedImageFiles.length === 0) return;

        const pdfDoc = await PDFLib.PDFDocument.create();

        for (const file of selectedImageFiles) {
            const arrayBuffer = await file.arrayBuffer();
            let image;
            if (file.type.includes('png')) {
                image = await pdfDoc.embedPng(arrayBuffer);
            } else {
                image = await pdfDoc.embedJpg(arrayBuffer);
            }

            const page = pdfDoc.addPage([612, 792]);
            const { width, height } = image.scaleToFit(572, 752);

            page.drawImage(image, {
                x: (612 - width) / 2,
                y: (792 - height) / 2,
                width: width,
                height: height
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const exportName = `Converted_Images_${Date.now()}.pdf`;
        link.download = exportName;
        link.click();

        saveDocToDB(exportName);
        alert('Images successfully converted to PDF (US Letter)!');
    });

    // -------------------------------------------------------------
    // E-SIGN & FORM FILLER WORKSPACE ENGINE
    // -------------------------------------------------------------
    const pdfFileInput = document.getElementById('pdfFileInput');
    const workspaceSection = document.getElementById('workspaceSection');
    const pdfRenderCanvas = document.getElementById('pdfRenderCanvas');
    const overlayContainer = document.getElementById('overlayContainer');

    const btnAddText = document.getElementById('btnAddText');
    const btnAddDate = document.getElementById('btnAddDate');
    const btnOpenSignModal = document.getElementById('btnOpenSignModal');
    const btnExportPdf = document.getElementById('btnExportPdf');

    const signatureModal = document.getElementById('signatureModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnClearSignature = document.getElementById('btnClearSignature');
    const btnApplySignature = document.getElementById('btnApplySignature');
    const signaturePadCanvas = document.getElementById('signaturePadCanvas');

    let mainPdfBytes = null;
    let mainPdfDoc = null;
    let signaturePad = null;
    let placedElements = [];
    let currentFileName = 'Document.pdf';

    signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 128)'
    });

    pdfFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        mainPdfBytes = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        mainPdfDoc = await pdfjsLib.getDocument({ data: mainPdfBytes }).promise;

        renderPdfPage(1);
        workspaceSection.classList.remove('hidden');
    });

    async function renderPdfPage(pageNumber) {
        const page = await mainPdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });

        const ctx = pdfRenderCanvas.getContext('2d');
        pdfRenderCanvas.width = viewport.width;
        pdfRenderCanvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }

    btnAddText.addEventListener('click', () => {
        const textDiv = document.createElement('div');
        textDiv.className = 'draggable-item';
        textDiv.style.left = '50px';
        textDiv.style.top = '50px';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'Type Text Here';
        textDiv.appendChild(input);

        overlayContainer.appendChild(textDiv);
        makeElementDraggable(textDiv);

        placedElements.push({ type: 'text', element: textDiv, input: input });
    });

    btnAddDate.addEventListener('click', () => {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'draggable-item';
        dateDiv.style.left = '50px';
        dateDiv.style.top = '100px';

        const todayStr = new Date().toLocaleDateString('en-US');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = todayStr;
        dateDiv.appendChild(input);

        overlayContainer.appendChild(dateDiv);
        makeElementDraggable(dateDiv);

        placedElements.push({ type: 'text', element: dateDiv, input: input });
    });

    btnOpenSignModal.addEventListener('click', () => {
        signatureModal.classList.remove('hidden');
        signaturePad.clear();
    });

    btnCloseModal.addEventListener('click', () => signatureModal.classList.add('hidden'));
    btnClearSignature.addEventListener('click', () => signaturePad.clear());

    btnApplySignature.addEventListener('click', () => {
        if (signaturePad.isEmpty()) {
            alert('Please draw your signature first!');
            return;
        }

        const dataUrl = signaturePad.toDataURL();
        const imgDiv = document.createElement('div');
        imgDiv.className = 'draggable-item';
        imgDiv.style.left = '100px';
        imgDiv.style.top = '100px';

        const img = document.createElement('img');
        img.src = dataUrl;
        imgDiv.appendChild(img);

        overlayContainer.appendChild(imgDiv);
        makeElementDraggable(imgDiv);

        placedElements.push({ type: 'signature', element: imgDiv, dataUrl: dataUrl });
        signatureModal.classList.add('hidden');
    });

    function makeElementDraggable(elm) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elm.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elm.style.top = (elm.offsetTop - pos2) + "px";
            elm.style.left = (elm.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    btnExportPdf.addEventListener('click', async () => {
        if (!mainPdfBytes) return;

        const pdfLibDoc = await PDFLib.PDFDocument.load(mainPdfBytes);
        const pages = pdfLibDoc.getPages();
        const firstPage = pages[0];

        const { width, height } = firstPage.getSize();
        const canvasWidth = pdfRenderCanvas.width;
        const canvasHeight = pdfRenderCanvas.height;

        const scaleX = width / canvasWidth;
        const scaleY = height / canvasHeight;

        for (const item of placedElements) {
            const rect = item.element.getBoundingClientRect();
            const canvasRect = pdfRenderCanvas.getBoundingClientRect();

            const x = (rect.left - canvasRect.left) * scaleX;
            const y = height - ((rect.top - canvasRect.top + rect.height) * scaleY);

            if (item.type === 'text') {
                firstPage.drawText(item.input.value, {
                    x: x,
                    y: y,
                    size: 14 * scaleY,
                    color: PDFLib.rgb(0, 0, 0)
                });
            } else if (item.type === 'signature') {
                const imgBytes = await fetch(item.dataUrl).then(res => res.arrayBuffer());
                const pngImage = await pdfLibDoc.embedPng(imgBytes);
                firstPage.drawImage(pngImage, {
                    x: x,
                    y: y,
                    width: 120 * scaleX,
                    height: 50 * scaleY
                });
            }
        }

        const modifiedPdfBytes = await pdfLibDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const exportName = `Signed_${currentFileName}`;
        link.download = exportName;
        link.click();

        saveDocToDB(exportName);
        alert('Signed PDF exported successfully!');
    });
});