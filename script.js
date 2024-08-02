// Array to store uploaded PDF files
const pdfFiles = [];

// Event listener for upload button
document.getElementById('uploadBtn').addEventListener('click', () => {
  const pdfInput = document.getElementById('pdfUpload');
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  pdfFiles.length = 0;

  if (pdfInput.files.length > 0) {
    Array.from(pdfInput.files).forEach((file) => {
      pdfFiles.push(file);
      const listItem = createFileItem(file);
      fileList.appendChild(listItem);
    });
  }
});

// Function to create file item with up and down buttons
function createFileItem(file) {
  const listItem = document.createElement('div');
  listItem.classList.add('file-item');

  // Up button
  const upButton = document.createElement('button');
  upButton.textContent = '▲';
  upButton.addEventListener('click', () => moveFileItem(listItem, 'up'));
  listItem.appendChild(upButton);

  // Down button
  const downButton = document.createElement('button');
  downButton.textContent = '▼';
  downButton.addEventListener('click', () => moveFileItem(listItem, 'down'));
  listItem.appendChild(downButton);

  // File name
  const fileName = document.createElement('span');
  fileName.textContent = file.name;
  listItem.appendChild(fileName);

  // Canvas for PDF preview
  const canvas = document.createElement('canvas');
  listItem.appendChild(canvas);

  // Load PDF and render preview
  const reader = new FileReader();
  reader.onload = function(event) {
    const pdfData = new Uint8Array(event.target.result);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    loadingTask.promise.then((pdf) => {
      pdf.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 0.2 });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({
          canvasContext: context,
          viewport: viewport
        });
      });
    }).catch((error) => {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try again.');
    });
  };
  reader.readAsArrayBuffer(file);

  // Make file item draggable
  listItem.draggable = true;
  listItem.addEventListener('dragstart', handleDragStart);
  listItem.addEventListener('dragover', handleDragOver);
  listItem.addEventListener('drop', handleDrop);

  // Handle touch events for mobile devices
  listItem.addEventListener('touchstart', handleTouchStart);
  listItem.addEventListener('touchmove', handleTouchMove);
  listItem.addEventListener('touchend', handleTouchEnd);

  return listItem;
}

// Event listener for merge button
document.getElementById('mergeBtn').addEventListener('click', () => {
  if (pdfFiles.length > 1) {
    mergePDFs(pdfFiles);
  } else {
    alert('Please upload at least two PDF files to merge.');
  }
});

// Function to merge PDFs
async function mergePDFs(files) {
  try {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (let file of files) {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

    // Preview the merged PDF
    previewPDF(blob);

    // Enable the download button
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadMergedPDF(blob);
  } catch (error) {
    console.error('Error merging PDFs:', error);
    alert('Failed to merge PDFs. Please try again.');
  }
}

// Function to preview merged PDF
function previewPDF(blob) {
  const previewArea = document.getElementById('previewArea');
  previewArea.innerHTML = '';

  const url = URL.createObjectURL(blob);
  const loadingTask = pdfjsLib.getDocument(url);

  loadingTask.promise.then((pdf) => {
    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then((page) => {
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        page.render({
          canvasContext: context,
          viewport: viewport
        });

        previewArea.appendChild(canvas);
      });
    }
  }).catch((error) => {
    console.error('Error loading preview PDF:', error);
    alert('Failed to load preview PDF. Please try again.');
  });
}

// Function to download merged PDF
function downloadMergedPDF(blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'merged.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Drag and drop functionality
let dragged;

function handleDragStart(event) {
  dragged = event.target;
  event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event) {
  event.preventDefault();
  if (event.target !== dragged) {
    const children = Array.from(dragged.parentNode.children);
    const draggedIndex = children.indexOf(dragged);
    const targetIndex = children.indexOf(event.target);

    if (draggedIndex > targetIndex) {
      dragged.parentNode.insertBefore(dragged, event.target);
    } else {
      dragged.parentNode.insertBefore(dragged, event.target.nextSibling);
    }

    const temp = pdfFiles[draggedIndex];
    pdfFiles[draggedIndex] = pdfFiles[targetIndex];
    pdfFiles[targetIndex] = temp;
  }
}

// Touch events for mobile devices
let touchStartIndex = null;
let touchMovedIndex = null;

function handleTouchStart(event) {
  touchStartIndex = Array.from(event.target.parentNode.children).indexOf(event.target);
}

function handleTouchMove(event) {
  event.preventDefault();
  const touch = event.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target && target.classList.contains('file-item') && target !== event.target) {
    touchMovedIndex = Array.from(target.parentNode.children).indexOf(target);
    if (touchStartIndex !== touchMovedIndex) {
      const direction = touchStartIndex < touchMovedIndex ? 'down' : 'up';
      moveFileItem(event.target, direction);
      touchStartIndex = touchMovedIndex;
    }
  }
}

function handleTouchEnd(event) {
  touchStartIndex = null;
  touchMovedIndex = null;
}

// Function to move file item up or down
function moveFileItem(item, direction) {
  const index = Array.from(item.parentNode.children).indexOf(item);

  if ((direction === 'up' && index > 0) || (direction === 'down' && index < pdfFiles.length - 1)) {
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    const temp = pdfFiles[index];
    pdfFiles[index] = pdfFiles[newIndex];
    pdfFiles[newIndex] = temp;

    if (direction === 'up') {
      item.parentNode.insertBefore(item, item.previousElementSibling);
    } else {
      item.parentNode.insertBefore(item.nextElementSibling, item);
    }
  }
}
