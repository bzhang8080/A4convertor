/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUp, FileDown, Scissors, Loader2, CheckCircle2, AlertCircle, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileInfo {
  name: string;
  size: number;
  file: File;
}

export default function App() {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile({
        name: droppedFile.name,
        size: droppedFile.size,
        file: droppedFile
      });
      setError(null);
      setResultBlob(null);
    } else {
      setError('Please upload a valid PDF file.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        file: selectedFile
      });
      setError(null);
      setResultBlob(null);
    }
  };

  const splitPdf = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();
      
      const pages = pdfDoc.getPages();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        const isLandscape = width > height;

        // Embed the original page to use it as a graphic
        const [embeddedPage] = await newPdfDoc.embedPages([page]);

        if (isLandscape) {
          // A3 Landscape (e.g. 842x595) -> Two A4 Portrait (421x595 each)
          const midX = width / 2;
          
          // Left page
          const leftPage = newPdfDoc.addPage([midX, height]);
          leftPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
          
          // Right page
          const rightPage = newPdfDoc.addPage([midX, height]);
          rightPage.drawPage(embeddedPage, {
            x: -midX,
            y: 0,
            width: width,
            height: height,
          });
        } else {
          // A3 Portrait (e.g. 595x842) -> Two A4 Landscape (595x421 each)
          const midY = height / 2;
          
          // Top page
          const topPage = newPdfDoc.addPage([width, midY]);
          topPage.drawPage(embeddedPage, {
            x: 0,
            y: -midY,
            width: width,
            height: height,
          });
          
          // Bottom page
          const bottomPage = newPdfDoc.addPage([width, midY]);
          bottomPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setResultBlob(blob);
    } catch (err) {
      console.error(err);
      setError('An error occurred while processing the PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultBlob || !file) return;
    const url = URL.createObjectURL(resultBlob);
    const link = document.createElement('a');
    link.href = url;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    link.download = `${nameWithoutExt}_Split_A4.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans p-4 md:p-8 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100"
      >
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Scissors size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">PDF A3 to A4 Splitter</h1>
              <p className="text-gray-500 text-sm">Convert large A3 pages into printable A4 sheets</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`
                  relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
                  flex flex-col items-center justify-center cursor-pointer
                  ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 mb-4 group-hover:text-blue-500 transition-colors">
                  <FileUp size={32} />
                </div>
                <p className="font-medium text-lg mb-1">Select or drag & drop A3 PDF</p>
                <p className="text-gray-400 text-sm text-center">Compatible with Foxit and other PDF readers</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
              </motion.div>
            ) : (
              <motion.div
                key="processing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* File Info Card */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={reset}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove file"
                  >
                    <span className="sr-only">Remove</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  {!resultBlob ? (
                    <button
                      disabled={isProcessing}
                      onClick={splitPdf}
                      className={`
                        w-full h-14 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all
                        ${isProcessing 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-[#1D1D1F] text-white hover:bg-black shadow-lg shadow-gray-200'}
                      `}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scissors size={20} />
                          Split to A4
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 font-medium justify-center py-2">
                        <CheckCircle2 size={18} />
                        Successfully split into A4 pages
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full h-14 bg-blue-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                      >
                        <FileDown size={20} />
                        Download Result
                      </button>
                      <button
                        onClick={reset}
                        className="w-full h-14 bg-gray-50 text-gray-600 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 border border-gray-100 transition-all"
                      >
                        Start New Split
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-sm"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                ) }
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-400 mb-4 font-medium text-xs uppercase tracking-widest">
              <Info size={14} />
              How it works
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">1</span>
                  Automatic Layout
                </p>
                <p className="text-gray-500 leading-relaxed">Detects landscape A3 (wide) and splits it vertically. Detects portrait A3 (tall) and splits it horizontally.</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">2</span>
                  Privacy First
                </p>
                <p className="text-gray-500 leading-relaxed">Processing happens entirely in your browser. Your files are never uploaded to any server.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Footer Meta */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-gray-400 text-xs font-medium uppercase tracking-[0.2em]"
      >
        PDF Utility • local processing • no-server
      </motion.p>
    </div>
  );
}
